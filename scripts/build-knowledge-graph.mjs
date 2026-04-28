#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const MASTER_PLAN_PATH = 'docs/Umsetzungsplan.md';
const ACTIVE_PLANS_DIR = 'docs/plaene/aktiv';
const GUARD_MATRIX_PATH = 'scripts/architecture/legacy-surface-guard-matrix.json';
const OUTPUT_PATH = 'docs/generated/knowledge-graph.json';

const GRAPH_CONTRACT = 'knowledge-graph.v1';
const GRAPH_SCHEMA_VERSION = 1;

const NODE_TYPE_ORDER = Object.freeze({
    block: 0,
    phase: 1,
    subphase: 2,
    file: 3,
    surface: 4,
});

const KNOWN_FRONTMATTER_FIELDS = new Set([
    'id',
    'title',
    'status',
    'priority',
    'owner',
    'depends_on',
    'blocked_by',
    'affected_area',
    'scope_files',
    'scope_overlap_allowed_with',
    'verification',
    'updated_at',
    'source_history',
    'current_phase',
    'completed_at',
]);

function normalizeRepoPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

function parseFrontmatter(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    if (lines[0]?.trim() !== '---') {
        return { data: {}, body: content, hasFrontmatter: false, unknownKeys: [] };
    }

    let endIndex = -1;
    for (let index = 1; index < lines.length; index += 1) {
        if (lines[index].trim() === '---') {
            endIndex = index;
            break;
        }
    }
    if (endIndex < 0) {
        return { data: {}, body: content, hasFrontmatter: false, unknownKeys: [] };
    }

    const data = {};
    let currentListKey = null;

    for (let index = 1; index < endIndex; index += 1) {
        const line = lines[index];
        const keyValueMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (keyValueMatch) {
            const [, key, rawValue] = keyValueMatch;
            currentListKey = null;

            if (rawValue === '') {
                data[key] = [];
                currentListKey = key;
            } else if (rawValue.trim() === '[]') {
                data[key] = [];
            } else {
                data[key] = rawValue.trim();
            }
            continue;
        }

        const listMatch = line.match(/^\s*-\s*(.+)\s*$/);
        if (listMatch && currentListKey) {
            if (!Array.isArray(data[currentListKey])) {
                data[currentListKey] = [];
            }
            data[currentListKey].push(listMatch[1].trim());
        }
    }

    const unknownKeys = Object.keys(data)
        .filter((key) => !KNOWN_FRONTMATTER_FIELDS.has(key))
        .sort((left, right) => left.localeCompare(right));

    return {
        data,
        body: lines.slice(endIndex + 1).join('\n'),
        hasFrontmatter: true,
        unknownKeys,
    };
}

function parseChecklistSubphases(lines, phaseRoot) {
    const subphases = [];
    const regex = new RegExp(`^\\s*-\\s*\\[([ xX/])\\]\\s+(${phaseRoot}\\.\\d+\\.\\d+)\\b\\s*(.*)$`);
    for (const line of lines) {
        const match = line.match(regex);
        if (!match) continue;
        const marker = match[1].toLowerCase();
        const code = match[2];
        const status = marker === 'x' ? 'done' : 'open';
        subphases.push({
            code,
            status,
            text: match[3].trim(),
            phaseCode: code.split('.').slice(0, 2).join('.'),
        });
    }
    return subphases;
}

function parsePhaseHeadings(lines, phaseRoot) {
    const phases = [];
    const regex = new RegExp(`^###\\s+(${phaseRoot}\\.\\d+)\\b\\s*(.*)$`);

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(regex);
        if (!match) continue;
        const code = match[1];
        const title = String(match[2] || '').trim();
        let status = 'unknown';

        for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
            if (/^###\s+/.test(lines[cursor])) break;
            const statusMatch = lines[cursor].match(/^status:\s*(\S+)\s*$/);
            if (statusMatch) {
                status = statusMatch[1].trim();
                break;
            }
        }

        phases.push({ code, status, title });
    }

    return phases;
}

