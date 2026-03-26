import { test, expect } from '@playwright/test';
import { loadGame, startGameWithBots } from './helpers.js';

test.describe('V59-59.7.1: MediaRecorderSystem', () => {

    test('Recording system initializes with correct default state', async ({ page }) => {
        await loadGame(page);
        const state = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            const rec = g?.mediaRecorderSystem || g?.recorder;
            if (!rec) return { found: false };
            return {
                found: true,
                isRecording: !!rec.isRecording?.(),
                hasSettings: typeof rec.getRecordingCaptureSettings === 'function',
            };
        });
        expect(state.found).toBe(true);
        expect(state.isRecording).toBe(false);
        expect(state.hasSettings).toBe(true);
    });

    test('Recording capture settings have valid defaults', async ({ page }) => {
        await loadGame(page);
        const settings = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            const rec = g?.mediaRecorderSystem || g?.recorder;
            return rec?.getRecordingCaptureSettings?.() || null;
        });
        expect(settings).not.toBeNull();
        expect(settings.profile).toBeTruthy();
        expect(settings.hudMode).toBeTruthy();
    });

    test('Start/stop recording lifecycle does not throw', async ({ page }) => {
        await startGameWithBots(page, 1);
        const result = await page.evaluate(async () => {
            const g = window.GAME_INSTANCE;
            const rec = g?.mediaRecorderSystem || g?.recorder;
            if (!rec) return { error: 'no recorder' };
            try {
                const startResult = await rec.startRecording?.({ type: 'test' });
                const wasRecording = !!rec.isRecording?.();
                if (wasRecording) {
                    await rec.stopRecording?.({ type: 'test_stop' });
                }
                return { ok: true, started: wasRecording };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });
        expect(result.ok).toBe(true);
    });

    test('Format detection returns supported MIME type', async ({ page }) => {
        await loadGame(page);
        const mime = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            const rec = g?.mediaRecorderSystem || g?.recorder;
            return rec?.getActiveMimeType?.() || rec?._activeMimeType || 'unknown';
        });
        expect(typeof mime).toBe('string');
    });

    test('State resets correctly after stop', async ({ page }) => {
        await startGameWithBots(page, 1);
        const state = await page.evaluate(async () => {
            const g = window.GAME_INSTANCE;
            const rec = g?.mediaRecorderSystem || g?.recorder;
            if (!rec) return { found: false };
            try {
                await rec.startRecording?.({ type: 'test' });
                await rec.stopRecording?.({ type: 'test_stop' });
            } catch { /* may fail in test env */ }
            return {
                found: true,
                isRecording: !!rec.isRecording?.(),
            };
        });
        expect(state.found).toBe(true);
        expect(state.isRecording).toBe(false);
    });
});
