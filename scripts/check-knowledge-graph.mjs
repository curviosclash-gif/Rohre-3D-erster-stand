#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    buildKnowledgeGraphArtifacts,
    parseBotTrainingDependencyTable,
    parseDependencyTable,
    parseDependencyToken,
    parseFrontmatter,
    parseMasterRows,
} from './build-knowledge-graph.mjs';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const MASTER_PLAN_PATH = 'docs/Umsetzungsplan.md';
const BOT_TRAINING_MASTER_PATH = 'docs/bot-training/Bot_Trainingsplan.md';
const ACTIVE_PLANS_DIR = 'docs/plaene/aktiv';
const REQUIRED_KNOWLEDGE_GRAPH_MAPPING_IDS = Object.freeze([
    'runtime-taxonomy',
    'desktop-critical-paths',
]);
const CRITICAL_DESKTOP_GRAPH_REQUIREMENTS = Object.freeze([
    {
        criticalPath: 'spawn',
        requiredNodes: [
            { id: 'event:spawn', type: 'event', mappingId: 'runtime-taxonomy' },
            { id: 'state:spawn-context', type: 'state', mappingId: 'runtime-taxonomy' },
            { id: 'runtime:entity-spawn-ops', type: 'runtime', mappingId: 'desktop-critical-paths' },
            { id: 'runtime:spawn-placement-system', type: 'runtime', mappingId: 'desktop-critical-paths' },
            { id: 'test:physics-core-spawn', type: 'test', mappingId: 'desktop-critical-paths' },
        ],
        requiredEdges: [
            { from: 'runtime:entity-spawn-ops', to: 'config:gameplay-config-contract', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:entity-spawn-ops', to: 'state:spawn-context', type: 'writes_state', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:entity-spawn-ops', to: 'event:spawn', type: 'emits', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:entity-spawn-ops', to: 'test:physics-core-spawn', type: 'validated_by', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:spawn-placement-system', to: 'state:spawn-context', type: 'reads_state', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:spawn-placement-system', to: 'test:physics-core-spawn', type: 'validated_by', mappingId: 'desktop-critical-paths' },
        ],
    },
    {
        criticalPath: 'combat-hit',
        requiredNodes: [
            { id: 'event:hunt-damage', type: 'event', mappingId: 'runtime-taxonomy' },
            { id: 'state:hunt-combat-lock-on', type: 'state', mappingId: 'runtime-taxonomy' },
            { id: 'config:entity-runtime-config', type: 'config', mappingId: 'runtime-taxonomy' },
            { id: 'config:gameplay-config-contract', type: 'config', mappingId: 'runtime-taxonomy' },
            { id: 'runtime:hunt-combat-system', type: 'runtime', mappingId: 'desktop-critical-paths' },
            { id: 'runtime:projectile-hit-resolver', type: 'runtime', mappingId: 'desktop-critical-paths' },
            { id: 'runtime:mg-hit-resolver', type: 'runtime', mappingId: 'desktop-critical-paths' },
            { id: 'test:physics-hunt-combat', type: 'test', mappingId: 'desktop-critical-paths' },
        ],
        requiredEdges: [
            { from: 'runtime:hunt-combat-system', to: 'config:entity-runtime-config', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:hunt-combat-system', to: 'state:hunt-combat-lock-on', type: 'writes_state', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:hunt-combat-system', to: 'test:physics-hunt-combat', type: 'validated_by', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:projectile-hit-resolver', to: 'config:entity-runtime-config', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:projectile-hit-resolver', to: 'event:hunt-damage', type: 'emits', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:projectile-hit-resolver', to: 'test:physics-hunt-combat', type: 'validated_by', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:mg-hit-resolver', to: 'config:gameplay-config-contract', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:mg-hit-resolver', to: 'event:hunt-damage', type: 'emits', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:mg-hit-resolver', to: 'test:physics-hunt-combat', type: 'validated_by', mappingId: 'desktop-critical-paths' },
        ],
    },
    {
        criticalPath: 'round-end',
        requiredNodes: [
            { id: 'event:round-end', type: 'event', mappingId: 'runtime-taxonomy' },
            { id: 'state:round-outcome', type: 'state', mappingId: 'runtime-taxonomy' },
            { id: 'state:round-end-overlay', type: 'state', mappingId: 'runtime-taxonomy' },
            { id: 'runtime:round-outcome-system', type: 'runtime', mappingId: 'desktop-critical-paths' },
            { id: 'runtime:round-end-coordinator', type: 'runtime', mappingId: 'desktop-critical-paths' },
            { id: 'test:runtime-regressions-round-end', type: 'test', mappingId: 'desktop-critical-paths' },
        ],
        requiredEdges: [
            { from: 'runtime:round-outcome-system', to: 'state:round-outcome', type: 'writes_state', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:round-outcome-system', to: 'event:round-end', type: 'emits', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:round-outcome-system', to: 'test:runtime-regressions-round-end', type: 'validated_by', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:round-end-coordinator', to: 'event:round-end', type: 'consumes', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:round-end-coordinator', to: 'state:round-end-overlay', type: 'writes_state', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:round-end-coordinator', to: 'test:runtime-regressions-round-end', type: 'validated_by', mappingId: 'desktop-critical-paths' },
        ],
    },
    {
        criticalPath: 'settings',
        requiredNodes: [
            { id: 'state:settings-snapshot', type: 'state', mappingId: 'runtime-taxonomy' },
            { id: 'state:runtime-config-snapshot', type: 'state', mappingId: 'runtime-taxonomy' },
            { id: 'config:runtime-config-builder', type: 'config', mappingId: 'runtime-taxonomy' },
            { id: 'config:base-game-config', type: 'config', mappingId: 'runtime-taxonomy' },
            { id: 'config:settings-runtime-contract', type: 'config', mappingId: 'runtime-taxonomy' },
            { id: 'config:runtime-session-contract', type: 'config', mappingId: 'runtime-taxonomy' },
            { id: 'config:settings-runtime-limits', type: 'config', mappingId: 'runtime-taxonomy' },
            {
                id: 'runtime:settings-manager',
                type: 'runtime',
                mappingId: 'desktop-critical-paths',
                attributes: {
                    requiredReference: true,
                },
            },
            { id: 'test:runtime-settings-live-apply', type: 'test', mappingId: 'desktop-critical-paths' },
            { id: 'test:settings-manager-contract', type: 'test', mappingId: 'desktop-critical-paths' },
        ],
        requiredEdges: [
            { from: 'runtime:settings-manager', to: 'config:runtime-config-builder', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:settings-manager', to: 'state:settings-snapshot', type: 'writes_state', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:settings-manager', to: 'state:runtime-config-snapshot', type: 'writes_state', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:settings-manager', to: 'test:runtime-settings-live-apply', type: 'validated_by', mappingId: 'desktop-critical-paths' },
            { from: 'runtime:settings-manager', to: 'test:settings-manager-contract', type: 'validated_by', mappingId: 'desktop-critical-paths' },
            { from: 'config:runtime-config-builder', to: 'config:base-game-config', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'config:runtime-config-builder', to: 'config:settings-runtime-contract', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'config:runtime-config-builder', to: 'config:runtime-session-contract', type: 'reads_config', mappingId: 'desktop-critical-paths' },
            { from: 'config:runtime-config-builder', to: 'config:settings-runtime-limits', type: 'reads_config', mappingId: 'desktop-critical-paths' },
        ],
    },
]);

function artifactToString(payload) {
    return `${JSON.stringify(payload, null, 2)}\n`;
}

function addViolation(violations, code, message) {
    violations.push({ code, message });
}

function nodeHasMappingId(node, mappingId) {
    return String(node?.attributes?.mappingId || '').trim() === mappingId;
}

function edgeHasMappingId(edge, mappingId) {
    return String(edge?.attributes?.mappingId || '').trim() === mappingId;
}

function getCriticalPaths(node) {
    const criticalPaths = Array.isArray(node?.attributes?.criticalPaths)
        ? node.attributes.criticalPaths
        : [node?.attributes?.criticalPath].filter(Boolean);
    return criticalPaths
        .map((entry) => String(entry || '').trim())
        .filter(Boolean);
}

async function readExistingArtifact(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return {
        raw,
        parsed: JSON.parse(raw),
    };
}

function hasSource(node, sourceTag) {
    return Array.isArray(node?.attributes?.source) && node.attributes.source.includes(sourceTag);
}

function isScopeCollisionManagedBlock(node) {
    return hasSource(node, 'master-index') || hasSource(node, 'block-plan');
}

function isPhaseScopedBlock(node) {
    return hasSource(node, 'block-plan') || hasSource(node, 'bot-training-plan');
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

function ensureAllEdgeEndpointsExist(graph, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const mappingEdgeTypes = new Set([
        'implements',
        'emits',
        'consumes',
        'reads_config',
        'reads_state',
        'writes_state',
        'validated_by',
    ]);

    for (const edge of edges) {
        if (!mappingEdgeTypes.has(edge.type)) continue;
        if (!nodeById.has(edge.from)) {
            addViolation(violations, 'EDGE_FROM_MISSING', `edge source fehlt: ${edge.type} ${edge.from} -> ${edge.to}`);
        }
        if (!nodeById.has(edge.to)) {
            addViolation(violations, 'EDGE_TO_MISSING', `edge target fehlt: ${edge.type} ${edge.from} -> ${edge.to}`);
        }
    }
}

function validateRuntimeMappingIntegrity(graph, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const fileNodeByPath = new Map(nodes.filter((node) => node.type === 'file').map((node) => [node.id, node]));
    const mappingNodes = nodes.filter((node) => String(node?.attributes?.mappingId || '').trim());
    const runtimeNodes = mappingNodes.filter((node) => node.type === 'runtime');
    const mappingEdges = edges.filter((edge) => String(edge?.attributes?.mappingId || '').trim());

    for (const edge of mappingEdges) {
        if (!nodeById.has(edge.from)) {
            addViolation(violations, 'KG_UNKNOWN_REFERENCE', `Mapping-Kante referenziert unbekannte Quelle: ${edge.type} ${edge.from} -> ${edge.to}`);
        }
        if (!nodeById.has(edge.to)) {
            addViolation(violations, 'KG_UNKNOWN_REFERENCE', `Mapping-Kante referenziert unbekanntes Ziel: ${edge.type} ${edge.from} -> ${edge.to}`);
        }
    }

    for (const node of mappingNodes) {
        const filePath = String(node?.attributes?.file || '').trim();
        if (!filePath) continue;
        const fileNode = fileNodeByPath.get(filePath) || null;
        if (!fileNode) {
            addViolation(violations, 'KG_UNKNOWN_FILE_REFERENCE', `Mapping-Knoten ${node.id} referenziert unbekannte Datei: ${filePath}`);
            continue;
        }
        if (fileNode.attributes?.exists !== true) {
            addViolation(violations, 'KG_MAPPING_FILE_MISSING', `Mapping-Knoten ${node.id} referenziert fehlende Datei: ${filePath}`);
        }
    }

    for (const runtimeNode of runtimeNodes) {
        const runtimeEdges = mappingEdges.filter((edge) => edge.type !== 'implements' && (edge.from === runtimeNode.id || edge.to === runtimeNode.id));
        if (runtimeEdges.length === 0) {
            addViolation(violations, 'KG_RUNTIME_ORPHAN', `Runtime-Knoten ohne Runtime-/State-/Config-/Event-/Test-Relation: ${runtimeNode.id}`);
        }

        const criticalPaths = getCriticalPaths(runtimeNode);
        if (criticalPaths.length === 0) continue;

        const validationEdges = mappingEdges.filter((edge) => edge.from === runtimeNode.id && edge.type === 'validated_by');
        const hasTestValidation = validationEdges.some((edge) => nodeById.get(edge.to)?.type === 'test');
        if (!hasTestValidation) {
            addViolation(violations, 'KG_RUNTIME_VALIDATION_MISSING', `Kritischer Runtime-Knoten ohne validated_by-Testkante: ${runtimeNode.id} (${criticalPaths.join(', ')})`);
        }
    }
}

function validateCriticalDesktopMappings(graph, violations) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const edgeKeySet = new Set(
        edges.map((edge) => [
            String(edge.from || '').trim(),
            String(edge.to || '').trim(),
            String(edge.type || '').trim(),
            String(edge.attributes?.mappingId || '').trim(),
        ].join('::'))
    );

    for (const mappingId of REQUIRED_KNOWLEDGE_GRAPH_MAPPING_IDS) {
        const hasAnyNode = nodes.some((node) => nodeHasMappingId(node, mappingId));
        const hasAnyEdge = edges.some((edge) => edgeHasMappingId(edge, mappingId));
        if (!hasAnyNode && !hasAnyEdge) {
            addViolation(violations, 'KG_MAPPING_MISSING', `Pflicht-Mapping ${mappingId} fehlt komplett im Graph`);
        }
    }

    for (const requirement of CRITICAL_DESKTOP_GRAPH_REQUIREMENTS) {
        for (const nodeRequirement of requirement.requiredNodes) {
            const node = nodeById.get(nodeRequirement.id) || null;
            if (!node) {
                addViolation(
                    violations,
                    'KG_CRITICAL_NODE_MISSING',
                    `Critical-Path ${requirement.criticalPath} fehlt Pflichtknoten ${nodeRequirement.id}`
                );
                continue;
            }
            if (node.type !== nodeRequirement.type) {
                addViolation(
                    violations,
                    'KG_CRITICAL_NODE_TYPE',
                    `Critical-Path ${requirement.criticalPath} erwartet ${nodeRequirement.id} als ${nodeRequirement.type}, gefunden ${node.type}`
                );
            }
            if (!nodeHasMappingId(node, nodeRequirement.mappingId)) {
                addViolation(
                    violations,
                    'KG_CRITICAL_NODE_MAPPING',
                    `Critical-Path ${requirement.criticalPath} erwartet ${nodeRequirement.id} aus Mapping ${nodeRequirement.mappingId}`
                );
            }

            const requiredAttributes = nodeRequirement.attributes || {};
            for (const [attributeKey, attributeValue] of Object.entries(requiredAttributes)) {
                if (node.attributes?.[attributeKey] !== attributeValue) {
                    addViolation(
                        violations,
                        'KG_CRITICAL_NODE_ATTRIBUTE',
                        `Critical-Path ${requirement.criticalPath} erwartet ${nodeRequirement.id}.${attributeKey}=${attributeValue}`
                    );
                }
            }
        }

        for (const edgeRequirement of requirement.requiredEdges) {
            const edgeKey = [
                edgeRequirement.from,
                edgeRequirement.to,
                edgeRequirement.type,
                edgeRequirement.mappingId,
            ].join('::');
            if (!edgeKeySet.has(edgeKey)) {
                addViolation(
                    violations,
                    'KG_CRITICAL_EDGE_MISSING',
                    `Critical-Path ${requirement.criticalPath} fehlt Pflichtkante ${edgeRequirement.from} -> ${edgeRequirement.to} (${edgeRequirement.type})`
                );
            }
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
                cyclePath = stack.slice(cycleStart).concat(nextNode);
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
        .filter((node) => node.type === 'block' && node.status !== 'done' && isScopeCollisionManagedBlock(node))
        .map((node) => node.id)
        .sort((left, right) => left.localeCompare(right));
    const openBlockSet = new Set(openBlocks);

    const scopeByBlock = new Map();
    for (const edge of edges) {
        if (edge.type !== 'scope') continue;
        if (!openBlockSet.has(edge.from)) continue;
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
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    const blockNodes = nodes.filter((node) => node.type === 'block');
    const scopeRelevantBlockIds = new Set(
        blockNodes
            .filter((node) => hasSource(node, 'master-index') || isPhaseScopedBlock(node))
            .map((node) => node.id)
    );
    const phaseRequiredBlockIds = new Set(
        blockNodes
            .filter((node) => isPhaseScopedBlock(node))
            .map((node) => node.id)
    );

    const scopeCountByBlock = new Map();
    const phaseNodesByBlock = new Map();
    for (const edge of edges) {
        if (edge.type === 'scope') {
            scopeCountByBlock.set(edge.from, (scopeCountByBlock.get(edge.from) || 0) + 1);
        }
        if (edge.type === 'contains_phase') {
            const phaseNode = nodeById.get(edge.to) || null;
            if (!phaseNodesByBlock.has(edge.from)) phaseNodesByBlock.set(edge.from, []);
            if (phaseNode) {
                phaseNodesByBlock.get(edge.from).push(phaseNode);
            }
        }
    }

    for (const block of blockNodes) {
        if (!scopeRelevantBlockIds.has(block.id)) continue;
        if (block.status !== 'done' && (scopeCountByBlock.get(block.id) || 0) < 1) {
            addViolation(violations, 'BLOCK_SCOPE_MISSING', `Nicht-abgeschlossener Block ohne scope-Edge: ${block.id}`);
        }
    }

    for (const blockId of phaseRequiredBlockIds) {
        const phaseNodes = phaseNodesByBlock.get(blockId) || [];
        if (phaseNodes.length < 1) {
            addViolation(violations, 'BLOCK_PHASE_MISSING', `Block ohne Phase-Nodes: ${blockId}`);
            continue;
        }
        const gatePhases = phaseNodes.filter((phaseNode) => String(phaseNode.attributes?.phaseCode || '').endsWith('.99'));
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

function validateCoverageArtifact(coverage, graph, violations) {
    const files = Array.isArray(coverage.files) ? coverage.files : [];
    const overlayBlocks = Array.isArray(coverage.overlayBlocks) ? coverage.overlayBlocks : [];
    const summary = coverage.summary || {};
    const overlayIds = new Set(overlayBlocks.map((entry) => entry.id));
    const seenPaths = new Set();
    const rawCoveredCount = files.filter((entry) => entry.covered === true).length;
    const activeFiles = files.filter((entry) => entry.excludedFromCoverage !== true);
    const adjustedCoveredCount = activeFiles.filter((entry) => entry.covered === true).length;

    if (coverage.graph_contract !== graph.contract) {
        addViolation(violations, 'COVERAGE_GRAPH_CONTRACT_MISMATCH', `coverage.graph_contract=${coverage.graph_contract} passt nicht zu graph.contract=${graph.contract}`);
    }
    if (summary.trackedFileCount !== files.length) {
        addViolation(violations, 'COVERAGE_TRACKED_COUNT_MISMATCH', `summary.trackedFileCount=${summary.trackedFileCount} passt nicht zu files.length=${files.length}`);
    }
    if (summary.rawCoveredFileCount !== rawCoveredCount) {
        addViolation(violations, 'COVERAGE_RAW_COUNT_MISMATCH', `summary.rawCoveredFileCount=${summary.rawCoveredFileCount} passt nicht zur Dateiaggregation=${rawCoveredCount}`);
    }
    if (summary.adjustedCoveredFileCount !== adjustedCoveredCount) {
        addViolation(violations, 'COVERAGE_ADJUSTED_COUNT_MISMATCH', `summary.adjustedCoveredFileCount=${summary.adjustedCoveredFileCount} passt nicht zur Dateiaggregation=${adjustedCoveredCount}`);
    }
    if (summary.adjustedTrackedFileCount !== activeFiles.length) {
        addViolation(violations, 'COVERAGE_ADJUSTED_TRACKED_COUNT_MISMATCH', `summary.adjustedTrackedFileCount=${summary.adjustedTrackedFileCount} passt nicht zur Dateiaggregation=${activeFiles.length}`);
    }

    for (const entry of files) {
        const normalizedPath = String(entry.path || '').trim();
        if (!normalizedPath) {
            addViolation(violations, 'COVERAGE_PATH_EMPTY', 'Coverage-Datei mit leerem Pfad gefunden');
            continue;
        }
        if (seenPaths.has(normalizedPath)) {
            addViolation(violations, 'COVERAGE_PATH_DUPLICATE', `Doppelte Coverage-Datei gefunden: ${normalizedPath}`);
        }
        seenPaths.add(normalizedPath);

        const derivedCovered = entry.coveredInCore === true || entry.coveredByOverlay === true;
        if (entry.covered !== derivedCovered) {
            addViolation(violations, 'COVERAGE_FLAG_INCONSISTENT', `covered-Flag inkonsistent fuer ${normalizedPath}`);
        }

        for (const overlay of entry.overlays || []) {
            if (!overlayIds.has(overlay.blockId)) {
                addViolation(violations, 'COVERAGE_OVERLAY_MISSING', `Overlay-Referenz ${overlay.blockId} fuer ${normalizedPath} fehlt in overlayBlocks`);
            }
        }
    }
}

async function validateDependencyMergeConsistency(graph, violations) {
    const masterContent = await fs.readFile(path.join(ROOT, MASTER_PLAN_PATH), 'utf8');
    const masterRows = parseMasterRows(masterContent);
    const dependencyRows = parseDependencyTable(masterContent);
    const btDependencyRows = (await fs.access(path.join(ROOT, BOT_TRAINING_MASTER_PATH)).then(() => true).catch(() => false))
        ? parseBotTrainingDependencyTable(await fs.readFile(path.join(ROOT, BOT_TRAINING_MASTER_PATH), 'utf8'))
        : [];
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
    for (const row of btDependencyRows) {
        expectedPairs.add(`${row.blockId}::${row.dependsOn.blockId}`);
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

    for (const row of [...dependencyRows, ...btDependencyRows]) {
        const ownerStatus = blockStatusById.get(row.blockId) || 'unknown';
        if (ownerStatus === 'done') continue;
        if (row.dependsOn.isCanonical !== true) continue;
        const pair = `${row.blockId}::${row.dependsOn.blockId}`;
        if (!expectedPairs.has(pair)) {
            addViolation(violations, 'DEPENDS_METADATA_ORPHAN', `Abhaengigkeitsmetadaten ohne Basis-Kante: ${pair}`);
        }
    }
}

async function runChecks() {
    const violations = [];

    const [existingGraph, existingCoverage, generatedArtifacts, allowancesByBlock] = await Promise.all([
        readExistingArtifact(GRAPH_PATH),
        readExistingArtifact(COVERAGE_PATH),
        buildKnowledgeGraphArtifacts(),
        readScopeOverlapAllowances(),
    ]);

    const generatedGraphRaw = artifactToString(generatedArtifacts.graph);
    const generatedCoverageRaw = artifactToString(generatedArtifacts.coverage);
    if (existingGraph.raw !== generatedGraphRaw) {
        addViolation(violations, 'GRAPH_DIFF', 'knowledge-graph.json ist nicht byteidentisch zum Build-Output (run: npm run graph:build)');
    }
    if (existingCoverage.raw !== generatedCoverageRaw) {
        addViolation(violations, 'COVERAGE_DIFF', 'knowledge-graph.coverage.json ist nicht byteidentisch zum Build-Output (run: npm run graph:build)');
    }

    validateNodeIdAndOrphans(existingGraph.parsed, violations);
    ensureAllEdgeEndpointsExist(existingGraph.parsed, violations);
    validateRuntimeMappingIntegrity(existingGraph.parsed, violations);
    validateCriticalDesktopMappings(existingGraph.parsed, violations);
    ensureDependsTargetsExist(existingGraph.parsed, violations);
    detectHardDependsCycles(existingGraph.parsed, violations);
    validateScopeEdgesAndFiles(existingGraph.parsed, violations);
    validateScopeCollisions(existingGraph.parsed, allowancesByBlock, violations);
    validateRequiredPhaseAndScopeData(existingGraph.parsed, violations);
    validateCoverageArtifact(existingCoverage.parsed, existingGraph.parsed, violations);
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
export {
    CRITICAL_DESKTOP_GRAPH_REQUIREMENTS,
    validateCriticalDesktopMappings,
    validateRuntimeMappingIntegrity,
};
