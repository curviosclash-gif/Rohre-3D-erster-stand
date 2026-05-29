#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    assertGraphRagRuntimeOutputPath,
    buildGraphRagIndex,
    loadRagSourceContract,
    normalizeRepoPath,
} from './graph-rag-index.mjs';
import {
    queryCriticalPathHealth,
    queryEventFlow,
    queryFilesForBlock,
    queryImpactForFile,
    queryOpenDeps,
    queryScopeCollisions,
    querySurfacesForFile,
    queryTestPrioritization,
} from './query-knowledge-graph.mjs';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const EVIDENCE_PACKAGE_CONTRACT_PATH = 'data/contracts/knowledge-graph/rag-evidence-package.v1.json';
const QUERY_CONTRACT = 'knowledge-graph.rag-query.v1';
const EVIDENCE_PACKAGE_CONTRACT = 'knowledge-graph.rag-evidence-package.v1';
const DEFAULT_MAX_CHUNKS = 6;
const CONFIDENCE_VALUES = Object.freeze(['high', 'medium', 'low']);

const KNOWN_FILE_ALIASES = Object.freeze({
    settingsmanager: 'src/core/SettingsManager.js',
    settingsmanagerjs: 'src/core/SettingsManager.js',
    umsetzungsplan: 'docs/Umsetzungsplan.md',
    masterplan: 'docs/Umsetzungsplan.md',
    planindex: 'docs/generated/plan-index.json',
    knowledgegraph: 'docs/generated/knowledge-graph.json',
    wissensgraph: 'docs/generated/knowledge-graph.json',
    graphragquery: 'scripts/graph-rag-query.mjs',
    graphragquerymjs: 'scripts/graph-rag-query.mjs',
    graphragindex: 'scripts/graph-rag-index.mjs',
    graphragindexmjs: 'scripts/graph-rag-index.mjs',
    graphragcontextadapter: 'scripts/graph-rag-context-adapter.mjs',
    contextadapter: 'scripts/graph-rag-context-adapter.mjs',
    graphraglocalllmcheck: 'scripts/graph-rag-local-llm-check.mjs',
    localllmcheck: 'scripts/graph-rag-local-llm-check.mjs',
    queryops: 'data/contracts/knowledge-graph/query-ops.v1.json',
    ragevidencepackage: 'data/contracts/knowledge-graph/rag-evidence-package.v1.json',
    ragsources: 'data/contracts/knowledge-graph/rag-sources.v1.json',
});

const TEST_FILE_ALIASES = Object.freeze({
    graphragquery: 'tests/graph-rag-query.contract.test.mjs',
    graphragquerycontract: 'tests/graph-rag-query.contract.test.mjs',
    graphragindex: 'tests/graph-rag-index.contract.test.mjs',
    graphragcontextadapter: 'tests/graph-rag-context-adapter.contract.test.mjs',
    contextadapter: 'tests/graph-rag-context-adapter.contract.test.mjs',
    localllm: 'tests/graph-rag-local-llm-selection.contract.test.mjs',
    graphraglocalllm: 'tests/graph-rag-local-llm-selection.contract.test.mjs',
});

const KNOWN_BLOCK_ALIASES = Object.freeze({
    graphragcore: 'V120',
    graphragkern: 'V120',
    graphragmvp: 'V120',
    graphragviewer: 'V121',
    evidencedashboard: 'V121',
    askrepo: 'V121',
    askrepochat: 'V121',
    agentmemory: 'V122',
    ruflo: 'V122',
    produktsemantik: 'V124',
    productsemantics: 'V124',
    codegraph: 'V137',
    graphragfollowup: 'V139',
    graphragfolgeblock: 'V139',
    graphragqualitat: 'V139',
    graphragquality: 'V139',
});

const CRITICAL_PATH_ALIASES = Object.freeze({
    spawn: 'spawn',
    entityspawn: 'spawn',
    spawnpath: 'spawn',
    settings: 'settings',
    einstellungen: 'settings',
    settingsmanager: 'settings',
    combat: 'combat-hit',
    kampf: 'combat-hit',
    damage: 'combat-hit',
    treffer: 'combat-hit',
    hit: 'combat-hit',
    'combat-hit': 'combat-hit',
    round: 'round-end',
    runde: 'round-end',
    rundenende: 'round-end',
    'round-end': 'round-end',
});

const GENERIC_CRITICAL_PATH_TOKENS = Object.freeze(new Set([
    'critical',
    'path',
    'critical-path',
    'kritisch',
    'kritischer',
    'kritischen',
    'pfad',
    'event-flow',
    'eventflow',
    'tests',
    'test',
    'evidence',
    'gate',
    'check',
    'checks',
    'mit',
    'mir',
    'den',
    'dem',
    'der',
    'die',
    'das',
]));

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(value) {
    const stopWords = new Set([
        'und',
        'oder',
        'the',
        'and',
        'for',
        'mit',
        'von',
        'der',
        'die',
        'das',
        'eine',
        'einen',
        'welche',
        'wie',
        'was',
        'warum',
        'about',
        'show',
        'zeige',
        'mir',
        'den',
        'dem',
    ]);
    return Array.from(new Set(
        normalizeText(value)
            .match(/[a-z0-9_.:/-]{3,}/g) || []
    )).filter((token) => !stopWords.has(token));
}

function escapeRegExp(value) {
    return String(value).replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function containsExactTerm(text, term) {
    const normalizedText = normalizeText(text);
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) return false;
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(normalizedText);
}

