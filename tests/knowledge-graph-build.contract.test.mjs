import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildKnowledgeGraph,
    buildCoverageArtifact,
    classifyCoveragePath,
    normalizeKnowledgeGraphMappingContract,
    parseAuditFindingsMetadata,
    parseAuditMasterRows,
    parseBotTrainingBlocks,
    parseBotTrainingDependencyTable,
    parseDependencyTable,
    parseDependencyToken,
    parseFrontmatter,
    parseMasterRows,
    resolveScopeEntries,
} from '../scripts/build-knowledge-graph.mjs';
import {
    CRITICAL_DESKTOP_GRAPH_REQUIREMENTS,
    validateCriticalDesktopMappings,
    validateCoverageArtifact,
    validateGraphContradictions,
    validatePredicateConstraints,
    validateRuntimeMappingIntegrity,
    validateRuntimeTelemetryReplay,
} from '../scripts/check-knowledge-graph.mjs';
import {
    queryCriticalPathHealth,
    queryEventFlow,
    queryImpactDiff,
    queryImpactForFile,
    queryUntestedSystems,
} from '../scripts/query-knowledge-graph.mjs';
import {
    resolveKnowledgeGraphMigration,
    validateKnowledgeGraphMigrationContract,
} from '../scripts/migrate-knowledge-graph.mjs';

test('parseFrontmatter tolerates missing status and variant field order', () => {
    const content = [
        '---',
        'id: V999',
        'title: Fixture Block',
        'depends_on:',
        '  - V74.99',
        '  - V72',
        'scope_files:',
        '  - src/core/main.js',
        '  - scripts/build-knowledge-graph.mjs',
        'updated_at: 2026-04-27',
        '---',
        '',
        '# Body',
    ].join('\n');

    const result = parseFrontmatter(content);

    assert.equal(result.hasFrontmatter, true);
    assert.equal(result.data.id, 'V999');
    assert.deepEqual(result.data.depends_on, ['V74.99', 'V72']);
    assert.deepEqual(result.data.scope_files, ['src/core/main.js', 'scripts/build-knowledge-graph.mjs']);
});

test('parseDependencyToken supports Vxx, BTxx and phase formats', () => {
    assert.deepEqual(parseDependencyToken('V74'), {
        raw: 'V74',
        blockId: 'V74',
        dependsPhase: null,
        isCanonical: true,
    });
    assert.deepEqual(parseDependencyToken('V74.99'), {
        raw: 'V74.99',
        blockId: 'V74',
        dependsPhase: '74.99',
        isCanonical: true,
    });
    assert.deepEqual(parseDependencyToken('V43-Strukturvertrag'), {
        raw: 'V43-Strukturvertrag',
        blockId: 'V43',
        dependsPhase: null,
        isCanonical: false,
    });
    assert.deepEqual(parseDependencyToken('BT93J'), {
        raw: 'BT93J',
        blockId: 'BT93J',
        dependsPhase: null,
        isCanonical: true,
    });
    assert.deepEqual(parseDependencyToken('BT93J.99'), {
        raw: 'BT93J.99',
        blockId: 'BT93J',
        dependsPhase: '93J.99',
        isCanonical: true,
    });
});

test('parseMasterRows reads active block rows with mixed spacing', () => {
    const master = [
        '# Dummy',
        '## Aktive Bloecke',
        '| id | titel | status | prio | owner | depends_on | current_phase | plan_file |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '| V81 | Dev Console | planned | P3 | frei | V74.99 , V72.99 | 81.99 | `docs/plaene/aktiv/V81.md` |',
        '',
        '## Abhaengigkeiten',
    ].join('\n');

    const rows = parseMasterRows(master);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'V81');
    assert.deepEqual(rows[0].dependsOn, ['V74.99', 'V72.99']);
    assert.equal(rows[0].planFile, 'docs/plaene/aktiv/V81.md');
});

