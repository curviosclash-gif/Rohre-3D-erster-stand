#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const SCORECARD_PATH = 'docs/generated/knowledge-graph.scorecard.json';
const GIT_HOTSPOT_OVERLAY_ID = 'GIT-HISTORY-HOTSPOTS';
const execFile = promisify(execFileCallback);
const RUNTIME_QUERY_NODE_TYPES = new Set(['runtime', 'event', 'state', 'config', 'test']);
const RUNTIME_QUERY_EDGE_TYPES = new Set([
    'implements',
    'emits',
    'consumes',
    'reads_config',
    'reads_state',
    'writes_state',
    'validated_by',
    'cannot',
    'forbidden_by',
    'blocked_by',
]);
const NEGATIVE_EDGE_TYPES = new Set(['cannot', 'forbidden_by', 'blocked_by']);
const NEGATIVE_EDGE_TYPE_RANK = Object.freeze({
    forbidden_by: 0,
    blocked_by: 1,
    cannot: 2,
});
const NEGATIVE_EDGE_SEVERITY_RANK = Object.freeze({
    error: 0,
    warning: 1,
    info: 2,
});
const CAUSAL_DIRECTNESS_SCORE = Object.freeze({
    guardrail: 4,
    direct: 3,
    indirect: 2,
    context: 1,
});
const DEFAULT_CAUSAL_STRENGTH_BY_EDGE_TYPE = Object.freeze({
    forbidden_by: 0.98,
    blocked_by: 0.9,
    cannot: 0.75,
    writes_state: 0.86,
    emits: 0.82,
    consumes: 0.78,
    reads_config: 0.72,
    reads_state: 0.68,
    validated_by: 0.5,
    implements: 0.4,
});
const DEFAULT_CAUSAL_DIRECTNESS_BY_EDGE_TYPE = Object.freeze({
    forbidden_by: 'guardrail',
    blocked_by: 'guardrail',
    cannot: 'guardrail',
    writes_state: 'direct',
    emits: 'direct',
    consumes: 'direct',
    reads_config: 'indirect',
    reads_state: 'indirect',
    validated_by: 'context',
    implements: 'context',
});
const EVENT_FLOW_CONTEXT_EDGE_TYPES = new Set([
    'emits',
    'consumes',
    'reads_config',
    'reads_state',
    'writes_state',
    'validated_by',
    'cannot',
    'forbidden_by',
    'blocked_by',
]);
const CRITICAL_PATH_LAYER_REQUIREMENTS = Object.freeze({
    'combat-hit': ['runtime', 'event', 'state', 'config', 'test'],
    'round-end': ['runtime', 'event', 'state', 'config', 'test'],
    settings: ['runtime', 'state', 'config', 'test'],
    spawn: ['runtime', 'event', 'state', 'config', 'test'],
});
const QUERY_INTENT_PRESETS = Object.freeze({
    balance: {
        id: 'balance',
        description: 'Default profile for balanced impact triage.',
        maxPrimaryEdges: 3,
        includeWhyNot: false,
        includeUntestedSystems: false,
        includeOnboardingFlow: false,
    },
    incident: {
        id: 'incident',
        description: 'Prioritizes blockers, owner handoff and fast recovery checks.',
        maxPrimaryEdges: 5,
        includeWhyNot: true,
        includeUntestedSystems: true,
        includeOnboardingFlow: false,
    },
    review: {
        id: 'review',
        description: 'Prioritizes validation, provenance and untested-system checks.',
        maxPrimaryEdges: 4,
        includeWhyNot: false,
        includeUntestedSystems: true,
        includeOnboardingFlow: false,
    },
    onboarding: {
        id: 'onboarding',
        description: 'Adds readable event-flow context for unfamiliar critical paths.',
        maxPrimaryEdges: 3,
        includeWhyNot: false,
        includeUntestedSystems: false,
        includeOnboardingFlow: true,
    },
});
const SECRET_ATTRIBUTE_PATTERN = /(api[-_]?key|auth|credential|password|secret|token)/i;
const PII_ATTRIBUTE_PATTERN = /(email|phone|person|user[-_]?name)/i;
const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SECRET_VALUE_PATTERN = /\b(?:sk|ghp|pat|xox[baprs]|AKIA)[A-Za-z0-9_-]{12,}\b/;
const REDACTED_SECRET_VALUE = '[REDACTED:secret]';
const REDACTED_PII_VALUE = '[REDACTED:pii]';

function normalizePath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

function shouldRedactKey(key) {
    const normalized = String(key || '').trim();
    return SECRET_ATTRIBUTE_PATTERN.test(normalized) || PII_ATTRIBUTE_PATTERN.test(normalized);
}

function redactStringValue(value) {
    if (EMAIL_VALUE_PATTERN.test(value)) {
        return REDACTED_PII_VALUE;
    }
    if (SECRET_VALUE_PATTERN.test(value)) {
        return REDACTED_SECRET_VALUE;
    }
    return value;
}

function redactForGraphSafety(value, audit, currentKey = '') {
    if (value == null) return value;
    if (Array.isArray(value)) {
        return value.map((entry) => redactForGraphSafety(entry, audit, currentKey));
    }
    if (typeof value === 'object') {
        const redacted = {};
        for (const [key, entry] of Object.entries(value)) {
            if (shouldRedactKey(key)) {
                audit.redactedFields.add(key);
                redacted[key] = SECRET_ATTRIBUTE_PATTERN.test(key) ? REDACTED_SECRET_VALUE : REDACTED_PII_VALUE;
                continue;
            }
            redacted[key] = redactForGraphSafety(entry, audit, key);
        }
        return redacted;
    }
    if (typeof value === 'string') {
        const redacted = redactStringValue(value);
        if (redacted !== value) {
            audit.redactedFields.add(currentKey || '<value>');
        }
        return redacted;
    }
    return value;
}

function applyGraphSafetyFilter(payload, { unsafeRaw = false } = {}) {
    if (unsafeRaw) {
        return {
            ...payload,
            safety: {
                mode: 'unsafe-raw',
                redactionApplied: false,
                override: {
                    flag: '--unsafe-raw',
                    reason: 'Explicit local audit override requested by the operator.',
                },
            },
        };
    }

    const audit = {
        redactedFields: new Set(),
    };
    const redactedPayload = redactForGraphSafety(payload, audit);
    return {
        ...redactedPayload,
        safety: {
            mode: 'default-redacted',
            redactionApplied: audit.redactedFields.size > 0,
            redactedFields: Array.from(audit.redactedFields).sort((left, right) => left.localeCompare(right)),
            override: {
                flag: '--unsafe-raw',
                reason: 'Local-only raw export for incident audit; do not commit or share raw output.',
            },
        },
    };
}

function hasSource(node, sourceTag) {
    return Array.isArray(node?.attributes?.source) && node.attributes.source.includes(sourceTag);
}

function isScopeCollisionManagedBlock(node) {
    return hasSource(node, 'master-index') || hasSource(node, 'block-plan');
}

async function readArtifact(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
}

async function readArtifacts() {
    const [graph, coverage] = await Promise.all([
        readArtifact(GRAPH_PATH),
        readArtifact(COVERAGE_PATH),
    ]);
    return { graph, coverage };
}

async function runGitCommand(args) {
    try {
        const { stdout } = await execFile('git', args, {
            cwd: ROOT,
            maxBuffer: 10 * 1024 * 1024,
            windowsHide: true,
        });
        return stdout;
    } catch {
        return '';
    }
}

async function readChangedFiles(baseRef = 'HEAD') {
    const normalizedBase = String(baseRef || 'HEAD').trim() || 'HEAD';
    const stdout = await runGitCommand(['diff', '--name-only', normalizedBase, '--']);
    return stdout
        .split(/\r?\n/)
        .map((line) => normalizePath(line))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
}

function buildCoverageFileIndex(coverage) {
    return new Map(
        (Array.isArray(coverage.files) ? coverage.files : [])
            .map((entry) => [normalizePath(entry.path), entry])
    );
}

function buildGraphIndexes(graph) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    return {
        nodes,
        edges,
        nodeById: new Map(nodes.map((node) => [node.id, node])),
    };
}

function getCriticalPaths(node) {
    const attributes = node?.attributes || {};
    const values = Array.isArray(attributes.criticalPaths)
        ? attributes.criticalPaths
        : [attributes.criticalPath];
    return values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
}

function normalizeArtifactLinks(value) {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const type = String(entry.type || '').trim();
            const id = String(entry.id || '').trim();
            const pathValue = String(entry.path || '').trim();
            const url = String(entry.url || '').trim();
            if (!type || !id) return null;
            return {
                type,
                id,
                path: pathValue || null,
                url: url || null,
                role: String(entry.role || '').trim() || null,
            };
        })
        .filter(Boolean)
        .sort((left, right) => {
            const typeCompare = left.type.localeCompare(right.type);
            if (typeCompare !== 0) return typeCompare;
            return left.id.localeCompare(right.id);
        });
}

function summarizeOwnership(node) {
    const owner = node?.attributes?.owner;
    if (!owner || typeof owner !== 'object' || Array.isArray(owner)) {
        return null;
    }
    const team = String(owner.team || '').trim();
    const steward = String(owner.steward || '').trim();
    return {
        team: team || null,
        steward: steward || null,
        escalation: String(owner.escalation || '').trim() || null,
    };
}

function summarizeStability(node) {
    const stability = node?.attributes?.stability;
    if (!stability || typeof stability !== 'object' || Array.isArray(stability)) {
        return null;
    }
    const rawIndex = Number(stability.index);
    const index = Number.isFinite(rawIndex)
        ? Number(Math.max(0, Math.min(1, rawIndex)).toFixed(2))
        : null;
    return {
        index,
        tier: String(stability.tier || '').trim() || null,
        signals: Array.isArray(stability.signals)
            ? stability.signals.map((signal) => String(signal || '').trim()).filter(Boolean).sort((left, right) => left.localeCompare(right))
            : [],
    };
}

function resolveQueryIntentPreset(value) {
    const id = String(value || 'balance').trim() || 'balance';
    return QUERY_INTENT_PRESETS[id] || QUERY_INTENT_PRESETS.balance;
}

function nodeSummary(node) {
    if (!node) return null;
    return {
        id: node.id,
        type: node.type,
        title: node.title || null,
        file: node.attributes?.file || null,
        provenance: node.attributes?.provenance || null,
        criticalPaths: getCriticalPaths(node),
        mappingId: node.attributes?.mappingId || null,
        ownership: summarizeOwnership(node),
        stability: summarizeStability(node),
        artifacts: normalizeArtifactLinks(node.attributes?.artifacts),
    };
}

function edgeSummary(edge, nodeById) {
    const causal = summarizeCausalWeight(edge);
    return {
        from: edge.from,
        fromType: nodeById.get(edge.from)?.type || null,
        to: edge.to,
        toType: nodeById.get(edge.to)?.type || null,
        type: edge.type,
        relationLayer: edge.attributes?.relationLayer || null,
        mappingId: edge.attributes?.mappingId || null,
        reason: edge.attributes?.reason || null,
        severity: edge.attributes?.severity || null,
        strength: causal.strength,
        directness: causal.directness,
        causalScore: causal.score,
        provenance: edge.attributes?.provenance || null,
        explainability: {
            reason: edge.attributes?.reason || null,
            mappingFile: edge.attributes?.mappingFile || null,
            provenance: edge.attributes?.provenance || null,
        },
    };
}

