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
  assert.match(script, /'\.\/tools\/plan-map\/index\.html'/);
  assert.match(script, /'\.\/tools\/repo-map\/index\.html'/);
  assert.equal(packageJson.scripts['app:maps:android:build'], 'node scripts/build-map-tools-android.mjs');
  assert.equal(packageJson.scripts['app:maps:android:sync'], 'npm run app:maps:android:build && npx cap sync android');
});

test('Map Tools Android build script exports static map datasets', async () => {
  const script = await readText('scripts/build-map-tools-android.mjs');

  assert.match(script, /export-plan-map\.mjs/);
  assert.match(script, /export-repo-map\.mjs/);
  assert.match(script, /dist\/map-tools-android\/tmp\/plan-map\/plan-map\.json/);
  assert.match(script, /dist\/map-tools-android\/tmp\/repo-map\/repo-map\.json/);
  assert.match(script, /map-tools-android\.manifest\.json/);
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