test('parseDependencyTable extracts hard/fulfilled metadata', () => {
    const master = [
        '# Dummy',
        '## Abhaengigkeiten',
        '| Block | Depends-On | Typ | Erfuellt | Hinweis |',
        '| --- | --- | --- | --- | --- |',
        '| V81 | V77.99 | soft | ja | Surface-Policy vorhanden |',
        '| V95 | V81.99 | hard | nein | wartet auf Gate |',
        '',
        '## Lock-Status',
    ].join('\n');

    const rows = parseDependencyTable(master);

    assert.equal(rows.length, 2);
    assert.equal(rows[0].blockId, 'V81');
    assert.equal(rows[0].dependsOn.blockId, 'V77');
    assert.equal(rows[0].dependsOn.dependsPhase, '77.99');
    assert.equal(rows[0].hard, false);
    assert.equal(rows[0].fulfilled, true);
    assert.equal(rows[1].hard, true);
    assert.equal(rows[1].fulfilled, false);
});

test('resolveScopeEntries expands globs, prefixes and planned files', () => {
    const trackedFiles = [
        'python/train.py',
        'scripts/training-loop.mjs',
        'src/network/LANSessionAdapter.js',
        'src/network/OnlineSessionAdapter.js',
    ];
    const trackedFileSet = new Set(trackedFiles);

    const result = resolveScopeEntries([
        'src/network/**',
        'python/',
        'scripts/training-loop.mjs',
        'docs/generated/future-artifact.json',
    ], trackedFiles, trackedFileSet);

    assert.deepEqual(result.scopeFiles, [
        'docs/generated/future-artifact.json',
        'python/train.py',
        'scripts/training-loop.mjs',
        'src/network/LANSessionAdapter.js',
        'src/network/OnlineSessionAdapter.js',
    ]);
    assert.equal(result.scopeResolution.concreteCount, 4);
    assert.equal(result.scopeResolution.plannedCount, 1);
});

test('parseBotTrainingDependencyTable extracts BT rows with mixed V and BT dependencies', () => {
    const content = [
        '# Dummy',
        '## Abhaengigkeiten (Hard/Soft)',
        '| Block | Depends-On | Typ | Erfuellt | Hinweis |',
        '| --- | --- | --- | --- | --- |',
        '| BT93J | BT93I.99, V104.99 | hard | nein | wartet auf Gate |',
        '| BT94A | BT93J.99 | soft | ja | Handover fertig |',
    ].join('\n');

    const rows = parseBotTrainingDependencyTable(content);

    assert.equal(rows.length, 3);
    assert.deepEqual(rows[0], {
        blockId: 'BT93J',
        dependsOn: {
            raw: 'BT93I.99',
            blockId: 'BT93I',
            dependsPhase: '93I.99',
            isCanonical: true,
        },
        hard: true,
        fulfilled: false,
        hint: 'wartet auf Gate',
    });
    assert.equal(rows[1].dependsOn.blockId, 'V104');
    assert.equal(rows[2].blockId, 'BT94A');
    assert.equal(rows[2].fulfilled, true);
});

test('parseBotTrainingBlocks builds structured BT block metadata', () => {
    const content = [
        '# Dummy',
        '## Abhaengigkeiten (Hard/Soft)',
        '| Block | Depends-On | Typ | Erfuellt | Hinweis |',
        '| --- | --- | --- | --- | --- |',
        '| BT93J | BT93I.99 | hard | nein | wartet |',
        '',
        '## Block BT93J: Root-Cause-Blocker-Repair',
        'Plan-Datei: `docs/plaene/aktiv/V104.md`',
        'Quelle:',
        '- `python/train.py`',
        '- `scripts/training-loop.mjs`',
        'Scope:',
        '- `src/network/OnlineSessionAdapter.js`',
        '### Definition of Done (DoD)',
        '- [ ] DoD.1 `tests/training-gate.test.mjs` ist gruen.',
        '### 93J.1 Diagnose',
        '- [x] 93J.1.1 Root cause in `python/train.py` dokumentieren',
        '### 93J.99 Abschluss-Gate',
        '- [ ] 93J.99.1 `docs/generated/knowledge-graph.coverage.json` aktualisieren',
    ].join('\n');

    const blocks = parseBotTrainingBlocks(content);

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].id, 'BT93J');
    assert.equal(blocks[0].referencePlanFile, 'docs/plaene/aktiv/V104.md');
    assert.equal(blocks[0].currentPhase, '93J.99');
    assert.equal(blocks[0].dependsOn.length, 1);
    assert.equal(blocks[0].dependsOn[0].blockId, 'BT93I');
    assert.equal(blocks[0].phases.at(-1).code, '93J.99');
    assert.equal(blocks[0].subphases.length, 2);
    assert.deepEqual(blocks[0].scopeFiles, [
        'docs/bot-training/Bot_Trainingsplan.md',
        'docs/generated/knowledge-graph.coverage.json',
        'docs/plaene/aktiv/V104.md',
        'python/train.py',
        'scripts/training-loop.mjs',
        'src/network/OnlineSessionAdapter.js',
        'tests/training-gate.test.mjs',
    ]);
});