function summarizeCausalWeight(edge) {
    const rawStrength = Number(edge?.attributes?.strength);
    const strength = Number.isFinite(rawStrength)
        ? Math.max(0, Math.min(1, rawStrength))
        : DEFAULT_CAUSAL_STRENGTH_BY_EDGE_TYPE[edge?.type] ?? 0.35;
    const directness = String(edge?.attributes?.directness || DEFAULT_CAUSAL_DIRECTNESS_BY_EDGE_TYPE[edge?.type] || 'context').trim();
    const directnessScore = CAUSAL_DIRECTNESS_SCORE[directness] ?? CAUSAL_DIRECTNESS_SCORE.context;
    return {
        strength,
        directness,
        score: Number((strength * directnessScore).toFixed(3)),
    };
}

function sortNodeSummaries(entries) {
    return entries.sort((left, right) => {
        const typeCompare = String(left.type || '').localeCompare(String(right.type || ''));
        if (typeCompare !== 0) return typeCompare;
        return String(left.id || '').localeCompare(String(right.id || ''));
    });
}

function sortEdgeSummaries(entries) {
    return entries.sort((left, right) => {
        const causalCompare = (right.causalScore ?? 0) - (left.causalScore ?? 0);
        if (causalCompare !== 0) return causalCompare;
        const typeRankCompare = (NEGATIVE_EDGE_TYPE_RANK[left.type] ?? 99) - (NEGATIVE_EDGE_TYPE_RANK[right.type] ?? 99);
        if (typeRankCompare !== 0) return typeRankCompare;
        const severityCompare = (NEGATIVE_EDGE_SEVERITY_RANK[left.severity] ?? 99) - (NEGATIVE_EDGE_SEVERITY_RANK[right.severity] ?? 99);
        if (severityCompare !== 0) return severityCompare;
        const fromCompare = String(left.from || '').localeCompare(String(right.from || ''));
        if (fromCompare !== 0) return fromCompare;
        const toCompare = String(left.to || '').localeCompare(String(right.to || ''));
        if (toCompare !== 0) return toCompare;
        return String(left.type || '').localeCompare(String(right.type || ''));
    });
}

function normalizeCriticalPathFilter(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    return normalized.startsWith('event:') ? normalized.slice('event:'.length) : normalized;
}

function nodeMatchesCriticalPath(node, criticalPath) {
    const normalizedCriticalPath = normalizeCriticalPathFilter(criticalPath);
    if (!normalizedCriticalPath) return true;
    return getCriticalPaths(node).includes(normalizedCriticalPath);
}

function queryOpenDeps(graph, blockId) {
    const normalizedBlockId = String(blockId || '').trim();
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const result = edges
        .filter((edge) => edge.type === 'depends_on' && edge.from === normalizedBlockId && edge.fulfilled !== true)
        .map((edge) => ({
            dependsOn: edge.to,
            source: edge.source || 'unknown',
            hard: edge.hard === true,
            fulfilled: edge.fulfilled === true,
            hint: edge.hint ?? null,
            dependsPhase: edge.attributes?.dependsPhase ?? null,
        }))
        .sort((left, right) => String(left.dependsOn).localeCompare(String(right.dependsOn)));

    return {
        query: 'open-deps',
        blockId: normalizedBlockId,
        openDependencies: result,
    };
}

function queryScopeCollisions(graph) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const openBlockIds = new Set(
        nodes
            .filter((node) => node.type === 'block' && node.status !== 'done' && isScopeCollisionManagedBlock(node))
            .map((node) => node.id)
    );

    const scopeByBlock = new Map();
    for (const edge of edges) {
        if (edge.type !== 'scope') continue;
        if (!openBlockIds.has(edge.from)) continue;
        if (!scopeByBlock.has(edge.from)) {
            scopeByBlock.set(edge.from, new Set());
        }
        scopeByBlock.get(edge.from).add(edge.to);
    }

    const blockIds = Array.from(scopeByBlock.keys()).sort((left, right) => left.localeCompare(right));
    const collisions = [];
    for (let index = 0; index < blockIds.length; index += 1) {
        for (let cursor = index + 1; cursor < blockIds.length; cursor += 1) {
            const leftBlock = blockIds[index];
            const rightBlock = blockIds[cursor];
            const rightScope = scopeByBlock.get(rightBlock);
            const shared = Array.from(scopeByBlock.get(leftBlock))
                .filter((filePath) => rightScope.has(filePath))
                .sort((left, right) => left.localeCompare(right));
            if (shared.length === 0) continue;
            collisions.push({
                leftBlock,
                rightBlock,
                sharedFiles: shared,
            });
        }
    }

    return {
        query: 'scope-collisions',
        collisions,
    };
}

function querySurfacesForFile(graph, filePath) {
    const normalizedFilePath = normalizePath(filePath);
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const touches = edges
        .filter((edge) => edge.type === 'touches' && normalizePath(edge.from) === normalizedFilePath)
        .map((edge) => ({
            surface: edge.to,
            roles: Array.isArray(edge.attributes?.roles) ? edge.attributes.roles : [],
        }))
        .sort((left, right) => left.surface.localeCompare(right.surface));

    return {
        query: 'surfaces-for-file',
        file: normalizedFilePath,
        surfaces: touches,
    };
}

function queryCoverageReport(coverage) {
    return {
        query: 'coverage-report',
        summary: coverage.summary || {},
        overlayBlocks: Array.isArray(coverage.overlayBlocks) ? coverage.overlayBlocks : [],
        gate: coverage.gate || null,
    };
}

function queryExportView(graph, coverage, { unsafeRaw = false } = {}) {
    const { nodes, edges } = buildGraphIndexes(graph);
    const payload = {
        query: 'export-view',
        contract: graph.contract || null,
        schemaVersion: graph.schema_version ?? null,
        generatedAt: graph.generated_at || null,
        summary: graph.summary || {
            nodeCount: nodes.length,
            edgeCount: edges.length,
        },
        coverage: {
            summary: coverage.summary || {},
            gate: coverage.gate || null,
        },
        nodes,
        edges,
    };

    return applyGraphSafetyFilter(payload, { unsafeRaw });
}

function queryUncoveredFiles(coverage, prefix = '') {
    const normalizedPrefix = normalizePath(prefix);
    const uncoveredFiles = (Array.isArray(coverage.files) ? coverage.files : [])
        .filter((entry) => entry.covered !== true)
        .filter((entry) => !normalizedPrefix || normalizePath(entry.path).startsWith(normalizedPrefix))
        .map((entry) => ({
            path: entry.path,
            classification: entry.classification,
            excludedFromCoverage: entry.excludedFromCoverage === true,
            excludeReason: entry.excludeReason ?? null,
            coverageSources: Array.isArray(entry.coverageSources) ? entry.coverageSources : [],
        }))
        .sort((left, right) => left.path.localeCompare(right.path));

    return {
        query: 'uncovered-files',
        prefix: normalizedPrefix || null,
        files: uncoveredFiles,
    };
}

function queryWhyFile(graph, coverage, filePath) {
    const normalizedFilePath = normalizePath(filePath);
    const coverageFile = buildCoverageFileIndex(coverage).get(normalizedFilePath) || null;
    const fileNode = (Array.isArray(graph.nodes) ? graph.nodes : [])
        .find((node) => node.type === 'file' && normalizePath(node.id) === normalizedFilePath) || null;

    return {
        query: 'why-file',
        file: normalizedFilePath,
        existsInCoreGraph: fileNode != null,
        fileNode,
        coverage: coverageFile,
    };
}

function queryFilesForBlock(graph, coverage, blockId) {
    const normalizedBlockId = String(blockId || '').trim();
    const coverageIndex = buildCoverageFileIndex(coverage);

    if (normalizedBlockId === GIT_HOTSPOT_OVERLAY_ID) {
        const overlay = (coverage.overlayBlocks || []).find((entry) => entry.id === normalizedBlockId) || null;
        return {
            query: 'files-for-block',
            blockId: normalizedBlockId,
            title: overlay?.title || null,
            coverageSource: overlay?.coverageSource || null,
            files: (overlay?.files || []).map((entry) => ({
                path: entry.path,
                changeCount: entry.changeCount,
                dirty: entry.dirty,
                classification: coverageIndex.get(normalizePath(entry.path))?.classification || null,
            })),
        };
    }

    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const files = edges
        .filter((edge) => edge.type === 'scope' && edge.from === normalizedBlockId)
        .map((edge) => {
            const coverageEntry = coverageIndex.get(normalizePath(edge.to)) || null;
            return {
                path: edge.to,
                covered: coverageEntry?.covered === true,
                classification: coverageEntry?.classification || null,
                excludedFromCoverage: coverageEntry?.excludedFromCoverage === true,
            };
        })
        .sort((left, right) => left.path.localeCompare(right.path));

    return {
        query: 'files-for-block',
        blockId: normalizedBlockId,
        files,
    };
}

function queryImpactForFile(graph, coverage, filePath) {
    const normalizedFilePath = normalizePath(filePath);
    const coverageFile = buildCoverageFileIndex(coverage).get(normalizedFilePath) || null;
    const { nodes, edges, nodeById } = buildGraphIndexes(graph);
    const directNodes = nodes
        .filter((node) => node.attributes?.file && normalizePath(node.attributes.file) === normalizedFilePath)
        .map(nodeSummary)
        .filter(Boolean);
    const implementedNodeIds = new Set(
        edges
            .filter((edge) => edge.type === 'implements' && normalizePath(edge.from) === normalizedFilePath)
            .map((edge) => edge.to)
    );
    for (const entry of directNodes) {
        implementedNodeIds.add(entry.id);
    }

    const relationEdges = edges
        .filter((edge) => RUNTIME_QUERY_EDGE_TYPES.has(edge.type))
        .filter((edge) => implementedNodeIds.has(edge.from) || implementedNodeIds.has(edge.to))
        .map((edge) => edgeSummary(edge, nodeById));
    const neighborIds = new Set();
    for (const edge of relationEdges) {
        if (!implementedNodeIds.has(edge.from)) neighborIds.add(edge.from);
        if (!implementedNodeIds.has(edge.to)) neighborIds.add(edge.to);
    }

    const relatedNodes = Array.from(neighborIds)
        .map((nodeId) => nodeSummary(nodeById.get(nodeId)))
        .filter((node) => node && RUNTIME_QUERY_NODE_TYPES.has(node.type));
    const criticalPaths = Array.from(new Set([
        ...directNodes.flatMap((node) => node.criticalPaths),
        ...relatedNodes.flatMap((node) => node.criticalPaths),
    ])).sort((left, right) => left.localeCompare(right));

    return {
        query: 'impact-for-file',
        file: normalizedFilePath,
        existsInCoreGraph: directNodes.length > 0 || implementedNodeIds.size > 0,
        coverage: coverageFile ? {
            covered: coverageFile.covered === true,
            coveredInCore: coverageFile.coveredInCore === true,
            coveredByOverlay: coverageFile.coveredByOverlay === true,
            classification: coverageFile.classification || null,
            scopeBlocks: Array.isArray(coverageFile.scopeBlocks) ? coverageFile.scopeBlocks : [],
            surfaces: Array.isArray(coverageFile.surfaces) ? coverageFile.surfaces : [],
        } : null,
        implementedNodes: sortNodeSummaries(directNodes),
        relatedNodes: sortNodeSummaries(relatedNodes),
        relationEdges: sortEdgeSummaries(relationEdges),
        criticalPaths,
    };
}

