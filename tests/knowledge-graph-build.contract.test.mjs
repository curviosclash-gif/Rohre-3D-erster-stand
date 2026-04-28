import test from 'node:test';
import assert from 'node:assert/strict';

import {
    parseDependencyTable,
    parseDependencyToken,
    parseFrontmatter,
    parseMasterRows,
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

test('parseDependencyToken supports Vxx and Vxx.yy formats', () => {
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
