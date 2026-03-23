import { test, expect } from '@playwright/test';
import { loadGame, selectSessionType } from './helpers.js';

test('diag: shorts capture canvas has non-black pixels', async ({ page }) => {
    await loadGame(page);
    await selectSessionType(page, 'splitscreen');
    await page.click('#submenu-custom:not(.hidden) [data-mode-path="normal"]');
    await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
    await page.click('#submenu-game:not(.hidden) #btn-start');
    await page.waitForFunction(() => {
        const hud = document.getElementById('hud');
        const g = window.GAME_INSTANCE;
        return !!(hud && !hud.classList.contains('hidden') && g?.entityManager?.players?.length > 1);
    }, null, { timeout: 60000 });

    const probe = await page.evaluate(() => {
        const g = window.GAME_INSTANCE;
        if (!g?.renderer || !g?.entityManager) return null;

        g.settings.recording = { profile: 'youtube_short', hudMode: 'clean' };
        g._onSettingsChanged({ changedKeys: ['recording.profile', 'recording.hudMode'] });

        for (let i = 0; i < 8; i += 1) {
            g.renderer.prepareRecordingCaptureFrame({
                recordingActive: true,
                entityManager: g.entityManager,
                renderAlpha: 1,
                renderDelta: 1 / 60,
                splitScreen: true,
            });
        }

        const canvas = g.renderer.getRecordingCaptureCanvas?.();
        if (!canvas) return null;
        const ctx = canvas.getContext?.('2d', { willReadFrequently: true }) || null;
        if (!ctx) {
            return {
                width: Number(canvas.width || 0),
                height: Number(canvas.height || 0),
                error: 'no-2d-context',
            };
        }

        const width = Math.max(2, Number(canvas.width || 0));
        const height = Math.max(2, Number(canvas.height || 0));
        const image = ctx.getImageData(0, 0, width, height);
        const data = image.data;

        let sampleCount = 0;
        let lumaSum = 0;
        let maxLuma = 0;
        let nonBlackPixels = 0;
        const step = Math.max(4, Math.floor(Math.min(width, height) / 90));
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const idx = ((y * width) + x) * 4;
                const r = data[idx] || 0;
                const gCh = data[idx + 1] || 0;
                const b = data[idx + 2] || 0;
                const a = data[idx + 3] || 0;
                const luma = (0.2126 * r) + (0.7152 * gCh) + (0.0722 * b);
                sampleCount += 1;
                lumaSum += luma;
                if (luma > maxLuma) maxLuma = luma;
                if (a > 0 && luma > 6) nonBlackPixels += 1;
            }
        }

        return {
            width,
            height,
            sampleCount,
            avgLuma: sampleCount > 0 ? (lumaSum / sampleCount) : 0,
            maxLuma,
            nonBlackRatio: sampleCount > 0 ? (nonBlackPixels / sampleCount) : 0,
            meta: g.renderer.getLastRecordingCaptureMeta?.() || null,
            recorderEngine: g.mediaRecorderSystem?.getSupportState?.()?.recorderEngine || null,
        };
    });

    expect(probe).not.toBeNull();
    expect(probe.width).toBeGreaterThan(100);
    expect(probe.height).toBeGreaterThan(100);
    expect(probe.meta?.layout).toBe('shorts_vertical_split');
    expect(probe.maxLuma).toBeGreaterThan(10);
    expect(probe.avgLuma).toBeGreaterThan(3);
    expect(probe.nonBlackRatio).toBeGreaterThan(0.02);
});