function buildImpactedSubgraph(graph, impactedNodeIds) {
    const { nodes, edges, nodeById } = buildGraphIndexes(graph);
    const nodeIdSet = impactedNodeIds instanceof Set ? impactedNodeIds : new Set(impactedNodeIds || []);
    const relationEdges = edges
        .filter((edge) => RUNTIME_QUERY_EDGE_TYPES.has(edge.type))
        .filter((edge) => nodeIdSet.has(edge.from) || nodeIdSet.has(edge.to));

    for (const edge of relationEdges) {
        nodeIdSet.add(edge.from);
        nodeIdSet.add(edge.to);
    }

    const subgraphNodes = Array.from(nodeIdSet)
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node) => node && RUNTIME_QUERY_NODE_TYPES.has(node.type))
        .map(nodeSummary)
        .filter(Boolean);

    return {
        nodes: sortNodeSummaries(subgraphNodes),
        edges: sortEdgeSummaries(relationEdges.map((edge) => edgeSummary(edge, nodeById))),
    };
}

function summarizeNodeOwnership(nodes) {
    const seen = new Set();
    return (nodes || [])
        .map((node) => node.ownership)
        .filter(Boolean)
        .filter((entry) => {
            const key = `${entry.team || ''}::${entry.steward || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((left, right) => `${left.team || ''}:${left.steward || ''}`.localeCompare(`${right.team || ''}:${right.steward || ''}`));
}

function summarizeNodeStability(nodes) {
    const indexes = (nodes || [])
        .map((node) => node.stability?.index)
        .filter((value) => Number.isFinite(value));
    if (indexes.length === 0) {
        return {
            minIndex: null,
            averageIndex: null,
            tier: null,
        };
    }
    const minIndex = Math.min(...indexes);
    const averageIndex = indexes.reduce((sum, value) => sum + value, 0) / indexes.length;
    return {
        minIndex: Number(minIndex.toFixed(2)),
        averageIndex: Number(averageIndex.toFixed(2)),
        tier: minIndex >= 0.85 ? 'stable' : (minIndex >= 0.7 ? 'watch' : 'fragile'),
    };
}

function summarizeArtifacts(nodes) {
    const artifactByKey = new Map();
    for (const node of nodes || []) {
        for (const artifact of node.artifacts || []) {
            artifactByKey.set(`${artifact.type}::${artifact.id}`, artifact);
        }
    }
    return Array.from(artifactByKey.values())
        .sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`));
}

function buildExplainability(primaryImpactEdges, nodes) {
    const owners = summarizeNodeOwnership(nodes);
    const stability = summarizeNodeStability(nodes);
    const artifacts = summarizeArtifacts(nodes);
    return {
        drivers: (primaryImpactEdges || []).map((edge) => ({
            edge: `${edge.from} -> ${edge.to} (${edge.type})`,
            causalScore: edge.causalScore,
            directness: edge.directness,
        })),
        owners,
        stability,
        artifacts,
    };
}

function buildRecommendedChecks(criticalPaths, preset) {
    const sortedCriticalPaths = Array.from(criticalPaths || []).sort((left, right) => left.localeCompare(right));
    const checks = [
        'npm run graph:build',
        'npm run graph:check',
        ...sortedCriticalPaths.map((criticalPath) => `node scripts/query-knowledge-graph.mjs event-flow ${criticalPath} --json`),
    ];
    if (preset.includeWhyNot) {
        checks.push(...sortedCriticalPaths.map((criticalPath) => `node scripts/query-knowledge-graph.mjs why-not ${criticalPath} --json`));
    }
    if (preset.includeUntestedSystems) {
        checks.push(...sortedCriticalPaths.map((criticalPath) => `node scripts/query-knowledge-graph.mjs untested-systems ${criticalPath} --json`));
    }
    if (preset.includeOnboardingFlow) {
        checks.push('node scripts/query-knowledge-graph.mjs critical-path-health --json');
    }
    return Array.from(new Set(checks));
}

function queryImpactDiff(graph, coverage, changedFiles, { baseRef = null, preset = 'balance' } = {}) {
    const intentPreset = resolveQueryIntentPreset(preset);
    const normalizedFiles = Array.from(new Set((changedFiles || [])
        .map((filePath) => normalizePath(filePath))
        .filter(Boolean)))
        .sort((left, right) => left.localeCompare(right));
    const fileImpacts = normalizedFiles.map((filePath) => queryImpactForFile(graph, coverage, filePath));
    const impactedNodeIds = new Set();
    const criticalPaths = new Set();
    const riskFiles = [];

    for (const impact of fileImpacts) {
        for (const criticalPath of impact.criticalPaths || []) {
            criticalPaths.add(criticalPath);
        }
        for (const node of [...impact.implementedNodes, ...impact.relatedNodes]) {
            impactedNodeIds.add(node.id);
        }
        const isRuntimeMapped = impact.implementedNodes.length > 0 || impact.relationEdges.length > 0;
        const isActiveProductCode = impact.coverage?.excludedFromCoverage !== true
            && ['product-code', 'product-docs', 'dev-tooling', 'governance-tooling'].includes(impact.coverage?.classification || '');
        if (isRuntimeMapped || (isActiveProductCode && impact.criticalPaths.length > 0)) {
            const impactedNodes = [...impact.implementedNodes, ...impact.relatedNodes];
            const primaryImpactEdges = (impact.relationEdges || [])
                .slice(0, intentPreset.maxPrimaryEdges)
                .map((edge) => ({
                    from: edge.from,
                    to: edge.to,
                    type: edge.type,
                    strength: edge.strength,
                    directness: edge.directness,
                    causalScore: edge.causalScore,
                }));
            riskFiles.push({
                file: impact.file,
                criticalPaths: impact.criticalPaths,
                implementedNodeCount: impact.implementedNodes.length,
                relationEdgeCount: impact.relationEdges.length,
                maxCausalScore: primaryImpactEdges[0]?.causalScore ?? 0,
                primaryImpactEdges,
                ownership: summarizeNodeOwnership(impactedNodes),
                stability: summarizeNodeStability(impactedNodes),
                artifacts: summarizeArtifacts(impactedNodes),
                explainability: buildExplainability(primaryImpactEdges, impactedNodes),
            });
        }
    }

    const subgraph = buildImpactedSubgraph(graph, impactedNodeIds);
    const sortedCriticalPaths = Array.from(criticalPaths).sort((left, right) => left.localeCompare(right));

    return {
        query: 'impact-diff',
        baseRef,
        preset: {
            id: intentPreset.id,
            description: intentPreset.description,
        },
        changedFileCount: normalizedFiles.length,
        changedFiles: normalizedFiles,
        riskStatus: riskFiles.length > 0 ? 'review' : 'low',
        criticalPaths: sortedCriticalPaths,
        riskFiles,
        subgraph,
        recommendedChecks: buildRecommendedChecks(sortedCriticalPaths, intentPreset),
        fileImpacts,
    };
}

function queryChangeRisk(graph, coverage, changedFiles, { baseRef = null, preset = 'incident' } = {}) {
    const impact = queryImpactDiff(graph, coverage, changedFiles, { baseRef, preset });
    return {
        ...impact,
        query: 'change-risk',
        sourceQuery: impact.query,
    };
}

function resolveWhatIfSelection(graph, coverage, selector) {
    const normalizedSelector = normalizePath(selector);
    const { nodes, edges, nodeById } = buildGraphIndexes(graph);
    const coverageByPath = buildCoverageFileIndex(coverage);
    const preferFileSelection = coverageByPath.has(normalizedSelector) || normalizedSelector.includes('/');
    if (preferFileSelection) {
        const fileImpact = queryImpactForFile(graph, coverage, normalizedSelector);
        if (fileImpact.implementedNodes.length > 0 || fileImpact.relatedNodes.length > 0 || fileImpact.relationEdges.length > 0) {
            const impactedNodeIds = new Set([
                ...fileImpact.implementedNodes.map((node) => node.id),
                ...fileImpact.relatedNodes.map((node) => node.id),
            ]);
            return {
                selector: normalizedSelector,
                selectorType: 'file',
                nodes: Array.from(impactedNodeIds).map((nodeId) => nodeById.get(nodeId)).filter(Boolean),
                edges: fileImpact.relationEdges,
                fileImpact,
            };
        }
    }
    const selectedNode = nodeById.get(normalizedSelector) || null;
    if (selectedNode) {
        return {
            selector: normalizedSelector,
            selectorType: 'node',
            nodes: [selectedNode],
            edges: edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id),
            fileImpact: null,
        };
    }

    const fileImpact = queryImpactForFile(graph, coverage, normalizedSelector);
    if (fileImpact.implementedNodes.length > 0 || fileImpact.relatedNodes.length > 0 || fileImpact.relationEdges.length > 0) {
        const impactedNodeIds = new Set([
            ...fileImpact.implementedNodes.map((node) => node.id),
            ...fileImpact.relatedNodes.map((node) => node.id),
        ]);
        return {
            selector: normalizedSelector,
            selectorType: 'file',
            nodes: Array.from(impactedNodeIds).map((nodeId) => nodeById.get(nodeId)).filter(Boolean),
            edges: fileImpact.relationEdges,
            fileImpact,
        };
    }

    const criticalPath = normalizeCriticalPathFilter(normalizedSelector);
    const pathNodes = nodes.filter((node) => nodeMatchesCriticalPath(node, criticalPath) && RUNTIME_QUERY_NODE_TYPES.has(node.type));
    const pathNodeIds = new Set(pathNodes.map((node) => node.id));
    return {
        selector: normalizedSelector,
        selectorType: 'critical-path',
        nodes: pathNodes,
        edges: edges.filter((edge) => pathNodeIds.has(edge.from) || pathNodeIds.has(edge.to)).map((edge) => edgeSummary(edge, nodeById)),
        fileImpact: null,
    };
}

function summarizeWhatIfSelection(selection) {
    const criticalPaths = Array.from(new Set((selection.nodes || []).flatMap((node) => getCriticalPaths(node))))
        .sort((left, right) => left.localeCompare(right));
    const edgeTypes = Array.from(new Set((selection.edges || []).map((edge) => edge.type)))
        .sort((left, right) => left.localeCompare(right));
    const validationEdges = (selection.edges || []).filter((edge) => edge.type === 'validated_by');
    const blockerEdges = (selection.edges || []).filter((edge) => NEGATIVE_EDGE_TYPES.has(edge.type));
    const maxCausalScore = (selection.edges || [])
        .map((edge) => edge.causalScore ?? summarizeCausalWeight(edge).score)
        .reduce((maxScore, score) => Math.max(maxScore, Number(score) || 0), 0);

    return {
        nodeCount: selection.nodes.length,
        edgeCount: selection.edges.length,
        criticalPaths,
        edgeTypes,
        validationEdgeCount: validationEdges.length,
        blockerEdgeCount: blockerEdges.length,
        maxCausalScore: Number(maxCausalScore.toFixed(3)),
    };
}

