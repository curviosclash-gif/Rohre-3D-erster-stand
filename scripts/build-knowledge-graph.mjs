#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const MASTER_PLAN_PATH = 'docs/Umsetzungsplan.md';
const BOT_TRAINING_MASTER_PATH = 'docs/bot-training/Bot_Trainingsplan.md';
const QA_AUDIT_ROOT_PATH = 'docs/qa';
const CANONICAL_PLAN_DIRS = Object.freeze([
    'docs/plaene/aktiv',
    'docs/plaene/alt',
]);
const ARCHIVED_COMPLETED_BLOCKS_PATH = 'docs/plaene/archiv/abgeschlossene-bloecke.md';
const GUARD_MATRIX_PATH = 'scripts/architecture/legacy-surface-guard-matrix.json';
const OUTPUT_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_OUTPUT_PATH = 'docs/generated/knowledge-graph.coverage.json';
const KNOWLEDGE_GRAPH_MAPPING_DIR = 'data/contracts/knowledge-graph';
const GIT_HOTSPOT_OVERLAY_ID = 'GIT-HISTORY-HOTSPOTS';
const GIT_HOTSPOT_MAX_FILES = 96;
const GIT_HOTSPOT_MIN_CHANGES = 5;
const GIT_HOTSPOT_ELIGIBLE_PREFIXES = Object.freeze([
    '.agents/scripts/',
    'data/contracts/',
    'dev/',
    'docs/referenz/',
    'editor/',
    'electron/',
    'python/',
    'scripts/',
    'server/',
    'src/',
    'tests/',
    'trainer/',
]);
const GIT_HOTSPOT_ROOT_FILES = new Set([
    'README.md',
    'package-lock.json',
    'package.json',
    'server.ps1',
]);

const GRAPH_CONTRACT = 'knowledge-graph.v1';
const GRAPH_SCHEMA_VERSION = 1;
const GRAPH_MAPPING_CONTRACT = 'knowledge-graph.mapping.v1';
const GRAPH_MAPPING_SCHEMA_VERSION = 1;
const COVERAGE_CONTRACT = 'knowledge-graph.coverage.v1';
const COVERAGE_SCHEMA_VERSION = 1;
const COVERAGE_GATE_CONTRACT = 'knowledge-graph.coverage.gate.v1';
const COVERAGE_NO_NEW_UNCOVERED_RULE = 'no-new-active-uncovered-files';
const execFile = promisify(execFileCallback);
const COVERAGE_CLASSIFICATION_RULES = Object.freeze([
    {
        classification: 'asset',
        prefixes: ['assets/'],
        excludedFromCoverage: true,
        reason: 'Static asset inventory is tracked separately from code-surface coverage.',
    },
    {
        classification: 'prototype',
        prefixes: ['prototypes/'],
        excludedFromCoverage: true,
        reason: 'Prototype spikes stay outside the main repo coverage KPI.',
    },
    {
        classification: 'archive',
        prefixes: ['archive/'],
        excludedFromCoverage: true,
        reason: 'Archived snapshots are intentionally excluded from active coverage.',
    },
    {
        classification: 'temp',
        prefixes: ['tmp/', '.codex_tmp/'],
        excludedFromCoverage: true,
        reason: 'Temporary and local scratch artifacts are not part of active coverage.',
    },
    {
        classification: 'repo-ops',
        prefixes: ['.github/', '.husky/'],
        excludedFromCoverage: true,
        reason: 'Repository automation scaffolding is tracked separately from product/code coverage.',
    },
    {
        classification: 'agent-workflow',
        prefixes: ['.agents/workflows/'],
        excludedFromCoverage: true,
        reason: 'Agent workflow documents are governance references, not product/code coverage targets.',
    },
    {
        classification: 'governance-tooling',
        prefixes: ['.agents/scripts/'],
        excludedFromCoverage: false,
        reason: null,
    },
    {
        classification: 'product-code',
        prefixes: ['src/', 'scripts/', 'tests/', 'electron/', 'server/', 'python/', 'trainer/', 'editor/', 'data/contracts/'],
        excludedFromCoverage: false,
        reason: null,
    },
    {
        classification: 'product-docs',
        prefixes: ['docs/', 'README.md', 'package.json', 'package-lock.json', 'server.ps1'],
        excludedFromCoverage: false,
        reason: null,
    },
    {
        classification: 'dev-tooling',
        prefixes: ['dev/'],
        excludedFromCoverage: false,
        reason: null,
    },
]);

const NODE_TYPE_ORDER = Object.freeze({
    block: 0,
    phase: 1,
    subphase: 2,
    runtime: 3,
    event: 4,
    state: 5,
    config: 6,
    test: 7,
    file: 8,
    surface: 9,
});

const KNOWLEDGE_GRAPH_MAPPING_NODE_TYPES = new Set([
    'runtime',
    'event',
    'state',
    'config',
    'test',
]);
const KNOWLEDGE_GRAPH_MAPPING_EDGE_TYPES = new Set([
    'implements',
    'emits',
    'consumes',
    'reads_config',
    'reads_state',
    'writes_state',
    'validated_by',
]);

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
const REPO_PATH_TOKEN_REGEX = /((?:\.agents|assets|data|dev|docs|editor|electron|public|python|scripts|server|src|tests|tmp|trainer|videos)(?:[\\/][A-Za-z0-9._*-]+)*[\\/]?|(?:README\.md|package(?:-lock)?\.json|server\.ps1|vite\.config\.[A-Za-z0-9._-]+|eslint\.config\.[A-Za-z0-9._-]+|tsconfig\.[A-Za-z0-9._-]+))/g;

function normalizeRepoPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

function isMappingNodeType(value) {
    return KNOWLEDGE_GRAPH_MAPPING_NODE_TYPES.has(String(value || '').trim());
}

function isMappingEdgeType(value) {
    return KNOWLEDGE_GRAPH_MAPPING_EDGE_TYPES.has(String(value || '').trim());
}

function splitBlockId(blockId) {
    const normalized = String(blockId || '').trim();
    const match = normalized.match(/^([A-Za-z]+)(.+)$/);
    if (!match) {
        return {
            blockId: normalized,
            prefix: '',
            root: normalized,
        };
    }
    return {
        blockId: normalized,
        prefix: match[1],
        root: match[2],
    };
}

function extractPhaseRoot(blockId) {
    return splitBlockId(blockId).root;
}

function buildPhaseRootCandidates(blockIdOrRoot) {
    const rawValue = String(blockIdOrRoot || '').trim();
    const phaseRoot = /^[A-Za-z]/.test(rawValue) ? extractPhaseRoot(rawValue) : rawValue;
    const numericRoot = phaseRoot.match(/^\d+/)?.[0] || phaseRoot;
    return Array.from(new Set([phaseRoot, numericRoot].filter(Boolean)));
}

function resolvePhaseRootFromLines(lines, blockIdOrRoot) {
    const candidates = buildPhaseRootCandidates(blockIdOrRoot);
    for (const candidate of candidates) {
        const matcher = new RegExp(`\\b${escapeRegExp(candidate)}\\.\\d+(?:\\.\\d+)?\\b`);
        if ((lines || []).some((line) => matcher.test(String(line || '')))) {
            return candidate;
        }
    }
    return candidates[0] || '';
}

function buildPhaseNodeId(blockId, phaseCode) {
    const { prefix } = splitBlockId(blockId);
    return `${prefix}${String(phaseCode || '').trim()}`;
}

function escapeRegExp(value) {
    return String(value || '').replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function hasGlobSyntax(value) {
    return /[*?]/.test(String(value || ''));
}

function isConcreteScopePath(value) {
    const normalized = normalizeRepoPath(value);
    if (!normalized || normalized.endsWith('/')) return false;
    if (hasGlobSyntax(normalized)) return false;
    return /(?:^|\/)[^/]+\.[A-Za-z0-9._-]+$/.test(normalized);
}

function isPathPrefixScope(value) {
    const normalized = normalizeRepoPath(value);
    return normalized.endsWith('/') || (!hasGlobSyntax(normalized) && !/\.[A-Za-z0-9._-]+$/.test(normalized));
}

function createGlobRegExp(pattern) {
    const normalized = normalizeRepoPath(pattern);
    let regex = '^';

    for (let index = 0; index < normalized.length; index += 1) {
        const character = normalized[index];
        if (character === '*') {
            const nextCharacter = normalized[index + 1];
            if (nextCharacter === '*') {
                regex += '.*';
                index += 1;
            } else {
                regex += '[^/]*';
            }
            continue;
        }

        if (character === '?') {
            regex += '[^/]';
            continue;
        }

        regex += escapeRegExp(character);
    }

    regex += '$';
    return new RegExp(regex);
}

function collectRepoPathReferences(content) {
    const matches = String(content || '').matchAll(REPO_PATH_TOKEN_REGEX);
    const results = new Set();

    for (const match of matches) {
        const normalized = normalizeRepoPath(match[1]);
        if (normalized && isLikelyRepoPath(normalized)) {
            results.add(normalized);
        }
    }

    return Array.from(results).sort((left, right) => left.localeCompare(right));
}

function classifyCoveragePath(filePath) {
    const normalizedPath = normalizeRepoPath(filePath);
    for (const rule of COVERAGE_CLASSIFICATION_RULES) {
        if (rule.prefixes.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(prefix))) {
            return {
                classification: rule.classification,
                excludedFromCoverage: rule.excludedFromCoverage,
                excludeReason: rule.reason,
            };
        }
    }
    return {
        classification: 'other',
        excludedFromCoverage: false,
        excludeReason: null,
    };
}