function extractBlockIds(question) {
    return Array.from(new Set(
        (String(question || '').match(/\bV\d+\b/gi) || [])
            .map((value) => value.toUpperCase())
    )).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function inferBlockAliases(question) {
    const normalized = normalizeText(question).replace(/[^a-z0-9]/g, '');
    const blockIds = [];
    for (const [alias, blockId] of Object.entries(KNOWN_BLOCK_ALIASES)) {
        if (normalized.includes(alias)) blockIds.push(blockId);
    }
    return Array.from(new Set(blockIds)).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function extractExplicitFilePaths(question) {
    return Array.from(new Set(
        (String(question || '').match(/[A-Za-z0-9_.:/\\-]+\.(?:js|mjs|md|json|css|html)/g) || [])
            .map(normalizeRepoPath)
    )).sort((left, right) => left.localeCompare(right));
}

function inferFileAliases(question) {
    const normalizedQuestion = normalizeText(question);
    const normalized = normalizeText(question).replace(/[^a-z0-9]/g, '');
    const files = [];
    for (const [alias, filePath] of Object.entries(KNOWN_FILE_ALIASES)) {
        if (normalized.includes(alias)) files.push(filePath);
    }
    const testContext = hasAny(normalizedQuestion, [/test/, /contract/, /smoke/, /check/, /gate/]);
    if (testContext) {
        for (const [alias, filePath] of Object.entries(TEST_FILE_ALIASES)) {
            if (normalized.includes(alias)) files.push(filePath);
        }
    }
    return Array.from(new Set(files)).sort((left, right) => left.localeCompare(right));
}

function inferCriticalPath(question) {
    const tokens = tokenize(question);
    for (const token of tokens) {
        if (CRITICAL_PATH_ALIASES[token]) return CRITICAL_PATH_ALIASES[token];
    }
    return null;
}

function inferUnknownCriticalPath(question, knownCriticalPath) {
    if (knownCriticalPath) return null;
    const normalizedQuestion = normalizeText(question);
    if (!hasAny(normalizedQuestion, [/critical[- ]?path/, /kritisch(?:er|en)? pfad/, /event[- ]?flow/])) return null;
    const knownTokens = new Set([
        ...Object.keys(CRITICAL_PATH_ALIASES),
        ...Object.values(CRITICAL_PATH_ALIASES),
    ]);
    for (const token of tokenize(question)) {
        if (knownTokens.has(token) || GENERIC_CRITICAL_PATH_TOKENS.has(token)) continue;
        if (/^v\d+$/i.test(token) || token.includes('.')) continue;
        return token;
    }
    return 'unknown-critical-path';
}

function hasAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
}

function routeGraphRagQuestion(question) {
    const normalizedQuestion = normalizeText(question);
    const blockIds = Array.from(new Set([
        ...extractBlockIds(question),
        ...inferBlockAliases(question),
    ])).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    const explicitFiles = extractExplicitFilePaths(question);
    const aliasFiles = inferFileAliases(question);
    const filePaths = Array.from(new Set([...explicitFiles, ...aliasFiles]))
        .sort((left, right) => left.localeCompare(right));
    const criticalPath = inferCriticalPath(question);
    const unknownCriticalPath = inferUnknownCriticalPath(question, criticalPath);
    const intents = new Set();
    const graphQueries = [];
    const unresolvedReferences = [];
    if (unknownCriticalPath) {
        unresolvedReferences.push({
            type: 'critical-path',
            value: unknownCriticalPath,
            reason: 'unknown-critical-path-alias',
        });
    }

    if (blockIds.length > 0 || hasAny(normalizedQuestion, [/scope/, /kollision/, /collision/, /abhangig/, /dependency/, /plan/, /block/])) {
        intents.add('plan');
    }
    if (filePaths.length > 0 || hasAny(normalizedQuestion, [/datei/, /file/, /settingsmanager/])) {
        intents.add('file');
    }
    if (criticalPath || hasAny(normalizedQuestion, [/runtime/, /event[- ]?flow/, /critical[- ]?path/, /spawn/, /combat/, /round[- ]?end/])) {
        intents.add('runtime');
    }
    if (hasAny(normalizedQuestion, [/test/, /contract/, /gate/, /check/, /coverage/])) {
        intents.add('test');
    }
    if (hasAny(normalizedQuestion, [/architektur/, /architecture/, /boundary/, /surface/, /legacy/, /port/])) {
        intents.add('architecture');
    }
    if (hasAny(normalizedQuestion, [/histor/, /entscheidung/, /decision/, /evidence/, /changelog/, /baseline/])) {
        intents.add('history');
    }
    if (intents.size === 0) {
        intents.add('repo-context');
    }

    if (intents.has('plan') && hasAny(normalizedQuestion, [/scope/, /kollision/, /collision/, /overlap/])) {
        graphQueries.push({ id: 'scope-collisions' });
    }
    for (const blockId of blockIds) {
        graphQueries.push({ id: 'open-deps', blockId });
        graphQueries.push({ id: 'files-for-block', blockId });
    }
    for (const filePath of filePaths) {
        graphQueries.push({ id: 'impact-for-file', filePath });
        if (intents.has('architecture')) graphQueries.push({ id: 'surfaces-for-file', filePath });
        if (intents.has('test')) graphQueries.push({ id: 'test-prioritization', filePath });
    }
    if (criticalPath) {
        graphQueries.push({ id: 'event-flow', selector: criticalPath });
        graphQueries.push({ id: 'critical-path-health' });
    }
    if (graphQueries.length === 0) {
        graphQueries.push({ id: 'critical-path-health' });
    }

    const dedupedGraphQueries = [];
    const seen = new Set();
    for (const query of graphQueries) {
        const key = JSON.stringify(query);
        if (seen.has(key)) continue;
        seen.add(key);
        dedupedGraphQueries.push(query);
    }

    return {
        question: String(question || '').trim(),
        intents: Array.from(intents).sort((left, right) => left.localeCompare(right)),
        blockIds,
        filePaths,
        criticalPath,
        graphQueries: dedupedGraphQueries,
        unresolvedReferences,
    };
}

async function readJson(root, relativePath) {
    const raw = await fs.readFile(path.join(root, normalizeRepoPath(relativePath)), 'utf8');
    return JSON.parse(raw);
}

function assertObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${label} must be an object`);
    }
}

function hasRequiredValues(values, required, label) {
    const set = new Set(Array.isArray(values) ? values : []);
    for (const entry of required) {
        if (!set.has(entry)) throw new Error(`${label} missing ${entry}`);
    }
}

function validateRagEvidencePackageContract(contract) {
    assertObject(contract, 'rag evidence package contract');
    if (contract.contract !== EVIDENCE_PACKAGE_CONTRACT) {
        throw new Error(`Unsupported rag evidence package contract: ${contract.contract || '<empty>'}`);
    }
    if (Number(contract.schema_version) !== 1) {
        throw new Error(`Unsupported rag evidence package schema_version: ${contract.schema_version}`);
    }

    assertObject(contract.claim_schema, 'rag evidence package claim_schema');
    hasRequiredValues(contract.claim_schema.required, [
        'claim',
        'path',
        'lineStart',
        'lineEnd',
        'confidence',
        'uncertainties',
    ], 'rag evidence package claim_schema.required');
    hasRequiredValues(contract.claim_schema.confidence_values, CONFIDENCE_VALUES, 'rag evidence package confidence_values');
    hasRequiredValues(contract.claim_schema.allowed_path_prefixes, ['docs/', '.agents/'], 'rag evidence package allowed_path_prefixes');
    if (Number(contract.claim_schema.max_claims || 0) <= 0) {
        throw new Error('rag evidence package claim_schema requires max_claims');
    }
    if (Number(contract.claim_schema.max_claim_chars || 0) <= 0) {
        throw new Error('rag evidence package claim_schema requires max_claim_chars');
    }
    if (contract.claim_schema.uncertainties?.required !== true) {
        throw new Error('rag evidence package claim uncertainties must be required');
    }

    assertObject(contract.budget_report, 'rag evidence package budget_report');
    hasRequiredValues(contract.budget_report.required, [
        'maxChunks',
        'chunksAvailable',
        'graphCandidateChunks',
        'candidatePathCount',
        'chunksScored',
        'chunksSelected',
        'chunksRejected',
        'selectedGraphCandidateChunks',
        'selectedTextFallbackChunks',
        'selectedEstimatedTokens',
        'fallbackUsed',
        'fallbackRate',
    ], 'rag evidence package budget_report.required');
    assertObject(contract.ranking_report, 'rag evidence package ranking_report');
    hasRequiredValues(contract.ranking_report.required, [
        'topCandidates',
        'rejectedChunks',
        'lowestConfidence',
        'confidenceCounts',
    ], 'rag evidence package ranking_report.required');
    assertObject(contract.consumer_hints, 'rag evidence package consumer_hints');
    hasRequiredValues(contract.consumer_hints.required, [
        'viewer',
        'askRepo',
        'exportPolicy',
        'sourceLinks',
    ], 'rag evidence package consumer_hints.required');

    return contract;
}

async function loadRagEvidencePackageContract(options = {}) {
    const root = options.root || ROOT;
    const contractPath = options.contractPath || EVIDENCE_PACKAGE_CONTRACT_PATH;
    return validateRagEvidencePackageContract(await readJson(root, contractPath));
}

function addCandidatePath(candidates, filePath, reason, weight = 1) {
    const normalized = normalizeRepoPath(filePath);
    if (!normalized) return;
    const existing = candidates.get(normalized) || { path: normalized, reasons: [], weight: 0 };
    if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    existing.weight += weight;
    candidates.set(normalized, existing);
}

function addNodeArtifactsToCandidates(candidates, nodes = [], reasonPrefix = 'graph-artifact') {
    for (const node of nodes || []) {
        for (const artifact of node.artifacts || []) {
            if (artifact?.path) addCandidatePath(candidates, artifact.path, `${reasonPrefix}:${node.id || 'node'}`, 4);
        }
        if (node.file) addCandidatePath(candidates, node.file, `${reasonPrefix}:node-file`, 1);
    }
}

function blockPlanPath(blockId) {
    return `docs/plaene/aktiv/${blockId}.md`;
}

function graphHasBlock(graph, blockId) {
    return (graph.nodes || []).some((node) => node?.type === 'block' && node.id === blockId);
}

function graphHasArtifactPath(graph, filePath) {
    const normalized = normalizeRepoPath(filePath);
    return (graph.nodes || []).some((node) => {
        if (normalizeRepoPath(node?.file || '') === normalized) return true;
        return (node?.artifacts || []).some((artifact) => normalizeRepoPath(artifact?.path || '') === normalized);
    });
}

function coverageHasFile(coverage, filePath) {
    const normalized = normalizeRepoPath(filePath);
    return (coverage.files || []).some((entry) => normalizeRepoPath(entry?.path || '') === normalized);
}

function dedupeUnresolvedReferences(references) {
    const seen = new Set();
    const deduped = [];
    for (const reference of references || []) {
        const key = `${reference.type}:${reference.value}:${reference.reason}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(reference);
    }
    return deduped;
}

