import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizeTrainingRunConfig,
    resolveTrainingRunArtifactLayout,
} from '../src/entities/ai/training/TrainingAutomationContractV33.js';
import { TrainingAutomationRunner } from '../src/entities/ai/training/TrainingAutomationRunner.js';
import { TrainingTransportFacade } from '../src/entities/ai/training/TrainingTransportFacade.js';

test('TrainingAutomationContractV33 normalizes run config and artifact layout deterministically', () => {
    const config = normalizeTrainingRunConfig({
        episodes: 4,
        seeds: '5, 5, 9',
        modes: 'classic-3d,hunt-2d',
        maxSteps: 12,
        bridgeMode: 'off',
        timeouts: {
            stepMs: 50,
            episodeMs: 3000,
            runMs: 9000,
        },
    });
    const layout = resolveTrainingRunArtifactLayout('RUN_TEST_001');

    assert.equal(config.contractVersion, 'v33-run-v1');
    assert.equal(config.kpiContractVersion, 'v33-kpi-v1');
    assert.equal(config.artifactLayoutVersion, 'v33-artifact-v1');
    assert.equal(config.episodes, 4);
    assert.deepEqual(config.seeds, [5, 9]);
    assert.deepEqual(config.modes.map((entry) => entry.domainId), ['classic-3d', 'hunt-2d']);
    assert.equal(config.maxSteps, 12);
    assert.equal(config.bridgeMode, 'local');
    assert.equal(config.timeouts.stepMs, 50);
    assert.equal(config.timeouts.episodeMs, 3000);
    assert.equal(config.timeouts.runMs, 9000);
    assert.equal(layout.contractVersion, 'v33-artifact-v1');
    assert.equal(layout.runArtifactPath, 'data/training/runs/RUN_TEST_001/run.json');
    assert.equal(layout.evalArtifactPath, 'data/training/runs/RUN_TEST_001/eval.json');
    assert.equal(layout.gateArtifactPath, 'data/training/runs/RUN_TEST_001/gate.json');
    assert.equal(layout.benchmarkManifestPath, 'data/training/runs/RUN_TEST_001/benchmark-manifest.json');
    assert.equal(layout.decisionTracePath, 'data/training/runs/RUN_TEST_001/decision-trace.json');
    assert.equal(layout.benchmarkReportPath, 'data/training/runs/RUN_TEST_001/benchmark-report.json');
    assert.equal(layout.latestIndexPath, 'data/training/runs/latest.json');
});

test('TrainingAutomationRunner produces deterministic seeds, episodes and KPIs', () => {
    const config = {
        episodes: 2,
        seeds: [2, 6],
        modes: ['classic-3d', 'hunt-2d'],
        maxSteps: 9,
        bridgeMode: 'local',
        timeouts: {
            stepMs: 100,
            episodeMs: 5000,
            runMs: 20000,
        },
    };
    const runA = new TrainingAutomationRunner().run(config);
    const runB = new TrainingAutomationRunner().run(config);
    const signature = (run) => run.episodes.map((episode) => [
        episode.seed,
        episode.domainId,
        episode.stepCount,
        episode.episodeReturn,
        episode.done,
        episode.truncated,
        episode.terminalReason,
        episode.truncatedReason,
        episode.invalidActionSteps,
    ]);

    assert.deepEqual(signature(runA), signature(runB));
    assert.deepEqual(runA.kpis, runB.kpis);
    assert.equal(runA.totals.episodesTotal, 8);
    assert.equal(runB.totals.episodesTotal, 8);
    assert.equal(runA.kpis.runtimeErrorCount, 0);
    assert.equal(runB.kpis.runtimeErrorCount, 0);
});

test('TrainingAutomationRunner reuses the transport facade and aggregates metrics', () => {
    let transportFactoryCalls = 0;
    let createdFacadeIsTransportFacade = false;
    const runner = new TrainingAutomationRunner({
        transportFactory(options) {
            transportFactoryCalls += 1;
            const facade = new TrainingTransportFacade(options);
            createdFacadeIsTransportFacade = facade instanceof TrainingTransportFacade;
            return facade;
        },
    });

    const run = runner.run({
        episodes: 3,
        seeds: [4],
        modes: ['classic-3d'],
        maxSteps: 7,
        bridgeMode: 'local',
        timeouts: {
            stepMs: 100,
            episodeMs: 5000,
            runMs: 20000,
        },
    });

    assert.equal(transportFactoryCalls, 1);
    assert.equal(createdFacadeIsTransportFacade, true);
    assert.equal(run.totals.episodesTotal, 3);
    assert.equal(run.totals.terminalCount + run.totals.truncationCount, 3);
    assert.ok(run.totals.invalidActionStepCount > 0);
    assert.ok(run.kpis.invalidActionRate > 0);
    assert.ok(Number.isFinite(run.kpis.episodeReturnMean));
    assert.equal(run.kpis.runtimeErrorCount, 0);
});