function resolveScopeEntries(rawEntries, trackedFiles, trackedFileSet) {
    const declarations = new Set();
    const resolved = new Set();
    const planned = new Set();
    const trackedList = Array.isArray(trackedFiles) ? trackedFiles : [];
    const trackedSet = trackedFileSet instanceof Set ? trackedFileSet : new Set(trackedList);

    for (const rawEntry of rawEntries || []) {
        const normalizedEntry = normalizeRepoPath(rawEntry);
        if (!normalizedEntry) continue;

        declarations.add(normalizedEntry);
        const candidates = collectRepoPathReferences(normalizedEntry);
        const candidateEntries = candidates.length > 0 ? candidates : [normalizedEntry];

        for (const candidateEntry of candidateEntries) {
            const candidate = normalizeRepoPath(candidateEntry);
            if (!candidate) continue;

            let matches = [];
            if (trackedSet.has(candidate)) {
                matches = [candidate];
            } else if (hasGlobSyntax(candidate)) {
                const matcher = createGlobRegExp(candidate);
                matches = trackedList.filter((filePath) => matcher.test(filePath));
            } else if (isPathPrefixScope(candidate)) {
                const prefix = candidate.endsWith('/') ? candidate : `${candidate}/`;
                matches = trackedList.filter((filePath) => filePath.startsWith(prefix));
            }

            if (matches.length > 0) {
                for (const match of matches) {
                    resolved.add(match);
                }
                continue;
            }

            if (isConcreteScopePath(candidate)) {
                planned.add(candidate);
            }
        }
    }

    return {
        scopeFiles: Array.from(new Set([...resolved, ...planned]))
            .sort((left, right) => left.localeCompare(right)),
        scopeDeclarations: Array.from(declarations)
            .sort((left, right) => left.localeCompare(right)),
        scopeResolution: {
            concreteCount: resolved.size,
            plannedCount: planned.size,
        },
    };
}

async function runGitCommand(args) {
    try {
        const { stdout } = await execFile('git', args, {
            cwd: ROOT,
            maxBuffer: 50 * 1024 * 1024,
            windowsHide: true,
        });
        return stdout;
    } catch {
        return '';
    }
}

async function readTrackedFiles() {
    const trackedStdout = await runGitCommand(['ls-files']);
    const untrackedStdout = await runGitCommand(['ls-files', '--others', '--exclude-standard']);
    return [...trackedStdout.split(/\r?\n/), ...untrackedStdout.split(/\r?\n/)]
        .map((line) => normalizeRepoPath(line))
        .filter(Boolean)
        .filter((line, index, all) => all.indexOf(line) === index)
        .sort((left, right) => left.localeCompare(right));
}

async function readDirtyTrackedFiles() {
    const stdout = await runGitCommand(['status', '--porcelain']);
    const dirtyFiles = new Set();

    for (const line of stdout.split(/\r?\n/)) {
        if (!line || line.startsWith('?? ')) continue;
        const normalized = normalizeRepoPath(line.slice(3));
        if (normalized) {
            dirtyFiles.add(normalized);
        }
    }

    return dirtyFiles;
}