function resolveRouteReferences(route, graph, coverage) {
    const unresolvedReferences = [...(route.unresolvedReferences || [])];
    for (const blockId of route.blockIds || []) {
        if (!graphHasBlock(graph, blockId)) {
            unresolvedReferences.push({
                type: 'block',
                value: blockId,
                reason: 'block-not-in-knowledge-graph',
            });
        }
    }
    for (const filePath of route.filePaths || []) {
        if (!coverageHasFile(coverage, filePath) && !graphHasArtifactPath(graph, filePath)) {
            unresolvedReferences.push({
                type: 'file',
                value: normalizeRepoPath(filePath),
                reason: 'file-not-in-knowledge-graph-coverage',
            });
        }
    }
    return {
        ...route,
        unresolvedReferences: dedupeUnresolvedReferences(unresolvedReferences),
    };
}

function routeHasUnresolved(route, type, value) {
    const normalizedValue = type === 'file' ? normalizeRepoPath(value) : String(value || '');
    return (route.unresolvedReferences || []).some((reference) => {
        if (reference.type !== type) return false;
        const referenceValue = type === 'file' ? normalizeRepoPath(reference.value) : String(reference.value || '');
        return referenceValue === normalizedValue;
    });
}

function summarizeGraphResult(result, route) {
    if (result.query === 'scope-collisions') {
        const relevantBlocks = new Set(route.blockIds);
        const relevant = relevantBlocks.size === 0
            ? result.collisions
            : result.collisions.filter((collision) => relevantBlocks.has(collision.leftBlock) || relevantBlocks.has(collision.rightBlock));
        return {
            query: result.query,
            collisionCount: result.collisions.length,
            relevantCollisionCount: relevant.length,
            collisions: relevant.map((collision) => ({
                leftBlock: collision.leftBlock,
                rightBlock: collision.rightBlock,
                sharedFiles: collision.sharedFiles,
            })),
        };
    }
    if (result.query === 'files-for-block') {
        return {
            query: result.query,
            blockId: result.blockId,
            fileCount: result.files.length,
            files: result.files.slice(0, 12).map((entry) => entry.path),
        };
    }
    if (result.query === 'open-deps') {
        return {
            query: result.query,
            blockId: result.blockId,
            openDependencyCount: result.openDependencies.length,
            openDependencies: result.openDependencies,
        };
    }
    if (result.query === 'impact-for-file') {
        return {
            query: result.query,
            file: result.file,
            existsInCoreGraph: result.existsInCoreGraph,
            criticalPaths: result.criticalPaths,
            implementedNodes: result.implementedNodes.map((node) => node.id),
            relatedNodes: result.relatedNodes.slice(0, 8).map((node) => node.id),
            relationEdges: result.relationEdges.slice(0, 6).map((edge) => ({
                from: edge.from,
                to: edge.to,
                type: edge.type,
                causalScore: edge.causalScore ?? null,
                reason: edge.reason ?? null,
            })),
        };
    }
    if (result.query === 'event-flow') {
        return {
            query: result.query,
            selector: result.selector,
            criticalPath: result.criticalPath,
            events: result.events.map((node) => node.id),
            systems: result.systems.map((node) => node.id),
            tests: result.tests.map((node) => node.id),
            edgeCount: result.edges.length,
            contextEdgeCount: result.contextEdges.length,
        };
    }
    if (result.query === 'critical-path-health') {
        const paths = Array.isArray(result.paths)
            ? result.paths
            : (Array.isArray(result.criticalPaths) ? result.criticalPaths : []);
        return {
            query: result.query,
            status: result.status,
            paths: paths.map((entry) => ({
                id: entry.id || entry.criticalPath,
                status: entry.status,
                missingCount: [
                    ...(Array.isArray(entry.missing) ? entry.missing : []),
                    ...(Array.isArray(entry.missingLayers) ? entry.missingLayers : []),
                    ...(Array.isArray(entry.missingValidation) ? entry.missingValidation : []),
                ].length,
            })),
        };
    }
    if (result.query === 'surfaces-for-file') {
        return {
            query: result.query,
            file: result.file,
            surfaces: result.surfaces,
        };
    }
    if (result.query === 'test-prioritization') {
        return {
            query: result.query,
            status: result.status,
            testCount: Array.isArray(result.tests) ? result.tests.length : 0,
            tests: (result.tests || []).slice(0, 8),
        };
    }
    return { query: result.query };
}

