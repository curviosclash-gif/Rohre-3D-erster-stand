import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  classifyCoveragePath,
} from '../scripts/build-knowledge-graph.mjs';
import {
  createRendererBuildDefines,
  createRendererShellBuildConfig,
} from '../dev/vite/rendererShellConfig.js';
import { pruneMobileClassicHtml } from '../scripts/build-mobile-classic-app.mjs';
import {
  applyMobileClassicSettings,
  isMobileClassicTargetValue,
} from '../src/mobile-classic/MobileClassicApp.js';
import { createPreferredMatchInputSource } from '../src/ui/MatchInputSourceResolver.js';
import {
  createMobileClassicGithubUpdateConfig,
  MOBILE_CLASSIC_FALLBACK_GITHUB_REPOSITORY,
  normalizeMobileClassicGithubRepository,
  normalizeMobileClassicUpdateConfig,
} from '../src/mobile-classic/MobileClassicUpdateConfig.js';
import {
  deriveTiltSteeringState,
  resolveTouchButtonDefinitions,
  resolveTiltCalibrationNeutral,
  TouchInputSource,
  TOUCH_CONTROL_MODES,
} from '../src/ui/TouchInputSource.js';
import { PlayerController } from '../src/entities/player/PlayerController.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

function withGlobalValue(name, value, fn) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
  try {
    return fn();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete globalThis[name];
    }
  }
}

