import test from 'node:test';
import assert from 'node:assert/strict';

import {
    queryBtStatus,
    queryCoverageReport,
    queryFilesForBlock,
    queryOpenDeps,
    queryUncoveredFiles,
    queryWhyFile,
} from '../scripts/query-knowledge-graph.mjs';

const graphFixture = {
    contract: 'knowledge-graph.v1',
    nodes: [
        {
            id: 'BT93J',
            type: 'block',
            title: 'Root-Cause-Blocker-Repair',
            status: 'active',
            attributes: {
                source: ['bot-training-plan'],
                currentPhase: '93J.99',
                referencePlanFile: 'docs/plaene/aktiv/V104.md',
            },
        },
        {
            id: 'V104',
            type: 'block',
            title: 'Main Block',
            status: 'active',
            attributes: {
                source: ['block-plan'],
            },
        },
        {
            id: 'BT93J.1',
            type: 'phase',
            title: 'Diagnose',
            status: 'done',
            attributes: {
                blockId: 'BT93J',
                phaseCode: '93J.1',
            },
        },
        {
            id: 'BT93J.99',
            type: 'phase',
            title: 'Abschluss-Gate',
            status: 'open',
            attributes: {
                blockId: 'BT93J',
                phaseCode: '93J.99',
            },
        },
        {
            id: 'BT93J.1.1',
            type: 'subphase',
            title: 'Diagnose',
            status: 'done',
            attributes: {
                blockId: 'BT93J',
                phaseCode: '93J.1',
            },
        },
        {
            id: 'BT93J.99.1',
            type: 'subphase',
            title: 'Gate',
            status: 'open',
            attributes: {
                blockId: 'BT93J',
                phaseCode: '93J.99',
            },
        },
        {
            id: 'python/train.py',
            type: 'file',
            title: null,
            status: 'unknown',
            attributes: {
                exists: true,
                source: ['bot-training-plan'],
            },
        },
    ],
    edges: [
        {
            from: 'BT93J',
            to: 'BT93I',
            type: 'depends_on',
            source: 'master-table',
            hard: true,
            fulfilled: false,
            hint: 'waits',
            attributes: {
                dependsPhase: '93I.99',
            },
        },
        {
            from: 'BT93J',
            to: 'python/train.py',
            type: 'scope',
            attributes: {},
        },
        {
            from: 'V104',
            to: 'python/train.py',
            type: 'scope',
            attributes: {},
        },
    ],
};

const coverageFixture = {
    summary: {
        trackedFileCount: 3,
        rawCoveredFileCount: 2,
        rawCoveragePercent: 66.7,
        adjustedTrackedFileCount: 2,
        adjustedCoveredFileCount: 2,
        adjustedCoveragePercent: 100,
        uncoveredFileCount: 1,
        uncoveredActiveFileCount: 0,
    },
    overlayBlocks: [
        {
            id: 'GIT-HISTORY-HOTSPOTS',
            title: 'Git-History Hotspots ausserhalb des Core-Graphen',
            coverageSource: 'git-history',
            fileCount: 1,
            files: [
                {
                    path: 'src/network/OnlineSessionAdapter.js',
                    changeCount: 15,
                    dirty: true,
                },
            ],
        },
    ],
    gate: {
        contract: 'knowledge-graph.coverage.gate.v1',
        status: 'pass',
        baseline: {
            ref: 'HEAD',
            path: 'docs/generated/knowledge-graph.coverage.json',
            available: true,
        },
        rules: [
            {
                id: 'no-new-active-uncovered-files',
                severity: 'error',
                status: 'pass',
                description: 'fixture',
                violationCount: 0,
                files: [],
            },
        ],
    },
    files: [
        {
            path: 'python/train.py',
            coveredInCore: true,
            coveredByOverlay: false,
            covered: true,
            coverageSources: ['bot-training-plan'],
            scopeBlocks: ['BT93J', 'V104'],
            surfaces: [],
            classification: 'product-code',
            excludedFromCoverage: false,
            excludeReason: null,
        },
        {
            path: 'src/network/OnlineSessionAdapter.js',
            coveredInCore: false,
            coveredByOverlay: true,
            covered: true,
            coverageSources: ['git-history'],
            scopeBlocks: [],
            surfaces: [],
            classification: 'product-code',
            excludedFromCoverage: false,
            excludeReason: null,
            overlays: [
                {
                    blockId: 'GIT-HISTORY-HOTSPOTS',
                    coverageSource: 'git-history',
                    changeCount: 15,
                    dirty: true,
                },
            ],
        },
        {
            path: 'assets/ui/logo.png',
            coveredInCore: false,
            coveredByOverlay: false,
            covered: false,
            coverageSources: [],
            scopeBlocks: [],
            surfaces: [],
            classification: 'asset',
            excludedFromCoverage: true,
            excludeReason: 'Static asset inventory is tracked separately from code-surface coverage.',
        },
    ],
};

test('queryOpenDeps returns unresolved dependency metadata', () => {
    const result = queryOpenDeps(graphFixture, 'BT93J');

    assert.equal(result.openDependencies.length, 1);
    assert.equal(result.openDependencies[0].dependsOn, 'BT93I');
    assert.equal(result.openDependencies[0].dependsPhase, '93I.99');
});

test('queryCoverageReport and queryUncoveredFiles expose coverage summary and gaps', () => {
    const report = queryCoverageReport(coverageFixture);
    const uncovered = queryUncoveredFiles(coverageFixture, 'assets/');

    assert.equal(report.summary.adjustedCoveragePercent, 100);
    assert.equal(report.gate.status, 'pass');
    assert.deepEqual(uncovered.files, [
        {
            path: 'assets/ui/logo.png',
            classification: 'asset',
            excludedFromCoverage: true,
            excludeReason: 'Static asset inventory is tracked separately from code-surface coverage.',
            coverageSources: [],
        },
    ]);
});

test('queryWhyFile and queryFilesForBlock explain core and overlay coverage', () => {
    const whyCore = queryWhyFile(graphFixture, coverageFixture, 'python/train.py');
    const whyOverlay = queryWhyFile(graphFixture, coverageFixture, 'src/network/OnlineSessionAdapter.js');
    const blockFiles = queryFilesForBlock(graphFixture, coverageFixture, 'BT93J');
    const overlayFiles = queryFilesForBlock(graphFixture, coverageFixture, 'GIT-HISTORY-HOTSPOTS');

    assert.equal(whyCore.coverage.coveredInCore, true);
    assert.equal(whyOverlay.coverage.coveredByOverlay, true);
    assert.equal(blockFiles.files.length, 1);
    assert.equal(blockFiles.files[0].path, 'python/train.py');
    assert.equal(overlayFiles.files[0].changeCount, 15);
    assert.equal(overlayFiles.files[0].dirty, true);
});

test('queryBtStatus summarizes BT block progress', () => {
    const list = queryBtStatus(graphFixture);
    const detail = queryBtStatus(graphFixture, 'BT93J');

    assert.equal(list.blocks.length, 1);
    assert.equal(list.blocks[0].id, 'BT93J');
    assert.equal(detail.block.currentPhase, '93J.99');
    assert.equal(detail.block.openDependencyCount, 1);
    assert.equal(detail.block.scopeFileCount, 1);
    assert.equal(detail.block.doneSubphaseCount, 1);
});