function collectCandidatesForResult(result, route, candidates) {
    if (result.query === 'scope-collisions') {
        addCandidatePath(candidates, 'docs/Umsetzungsplan.md', 'scope-collisions:master', 5);
        addCandidatePath(candidates, 'docs/plaene/CHANGELOG.md', 'scope-collisions:changelog', 4);
        for (const collision of result.collisions || []) {
            const relevant = route.blockIds.length === 0
                || route.blockIds.includes(collision.leftBlock)
                || route.blockIds.includes(collision.rightBlock);
            if (!relevant) continue;
            addCandidatePath(candidates, blockPlanPath(collision.leftBlock), 'scope-collisions:block-plan', 6);
            addCandidatePath(candidates, blockPlanPath(collision.rightBlock), 'scope-collisions:block-plan', 6);
            for (const sharedFile of collision.sharedFiles || []) {
                addCandidatePath(candidates, sharedFile, 'scope-collisions:shared-file', 2);
            }
        }
    }
    if (result.query === 'files-for-block') {
        if (routeHasUnresolved(route, 'block', result.blockId)) return;
        addCandidatePath(candidates, blockPlanPath(result.blockId), `files-for-block:${result.blockId}`, 7);
        for (const entry of result.files || []) {
            addCandidatePath(candidates, entry.path, `files-for-block:${result.blockId}`, 2);
        }
    }
    if (result.query === 'open-deps') {
        if (routeHasUnresolved(route, 'block', result.blockId)) return;
        addCandidatePath(candidates, 'docs/Umsetzungsplan.md', `open-deps:${result.blockId}`, 4);
        addCandidatePath(candidates, blockPlanPath(result.blockId), `open-deps:${result.blockId}`, 5);
    }
    if (result.query === 'impact-for-file') {
        if (routeHasUnresolved(route, 'file', result.file)) return;
        addCandidatePath(candidates, result.file, 'impact-for-file:subject', 5);
        addNodeArtifactsToCandidates(candidates, result.implementedNodes, 'impact-for-file:implemented');
        addNodeArtifactsToCandidates(candidates, result.relatedNodes, 'impact-for-file:related');
        addCandidatePath(candidates, 'docs/plaene/CHANGELOG.md', 'impact-for-file:history', route.intents.includes('history') ? 5 : 2);
        addCandidatePath(candidates, 'docs/referenz/ai_architecture_context.md', 'impact-for-file:architecture-context', route.intents.includes('architecture') ? 5 : 2);
    }
    if (result.query === 'event-flow') {
        addNodeArtifactsToCandidates(candidates, result.events, 'event-flow:event');
        addNodeArtifactsToCandidates(candidates, result.systems, 'event-flow:system');
        addNodeArtifactsToCandidates(candidates, result.states, 'event-flow:state');
        addNodeArtifactsToCandidates(candidates, result.configs, 'event-flow:config');
        addNodeArtifactsToCandidates(candidates, result.tests, 'event-flow:test');
        addCandidatePath(candidates, 'docs/referenz/ai_architecture_context.md', 'event-flow:graph-query-reference', 2);
    }
    if (result.query === 'surfaces-for-file') {
        addCandidatePath(candidates, result.file, 'surfaces-for-file:subject', 3);
        addCandidatePath(candidates, 'docs/referenz/ai_architecture_context.md', 'surfaces-for-file:architecture-context', 5);
    }
    if (result.query === 'test-prioritization') {
        for (const entry of result.tests || []) {
            if (entry.path) addCandidatePath(candidates, entry.path, 'test-prioritization:test', 3);
        }
    }
}

function executeGraphQuery(query, graph, coverage) {
    if (query.id === 'scope-collisions') return queryScopeCollisions(graph);
    if (query.id === 'open-deps') return queryOpenDeps(graph, query.blockId);
    if (query.id === 'files-for-block') return queryFilesForBlock(graph, coverage, query.blockId);
    if (query.id === 'impact-for-file') return queryImpactForFile(graph, coverage, query.filePath);
    if (query.id === 'event-flow') return queryEventFlow(graph, query.selector);
    if (query.id === 'critical-path-health') return queryCriticalPathHealth(graph);
    if (query.id === 'surfaces-for-file') return querySurfacesForFile(graph, query.filePath);
    if (query.id === 'test-prioritization') return queryTestPrioritization(graph, coverage, [query.filePath]);
    throw new Error(`Unsupported graph query: ${query.id}`);
}

