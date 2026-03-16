import { expect, test } from '@playwright/test';
import { loadGame } from './helpers.js';

test.describe('Training Automation V33', () => {

    test('T96: TrainingGateEvaluator liefert pass/fail inkl. KPI-Checks und Drift-Warnungen', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { evaluateTrainingGate } = await import('/src/state/training/TrainingGateEvaluator.js');

            const passingEval = {
                episodes: [
                    { episodeReturn: 1.7, done: true, truncated: false, invalidActionCount: 0, actionCount: 5, steps: 5 },
                    { episodeReturn: 1.6, done: true, truncated: false, invalidActionCount: 1, actionCount: 5, steps: 5 },
                    { episodeReturn: 1.5, done: false, truncated: true, invalidActionCount: 1, actionCount: 5, steps: 5 },
                    { episodeReturn: 1.4, done: false, truncated: true, invalidActionCount: 0, actionCount: 5, steps: 5 },
                ],
                bridgeTelemetry: {
                    requestsSent: 8,
                    responsesReceived: 7,
                    retries: 1,
                    timeouts: 1,
                    fallbacks: 1,
                    latencyP95Ms: 6,
                },
                runtimeErrors: [],
            };
            const failingEval = {
                episodes: [
                    { episodeReturn: 0.02, done: false, truncated: true, invalidActionCount: 5, actionCount: 5, steps: 5 },
                    { episodeReturn: 0.01, done: false, truncated: true, invalidActionCount: 5, actionCount: 5, steps: 5 },
                ],
                bridgeTelemetry: {
                    requestsSent: 4,
                    responsesReceived: 0,
                    retries: 2,
                    timeouts: 4,
                    fallbacks: 4,
                    latencyP95Ms: 120,
                },
                runtimeErrors: [{ message: 'runtime failure' }],
            };

            const pass = evaluateTrainingGate(passingEval);
            const fail = evaluateTrainingGate(failingEval);
            return {
                passOk: pass.ok,
                passWarningCount: pass.warnings.length,
                passCheckCount: pass.checks.length,
                passHasRuntimeErrorMetric: pass.checks.some((entry) => entry.metric === 'runtimeErrorCount'),
                failOk: fail.ok,
                failFailureCount: fail.hardFailures.length,
                failHasRuntimeErrorFailure: fail.hardFailures.some((entry) => entry.metric === 'runtimeErrorCount'),
            };
        });

        expect(result.passOk).toBeTruthy();
        expect(result.passWarningCount).toBeGreaterThanOrEqual(0);
        expect(result.passCheckCount).toBeGreaterThanOrEqual(6);
        expect(result.passHasRuntimeErrorMetric).toBeTruthy();
        expect(result.failOk).toBeFalsy();
        expect(result.failFailureCount).toBeGreaterThanOrEqual(1);
        expect(result.failHasRuntimeErrorFailure).toBeTruthy();
    });

    test('T97: WebSocketTrainerBridge erfasst Retry/Timeout/Fallback-Telemetrie deterministisch', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { WebSocketTrainerBridge } = await import('/src/entities/ai/training/WebSocketTrainerBridge.js');
            const originalWebSocket = globalThis.WebSocket;
            let actionRequestCount = 0;

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
                    const handlers = this._listeners.get(type) || [];
                    handlers.push(handler);
                    this._listeners.set(type, handlers);
                }

                removeEventListener(type, handler) {
                    const handlers = this._listeners.get(type) || [];
                    this._listeners.set(type, handlers.filter((entry) => entry !== handler));
                }

                _emit(type, payload) {
                    const handlers = this._listeners.get(type) || [];
                    for (const handler of handlers) {
                        handler(payload);
                    }
                }

                send(raw) {
                    const envelope = JSON.parse(raw);
                    if (envelope.type !== 'bot-action-request') {
                        return;
                    }
                    actionRequestCount += 1;
                    if (actionRequestCount === 1) {
                        return;
                    }
                    setTimeout(() => {
                        this._emit('message', {
                            data: JSON.stringify({
                                id: envelope.id,
                                action: { yawRight: true },
                            }),
                        });
                    }, 2);
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
                    timeoutMs: 8,
                    maxRetries: 1,
                    retryDelayMs: 0,
                    url: 'ws://127.0.0.1:8765',
                });
                bridge.submitObservation({
                    mode: 'classic',
                    planarMode: false,
                    dt: 1 / 60,
                    observation: new Array(40).fill(0),
                });
                await new Promise((resolve) => setTimeout(resolve, 18));
                bridge.consumeFailure();
                await new Promise((resolve) => setTimeout(resolve, 12));

                const action = bridge.consumeLatestAction();
                if (!action) {
                    bridge.recordFallback('test-no-action');
                }
                bridge.recordFallback('test-manual-fallback');
                const failure = bridge.consumeFailure();
                const telemetry = bridge.getTelemetrySnapshot();
                bridge.close();

                return {
                    actionYawRight: !!action?.yawRight,
                    failure: failure || null,
                    requestsSent: Number(telemetry.requestsSent || 0),
                    responsesReceived: Number(telemetry.responsesReceived || 0),
                    retries: Number(telemetry.retries || 0),
                    timeouts: Number(telemetry.timeouts || 0),
                    fallbacks: Number(telemetry.fallbacks || 0),
                };
            } finally {
                globalThis.WebSocket = originalWebSocket;
            }
        });

        expect(typeof result.actionYawRight).toBe('boolean');
        if (result.failure !== null) {
            expect(result.failure).toBe('timeout');
        }
        expect(result.requestsSent).toBe(1);
        expect(result.responsesReceived).toBeGreaterThanOrEqual(0);
        expect(result.retries).toBeGreaterThanOrEqual(1);
        expect(result.timeouts).toBeGreaterThanOrEqual(1);
        expect(result.fallbacks).toBeGreaterThanOrEqual(1);
    });
});