test('classifyCoveragePath marks excluded and active buckets', () => {
    assert.deepEqual(classifyCoveragePath('assets/ui/logo.png'), {
        classification: 'asset',
        excludedFromCoverage: true,
        excludeReason: 'Static asset inventory is tracked separately from code-surface coverage.',
    });
    assert.deepEqual(classifyCoveragePath('src/core/AppInitializer.js'), {
        classification: 'product-code',
        excludedFromCoverage: false,
        excludeReason: null,
    });
});

test('buildCoverageArtifact gates newly uncovered active files against baseline', () => {
    const graph = {
        contract: 'knowledge-graph.v1',
        nodes: [
            {
                id: 'src/core/CoveredRuntime.js',
                type: 'file',
                attributes: {
                    exists: true,
                    source: ['fixture'],
                },
            },
        ],
        edges: [],
    };
    const baselineCoverage = {
        files: [
            {
                path: 'src/core/ExistingGap.js',
                covered: false,
                excludedFromCoverage: false,
            },
            {
                path: 'src/core/NewGap.js',
                covered: true,
                excludedFromCoverage: false,
            },
        ],
    };

    const coverage = buildCoverageArtifact(
        graph,
        [
            'assets/ui/logo.png',
            'src/core/CoveredRuntime.js',
            'src/core/ExistingGap.js',
            'src/core/NewGap.js',
        ],
        null,
        baselineCoverage
    );
    const gateRule = coverage.gate.rules.find((rule) => rule.id === 'no-new-active-uncovered-files');
    const violations = [];

    validateCoverageArtifact(coverage, graph, violations);

    assert.equal(coverage.gate.status, 'fail');
    assert.equal(gateRule.violationCount, 1);
    assert.equal(gateRule.files[0].path, 'src/core/NewGap.js');
    assert.equal(gateRule.files[0].baselineState, 'covered');
    assert.ok(violations.some((violation) => violation.code === 'COVERAGE_GATE_FAILED'));
});

test('normalizeKnowledgeGraphMappingContract validates mapping payloads and normalizes repo paths', () => {
    const mapping = normalizeKnowledgeGraphMappingContract({
        contract: 'knowledge-graph.mapping.v1',
        schema_version: 1,
        mapping_id: 'desktop-critical-paths',
        description: 'fixture',
        nodes: [
            {
                id: 'runtime:settings-manager',
                type: 'runtime',
                title: 'SettingsManager',
                file: 'src\\core\\SettingsManager.js',
                attributes: {
                    criticalPath: 'settings',
                },
            },
            {
                id: 'test:settings-manager-contract',
                type: 'test',
                file: './tests/settings-manager.contract.test.mjs',
            },
            {
                id: 'config:runtime-config-builder',
                type: 'config',
                file: './src/core/RuntimeConfig.js',
            },
        ],
        edges: [
            {
                from: 'runtime:settings-manager',
                to: 'test:settings-manager-contract',
                type: 'validated_by',
            },
            {
                from: 'runtime:settings-manager',
                to: 'config:runtime-config-builder',
                type: 'reads_config',
            },
        ],
    });

    assert.equal(mapping.mapping_id, 'desktop-critical-paths');
    const nodeById = new Map(mapping.nodes.map((node) => [node.id, node]));
    assert.equal(nodeById.get('runtime:settings-manager').file, 'src/core/SettingsManager.js');
    assert.equal(nodeById.get('test:settings-manager-contract').file, 'tests/settings-manager.contract.test.mjs');
    assert.equal(nodeById.get('test:settings-manager-contract').status, 'unknown');
    assert.equal(nodeById.get('config:runtime-config-builder').file, 'src/core/RuntimeConfig.js');
    assert.deepEqual(mapping.edges.map((edge) => edge.type), [
        'reads_config',
        'validated_by',
    ]);
});