function runGraphCandidateSelection(route, graph, coverage) {
    const candidates = new Map();
    const graphResults = [];

    for (const query of route.graphQueries) {
        const result = executeGraphQuery(query, graph, coverage);
        graphResults.push({
            request: query,
            result,
            summary: summarizeGraphResult(result, route),
        });
        collectCandidatesForResult(result, route, candidates);
    }

    for (const blockId of route.blockIds) {
        if (routeHasUnresolved(route, 'block', blockId)) continue;
        addCandidatePath(candidates, blockPlanPath(blockId), 'mentioned-block', 8);
    }
    for (const filePath of route.filePaths) {
        if (routeHasUnresolved(route, 'file', filePath)) continue;
        addCandidatePath(candidates, filePath, 'mentioned-file', 8);
    }

    return {
        graphResults,
        candidates: Array.from(candidates.values())
            .sort((left, right) => right.weight - left.weight || left.path.localeCompare(right.path)),
    };
}

function chunkMatchesCandidate(chunk, candidatePaths, route) {
    if (candidatePaths.has(normalizeRepoPath(chunk.path))) return true;
    const chunkBlocks = new Set(chunk.graph?.blockIds || []);
    return route.blockIds.some((blockId) => chunkBlocks.has(blockId));
}

function scoreChunk(chunk, route, candidatePaths, candidateWeights, queryTokens) {
    const chunkPath = normalizeRepoPath(chunk.path);
    const text = normalizeText(`${chunk.path} ${(chunk.headings || []).join(' ')} ${chunk.text}`);
    let score = Number(chunk.sourcePriority || 0);

    if (candidatePaths.has(chunkPath)) score += 600 + (candidateWeights.get(chunkPath) || 0) * 20;
    for (const blockId of route.blockIds) {
        if ((chunk.graph?.blockIds || []).includes(blockId)) score += 220;
        if (chunkPath.endsWith(`${blockId}.md`)) score += 260;
        if (text.includes(blockId.toLowerCase())) score += 30;
    }
    for (const filePath of route.filePaths) {
        const fileName = path.posix.basename(filePath).toLowerCase();
        if (text.includes(fileName)) score += 160;
        if (text.includes(filePath.toLowerCase())) score += 220;
    }
    if (route.criticalPath && containsExactTerm(text, route.criticalPath)) {
        score += 450;
    } else if (route.criticalPath && text.includes(route.criticalPath)) {
        score += 60;
    }
    for (const token of queryTokens) {
        if (text.includes(token)) score += 12;
    }
    if ((chunk.headings || []).some((heading) => queryTokens.some((token) => normalizeText(heading).includes(token)))) {
        score += 50;
    }
    return score;
}