async function readCoverageBaseline() {
    const raw = await runGitCommand(['show', `HEAD:${COVERAGE_OUTPUT_PATH}`]);
    if (!raw.trim()) {
        return null;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function isHotspotEligible(filePath) {
    if (!filePath) return false;
    if (GIT_HOTSPOT_ROOT_FILES.has(filePath)) return true;
    return GIT_HOTSPOT_ELIGIBLE_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

async function readGitChangeCounts() {
    const gitPaths = [
        '.agents',
        'data/contracts',
        'dev',
        'docs/bot-training',
        'docs/referenz',
        'editor',
        'electron',
        'python',
        'scripts',
        'server',
        'src',
        'tests',
        'trainer',
        'README.md',
        'package-lock.json',
        'package.json',
        'server.ps1',
    ];
    const stdout = await runGitCommand(['log', '--name-only', '--format=', '--', ...gitPaths]);
    const counts = new Map();

    for (const line of stdout.split(/\r?\n/)) {
        const normalized = normalizeRepoPath(line);
        if (!normalized || !isHotspotEligible(normalized)) continue;
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }

    return counts;
}

function materializeScopePlan(plan, trackedFiles, trackedFileSet) {
    const resolvedScope = resolveScopeEntries(plan.scopeFiles || [], trackedFiles, trackedFileSet);
    return {
        ...plan,
        scopeFiles: resolvedScope.scopeFiles,
        scopeDeclarations: resolvedScope.scopeDeclarations,
        scopeResolution: resolvedScope.scopeResolution,
    };
}

async function readBotTrainingPlans(trackedFiles, trackedFileSet) {
    if (!(await pathExists(BOT_TRAINING_MASTER_PATH))) {
        return [];
    }

    const content = await fs.readFile(path.join(ROOT, BOT_TRAINING_MASTER_PATH), 'utf8');
    return parseBotTrainingBlocks(content)
        .map((plan) => materializeScopePlan(plan, trackedFiles, trackedFileSet))
        .sort((left, right) => left.id.localeCompare(right.id));
}

function resolveRelativeRepoPath(baseFilePath, candidatePath) {
    const normalizedBase = normalizeRepoPath(baseFilePath);
    const normalizedCandidate = normalizeRepoPath(candidatePath);
    if (!normalizedCandidate) return '';
    if (isLikelyRepoPath(normalizedCandidate) && !normalizedCandidate.startsWith('./') && !normalizedCandidate.startsWith('../')) {
        return normalizedCandidate;
    }
    return normalizeRepoPath(path.posix.join(path.posix.dirname(normalizedBase), normalizedCandidate));
}

function parseAuditMasterRows(masterContent, readmePath) {
    const normalizedReadmePath = normalizeRepoPath(readmePath);
    const lines = String(masterContent || '').replace(/\r\n/g, '\n').split('\n');
    const rows = [];
    const headingIndex = lines.findIndex((line) => /^##\s+Blockuebersicht\b/i.test(line.trim()));
    if (headingIndex < 0) return rows;

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
        if (cells.length < 4) continue;

        const [blockCell, areaCell, corePathsCell, findingsCell] = cells;
        const blockId = String(blockCell || '').match(/\b(B\d+)\b/i)?.[1]?.toUpperCase() || '';
        if (!blockId) continue;

        const findingsLink = String(findingsCell || '').match(/\]\(([^)]+)\)/)?.[1] || '';
        const findingsPath = findingsLink
            ? resolveRelativeRepoPath(normalizedReadmePath, findingsLink)
            : null;

        rows.push({
            id: blockId,
            title: String(areaCell || '').trim() || blockId,
            status: 'open',
            readmePath: normalizedReadmePath,
            findingsPath,
            scopeEntries: collectRepoPathReferences(corePathsCell),
        });
    }

    return rows;
}

function parseAuditFindingsMetadata(findingsContent) {
    const lines = String(findingsContent || '').replace(/\r\n/g, '\n').split('\n');
    const statusMatch = lines.find((line) => /^Status:\s*/i.test(line))?.match(/^Status:\s*(.+)$/i);
    const status = normalizeBlockStatus(statusMatch?.[1] || 'open');

    const headingIndex = lines.findIndex((line) => /^##\s+Scope\b/i.test(line.trim()));
    const scopeEntries = new Set();
    if (headingIndex >= 0) {
        let endIndex = lines.length;
        for (let index = headingIndex + 1; index < lines.length; index += 1) {
            if (/^##\s+/.test(lines[index])) {
                endIndex = index;
                break;
            }
        }
        for (const reference of collectPathsFromStructuredLines(lines.slice(headingIndex + 1, endIndex))) {
            scopeEntries.add(reference);
        }
    }

    return {
        status,
        scopeEntries: Array.from(scopeEntries).sort((left, right) => left.localeCompare(right)),
    };
}

async function readAuditPlans(trackedFiles, trackedFileSet) {
    const rootPath = path.join(ROOT, QA_AUDIT_ROOT_PATH);
    let rootEntries = [];
    try {
        rootEntries = await fs.readdir(rootPath, { withFileTypes: true });
    } catch {
        return [];
    }

    const auditDirectories = rootEntries
        .filter((entry) => entry.isDirectory() && /^Spielaudit_/i.test(entry.name))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    const plans = [];
    for (const directoryName of auditDirectories) {
        const readmePath = normalizeRepoPath(path.join(QA_AUDIT_ROOT_PATH, directoryName, 'README.md'));
        if (!(await pathExists(readmePath))) continue;

        const readmeContent = await fs.readFile(path.join(ROOT, readmePath), 'utf8');
        const rows = parseAuditMasterRows(readmeContent, readmePath);
        for (const row of rows) {
            const mergedScopeEntries = new Set([
                row.readmePath,
                ...(row.findingsPath ? [row.findingsPath] : []),
                ...(row.scopeEntries || []),
            ]);

            let status = row.status || 'open';
            if (row.findingsPath && await pathExists(row.findingsPath)) {
                const findingsContent = await fs.readFile(path.join(ROOT, row.findingsPath), 'utf8');
                const findingsMeta = parseAuditFindingsMetadata(findingsContent);
                status = findingsMeta.status || status;
                for (const entry of findingsMeta.scopeEntries) {
                    mergedScopeEntries.add(entry);
                }
            }

            plans.push(materializeScopePlan({
                id: row.id,
                title: row.title,
                status,
                priority: null,
                owner: null,
                dependsOn: [],
                currentPhase: null,
                planFile: row.findingsPath || row.readmePath,
                referencePlanFile: row.readmePath,
                source: ['audit-plan'],
                phases: [],
                subphases: [],
                scopeFiles: Array.from(mergedScopeEntries).sort((left, right) => left.localeCompare(right)),
            }, trackedFiles, trackedFileSet));
        }
    }

    return plans.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeKnowledgeGraphMappingContract(rawMapping) {
    const mapping = rawMapping && typeof rawMapping === 'object' ? rawMapping : {};
    const contract = String(mapping.contract || '').trim();
    if (contract !== GRAPH_MAPPING_CONTRACT) {
        throw new Error(`Unsupported knowledge-graph mapping contract: ${contract || '<empty>'}`);
    }

    const schemaVersion = Number(mapping.schema_version);
    if (schemaVersion !== GRAPH_MAPPING_SCHEMA_VERSION) {
        throw new Error(`Unsupported knowledge-graph mapping schema_version: ${mapping.schema_version}`);
    }

    const mappingId = String(mapping.mapping_id || '').trim();
    if (!mappingId) {
        throw new Error('knowledge-graph mapping requires mapping_id');
    }

    const description = String(mapping.description || '').trim() || null;
    const nodes = Array.isArray(mapping.nodes) ? mapping.nodes : [];
    const edges = Array.isArray(mapping.edges) ? mapping.edges : [];
    const normalizedNodes = nodes.map((entry, index) => {
        const node = entry && typeof entry === 'object' ? entry : {};
        const id = String(node.id || '').trim();
        const type = String(node.type || '').trim();
        if (!id) {
            throw new Error(`knowledge-graph mapping ${mappingId} node[${index}] requires id`);
        }
        if (!isMappingNodeType(type)) {
            throw new Error(`knowledge-graph mapping ${mappingId} node[${index}] uses unsupported type ${type || '<empty>'}`);
        }

        const filePath = node.file ? normalizeRepoPath(node.file) : null;
        return {
            id,
            type,
            title: typeof node.title === 'string' && node.title.trim() ? node.title.trim() : null,
            status: typeof node.status === 'string' && node.status.trim() ? node.status.trim() : 'unknown',
            file: filePath || null,
            attributes: node.attributes && typeof node.attributes === 'object' && !Array.isArray(node.attributes)
                ? { ...node.attributes }
                : {},
        };
    }).sort((left, right) => {
        const rank = toNodeSortRank(left.type) - toNodeSortRank(right.type);
        if (rank !== 0) return rank;
        return left.id.localeCompare(right.id);
    });

    const normalizedEdges = edges.map((entry, index) => {
        const edge = entry && typeof entry === 'object' ? entry : {};
        const from = String(edge.from || '').trim();
        const to = String(edge.to || '').trim();
        const type = String(edge.type || '').trim();
        if (!from || !to) {
            throw new Error(`knowledge-graph mapping ${mappingId} edge[${index}] requires from/to`);
        }
        if (!isMappingEdgeType(type)) {
            throw new Error(`knowledge-graph mapping ${mappingId} edge[${index}] uses unsupported type ${type || '<empty>'}`);
        }
        return {
            from,
            to,
            type,
            attributes: edge.attributes && typeof edge.attributes === 'object' && !Array.isArray(edge.attributes)
                ? { ...edge.attributes }
                : {},
        };
    }).sort((left, right) => {
        const fromCompare = left.from.localeCompare(right.from);
        if (fromCompare !== 0) return fromCompare;
        const toCompare = left.to.localeCompare(right.to);
        if (toCompare !== 0) return toCompare;
        return left.type.localeCompare(right.type);
    });

    const seenNodeIds = new Set();
    for (const node of normalizedNodes) {
        if (seenNodeIds.has(node.id)) {
            throw new Error(`knowledge-graph mapping ${mappingId} declares duplicate node ${node.id}`);
        }
        seenNodeIds.add(node.id);
    }

    const seenEdgeKeys = new Set();
    for (const edge of normalizedEdges) {
        const edgeKey = `${edge.from}::${edge.to}::${edge.type}`;
        if (seenEdgeKeys.has(edgeKey)) {
            throw new Error(`knowledge-graph mapping ${mappingId} declares duplicate edge ${edge.from} -> ${edge.to} (${edge.type})`);
        }
        seenEdgeKeys.add(edgeKey);
    }

    return {
        contract,
        schema_version: schemaVersion,
        mapping_id: mappingId,
        description,
        nodes: normalizedNodes,
        edges: normalizedEdges,
    };
}

function classifyMappingRelationLayer(edgeType) {
    if (edgeType === 'validated_by') return 'test';
    if (edgeType === 'reads_state' || edgeType === 'writes_state') return 'state';
    if (edgeType === 'reads_config') return 'config';
    if (edgeType === 'emits' || edgeType === 'consumes') return 'event';
    if (edgeType === 'implements') return 'runtime';
    return 'runtime';
}

async function readKnowledgeGraphMappings() {
    const absoluteDirectory = path.join(ROOT, KNOWLEDGE_GRAPH_MAPPING_DIR);
    let entries = [];
    try {
        entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
    } catch {
        return [];
    }

    const mappingFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    const mappings = [];
    for (const fileName of mappingFiles) {
        const relativePath = normalizeRepoPath(path.join(KNOWLEDGE_GRAPH_MAPPING_DIR, fileName));
        const raw = JSON.parse(await fs.readFile(path.join(ROOT, relativePath), 'utf8'));
        if (String(raw?.contract || '').trim() !== GRAPH_MAPPING_CONTRACT) {
            continue;
        }
        const normalized = normalizeKnowledgeGraphMappingContract(raw);
        mappings.push({
            ...normalized,
            filePath: relativePath,
        });
    }

    return mappings;
}

async function buildGitHotspotOverlay(coveredFileIds, trackedFiles) {
    const [changeCounts, dirtyFiles] = await Promise.all([
        readGitChangeCounts(),
        readDirtyTrackedFiles(),
    ]);

    const hotspotFiles = trackedFiles
        .filter((filePath) => isHotspotEligible(filePath) && !coveredFileIds.has(filePath))
        .map((filePath) => ({
            path: filePath,
            changes: changeCounts.get(filePath) || 0,
            dirty: dirtyFiles.has(filePath),
            ...classifyCoveragePath(filePath),
        }))
        .filter((entry) => !entry.excludedFromCoverage)
        .filter((entry) => entry.dirty || entry.changes >= GIT_HOTSPOT_MIN_CHANGES)
        .sort((left, right) => {
            if (left.dirty !== right.dirty) {
                return left.dirty ? -1 : 1;
            }
            if (left.changes !== right.changes) {
                return right.changes - left.changes;
            }
            return left.path.localeCompare(right.path);
        })
        .slice(0, GIT_HOTSPOT_MAX_FILES);

    if (hotspotFiles.length === 0) {
        return null;
    }

    return {
        id: GIT_HOTSPOT_OVERLAY_ID,
        title: 'Git-History Hotspots ausserhalb des Core-Graphen',
        coverageSource: 'git-history',
        files: hotspotFiles,
        fileCount: hotspotFiles.length,
    };
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

function parseChecklistStatus(marker) {
    const normalized = String(marker || '').trim().toLowerCase();
    if (normalized === 'x') return 'done';
    if (normalized === '/') return 'active';
    return 'open';
}

function parseChecklistSubphases(lines, phaseRoot) {
    const subphases = [];
    const regex = new RegExp(`^\\s*-\\s*\\[([ xX/])\\]\\s+(${phaseRoot}\\.\\d+\\.\\d+)\\b\\s*(.*)$`);
    for (const line of lines) {
        const match = line.match(regex);
        if (!match) continue;
        const code = match[2];
        subphases.push({
            code,
            status: parseChecklistStatus(match[1]),
            text: match[3].trim(),
            phaseCode: code.split('.').slice(0, 2).join('.'),
        });
    }
    return subphases;
}

function parseChecklistPhases(lines, phaseRoot) {
    const phases = [];
    const regex = new RegExp(`^\\s*-\\s*\\[([ xX/])\\]\\s+(${phaseRoot}\\.\\d+)(?!\\.)\\b\\s*(.*)$`);
    for (const line of lines) {
        const match = line.match(regex);
        if (!match) continue;
        phases.push({
            code: match[2],
            status: parseChecklistStatus(match[1]),
            title: match[3].trim() || null,
        });
    }
    return phases;
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

function mergePhaseStatusesWithSubphases(phases, subphases) {
    const grouped = new Map();
    for (const subphase of subphases || []) {
        if (!grouped.has(subphase.phaseCode)) grouped.set(subphase.phaseCode, []);
        grouped.get(subphase.phaseCode).push(subphase);
    }

    return (phases || []).map((phase) => {
        const members = grouped.get(phase.code) || [];
        if (members.length === 0) return phase;
        const allDone = members.every((subphase) => subphase.status === 'done');
        if (allDone) return { ...phase, status: 'done' };
        const anyActive = members.some((subphase) => subphase.status === 'active');
        if (anyActive) return { ...phase, status: 'active' };
        const anyOpen = members.some((subphase) => subphase.status === 'open');
        if (anyOpen) return { ...phase, status: phase.status === 'done' ? 'active' : 'open' };
        return phase;
    });
}

function isLikelyRepoPath(value) {
    const normalized = normalizeRepoPath(value);
    if (!normalized) return false;
    if (/^(src|docs|tests|server|electron|scripts|trainer|editor|assets|data|videos|dev|public|tmp|python|\.agents)\//.test(normalized)) {
        return true;
    }
    if (/^(index\.html|style\.css|server\.ps1|package(?:-lock)?\.json|vite\.config\.[a-z0-9._-]+|README\.md|CONTRIBUTING\.md|knip\.json|eslint\.config\.[a-z0-9._-]+|tsconfig\.[^/]+)$/.test(normalized)) {
        return true;
    }
    return normalized.includes('**');
}

function normalizeLegacyScopeEntry(rawValue) {
    const normalized = normalizeRepoPath(
        String(rawValue || '')
            .trim()
            .replace(/^-\s+/, '')
            .replace(/`([^`]+)`/g, '$1')
    );
    if (!isLikelyRepoPath(normalized)) {
        return null;
    }
    return normalized;
}

function parseLegacyScopeFiles(lines) {
    const scopeFiles = [];
    let collecting = false;
    let sawBullet = false;

    for (const line of lines) {
        const trimmed = line.trim();
        const headingText = trimmed.replace(/^#{1,6}\s+/, '');

        if (!collecting) {
            if (/^(Scope|Betroffene Dateien(?:\s+\(.*\))?|Dateien)(:)?$/i.test(trimmed)
                || /^(Scope|Betroffene Dateien(?:\s+\(.*\))?|Dateien)(:)?$/i.test(headingText)) {
                collecting = true;
            }
            continue;
        }

        if (/^#{1,6}\s+/.test(trimmed)) {
            break;
        }
        if (!trimmed) {
            continue;
        }

        const bulletMatch = trimmed.match(/^-\s+(.+)$/);
        if (!bulletMatch) {
            if (sawBullet) break;
            continue;
        }

        sawBullet = true;
        const normalized = normalizeLegacyScopeEntry(bulletMatch[1]);
        if (normalized) {
            scopeFiles.push(normalized);
        }
    }

    return Array.from(new Set(scopeFiles)).sort((left, right) => left.localeCompare(right));
}

function extractDependencyTokensFromText(rawValue) {
    const matches = String(rawValue || '').match(/\b(?:BT\d+[A-Z]?|V\d+)(?:\.\d+(?:\.\d+)?)?\b/g) || [];
    return Array.from(new Set(matches.map((match) => String(match).trim()))).sort((left, right) => left.localeCompare(right));
}

function parseDependencyToken(rawToken) {
    const token = String(rawToken || '').trim();
    const phaseMatch = token.match(/^((?:BT\d+[A-Z]?|V\d+))\.(\d+(?:\.\d+)?)$/);
    if (phaseMatch) {
        return {
            raw: token,
            blockId: phaseMatch[1],
            dependsPhase: `${extractPhaseRoot(phaseMatch[1])}.${phaseMatch[2]}`,
            isCanonical: true,
        };
    }
    const blockMatch = token.match(/^((?:BT\d+[A-Z]?|V\d+))$/);
    if (blockMatch) {
        return {
            raw: token,
            blockId: blockMatch[1],
            dependsPhase: null,
            isCanonical: true,
        };
    }
    const prefixedBlockMatch = token.match(/^((?:BT\d+[A-Z]?|V\d+))\b/);
    if (prefixedBlockMatch) {
        return {
            raw: token,
            blockId: prefixedBlockMatch[1],
            dependsPhase: null,
            isCanonical: false,
        };
    }
    return {
        raw: token,
        blockId: token,
        dependsPhase: null,
        isCanonical: false,
    };
}

function normalizeBlockStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'unknown';
    if (normalized === 'done' || normalized === 'completed' || normalized === 'abgeschlossen' || normalized === 'closed') {
        return 'done';
    }
    if (normalized === 'planned' || normalized === 'geplant') {
        return 'planned';
    }
    if (normalized === 'active' || normalized === 'in arbeit' || normalized === 'in bearbeitung') {
        return 'active';
    }
    if (normalized === 'open' || normalized === 'offen') {
        return 'open';
    }
    return 'unknown';
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

async function parseBlockPlanFile(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    const content = await fs.readFile(absolutePath, 'utf8');
    const { data, body, unknownKeys } = parseFrontmatter(content);
    const blockId = String(data.id || path.basename(relativePath, '.md')).trim();
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const phaseRoot = resolvePhaseRootFromLines(lines, blockId);

    const subphases = parseChecklistSubphases(lines, phaseRoot);
    const phases = mergePhaseStatusesWithSubphases(parsePhaseHeadings(lines, phaseRoot), subphases);
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

function parseArchivedCompletedRows(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const rows = [];
    const headingIndex = lines.findIndex((line) => line.trim() === '## Archivierte abgeschlossene Bloecke');
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
        if (/^\|\s*id\s*\|/i.test(line) || /^\|\s*---/.test(line)) continue;

        const cells = line
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim());
        if (cells.length < 7) continue;

        const [id, title, status, priority, dependsOnCell, currentPhase, planFileCell] = cells;
        if (!/^V\d+$/.test(id)) continue;

        const dependsOn = String(dependsOnCell || '')
            .split(',')
            .map((token) => token.trim())
            .filter((token) => token && token !== '-');
        const planFileMatch = planFileCell.match(/`([^`]+)`/);

        rows.push({
            id,
            title: String(title || '').trim() || null,
            status: normalizeBlockStatus(status),
            priority: String(priority || '').trim() || null,
            currentPhase: String(currentPhase || '').trim() || null,
            planFile: normalizeRepoPath(planFileMatch ? planFileMatch[1] : planFileCell),
            dependsOn,
        });
    }

    return rows;
}

function normalizeLegacyBlockTitle(blockId, rawTitle) {
    const blockPattern = String(blockId || '').trim();
    let title = String(rawTitle || '').trim();
    if (!title) return null;

    title = title
        .replace(/^Feature Plan:\s*/i, '')
        .replace(/^Feature:\s*/i, '')
        .replace(/^Feature\s+/i, '')
        .replace(/^Planentwurf:\s*/i, '')
        .replace(new RegExp(`^Block\\s+${blockPattern}:\\s*`, 'i'), '')
        .replace(new RegExp(`^${blockPattern}\\s+`, 'i'), '')
        .replace(new RegExp(`\\s+${blockPattern}\\b.*$`, 'i'), '')
        .trim();

    return title || null;
}

function extractCurrentPhase(content, blockId, phaseRootOverride = null) {
    const phaseRoot = phaseRootOverride || extractPhaseRoot(blockId);
    if (!phaseRoot) return null;
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let currentPhase = null;
    const headingRegex = new RegExp(`^###\\s+(?:Phase\\s+)?(${phaseRoot}\\.\\d+)\\b`);
    const checklistRegex = new RegExp(`^\\s*-\\s*\\[[ xX/]\\]\\s+(${phaseRoot}\\.\\d+)(?!\\.)\\b`);

    for (const line of lines) {
        const headingMatch = line.match(headingRegex);
        if (headingMatch) {
            currentPhase = headingMatch[1];
            continue;
        }
        const checklistMatch = line.match(checklistRegex);
        if (checklistMatch) {
            currentPhase = checklistMatch[1];
        }
    }

    return currentPhase;
}

function mergeStructuredEntries(baseEntries, incomingEntries, keyField) {
    const merged = new Map();

    for (const entry of [...(baseEntries || []), ...(incomingEntries || [])]) {
        if (!entry || entry[keyField] == null) continue;
        const key = String(entry[keyField]);
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, { ...entry });
            continue;
        }
        if ((existing.title == null || existing.title === '') && entry.title) {
            existing.title = entry.title;
        }
        if ((existing.status === 'unknown' || existing.status === 'open') && entry.status && entry.status !== 'unknown') {
            existing.status = entry.status;
        }
    }

    return Array.from(merged.values()).sort((left, right) => String(left[keyField]).localeCompare(String(right[keyField])));
}

function mergeBlockMetadata(base, incoming) {
    const next = { ...(base || {}) };
    if (!next.id && incoming.id) next.id = incoming.id;
    if (!next.title && incoming.title) next.title = incoming.title;
    if (incoming.status === 'done' && next.status !== 'done') {
        next.status = incoming.status;
    }
    if ((!next.status || next.status === 'unknown') && incoming.status) next.status = incoming.status;
    if (!next.priority && incoming.priority) next.priority = incoming.priority;
    if (!next.owner && incoming.owner) next.owner = incoming.owner;
    if (!next.currentPhase && incoming.currentPhase) next.currentPhase = incoming.currentPhase;
    if (!next.planFile && incoming.planFile) next.planFile = incoming.planFile;
    const source = new Set([...(base?.source || []), ...(incoming.source || [])]);
    next.source = Array.from(source).sort((left, right) => left.localeCompare(right));
    next.phases = mergeStructuredEntries(base?.phases, incoming?.phases, 'code');
    next.subphases = mergeStructuredEntries(base?.subphases, incoming?.subphases, 'code');
    next.scopeFiles = Array.from(new Set([...(base?.scopeFiles || []), ...(incoming?.scopeFiles || [])]))
        .sort((left, right) => left.localeCompare(right));
    next.scopeDeclarations = Array.from(new Set([...(base?.scopeDeclarations || []), ...(incoming?.scopeDeclarations || [])]))
        .sort((left, right) => left.localeCompare(right));
    return next;
}

function buildLegacyBlockEntry({ blockId, rawTitle, status, planFile, content, source }) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const phaseRoot = resolvePhaseRootFromLines(lines, blockId);
    const subphases = parseChecklistSubphases(lines, phaseRoot);
    const headingPhases = mergePhaseStatusesWithSubphases(parsePhaseHeadings(lines, phaseRoot), subphases);
    const checklistPhases = parseChecklistPhases(lines, phaseRoot);

    return {
        id: blockId,
        title: normalizeLegacyBlockTitle(blockId, rawTitle),
        status,
        currentPhase: extractCurrentPhase(content, blockId, phaseRoot),
        planFile,
        source: Array.isArray(source) ? source : [source],
        phases: headingPhases.length > 0 ? headingPhases : checklistPhases,
        subphases,
        scopeFiles: parseLegacyScopeFiles(lines),
    };
}

function parseArchivedSummaryBlocks(content, relativePath) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const entries = [];

    for (let index = 0; index < lines.length; index += 1) {
        const headingMatch = lines[index].match(/^##\s+Block\s+(V\d+):\s*(.+)$/);
        if (!headingMatch) continue;

        const [, blockId, rawTitle] = headingMatch;
        let endIndex = lines.length;
        for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
            if (/^##\s+Block\s+/.test(lines[cursor])) {
                endIndex = cursor;
                break;
            }
        }

        const section = lines.slice(index, endIndex).join('\n');
        const planFileMatch = section.match(/Plan-Datei:\s*`([^`]+)`/);
        entries.push(buildLegacyBlockEntry({
            blockId,
            rawTitle,
            status: 'done',
            planFile: normalizeRepoPath(planFileMatch ? planFileMatch[1] : relativePath),
            content: section,
            source: ['archive-summary'],
        }));
    }

    return entries;
}

function parseLegacyPlanFile(relativePath, content) {
    const normalizedPath = normalizeRepoPath(relativePath);
    const basename = path.basename(normalizedPath);
    const fileIdMatch = basename.match(/(?:^|_)(V\d+)\.md$/i);
    const headingMatch = content.replace(/\r\n/g, '\n').split('\n').find((line) => /^#\s+/.test(line))?.match(/^#\s+(.+)$/);
    const headingBlockMatch = headingMatch?.[1]?.match(/\b(V\d+)\b/);
    const blockId = fileIdMatch?.[1] || headingBlockMatch?.[1] || null;
    if (!blockId) {
        return null;
    }

    const statusMatch = content.replace(/\r\n/g, '\n').match(/^Status:\s*(.+)$/m);
    const fallbackTitle = basename.replace(/\.md$/i, '').replace(/_/g, ' ');
    return buildLegacyBlockEntry({
        blockId,
        rawTitle: headingMatch?.[1] || fallbackTitle,
        status: normalizeBlockStatus(statusMatch?.[1] || ''),
        planFile: normalizedPath,
        content,
        source: ['legacy-plan'],
    });
}

async function readCanonicalBlockPlans() {
    const plansById = new Map();

    for (const directory of CANONICAL_PLAN_DIRS) {
        const absoluteDirectory = path.join(ROOT, directory);
        let entries = [];
        try {
            entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
        } catch {
            continue;
        }

        const planFiles = entries
            .filter((entry) => entry.isFile() && /^V\d+\.md$/i.test(entry.name))
            .map((entry) => normalizeRepoPath(path.join(directory, entry.name)))
            .sort((left, right) => left.localeCompare(right));

        for (const relativePath of planFiles) {
            const plan = await parseBlockPlanFile(relativePath);
            if (!plansById.has(plan.id)) {
                plansById.set(plan.id, plan);
            }
        }
    }

    return Array.from(plansById.values()).sort((left, right) => left.id.localeCompare(right.id));
}

async function readFallbackBlockMetadata() {
    const metadataById = new Map();
    const mergeEntry = (entry) => {
        if (!entry?.id) return;
        const existing = metadataById.get(entry.id);
        metadataById.set(entry.id, mergeBlockMetadata(existing, entry));
    };

    if (await pathExists(ARCHIVED_COMPLETED_BLOCKS_PATH)) {
        const content = await fs.readFile(path.join(ROOT, ARCHIVED_COMPLETED_BLOCKS_PATH), 'utf8');
        for (const row of parseArchivedCompletedRows(content)) {
            mergeEntry({
                id: row.id,
                title: row.title,
                status: row.status,
                priority: row.priority,
                currentPhase: row.currentPhase,
                planFile: row.planFile,
                source: ['archive-index'],
            });
        }
    }

    const legacyDirectory = path.join(ROOT, 'docs/plaene/alt');
    let entries = [];
    try {
        entries = await fs.readdir(legacyDirectory, { withFileTypes: true });
    } catch {
        return metadataById;
    }

    const legacyFiles = entries
        .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name) && !/^V\d+\.md$/i.test(entry.name))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    const summaryFiles = legacyFiles.filter((name) => /^Umsetzungsplan_Abgeschlossene_Bloecke_/i.test(name));
    const singleBlockFiles = legacyFiles.filter((name) => !/^Umsetzungsplan_Abgeschlossene_Bloecke_/i.test(name));

    for (const name of summaryFiles) {
        const relativePath = normalizeRepoPath(path.join('docs/plaene/alt', name));
        const content = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
        for (const entry of parseArchivedSummaryBlocks(content, relativePath)) {
            mergeEntry(entry);
        }
    }

    for (const name of singleBlockFiles) {
        const relativePath = normalizeRepoPath(path.join('docs/plaene/alt', name));
        const content = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
        mergeEntry(parseLegacyPlanFile(relativePath, content));
    }

    return metadataById;
}

function parseBotTrainingDependencyTable(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const rows = [];
    const headingIndex = lines.findIndex((line) => /^##\s+Abhaengigkeiten\b/.test(line.trim()));
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

        const [blockCell, dependsOnRaw, dependencyType, fulfilledRaw, hint] = cells;
        const blockIdMatch = String(blockCell || '').match(/\b(BT[0-9A-Z]+)\b/);
        if (!blockIdMatch) continue;

        const dependencyTokens = extractDependencyTokensFromText(dependsOnRaw);
        for (const token of dependencyTokens) {
            rows.push({
                blockId: blockIdMatch[1],
                dependsOn: parseDependencyToken(token),
                hard: String(dependencyType || '').trim().toLowerCase() === 'hard',
                fulfilled: String(fulfilledRaw || '').trim().toLowerCase() === 'ja',
                hint: String(hint || '').trim() || null,
            });
        }
    }

    return rows;
}

function collectPathsFromStructuredLines(lines) {
    const paths = new Set();
    for (const line of lines || []) {
        for (const reference of collectRepoPathReferences(line)) {
            paths.add(reference);
        }
    }
    return paths;
}

function collectLabelBlockPathReferences(lines, labelPattern) {
    const paths = new Set();
    let collecting = false;

    for (const line of lines || []) {
        const trimmed = line.trim();
        if (!collecting && labelPattern.test(trimmed)) {
            collecting = true;
            for (const reference of collectRepoPathReferences(trimmed)) {
                paths.add(reference);
            }
            continue;
        }

        if (!collecting) continue;
        if (/^###\s+/.test(trimmed)) break;
        if (/^[A-Za-zÄÖÜäöü0-9 .()/-]+:\s*$/.test(trimmed) && !labelPattern.test(trimmed)) break;
        if (!trimmed) continue;
        for (const reference of collectRepoPathReferences(trimmed)) {
            paths.add(reference);
        }
    }

    return paths;
}

function collectBotTrainingScopeFiles(sectionLines, phaseRoot) {
    const scopeFiles = new Set([BOT_TRAINING_MASTER_PATH]);
    const firstHeadingIndex = sectionLines.findIndex((line) => /^###\s+/.test(line));
    const preambleLines = firstHeadingIndex >= 0 ? sectionLines.slice(0, firstHeadingIndex) : sectionLines.slice();
    const phaseHeadingRegex = new RegExp(`^###\\s+(${escapeRegExp(phaseRoot)}\\.\\d+)\\b`);

    for (const line of preambleLines) {
        const planFileMatch = line.match(/Plan-Datei:\s*`([^`]+)`/);
        if (planFileMatch) {
            scopeFiles.add(normalizeRepoPath(planFileMatch[1]));
        }
    }

    for (const reference of collectLabelBlockPathReferences(preambleLines, /^Quelle:\s*$/i)) {
        scopeFiles.add(reference);
    }
    for (const reference of collectLabelBlockPathReferences(preambleLines, /^Scope:\s*$/i)) {
        scopeFiles.add(reference);
    }

    let activeSectionType = null;
    let activeLines = [];
    const flushSection = () => {
        if (activeLines.length === 0 || activeSectionType == null) return;
        if (activeSectionType === 'dod' || activeSectionType === 'phase') {
            for (const reference of collectPathsFromStructuredLines(activeLines)) {
                scopeFiles.add(reference);
            }
        }
        activeLines = [];
    };

    for (const line of sectionLines.slice(Math.max(firstHeadingIndex, 0))) {
        const trimmed = line.trim();
        if (/^###\s+/.test(trimmed)) {
            flushSection();
            if (/^###\s+Definition of Done \(DoD\)/i.test(trimmed)) {
                activeSectionType = 'dod';
            } else if (phaseHeadingRegex.test(trimmed)) {
                activeSectionType = 'phase';
            } else {
                activeSectionType = null;
            }
            continue;
        }
        if (activeSectionType != null) {
            activeLines.push(line);
        }
    }
    flushSection();

    return Array.from(scopeFiles)
        .map((entry) => normalizeRepoPath(entry))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
}

function deriveStructuredBlockStatus(blockId, sectionLines, phases, subphases, phaseRoot) {
    const gatePhaseCode = `${phaseRoot || extractPhaseRoot(blockId)}.99`;
    const gatePhase = (phases || []).find((phase) => phase.code === gatePhaseCode) || null;
    const gateSubphases = (subphases || []).filter((subphase) => subphase.phaseCode === gatePhaseCode);
    const gateDone = gatePhase?.status === 'done'
        || (gateSubphases.length > 0 && gateSubphases.every((subphase) => subphase.status === 'done'));
    if (gateDone) return 'done';

    if ((subphases || []).some((subphase) => subphase.status === 'active')) return 'active';
    if ((phases || []).some((phase) => phase.status === 'active')) return 'active';
    if (sectionLines.some((line) => /<!--\s*LOCK:.*in-bearbeitung/i.test(line))) return 'active';

    if ((subphases || []).length > 0 || (phases || []).length > 0) return 'open';
    return 'unknown';
}

function deriveStructuredCurrentPhase(blockId, sectionContent, phases, phaseRoot) {
    const firstIncompletePhase = (phases || []).find((phase) => phase.status !== 'done');
    if (firstIncompletePhase) return firstIncompletePhase.code;
    return extractCurrentPhase(sectionContent, blockId, phaseRoot) || phases.at(-1)?.code || null;
}

function parseBotTrainingBlocks(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const sections = [];

    for (let index = 0; index < lines.length; index += 1) {
        const headingMatch = lines[index].match(/^##\s+Block\s+(BT[0-9A-Z]+):\s*(.+)$/);
        if (!headingMatch) continue;
        const [, blockId, rawTitle] = headingMatch;
        let endIndex = lines.length;
        for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
            if (/^##\s+Block\s+BT[0-9A-Z]+:/.test(lines[cursor])) {
                endIndex = cursor;
                break;
            }
        }

        const sectionLines = lines.slice(index + 1, endIndex);
        const sectionContent = sectionLines.join('\n');
        const phaseRoot = resolvePhaseRootFromLines(sectionLines, blockId);
        const subphases = parseChecklistSubphases(sectionLines, phaseRoot);
        const headingPhases = mergePhaseStatusesWithSubphases(parsePhaseHeadings(sectionLines, phaseRoot), subphases);
        const phases = headingPhases.length > 0 ? headingPhases : parseChecklistPhases(sectionLines, phaseRoot);
        const planFileMatch = sectionContent.match(/Plan-Datei:\s*`([^`]+)`/);
        const scopeFiles = collectBotTrainingScopeFiles(sectionLines, phaseRoot);

        sections.push({
            id: blockId,
            title: String(rawTitle || '').trim() || null,
            status: deriveStructuredBlockStatus(blockId, sectionLines, phases, subphases, phaseRoot),
            priority: null,
            owner: null,
            planFile: BOT_TRAINING_MASTER_PATH,
            currentPhase: deriveStructuredCurrentPhase(blockId, sectionContent, phases, phaseRoot),
            phases,
            subphases,
            scopeFiles,
            scopeOverlapAllowedWith: [],
            dependsOn: [],
            unknownFrontmatterFields: [],
            source: ['bot-training-plan'],
            referencePlanFile: planFileMatch ? normalizeRepoPath(planFileMatch[1]) : null,
        });
    }

    const dependencyRows = parseBotTrainingDependencyTable(content);
    const dependenciesByBlock = new Map();
    for (const row of dependencyRows) {
        if (!dependenciesByBlock.has(row.blockId)) dependenciesByBlock.set(row.blockId, []);
        dependenciesByBlock.get(row.blockId).push(row.dependsOn);
    }

    return sections.map((section) => ({
        ...section,
        dependsOn: Array.from(new Map(
            (dependenciesByBlock.get(section.id) || [])
                .map((token) => [`${token.blockId}::${token.dependsPhase || ''}`, token])
        ).values()),
    }));
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

function buildGraphFileCoverageIndex(graph) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const fileNodeByPath = new Map(
        nodes
            .filter((node) => node.type === 'file')
            .map((node) => [normalizeRepoPath(node.id), node])
    );
    const surfacesByFile = new Map();
    const scopeBlocksByFile = new Map();

    for (const edge of edges) {
        if (edge.type === 'touches') {
            const filePath = normalizeRepoPath(edge.from);
            if (!surfacesByFile.has(filePath)) surfacesByFile.set(filePath, []);
            surfacesByFile.get(filePath).push({
                surface: edge.to,
                roles: Array.isArray(edge.attributes?.roles) ? edge.attributes.roles : [],
            });
            continue;
        }
        if (edge.type === 'scope') {
            const filePath = normalizeRepoPath(edge.to);
            if (!scopeBlocksByFile.has(filePath)) scopeBlocksByFile.set(filePath, []);
            scopeBlocksByFile.get(filePath).push(edge.from);
        }
    }

    for (const values of surfacesByFile.values()) {
        values.sort((left, right) => left.surface.localeCompare(right.surface));
    }
    for (const [filePath, blockIds] of scopeBlocksByFile) {
        scopeBlocksByFile.set(filePath, Array.from(new Set(blockIds)).sort((left, right) => left.localeCompare(right)));
    }

    return {
        fileNodeByPath,
        surfacesByFile,
        scopeBlocksByFile,
    };
}

function isActiveUncoveredCoverageFile(entry) {
    return entry?.covered !== true && entry?.excludedFromCoverage !== true;
}

function summarizeCoverageBaselineState(entry) {
    if (!entry) {
        return 'absent';
    }
    if (entry.excludedFromCoverage === true) {
        return 'excluded';
    }
    if (entry.covered === true) {
        return 'covered';
    }
    return 'uncovered';
}

function buildCoverageGate(files, baselineCoverage) {
    const baselineByPath = new Map(
        (Array.isArray(baselineCoverage?.files) ? baselineCoverage.files : [])
            .map((entry) => [normalizeRepoPath(entry.path), entry])
    );
    const baselineAvailable = baselineByPath.size > 0;
    const newUncoveredActiveFiles = baselineAvailable
        ? files
            .filter(isActiveUncoveredCoverageFile)
            .filter((entry) => {
                const previous = baselineByPath.get(entry.path);
                return !previous || previous.covered === true || previous.excludedFromCoverage === true;
            })
            .map((entry) => {
                const previous = baselineByPath.get(entry.path);
                return {
                    path: entry.path,
                    classification: entry.classification,
                    baselineState: summarizeCoverageBaselineState(previous),
                    coveredInCore: entry.coveredInCore === true,
                    coveredByOverlay: entry.coveredByOverlay === true,
                    scopeBlocks: Array.isArray(entry.scopeBlocks) ? entry.scopeBlocks : [],
                };
            })
            .sort((left, right) => left.path.localeCompare(right.path))
        : [];
    const status = newUncoveredActiveFiles.length === 0 ? 'pass' : 'fail';

    return {
        contract: COVERAGE_GATE_CONTRACT,
        status,
        baseline: {
            ref: 'HEAD',
            path: COVERAGE_OUTPUT_PATH,
            available: baselineAvailable,
        },
        rules: [
            {
                id: COVERAGE_NO_NEW_UNCOVERED_RULE,
                severity: 'error',
                status,
                description: 'Active repo files may not become newly uncovered; add them to a graph scope/mapping or classify them as excluded.',
                violationCount: newUncoveredActiveFiles.length,
                files: newUncoveredActiveFiles,
            },
        ],
    };
}

function buildCoverageArtifact(coreGraph, trackedFiles, hotspotOverlay, baselineCoverage = null) {
    const index = buildGraphFileCoverageIndex(coreGraph);
    const hotspotByPath = new Map((hotspotOverlay?.files || []).map((entry) => [entry.path, entry]));
    const files = trackedFiles.map((filePath) => {
        const normalizedPath = normalizeRepoPath(filePath);
        const fileNode = index.fileNodeByPath.get(normalizedPath) || null;
        const classification = classifyCoveragePath(normalizedPath);
        const hotspot = hotspotByPath.get(normalizedPath) || null;
        const coveredInCore = fileNode?.attributes?.exists === true;
        const coveredByOverlay = hotspot != null;
        const coverageSources = Array.from(new Set([
            ...(Array.isArray(fileNode?.attributes?.source) ? fileNode.attributes.source : []),
            ...(hotspot ? [hotspotOverlay.coverageSource] : []),
        ])).sort((left, right) => left.localeCompare(right));

        return {
            path: normalizedPath,
            tracked: true,
            coveredInCore,
            coveredByOverlay,
            covered: coveredInCore || coveredByOverlay,
            coverageSources,
            scopeBlocks: index.scopeBlocksByFile.get(normalizedPath) || [],
            surfaces: index.surfacesByFile.get(normalizedPath) || [],
            classification: classification.classification,
            excludedFromCoverage: classification.excludedFromCoverage,
            excludeReason: classification.excludeReason,
            ...(hotspot ? {
                overlays: [{
                    blockId: hotspotOverlay.id,
                    coverageSource: hotspotOverlay.coverageSource,
                    changeCount: hotspot.changes,
                    dirty: hotspot.dirty,
                }],
            } : {}),
        };
    });

    const rawCoveredCount = files.filter((entry) => entry.covered).length;
    const rawTotalCount = files.length;
    const activeCoverageFiles = files.filter((entry) => entry.excludedFromCoverage !== true);
    const adjustedCoveredCount = activeCoverageFiles.filter((entry) => entry.covered).length;
    const adjustedTotalCount = activeCoverageFiles.length;
    const classificationSummary = new Map();

    for (const entry of files) {
        if (!classificationSummary.has(entry.classification)) {
            classificationSummary.set(entry.classification, {
                classification: entry.classification,
                excludedFromCoverage: entry.excludedFromCoverage,
                count: 0,
                coveredCount: 0,
            });
        }
        const bucket = classificationSummary.get(entry.classification);
        bucket.count += 1;
        if (entry.covered) bucket.coveredCount += 1;
    }

    return {
        schema_version: COVERAGE_SCHEMA_VERSION,
        contract: COVERAGE_CONTRACT,
        graph_contract: GRAPH_CONTRACT,
        graph_path: OUTPUT_PATH,
        overlayBlocks: hotspotOverlay ? [{
            id: hotspotOverlay.id,
            title: hotspotOverlay.title,
            coverageSource: hotspotOverlay.coverageSource,
            fileCount: hotspotOverlay.fileCount,
            files: hotspotOverlay.files.map((entry) => ({
                path: entry.path,
                changeCount: entry.changes,
                dirty: entry.dirty,
            })),
        }] : [],
        classificationRules: COVERAGE_CLASSIFICATION_RULES.map((rule) => ({
            classification: rule.classification,
            prefixes: rule.prefixes,
            excludedFromCoverage: rule.excludedFromCoverage,
            reason: rule.reason,
        })),
        summary: {
            trackedFileCount: rawTotalCount,
            rawCoveredFileCount: rawCoveredCount,
            rawCoveragePercent: rawTotalCount > 0 ? Number((rawCoveredCount / rawTotalCount * 100).toFixed(1)) : 0,
            adjustedTrackedFileCount: adjustedTotalCount,
            adjustedCoveredFileCount: adjustedCoveredCount,
            adjustedCoveragePercent: adjustedTotalCount > 0 ? Number((adjustedCoveredCount / adjustedTotalCount * 100).toFixed(1)) : 0,
            uncoveredFileCount: files.filter((entry) => !entry.covered).length,
            uncoveredActiveFileCount: activeCoverageFiles.filter((entry) => !entry.covered).length,
            classifications: Array.from(classificationSummary.values())
                .sort((left, right) => left.classification.localeCompare(right.classification)),
        },
        gate: buildCoverageGate(files, baselineCoverage),
        files,
    };
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

function emitBlockPlan(nodes, edges, plan, declaredBy) {
    const fileSource = (declaredBy === 'frontmatter' || declaredBy === 'archive-summary' || declaredBy === 'legacy-plan')
        ? 'scope-files'
        : declaredBy;
    nodes.upsert({
        id: plan.id,
        type: 'block',
        title: plan.title,
        status: plan.status,
        attributes: {
            source: Array.isArray(plan.source) && plan.source.length > 0 ? plan.source : ['block-plan'],
            priority: plan.priority ?? null,
            owner: plan.owner ?? null,
            planFile: plan.planFile ?? null,
            ...(plan.referencePlanFile ? { referencePlanFile: plan.referencePlanFile } : {}),
            ...(plan.currentPhase ? { currentPhase: plan.currentPhase } : {}),
            ...(Array.isArray(plan.scopeDeclarations) ? { scopeDeclarations: plan.scopeDeclarations } : {}),
            ...(plan.scopeResolution ? { scopeResolution: plan.scopeResolution } : {}),
            ...(Array.isArray(plan.scopeOverlapAllowedWith) ? { scopeOverlapAllowedWith: plan.scopeOverlapAllowedWith } : {}),
            ...(Array.isArray(plan.unknownFrontmatterFields) ? { unknownFrontmatterFields: plan.unknownFrontmatterFields } : {}),
        },
    });

    for (const phase of plan.phases || []) {
        const phaseId = buildPhaseNodeId(plan.id, phase.code);
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

    for (const subphase of plan.subphases || []) {
        const subphaseId = buildPhaseNodeId(plan.id, subphase.code);
        const phaseId = buildPhaseNodeId(plan.id, subphase.phaseCode);
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

    for (const scopeFile of plan.scopeFiles || []) {
        nodes.upsert({
            id: scopeFile,
            type: 'file',
            title: null,
            status: 'unknown',
            attributes: {
                source: [fileSource],
                scopeBlocks: [plan.id],
            },
        });
        edges.upsert({
            from: plan.id,
            to: scopeFile,
            type: 'scope',
            attributes: {
                declaredBy,
            },
        });
    }
}

function emitKnowledgeGraphMappings(nodes, edges, mappings) {
    for (const mapping of mappings || []) {
        for (const node of mapping.nodes || []) {
            nodes.upsert({
                id: node.id,
                type: node.type,
                title: node.title,
                status: node.status || 'unknown',
                attributes: {
                    source: ['knowledge-graph-mapping'],
                    mappingId: mapping.mapping_id,
                    mappingFile: mapping.filePath,
                    ...(mapping.description ? { mappingDescription: mapping.description } : {}),
                    ...(node.file ? { file: node.file } : {}),
                    ...(node.attributes || {}),
                },
            });

            if (node.file) {
                nodes.upsert({
                    id: node.file,
                    type: 'file',
                    title: null,
                    status: 'unknown',
                    attributes: {
                        source: ['knowledge-graph-mapping'],
                        mappedNodes: [node.id],
                    },
                });
                edges.upsert({
                    from: node.file,
                    to: node.id,
                    type: 'implements',
                    attributes: {
                        mappingId: mapping.mapping_id,
                        mappingFile: mapping.filePath,
                        relationLayer: classifyMappingRelationLayer('implements'),
                    },
                });
            }
        }
    }

    for (const mapping of mappings || []) {
        for (const edge of mapping.edges || []) {
            edges.upsert({
                from: edge.from,
                to: edge.to,
                type: edge.type,
                attributes: {
                    mappingId: mapping.mapping_id,
                    mappingFile: mapping.filePath,
                    relationLayer: classifyMappingRelationLayer(edge.type),
                    ...(edge.attributes || {}),
                },
            });
        }
    }
}

async function buildKnowledgeGraphModel() {
    const [masterContent, guardMatrixContent, canonicalPlans, fallbackBlockMetadata, knowledgeGraphMappings] = await Promise.all([
        fs.readFile(path.join(ROOT, MASTER_PLAN_PATH), 'utf8'),
        fs.readFile(path.join(ROOT, GUARD_MATRIX_PATH), 'utf8'),
        readCanonicalBlockPlans(),
        readFallbackBlockMetadata(),
        readKnowledgeGraphMappings(),
    ]);
    const trackedFiles = await readTrackedFiles();
    const trackedFileSet = new Set(trackedFiles);

    const masterRows = parseMasterRows(masterContent);
    const dependencyRows = parseDependencyTable(masterContent);
    const surfaceRows = parseGuardMatrix(guardMatrixContent);
    const resolvedCanonicalPlans = canonicalPlans
        .map((plan) => materializeScopePlan(plan, trackedFiles, trackedFileSet))
        .map((plan) => ({ ...plan, source: ['block-plan'] }));
    const resolvedFallbackMetadata = new Map(
        Array.from(fallbackBlockMetadata.entries())
            .map(([blockId, plan]) => [blockId, materializeScopePlan(plan, trackedFiles, trackedFileSet)])
    );
    const botTrainingPlans = await readBotTrainingPlans(trackedFiles, trackedFileSet);
    const auditPlans = await readAuditPlans(trackedFiles, trackedFileSet);
    const botTrainingDependencyRows = (await pathExists(BOT_TRAINING_MASTER_PATH))
        ? parseBotTrainingDependencyTable(await fs.readFile(path.join(ROOT, BOT_TRAINING_MASTER_PATH), 'utf8'))
        : [];

    const nodes = createNodeStore();
    const edges = createEdgeStore();

    const masterById = new Map(masterRows.map((row) => [row.id, row]));
    const planById = new Map(
        [...resolvedCanonicalPlans, ...botTrainingPlans]
            .map((plan) => [plan.id, plan])
    );
    const dependencyMeta = new Map();
    for (const dependencyRow of [...dependencyRows, ...botTrainingDependencyRows]) {
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

    for (const plan of resolvedCanonicalPlans) {
        emitBlockPlan(nodes, edges, plan, 'frontmatter');
    }

    for (const fallbackPlan of resolvedFallbackMetadata.values()) {
        if (planById.has(fallbackPlan.id)) continue;
        if (fallbackPlan.status !== 'done') continue;
        emitBlockPlan(nodes, edges, fallbackPlan, fallbackPlan.source?.includes('archive-summary') ? 'archive-summary' : 'legacy-plan');
    }

    for (const botTrainingPlan of botTrainingPlans) {
        emitBlockPlan(nodes, edges, botTrainingPlan, 'bot-training-plan');
    }

    for (const auditPlan of auditPlans) {
        emitBlockPlan(nodes, edges, auditPlan, 'audit-scope');
    }

    emitKnowledgeGraphMappings(nodes, edges, knowledgeGraphMappings);

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

    for (const plan of resolvedCanonicalPlans) {
        for (const dependencyToken of plan.dependsOn) {
            addDepends(plan.id, dependencyToken, 'frontmatter');
        }
    }
    for (const plan of botTrainingPlans) {
        for (const dependencyToken of plan.dependsOn) {
            addDepends(plan.id, dependencyToken, 'master-table');
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
        const resolvedPlan = planById.get(entry.to) || null;
        const resolvedFallback = resolvedFallbackMetadata.get(entry.to) || null;
        const resolvedTitle = masterById.get(entry.to)?.title
            || resolvedPlan?.title
            || resolvedFallback?.title
            || null;
        const resolvedStatus = masterById.get(entry.to)?.status
            || resolvedPlan?.status
            || resolvedFallback?.status
            || 'unknown';
        const resolvedPriority = masterById.get(entry.to)?.priority
            || resolvedPlan?.priority
            || resolvedFallback?.priority
            || null;
        const resolvedOwner = masterById.get(entry.to)?.owner
            || resolvedPlan?.owner
            || resolvedFallback?.owner
            || null;
        const resolvedCurrentPhase = masterById.get(entry.to)?.currentPhase
            || resolvedPlan?.currentPhase
            || resolvedFallback?.currentPhase
            || null;
        const resolvedPlanFile = masterById.get(entry.to)?.planFile
            || resolvedPlan?.planFile
            || resolvedFallback?.planFile
            || null;
        const sourceMarkers = Array.from(new Set([
            'dependency-target',
            ...(resolvedPlan?.source || []),
            ...(resolvedFallback?.source || []),
        ])).sort((left, right) => left.localeCompare(right));

        nodes.upsert({
            id: entry.to,
            type: 'block',
            status: resolvedStatus,
            title: resolvedTitle,
            attributes: {
                source: sourceMarkers,
                priority: resolvedPriority,
                owner: resolvedOwner,
                currentPhase: resolvedCurrentPhase,
                planFile: resolvedPlanFile,
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
        graph: {
            schema_version: GRAPH_SCHEMA_VERSION,
            contract: GRAPH_CONTRACT,
            nodes: sortedNodes,
            edges: sortedEdges,
        },
        trackedFiles,
    };
}

export async function buildKnowledgeGraph() {
    const { graph } = await buildKnowledgeGraphModel();
    return graph;
}

export async function writeKnowledgeGraph(outputPath = OUTPUT_PATH) {
    const graph = await buildKnowledgeGraph();
    const absoluteOutputPath = path.join(ROOT, normalizeRepoPath(outputPath));
    await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await fs.writeFile(absoluteOutputPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
    return graph;
}

export async function buildKnowledgeGraphArtifacts() {
    const { graph, trackedFiles } = await buildKnowledgeGraphModel();
    const coveredFileIds = new Set(
        graph.nodes
            .filter((node) => node.type === 'file' && node.attributes?.exists === true)
            .map((node) => node.id)
    );
    const [hotspotOverlay, baselineCoverage] = await Promise.all([
        buildGitHotspotOverlay(coveredFileIds, trackedFiles),
        readCoverageBaseline(),
    ]);
    const coverage = buildCoverageArtifact(graph, trackedFiles, hotspotOverlay, baselineCoverage);
    return {
        graph,
        coverage,
    };
}

async function writeJsonArtifact(outputPath, payload) {
    const absoluteOutputPath = path.join(ROOT, normalizeRepoPath(outputPath));
    await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await fs.writeFile(absoluteOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function writeKnowledgeGraphArtifacts({
    graphPath = OUTPUT_PATH,
    coveragePath = COVERAGE_OUTPUT_PATH,
} = {}) {
    const artifacts = await buildKnowledgeGraphArtifacts();
    await Promise.all([
        writeJsonArtifact(graphPath, artifacts.graph),
        writeJsonArtifact(coveragePath, artifacts.coverage),
    ]);
    return artifacts;
}

export {
    buildCoverageArtifact,
    buildGitHotspotOverlay,
    classifyCoveragePath,
    isActiveUncoveredCoverageFile,
    normalizeKnowledgeGraphMappingContract,
    parseFrontmatter,
    parseMasterRows,
    parseDependencyTable,
    parseDependencyToken,
    parseBotTrainingBlocks,
    parseBotTrainingDependencyTable,
    parseAuditMasterRows,
    parseAuditFindingsMetadata,
    parseGuardMatrix,
    resolveScopeEntries,
};

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    try {
        const { graph, coverage } = await writeKnowledgeGraphArtifacts();
        process.stdout.write(
            `[graph:build] core nodes=${graph.nodes.length} edges=${graph.edges.length} -> ${OUTPUT_PATH}; `
            + `coverage tracked=${coverage.summary.trackedFileCount} adjusted=${coverage.summary.adjustedCoveragePercent}% -> ${COVERAGE_OUTPUT_PATH}\n`
        );
    } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        process.stderr.write(`[graph:build] failed: ${message}\n`);
        process.exit(1);
    }
}