function buildUncertaintyBudget(selection, summary) {
    const reasons = [];
    let score = 0.12;
    if (selection.selectorType === 'critical-path') {
        score += 0.18;
        reasons.push('critical-path selectors include all mapped runtime nodes and may over-approximate local file ownership');
    }
    if (selection.selectorType === 'file' && selection.fileImpact?.coverage?.coveredByOverlay === true && selection.fileImpact?.coverage?.coveredInCore !== true) {
        score += 0.22;
        reasons.push('file is covered by overlay metadata instead of core graph mapping');
    }
    if (summary.validationEdgeCount === 0) {
        score += 0.2;
        reasons.push('no validation edge anchors this selection');
    }
    if (summary.blockerEdgeCount > 0) {
        score += 0.08;
        reasons.push('negative guardrail edges are present and require human interpretation');
    }
    if (selection.nodes.length === 0) {
        score += 0.3;
        reasons.push('selector did not resolve to mapped runtime nodes');
    }

    const normalizedScore = Number(Math.min(1, score).toFixed(2));
    return {
        score: normalizedScore,
        tier: normalizedScore <= 0.25 ? 'low' : normalizedScore <= 0.55 ? 'medium' : 'high',
        reasons,
    };
}

function queryWhatIfRemove(graph, coverage, selector) {
    const selection = resolveWhatIfSelection(graph, coverage, selector);
    const summary = summarizeWhatIfSelection(selection);
    return {
        query: 'what-if-remove',
        selector: selection.selector,
        selectorType: selection.selectorType,
        hypothesis: 'remove selected graph surface',
        blastRadius: summary,
        uncertaintyBudget: buildUncertaintyBudget(selection, summary),
        predictedEffects: [
            ...summary.criticalPaths.map((criticalPath) => ({
                criticalPath,
                effect: summary.validationEdgeCount > 0 ? 'validation coverage may shrink' : 'runtime context may lose an unvalidated mapping',
            })),
            ...(summary.blockerEdgeCount > 0 ? [{
                criticalPath: summary.criticalPaths[0] || null,
                effect: 'guardrail/blocker evidence would need replacement before removal',
            }] : []),
        ],
        recommendedChecks: [
            'npm run graph:build',
            'npm run graph:check',
            ...summary.criticalPaths.map((criticalPath) => `node scripts/query-knowledge-graph.mjs event-flow ${criticalPath} --json`),
        ],
    };
}

function queryWhatIfReplace(graph, coverage, fromSelector, toSelector) {
    const fromSelection = resolveWhatIfSelection(graph, coverage, fromSelector);
    const toSelection = resolveWhatIfSelection(graph, coverage, toSelector);
    const fromSummary = summarizeWhatIfSelection(fromSelection);
    const toSummary = summarizeWhatIfSelection(toSelection);
    const fromPaths = new Set(fromSummary.criticalPaths);
    const toPaths = new Set(toSummary.criticalPaths);
    const lostCriticalPaths = fromSummary.criticalPaths.filter((criticalPath) => !toPaths.has(criticalPath));
    const gainedCriticalPaths = toSummary.criticalPaths.filter((criticalPath) => !fromPaths.has(criticalPath));
    const sharedCriticalPaths = fromSummary.criticalPaths.filter((criticalPath) => toPaths.has(criticalPath));
    const uncertainty = buildUncertaintyBudget(fromSelection, fromSummary);
    const replacementUncertainty = buildUncertaintyBudget(toSelection, toSummary);
    uncertainty.score = Number(Math.min(1, Math.max(uncertainty.score, replacementUncertainty.score)).toFixed(2));
    uncertainty.tier = uncertainty.score <= 0.25 ? 'low' : uncertainty.score <= 0.55 ? 'medium' : 'high';
    uncertainty.reasons = Array.from(new Set([...uncertainty.reasons, ...replacementUncertainty.reasons]))
        .sort((left, right) => left.localeCompare(right));

    return {
        query: 'what-if-replace',
        from: {
            selector: fromSelection.selector,
            selectorType: fromSelection.selectorType,
            blastRadius: fromSummary,
        },
        to: {
            selector: toSelection.selector,
            selectorType: toSelection.selectorType,
            blastRadius: toSummary,
        },
        comparison: {
            sharedCriticalPaths,
            lostCriticalPaths,
            gainedCriticalPaths,
            validationEdgeDelta: toSummary.validationEdgeCount - fromSummary.validationEdgeCount,
            maxCausalScoreDelta: Number((toSummary.maxCausalScore - fromSummary.maxCausalScore).toFixed(3)),
        },
        uncertaintyBudget: uncertainty,
        recommendedChecks: [
            'npm run graph:build',
            'npm run graph:check',
            ...Array.from(new Set([...fromSummary.criticalPaths, ...toSummary.criticalPaths]))
                .sort((left, right) => left.localeCompare(right))
                .map((criticalPath) => `node scripts/query-knowledge-graph.mjs event-flow ${criticalPath} --json`),
        ],
    };
}

function queryQualityScorecard(scorecard) {
    return {
        query: 'quality-scorecard',
        ...scorecard,
    };
}

function queryIncidentAutoMinimize(graph, coverage, changedFiles, { baseRef = null } = {}) {
    const impact = queryChangeRisk(graph, coverage, changedFiles, { baseRef, preset: 'incident' });
    const candidates = (impact.riskFiles || [])
        .map((riskFile) => {
            const selector = riskFile.file;
            const counterfactual = queryWhatIfRemove(graph, coverage, selector);
            const topEdges = (riskFile.primaryImpactEdges || []).slice(0, 2);
            const criticalPaths = Array.from(new Set([
                ...(riskFile.criticalPaths || []),
                ...(counterfactual.blastRadius?.criticalPaths || []),
            ])).sort((left, right) => left.localeCompare(right));
            const confidenceScore = Math.max(
                0,
                Math.min(1, 1 - Number(counterfactual.uncertaintyBudget?.score || 0))
            );
            return {
                file: selector,
                criticalPaths,
                maxCausalScore: riskFile.maxCausalScore,
                uncertaintyTier: counterfactual.uncertaintyBudget?.tier || 'unknown',
                confidenceScore: Number(confidenceScore.toFixed(2)),
                rootEvidence: topEdges.map((edge) => `${edge.from} -> ${edge.to} (${edge.type})`),
                recommendedChecks: Array.from(new Set([
                    `node scripts/query-knowledge-graph.mjs impact-for-file ${selector} --json`,
                    ...criticalPaths.map((criticalPath) => `node scripts/query-knowledge-graph.mjs event-flow ${criticalPath} --json`),
                    ...criticalPaths.map((criticalPath) => `node scripts/query-knowledge-graph.mjs why-not ${criticalPath} --json`),
                ])),
            };
        })
        .sort((left, right) => (
            right.maxCausalScore - left.maxCausalScore
            || right.confidenceScore - left.confidenceScore
            || left.file.localeCompare(right.file)
        ));

    return {
        query: 'incident-auto-minimize',
        sourceQuery: impact.query,
        baseRef,
        changedFiles: impact.changedFiles,
        candidateCount: candidates.length,
        status: candidates.length > 0 ? 'review' : 'low',
        minimizedCandidates: candidates.slice(0, 3),
        recommendedChecks: Array.from(new Set([
            'npm run graph:build',
            'npm run graph:check',
            ...candidates.slice(0, 3).flatMap((candidate) => candidate.recommendedChecks),
        ])),
    };
}

function collectValidationTestCandidates(graph, criticalPaths, impactedNodeIds) {
    const { nodes, edges, nodeById } = buildGraphIndexes(graph);
    const criticalPathSet = new Set(criticalPaths || []);
    const impactedSet = impactedNodeIds instanceof Set ? impactedNodeIds : new Set(impactedNodeIds || []);
    const candidateById = new Map();

    const addCandidate = (testNode, reason, scoreBoost = 0) => {
        if (!testNode || testNode.type !== 'test') return;
        const summary = nodeSummary(testNode);
        if (!summary?.file) return;
        const matchedCriticalPaths = summary.criticalPaths.filter((criticalPath) => criticalPathSet.has(criticalPath));
        const key = testNode.id;
        const existing = candidateById.get(key) || {
            testId: testNode.id,
            title: testNode.title || null,
            file: summary.file,
            criticalPaths: matchedCriticalPaths,
            reasons: [],
            score: 0,
            command: `node --test ${summary.file}`,
        };
        existing.criticalPaths = Array.from(new Set([...existing.criticalPaths, ...matchedCriticalPaths]))
            .sort((left, right) => left.localeCompare(right));
        existing.reasons.push(reason);
        existing.score += scoreBoost;
        candidateById.set(key, existing);
    };

    for (const edge of edges) {
        if (edge.type !== 'validated_by') continue;
        const testNode = nodeById.get(edge.to);
        if (!testNode || testNode.type !== 'test') continue;
        const sourceNode = nodeById.get(edge.from);
        const edgeCriticalPaths = Array.from(new Set([
            ...getCriticalPaths(sourceNode),
            ...getCriticalPaths(testNode),
        ]));
        const matchesPath = edgeCriticalPaths.some((criticalPath) => criticalPathSet.has(criticalPath));
        const matchesImpact = impactedSet.has(edge.from);
        if (matchesImpact || matchesPath) {
            const causal = summarizeCausalWeight(edge);
            addCandidate(
                testNode,
                matchesImpact ? `validates impacted node ${edge.from}` : `validates critical path ${edgeCriticalPaths.join(',')}`,
                (matchesImpact ? 2 : 1) + causal.score
            );
        }
    }

    for (const node of nodes) {
        if (node.type !== 'test') continue;
        const nodePaths = getCriticalPaths(node);
        if (nodePaths.some((criticalPath) => criticalPathSet.has(criticalPath))) {
            addCandidate(node, `covers critical path ${nodePaths.filter((criticalPath) => criticalPathSet.has(criticalPath)).join(',')}`, 1);
        }
    }

    return Array.from(candidateById.values())
        .map((candidate) => ({
            ...candidate,
            score: Number(candidate.score.toFixed(3)),
            reasons: Array.from(new Set(candidate.reasons)).sort((left, right) => left.localeCompare(right)),
        }))
        .sort((left, right) => (
            right.score - left.score
            || left.file.localeCompare(right.file)
            || left.testId.localeCompare(right.testId)
        ));
}

function queryTestPrioritization(graph, coverage, changedFiles, { baseRef = null, preset = 'incident' } = {}) {
    const impact = queryChangeRisk(graph, coverage, changedFiles, { baseRef, preset });
    const impactedNodeIds = new Set((impact.subgraph?.nodes || []).map((node) => node.id));
    const priorityTests = collectValidationTestCandidates(graph, impact.criticalPaths, impactedNodeIds)
        .map((candidate, index) => ({
            rank: index + 1,
            ...candidate,
        }));

    return {
        query: 'test-prioritization',
        sourceQuery: impact.query,
        baseRef,
        preset: impact.preset,
        changedFiles: impact.changedFiles,
        riskStatus: impact.riskStatus,
        criticalPaths: impact.criticalPaths,
        priorityTests,
        recommendedChecks: Array.from(new Set([
            'npm run graph:build',
            'npm run graph:check',
            ...priorityTests.slice(0, 5).map((candidate) => candidate.command),
        ])),
    };
}

