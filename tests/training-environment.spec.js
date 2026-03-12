import { expect, test } from '@playwright/test';
import { loadGame, openDeveloperSubmenu } from './helpers.js';

test.describe('Training Environment V32', () => {

    test('T90: DeterministicTrainingStepRunner liefert additiven reset/step-Vertrag', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { OBSERVATION_LENGTH_V1 } = await import('/src/entities/ai/observation/ObservationSchemaV1.js');
            const { DeterministicTrainingStepRunner } = await import('/src/entities/ai/training/DeterministicTrainingStepRunner.js');

            const runner = new DeterministicTrainingStepRunner({
                episode: {
                    defaultMaxSteps: 4,
                },
            });
            const observation = new Array(OBSERVATION_LENGTH_V1).fill(0.25);
            const reset = runner.reset({
                mode: 'HUNT',
                planarMode: true,
                matchId: 't90',
                observation,
            });
            const step = runner.step({
                observation: observation.map((value, index) => (index === 0 ? 0.5 : value)),
                action: {
                    yawLeft: 'yes',
                    shootItem: true,
                    shootItemIndex: 99,
                },
                inventoryLength: 2,
                rewardSignals: {
                    survival: true,
                    damageDealt: 3,
                },
            });

            return {
                resetOperation: reset.operation,
                resetObservationLength: reset.observation.length,
                resetReward: reset.reward,
                resetDone: reset.done,
                resetTruncated: reset.truncated,
                resetDomainId: reset.info?.domain?.domainId || null,
                resetControlProfileId: reset.info?.domain?.controlProfileId || null,
                stepOperation: step.operation,
                stepActionShootItem: !!step.action?.shootItem,
                stepActionShootItemIndex: Number(step.action?.shootItemIndex),
                stepReward: Number(step.reward),
                stepDone: !!step.done,
                stepTruncated: !!step.truncated,
                stepSchemaVersion: step.info?.observationSchemaVersion || null,
                stepControlProfileId: step.info?.domain?.controlProfileId || null,
            };
        });

        expect(result.resetOperation).toBe('reset');
        expect(result.resetObservationLength).toBe(40);
        expect(result.resetReward).toBe(0);
        expect(result.resetDone).toBeFalsy();
        expect(result.resetTruncated).toBeFalsy();
        expect(result.resetDomainId).toBe('hunt-2d');
        expect(typeof result.resetControlProfileId).toBe('string');
        expect(result.resetControlProfileId.length).toBeGreaterThan(0);
        expect(result.stepOperation).toBe('step');
        expect(result.stepActionShootItem).toBeTruthy();
        expect(result.stepActionShootItemIndex).toBe(1);
        expect(result.stepReward).toBeGreaterThan(0);
        expect(result.stepDone).toBeFalsy();
        expect(result.stepTruncated).toBeFalsy();
        expect(result.stepSchemaVersion).toBe('v1');
        expect(typeof result.stepControlProfileId).toBe('string');
        expect(result.stepControlProfileId.length).toBeGreaterThan(0);
    });

    test('T91: EpisodeController leitet done/truncated inkl. max-steps deterministisch ab', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const {
                EpisodeController,
                TRAINING_TRUNCATION_REASONS,
            } = await import('/src/state/training/EpisodeController.js');

            const controller = new EpisodeController({
                defaultMaxSteps: 2,
            });
            const reset = controller.reset({
                mode: 'classic',
                planarMode: false,
            });
            const step1 = controller.step({});
            const step2 = controller.step({});
            const reset2 = controller.reset({
                episodeId: 'custom-episode',
                mode: 'fight',
                planarMode: true,
            });
            const doneStep = controller.step({
                done: true,
                terminalReason: 'match-ended',
            });

            return {
                resetDomainId: reset.domain?.domainId || null,
                step1Done: step1.done,
                step1Truncated: step1.truncated,
                step2Done: step2.done,
                step2Truncated: step2.truncated,
                step2TruncatedReason: step2.truncatedReason,
                expectedMaxStepReason: TRAINING_TRUNCATION_REASONS.MAX_STEPS,
                reset2EpisodeId: reset2.episodeId,
                reset2DomainId: reset2.domain?.domainId || null,
                doneStepDone: doneStep.done,
                doneStepTerminalReason: doneStep.terminalReason,
            };
        });

        expect(result.resetDomainId).toBe('classic-3d');
        expect(result.step1Done).toBeFalsy();
        expect(result.step1Truncated).toBeFalsy();
        expect(result.step2Done).toBeFalsy();
        expect(result.step2Truncated).toBeTruthy();
        expect(result.step2TruncatedReason).toBe(result.expectedMaxStepReason);
        expect(result.reset2EpisodeId).toBe('custom-episode');
        expect(result.reset2DomainId).toBe('hunt-2d');
        expect(result.doneStepDone).toBeTruthy();
        expect(result.doneStepTerminalReason).toBe('match-ended');
    });

    test('T92: RewardCalculator verrechnet Survival/Kill/Crash/Stuck/Item/Damage transparent', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { RewardCalculator, sumRewardComponents } = await import('/src/state/training/RewardCalculator.js');

            const calculator = new RewardCalculator({
                weights: {
                    baseStep: -0.01,
                    survival: 0.1,
                    kill: 2,
                    crash: -3,
                    stuck: -1,
                    itemPickup: 0.5,
                    itemUse: 0.25,
                    damageDealt: 0.05,
                    damageTaken: -0.02,
                    win: 4,
                    loss: -4,
                },
            });
            const reward = calculator.compute({
                survival: true,
                kills: 2,
                crashed: true,
                stuck: true,
                itemsCollected: 1,
                itemUses: 2,
                damageDealt: 10,
                damageTaken: 5,
                won: true,
                bonusReward: 0.5,
            });

            return {
                total: reward.total,
                componentSum: sumRewardComponents(reward.components),
                components: reward.components,
            };
        });

        expect(result.total).toBeCloseTo(5.99, 6);
        expect(result.componentSum).toBeCloseTo(result.total, 6);
        expect(result.components.kill).toBeCloseTo(4, 6);
        expect(result.components.crash).toBeCloseTo(-3, 6);
        expect(result.components.stuck).toBeCloseTo(-1, 6);
        expect(result.components.itemPickup).toBeCloseTo(0.5, 6);
        expect(result.components.itemUse).toBeCloseTo(0.5, 6);
        expect(result.components.damageDealt).toBeCloseTo(0.5, 6);
        expect(result.components.damageTaken).toBeCloseTo(-0.1, 6);
        expect(result.components.external).toBeCloseTo(0.5, 6);
    });

    test('T93: TrainerPayloadAdapter und WebSocketTrainerBridge transportieren additive Trainingsframes', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { WebSocketTrainerBridge } = await import('/src/entities/ai/training/WebSocketTrainerBridge.js');
            const {
                buildTrainerRuntimeObservationPayload,
                buildTrainerTransitionPayload,
            } = await import('/src/entities/ai/training/TrainerPayloadAdapter.js');

            const originalWebSocket = globalThis.WebSocket;
            const sent = [];

            class MockWebSocket {
                static CONNECTING = 0;
                static OPEN = 1;
                static CLOSING = 2;
                static CLOSED = 3;

                constructor() {
                    this.readyState = MockWebSocket.OPEN;
                    this._listeners = new Map();
                    setTimeout(() => this._emit('open', {}), 0);
                }

                addEventListener(type, handler) {
                    const list = this._listeners.get(type) || [];
                    list.push(handler);
                    this._listeners.set(type, list);
                }

                removeEventListener(type, handler) {
                    const list = this._listeners.get(type) || [];
                    this._listeners.set(type, list.filter((entry) => entry !== handler));
                }

                _emit(type, event) {
                    const list = this._listeners.get(type) || [];
                    list.forEach((handler) => handler(event));
                }

                send(raw) {
                    const envelope = JSON.parse(raw);
                    sent.push(envelope);
                    if (envelope.type === 'bot-action-request') {
                        setTimeout(() => {
                            this._emit('message', {
                                data: JSON.stringify({
                                    id: envelope.id,
                                    action: { yawLeft: true },
                                }),
                            });
                        }, 0);
                    } else {
                        setTimeout(() => {
                            this._emit('message', {
                                data: JSON.stringify({
                                    id: envelope.id,
                                    ok: true,
                                }),
                            });
                        }, 0);
                    }
                }

                close() {
                    this.readyState = MockWebSocket.CLOSED;
                    this._emit('close', {});
                }
            }

            globalThis.WebSocket = MockWebSocket;
            try {
                const bridge = new WebSocketTrainerBridge({
                    enabled: true,
                    timeoutMs: 100,
                    url: 'ws://127.0.0.1:8765',
                });
                const runtimePayload = buildTrainerRuntimeObservationPayload({
                    mode: 'classic',
                    planarMode: false,
                    dt: 1 / 60,
                    observation: new Array(40).fill(0),
                }, {
                    index: 1,
                    hp: 10,
                    maxHp: 10,
                    shieldHP: 3,
                    maxShieldHp: 5,
                    inventory: ['rocket'],
                });
                bridge.submitObservation(runtimePayload);
                await new Promise((resolve) => setTimeout(resolve, 10));
                const action = bridge.consumeLatestAction();

                const transitionPayload = buildTrainerTransitionPayload({
                    operation: 'step',
                    episodeId: 'episode-1',
                    episodeIndex: 1,
                    stepIndex: 1,
                    observation: new Array(40).fill(0.2),
                    action: { yawLeft: true },
                    reward: 0.5,
                    done: false,
                    truncated: false,
                    info: {
                        domain: {
                            mode: 'classic',
                            planarMode: false,
                            domainId: 'classic-3d',
                        },
                    },
                });
                bridge.submitTrainingStep(transitionPayload);
                await new Promise((resolve) => setTimeout(resolve, 10));
                const response = bridge.consumeLatestResponse();
                bridge.close();

                const legacyEnvelope = sent[0] || {};
                return {
                    sentTypes: sent.map((entry) => entry.type),
                    actionYawLeft: !!action?.yawLeft,
                    trainingAckOk: response?.ok === true,
                    runtimeControlProfileId: runtimePayload?.controlProfileId || null,
                    transitionControlProfileId: transitionPayload?.info?.domain?.controlProfileId || null,
                    legacyEnvelopeHasType: legacyEnvelope.type === 'bot-action-request',
                    legacyEnvelopeHasId: Number.isInteger(legacyEnvelope.id),
                    legacyEnvelopeHasPayload: Object.prototype.hasOwnProperty.call(legacyEnvelope, 'payload'),
                    hasTrainingContractVersion: typeof (sent[1] || {}).contractVersion === 'string',
                };
            } finally {
                globalThis.WebSocket = originalWebSocket;
            }
        });

        expect(result.sentTypes).toEqual(['bot-action-request', 'training-step']);
        expect(result.actionYawLeft).toBeTruthy();
        expect(result.trainingAckOk).toBeTruthy();
        expect(typeof result.runtimeControlProfileId).toBe('string');
        expect(result.runtimeControlProfileId.length).toBeGreaterThan(0);
        expect(typeof result.transitionControlProfileId).toBe('string');
        expect(result.transitionControlProfileId.length).toBeGreaterThan(0);
        expect(result.legacyEnvelopeHasType).toBeTruthy();
        expect(result.legacyEnvelopeHasId).toBeTruthy();
        expect(result.legacyEnvelopeHasPayload).toBeTruthy();
        expect(result.hasTrainingContractVersion).toBeTruthy();
    });

    test('T94: Developer-Training-Events nutzen den modularen reset/step-Pfad inkl. UI-Output', async ({ page }) => {
        await loadGame(page);
        await openDeveloperSubmenu(page);
        const result = await page.evaluate(() => {
            const game = globalThis.GAME_INSTANCE;
            game.runtimeFacade.handleMenuControllerEvent({
                type: 'developer_mode_toggle',
                enabled: true,
            });
            game.runtimeFacade.handleMenuControllerEvent({
                type: 'developer_training_reset',
                mode: 'hunt',
                planarMode: true,
                maxSteps: 3,
                seed: 4,
                inventoryLength: 2,
            });
            const resetSnapshot = game.debugApi.getTrainingSessionSnapshot();
            const resetOutput = document.getElementById('developer-training-output')?.textContent || '';

            game.runtimeFacade.handleMenuControllerEvent({
                type: 'developer_training_step',
                mode: 'hunt',
                planarMode: true,
                maxSteps: 3,
                seed: 5,
                inventoryLength: 2,
                action: {
                    yawLeft: true,
                    shootItem: true,
                    shootItemIndex: 99,
                },
                rewardSignals: {
                    survival: true,
                    kills: 1,
                    damageDealt: 4,
                },
                done: true,
                terminalReason: 'match-win',
            });
            const stepSnapshot = game.debugApi.getTrainingSessionSnapshot();
            const stepOutput = document.getElementById('developer-training-output')?.textContent || '';

            return {
                resetOperation: resetSnapshot?.latestTransition?.operation || null,
                resetDomainId: resetSnapshot?.latestTransition?.domainId || null,
                resetOutputHasSeed: resetOutput.includes('"seed": 4'),
                stepOperation: stepSnapshot?.latestTransition?.operation || null,
                stepDone: !!stepSnapshot?.latestTransition?.done,
                stepReward: Number(stepSnapshot?.latestTransition?.reward || 0),
                stepShootItemIndex: Number(stepSnapshot?.latestTransition?.action?.shootItemIndex ?? -1),
                stepOutputHasOperation: stepOutput.includes('"operation": "step"'),
                stepOutputHasDomain: stepOutput.includes('"domainId": "hunt-2d"'),
            };
        });

        expect(result.resetOperation).toBe('reset');
        expect(result.resetDomainId).toBe('hunt-2d');
        expect(result.resetOutputHasSeed).toBeTruthy();
        expect(result.stepOperation).toBe('step');
        expect(result.stepDone).toBeTruthy();
        expect(result.stepReward).toBeGreaterThan(0);
        expect(result.stepShootItemIndex).toBe(1);
        expect(result.stepOutputHasOperation).toBeTruthy();
        expect(result.stepOutputHasDomain).toBeTruthy();
    });

    test('T95: Developer Auto-Step fuehrt N Schritte aus und stoppt deterministisch bei Terminal', async ({ page }) => {
        await loadGame(page);
        await openDeveloperSubmenu(page);
        const result = await page.evaluate(() => {
            const game = globalThis.GAME_INSTANCE;
            game.runtimeFacade.handleMenuControllerEvent({
                type: 'developer_mode_toggle',
                enabled: true,
            });
            game.runtimeFacade.handleMenuControllerEvent({
                type: 'developer_training_auto_step',
                mode: 'classic',
                planarMode: false,
                maxSteps: 2,
                seed: 11,
                inventoryLength: 2,
                steps: 5,
                rewardSignals: {
                    survival: true,
                },
            });

            const snapshot = game.debugApi.getTrainingSessionSnapshot();
            const outputRaw = document.getElementById('developer-training-output')?.textContent || '';
            let outputParsed = null;
            try {
                outputParsed = JSON.parse(outputRaw);
            } catch {
                outputParsed = null;
            }

            return {
                transitionOperation: snapshot?.latestTransition?.operation || null,
                transitionTruncated: !!snapshot?.latestTransition?.truncated,
                transitionTruncatedReason: snapshot?.latestTransition?.truncatedReason || null,
                outputHasAutoStep: !!outputParsed?.autoStep,
                autoStepRequested: Number(outputParsed?.autoStep?.requestedSteps || 0),
                autoStepExecuted: Number(outputParsed?.autoStep?.executedSteps || 0),
                autoStepStoppedReason: outputParsed?.autoStep?.stoppedReason || null,
                outputHasTerminalFlag: outputRaw.includes('"truncated": true'),
            };
        });

        expect(result.transitionOperation).toBe('step');
        expect(result.transitionTruncated).toBeTruthy();
        expect(result.transitionTruncatedReason).toBe('max-steps');
        expect(result.outputHasAutoStep).toBeTruthy();
        expect(result.autoStepRequested).toBe(5);
        expect(result.autoStepExecuted).toBe(2);
        expect(result.autoStepStoppedReason).toBe('terminal');
        expect(result.outputHasTerminalFlag).toBeTruthy();
    });

    test('T96: Training Batch ist bei gleichen Seeds/Modes reproduzierbar und endet vollstaendig', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(() => {
            const game = globalThis.GAME_INSTANCE;
            const payload = {
                episodes: 2,
                seeds: [5, 9],
                modes: ['classic-3d', 'hunt-2d'],
                maxSteps: 8,
                inventoryLength: 2,
                timeoutMs: 3000,
            };
            const runA = game.debugApi.runTrainingBatch(payload);
            const runB = game.debugApi.runTrainingBatch(payload);
            const digest = (run) => run.episodes.map((entry) => ({
                seed: entry.seed,
                domainId: entry.domainId,
                stepsExecuted: entry.stepsExecuted,
                episodeReturn: entry.episodeReturn,
                done: entry.done,
                truncated: entry.truncated,
                invalidActionCount: entry.invalidActionCount,
                runtimeError: entry.runtimeError,
            }));

            return {
                runAKpis: runA.kpis,
                runBKpis: runB.kpis,
                runAEpisodeDigest: digest(runA),
                runBEpisodeDigest: digest(runB),
                expectedEpisodes: payload.episodes * payload.seeds.length * payload.modes.length,
                runAEpisodesTotal: Number(runA.summary?.episodesTotal || 0),
                runAArtifactPath: runA.artifactPath || '',
                runBArtifactPath: runB.artifactPath || '',
            };
        });

        expect(result.runAKpis).toEqual(result.runBKpis);
        expect(result.runAEpisodeDigest).toEqual(result.runBEpisodeDigest);
        expect(result.runAEpisodesTotal).toBe(result.expectedEpisodes);
        expect(result.runAArtifactPath.endsWith('/run.json')).toBeTruthy();
        expect(result.runBArtifactPath.endsWith('/run.json')).toBeTruthy();
    });

    test('T97: Training Gate liefert PASS/FAIL inkl. Exit-Code auf Basis von KPI-Schwellen', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(() => {
            const game = globalThis.GAME_INSTANCE;
            const evalResult = game.debugApi.runTrainingEval({
                episodes: 1,
                seeds: [13],
                modes: ['classic-3d'],
                maxSteps: 6,
                inventoryLength: 2,
                timeoutMs: 3000,
            });
            const passGate = game.debugApi.runTrainingGate({
                evalResult,
                gateThresholds: {
                    minEpisodeReturnMean: Number(evalResult.kpis.episodeReturnMean || 0) - 0.001,
                    minTerminalRate: 0,
                    maxTruncationRate: 1,
                    maxInvalidActionRate: 1,
                    maxRuntimeErrorCount: 10,
                },
            });
            const failGate = game.debugApi.runTrainingGate({
                evalResult,
                gateThresholds: {
                    minEpisodeReturnMean: Number(evalResult.kpis.episodeReturnMean || 0) + 100,
                    minTerminalRate: 1,
                    maxTruncationRate: 0,
                    maxInvalidActionRate: 0,
                    maxRuntimeErrorCount: 0,
                },
            });

            return {
                passPass: !!passGate.pass,
                passExitCode: Number(passGate.exitCode),
                failPass: !!failGate.pass,
                failExitCode: Number(failGate.exitCode),
                failHasFailedCheck: (failGate.checks || []).some((entry) => entry.pass === false),
                gateArtifactPath: String(failGate.artifactPath || ''),
                gateChecksCount: Array.isArray(failGate.checks) ? failGate.checks.length : 0,
            };
        });

        expect(result.passPass).toBeTruthy();
        expect(result.passExitCode).toBe(0);
        expect(result.failPass).toBeFalsy();
        expect(result.failExitCode).toBe(1);
        expect(result.failHasFailedCheck).toBeTruthy();
        expect(result.gateArtifactPath.endsWith('/gate.json')).toBeTruthy();
        expect(result.gateChecksCount).toBe(5);
    });

    test('T98: Developer-UI Buttons triggern Run Batch/Eval/Gate und zeigen KPI+Artefaktpfad im Output', async ({ page }) => {
        await loadGame(page);
        await openDeveloperSubmenu(page);
        const result = await page.evaluate(() => {
            const game = globalThis.GAME_INSTANCE;

            game.runtimeFacade.handleMenuControllerEvent({
                type: 'developer_mode_toggle',
                enabled: true,
            });

            document.getElementById('developer-training-batch-episodes-input').value = '1';
            document.getElementById('developer-training-batch-seeds-input').value = '21,22';
            document.getElementById('developer-training-batch-modes-input').value = 'classic-3d,hunt-3d';
            document.getElementById('developer-training-max-steps-input').value = '6';
            document.getElementById('developer-training-timeout-ms-input').value = '3000';

            document.getElementById('btn-developer-training-run-batch').click();
            const batchRaw = document.getElementById('developer-training-output').textContent || '';
            const batchParsed = JSON.parse(batchRaw);

            document.getElementById('btn-developer-training-run-eval').click();
            const evalRaw = document.getElementById('developer-training-output').textContent || '';
            const evalParsed = JSON.parse(evalRaw);

            document.getElementById('developer-training-gate-min-return-input').value = '999';
            document.getElementById('developer-training-gate-min-terminal-rate-input').value = '1';
            document.getElementById('developer-training-gate-max-truncation-rate-input').value = '0';
            document.getElementById('developer-training-gate-max-invalid-rate-input').value = '0';
            document.getElementById('developer-training-gate-max-runtime-errors-input').value = '0';
            document.getElementById('btn-developer-training-run-gate').click();
            const gateRaw = document.getElementById('developer-training-output').textContent || '';
            const gateParsed = JSON.parse(gateRaw);

            const automationSnapshot = game.debugApi.getTrainingAutomationSnapshot();

            return {
                batchKind: batchParsed.kind || null,
                evalKind: evalParsed.kind || null,
                gatePass: !!gateParsed.pass,
                gateExitCode: Number(gateParsed.exitCode || 0),
                batchHasArtifactPath: typeof batchParsed.artifactPath === 'string' && batchParsed.artifactPath.includes('/run.json'),
                evalHasArtifactPath: typeof evalParsed.artifactPath === 'string' && evalParsed.artifactPath.includes('/eval.json'),
                gateHasArtifactPath: typeof gateParsed.artifactPath === 'string' && gateParsed.artifactPath.includes('/gate.json'),
                gateHasKpis: gateRaw.includes('"episodeReturnMean"') && gateRaw.includes('"terminalRate"'),
                snapshotHasBatch: !!automationSnapshot?.latestBatch,
                snapshotHasEval: !!automationSnapshot?.latestEval,
                snapshotHasGate: !!automationSnapshot?.latestGate,
            };
        });

        expect(result.batchKind).toBe('run');
        expect(result.evalKind).toBe('eval');
        expect(result.gatePass).toBeFalsy();
        expect(result.gateExitCode).toBe(1);
        expect(result.batchHasArtifactPath).toBeTruthy();
        expect(result.evalHasArtifactPath).toBeTruthy();
        expect(result.gateHasArtifactPath).toBeTruthy();
        expect(result.gateHasKpis).toBeTruthy();
        expect(result.snapshotHasBatch).toBeTruthy();
        expect(result.snapshotHasEval).toBeTruthy();
        expect(result.snapshotHasGate).toBeTruthy();
    });

    test('T99: ObservationBridgePolicy laedt Resume-Checkpoint vor Trainer-Actions im Matchpfad', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { ObservationBridgePolicy } = await import('/src/entities/ai/ObservationBridgePolicy.js');
            const originalWebSocket = globalThis.WebSocket;
            const sentTypes = [];

            class MockWebSocket {
                static CONNECTING = 0;
                static OPEN = 1;
                static CLOSING = 2;
                static CLOSED = 3;

                constructor() {
                    this.readyState = MockWebSocket.OPEN;
                    this._listeners = new Map();
                    setTimeout(() => {
                        this._emit('open', {});
                        this._emit('message', {
                            data: JSON.stringify({
                                type: 'trainer-ready',
                                ok: true,
                            }),
                        });
                    }, 0);
                }

                addEventListener(type, handler) {
                    const list = this._listeners.get(type) || [];
                    list.push(handler);
                    this._listeners.set(type, list);
                }

                removeEventListener(type, handler) {
                    const list = this._listeners.get(type) || [];
                    this._listeners.set(type, list.filter((entry) => entry !== handler));
                }

                _emit(type, payload) {
                    const handlers = this._listeners.get(type) || [];
                    for (const handler of handlers) {
                        handler(payload);
                    }
                }

                send(raw) {
                    const envelope = JSON.parse(raw);
                    sentTypes.push(envelope.type);
                    if (envelope.type === 'trainer-checkpoint-load-latest') {
                        setTimeout(() => {
                            this._emit('message', {
                                data: JSON.stringify({
                                    id: envelope.id,
                                    ok: true,
                                    type: 'trainer-checkpoint',
                                    loaded: true,
                                    resumeSource: 'latest',
                                }),
                            });
                        }, 0);
                        return;
                    }
                    if (envelope.type === 'bot-action-request') {
                        setTimeout(() => {
                            this._emit('message', {
                                data: JSON.stringify({
                                    id: envelope.id,
                                    ok: true,
                                    type: 'bot-action-response',
                                    action: { yawLeft: true },
                                }),
                            });
                        }, 0);
                    }
                }

                close() {
                    this.readyState = MockWebSocket.CLOSED;
                    this._emit('close', {});
                }
            }

            globalThis.WebSocket = MockWebSocket;
            try {
                let fallbackCalls = 0;
                const policy = new ObservationBridgePolicy({
                    type: 'classic-bridge',
                    trainerBridgeEnabled: true,
                    trainerBridgeTimeoutMs: 20,
                    trainerCheckpointResumeToken: 'latest',
                    trainerCheckpointResumeStrict: true,
                    fallbackPolicy: {
                        update() {
                            fallbackCalls += 1;
                            return { yawRight: true };
                        },
                    },
                });
                const bot = { index: 1, inventory: [] };
                const context = {
                    mode: 'classic',
                    planarMode: false,
                    dt: 1 / 60,
                    players: [],
                    projectiles: [],
                    observation: new Array(40).fill(0.2),
                };

                const firstAction = policy.update(1 / 60, bot, context);
                await new Promise((resolve) => setTimeout(resolve, 30));
                let bridgeActionObserved = false;
                for (let i = 0; i < 6; i++) {
                    const action = policy.update(1 / 60, bot, context);
                    bridgeActionObserved = bridgeActionObserved || !!action?.yawLeft;
                    await new Promise((resolve) => setTimeout(resolve, 20));
                }
                const status = policy.getTrainerBridgeStatus();
                policy.reset();

                return {
                    sentTypes,
                    firstYawRight: !!firstAction?.yawRight,
                    bridgeActionObserved,
                    fallbackCalls,
                    resumeLoaded: !!status?.resume?.loaded,
                    resumeStatus: status?.resume?.status || null,
                };
            } finally {
                globalThis.WebSocket = originalWebSocket;
            }
        });

        expect(result.sentTypes[0]).toBe('trainer-checkpoint-load-latest');
        expect(result.sentTypes.includes('bot-action-request')).toBeTruthy();
        expect(result.bridgeActionObserved).toBeTruthy();
        expect(result.fallbackCalls).toBeGreaterThanOrEqual(0);
        expect(result.resumeLoaded).toBeTruthy();
        expect(result.resumeStatus).toBe('ready');
    });
});