test('normalizeKnowledgeGraphMappingContract rejects duplicate runtime relations', () => {
    assert.throws(() => normalizeKnowledgeGraphMappingContract({
        contract: 'knowledge-graph.mapping.v1',
        schema_version: 1,
        mapping_id: 'duplicate-fixture',
        nodes: [
            {
                id: 'runtime:fixture',
                type: 'runtime',
            },
            {
                id: 'runtime:fixture',
                type: 'runtime',
            },
        ],
        edges: [],
    }), /duplicate node runtime:fixture/);

    assert.throws(() => normalizeKnowledgeGraphMappingContract({
        contract: 'knowledge-graph.mapping.v1',
        schema_version: 1,
        mapping_id: 'duplicate-fixture',
        nodes: [
            {
                id: 'runtime:fixture',
                type: 'runtime',
            },
            {
                id: 'state:fixture',
                type: 'state',
            },
        ],
        edges: [
            {
                from: 'runtime:fixture',
                to: 'state:fixture',
                type: 'writes_state',
            },
            {
                from: 'runtime:fixture',
                to: 'state:fixture',
                type: 'writes_state',
            },
        ],
    }), /duplicate edge runtime:fixture -> state:fixture \(writes_state\)/);
});

test('buildKnowledgeGraph keeps required desktop critical-path mappings intact', async () => {
    const graph = await buildKnowledgeGraph();
    const violations = [];
    validateCriticalDesktopMappings(graph, violations);
    validateRuntimeMappingIntegrity(graph, violations);

    assert.deepEqual(violations, []);

    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const requirement of CRITICAL_DESKTOP_GRAPH_REQUIREMENTS) {
        for (const nodeRequirement of requirement.requiredNodes) {
            const node = nodeById.get(nodeRequirement.id);
            assert.ok(node, `${requirement.criticalPath} node ${nodeRequirement.id} missing`);
            const criticalPaths = Array.isArray(node.attributes?.criticalPaths)
                ? node.attributes.criticalPaths
                : [node.attributes?.criticalPath].filter(Boolean);
            assert.ok(
                criticalPaths.includes(requirement.criticalPath),
                `${nodeRequirement.id} should stay tagged with ${requirement.criticalPath}`
            );
        }
    }

    const relationLayerByEdge = new Map(
        graph.edges
            .filter((edge) => edge.attributes?.mappingId === 'desktop-critical-paths')
            .map((edge) => [`${edge.from}::${edge.to}::${edge.type}`, edge.attributes?.relationLayer])
    );
    const spawnNode = nodeById.get('runtime:entity-spawn-ops');
    assert.equal(spawnNode.attributes.provenance.file, 'data/contracts/knowledge-graph/desktop-critical-paths.v1.json');
    assert.equal(typeof spawnNode.attributes.provenance.line, 'number');
    assert.match(spawnNode.attributes.provenance.commit, /^[0-9a-f]{40}$/);

    const spawnEdge = graph.edges.find((edge) => (
        edge.from === 'runtime:entity-spawn-ops'
        && edge.to === 'state:spawn-context'
        && edge.type === 'writes_state'
    ));
    assert.equal(spawnEdge.attributes.provenance.file, 'data/contracts/knowledge-graph/desktop-critical-paths.v1.json');
    assert.equal(typeof spawnEdge.attributes.provenance.line, 'number');
    assert.match(spawnEdge.attributes.provenance.commit, /^[0-9a-f]{40}$/);

    assert.equal(
        relationLayerByEdge.get('runtime:entity-spawn-ops::state:spawn-context::writes_state'),
        'state'
    );
    assert.equal(
        relationLayerByEdge.get('runtime:entity-spawn-ops::test:physics-core-spawn::validated_by'),
        'test'
    );
    assert.equal(
        relationLayerByEdge.get('runtime:entity-spawn-ops::event:spawn::emits'),
        'event'
    );
});

