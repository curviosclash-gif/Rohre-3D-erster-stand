import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  buildKnowledgeGraph,
  classifyCoveragePath,
} from '../scripts/build-knowledge-graph.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('Map Tools Android Capacitor config points to static web bundle', async () => {
  const config = JSON.parse(await readText('capacitor.config.json'));

  assert.equal(config.appId, 'de.curviosclash.maps');
  assert.equal(config.appName, 'Curvios Map Tools');
  assert.equal(config.webDir, 'dist/map-tools-android');
  assert.equal(config.android.path, 'android-map-tools');
});

test('Map Tools Android shell embeds Plan Map and Repo Map viewers', async () => {
  const [html, script, packageJson] = await Promise.all([
    readText('tools/map-tools-android/index.html'),
    readText('tools/map-tools-android/map-tools-android.js'),
    readText('package.json').then(JSON.parse),
  ]);

  assert.match(html, /data-testid="map-tools-android-shell"/);
  assert.match(html, /src="\.\/tools\/plan-map\/index\.html"/);
  assert.match(html, /id="updateCheck"/);
  assert.match(html, /id="updateOpen"/);
  assert.match(html, /id="planWorkstream"/);
  assert.match(html, /id="infoToggle"/);
  assert.match(html, /id="helpPopover"/);
  assert.match(html, /data-testid="map-tools-android-workstream"/);
  assert.match(html, /data-testid="map-tools-android-info-toggle"/);
  assert.match(script, /'\.\/tools\/plan-map\/index\.html'/);
  assert.match(script, /'\.\/tools\/repo-map\/index\.html'/);
  assert.match(script, /planWorkstream/);
  assert.match(script, /workstreamFilter/);
  assert.match(script, /function applyPlanWorkstreamFilter/);
  assert.match(script, /function setInfoVisible/);
  assert.match(script, /curvios\.map-tools:set-help-visible/);
  assert.match(script, /api\.github\.com\/repos/);
  assert.match(script, /releases\/latest/);
  assert.match(script, /function resolveReleaseUpdateTarget/);
  assert.match(script, /\.endsWith\('\.apk'\)/);
  assert.match(script, /application\/vnd\.android\.package-archive/);
  assert.match(script, /browser_download_url/);
  assert.match(script, /APK laden/);
  assert.equal(packageJson.scripts['app:maps:android:build'], 'node scripts/build-map-tools-android.mjs');
  assert.equal(packageJson.scripts['app:maps:android:sync'], 'npm run app:maps:android:build && npx cap sync android');
});

test('Plan Map risk hints are compact dropdown explanations in shared viewers', async () => {
  const [html, script, css] = await Promise.all([
    readText('tools/plan-map/index.html'),
    readText('tools/plan-map/viewer.js'),
    readText('tools/plan-map/viewer.css'),
  ]);

  assert.match(html, /data-view="changelog"/);
  assert.match(html, /data-view="intake"/);
  assert.match(html, /id="changelogView"/);
  assert.match(html, /id="intakeView"/);
  assert.match(html, /id="intakeClassificationFilter"/);
  assert.match(html, /id="mapZoomOut"/);
  assert.match(html, /id="mapZoomFit"/);
  assert.match(html, /id="mapZoomIn"/);
  assert.match(html, /id="mapZoomLabel"/);
  assert.match(html, /id="changelogTypeFilter"/);
  assert.match(script, /function riskHintItems/);
  assert.match(script, /function renderIntakeView/);
  assert.match(script, /intakePlans/);
  assert.match(script, /selectedIntakePath/);
  assert.match(script, /function setMapZoom/);
  assert.match(script, /function handleMapTouchMove/);
  assert.match(script, /function bindMapZoomEvents/);
  assert.match(script, /function renderChangelogView/);
  assert.match(script, /selectedChangelogId/);
  assert.match(css, /\.intake-card/);
  assert.match(css, /\.intake-panel/);
  assert.match(css, /\.map-zoom-controls/);
  assert.match(script, /<details class="risk-disclosure">/);
  assert.match(script, /<summary>/);
  assert.match(script, /Harte Dependencies sind Start- oder Abschlussbedingungen/);
  assert.match(css, /\.risk-disclosure summary/);
  assert.match(css, /\.changelog-timeline/);
  assert.match(css, /\.changelog-card/);
});