function queryTemporalAnomalies(scorecard) {
    const current = scorecard?.current || {};
    const history = Array.isArray(scorecard?.history) ? scorecard.history : [];
    const previous = history.length > 0 ? history[history.length - 1] : null;
    const scoreDelta = Number(scorecard?.trend?.scoreDelta ?? (previous ? current.score - previous.score : 0));
    const anomalies = [];
    if (String(current.status || '').trim() !== 'pass') {
        anomalies.push({
            id: 'scorecard-status',
            severity: 'high',
            signal: `current status is ${current.status || 'unknown'}`,
        });
    }
    if (scoreDelta <= -1) {
        anomalies.push({
            id: 'score-drop',
            severity: 'high',
            signal: `score delta ${scoreDelta.toFixed(1)} is below -1.0`,
        });
    } else if (scoreDelta < 0) {
        anomalies.push({
            id: 'score-drift',
            severity: 'medium',
            signal: `score delta ${scoreDelta.toFixed(1)} is negative`,
        });
    }

    const previousValidationRatio = Number(previous?.metrics?.mappedNodeValidationRatio);
    const currentValidationRatio = Number(current?.metrics?.mappedNodeValidationRatio);
    if (Number.isFinite(previousValidationRatio) && Number.isFinite(currentValidationRatio)) {
        const ratioDelta = Number((currentValidationRatio - previousValidationRatio).toFixed(3));
        if (ratioDelta < -0.05) {
            anomalies.push({
                id: 'validation-ratio-drop',
                severity: 'medium',
                signal: `mappedNodeValidationRatio delta ${ratioDelta} is below -0.05`,
            });
        }
    }

    return {
        query: 'temporal-anomalies',
        contract: scorecard?.contract || 'knowledge-graph.scorecard.v1',
        current: {
            id: current.id || 'current',
            score: current.score ?? null,
            status: current.status || 'unknown',
        },
        trend: scorecard?.trend || null,
        previous: previous ? {
            id: previous.id,
            score: previous.score,
            status: previous.status,
        } : null,
        status: anomalies.some((entry) => entry.severity === 'high') ? 'review' : anomalies.length > 0 ? 'watch' : 'ok',
        anomalies,
        recommendedChecks: [
            'node scripts/query-knowledge-graph.mjs quality-scorecard --json',
            'npm run graph:build',
            'npm run graph:check',
        ],
    };
}

function evaluateGraphPolicies(graph, coverage, scorecard, queryOpsContract = null) {
    const policies = Array.isArray(queryOpsContract?.policies) ? queryOpsContract.policies : [];
    const schemaLint = querySchemaLint(graph, coverage, scorecard);
    const anomalies = queryTemporalAnomalies(scorecard);
    const scorecardStatus = String(scorecard?.current?.status || 'unknown');
    const decisions = policies.map((policy) => {
        const id = String(policy?.id || '').trim();
        const requires = Array.isArray(policy?.requires) ? policy.requires : [];
        const failedSignals = [];
        if (requires.includes('scorecard-pass') && scorecardStatus !== 'pass') {
            failedSignals.push(`scorecard status is ${scorecardStatus}`);
        }
        if (requires.includes('schema-lint-pass') && schemaLint.status !== 'pass') {
            failedSignals.push(`schema-lint status is ${schemaLint.status}`);
        }
        if (requires.includes('no-high-temporal-anomaly') && anomalies.anomalies.some((entry) => entry.severity === 'high')) {
            failedSignals.push('high temporal anomaly present');
        }
        return {
            id,
            severity: String(policy?.severity || 'medium'),
            status: failedSignals.length > 0 ? 'review' : 'pass',
            requires,
            failedSignals,
            playbook: String(policy?.playbook || '').trim() || null,
        };
    });

    const fallbackDecision = decisions.length === 0 ? [{
        id: 'adaptive-quality-default',
        severity: 'medium',
        status: schemaLint.status === 'pass' && !anomalies.anomalies.some((entry) => entry.severity === 'high') ? 'pass' : 'review',
        requires: ['schema-lint-pass', 'no-high-temporal-anomaly'],
        failedSignals: [],
        playbook: 'data/contracts/knowledge-graph/query-ops.v1.json#playbook:adaptive-diagnostics',
    }] : decisions;

    return {
        query: 'policy-evaluate',
        contract: queryOpsContract?.contract || 'knowledge-graph.query-ops.v1',
        dataSource: 'data/contracts/knowledge-graph/query-ops.v1.json#policies',
        status: fallbackDecision.some((decision) => decision.status === 'review') ? 'review' : 'pass',
        scorecard: {
            score: scorecard?.current?.score ?? null,
            status: scorecardStatus,
        },
        schemaLint: {
            status: schemaLint.status,
            violationCount: schemaLint.summary.violationCount,
        },
        temporalAnomalies: {
            status: anomalies.status,
            highCount: anomalies.anomalies.filter((entry) => entry.severity === 'high').length,
            totalCount: anomalies.anomalies.length,
        },
        decisions: fallbackDecision,
        recommendedChecks: Array.from(new Set([
            'node scripts/query-knowledge-graph.mjs policy-evaluate --json',
            ...schemaLint.recommendedChecks,
            ...anomalies.recommendedChecks,
        ])),
    };
}

function queryFeedbackLoop(graph, coverage, changedFiles, queryOpsContract = null, { baseRef = null } = {}) {
    const prioritization = queryTestPrioritization(graph, coverage, changedFiles, { baseRef, preset: 'incident' });
    const feedback = queryOpsContract?.feedback_loop && typeof queryOpsContract.feedback_loop === 'object'
        ? queryOpsContract.feedback_loop
        : {};
    const signals = Array.isArray(feedback.reference_signals) ? feedback.reference_signals : [];
    const matchingSignals = signals.filter((signal) => {
        const files = Array.isArray(signal?.files) ? signal.files.map((filePath) => normalizePath(filePath)) : [];
        const paths = Array.isArray(signal?.critical_paths) ? signal.critical_paths : [];
        return files.some((filePath) => prioritization.changedFiles.includes(filePath))
            || paths.some((criticalPath) => prioritization.criticalPaths.includes(criticalPath));
    });
    const proposedAdjustments = matchingSignals.map((signal) => ({
        signalId: String(signal.id || '').trim(),
        signalType: String(signal.type || '').trim(),
        confidence: Number(signal.confidence ?? 0),
        action: String(signal.action || 'review-priority').trim(),
        target: String(signal.target || prioritization.priorityTests[0]?.testId || '').trim() || null,
    }));

    return {
        query: 'feedback-loop',
        sourceQuery: prioritization.query,
        dataSource: 'data/contracts/knowledge-graph/query-ops.v1.json#feedback_loop',
        status: proposedAdjustments.length > 0 ? 'watch' : 'ok',
        acceptedSignalTypes: Array.isArray(feedback.accepted_signal_types) ? feedback.accepted_signal_types : [],
        guardrails: Array.isArray(feedback.guardrails) ? feedback.guardrails : [],
        changedFiles: prioritization.changedFiles,
        criticalPaths: prioritization.criticalPaths,
        proposedAdjustments,
        recommendedChecks: Array.from(new Set([
            'node scripts/query-knowledge-graph.mjs test-prioritization --json',
            'node scripts/query-knowledge-graph.mjs policy-evaluate --json',
            ...prioritization.recommendedChecks,
        ])),
    };
}

function querySchemaLint(graph, coverage, scorecard) {
    const violations = [];
    const warnings = [];
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const nodeIds = new Set(nodes.map((node) => String(node?.id || '').trim()).filter(Boolean));
    const lintContract = (artifactName, artifact, expectedContract) => {
        if (String(artifact?.contract || '').trim() !== expectedContract) {
            violations.push({
                code: 'KG_SCHEMA_CONTRACT_MISMATCH',
                artifact: artifactName,
                expected: expectedContract,
                actual: artifact?.contract || null,
            });
        }
        if (Number(artifact?.schema_version) !== 1) {
            violations.push({
                code: 'KG_SCHEMA_VERSION_UNSUPPORTED',
                artifact: artifactName,
                expected: 1,
                actual: artifact?.schema_version ?? null,
            });
        }
    };

    lintContract('graph', graph, 'knowledge-graph.v1');
    lintContract('coverage', coverage, 'knowledge-graph.coverage.v1');
    lintContract('scorecard', scorecard, 'knowledge-graph.scorecard.v1');

    for (const edge of edges) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
            const finding = {
                code: 'KG_SCHEMA_EDGE_ENDPOINT_MISSING',
                edge: `${edge.from || '<empty>'} -> ${edge.to || '<empty>'} (${edge.type || '<empty>'})`,
            };
            if (edge.type === 'contains_subphase') {
                warnings.push(finding);
            } else {
                violations.push(finding);
            }
        }
        if (!String(edge?.type || '').trim()) {
            violations.push({
                code: 'KG_SCHEMA_EDGE_TYPE_MISSING',
                edge: `${edge.from || '<empty>'} -> ${edge.to || '<empty>'}`,
            });
        }
    }
    for (const node of nodes) {
        if (!String(node?.id || '').trim() || !String(node?.type || '').trim()) {
            violations.push({
                code: 'KG_SCHEMA_NODE_SHAPE_INVALID',
                node: node?.id || '<empty>',
            });
        }
    }
    if (Array.isArray(coverage?.files) && coverage.files.length === 0) {
        warnings.push({
            code: 'KG_SCHEMA_COVERAGE_EMPTY',
            message: 'coverage artifact has no files',
        });
    }

    return {
        query: 'schema-lint',
        status: violations.length === 0 ? 'pass' : 'fail',
        summary: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            coverageFileCount: Array.isArray(coverage?.files) ? coverage.files.length : 0,
            violationCount: violations.length,
            warningCount: warnings.length,
        },
        violations,
        warnings,
        recommendedChecks: [
            'npm run graph:build',
            'npm run graph:check',
        ],
    };
}

function queryWhyNot(graph, selector) {
    const normalizedSelector = String(selector || '').trim();
    const { nodes, edges, nodeById } = buildGraphIndexes(graph);
    const selectedCriticalPath = normalizeCriticalPathFilter(normalizedSelector);
    const selectedNode = nodeById.get(normalizedSelector) || null;
    const selectedNodeIds = new Set();

    if (selectedNode) {
        selectedNodeIds.add(selectedNode.id);
    } else if (selectedCriticalPath) {
        for (const node of nodes) {
            if (RUNTIME_QUERY_NODE_TYPES.has(node.type) && nodeMatchesCriticalPath(node, selectedCriticalPath)) {
                selectedNodeIds.add(node.id);
            }
        }
    }

    const explicitBlockers = edges
        .filter((edge) => NEGATIVE_EDGE_TYPES.has(edge.type))
        .filter((edge) => selectedNodeIds.size === 0 || selectedNodeIds.has(edge.from) || selectedNodeIds.has(edge.to))
        .map((edge) => edgeSummary(edge, nodeById));

    return {
        query: 'why-not',
        selector: normalizedSelector,
        selectorType: selectedNode ? 'node' : 'critical-path',
        explicitBlockerCount: explicitBlockers.length,
        blockers: sortEdgeSummaries(explicitBlockers),
    };
}