test('predicate constraints guard mapping domain, range and relation layer', () => {
    const constraints = {
        contract: 'knowledge-graph.predicate-constraints.v1',
        schema_version: 1,
        relations: [
            {
                type: 'validated_by',
                domain: ['runtime'],
                range: ['test'],
                layer: 'test',
            },
            {
                type: 'writes_state',
                domain: ['runtime'],
                range: ['state'],
                layer: 'state',
            },
        ],
    };
    const graph = {
        nodes: [
            { id: 'runtime:fixture', type: 'runtime', attributes: { mappingId: 'fixture' } },
            { id: 'state:fixture', type: 'state', attributes: { mappingId: 'fixture' } },
            { id: 'test:fixture', type: 'test', attributes: { mappingId: 'fixture' } },
        ],
        edges: [
            {
                from: 'runtime:fixture',
                to: 'test:fixture',
                type: 'validated_by',
                attributes: {
                    mappingId: 'fixture',
                    relationLayer: 'test',
                },
            },
            {
                from: 'state:fixture',
                to: 'runtime:fixture',
                type: 'writes_state',
                attributes: {
                    mappingId: 'fixture',
                    relationLayer: 'event',
                },
            },
            {
                from: 'runtime:fixture',
                to: 'state:fixture',
                type: 'reads_state',
                attributes: {
                    mappingId: 'fixture',
                    relationLayer: 'state',
                },
            },
        ],
    };

    const violations = [];
    validatePredicateConstraints(graph, constraints, violations);
    const codes = violations.map((violation) => violation.code);

    assert.ok(codes.includes('KG_PREDICATE_DOMAIN'));
    assert.ok(codes.includes('KG_PREDICATE_RANGE'));
    assert.ok(codes.includes('KG_PREDICATE_LAYER'));
    assert.ok(codes.includes('KG_PREDICATE_CONSTRAINT_MISSING'));
});

test('contradiction rules split critical failures from non-critical warnings', () => {
    const rules = {
        contract: 'knowledge-graph.contradictions.v1',
        schema_version: 1,
        rules: [
            {
                id: 'critical-path-edge-overlap',
                type: 'critical_path_edge_overlap',
                severity: 'error',
                relation_types: ['emits'],
            },
            {
                id: 'runtime-event-direction-conflict',
                type: 'runtime_event_direction_conflict',
                severity: 'error',
            },
            {
                id: 'domain-drift',
                type: 'domain_drift',
                severity: 'warning',
                relation_types: ['writes_state'],
            },
        ],
    };
    const graph = {
        nodes: [
            {
                id: 'runtime:fixture',
                type: 'runtime',
                attributes: {
                    mappingId: 'fixture',
                    criticalPath: 'spawn',
                    domain: 'entity-lifecycle',
                },
            },
            {
                id: 'event:fixture',
                type: 'event',
                attributes: {
                    mappingId: 'fixture',
                    criticalPath: 'round-end',
                    domain: 'match-flow',
                },
            },
            {
                id: 'state:fixture',
                type: 'state',
                attributes: {
                    mappingId: 'fixture',
                    criticalPath: 'spawn',
                    domain: 'combat',
                },
            },
        ],
        edges: [
            {
                from: 'runtime:fixture',
                to: 'event:fixture',
                type: 'emits',
                attributes: {
                    mappingId: 'fixture',
                },
            },
            {
                from: 'runtime:fixture',
                to: 'event:fixture',
                type: 'consumes',
                attributes: {
                    mappingId: 'fixture',
                },
            },
            {
                from: 'runtime:fixture',
                to: 'state:fixture',
                type: 'writes_state',
                attributes: {
                    mappingId: 'fixture',
                },
            },
        ],
    };

    const violations = [];
    const warnings = [];
    validateGraphContradictions(graph, rules, violations, warnings);

    assert.deepEqual(violations.map((violation) => violation.code), [
        'KG_CONTRADICTION_CRITICAL_PATH',
        'KG_CONTRADICTION_EVENT_DIRECTION',
    ]);
    assert.deepEqual(warnings.map((warning) => warning.code), [
        'KG_CONTRADICTION_DOMAIN_DRIFT',
    ]);
});