test('Map Tools Android shell keeps phone viewports inside the app frame', async () => {
  const [shellCss, planCss, repoCss] = await Promise.all([
    readText('tools/map-tools-android/map-tools-android.css'),
    readText('tools/plan-map/viewer.css'),
    readText('tools/repo-map/viewer.css'),
  ]);

  assert.match(shellCss, /@media \(max-width: 640px\)/);
  assert.match(shellCss, /\.plan-filter-strip/);
  assert.match(shellCss, /\.plan-filter-strip\[hidden\]/);
  assert.match(planCss, /@media \(max-width: 760px\)/);
  assert.match(planCss, /overflow-x: hidden/);
  assert.match(planCss, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(planCss, /#mapView\s*\{[\s\S]*overflow: auto/);
  assert.match(planCss, /\.plan-svg\s*\{[\s\S]*min-width: 0/);
  assert.match(repoCss, /@media \(max-width: 640px\)/);
});

test('Map Tools Android launcher icon uses map-specific adaptive assets', async () => {
  const [icon, roundIcon, foreground, background] = await Promise.all([
    readText('android-map-tools/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'),
    readText('android-map-tools/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml'),
    readText('android-map-tools/app/src/main/res/drawable-v24/ic_launcher_foreground.xml'),
    readText('android-map-tools/app/src/main/res/drawable/ic_launcher_background.xml'),
  ]);

  assert.match(icon, /@drawable\/ic_launcher_background/);
  assert.match(icon, /@drawable\/ic_launcher_foreground/);
  assert.match(roundIcon, /@drawable\/ic_launcher_background/);
  assert.match(roundIcon, /@drawable\/ic_launcher_foreground/);
  assert.match(foreground, /#176B63/);
  assert.match(foreground, /#B94C45/);
  assert.match(background, /#0B4C47/);
});

test('Map Tools Android build script exports static map datasets', async () => {
  const script = await readText('scripts/build-map-tools-android.mjs');

  assert.match(script, /export-plan-map\.mjs/);
  assert.match(script, /export-repo-map\.mjs/);
  assert.match(script, /dist\/map-tools-android\/tmp\/plan-map\/plan-map\.json/);
  assert.match(script, /dist\/map-tools-android\/tmp\/repo-map\/repo-map\.json/);
  assert.match(script, /map-tools-android\.manifest\.json/);
  assert.match(script, /github-releases/);
  assert.match(script, /CURVIOS_MAP_TOOLS_GITHUB_REPOSITORY/);
  assert.match(script, /https:\/\/api\.github\.com\/repos\/\$\{repository\}\/releases\/latest/);
});

test('Map Tools Android is represented in the knowledge graph mapping source', async () => {
  const mapping = JSON.parse(
    await readText('data/contracts/knowledge-graph/map-tools-android.v1.json'),
  );
  assert.equal(mapping.contract, 'knowledge-graph.mapping.v1');
  assert.equal(mapping.mapping_id, 'map-tools-android');

  const graph = await buildKnowledgeGraph();
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const edges = new Set(graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.type}`));

  for (const nodeId of [
    'runtime:map-tools-android-build',
    'runtime:map-tools-android-shell',
    'runtime:map-tools-android-native-shell',
    'state:map-tools-android-static-bundle',
    'test:map-tools-android-contract',
  ]) {
    assert.ok(nodes.has(nodeId), `${nodeId} missing`);
  }

  assert.equal(nodes.get('runtime:map-tools-android-shell').attributes.mappingId, 'map-tools-android');
  assert.ok(edges.has('runtime:map-tools-android-build->state:map-tools-android-static-bundle:writes_state'));
  assert.ok(edges.has('runtime:map-tools-android-shell->state:plan-map-readonly-dataset:reads_state'));
  assert.ok(edges.has('runtime:map-tools-android-native-shell->test:map-tools-android-contract:validated_by'));
});

test('Map Tools Android native project is excluded from JS coverage KPI', () => {
  const coverage = classifyCoveragePath('android-map-tools/app/src/main/res/drawable/splash.png');

  assert.equal(coverage.classification, 'native-wrapper');
  assert.equal(coverage.excludedFromCoverage, true);
  assert.match(coverage.excludeReason, /Capacitor native wrapper/);
});