function makeExcerpt(text, maxChars = 360) {
    const compact = String(text || '').replace(/\s+/g, ' ').trim();
    if (compact.length <= maxChars) return compact;
    return `${compact.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function allowedEvidencePath(filePath, contract) {
    const normalized = normalizeRepoPath(filePath);
    return (contract.claim_schema.allowed_path_prefixes || []).some((prefix) => normalized.startsWith(prefix));
}

function validateRagEvidencePackage(evidencePackage, contract) {
    const evidenceContract = validateRagEvidencePackageContract(contract);
    assertObject(evidencePackage, 'rag evidence package');
    if (evidencePackage.contract !== evidenceContract.contract) {
        throw new Error(`Unsupported evidence package contract: ${evidencePackage.contract || '<empty>'}`);
    }
    if (Number(evidencePackage.schema_version) !== Number(evidenceContract.schema_version)) {
        throw new Error(`Unsupported evidence package schema_version: ${evidencePackage.schema_version}`);
    }
    if (!Array.isArray(evidencePackage.claims)) {
        throw new Error('evidence package requires claims');
    }
    if (evidencePackage.claims.length > Number(evidenceContract.claim_schema.max_claims)) {
        throw new Error(`evidence package has too many claims: ${evidencePackage.claims.length}`);
    }
    if (!Array.isArray(evidencePackage.uncertainties) || evidencePackage.uncertainties.length === 0) {
        throw new Error('evidence package requires uncertainties');
    }

    const confidenceValues = new Set(evidenceContract.claim_schema.confidence_values);
    const maxClaimChars = Number(evidenceContract.claim_schema.max_claim_chars);
    for (const claim of evidencePackage.claims) {
        assertObject(claim, 'evidence package claim');
        for (const field of evidenceContract.claim_schema.required) {
            if (claim[field] == null || claim[field] === '') {
                throw new Error(`evidence package claim missing ${field}`);
            }
        }
        if (String(claim.claim).length > maxClaimChars) {
            throw new Error(`evidence package claim exceeds ${maxClaimChars} chars`);
        }
        if (!allowedEvidencePath(claim.path, evidenceContract)) {
            throw new Error(`evidence package claim path is not allowed: ${claim.path}`);
        }
        if (!Number.isInteger(claim.lineStart) || claim.lineStart < 1) {
            throw new Error(`evidence package claim has invalid lineStart: ${claim.lineStart}`);
        }
        if (!Number.isInteger(claim.lineEnd) || claim.lineEnd < claim.lineStart) {
            throw new Error(`evidence package claim has invalid lineEnd: ${claim.lineEnd}`);
        }
        if (!confidenceValues.has(claim.confidence)) {
            throw new Error(`evidence package claim has invalid confidence: ${claim.confidence}`);
        }
        if (!Array.isArray(claim.uncertainties) || claim.uncertainties.length === 0) {
            throw new Error('evidence package claim requires uncertainties');
        }
    }

    assertObject(evidencePackage.budgetReport, 'evidence package budgetReport');
    for (const field of evidenceContract.budget_report.required) {
        if (evidencePackage.budgetReport[field] == null) {
            throw new Error(`evidence package budgetReport missing ${field}`);
        }
    }
    for (const field of evidenceContract.budget_report.required.filter((entry) => entry !== 'fallbackUsed')) {
        if (!Number.isFinite(Number(evidencePackage.budgetReport[field]))) {
            throw new Error(`evidence package budgetReport field is not numeric: ${field}`);
        }
    }
    if (typeof evidencePackage.budgetReport.fallbackUsed !== 'boolean') {
        throw new Error('evidence package budgetReport fallbackUsed must be boolean');
    }
    if (Number(evidencePackage.budgetReport.fallbackRate) < 0 || Number(evidencePackage.budgetReport.fallbackRate) > 1) {
        throw new Error('evidence package budgetReport fallbackRate must be between 0 and 1');
    }

    assertObject(evidencePackage.rankingReport, 'evidence package rankingReport');
    if (!Array.isArray(evidencePackage.rankingReport.topCandidates)) {
        throw new Error('evidence package rankingReport topCandidates must be an array');
    }
    if (!Array.isArray(evidencePackage.rankingReport.rejectedChunks)) {
        throw new Error('evidence package rankingReport rejectedChunks must be an array');
    }
    if (!confidenceValues.has(evidencePackage.rankingReport.lowestConfidence)) {
        throw new Error(`evidence package rankingReport has invalid lowestConfidence: ${evidencePackage.rankingReport.lowestConfidence}`);
    }
    assertObject(evidencePackage.rankingReport.confidenceCounts, 'evidence package rankingReport confidenceCounts');
    for (const confidence of confidenceValues) {
        if (!Number.isFinite(Number(evidencePackage.rankingReport.confidenceCounts[confidence] || 0))) {
            throw new Error(`evidence package rankingReport confidenceCounts invalid: ${confidence}`);
        }
    }

    assertObject(evidencePackage.consumerHints, 'evidence package consumerHints');
    assertObject(evidencePackage.consumerHints.viewer, 'evidence package consumerHints.viewer');
    assertObject(evidencePackage.consumerHints.askRepo, 'evidence package consumerHints.askRepo');
    assertObject(evidencePackage.consumerHints.exportPolicy, 'evidence package consumerHints.exportPolicy');
    if (evidencePackage.consumerHints.viewer.sourceOfTruth !== false) {
        throw new Error('evidence package viewer hints must not be source of truth');
    }
    if (evidencePackage.consumerHints.askRepo.sourceOfTruth !== false) {
        throw new Error('evidence package Ask-Repo hints must not be source of truth');
    }
    if (evidencePackage.consumerHints.exportPolicy.safeToCommit !== false) {
        throw new Error('evidence package exportPolicy.safeToCommit must be false');
    }
    if (!Array.isArray(evidencePackage.consumerHints.sourceLinks)) {
        throw new Error('evidence package consumerHints.sourceLinks must be an array');
    }
    for (const link of evidencePackage.consumerHints.sourceLinks) {
        if (!link?.chunkId || !allowedEvidencePath(link.path, evidenceContract)) {
            throw new Error(`evidence package consumer hint source link is invalid: ${link?.path || '<empty>'}`);
        }
        if (!Number.isInteger(link.lineStart) || !Number.isInteger(link.lineEnd) || link.lineEnd < link.lineStart) {
            throw new Error(`evidence package consumer hint source link has invalid lines: ${link.path}`);
        }
    }

    return evidencePackage;
}

function isStrongChunkMatch(chunk, route, candidatePaths) {
    return candidatePaths.has(normalizeRepoPath(chunk.path))
        || route.blockIds.some((blockId) => (chunk.graph?.blockIds || []).includes(blockId))
        || route.filePaths.some((filePath) => normalizeText(chunk.text).includes(path.posix.basename(filePath).toLowerCase()))
        || (route.criticalPath && containsExactTerm(chunk.text, route.criticalPath));
}

function summarizeRankedChunk(chunk, selectedIds = new Set(), rejectedReason = null) {
    return {
        id: chunk.id,
        path: chunk.path,
        retrievalScore: chunk.retrievalScore,
        selectedVia: chunk.selectedVia,
        selected: selectedIds.has(chunk.id),
        rejectedReason,
    };
}

function selectGraphRagChunks(index, route, candidates, options = {}) {
    const maxChunks = Number(options.maxChunks || DEFAULT_MAX_CHUNKS);
    const candidatePaths = new Set(candidates.map((candidate) => normalizeRepoPath(candidate.path)));
    const candidateWeights = new Map(candidates.map((candidate) => [normalizeRepoPath(candidate.path), candidate.weight]));
    const queryTokens = tokenize(route.question);
    const chunks = Array.isArray(index?.chunks) ? index.chunks : [];
    const graphCandidateChunks = chunks.filter((chunk) => chunkMatchesCandidate(chunk, candidatePaths, route));
    const searchPool = graphCandidateChunks.length > 0 ? graphCandidateChunks : chunks;
    const scored = searchPool
        .map((chunk) => ({
            ...chunk,
            retrievalScore: scoreChunk(chunk, route, candidatePaths, candidateWeights, queryTokens),
            selectedVia: chunkMatchesCandidate(chunk, candidatePaths, route)
                ? 'graph-candidate'
                : 'text-fallback',
        }))
        .filter((chunk) => chunk.retrievalScore > 0)
        .sort((left, right) => right.retrievalScore - left.retrievalScore || left.id.localeCompare(right.id));

    const selected = [];
    const seenPaths = new Set();
    const rejectedReasons = new Map();
    for (const chunk of scored) {
        const strongMatch = isStrongChunkMatch(chunk, route, candidatePaths);
        if (!strongMatch && selected.length > 0) {
            rejectedReasons.set(chunk.id, 'weak-match-after-strong-selection');
            continue;
        }
        selected.push(chunk);
        seenPaths.add(normalizeRepoPath(chunk.path));
        if (selected.length >= maxChunks) break;
    }

    if (selected.length < maxChunks) {
        for (const chunk of scored) {
            if (selected.some((entry) => entry.id === chunk.id)) continue;
            if (seenPaths.has(normalizeRepoPath(chunk.path)) && selected.length >= Math.ceil(maxChunks / 2)) {
                rejectedReasons.set(chunk.id, 'same-path-budget-limit');
                continue;
            }
            rejectedReasons.delete(chunk.id);
            selected.push(chunk);
            seenPaths.add(normalizeRepoPath(chunk.path));
            if (selected.length >= maxChunks) break;
        }
    }

    const selectedIds = new Set(selected.map((chunk) => chunk.id));
    for (const chunk of scored) {
        if (selectedIds.has(chunk.id) || rejectedReasons.has(chunk.id)) continue;
        rejectedReasons.set(chunk.id, selected.length >= maxChunks ? 'ranked-below-budget' : 'not-selected');
    }
    const selectedGraphCandidateChunks = selected.filter((chunk) => chunk.selectedVia === 'graph-candidate').length;
    const selectedTextFallbackChunks = selected.filter((chunk) => chunk.selectedVia === 'text-fallback').length;
    const fallbackRate = selected.length === 0 ? (graphCandidateChunks.length === 0 ? 1 : 0) : selectedTextFallbackChunks / selected.length;

    return {
        selectedChunks: selected.map((chunk) => ({
            id: chunk.id,
            path: chunk.path,
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
            hash: chunk.hash,
            sourceClass: chunk.sourceClass,
            estimatedTokens: chunk.estimatedTokens,
            retrievalScore: chunk.retrievalScore,
            selectedVia: chunk.selectedVia,
            headings: chunk.headings || [],
            graph: chunk.graph || null,
            excerpt: makeExcerpt(chunk.text),
        })),
        retrievalStats: {
            chunksAvailable: chunks.length,
            graphCandidateChunks: graphCandidateChunks.length,
            candidatePathCount: candidatePaths.size,
            chunksScored: scored.length,
            chunksSelected: selected.length,
            chunksRejected: Math.max(0, scored.length - selected.length),
            selectedGraphCandidateChunks,
            selectedTextFallbackChunks,
            selectedEstimatedTokens: selected.reduce((sum, chunk) => sum + Number(chunk.estimatedTokens || 0), 0),
            fallbackUsed: graphCandidateChunks.length === 0,
            fallbackRate: Number(fallbackRate.toFixed(3)),
            topCandidates: scored.slice(0, 8).map((chunk) => summarizeRankedChunk(chunk, selectedIds, rejectedReasons.get(chunk.id) || null)),
            rejectedChunks: scored
                .filter((chunk) => !selectedIds.has(chunk.id))
                .slice(0, 12)
                .map((chunk) => summarizeRankedChunk(chunk, selectedIds, rejectedReasons.get(chunk.id) || 'not-selected')),
        },
    };
}

function makeBudgetReport(chunkSelection, options = {}) {
    const stats = chunkSelection.retrievalStats;
    return {
        maxChunks: Number(options.maxChunks || DEFAULT_MAX_CHUNKS),
        chunksAvailable: stats.chunksAvailable,
        graphCandidateChunks: stats.graphCandidateChunks,
        candidatePathCount: stats.candidatePathCount,
        chunksScored: stats.chunksScored,
        chunksSelected: stats.chunksSelected,
        chunksRejected: stats.chunksRejected,
        selectedGraphCandidateChunks: stats.selectedGraphCandidateChunks,
        selectedTextFallbackChunks: stats.selectedTextFallbackChunks,
        selectedEstimatedTokens: stats.selectedEstimatedTokens,
        fallbackUsed: stats.fallbackUsed,
        fallbackRate: stats.fallbackRate,
    };
}

function confidenceRank(confidence) {
    return CONFIDENCE_VALUES.indexOf(confidence);
}

function confidenceForChunk(route, chunk) {
    const directCandidate = chunk.selectedVia === 'graph-candidate';
    let confidence = directCandidate && chunk.retrievalScore >= 300
        ? 'high'
        : (chunk.retrievalScore >= 160 ? 'medium' : 'low');
    if ((route.unresolvedReferences || []).length > 0 && confidence === 'high') {
        confidence = 'medium';
    }
    return confidence;
}

function makeRankingReport(chunkSelection, claims) {
    const confidenceCounts = Object.fromEntries(CONFIDENCE_VALUES.map((confidence) => [confidence, 0]));
    for (const claim of claims) confidenceCounts[claim.confidence] += 1;
    const lowestConfidence = claims.length === 0
        ? 'low'
        : claims
            .map((claim) => claim.confidence)
            .sort((left, right) => confidenceRank(right) - confidenceRank(left))[0];
    const stats = chunkSelection.retrievalStats;
    return {
        topCandidates: stats.topCandidates,
        rejectedChunks: stats.rejectedChunks,
        lowestConfidence,
        confidenceCounts,
    };
}

function makeConsumerHints(route, graphSelection, claims) {
    return {
        viewer: {
            purpose: 'display-source-backed-evidence',
            suggestedSections: ['graphQueries', 'claims', 'uncertainties', 'budgetReport', 'rankingReport'],
            cacheScope: 'transient-per-query',
            sourceOfTruth: false,
        },
        askRepo: {
            answerContract: ['question', 'graphQueries', 'claims', 'uncertainties', 'budgetReport', 'sourceLinks'],
            requiresSourceLinks: true,
            sourceOfTruth: false,
            unresolvedReferenceCount: (route.unresolvedReferences || []).length,
            graphQueryCount: graphSelection.graphResults.length,
        },
        exportPolicy: {
            runtimeOutputDir: 'tmp/graph-rag/',
            cacheTtl: 'per-query',
            generatedBy: 'scripts/graph-rag-query.mjs',
            safeToCommit: false,
        },
        sourceLinks: claims.map((claim) => ({
            chunkId: claim.chunkId,
            path: claim.path,
            lineStart: claim.lineStart,
            lineEnd: claim.lineEnd,
        })),
    };
}

function makeEvidencePackage(route, graphSelection, chunkSelection, options = {}) {
    const claims = chunkSelection.selectedChunks.map((chunk, index) => {
        const directCandidate = chunk.selectedVia === 'graph-candidate';
        const confidence = confidenceForChunk(route, chunk);
        const uncertainties = ['deterministic-retrieval-only'];
        if (!directCandidate) uncertainties.push('text-fallback-used');
        if ((route.unresolvedReferences || []).length > 0) uncertainties.push('unresolved-query-reference');
        if (!chunk.graph?.fileNodeId && !chunk.graph?.blockIds?.length) uncertainties.push('no-graph-file-reference');
        return {
            id: `claim-${index + 1}`,
            claim: makeExcerpt(chunk.excerpt, 220),
            path: chunk.path,
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
            confidence,
            uncertainties,
            chunkId: chunk.id,
            hash: chunk.hash,
            sourceClass: chunk.sourceClass,
        };
    });
    const packageUncertainties = [
        'deterministic-retrieval-only',
        'local-ai-not-source-of-truth',
    ];
    if ((route.unresolvedReferences || []).length > 0) {
        packageUncertainties.push('unresolved-query-reference');
    }
    const budgetReport = makeBudgetReport(chunkSelection, options);
    const rankingReport = makeRankingReport(chunkSelection, claims);

    return {
        contract: EVIDENCE_PACKAGE_CONTRACT,
        schema_version: 1,
        question: route.question,
        mode: 'graph-first-deterministic-retrieval',
        graphQueries: graphSelection.graphResults.map((entry) => entry.summary),
        budgetReport,
        rankingReport,
        consumerHints: makeConsumerHints(route, graphSelection, claims),
        claims,
        uncertainties: packageUncertainties,
    };
}

async function loadIndex(root, options) {
    if (options.index) return options.index;
    if (options.indexPath) return readJson(root, options.indexPath);
    const contract = options.contract || await loadRagSourceContract({ root, contractPath: options.contractPath });
    return buildGraphRagIndex({
        root,
        contract,
        contractPath: options.contractPath,
        graph: options.graph,
        graphPath: options.graphPath,
        includeConditional: options.includeConditional || [],
        sourcePaths: options.sourcePaths,
    });
}

async function writeJson(root, relativePath, artifact) {
    const normalizedPath = assertGraphRagRuntimeOutputPath(relativePath);
    const absolutePath = path.join(root, normalizedPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return normalizedPath;
}

async function runGraphRagQuery(question, options = {}) {
    const root = options.root || ROOT;
    const initialRoute = routeGraphRagQuestion(question);
    if (!initialRoute.question) throw new Error('Question is required');
    const requestedWritePath = options.write || options.outPath
        ? assertGraphRagRuntimeOutputPath(options.outPath || 'tmp/graph-rag/graph-rag-query.json')
        : null;
    const [graph, coverage] = await Promise.all([
        options.graph || readJson(root, options.graphPath || GRAPH_PATH),
        options.coverage || readJson(root, options.coveragePath || COVERAGE_PATH),
    ]);
    const route = resolveRouteReferences(initialRoute, graph, coverage);
    const graphSelection = runGraphCandidateSelection(route, graph, coverage);
    const index = await loadIndex(root, { ...options, graph });
    const chunkSelection = selectGraphRagChunks(index, route, graphSelection.candidates, options);
    const evidenceContract = validateRagEvidencePackageContract(
        options.evidencePackageContract
        || await loadRagEvidencePackageContract({
            root,
            contractPath: options.evidencePackageContractPath,
        })
    );
    const evidencePackage = validateRagEvidencePackage(
        makeEvidencePackage(route, graphSelection, chunkSelection, options),
        evidenceContract
    );
    const budgetReport = evidencePackage.budgetReport;
    const result = {
        contract: QUERY_CONTRACT,
        schema_version: 1,
        generated_at: new Date().toISOString(),
        question: route.question,
        route,
        pipeline: [
            { stage: 'intent-router', output: route.intents },
            { stage: 'graph-query', output: route.graphQueries.map((query) => query.id) },
            { stage: 'candidate-selection', output: graphSelection.candidates.length },
            { stage: 'text-retrieval', output: chunkSelection.retrievalStats.chunksSelected },
            { stage: 'evidence-package', output: evidencePackage.contract },
        ],
        graph: {
            queries: graphSelection.graphResults.map((entry) => entry.summary),
            candidates: graphSelection.candidates,
        },
        retrieval: chunkSelection.retrievalStats,
        selectedChunks: chunkSelection.selectedChunks,
        budget: {
            graphQueryCount: graphSelection.graphResults.length,
            ...budgetReport,
            graphCandidatePathCount: budgetReport.candidatePathCount,
            selectedChunkCount: budgetReport.chunksSelected,
            rejectedChunkCount: budgetReport.chunksRejected,
            lowestConfidence: evidencePackage.rankingReport.lowestConfidence,
        },
        evidencePackage,
    };

    if (options.write || options.outPath) {
        result.writtenPath = await writeJson(root, requestedWritePath, result);
    }
    return result;
}

function parseCliArgs(argv) {
    const options = {
        json: false,
        write: false,
        includeConditional: [],
        questionParts: [],
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--json') {
            options.json = true;
        } else if (arg === '--write') {
            options.write = true;
        } else if (arg === '--out') {
            options.outPath = argv[index + 1];
            options.write = true;
            index += 1;
        } else if (arg === '--question' || arg === '-q') {
            options.questionParts.push(argv[index + 1]);
            index += 1;
        } else if (arg === '--max-chunks') {
            options.maxChunks = Number(argv[index + 1]);
            index += 1;
        } else if (arg === '--index') {
            options.indexPath = argv[index + 1];
            index += 1;
        } else if (arg === '--contract') {
            options.contractPath = argv[index + 1];
            index += 1;
        } else if (arg === '--graph') {
            options.graphPath = argv[index + 1];
            index += 1;
        } else if (arg === '--coverage') {
            options.coveragePath = argv[index + 1];
            index += 1;
        } else if (arg === '--evidence-contract') {
            options.evidencePackageContractPath = argv[index + 1];
            index += 1;
        } else if (arg === '--include-conditional') {
            options.includeConditional.push(argv[index + 1]);
            index += 1;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg.startsWith('--')) {
            throw new Error(`Unknown argument: ${arg}`);
        } else {
            options.questionParts.push(arg);
        }
    }
    return options;
}

function usage() {
    process.stdout.write(
        'Usage:\n'
        + '  node scripts/graph-rag-query.mjs "question" [--json] [--max-chunks N] [--write|--out tmp/graph-rag/query.json]\n'
        + '  node scripts/graph-rag-query.mjs --question "question" [--index tmp/graph-rag/graph-rag-index.json]\n'
    );
}

async function runCli(argv = process.argv.slice(2)) {
    const cliOptions = parseCliArgs(argv);
    if (cliOptions.help) {
        usage();
        return;
    }
    const question = cliOptions.questionParts.join(' ').trim();
    if (!question) {
        usage();
        process.exitCode = 1;
        return;
    }
    const result = await runGraphRagQuery(question, cliOptions);
    if (cliOptions.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
    }
    const budget = result.evidencePackage.budgetReport;
    process.stdout.write([
        `Graph-RAG query: ${result.question}`,
        `Intents: ${result.route.intents.join(', ')}`,
        `Graph queries: ${result.route.graphQueries.map((query) => query.id).join(', ')}`,
        `Candidates: paths ${budget.candidatePathCount}; graph chunks ${budget.graphCandidateChunks}; scored ${budget.chunksScored}`,
        `Budget: selected ${budget.chunksSelected}/${budget.maxChunks}; rejected ${budget.chunksRejected}; estimated tokens ${budget.selectedEstimatedTokens}; fallback ${budget.fallbackUsed ? 'yes' : 'no'} (${budget.fallbackRate})`,
        `Confidence: lowest ${result.budget.lowestConfidence}; fallback rate ${budget.fallbackRate}`,
        `Output: ${result.writtenPath || 'stdout only'}`,
    ].join('\n') + '\n');
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
    runCli().catch((error) => {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exitCode = 1;
    });
}

export {
    EVIDENCE_PACKAGE_CONTRACT,
    EVIDENCE_PACKAGE_CONTRACT_PATH,
    QUERY_CONTRACT,
    loadRagEvidencePackageContract,
    routeGraphRagQuestion,
    runGraphCandidateSelection,
    runGraphRagQuery,
    selectGraphRagChunks,
    validateRagEvidencePackage,
    validateRagEvidencePackageContract,
};
