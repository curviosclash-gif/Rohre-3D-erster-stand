import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

import { collectArchitectureReport } from '../scripts/architecture/ArchitectureAnalysis.mjs';
import { selectArchitectureChecks } from '../scripts/check-architecture-staged.mjs';

function selectedLabels(files) {
    return selectArchitectureChecks(files)
        .checks
        .map((check) => check.label)
        .sort();
}

function readRatchetBudgets() {
    return JSON.parse(
        fs.readFileSync('scripts/architecture/architecture-budget-ratchet.json', 'utf8')
    ).budgets;
}

function readRepoText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

test('code quality rule defines the shared architecture capsule', () => {
    const source = readRepoText('.agents/rules/code_quality_and_debugging.md');

    for (const expected of [
        'The shared Architecture Capsule',
        'Layers',
        'Dependency delta',
        'Contract/Port/Command/Snapshot',
        'Legacy surface',
        'Guard',
        'Not checked',
    ]) {
        assert(source.includes(expected), `missing architecture capsule token: ${expected}`);
    }
});

test('workflows keep architecture capsule and boundary escalation requirements', () => {
    const expectations = new Map([
        ['code.md', ['Architecture Capsule', 'architekturrelevantem Code-Scope']],
        ['quick.md', [
            'Architecture Capsule',
            'Neue Dependency-Kanten',
            'Runtime-/Global-Surfaces',
            'Application/UI/Core-Grenzen verlassen den Quick-Path',
        ]],
        ['bugfix.md', ['Architecture Capsule', 'keine neuen Runtime-/Global-Surface-Consumer']],
        ['refactor.md', ['Architecture Capsule', 'neue Dependency-Kanten']],
        ['performance.md', ['Architecture Capsule', 'keine neuen Boundary-, Legacy- oder Runtime-/Global-Surface-Pfade']],
        ['fix-planung.md', ['Architecture Capsule', 'kleinsten Guard', 'legacy paths']],
    ]);

    for (const [fileName, expectedTokens] of expectations.entries()) {
        const source = readRepoText(`.agents/workflows/${fileName}`);
        for (const expected of expectedTokens) {
            assert(source.includes(expected), `${fileName} missing architecture governance token: ${expected}`);
        }
    }
});

test('staged architecture guard routes narrow and broad architecture scopes', () => {
    assert.deepEqual(selectedLabels(['src/ui/menu/MenuPreviewCatalog.js']), [
        'check:architecture:touched-strict',
    ]);

    assert.deepEqual(selectedLabels(['scripts/architecture/ArchitectureAnalysis.mjs']), [
        'check:architecture:boundaries',
        'check:architecture:metrics',
        'check:architecture:ratchet',
    ]);

    const applicationSelection = selectArchitectureChecks([
        'src/application/session-runtime/NetworkLobbyService.js',
    ]);
    assert.deepEqual(selectedLabels(applicationSelection.stagedFiles), [
        'check:architecture:boundaries',
        'check:architecture:metrics',
        'check:architecture:ratchet',
        'check:architecture:touched-strict',
    ]);
    assert(applicationSelection.notes.some((note) => note.includes('application -> ui/core')));

    const electronSelection = selectArchitectureChecks(['electron/preload.cjs']);
    assert.deepEqual(selectedLabels(electronSelection.stagedFiles), [
        'check:architecture:boundaries',
        'check:architecture:metrics',
    ]);
    assert(electronSelection.notes.some((note) => note.includes('Electron/Preload surface')));
});

test('architecture report exposes application boundary categories with ratchet baselines', () => {
    const report = collectArchitectureReport(process.cwd());
    const budgets = readRatchetBudgets();

    assert.equal(typeof report.scorecard.applicationToUiImports.totalEdges, 'number');
    assert.equal(typeof report.scorecard.applicationToCoreImports.totalEdges, 'number');
    assert.equal(report.scorecard.applicationToUiImports.disallowedEdges, 0);
    assert.equal(report.scorecard.applicationToCoreImports.disallowedEdges, 0);
    assert(Number.isFinite(budgets.applicationToUiImportEdges));
    assert(Number.isFinite(budgets.applicationToCoreImportEdges));
    assert(report.scorecard.applicationToUiImports.totalEdges <= budgets.applicationToUiImportEdges);
    assert(report.scorecard.applicationToCoreImports.totalEdges <= budgets.applicationToCoreImportEdges);
});

test('metrics command displays DOM budgets from the ratchet source', () => {
    const report = collectArchitectureReport(process.cwd());
    const budgets = readRatchetBudgets();
    const result = spawnSync(process.execPath, ['scripts/check-architecture-metrics.mjs'], {
        encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const domBudgetLine = result.stdout
        .split(/\r?\n/)
        .find((line) => line.includes('DOM outside src/ui legacy file budget ='));

    assert.equal(
        domBudgetLine,
        `- OK: DOM outside src/ui legacy file budget = ${report.scorecard.domAccessOutsideUi.totalFiles} (budget ${budgets.domAccessFiles})`
    );
});