test('runtime telemetry replay fixtures report graph drift', () => {
    const replay = {
        contract: 'knowledge-graph.runtime-telemetry-replay.v1',
        schema_version: 1,
        fixtures: [
            {
                id: 'spawn-fixture',
                critical_path: 'spawn',
                telemetry: [
                    {
                        system: 'runtime:spawn-system',
                        event: 'event:spawn',
                        edge_type: 'emits',
                    },
                ],
                expected: {
                    events: ['event:spawn'],
                    systems: ['runtime:spawn-system', 'runtime:missing-system'],
                    states: ['state:spawn-context'],
                    configs: [],
                    tests: [],
                    edges: [
                        {
                            from: 'runtime:spawn-system',
                            to: 'event:spawn',
                            type: 'emits',
                        },
                    ],
                },
            },
        ],
    };
    const graph = {
        nodes: [
            {
                id: 'runtime:spawn-system',
                type: 'runtime',
                attributes: {
                    criticalPath: 'spawn',
                },
            },
            {
                id: 'event:spawn',
                type: 'event',
                attributes: {
                    criticalPath: 'spawn',
                },
            },
            {
                id: 'state:spawn-context',
                type: 'state',
                attributes: {
                    criticalPath: 'spawn',
                },
            },
        ],
        edges: [
            {
                from: 'runtime:spawn-system',
                to: 'event:spawn',
                type: 'emits',
            },
        ],
    };

    const violations = [];
    validateRuntimeTelemetryReplay(graph, replay, violations);
    const codes = violations.map((violation) => violation.code);

    assert.ok(codes.includes('KG_TELEMETRY_REPLAY_MISMATCH'));
    assert.ok(codes.includes('KG_TELEMETRY_REPLAY_PATH_MISSING'));
});

test('runtime mapping integrity reports orphan, missing validation and unknown references', () => {
    const graph = {
        nodes: [
            {
                id: 'runtime:critical-orphan',
                type: 'runtime',
                attributes: {
                    mappingId: 'fixture',
                    file: 'src/runtime/CriticalOrphan.js',
                    criticalPath: 'fixture-path',
                },
            },
            {
                id: 'runtime:critical-unvalidated',
                type: 'runtime',
                attributes: {
                    mappingId: 'fixture',
                    file: 'src/runtime/CriticalUnvalidated.js',
                    criticalPath: 'fixture-path',
                },
            },
            {
                id: 'state:fixture',
                type: 'state',
                attributes: {
                    mappingId: 'fixture',
                },
            },
            {
                id: 'src/runtime/CriticalUnvalidated.js',
                type: 'file',
                attributes: {
                    exists: true,
                },
            },
        ],
        edges: [
            {
                from: 'runtime:critical-unvalidated',
                to: 'state:fixture',
                type: 'writes_state',
                attributes: {
                    mappingId: 'fixture',
                },
            },
            {
                from: 'runtime:critical-unvalidated',
                to: 'test:missing-fixture',
                type: 'validated_by',
                attributes: {
                    mappingId: 'fixture',
                },
            },
        ],
    };

    const violations = [];
    validateRuntimeMappingIntegrity(graph, violations);
    const codes = violations.map((violation) => violation.code);

    assert.ok(codes.includes('KG_RUNTIME_ORPHAN'));
    assert.ok(codes.includes('KG_RUNTIME_VALIDATION_MISSING'));
    assert.ok(codes.includes('KG_UNKNOWN_REFERENCE'));
    assert.ok(codes.includes('KG_UNKNOWN_FILE_REFERENCE'));
    assert.ok(codes.includes('KG_NODE_PROVENANCE_MISSING'));
    assert.ok(codes.includes('KG_EDGE_PROVENANCE_MISSING'));
});