function queryEventFlow(graph, selector) {
    const normalizedSelector = String(selector || '').trim();
    const criticalPathFilter = normalizedSelector.startsWith('event:') ? '' : normalizeCriticalPathFilter(normalizedSelector);
    const explicitEventId = normalizedSelector.startsWith('event:') ? normalizedSelector : '';
    const { nodes, edges, nodeById } = buildGraphIndexes(graph);
    const eventNodes = nodes
        .filter((node) => node.type === 'event')
        .filter((node) => !explicitEventId || node.id === explicitEventId)
        .filter((node) => !criticalPathFilter || nodeMatchesCriticalPath(node, criticalPathFilter))
        .map(nodeSummary)
        .filter(Boolean);
    const eventIds = new Set(eventNodes.map((node) => node.id));
    const selectedCriticalPaths = criticalPathFilter
        ? [criticalPathFilter]
        : Array.from(new Set(eventNodes.flatMap((node) => node.criticalPaths))).sort((left, right) => left.localeCompare(right));
    const selectedPathNodeIds = new Set(
        nodes
            .filter((node) => selectedCriticalPaths.some((criticalPath) => nodeMatchesCriticalPath(node, criticalPath)))
            .filter((node) => RUNTIME_QUERY_NODE_TYPES.has(node.type))
            .map((node) => node.id)
    );
    const flowEdges = edges
        .filter((edge) => (edge.type === 'emits' || edge.type === 'consumes') && eventIds.has(edge.to))
        .map((edge) => edgeSummary(edge, nodeById));
    for (const edge of flowEdges) {
        selectedPathNodeIds.add(edge.from);
        selectedPathNodeIds.add(edge.to);
    }
    const selectedPathNodes = Array.from(selectedPathNodeIds)
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node) => node && RUNTIME_QUERY_NODE_TYPES.has(node.type));
    const contextEdges = edges
        .filter((edge) => EVENT_FLOW_CONTEXT_EDGE_TYPES.has(edge.type))
        .filter((edge) => selectedPathNodeIds.has(edge.from) && selectedPathNodeIds.has(edge.to))
        .map((edge) => edgeSummary(edge, nodeById));

    const systems = selectedPathNodes.filter((node) => node.type === 'runtime').map(nodeSummary).filter(Boolean);
    const states = selectedPathNodes.filter((node) => node.type === 'state').map(nodeSummary).filter(Boolean);
    const configs = selectedPathNodes.filter((node) => node.type === 'config').map(nodeSummary).filter(Boolean);
    const tests = selectedPathNodes.filter((node) => node.type === 'test').map(nodeSummary).filter(Boolean);

    return {
        query: 'event-flow',
        selector: normalizedSelector,
        criticalPath: criticalPathFilter || selectedCriticalPaths[0] || null,
        events: sortNodeSummaries(eventNodes),
        systems: sortNodeSummaries(systems),
        states: sortNodeSummaries(states),
        configs: sortNodeSummaries(configs),
        tests: sortNodeSummaries(tests),
        edges: sortEdgeSummaries(flowEdges),
        contextEdges: sortEdgeSummaries(contextEdges),
    };
}

function queryUntestedSystems(graph, criticalPath = '') {
    const criticalPathFilter = normalizeCriticalPathFilter(criticalPath);
    const { nodes, edges } = buildGraphIndexes(graph);
    const validatedRuntimeIds = new Set(
        edges
            .filter((edge) => edge.type === 'validated_by')
            .map((edge) => edge.from)
    );
    const systems = nodes
        .filter((node) => node.type === 'runtime')
        .filter((node) => nodeMatchesCriticalPath(node, criticalPathFilter))
        .filter((node) => !validatedRuntimeIds.has(node.id))
        .map(nodeSummary)
        .filter(Boolean);

    return {
        query: 'untested-systems',
        criticalPath: criticalPathFilter || null,
        systems: sortNodeSummaries(systems),
    };
}

function queryCriticalPathHealth(graph) {
    const { nodes, edges, nodeById } = buildGraphIndexes(graph);
    const criticalPaths = Array.from(new Set(
        nodes
            .filter((node) => RUNTIME_QUERY_NODE_TYPES.has(node.type))
            .flatMap((node) => getCriticalPaths(node))
    )).sort((left, right) => left.localeCompare(right));
    const validatedRuntimeIds = new Set(
        edges
            .filter((edge) => edge.type === 'validated_by')
            .map((edge) => edge.from)
    );
    const rows = criticalPaths.map((criticalPath) => {
        const pathNodes = nodes.filter((node) => nodeMatchesCriticalPath(node, criticalPath));
        const counts = {
            runtime: pathNodes.filter((node) => node.type === 'runtime').length,
            event: pathNodes.filter((node) => node.type === 'event').length,
            state: pathNodes.filter((node) => node.type === 'state').length,
            config: pathNodes.filter((node) => node.type === 'config').length,
            test: pathNodes.filter((node) => node.type === 'test').length,
        };
        const missingValidation = pathNodes
            .filter((node) => node.type === 'runtime' && !validatedRuntimeIds.has(node.id))
            .map(nodeSummary)
            .filter(Boolean);
        const eventIds = new Set(pathNodes.filter((node) => node.type === 'event').map((node) => node.id));
        const eventEdges = edges
            .filter((edge) => (edge.type === 'emits' || edge.type === 'consumes') && eventIds.has(edge.to))
            .map((edge) => edgeSummary(edge, nodeById));
        const requiredLayers = CRITICAL_PATH_LAYER_REQUIREMENTS[criticalPath] || ['runtime', 'test'];
        const missingLayers = requiredLayers.filter((layer) => (counts[layer] || 0) === 0);
        const ownership = summarizeNodeOwnership(pathNodes.map(nodeSummary).filter(Boolean));
        const stability = summarizeNodeStability(pathNodes.map(nodeSummary).filter(Boolean));
        const status = missingLayers.length === 0 && missingValidation.length === 0
            ? 'ok'
            : 'needs-attention';

        return {
            criticalPath,
            status,
            counts,
            requiredLayers,
            missingLayers,
            missingValidation: sortNodeSummaries(missingValidation),
            ownership,
            stability,
            eventEdges: sortEdgeSummaries(eventEdges),
        };
    });

    return {
        query: 'critical-path-health',
        criticalPaths: rows,
    };
}

