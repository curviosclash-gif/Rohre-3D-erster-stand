import test from 'node:test';
import assert from 'node:assert/strict';

import {
    classifyCoveragePath,
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
    assert.deepEqual(rows[0].scopeEntries, ['src/ui/UIManager.js', 'src/ui/start-setup/**']);
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
        'src/ui/UIStartSyncController.js',
        'src/ui/start-setup/StartSetupUiOps.js',
    ]);
});
