#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    buildKnowledgeGraph,
    parseDependencyTable,
    parseDependencyToken,
    parseFrontmatter,
    parseMasterRows,
} from './build-knowledge-graph.mjs';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const MASTER_PLAN_PATH = 'docs/Umsetzungsplan.md';
const ACTIVE_PLANS_DIR = 'docs/plaene/aktiv';

function graphToString(graph) {
    return `${JSON.stringify(graph, null, 2)}\n`;
}

function addViolation(violations, code, message) {
    violations.push({ code, message });
}

async function readExistingGraph() {
    const absolutePath = path.join(ROOT, GRAPH_PATH);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return {
        raw,
        parsed: JSON.parse(raw),
    };
}

async function readScopeOverlapAllowances() {
    const directory = path.join(ROOT, ACTIVE_PLANS_DIR);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const blockAllowMap = new Map();

    for (const entry of entries) {
        if (!entry.isFile() || !/^V\d+\.md$/i.test(entry.name)) continue;
        const relativePath = path.join(ACTIVE_PLANS_DIR, entry.name).replace(/\\/g, '/');
        const content = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
        const { data } = parseFrontmatter(content);
        const blockId = String(data.id || path.basename(entry.name, '.md')).trim();
        const rawAllow = data.scope_overlap_allowed_with;

        let values = [];
        if (Array.isArray(rawAllow)) {
            values = rawAllow;
        } else if (typeof rawAllow === 'string' && rawAllow.trim()) {
            values = rawAllow.split(',').map((value) => value.trim());
        }

        const normalized = values
            .map((value) => String(value || '').trim())
            .filter(Boolean);
        blockAllowMap.set(blockId, new Set(normalized));
    }

    return blockAllowMap;
}

function ensureDependsTargetsExist(graph, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    for (const edge of edges) {
        if (edge.type !== 'depends_on') continue;
        if (!nodeById.has(edge.to)) {
            addViolation(violations, 'DEPENDS_TARGET_MISSING', `depends_on target node fehlt: ${edge.from} -> ${edge.to}`);
            continue;
        }
        const targetNode = nodeById.get(edge.to);
        if (targetNode.type !== 'block') {
            addViolation(violations, 'DEPENDS_TARGET_NOT_BLOCK', `depends_on target ist kein block node: ${edge.from} -> ${edge.to} (${targetNode.type})`);
        }
    }
}

function detectHardDependsCycles(graph, violations) {
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const hardEdges = edges.filter((edge) => edge.type === 'depends_on' && edge.hard === true);
    const adjacency = new Map();

    for (const edge of hardEdges) {
        if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
        adjacency.get(edge.from).add(edge.to);
    }

    const state = new Map();
    const stack = [];
    let cyclePath = null;

    function dfs(nodeId) {
        if (cyclePath) return;
        state.set(nodeId, 1);
        stack.push(nodeId);

        for (const nextNode of adjacency.get(nodeId) || []) {
            const nextState = state.get(nextNode) || 0;
            if (nextState === 0) {
                dfs(nextNode);
                if (cyclePath) return;
                continue;
            }
            if (nextState === 1) {
                const cycleStart = stack.lastIndexOf(nextNode);
                const cycleNodes = stack.slice(cycleStart).concat(nextNode);
                cyclePath = cycleNodes;
                return;
            }
        }

        stack.pop();
        state.set(nodeId, 2);
    }

    for (const nodeId of adjacency.keys()) {
        if ((state.get(nodeId) || 0) === 0) dfs(nodeId);
        if (cyclePath) break;
    }

    if (cyclePath) {
        addViolation(violations, 'HARD_DEPENDS_CYCLE', `Hard-depends Zyklus erkannt: ${cyclePath.join(' -> ')}`);
    }
}

function validateScopeEdgesAndFiles(graph, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    for (const edge of edges) {
        if (edge.type !== 'scope') continue;
        const fileNode = nodeById.get(edge.to);
        if (!fileNode) {
            addViolation(violations, 'SCOPE_FILE_NODE_MISSING', `scope edge ohne file node: ${edge.from} -> ${edge.to}`);
            continue;
        }
        if (fileNode.type !== 'file') {
            addViolation(violations, 'SCOPE_TARGET_NOT_FILE', `scope edge zeigt nicht auf file node: ${edge.from} -> ${edge.to} (${fileNode.type})`);
            continue;
        }
        if (typeof fileNode.attributes?.exists !== 'boolean') {
            addViolation(violations, 'SCOPE_FILE_EXISTS_MISSING', `file node ohne exists-Flag: ${edge.to}`);
        }
    }
}

