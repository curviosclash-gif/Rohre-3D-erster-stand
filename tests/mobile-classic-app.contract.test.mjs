import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createRendererBuildDefines,
  createRendererShellBuildConfig,
} from '../dev/vite/rendererShellConfig.js';
import {
  applyMobileClassicSettings,
  isMobileClassicTargetValue,
} from '../src/mobile-classic/MobileClassicApp.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

test('Mobile Classic Capacitor wrapper is separate from Map Tools Android', async () => {
  const config = await readJson('tools/mobile-classic-app/capacitor.config.json');

  assert.equal(config.appId, 'de.curviosclash.classic');
  assert.equal(config.appName, 'Curvios Clash Classic');
  assert.equal(config.webDir, '../../dist/mobile-classic');
  assert.equal(config.android.path, '../../android-classic');

  const mapToolsConfig = await readJson('capacitor.config.json');
  assert.equal(mapToolsConfig.appId, 'de.curviosclash.maps');
  assert.equal(mapToolsConfig.webDir, 'dist/map-tools-android');
});

test('Mobile Classic build target emits only the game shell into its own dist path', () => {
  const config = createRendererShellBuildConfig({
    rootDir: root,
    chunkSizeWarningLimit: 1300,
    env: {
      VITE_APP_MODE: 'app',
      VITE_APP_TARGET: 'mobile-classic',
    },
  });

  assert.equal(config.outDir, 'dist/mobile-classic');
  assert.deepEqual(Object.keys(config.rollupOptions.input), ['app']);
  assert.match(config.rollupOptions.input.app, /index\.html$/);

  const defines = createRendererBuildDefines({
    pkgVersion: '0.0.0-test',
    buildTime: 'test',
    buildId: 'test',
    env: {
      VITE_APP_MODE: 'app',
      VITE_APP_TARGET: 'mobile-classic',
    },
  });
  assert.equal(defines.__APP_MODE__, '"app"');
  assert.equal(defines.__APP_TARGET__, '"mobile-classic"');
});

test('Mobile Classic runtime guard forces single-player classic settings', () => {
  const settings = {
    mode: '2p',
    gameMode: 'HUNT',
    localSettings: {
      sessionType: 'multiplayer',
      modePath: 'fight',
    },
    gameplay: {
      planarMode: true,
    },
    hunt: {
      respawnEnabled: true,
    },
  };

  assert.equal(isMobileClassicTargetValue('mobile-classic'), true);
  assert.equal(isMobileClassicTargetValue('app'), false);

  applyMobileClassicSettings(settings);

  assert.equal(settings.mode, '1p');
  assert.equal(settings.gameMode, 'CLASSIC');
  assert.equal(settings.localSettings.sessionType, 'single');
  assert.equal(settings.localSettings.modePath, 'normal');
  assert.equal(settings.gameplay.planarMode, false);
  assert.equal(settings.hunt.respawnEnabled, false);
});

test('Mobile Classic scripts build, wrap, and validate the phone app path', async () => {
  const packageJson = await readJson('package.json');
  const buildScript = await readText('scripts/build-mobile-classic-app.mjs');
  const capacitorScript = await readText('scripts/capacitor-mobile-classic.mjs');

  assert.equal(packageJson.scripts['app:classic:android:build'], 'node scripts/build-mobile-classic-app.mjs');
  assert.equal(packageJson.scripts['app:classic:android:check'], 'node --test tests/mobile-classic-app.contract.test.mjs');
  assert.equal(packageJson.scripts['app:classic:android:sync'], 'node scripts/capacitor-mobile-classic.mjs sync');
  assert.match(buildScript, /VITE_APP_TARGET = 'mobile-classic'/);
  assert.match(buildScript, /mobile-classic\.manifest\.json/);
  assert.match(capacitorScript, /tools', 'mobile-classic-app'/);
  assert.match(capacitorScript, /@capacitor', 'cli', 'bin', 'capacitor'/);
});
