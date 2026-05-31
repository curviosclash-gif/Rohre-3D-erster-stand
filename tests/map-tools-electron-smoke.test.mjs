import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { _electron as electron } from '@playwright/test';

const require = createRequire(import.meta.url);
const ELECTRON_EXECUTABLE = require('../electron/node_modules/electron');

test('map tools Electron shell loads Plan Map and switches between Repo Map and Agent Map', async (t) => {
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
    layout: (() => {
      const shell = document.querySelector('[data-testid="map-tools-shell"]')?.getBoundingClientRect();
      const stage = document.querySelector('.viewer-stage')?.getBoundingClientRect();
      const frame = document.querySelector('#mapFrame')?.getBoundingClientRect();
      return {
        shellHeight: shell?.height || 0,
        stageHeight: stage?.height || 0,
        frameHeight: frame?.height || 0,
      };
    })(),
  }));

  assert.equal(initialState.hasApi, true);
  assert.equal(initialState.contractVersion, 'map-tools-preload.v1');
  assert.equal(initialState.activeLabel, 'Plan Map');
  assert.match(initialState.frameSrc || '', /\/tools\/plan-map\/index\.html/);
  assert.equal(initialState.errorVisible, false);
  assert.ok(
    initialState.layout.stageHeight > 500,
    `viewer stage collapsed: ${JSON.stringify(initialState.layout)}`,
  );
  assert.ok(
    Math.abs(initialState.layout.stageHeight - initialState.layout.frameHeight) <= 2,
    `iframe does not fill viewer stage: ${JSON.stringify(initialState.layout)}`,
  );
  await page.locator('#editorToggle').click();
  await page.waitForFunction(() => document.querySelector('#markdownEditor')?.hidden === false);
  const editorState = await page.evaluate(() => ({
    visible: document.querySelector('#markdownEditor')?.hidden === false,
    optionCount: document.querySelectorAll('#markdownPath option').length,
    selectedPath: document.querySelector('#markdownPath')?.value,
    contentLength: document.querySelector('#markdownContent')?.value.length || 0,
  }));
  assert.equal(editorState.visible, true);
  assert.ok(editorState.optionCount >= 10);
  assert.ok(editorState.selectedPath);
  assert.ok(editorState.contentLength > 0);
  await page.locator('#editorClose').click();
  await page.waitForFunction(() => document.querySelector('#markdownEditor')?.hidden === true);

  await page.locator('[data-view-id="repo"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#activeViewLabel')?.textContent === 'Repo Map'
    && /\/tools\/repo-map\/index\.html/.test(document.querySelector('#mapFrame')?.getAttribute('src') || '')
  ), null, { timeout: 60_000 });

  const repoState = await page.evaluate(() => ({
    activeLabel: document.querySelector('#activeViewLabel')?.textContent,
    frameSrc: document.querySelector('#mapFrame')?.getAttribute('src'),
    status: document.querySelector('#refreshStatus')?.textContent,
    layout: (() => {
      const stage = document.querySelector('.viewer-stage')?.getBoundingClientRect();
      const frame = document.querySelector('#mapFrame')?.getBoundingClientRect();
      return {
        stageHeight: stage?.height || 0,
        frameHeight: frame?.height || 0,
      };
    })(),
  }));

  assert.equal(repoState.activeLabel, 'Repo Map');
  assert.match(repoState.frameSrc || '', /\/tools\/repo-map\/index\.html/);
  assert.ok(String(repoState.status || '').length > 0);
  assert.ok(
    repoState.layout.stageHeight > 500,
    `repo viewer stage collapsed: ${JSON.stringify(repoState.layout)}`,
  );
  assert.ok(
    Math.abs(repoState.layout.stageHeight - repoState.layout.frameHeight) <= 2,
    `repo iframe does not fill viewer stage: ${JSON.stringify(repoState.layout)}`,
  );

  await page.locator('[data-view-id="agent"]').click();
  await page.waitForFunction(() => (
    document.querySelector('#activeViewLabel')?.textContent === 'Agent Map'
    && /\/tools\/agent-map\/index\.html/.test(document.querySelector('#mapFrame')?.getAttribute('src') || '')
  ), null, { timeout: 60_000 });

  const agentState = await page.evaluate(() => ({
    activeLabel: document.querySelector('#activeViewLabel')?.textContent,
    frameSrc: document.querySelector('#mapFrame')?.getAttribute('src'),
    layout: (() => {
      const stage = document.querySelector('.viewer-stage')?.getBoundingClientRect();
      const frame = document.querySelector('#mapFrame')?.getBoundingClientRect();
      return {
        stageHeight: stage?.height || 0,
        frameHeight: frame?.height || 0,
      };
    })(),
  }));

  assert.equal(agentState.activeLabel, 'Agent Map');
  assert.match(agentState.frameSrc || '', /\/tools\/agent-map\/index\.html/);
  assert.ok(
    agentState.layout.stageHeight > 500,
    `agent viewer stage collapsed: ${JSON.stringify(agentState.layout)}`,
  );
  assert.ok(
    Math.abs(agentState.layout.stageHeight - agentState.layout.frameHeight) <= 2,
    `agent iframe does not fill viewer stage: ${JSON.stringify(agentState.layout)}`,
  );
});