function buildBtStatusEntry(graph, blockId) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const block = nodes.find((node) => node.type === 'block' && node.id === blockId && hasSource(node, 'bot-training-plan')) || null;
    if (!block) return null;

    const phases = nodes
        .filter((node) => node.type === 'phase' && node.attributes?.blockId === blockId)
        .map((node) => ({
            id: node.id,
            phaseCode: node.attributes?.phaseCode || null,
            status: node.status || 'unknown',
            title: node.title || null,
        }))
        .sort((left, right) => String(left.phaseCode).localeCompare(String(right.phaseCode)));
    const subphases = nodes
        .filter((node) => node.type === 'subphase' && node.attributes?.blockId === blockId)
        .map((node) => ({
            id: node.id,
            phaseCode: node.attributes?.phaseCode || null,
            status: node.status || 'unknown',
            title: node.title || null,
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const openDependencies = edges
        .filter((edge) => edge.type === 'depends_on' && edge.from === blockId && edge.fulfilled !== true)
        .map((edge) => ({
            dependsOn: edge.to,
            hard: edge.hard === true,
            hint: edge.hint ?? null,
            dependsPhase: edge.attributes?.dependsPhase ?? null,
        }))
        .sort((left, right) => left.dependsOn.localeCompare(right.dependsOn));

    return {
        id: block.id,
        title: block.title || null,
        status: block.status || 'unknown',
        currentPhase: block.attributes?.currentPhase || null,
        referencePlanFile: block.attributes?.referencePlanFile || null,
        scopeFileCount: edges.filter((edge) => edge.type === 'scope' && edge.from === blockId).length,
        phaseCount: phases.length,
        subphaseCount: subphases.length,
        doneSubphaseCount: subphases.filter((entry) => entry.status === 'done').length,
        activeSubphaseCount: subphases.filter((entry) => entry.status === 'active').length,
        openDependencyCount: openDependencies.length,
        phases,
        subphases,
        openDependencies,
    };
}

function queryBtStatus(graph, blockId = null) {
    const normalizedBlockId = String(blockId || '').trim();
    if (normalizedBlockId) {
        return {
            query: 'bt-status',
            block: buildBtStatusEntry(graph, normalizedBlockId),
        };
    }

    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const blocks = nodes
        .filter((node) => node.type === 'block' && hasSource(node, 'bot-training-plan'))
        .map((node) => buildBtStatusEntry(graph, node.id))
        .filter(Boolean)
        .sort((left, right) => left.id.localeCompare(right.id));

    return {
        query: 'bt-status',
        blocks,
    };
}

function printText(result) {
    if (result.query === 'open-deps') {
        process.stdout.write(`open-deps ${result.blockId}\n`);
        if (result.openDependencies.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const dependency of result.openDependencies) {
            const flags = [`source=${dependency.source}`, `hard=${dependency.hard}`, `fulfilled=${dependency.fulfilled}`];
            if (dependency.dependsPhase) flags.push(`dependsPhase=${dependency.dependsPhase}`);
            if (dependency.hint) flags.push(`hint=${dependency.hint}`);
            process.stdout.write(`- ${dependency.dependsOn} (${flags.join(', ')})\n`);
        }
        return;
    }

    if (result.query === 'scope-collisions') {
        process.stdout.write('scope-collisions\n');
        if (result.collisions.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const collision of result.collisions) {
            process.stdout.write(`- ${collision.leftBlock} <-> ${collision.rightBlock}: ${collision.sharedFiles.join(', ')}\n`);
        }
        return;
    }

    if (result.query === 'surfaces-for-file') {
        process.stdout.write(`surfaces-for-file ${result.file}\n`);
        if (result.surfaces.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const surface of result.surfaces) {
            const roles = surface.roles.length > 0 ? surface.roles.join('|') : 'none';
            process.stdout.write(`- ${surface.surface} (roles=${roles})\n`);
        }
        return;
    }

    if (result.query === 'coverage-report') {
        const summary = result.summary || {};
        const gate = result.gate || null;
        process.stdout.write('coverage-report\n');
        process.stdout.write(`- raw: ${summary.rawCoveredFileCount}/${summary.trackedFileCount} (${summary.rawCoveragePercent}%)\n`);
        process.stdout.write(`- adjusted: ${summary.adjustedCoveredFileCount}/${summary.adjustedTrackedFileCount} (${summary.adjustedCoveragePercent}%)\n`);
        process.stdout.write(`- uncovered active: ${summary.uncoveredActiveFileCount}\n`);
        if (gate) {
            const newUncoveredRule = (gate.rules || []).find((rule) => rule.id === 'no-new-active-uncovered-files');
            process.stdout.write(`- gate: ${gate.status} (new uncovered active: ${newUncoveredRule?.violationCount ?? 0})\n`);
        }
        process.stdout.write(`- overlay blocks: ${(result.overlayBlocks || []).length}\n`);
        return;
    }

    if (result.query === 'uncovered-files') {
        process.stdout.write(`uncovered-files${result.prefix ? ` ${result.prefix}` : ''}\n`);
        if (result.files.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const entry of result.files) {
            const flags = [
                `classification=${entry.classification}`,
                `excluded=${entry.excludedFromCoverage}`,
            ];
            if (entry.excludeReason) flags.push(`reason=${entry.excludeReason}`);
            process.stdout.write(`- ${entry.path} (${flags.join(', ')})\n`);
        }
        return;
    }

    if (result.query === 'why-file') {
        process.stdout.write(`why-file ${result.file}\n`);
        if (!result.coverage) {
            process.stdout.write('- not tracked in coverage artifact\n');
            return;
        }
        process.stdout.write(`- covered=${result.coverage.covered} core=${result.coverage.coveredInCore} overlay=${result.coverage.coveredByOverlay}\n`);
        process.stdout.write(`- classification=${result.coverage.classification} excluded=${result.coverage.excludedFromCoverage}\n`);
        process.stdout.write(`- scope blocks=${(result.coverage.scopeBlocks || []).join(', ') || 'none'}\n`);
        process.stdout.write(`- surfaces=${(result.coverage.surfaces || []).map((entry) => entry.surface).join(', ') || 'none'}\n`);
        process.stdout.write(`- coverage sources=${(result.coverage.coverageSources || []).join(', ') || 'none'}\n`);
        return;
    }

    if (result.query === 'files-for-block') {
        process.stdout.write(`files-for-block ${result.blockId}\n`);
        if (!result.files || result.files.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const entry of result.files) {
            const flags = [];
            if (entry.changeCount != null) flags.push(`changes=${entry.changeCount}`);
            if (entry.dirty != null) flags.push(`dirty=${entry.dirty}`);
            if (entry.covered != null) flags.push(`covered=${entry.covered}`);
            if (entry.classification) flags.push(`classification=${entry.classification}`);
            if (entry.excludedFromCoverage != null) flags.push(`excluded=${entry.excludedFromCoverage}`);
            process.stdout.write(`- ${entry.path} (${flags.join(', ') || 'no-metadata'})\n`);
        }
        return;
    }

    if (result.query === 'bt-status') {
        if (Object.prototype.hasOwnProperty.call(result, 'block')) {
            if (!result.block) {
                process.stdout.write('bt-status\n- none\n');
                return;
            }
            process.stdout.write(`bt-status ${result.block.id}\n`);
            process.stdout.write(`- status=${result.block.status} currentPhase=${result.block.currentPhase || 'none'} scopeFiles=${result.block.scopeFileCount}\n`);
            process.stdout.write(`- subphases done=${result.block.doneSubphaseCount}/${result.block.subphaseCount} active=${result.block.activeSubphaseCount}\n`);
            process.stdout.write(`- open dependencies=${result.block.openDependencyCount}\n`);
            return;
        }

        process.stdout.write('bt-status\n');
        if (!result.blocks || result.blocks.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const block of result.blocks) {
            process.stdout.write(`- ${block.id} status=${block.status} currentPhase=${block.currentPhase || 'none'} openDeps=${block.openDependencyCount} scopeFiles=${block.scopeFileCount}\n`);
        }
    }

    if (result.query === 'impact-for-file') {
        process.stdout.write(`impact-for-file ${result.file}\n`);
        const coverage = result.coverage;
        if (coverage) {
            process.stdout.write(`- coverage covered=${coverage.covered} core=${coverage.coveredInCore} overlay=${coverage.coveredByOverlay} classification=${coverage.classification}\n`);
        } else {
            process.stdout.write('- coverage not tracked\n');
        }
        process.stdout.write(`- critical paths=${result.criticalPaths.join(', ') || 'none'}\n`);
        process.stdout.write(`- implemented nodes=${result.implementedNodes.map((node) => node.id).join(', ') || 'none'}\n`);
        process.stdout.write(`- relation edges=${result.relationEdges.length}\n`);
        return;
    }

    if (result.query === 'impact-diff') {
        process.stdout.write(`impact-diff${result.baseRef ? ` base=${result.baseRef}` : ''}\n`);
        process.stdout.write(`- changed files=${result.changedFileCount} risk=${result.riskStatus}\n`);
        process.stdout.write(`- critical paths=${result.criticalPaths.join(', ') || 'none'}\n`);
        if (result.riskFiles.length > 0) {
            process.stdout.write('risk files\n');
            for (const entry of result.riskFiles) {
                process.stdout.write(`- ${entry.file} paths=${entry.criticalPaths.join('|') || 'none'} nodes=${entry.implementedNodeCount} edges=${entry.relationEdgeCount} maxCausalScore=${entry.maxCausalScore}\n`);
            }
        }
        process.stdout.write(`- subgraph nodes=${result.subgraph.nodes.length} edges=${result.subgraph.edges.length}\n`);
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'change-risk') {
        process.stdout.write(`change-risk${result.baseRef ? ` base=${result.baseRef}` : ''}\n`);
        process.stdout.write(`- changed files=${result.changedFileCount} risk=${result.riskStatus}\n`);
        process.stdout.write(`- critical paths=${result.criticalPaths.join(', ') || 'none'}\n`);
        if (result.riskFiles.length > 0) {
            process.stdout.write('risk files\n');
            for (const entry of result.riskFiles) {
                process.stdout.write(`- ${entry.file} paths=${entry.criticalPaths.join('|') || 'none'} nodes=${entry.implementedNodeCount} edges=${entry.relationEdgeCount} maxCausalScore=${entry.maxCausalScore}\n`);
            }
        }
        process.stdout.write(`- playbook=data/contracts/knowledge-graph/query-ops.v1.json#playbook:change-risk\n`);
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'quality-scorecard') {
        process.stdout.write(`quality-scorecard score=${result.current?.score ?? 'unknown'} status=${result.current?.status || 'unknown'}\n`);
        process.stdout.write(`- coverage=${result.current?.metrics?.adjustedCoveragePercent ?? 'unknown'} gate=${result.current?.metrics?.coverageGateStatus || 'unknown'}\n`);
        process.stdout.write(`- critical paths=${result.current?.metrics?.criticalPathOkCount ?? 0}/${result.current?.metrics?.criticalPathTotalCount ?? 0} trend=${result.trend?.direction || 'unknown'} delta=${result.trend?.scoreDelta ?? 'n/a'}\n`);
        return;
    }

    if (result.query === 'incident-auto-minimize') {
        process.stdout.write(`incident-auto-minimize status=${result.status} candidates=${result.candidateCount}\n`);
        for (const candidate of result.minimizedCandidates || []) {
            process.stdout.write(`- ${candidate.file}: paths=${candidate.criticalPaths.join(',') || 'none'} confidence=${candidate.confidenceScore} uncertainty=${candidate.uncertaintyTier}\n`);
        }
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'temporal-anomalies') {
        process.stdout.write(`temporal-anomalies status=${result.status} anomalies=${result.anomalies?.length || 0}\n`);
        for (const anomaly of result.anomalies || []) {
            process.stdout.write(`- [${anomaly.severity}] ${anomaly.id}: ${anomaly.signal}\n`);
        }
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'schema-lint') {
        process.stdout.write(`schema-lint status=${result.status} violations=${result.summary?.violationCount ?? 0} warnings=${result.summary?.warningCount ?? 0}\n`);
        for (const violation of result.violations || []) {
            process.stdout.write(`- [${violation.code}] ${violation.artifact || violation.edge || violation.node || ''}\n`);
        }
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'test-prioritization') {
        process.stdout.write(`test-prioritization status=${result.riskStatus} tests=${result.priorityTests.length}\n`);
        for (const testEntry of result.priorityTests.slice(0, 5)) {
            process.stdout.write(`- #${testEntry.rank} ${testEntry.file} score=${testEntry.score} paths=${testEntry.criticalPaths.join(',') || 'none'}\n`);
        }
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'policy-evaluate') {
        process.stdout.write(`policy-evaluate status=${result.status} policies=${result.decisions.length}\n`);
        for (const decision of result.decisions) {
            process.stdout.write(`- ${decision.id}: ${decision.status}\n`);
        }
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'feedback-loop') {
        process.stdout.write(`feedback-loop status=${result.status} signals=${result.proposedAdjustments.length}\n`);
        for (const adjustment of result.proposedAdjustments) {
            process.stdout.write(`- ${adjustment.signalId}: ${adjustment.action} -> ${adjustment.target || 'none'} confidence=${adjustment.confidence}\n`);
        }
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'what-if-remove') {
        process.stdout.write(`what-if-remove ${result.selector} (${result.selectorType})\n`);
        process.stdout.write(`- nodes=${result.blastRadius.nodeCount} edges=${result.blastRadius.edgeCount} uncertainty=${result.uncertaintyBudget.tier}/${result.uncertaintyBudget.score}\n`);
        process.stdout.write(`- critical paths=${result.blastRadius.criticalPaths.join(', ') || 'none'}\n`);
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'what-if-replace') {
        process.stdout.write(`what-if-replace ${result.from.selector} -> ${result.to.selector}\n`);
        process.stdout.write(`- shared paths=${result.comparison.sharedCriticalPaths.join(', ') || 'none'} lost=${result.comparison.lostCriticalPaths.join(', ') || 'none'} gained=${result.comparison.gainedCriticalPaths.join(', ') || 'none'}\n`);
        process.stdout.write(`- validationEdgeDelta=${result.comparison.validationEdgeDelta} causalDelta=${result.comparison.maxCausalScoreDelta} uncertainty=${result.uncertaintyBudget.tier}/${result.uncertaintyBudget.score}\n`);
        process.stdout.write(`- checks=${result.recommendedChecks.join(' && ')}\n`);
        return;
    }

    if (result.query === 'why-not') {
        process.stdout.write(`why-not ${result.selector}\n`);
        if (result.blockers.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const blocker of result.blockers) {
            const flags = [
                `severity=${blocker.severity || 'unknown'}`,
                `layer=${blocker.relationLayer || 'unknown'}`,
            ];
            if (blocker.reason) flags.push(`reason=${blocker.reason}`);
            process.stdout.write(`- ${blocker.type}: ${blocker.from} -> ${blocker.to} (${flags.join(', ')})\n`);
        }
        return;
    }

    if (result.query === 'event-flow') {
        process.stdout.write(`event-flow ${result.selector}\n`);
        const contextEdges = (result.contextEdges || [])
            .filter((edge) => edge.type !== 'emits' && edge.type !== 'consumes');
        if (result.events.length === 0 && contextEdges.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const event of result.events) {
            process.stdout.write(`- ${event.id} (${event.title || 'untitled'})\n`);
            const eventEdges = result.edges.filter((edge) => edge.to === event.id);
            for (const edge of eventEdges) {
                process.stdout.write(`  - ${edge.type}: ${edge.from}\n`);
            }
        }
        if (contextEdges.length > 0) {
            process.stdout.write('context\n');
            for (const edge of contextEdges) {
                process.stdout.write(`- ${edge.type}: ${edge.from} -> ${edge.to}\n`);
            }
        }
        return;
    }

    if (result.query === 'untested-systems') {
        process.stdout.write(`untested-systems${result.criticalPath ? ` ${result.criticalPath}` : ''}\n`);
        if (result.systems.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const system of result.systems) {
            process.stdout.write(`- ${system.id} (${system.file || 'no-file'})\n`);
        }
        return;
    }

    if (result.query === 'critical-path-health') {
        process.stdout.write('critical-path-health\n');
        for (const entry of result.criticalPaths) {
            const counts = entry.counts;
            process.stdout.write(`- ${entry.criticalPath}: ${entry.status} runtime=${counts.runtime} event=${counts.event} state=${counts.state} config=${counts.config} test=${counts.test} missingValidation=${entry.missingValidation.length}\n`);
        }
        return;
    }

    if (result.query === 'export-view') {
        process.stdout.write(`export-view safety=${result.safety?.mode || 'unknown'} redacted=${result.safety?.redactionApplied === true}\n`);
        process.stdout.write(`- nodes=${result.summary?.nodeCount ?? result.nodes?.length ?? 0} edges=${result.summary?.edgeCount ?? result.edges?.length ?? 0}\n`);
        process.stdout.write(`- coverage gate=${result.coverage?.gate?.status || 'unknown'}\n`);
        if (Array.isArray(result.safety?.redactedFields) && result.safety.redactedFields.length > 0) {
            process.stdout.write(`- redacted fields=${result.safety.redactedFields.join(', ')}\n`);
        }
    }
}

function usage() {
    process.stdout.write(
        'Usage:\n'
        + '  node scripts/query-knowledge-graph.mjs open-deps <BLOCK_ID> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs scope-collisions [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs surfaces-for-file <FILE_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs coverage-report [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs uncovered-files [PREFIX] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs why-file <FILE_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs files-for-block <BLOCK_ID> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs bt-status [BLOCK_ID] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs impact-for-file <FILE_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs impact-diff [--base <REF>] [--preset incident|review|balance|onboarding] [FILE_PATH...] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs change-risk [--base <REF>] [--preset incident|review|balance|onboarding] [FILE_PATH...] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs quality-scorecard [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs incident-auto-minimize [--base <REF>] [FILE_PATH...] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs temporal-anomalies [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs schema-lint [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs test-prioritization [--base <REF>] [FILE_PATH...] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs policy-evaluate [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs feedback-loop [--base <REF>] [FILE_PATH...] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs what-if-remove <NODE_ID|FILE_PATH|CRITICAL_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs what-if-replace <FROM_NODE_OR_FILE> <TO_NODE_OR_FILE> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs why-not <NODE_ID|CRITICAL_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs event-flow <EVENT_ID|CRITICAL_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs untested-systems [CRITICAL_PATH] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs critical-path-health [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs export-view [--unsafe-raw] [--json]\n'
    );
}

export {
    applyGraphSafetyFilter,
    queryBtStatus,
    queryChangeRisk,
    queryCoverageReport,
    queryCriticalPathHealth,
    queryEventFlow,
    queryExportView,
    queryFilesForBlock,
    queryImpactDiff,
    queryImpactForFile,
    queryIncidentAutoMinimize,
    queryFeedbackLoop,
    queryOpenDeps,
    evaluateGraphPolicies as queryPolicyEvaluation,
    queryQualityScorecard,
    querySchemaLint,
    queryScopeCollisions,
    querySurfacesForFile,
    queryTemporalAnomalies,
    queryTestPrioritization,
    queryUntestedSystems,
    queryWhatIfRemove,
    queryWhatIfReplace,
    queryUncoveredFiles,
    queryWhyNot,
    queryWhyFile,
};

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    const args = process.argv.slice(2);
    const jsonOutput = args.includes('--json');
    const unsafeRaw = args.includes('--unsafe-raw');
    const positional = args.filter((arg) => arg !== '--json' && arg !== '--unsafe-raw');
    const command = positional[0];

    if (!command) {
        usage();
        process.exit(1);
    }

    try {
        const { graph, coverage } = await readArtifacts();
        let result = null;

        if (command === 'open-deps') {
            const blockId = positional[1];
            if (!blockId) {
                usage();
                process.exit(1);
            }
            result = queryOpenDeps(graph, blockId);
        } else if (command === 'scope-collisions') {
            result = queryScopeCollisions(graph);
        } else if (command === 'surfaces-for-file') {
            const filePath = positional[1];
            if (!filePath) {
                usage();
                process.exit(1);
            }
            result = querySurfacesForFile(graph, filePath);
        } else if (command === 'coverage-report') {
            result = queryCoverageReport(coverage);
        } else if (command === 'uncovered-files') {
            result = queryUncoveredFiles(coverage, positional[1] || '');
        } else if (command === 'why-file') {
            const filePath = positional[1];
            if (!filePath) {
                usage();
                process.exit(1);
            }
            result = queryWhyFile(graph, coverage, filePath);
        } else if (command === 'files-for-block') {
            const blockId = positional[1];
            if (!blockId) {
                usage();
                process.exit(1);
            }
            result = queryFilesForBlock(graph, coverage, blockId);
        } else if (command === 'bt-status') {
            result = queryBtStatus(graph, positional[1] || null);
        } else if (command === 'impact-for-file') {
            const filePath = positional[1];
            if (!filePath) {
                usage();
                process.exit(1);
            }
            result = queryImpactForFile(graph, coverage, filePath);
        } else if (command === 'impact-diff') {
            const baseIndex = positional.indexOf('--base');
            const baseRef = baseIndex >= 0 ? positional[baseIndex + 1] : null;
            const presetIndex = positional.indexOf('--preset');
            const preset = presetIndex >= 0 ? positional[presetIndex + 1] : 'balance';
            const explicitFiles = positional
                .slice(1)
                .filter((arg, index, args) => (
                    arg !== '--base'
                    && args[index - 1] !== '--base'
                    && arg !== '--preset'
                    && args[index - 1] !== '--preset'
                ));
            const changedFiles = explicitFiles.length > 0
                ? explicitFiles
                : await readChangedFiles(baseRef || 'HEAD');
            result = queryImpactDiff(graph, coverage, changedFiles, { baseRef, preset });
        } else if (command === 'change-risk') {
            const baseIndex = positional.indexOf('--base');
            const baseRef = baseIndex >= 0 ? positional[baseIndex + 1] : null;
            const presetIndex = positional.indexOf('--preset');
            const preset = presetIndex >= 0 ? positional[presetIndex + 1] : 'incident';
            const explicitFiles = positional
                .slice(1)
                .filter((arg, index, args) => (
                    arg !== '--base'
                    && args[index - 1] !== '--base'
                    && arg !== '--preset'
                    && args[index - 1] !== '--preset'
                ));
            const changedFiles = explicitFiles.length > 0
                ? explicitFiles
                : await readChangedFiles(baseRef || 'HEAD');
            result = queryChangeRisk(graph, coverage, changedFiles, { baseRef, preset });
        } else if (command === 'quality-scorecard') {
            const scorecard = await readArtifact(SCORECARD_PATH);
            result = queryQualityScorecard(scorecard);
        } else if (command === 'incident-auto-minimize') {
            const baseIndex = positional.indexOf('--base');
            const baseRef = baseIndex >= 0 ? positional[baseIndex + 1] : null;
            const explicitFiles = positional
                .slice(1)
                .filter((arg, index, args) => (
                    arg !== '--base'
                    && args[index - 1] !== '--base'
                ));
            const changedFiles = explicitFiles.length > 0
                ? explicitFiles
                : await readChangedFiles(baseRef || 'HEAD');
            result = queryIncidentAutoMinimize(graph, coverage, changedFiles, { baseRef });
        } else if (command === 'temporal-anomalies') {
            const scorecard = await readArtifact(SCORECARD_PATH);
            result = queryTemporalAnomalies(scorecard);
        } else if (command === 'schema-lint') {
            const scorecard = await readArtifact(SCORECARD_PATH);
            result = querySchemaLint(graph, coverage, scorecard);
        } else if (command === 'test-prioritization') {
            const baseIndex = positional.indexOf('--base');
            const baseRef = baseIndex >= 0 ? positional[baseIndex + 1] : null;
            const explicitFiles = positional
                .slice(1)
                .filter((arg, index, args) => (
                    arg !== '--base'
                    && args[index - 1] !== '--base'
                ));
            const changedFiles = explicitFiles.length > 0
                ? explicitFiles
                : await readChangedFiles(baseRef || 'HEAD');
            result = queryTestPrioritization(graph, coverage, changedFiles, { baseRef });
        } else if (command === 'policy-evaluate') {
            const [scorecard, queryOpsContract] = await Promise.all([
                readArtifact(SCORECARD_PATH),
                readArtifact('data/contracts/knowledge-graph/query-ops.v1.json'),
            ]);
            result = evaluateGraphPolicies(graph, coverage, scorecard, queryOpsContract);
        } else if (command === 'feedback-loop') {
            const baseIndex = positional.indexOf('--base');
            const baseRef = baseIndex >= 0 ? positional[baseIndex + 1] : null;
            const explicitFiles = positional
                .slice(1)
                .filter((arg, index, args) => (
                    arg !== '--base'
                    && args[index - 1] !== '--base'
                ));
            const changedFiles = explicitFiles.length > 0
                ? explicitFiles
                : await readChangedFiles(baseRef || 'HEAD');
            const queryOpsContract = await readArtifact('data/contracts/knowledge-graph/query-ops.v1.json');
            result = queryFeedbackLoop(graph, coverage, changedFiles, queryOpsContract, { baseRef });
        } else if (command === 'what-if-remove') {
            const selector = positional[1];
            if (!selector) {
                usage();
                process.exit(1);
            }
            result = queryWhatIfRemove(graph, coverage, selector);
        } else if (command === 'what-if-replace') {
            const fromSelector = positional[1];
            const toSelector = positional[2];
            if (!fromSelector || !toSelector) {
                usage();
                process.exit(1);
            }
            result = queryWhatIfReplace(graph, coverage, fromSelector, toSelector);
        } else if (command === 'why-not') {
            const selector = positional[1];
            if (!selector) {
                usage();
                process.exit(1);
            }
            result = queryWhyNot(graph, selector);
        } else if (command === 'event-flow') {
            const selector = positional[1];
            if (!selector) {
                usage();
                process.exit(1);
            }
            result = queryEventFlow(graph, selector);
        } else if (command === 'untested-systems') {
            result = queryUntestedSystems(graph, positional[1] || '');
        } else if (command === 'critical-path-health') {
            result = queryCriticalPathHealth(graph);
        } else if (command === 'export-view') {
            result = queryExportView(graph, coverage, { unsafeRaw });
        } else {
            usage();
            process.exit(1);
        }

        if (jsonOutput) {
            process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        } else {
            printText(result);
        }
    } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        process.stderr.write(`[graph:query] failed: ${message}\n`);
        process.exit(1);
    }
}