function validateScopeCollisions(graph, allowancesByBlock, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const openBlocks = nodes
        .filter((node) => node.type === 'block' && node.status !== 'done')
        .map((node) => node.id)
        .sort((left, right) => left.localeCompare(right));

    const scopeByBlock = new Map();
    for (const edge of edges) {
        if (edge.type !== 'scope') continue;
        if (!openBlocks.includes(edge.from)) continue;
        if (!scopeByBlock.has(edge.from)) scopeByBlock.set(edge.from, new Set());
        scopeByBlock.get(edge.from).add(edge.to);
    }

    for (let index = 0; index < openBlocks.length; index += 1) {
        for (let cursor = index + 1; cursor < openBlocks.length; cursor += 1) {
            const leftBlock = openBlocks[index];
            const rightBlock = openBlocks[cursor];
            const leftScope = scopeByBlock.get(leftBlock) || new Set();
            const rightScope = scopeByBlock.get(rightBlock) || new Set();
            const sharedFiles = Array.from(leftScope)
                .filter((filePath) => rightScope.has(filePath))
                .sort((left, right) => left.localeCompare(right));
            if (sharedFiles.length === 0) continue;

            const leftAllowsRight = allowancesByBlock.get(leftBlock)?.has(rightBlock) === true;
            const rightAllowsLeft = allowancesByBlock.get(rightBlock)?.has(leftBlock) === true;
            if (!leftAllowsRight || !rightAllowsLeft) {
                addViolation(
                    violations,
                    'SCOPE_COLLISION',
                    `Scope-Kollision ${leftBlock}<->${rightBlock} auf ${sharedFiles.join(', ')} ohne beidseitige scope_overlap_allowed_with-Freigabe`
                );
            }
        }
    }
}

function validateRequiredPhaseAndScopeData(graph, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const blockNodes = nodes.filter((node) => node.type === 'block');
    const scopeRelevantBlockIds = new Set(
        blockNodes
            .filter((node) => Array.isArray(node.attributes?.source)
                && (node.attributes.source.includes('master-index') || node.attributes.source.includes('block-plan')))
            .map((node) => node.id)
    );
    const blockPlanBlockIds = new Set(
        blockNodes
            .filter((node) => Array.isArray(node.attributes?.source) && node.attributes.source.includes('block-plan'))
            .map((node) => node.id)
    );

    const scopeCountByBlock = new Map();
    const phaseIdsByBlock = new Map();
    for (const edge of edges) {
        if (edge.type === 'scope') {
            scopeCountByBlock.set(edge.from, (scopeCountByBlock.get(edge.from) || 0) + 1);
        }
        if (edge.type === 'contains_phase') {
            if (!phaseIdsByBlock.has(edge.from)) phaseIdsByBlock.set(edge.from, []);
            phaseIdsByBlock.get(edge.from).push(edge.to);
        }
    }

    for (const block of blockNodes) {
        if (!scopeRelevantBlockIds.has(block.id)) continue;
        if (block.status !== 'done' && (scopeCountByBlock.get(block.id) || 0) < 1) {
            addViolation(violations, 'BLOCK_SCOPE_MISSING', `Nicht-abgeschlossener Block ohne scope-Edge: ${block.id}`);
        }
    }

    for (const blockId of blockPlanBlockIds) {
        const phaseIds = phaseIdsByBlock.get(blockId) || [];
        if (phaseIds.length < 1) {
            addViolation(violations, 'BLOCK_PHASE_MISSING', `Block ohne Phase-Nodes: ${blockId}`);
            continue;
        }
        const gatePhases = phaseIds.filter((phaseId) => phaseId.startsWith(`${blockId}.`) && phaseId.endsWith('.99'));
        if (gatePhases.length !== 1) {
            addViolation(violations, 'BLOCK_GATE_PHASE_INVALID', `Block ${blockId} braucht genau eine .99-Phase (gefunden: ${gatePhases.length})`);
        }
    }
}

function validateNodeIdAndOrphans(graph, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const seenNodeIds = new Map();
    for (const node of nodes) {
        if (!seenNodeIds.has(node.id)) {
            seenNodeIds.set(node.id, [node.type]);
            continue;
        }
        const types = seenNodeIds.get(node.id);
        types.push(node.type);
        addViolation(violations, 'NODE_ID_DUPLICATE', `Doppelte node.id gefunden: ${node.id} (Typen: ${types.join(', ')})`);
    }

    const degreeMap = new Map(nodes.map((node) => [node.id, 0]));
    for (const edge of edges) {
        degreeMap.set(edge.from, (degreeMap.get(edge.from) || 0) + 1);
        degreeMap.set(edge.to, (degreeMap.get(edge.to) || 0) + 1);
    }

    for (const node of nodes) {
        if (node.type === 'block') continue;
        if ((degreeMap.get(node.id) || 0) === 0) {
            addViolation(violations, 'ORPHAN_NODE', `Orphan node ohne Kanten: ${node.type}:${node.id}`);
        }
    }
}

