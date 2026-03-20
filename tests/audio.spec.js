import { test, expect } from '@playwright/test';

async function openAudioSandbox(page) {
    await page.goto('/docs/ai_project_onboarding.md', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
    });
}

test.describe('AudioManager (N10)', () => {
    test('A01: registers and disposes init/mute listeners', async ({ page }) => {
        await openAudioSandbox(page);
        const result = await page.evaluate(async () => {
            const moduleTag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const { AudioManager } = await import(`/src/core/Audio.js?audio-spec-${moduleTag}`);

            const originalAdd = window.addEventListener;
            const originalRemove = window.removeEventListener;
            const added = [];
            const removed = [];

            window.addEventListener = function patchedAddEventListener(type, listener, options) {
                added.push({ type, listener });
                return originalAdd.call(this, type, listener, options);
            };
            window.removeEventListener = function patchedRemoveEventListener(type, listener, options) {
                removed.push({ type, listener });
                return originalRemove.call(this, type, listener, options);
            };

            let audio = null;
            try {
                audio = new AudioManager();
                const initHandler = audio._onInitInteraction;
                const muteHandler = audio._onMuteToggle;
                const addedInitTypes = added
                    .filter((entry) => entry.listener === initHandler)
                    .map((entry) => entry.type)
                    .sort();
                const addedMuteTypes = added
                    .filter((entry) => entry.listener === muteHandler)
                    .map((entry) => entry.type)
                    .sort();

                audio.dispose();

                const removedInitTypes = removed
                    .filter((entry) => entry.listener === initHandler)
                    .map((entry) => entry.type)
                    .sort();
                const removedMuteTypes = removed
                    .filter((entry) => entry.listener === muteHandler)
                    .map((entry) => entry.type)
                    .sort();
                return {
                    addedInitTypes,
                    addedMuteTypes,
                    removedInitTypes,
                    removedMuteTypes,
                };
            } finally {
                if (audio) {
                    audio.dispose();
                }
                window.addEventListener = originalAdd;
                window.removeEventListener = originalRemove;
            }
        });

        expect(result.addedInitTypes).toEqual(['click', 'keydown', 'touchstart']);
        expect(result.addedMuteTypes).toEqual(['keydown']);
        expect(result.removedInitTypes).toEqual(['click', 'keydown', 'touchstart']);
        expect(result.removedMuteTypes).toEqual(['keydown']);
    });

    test('A02: init failure activates silent fallback and warning', async ({ page }) => {
        await openAudioSandbox(page);
        const result = await page.evaluate(async () => {
            const moduleTag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const { AudioManager } = await import(`/src/core/Audio.js?audio-spec-${moduleTag}`);

            const originalAudioContextDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
            const originalWebkitDescriptor = Object.getOwnPropertyDescriptor(window, 'webkitAudioContext');
            const originalWarn = console.warn;
            const warnings = [];

            Object.defineProperty(window, 'AudioContext', {
                configurable: true,
                writable: true,
                value: class ThrowingAudioContext {
                    constructor() {
                        throw new Error('audio-init-boom');
                    }
                },
            });
            Object.defineProperty(window, 'webkitAudioContext', {
                configurable: true,
                writable: true,
                value: undefined,
            });
            console.warn = (...args) => {
                warnings.push(args.map((value) => String(value)).join(' '));
            };

            let audio = null;
            try {
                audio = new AudioManager();
                window.dispatchEvent(new Event('click'));
                return {
                    enabled: audio.enabled,
                    hasContext: !!audio.ctx,
                    initFailed: audio._audioInitFailed === true,
                    warningCount: warnings.length,
                    warningText: warnings[0] || '',
                };
            } finally {
                if (audio) {
                    audio.dispose();
                }
                console.warn = originalWarn;
                if (originalAudioContextDescriptor) {
                    Object.defineProperty(window, 'AudioContext', originalAudioContextDescriptor);
                } else {
                    delete window.AudioContext;
                }
                if (originalWebkitDescriptor) {
                    Object.defineProperty(window, 'webkitAudioContext', originalWebkitDescriptor);
                } else {
                    delete window.webkitAudioContext;
                }
            }
        });

        expect(result.enabled).toBe(false);
        expect(result.hasContext).toBe(false);
        expect(result.initFailed).toBe(true);
        expect(result.warningCount).toBeGreaterThan(0);
        expect(result.warningText).toContain('AudioContext initialization failed');
    });

    test('A03: mute toggle avoids console.log and uses dev debug path', async ({ page }) => {
        await openAudioSandbox(page);
        const result = await page.evaluate(async () => {
            const moduleTag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const { AudioManager } = await import(`/src/core/Audio.js?audio-spec-${moduleTag}`);

            const originalLog = console.log;
            const originalDebug = console.debug;
            let logCalls = 0;
            let debugCalls = 0;
            console.log = () => {
                logCalls += 1;
            };
            console.debug = () => {
                debugCalls += 1;
            };

            let audio = null;
            try {
                audio = new AudioManager();
                const initialEnabled = audio.enabled;
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', bubbles: true }));
                return {
                    initialEnabled,
                    enabledAfterToggle: audio.enabled,
                    logCalls,
                    debugCalls,
                    isDevEnvironment: audio._isDevEnvironment === true,
                };
            } finally {
                if (audio) {
                    audio.dispose();
                }
                console.log = originalLog;
                console.debug = originalDebug;
            }
        });

        expect(result.initialEnabled).toBe(true);
        expect(result.enabledAfterToggle).toBe(false);
        expect(result.logCalls).toBe(0);
        if (result.isDevEnvironment) {
            expect(result.debugCalls).toBeGreaterThan(0);
        } else {
            expect(result.debugCalls).toBe(0);
        }
    });

    test('A04: play respects cooldown throttling', async ({ page }) => {
        await openAudioSandbox(page);
        const result = await page.evaluate(async () => {
            const moduleTag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const { AudioManager } = await import(`/src/core/Audio.js?audio-spec-${moduleTag}`);

            const audio = new AudioManager();
            let now = 1_000;
            let playCalls = 0;

            audio.ctx = {
                state: 'running',
                resume() { },
                close() {
                    return Promise.resolve();
                },
            };
            audio._resolveTime = () => now;
            audio._playShoot = () => {
                playCalls += 1;
            };

            audio.play('SHOOT');
            audio.play('SHOOT');
            now += audio.cooldowns.SHOOT;
            audio.play('SHOOT');

            const recorded = audio.getRecentEvents(5).map((event) => event.type);
            audio.dispose();
            return {
                playCalls,
                cooldownShoot: audio.cooldowns.SHOOT,
                recorded,
            };
        });

        expect(result.cooldownShoot).toBe(100);
        expect(result.playCalls).toBe(2);
        expect(result.recorded).toEqual(['SHOOT', 'SHOOT']);
    });

    test('A05: successful first interaction initializes once and removes init listeners', async ({ page }) => {
        await openAudioSandbox(page);
        const result = await page.evaluate(async () => {
            const moduleTag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const { AudioManager } = await import(`/src/core/Audio.js?audio-spec-${moduleTag}`);

            const originalAudioContextDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
            const originalWebkitDescriptor = Object.getOwnPropertyDescriptor(window, 'webkitAudioContext');
            const originalRemove = window.removeEventListener;
            const removed = [];
            let constructorCalls = 0;
            let closeCalls = 0;

            class MockAudioContext {
                constructor() {
                    constructorCalls += 1;
                    this.sampleRate = 44_100;
                    this.currentTime = 0;
                    this.state = 'running';
                    this.destination = {};
                }

                createBuffer(channels, bufferSize) {
                    return {
                        numberOfChannels: channels,
                        length: bufferSize,
                        getChannelData() {
                            return new Float32Array(bufferSize);
                        },
                    };
                }

                close() {
                    closeCalls += 1;
                    return Promise.resolve();
                }
            }

            Object.defineProperty(window, 'AudioContext', {
                configurable: true,
                writable: true,
                value: MockAudioContext,
            });
            Object.defineProperty(window, 'webkitAudioContext', {
                configurable: true,
                writable: true,
                value: undefined,
            });

            window.removeEventListener = function patchedRemoveEventListener(type, listener, options) {
                removed.push({ type, listener });
                return originalRemove.call(this, type, listener, options);
            };

            let audio = null;
            try {
                audio = new AudioManager();
                const initHandler = audio._onInitInteraction;
                window.dispatchEvent(new Event('click'));
                window.dispatchEvent(new Event('click'));

                const removedInitTypes = removed
                    .filter((entry) => entry.listener === initHandler)
                    .map((entry) => entry.type)
                    .sort();
                const hasExplosionBuffer = !!audio.buffers.explosion;

                audio.dispose();
                return {
                    constructorCalls,
                    closeCalls,
                    removedInitTypes,
                    hasExplosionBuffer,
                };
            } finally {
                if (audio) {
                    audio.dispose();
                }
                window.removeEventListener = originalRemove;
                if (originalAudioContextDescriptor) {
                    Object.defineProperty(window, 'AudioContext', originalAudioContextDescriptor);
                } else {
                    delete window.AudioContext;
                }
                if (originalWebkitDescriptor) {
                    Object.defineProperty(window, 'webkitAudioContext', originalWebkitDescriptor);
                } else {
                    delete window.webkitAudioContext;
                }
            }
        });

        expect(result.constructorCalls).toBe(1);
        expect(result.closeCalls).toBeGreaterThanOrEqual(1);
        expect(result.removedInitTypes).toEqual(['click', 'keydown', 'touchstart']);
        expect(result.hasExplosionBuffer).toBe(true);
    });
});