test('Mobile Classic Capacitor wrapper is separate from Map Tools Android', async () => {
  const config = await readJson('tools/mobile-classic-app/capacitor.config.json');
  const subprojectPackage = await readJson('tools/mobile-classic-app/package.json');

  assert.equal(config.appId, 'de.curviosclash.classic');
  assert.equal(config.appName, 'Curvios Clash Classic');
  assert.equal(config.webDir, '../../dist/mobile-classic');
  assert.equal(config.android.path, '../../android-classic');
  assert.equal(subprojectPackage.private, true);
  assert.equal(subprojectPackage.dependencies['@capacitor/android'], '8.3.4');
  assert.equal(subprojectPackage.dependencies['@capacitor/core'], '8.3.4');

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

test('Mobile Classic GitHub update config resolves repository metadata', () => {
  assert.equal(
    normalizeMobileClassicGithubRepository('git@github.com:curvios/repo.git'),
    'curvios/repo',
  );
  assert.equal(
    normalizeMobileClassicGithubRepository('https://github.com/curvios/repo.git'),
    'curvios/repo',
  );
  assert.equal(
    normalizeMobileClassicGithubRepository('not-a-repo'),
    MOBILE_CLASSIC_FALLBACK_GITHUB_REPOSITORY,
  );

  const config = createMobileClassicGithubUpdateConfig('curvios/repo');
  assert.equal(config.provider, 'github-releases');
  assert.equal(config.repository, 'curvios/repo');
  assert.equal(config.apiUrl, 'https://api.github.com/repos/curvios/repo/releases/latest');
  assert.equal(config.latestReleaseUrl, 'https://github.com/curvios/repo/releases/latest');

  const manifestConfig = normalizeMobileClassicUpdateConfig({
    updates: {
      repository: 'git@github.com:curvios/fork.git',
    },
  });
  assert.equal(manifestConfig.repository, 'curvios/fork');
  assert.equal(manifestConfig.apiUrl, 'https://api.github.com/repos/curvios/fork/releases/latest');
});

test('Mobile Classic tilt steering maps calibrated device orientation', () => {
  const neutral = {
    neutralBeta: 24,
    neutralGamma: -2,
    deadzoneDeg: 6,
    rangeDeg: 24,
  };

  const steady = deriveTiltSteeringState({
    ...neutral,
    beta: 26,
    gamma: 0,
  });
  assert.equal(steady.yawLeft, false);
  assert.equal(steady.yawRight, false);
  assert.equal(steady.pitchUp, false);
  assert.equal(steady.pitchDown, false);

  const right = deriveTiltSteeringState({
    ...neutral,
    beta: 24,
    gamma: 13,
  });
  assert.equal(right.yawRight, true);
  assert.equal(right.yawLeft, false);

  const left = deriveTiltSteeringState({
    ...neutral,
    beta: 24,
    gamma: -18,
  });
  assert.equal(left.yawLeft, true);
  assert.equal(left.yawRight, false);

  const landscapeRight = deriveTiltSteeringState({
    ...neutral,
    beta: 40,
    gamma: -2,
    orientationAngle: 90,
  });
  assert.equal(landscapeRight.yawRight, true);
});

test('Mobile Classic tilt steering uses soft analog axes for phone control', () => {
  const centered = deriveTiltSteeringState({
    neutralBeta: 20,
    neutralGamma: 0,
    beta: 23,
    gamma: 4,
  });
  assert.equal(centered.pitchAxis, 0);
  assert.equal(centered.yawAxis, 0);

  const softRight = deriveTiltSteeringState({
    neutralBeta: 20,
    neutralGamma: 0,
    beta: 20,
    gamma: 18,
  });
  assert.equal(softRight.yawRight, true);
  assert.ok(softRight.yawAxis > 0);
  assert.ok(softRight.yawAxis < 0.35);

  const controller = new PlayerController();
  const control = controller.resolveControlState(
    { controlRampEnabled: false },
    {
      pitchAxis: 0.35,
      yawAxis: -0.5,
      rollAxis: 0.2,
      boost: false,
      boostPressed: false,
    },
    false,
    1 / 60,
  );
  assert.equal(control.pitchInput, 0.35);
  assert.equal(control.yawInput, -0.5);
  assert.equal(control.rollInput, 0.2);
});

test('Mobile Classic tilt calibration treats the current hand posture as neutral', () => {
  const neutral = resolveTiltCalibrationNeutral([
    { beta: 63, gamma: 4, orientationAngle: 0 },
    { beta: 65, gamma: 5, orientationAngle: 0 },
    { beta: 64, gamma: 3, orientationAngle: 0 },
  ]);
  assert.ok(neutral.neutralBeta > 63);
  assert.ok(neutral.neutralBeta < 65);
  assert.ok(neutral.neutralGamma > 3);
  assert.ok(neutral.neutralGamma < 5);

  const steady = deriveTiltSteeringState({
    neutralBeta: neutral.neutralBeta,
    neutralGamma: neutral.neutralGamma,
    beta: neutral.neutralBeta + 2,
    gamma: neutral.neutralGamma + 2,
  });
  assert.equal(steady.pitchAxis, 0);
  assert.equal(steady.yawAxis, 0);

  const turnRight = deriveTiltSteeringState({
    neutralBeta: neutral.neutralBeta,
    neutralGamma: neutral.neutralGamma,
    beta: neutral.neutralBeta,
    gamma: neutral.neutralGamma + 18,
  });
  assert.equal(turnRight.yawRight, true);
});

test('Mobile Classic tilt touch controls expose all classic match actions', () => {
  const tiltButtons = resolveTouchButtonDefinitions(TOUCH_CONTROL_MODES.TILT).map((button) => button.id);
  assert.deepEqual(tiltButtons, ['fire', 'useItem', 'nextItem', 'boost']);
  assert.equal(tiltButtons.includes('shootMG'), false);
});

test('Mobile Classic input resolver prefers a connected gamepad over touch fallback', () => {
  const gamepad = {
    axes: [0, 0, 0],
    buttons: Array.from({ length: 8 }, () => ({ pressed: false })),
  };

  withGlobalValue('window', { ontouchstart: null }, () => {
    withGlobalValue('navigator', { getGamepads: () => [gamepad] }, () => {
      const source = createPreferredMatchInputSource({
        inputManager: { getKeyboardInput: () => null },
        playerIndex: 0,
        localHumanCount: 1,
        game: { _mobileClassicAppTarget: true },
      });
      assert.equal(source.type, 'gamepad');
      source.dispose();
    });
  });
});

test('Mobile Classic touch availability accepts touch-point devices without ontouchstart', () => {
  withGlobalValue('window', { matchMedia: () => ({ matches: false }) }, () => {
    withGlobalValue('navigator', { maxTouchPoints: 5, getGamepads: () => [] }, () => {
      assert.equal(TouchInputSource.isAvailable(), true);
    });
  });
});

test('Mobile Classic build prunes developer DOM and inactive preloads', () => {
  const html = `<!doctype html>
<html>
<head>
  <link rel="modulepreload" crossorigin href="/assets/training-a.js">
  <link rel="modulepreload" crossorigin href="/assets/recorder-a.js">
  <link rel="modulepreload" crossorigin href="/assets/developer-ui-a.js">
  <link rel="modulepreload" crossorigin href="/assets/three-core-a.js">
  <link rel="modulepreload" crossorigin href="/assets/validation-a.js">
  <link rel="modulepreload" crossorigin href="/assets/map-presets-a.js">
</head>
<body>
  <button type="button" id="btn-open-developer">Developer oeffnen</button>
  <!-- ======= SUBMENU: DEVELOPER ======= -->
  <div id="submenu-developer" class="submenu-panel hidden">
    <div><button>Nested developer action</button></div>
  </div>
  <!-- ======= SUBMENU: DEBUG / INFO ======= -->
  <div id="submenu-debug"></div>
</body>
</html>`;
  const prunedHtml = pruneMobileClassicHtml(html);

  assert.doesNotMatch(prunedHtml, /training-a\.js|recorder-a\.js|developer-ui-a\.js/);
  assert.doesNotMatch(prunedHtml, /validation-a\.js|map-presets-a\.js/);
  assert.match(prunedHtml, /three-core-a\.js/);
  assert.doesNotMatch(prunedHtml, /btn-open-developer|submenu-developer|Nested developer action/);
  assert.match(prunedHtml, /submenu-debug/);
});

test('Mobile Classic scripts build, wrap, and validate the phone app path', async () => {
  const packageJson = await readJson('package.json');
  const buildScript = await readText('scripts/build-mobile-classic-app.mjs');
  const capacitorScript = await readText('scripts/capacitor-mobile-classic.mjs');
  const gradleFile = await readText('android-classic/app/build.gradle');
  const updateScript = await readText('scripts/update-mobile-classic-from-github.mjs');
  const mobileClassicApp = await readText('src/mobile-classic/MobileClassicApp.js');
  const matchInputResolver = await readText('src/ui/MatchInputSourceResolver.js');
  const touchInputSource = await readText('src/ui/TouchInputSource.js');
  const readme = await readText('tools/mobile-classic-app/README.md');

  assert.equal(packageJson.scripts['app:classic:android:build'], 'node scripts/build-mobile-classic-app.mjs');
  assert.equal(packageJson.scripts['app:classic:android:check'], 'node --test tests/mobile-classic-app.contract.test.mjs');
  assert.equal(packageJson.scripts['app:classic:android:sync'], 'node scripts/capacitor-mobile-classic.mjs sync');
  assert.equal(packageJson.scripts['app:classic:android:assets:check'], 'node scripts/capacitor-mobile-classic.mjs check-assets');
  assert.equal(packageJson.scripts['app:classic:android:install'], 'node scripts/capacitor-mobile-classic.mjs install');
  assert.equal(packageJson.scripts['app:classic:android:update:github'], 'node scripts/update-mobile-classic-from-github.mjs');
  assert.match(buildScript, /VITE_APP_TARGET = 'mobile-classic'/);
  assert.match(buildScript, /mobile-classic\.manifest\.json/);
  assert.match(buildScript, /CURVIOS_CLASSIC_APP_GITHUB_REPOSITORY/);
  assert.match(buildScript, /updates: createMobileClassicGithubUpdateConfig/);
  assert.match(buildScript, /pruneMobileClassicHtml/);
  assert.match(capacitorScript, /tools', 'mobile-classic-app'/);
  assert.match(capacitorScript, /@capacitor', 'cli', 'bin', 'capacitor'/);
  assert.match(capacitorScript, /check-assets/);
  assert.match(capacitorScript, /cleanAndroidPublicAssets/);
  assert.match(capacitorScript, /copy', 'android'/);
  assert.match(capacitorScript, /verifyAndroidAssetsFresh/);
  assert.match(capacitorScript, /ANDROID_HOME/);
  assert.match(capacitorScript, /cmd\.exe/);
  assert.match(capacitorScript, /assembleDebug/);
  assert.match(capacitorScript, /de\.curviosclash\.classic/);
  assert.match(capacitorScript, /error\.stderr/);
  assert.match(gradleFile, /JsonSlurper/);
  assert.match(gradleFile, /versionCode mobileClassicVersionCode/);
  assert.match(gradleFile, /versionName mobileClassicVersionName/);
  assert.match(updateScript, /merge', '--ff-only'/);
  assert.match(updateScript, /ensureCleanWorkingTree/);
  assert.match(updateScript, /capacitor-mobile-classic\.mjs/);
  assert.match(updateScript, /GitHub URL/);
  assert.match(mobileClassicApp, /mobile-classic-update-check/);
  assert.match(mobileClassicApp, /checkMobileClassicGithubRelease/);
  assert.match(mobileClassicApp, /mobile-classic\.manifest\.json/);
  assert.match(mobileClassicApp, /Classic starten/);
  assert.match(mobileClassicApp, /Update pruefen/);
  assert.match(touchInputSource, /TILT SANFT/);
  assert.match(touchInputSource, /KALIBRIERE/);
  assert.match(touchInputSource, /resolveTiltCalibrationNeutral/);
  assert.match(touchInputSource, /resolveTouchButtonDefinitions/);
  assert.match(touchInputSource, /maxTouchPoints/);
  assert.match(touchInputSource, /aria-hidden/);
  assert.match(readme, /app:classic:android:assets:check/);
  assert.match(readme, /app:classic:android:update:github/);
  assert.equal(TOUCH_CONTROL_MODES.TILT, 'tilt');
  assert.match(matchInputResolver, /pitchAxis/);
  assert.match(matchInputResolver, /TOUCH_CONTROL_MODES\.TILT/);
  assert.match(matchInputResolver, /_mobileClassicAppTarget/);
});

test('Mobile Classic wrapper files stay outside the desktop graph KPI', () => {
  const nativeCoverage = classifyCoveragePath('android-classic/app/src/main/res/drawable/splash.png');
  const adapterCoverage = classifyCoveragePath('src/mobile-classic/MobileClassicApp.js');

  assert.equal(nativeCoverage.classification, 'native-wrapper');
  assert.equal(nativeCoverage.excludedFromCoverage, true);
  assert.match(nativeCoverage.excludeReason, /Capacitor native wrapper/);

  assert.equal(adapterCoverage.classification, 'mobile-wrapper');
  assert.equal(adapterCoverage.excludedFromCoverage, true);
  assert.match(adapterCoverage.excludeReason, /Mobile Classic app adapter/);
});