function parseDependencyToken(rawToken) {
    const token = String(rawToken || '').trim();
    const phaseMatch = token.match(/^(V\d+)\.(\d+)$/);
    if (phaseMatch) {
        return {
            raw: token,
            blockId: phaseMatch[1],
            dependsPhase: `${phaseMatch[1].replace(/^V/, '')}.${phaseMatch[2]}`,
            isCanonical: true,
        };
    }
    const blockMatch = token.match(/^(V\d+)$/);
    if (blockMatch) {
        return {
            raw: token,
            blockId: blockMatch[1],
            dependsPhase: null,
            isCanonical: true,
        };
    }
    return {
        raw: token,
        blockId: token,
        dependsPhase: null,
        isCanonical: false,
    };
}

function parseMasterRows(masterContent) {
    const lines = masterContent.replace(/\r\n/g, '\n').split('\n');
    const rows = [];
    const activeBlocksHeading = lines.findIndex((line) => line.trim() === '## Aktive Bloecke');
    if (activeBlocksHeading < 0) {
        return rows;
    }

    let endIndex = lines.length;
    for (let index = activeBlocksHeading + 1; index < lines.length; index += 1) {
        if (/^##\s+/.test(lines[index])) {
            endIndex = index;
            break;
        }
    }

    for (let index = activeBlocksHeading + 1; index < endIndex; index += 1) {
        const line = lines[index].trim();
        if (!line.startsWith('|')) continue;
        if (/^\|\s*id\s*\|/i.test(line) || /^\|\s*---/.test(line)) continue;

        const cells = line
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim());

        if (cells.length !== 8) continue;
        const [id, title, status, priority, owner, dependsOnCell, currentPhase, planFileCell] = cells;
        if (!/^V\d+$/.test(id)) continue;

        const dependsOn = String(dependsOnCell || '')
            .split(',')
            .map((token) => token.trim())
            .filter((token) => token && token !== '-');
        const planFileMatch = planFileCell.match(/`([^`]+)`/);

        rows.push({
            id,
            title,
            status,
            priority,
            owner,
            currentPhase,
            planFile: normalizeRepoPath(planFileMatch ? planFileMatch[1] : planFileCell),
            dependsOn,
        });
    }

    return rows;
}

function parseDependencyTable(masterContent) {
    const lines = masterContent.replace(/\r\n/g, '\n').split('\n');
    const rows = [];
    const headingIndex = lines.findIndex((line) => line.trim() === '## Abhaengigkeiten');
    if (headingIndex < 0) {
        return rows;
    }

    let endIndex = lines.length;
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
        if (/^##\s+/.test(lines[index])) {
            endIndex = index;
            break;
        }
    }

    for (let index = headingIndex + 1; index < endIndex; index += 1) {
        const line = lines[index].trim();
        if (!line.startsWith('|')) continue;
        if (/^\|\s*Block\s*\|/i.test(line) || /^\|\s*---/.test(line)) continue;

        const cells = line
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim());
        if (cells.length < 5) continue;

        const [blockId, dependsOnRaw, dependencyType, fulfilledRaw, hint] = cells;
        if (!/^V\d+$/.test(blockId)) continue;

        rows.push({
            blockId,
            dependsOn: parseDependencyToken(dependsOnRaw),
            hard: String(dependencyType || '').trim().toLowerCase() === 'hard',
            fulfilled: String(fulfilledRaw || '').trim().toLowerCase() === 'ja',
            hint: String(hint || '').trim() || null,
        });
    }

    return rows;
}

async function parseActiveBlockPlanFile(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    const content = await fs.readFile(absolutePath, 'utf8');
    const { data, body, unknownKeys } = parseFrontmatter(content);
    const blockId = String(data.id || path.basename(relativePath, '.md')).trim();
    const phaseRoot = blockId.replace(/^V/, '');
    const lines = body.replace(/\r\n/g, '\n').split('\n');

    const phases = parsePhaseHeadings(lines, phaseRoot);
    const subphases = parseChecklistSubphases(lines, phaseRoot);
    const scopeFiles = Array.isArray(data.scope_files)
        ? data.scope_files.map((entry) => normalizeRepoPath(entry)).filter(Boolean)
        : [];
    const dependsOn = Array.isArray(data.depends_on)
        ? data.depends_on.map((token) => parseDependencyToken(token))
        : [];
    const scopeOverlapAllowedWith = Array.isArray(data.scope_overlap_allowed_with)
        ? data.scope_overlap_allowed_with.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [];

    return {
        id: blockId,
        title: String(data.title || '').trim() || null,
        status: String(data.status || 'unknown').trim() || 'unknown',
        priority: String(data.priority || '').trim() || null,
        owner: String(data.owner || '').trim() || null,
        planFile: normalizeRepoPath(relativePath),
        currentPhase: String(data.current_phase || '').trim() || null,
        phases,
        subphases,
        scopeFiles,
        scopeOverlapAllowedWith,
        dependsOn,
        unknownFrontmatterFields: unknownKeys,
    };
}

async function readActiveBlockPlans() {
    const absoluteDirectory = path.join(ROOT, ACTIVE_PLANS_DIR);
    const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
    const planFiles = entries
        .filter((entry) => entry.isFile() && /^V\d+\.md$/i.test(entry.name))
        .map((entry) => normalizeRepoPath(path.join(ACTIVE_PLANS_DIR, entry.name)))
        .sort((left, right) => left.localeCompare(right));

    const plans = [];
    for (const relativePath of planFiles) {
        plans.push(await parseActiveBlockPlanFile(relativePath));
    }
    return plans;
}

function parseGuardMatrix(content) {
    const parsed = JSON.parse(content);
    const surfaces = Array.isArray(parsed.surfaces) ? parsed.surfaces : [];

    return surfaces.map((surface) => ({
        id: String(surface.id || '').trim(),
        status: String(surface.status || 'unknown').trim() || 'unknown',
        forbiddenForNewWork: surface.forbiddenForNewWork === true,
        reason: String(surface.reason || '').trim() || null,
        migrationTarget: String(surface.migrationTarget || '').trim() || null,
        sunsetPhase: String(surface.sunsetPhase || '').trim() || null,
        allowedAdapters: Array.isArray(surface.allowedAdapters) ? surface.allowedAdapters.map((value) => normalizeRepoPath(value)) : [],
        allowedCallers: Array.isArray(surface.allowedCallers) ? surface.allowedCallers.map((value) => normalizeRepoPath(value)) : [],
    })).filter((surface) => surface.id);
}

async function pathExists(relativePath) {
    try {
        await fs.access(path.join(ROOT, relativePath));
        return true;
    } catch {
        return false;
    }
}

function createNodeStore() {
    const map = new Map();
    return {
        upsert(node) {
            const key = `${node.type}::${node.id}`;
            const existing = map.get(key);
            if (!existing) {
                map.set(key, {
                    id: node.id,
                    type: node.type,
                    title: node.title ?? null,
                    status: node.status ?? 'unknown',
                    attributes: { ...(node.attributes || {}) },
                });
                return;
            }
            if (existing.title == null && node.title != null) {
                existing.title = node.title;
            }
            if ((existing.status === 'unknown' || existing.status === 'open') && node.status && node.status !== 'unknown') {
                existing.status = node.status;
            }
            if (node.attributes && typeof node.attributes === 'object') {
                existing.attributes = mergeAttributes(existing.attributes, node.attributes);
            }
        },
        values() {
            return Array.from(map.values());
        },
    };
}

function mergeAttributes(base, incoming) {
    const next = { ...(base || {}) };
    for (const [key, value] of Object.entries(incoming || {})) {
        if (Array.isArray(value)) {
            const previous = Array.isArray(next[key]) ? next[key] : [];
            next[key] = Array.from(new Set([...previous, ...value])).sort((left, right) => String(left).localeCompare(String(right)));
            continue;
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const previous = next[key] && typeof next[key] === 'object' && !Array.isArray(next[key]) ? next[key] : {};
            next[key] = mergeAttributes(previous, value);
            continue;
        }
        next[key] = value;
    }
    return next;
}

function createEdgeStore() {
    const map = new Map();
    return {
        upsert(edge) {
            const key = `${edge.from}::${edge.to}::${edge.type}`;
            const existing = map.get(key);
            if (!existing) {
                map.set(key, {
                    from: edge.from,
                    to: edge.to,
                    type: edge.type,
                    source: edge.source,
                    hard: edge.hard,
                    fulfilled: edge.fulfilled,
                    hint: edge.hint ?? null,
                    attributes: { ...(edge.attributes || {}) },
                });
                return;
            }

            if (edge.source && existing.source !== edge.source) {
                const sourceSet = new Set([existing.source, edge.source].filter(Boolean));
                if (sourceSet.has('frontmatter') && sourceSet.has('master-table')) {
                    existing.source = 'merged';
                } else if (sourceSet.has('merged')) {
                    existing.source = 'merged';
                } else {
                    existing.source = Array.from(sourceSet).sort()[0];
                }
            }

            if (typeof edge.hard === 'boolean') {
                existing.hard = edge.hard;
            }
            if (typeof edge.fulfilled === 'boolean') {
                existing.fulfilled = edge.fulfilled;
            }
            if (edge.hint != null) {
                existing.hint = edge.hint;
            }
            existing.attributes = mergeAttributes(existing.attributes, edge.attributes || {});
        },
        values() {
            return Array.from(map.values());
        },
    };
}

function toNodeSortRank(type) {
    return NODE_TYPE_ORDER[type] ?? Number.MAX_SAFE_INTEGER;
}

function sortNodes(nodes) {
    return nodes.sort((left, right) => {
        const rank = toNodeSortRank(left.type) - toNodeSortRank(right.type);
        if (rank !== 0) return rank;
        return String(left.id).localeCompare(String(right.id));
    });
}

function sortEdges(edges) {
    return edges.sort((left, right) => {
        const fromCompare = String(left.from).localeCompare(String(right.from));
        if (fromCompare !== 0) return fromCompare;
        const toCompare = String(left.to).localeCompare(String(right.to));
        if (toCompare !== 0) return toCompare;
        const typeCompare = String(left.type).localeCompare(String(right.type));
        if (typeCompare !== 0) return typeCompare;
        return String(left.source || '').localeCompare(String(right.source || ''));
    });
}

async function buildKnowledgeGraphModel() {
    const [masterContent, guardMatrixContent, activePlans] = await Promise.all([
        fs.readFile(path.join(ROOT, MASTER_PLAN_PATH), 'utf8'),
        fs.readFile(path.join(ROOT, GUARD_MATRIX_PATH), 'utf8'),
        readActiveBlockPlans(),
    ]);

    const masterRows = parseMasterRows(masterContent);
    const dependencyRows = parseDependencyTable(masterContent);
    const surfaceRows = parseGuardMatrix(guardMatrixContent);

    const nodes = createNodeStore();
    const edges = createEdgeStore();

    const masterById = new Map(masterRows.map((row) => [row.id, row]));
    const dependencyMeta = new Map();
    for (const dependencyRow of dependencyRows) {
        const key = `${dependencyRow.blockId}::${dependencyRow.dependsOn.blockId}`;
        if (!dependencyMeta.has(key)) {
            dependencyMeta.set(key, []);
        }
        dependencyMeta.get(key).push(dependencyRow);
    }

    for (const row of masterRows) {
        nodes.upsert({
            id: row.id,
            type: 'block',
            title: row.title,
            status: row.status || 'unknown',
            attributes: {
                source: ['master-index'],
                priority: row.priority,
                owner: row.owner,
                currentPhase: row.currentPhase || null,
                planFile: row.planFile || null,
            },
        });
    }

    for (const plan of activePlans) {
        nodes.upsert({
            id: plan.id,
            type: 'block',
            title: plan.title,
            status: plan.status,
            attributes: {
                source: ['block-plan'],
                priority: plan.priority,
                owner: plan.owner,
                planFile: plan.planFile,
                scopeOverlapAllowedWith: plan.scopeOverlapAllowedWith,
                unknownFrontmatterFields: plan.unknownFrontmatterFields,
            },
        });

        for (const phase of plan.phases) {
            const phaseId = `V${phase.code}`;
            nodes.upsert({
                id: phaseId,
                type: 'phase',
                title: phase.title || null,
                status: phase.status || 'unknown',
                attributes: {
                    blockId: plan.id,
                    phaseCode: phase.code,
                },
            });
            edges.upsert({
                from: plan.id,
                to: phaseId,
                type: 'contains_phase',
                attributes: {
                    blockId: plan.id,
                    phaseCode: phase.code,
                },
            });
        }

        for (const subphase of plan.subphases) {
            const subphaseId = `V${subphase.code}`;
            const phaseId = `V${subphase.phaseCode}`;
            nodes.upsert({
                id: subphaseId,
                type: 'subphase',
                title: subphase.text || null,
                status: subphase.status,
                attributes: {
                    blockId: plan.id,
                    phaseCode: subphase.phaseCode,
                    subphaseCode: subphase.code,
                },
            });
            edges.upsert({
                from: phaseId,
                to: subphaseId,
                type: 'contains_subphase',
                attributes: {
                    blockId: plan.id,
                    phaseCode: subphase.phaseCode,
                    subphaseCode: subphase.code,
                },
            });
        }

        for (const scopeFile of plan.scopeFiles) {
            nodes.upsert({
                id: scopeFile,
                type: 'file',
                title: null,
                status: 'unknown',
                attributes: {
                    source: ['scope-files'],
                    scopeBlocks: [plan.id],
                },
            });
            edges.upsert({
                from: plan.id,
                to: scopeFile,
                type: 'scope',
                attributes: {
                    declaredBy: 'frontmatter',
                },
            });
        }
    }

    const dependsMap = new Map();
    function addDepends(blockId, token, sourceType) {
        const key = `${blockId}::${token.blockId}::${token.dependsPhase || ''}`;
        if (!dependsMap.has(key)) {
            dependsMap.set(key, {
                from: blockId,
                to: token.blockId,
                dependsPhase: token.dependsPhase,
                rawToken: token.raw,
                sources: new Set(),
                isCanonical: token.isCanonical,
            });
        }
        dependsMap.get(key).sources.add(sourceType);
    }

    for (const plan of activePlans) {
        for (const dependencyToken of plan.dependsOn) {
            addDepends(plan.id, dependencyToken, 'frontmatter');
        }
    }

    for (const row of masterRows) {
        for (const dependencyRaw of row.dependsOn) {
            addDepends(row.id, parseDependencyToken(dependencyRaw), 'master-table');
        }
    }

    for (const entry of dependsMap.values()) {
        const metadataRows = dependencyMeta.get(`${entry.from}::${entry.to}`) || [];
        const metadataRow = metadataRows.find((row) => {
            if (entry.dependsPhase == null) return true;
            return row.dependsOn.dependsPhase === entry.dependsPhase || row.dependsOn.blockId === entry.to;
        }) || metadataRows[0] || null;

        const source = entry.sources.has('frontmatter') && entry.sources.has('master-table')
            ? 'merged'
            : (entry.sources.has('frontmatter') ? 'frontmatter' : 'master-table');

        nodes.upsert({
            id: entry.to,
            type: 'block',
            status: masterById.get(entry.to)?.status || 'unknown',
            title: masterById.get(entry.to)?.title || null,
            attributes: {
                source: ['dependency-target'],
            },
        });

        edges.upsert({
            from: entry.from,
            to: entry.to,
            type: 'depends_on',
            source,
            hard: metadataRow ? metadataRow.hard : false,
            fulfilled: metadataRow ? metadataRow.fulfilled : false,
            hint: metadataRow ? metadataRow.hint : null,
            attributes: {
                dependsPhase: entry.dependsPhase,
                rawToken: entry.rawToken,
                sourceBreakdown: Array.from(entry.sources).sort((left, right) => left.localeCompare(right)),
                canonicalToken: entry.isCanonical,
            },
        });
    }

    const touchEdgeRoleMap = new Map();
    function addTouchEdge(surfaceId, filePath, role) {
        const key = `${filePath}::${surfaceId}`;
        if (!touchEdgeRoleMap.has(key)) {
            touchEdgeRoleMap.set(key, new Set());
        }
        touchEdgeRoleMap.get(key).add(role);
    }

    for (const surface of surfaceRows) {
        nodes.upsert({
            id: surface.id,
            type: 'surface',
            title: surface.id,
            status: surface.status || 'unknown',
            attributes: {
                forbiddenForNewWork: surface.forbiddenForNewWork,
                reason: surface.reason,
                migrationTarget: surface.migrationTarget,
                sunsetPhase: surface.sunsetPhase,
            },
        });

        for (const adapterPath of surface.allowedAdapters) {
            nodes.upsert({
                id: adapterPath,
                type: 'file',
                status: 'unknown',
                attributes: {
                    source: ['guard-matrix'],
                },
            });
            addTouchEdge(surface.id, adapterPath, 'allowedAdapter');
        }

        for (const callerPath of surface.allowedCallers) {
            nodes.upsert({
                id: callerPath,
                type: 'file',
                status: 'unknown',
                attributes: {
                    source: ['guard-matrix'],
                },
            });
            addTouchEdge(surface.id, callerPath, 'allowedCaller');
        }
    }

    for (const [edgeKey, roles] of touchEdgeRoleMap) {
        const [filePath, surfaceId] = edgeKey.split('::');
        edges.upsert({
            from: filePath,
            to: surfaceId,
            type: 'touches',
            attributes: {
                roles: Array.from(roles).sort((left, right) => left.localeCompare(right)),
            },
        });
    }

    const allNodes = nodes.values();
    for (const node of allNodes) {
        if (node.type !== 'file') continue;
        // eslint-disable-next-line no-await-in-loop
        const exists = await pathExists(node.id);
        node.attributes.exists = exists;
    }

    const sortedNodes = sortNodes(allNodes);
    const sortedEdges = sortEdges(edges.values());

    return {
        schema_version: GRAPH_SCHEMA_VERSION,
        contract: GRAPH_CONTRACT,
        nodes: sortedNodes,
        edges: sortedEdges,
    };
}

export async function buildKnowledgeGraph() {
    return buildKnowledgeGraphModel();
}

export async function writeKnowledgeGraph(outputPath = OUTPUT_PATH) {
    const graph = await buildKnowledgeGraphModel();
    const absoluteOutputPath = path.join(ROOT, normalizeRepoPath(outputPath));
    await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await fs.writeFile(absoluteOutputPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
    return graph;
}

export {
    parseFrontmatter,
    parseMasterRows,
    parseDependencyTable,
    parseDependencyToken,
    parseGuardMatrix,
};

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    try {
        const graph = await writeKnowledgeGraph();
        process.stdout.write(`[graph:build] nodes=${graph.nodes.length} edges=${graph.edges.length} -> ${OUTPUT_PATH}\n`);
    } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        process.stderr.write(`[graph:build] failed: ${message}\n`);
        process.exit(1);
    }
}