async function validateDependencyMergeConsistency(graph, violations) {
    const masterContent = await fs.readFile(path.join(ROOT, MASTER_PLAN_PATH), 'utf8');
    const masterRows = parseMasterRows(masterContent);
    const dependencyRows = parseDependencyTable(masterContent);
    const blockStatusById = new Map(
        (Array.isArray(graph.nodes) ? graph.nodes : [])
            .filter((node) => node.type === 'block')
            .map((node) => [node.id, String(node.status || 'unknown')])
    );

    const entries = await fs.readdir(path.join(ROOT, ACTIVE_PLANS_DIR), { withFileTypes: true });
    const expectedPairs = new Set();
    for (const row of masterRows) {
        for (const rawDep of row.dependsOn) {
            const dep = parseDependencyToken(rawDep);
            expectedPairs.add(`${row.id}::${dep.blockId}`);
        }
    }
    for (const entry of entries) {
        if (!entry.isFile() || !/^V\d+\.md$/i.test(entry.name)) continue;
        const relativePath = path.join(ACTIVE_PLANS_DIR, entry.name).replace(/\\/g, '/');
        const content = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
        const { data } = parseFrontmatter(content);
        const blockId = String(data.id || path.basename(entry.name, '.md')).trim();
        const depends = Array.isArray(data.depends_on) ? data.depends_on : [];
        for (const rawDep of depends) {
            const dep = parseDependencyToken(rawDep);
            expectedPairs.add(`${blockId}::${dep.blockId}`);
        }
    }

    const graphDependsPairs = new Set(
        (Array.isArray(graph.edges) ? graph.edges : [])
            .filter((edge) => edge.type === 'depends_on')
            .map((edge) => `${edge.from}::${edge.to}`)
    );

    for (const pair of expectedPairs) {
        if (!graphDependsPairs.has(pair)) {
            addViolation(violations, 'DEPENDS_EDGE_MISSING', `Erwartete depends_on-Kante fehlt im Graph: ${pair}`);
        }
    }

    for (const row of dependencyRows) {
        const ownerStatus = blockStatusById.get(row.blockId) || 'unknown';
        if (ownerStatus === 'done') {
            continue;
        }
        if (row.dependsOn.isCanonical !== true) {
            continue;
        }
        const pair = `${row.blockId}::${row.dependsOn.blockId}`;
        if (!expectedPairs.has(pair)) {
            addViolation(violations, 'DEPENDS_METADATA_ORPHAN', `Abhaengigkeitsmetadaten ohne Basis-Kante: ${pair}`);
        }
    }
}

async function runChecks() {
    const violations = [];

    const [existingGraph, generatedGraph, allowancesByBlock] = await Promise.all([
        readExistingGraph(),
        buildKnowledgeGraph(),
        readScopeOverlapAllowances(),
    ]);

    const generatedRaw = graphToString(generatedGraph);
    if (existingGraph.raw !== generatedRaw) {
        addViolation(violations, 'GRAPH_DIFF', 'knowledge-graph.json ist nicht byteidentisch zum Build-Output (run: npm run graph:build)');
    }

    validateNodeIdAndOrphans(existingGraph.parsed, violations);
    ensureDependsTargetsExist(existingGraph.parsed, violations);
    detectHardDependsCycles(existingGraph.parsed, violations);
    validateScopeEdgesAndFiles(existingGraph.parsed, violations);
    validateScopeCollisions(existingGraph.parsed, allowancesByBlock, violations);
    validateRequiredPhaseAndScopeData(existingGraph.parsed, violations);
    await validateDependencyMergeConsistency(existingGraph.parsed, violations);

    if (violations.length === 0) {
        process.stdout.write('[graph:check] passed\n');
        return 0;
    }

    process.stderr.write('[graph:check] failed\n');
    for (const violation of violations) {
        process.stderr.write(`- [${violation.code}] ${violation.message}\n`);
    }
    return 1;
}

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    const exitCode = await runChecks();
    process.exit(exitCode);
}

export { runChecks };
