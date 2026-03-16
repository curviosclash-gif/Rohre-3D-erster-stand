import { expect, test } from '@playwright/test';
import { loadGame } from './helpers.js';

test.describe('Training Automation Core V33', () => {

    test('T99: V33 Contract normalisiert Run-Konfig, KPI-Freeze und Artefaktlayout deterministisch', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const {
                normalizeTrainingRunConfig,
                resolveTrainingRunArtifactLayout,
            } = await import('/src/entities/ai/training/TrainingAutomationContractV33.js');

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

            return {
                runContractVersion: config.contractVersion,
                kpiContractVersion: config.kpiContractVersion,
                artifactLayoutVersion: config.artifactLayoutVersion,
                episodes: config.episodes,
                seeds: config.seeds,
                modeDomainIds: config.modes.map((entry) => entry.domainId),
                maxSteps: config.maxSteps,
                bridgeMode: config.bridgeMode,
                timeoutStepMs: config.timeouts.stepMs,
                timeoutEpisodeMs: config.timeouts.episodeMs,
                timeoutRunMs: config.timeouts.runMs,
                layoutContractVersion: layout.contractVersion,
                layoutRunPath: layout.runArtifactPath,
                layoutEvalPath: layout.evalArtifactPath,
                layoutGatePath: layout.gateArtifactPath,
                layoutLatestPath: layout.latestIndexPath,
            };
        });

        expect(result.runContractVersion).toBe('v33-run-v1');
        expect(result.kpiContractVersion).toBe('v33-kpi-v1');
        expect(result.artifactLayoutVersion).toBe('v33-artifact-v1');
        expect(result.episodes).toBe(4);
        expect(result.seeds).toEqual([5, 9]);
        expect(result.modeDomainIds).toEqual(['classic-3d', 'hunt-2d']);
        expect(result.maxSteps).toBe(12);
        expect(result.bridgeMode).toBe('local');
        expect(result.timeoutStepMs).toBe(50);
        expect(result.timeoutEpisodeMs).toBe(3000);
        expect(result.timeoutRunMs).toBe(9000);
        expect(result.layoutContractVersion).toBe('v33-artifact-v1');
        expect(result.layoutRunPath).toBe('data/training/runs/RUN_TEST_001/run.json');
        expect(result.layoutEvalPath).toBe('data/training/runs/RUN_TEST_001/eval.json');
        expect(result.layoutGatePath).toBe('data/training/runs/RUN_TEST_001/gate.json');
        expect(result.layoutLatestPath).toBe('data/training/runs/latest.json');
    });

    test('T100: TrainingAutomationRunner liefert reproduzierbare Seeds/Episoden-Ergebnisse', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { TrainingAutomationRunner } = await import('/src/entities/ai/training/TrainingAutomationRunner.js');

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
            const signatureA = runA.episodes.map((episode) => [
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
            const signatureB = runB.episodes.map((episode) => [
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

            return {
                totalsA: runA.totals,
                totalsB: runB.totals,
                kpisA: runA.kpis,
                kpisB: runB.kpis,
                sameSignature: JSON.stringify(signatureA) === JSON.stringify(signatureB),
                sameKpis: JSON.stringify(runA.kpis) === JSON.stringify(runB.kpis),
            };
        });

        expect(result.sameSignature).toBeTruthy();
        expect(result.sameKpis).toBeTruthy();
        expect(result.totalsA.episodesTotal).toBe(8);
        expect(result.totalsB.episodesTotal).toBe(8);
        expect(result.kpisA.runtimeErrorCount).toBe(0);
        expect(result.kpisB.runtimeErrorCount).toBe(0);
    });

    test('T101: Runner aggregiert Episode-Metriken und erzwingt TransportFacade-Reuse', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { TrainingAutomationRunner } = await import('/src/entities/ai/training/TrainingAutomationRunner.js');
            const { TrainingTransportFacade } = await import('/src/entities/ai/training/TrainingTransportFacade.js');

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

            return {
                transportFactoryCalls,
                createdFacadeIsTransportFacade,
                episodesTotal: run.totals.episodesTotal,
                terminalCount: run.totals.terminalCount,
                truncationCount: run.totals.truncationCount,
                invalidActionStepCount: run.totals.invalidActionStepCount,
                invalidActionRate: run.kpis.invalidActionRate,
                episodeReturnMean: run.kpis.episodeReturnMean,
                runtimeErrorCount: run.kpis.runtimeErrorCount,
            };
        });

        expect(result.transportFactoryCalls).toBe(1);
        expect(result.createdFacadeIsTransportFacade).toBeTruthy();
        expect(result.episodesTotal).toBe(3);
        expect(result.terminalCount + result.truncationCount).toBe(3);
        expect(result.invalidActionStepCount).toBeGreaterThan(0);
        expect(result.invalidActionRate).toBeGreaterThan(0);
        expect(Number.isFinite(result.episodeReturnMean)).toBeTruthy();
        expect(result.runtimeErrorCount).toBe(0);
    });
});
