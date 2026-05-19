import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { _electron as electron } from '@playwright/test';

const require = createRequire(import.meta.url);
const ELECTRON_EXECUTABLE = require('../electron/node_modules/electron');

test('map tools Electron shell loads Plan Map and switches to Repo Map', async (t) => {
  const app = await electron.launch({
    executablePath: ELECTRON_EXECUTABLE,
    args: [path.resolve('electron/map-tools/main.cjs')],
    cwd: process.cwd(),
    env: {
      ...process.env,
      CURVIOS_ELECTRON_SHOW_WINDOW: String(process.env.CURVIOS_ELECTRON_SHOW_WINDOW || '0'),
      CURVIOS_NODE_EXECUTABLE: process.execPath,
    },
  });

  t.after(async () => {
    await app.close().catch(() => {});
  });

  const page = await app.firstWindow({ timeout: 60_000 });
  await page.waitForSelector('[data-testid="map-tools-shell"]', { timeout: 60_000 });
  await page.waitForFunction(() => globalThis.__CURVIOS_MAP_TOOLS__ === true);

  const initialState = await page.evaluate(() => ({
    hasApi: !!globalThis.mapToolsApi,
    contractVersion: globalThis.mapToolsApi?.contractVersion,
    activeLabel: document.querySelector('#activeViewLabel')?.textContent,
    frameSrc: document.querySelector('#mapFrame')?.getAttribute('src'),
    errorVisible: !document.querySelector('#errorPanel')?.hidden,
  }));

  assert.equal(initialState.hasApi, true);
  assert.equal(initialState.contractVersion, 'map-tools-preload.v1');
  assert.equal(initialState.activeLabel, 'Plan Map');
  assert.match(initialState.frameSrc || '', /\/tools\/plan-map\/index\.html/);
  assert.equal(initialState.errorVisible, false);

  await page.locator('[data-view-id="repo"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#activeViewLabel')?.textContent === 'Repo Map'
    && /\/tools\/repo-map\/index\.html/.test(document.querySelector('#mapFrame')?.getAttribute('src') || '')
  ), null, { timeout: 60_000 });

  const repoState = await page.evaluate(() => ({
    activeLabel: document.querySelector('#activeViewLabel')?.textContent,
    frameSrc: document.querySelector('#mapFrame')?.getAttribute('src'),
    status: document.querySelector('#refreshStatus')?.textContent,
  }));

  assert.equal(repoState.activeLabel, 'Repo Map');
  assert.match(repoState.frameSrc || '', /\/tools\/repo-map\/index\.html/);
  assert.ok(String(repoState.status || '').length > 0);
});