test('knowledge graph core runtime queries return stable JSON shapes', async () => {
    const graph = await buildKnowledgeGraph();
    const coverage = {
        files: [
            {
                path: 'src/core/SettingsManager.js',
                covered: true,
                coveredInCore: true,
                coveredByOverlay: false,
                classification: 'product-code',
                scopeBlocks: ['V107'],
                surfaces: [],
            },
        ],
    };

    const impact = queryImpactForFile(graph, coverage, 'src\\core\\SettingsManager.js');
    assert.equal(impact.query, 'impact-for-file');
    assert.equal(impact.file, 'src/core/SettingsManager.js');
    assert.deepEqual(impact.criticalPaths, ['settings']);
    assert.ok(impact.implementedNodes.some((node) => node.id === 'runtime:settings-manager'));
    assert.equal(
        impact.implementedNodes.find((node) => node.id === 'runtime:settings-manager').provenance.file,
        'data/contracts/knowledge-graph/desktop-critical-paths.v1.json'
    );
    assert.ok(impact.relationEdges.some((edge) => edge.type === 'validated_by' && edge.to === 'test:settings-manager-contract'));

    const eventFlow = queryEventFlow(graph, 'round-end');
    assert.equal(eventFlow.query, 'event-flow');
    assert.deepEqual(eventFlow.events.map((event) => event.id), ['event:round-end']);
    assert.ok(eventFlow.edges.some((edge) => edge.type === 'emits' && edge.from === 'runtime:round-outcome-system'));
    assert.ok(eventFlow.edges.some((edge) => edge.type === 'consumes' && edge.from === 'runtime:round-end-coordinator'));
    assert.deepEqual(eventFlow.systems.map((node) => node.id), [
        'runtime:round-end-coordinator',
        'runtime:round-outcome-system',
    ]);
    assert.ok(eventFlow.states.some((node) => node.id === 'state:round-outcome'));
    assert.ok(eventFlow.states.some((node) => node.id === 'state:round-end-overlay'));
    assert.ok(eventFlow.configs.some((node) => node.id === 'config:gameplay-config-contract'));
    assert.ok(eventFlow.tests.some((node) => node.id === 'test:runtime-regressions-round-end'));
    assert.ok(eventFlow.contextEdges.some((edge) => edge.type === 'reads_config' && edge.to === 'config:gameplay-config-contract'));
    assert.ok(eventFlow.contextEdges.some((edge) => edge.type === 'writes_state' && edge.to === 'state:round-outcome'));
    assert.ok(eventFlow.contextEdges.some((edge) => edge.type === 'validated_by' && edge.to === 'test:runtime-regressions-round-end'));

    const combatFlow = queryEventFlow(graph, 'combat-hit');
    assert.ok(combatFlow.systems.some((node) => node.id === 'runtime:hunt-combat-system'));
    assert.ok(combatFlow.states.some((node) => node.id === 'state:hunt-combat-lock-on'));
    assert.ok(combatFlow.configs.some((node) => node.id === 'config:entity-runtime-config'));
    assert.ok(combatFlow.tests.some((node) => node.id === 'test:physics-hunt-combat'));

    const settingsFlow = queryEventFlow(graph, 'settings');
    assert.equal(settingsFlow.events.length, 0);
    assert.ok(settingsFlow.systems.some((node) => node.id === 'runtime:settings-manager'));
    assert.ok(settingsFlow.configs.some((node) => node.id === 'config:runtime-config-builder'));
    assert.ok(settingsFlow.tests.some((node) => node.id === 'test:settings-manager-contract'));
    assert.ok(settingsFlow.contextEdges.some((edge) => edge.type === 'validated_by' && edge.to === 'test:settings-manager-contract'));

    const untestedSystems = queryUntestedSystems(graph, 'spawn');
    assert.equal(untestedSystems.query, 'untested-systems');
    assert.deepEqual(untestedSystems.systems, []);

    const health = queryCriticalPathHealth(graph);
    assert.equal(health.query, 'critical-path-health');
    const healthByPath = new Map(health.criticalPaths.map((entry) => [entry.criticalPath, entry]));
    assert.equal(healthByPath.get('spawn').status, 'ok');
    assert.equal(healthByPath.get('combat-hit').status, 'ok');
    assert.equal(healthByPath.get('round-end').status, 'ok');
    assert.deepEqual(healthByPath.get('round-end').missingLayers, []);
    assert.ok(healthByPath.get('round-end').requiredLayers.includes('config'));
    assert.equal(healthByPath.get('settings').status, 'ok');
});

test('impact-diff reports changed runtime subgraphs and recommended delta checks', async () => {
    const graph = await buildKnowledgeGraph();
    const coverage = {
        files: [
            {
                path: 'src/core/SettingsManager.js',
                covered: true,
                coveredInCore: true,
                coveredByOverlay: false,
                classification: 'product-code',
                scopeBlocks: ['V103', 'V110'],
                surfaces: [],
            },
            {
                path: 'README.md',
                covered: true,
                coveredInCore: true,
                coveredByOverlay: false,
                classification: 'product-docs',
                scopeBlocks: [],
                surfaces: [],
            },
        ],
    };

    const result = queryImpactDiff(graph, coverage, ['src\\core\\SettingsManager.js', 'README.md'], { baseRef: 'HEAD~1' });

    assert.equal(result.query, 'impact-diff');
    assert.equal(result.baseRef, 'HEAD~1');
    assert.equal(result.riskStatus, 'review');
    assert.ok(result.criticalPaths.includes('settings'));
    assert.ok(result.riskFiles.some((entry) => entry.file === 'src/core/SettingsManager.js'));
    assert.ok(result.subgraph.nodes.some((node) => node.id === 'runtime:settings-manager'));
    assert.ok(result.subgraph.edges.some((edge) => edge.type === 'validated_by' && edge.to === 'test:settings-manager-contract'));
    assert.ok(result.recommendedChecks.includes('npm run graph:check'));
    assert.ok(result.recommendedChecks.some((command) => command.includes('event-flow settings')));
});

test('knowledge graph schema migrations accept current v1 artifacts and reject missing current path', () => {
    const contract = {
        contract: 'knowledge-graph.schema-migrations.v1',
        schema_version: 1,
        current: {
            graph_schema_version: 1,
            coverage_schema_version: 1,
            mapping_schema_version: 1,
        },
        migrations: [
            {
                id: 'knowledge-graph-schema-v1-current',
                from: {
                    graph_schema_version: 1,
                    coverage_schema_version: 1,
                    mapping_schema_version: 1,
                },
                to: {
                    graph_schema_version: 1,
                    coverage_schema_version: 1,
                    mapping_schema_version: 1,
                },
                mode: 'noop',
                status: 'active',
            },
        ],
    };
    const violations = validateKnowledgeGraphMigrationContract(contract, []);
    const decision = resolveKnowledgeGraphMigration({
        graph_schema_version: 1,
        coverage_schema_version: 1,
        mapping_schema_version: 1,
    }, contract);

    assert.deepEqual(violations, []);
    assert.equal(decision.status, 'current');
    assert.equal(decision.migration.id, 'knowledge-graph-schema-v1-current');

    const missingPath = {
        ...contract,
        migrations: [],
    };
    const missingPathViolations = validateKnowledgeGraphMigrationContract(missingPath, []);
    assert.ok(missingPathViolations.some((violation) => violation.code === 'KG_MIGRATION_RULE_MISSING'));
});

test('parseAuditMasterRows extracts audit blocks, findings paths and core scope references', () => {
    const content = [
        '# Spielaudit',
        '## Blockuebersicht',
        '| Block | Bereich | Kernpfade | Findings-Dokument |',
        '| --- | --- | --- | --- |',
        '| B05 | Menue, Start-Setup und UI-Orchestrierung | `src/ui/UIManager.js`, `src/ui/start-setup/**` | [B05_Findings.md](./B05_Findings.md) |',
        '## Ende',
    ].join('\n');

    const rows = parseAuditMasterRows(content, 'docs/qa/Spielaudit_2026-04-28/README.md');

    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'B05');
    assert.equal(rows[0].title, 'Menue, Start-Setup und UI-Orchestrierung');
    assert.equal(rows[0].findingsPath, 'docs/qa/Spielaudit_2026-04-28/B05_Findings.md');
    assert.deepEqual(rows[0].scopeEntries, ['src/ui/start-setup/**', 'src/ui/UIManager.js']);
});

test('parseAuditFindingsMetadata reads status and scope references from findings documents', () => {
    const content = [
        '# B05 Findings',
        '',
        'Status: offen',
        '',
        '## Scope',
        '- `src/ui/UIStartSyncController.js`',
        '- `src/ui/start-setup/StartSetupUiOps.js`',
        '',
        '## Befunde',
        '- ...',
    ].join('\n');

    const metadata = parseAuditFindingsMetadata(content);

    assert.equal(metadata.status, 'open');
    assert.deepEqual(metadata.scopeEntries, [
        'src/ui/start-setup/StartSetupUiOps.js',
        'src/ui/UIStartSyncController.js',
    ]);
});
