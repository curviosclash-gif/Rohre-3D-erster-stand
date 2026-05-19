import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRepoMapData } from '../scripts/export-repo-map.mjs';

test('repo map export builds a read-only repository dataset', async () => {
  const data = await buildRepoMapData({ rootDir: process.cwd() });

  assert.equal(data.contract, 'curvios.repo-map.v1');
  assert.equal(data.readOnly, true);
  assert.ok(data.summary.fileCount >= data.summary.coverage.trackedFileCount);
  assert.ok(data.summary.folderCount > 0);
  assert.ok(data.summary.criticalPathCount >= 4);
  assert.equal(data.summary.activeUncoveredFileCount, data.summary.coverage.uncoveredActiveFileCount);
  assert.ok(data.sources.knowledgeGraph.endsWith('docs/generated/knowledge-graph.json'));
  assert.ok(data.sources.architectureReport.endsWith('scripts/architecture/ArchitectureAnalysis.mjs'));

  const srcFolder = data.folders.find((folder) => folder.id === 'src');
  assert.ok(srcFolder, 'src folder is present');
  assert.ok(srcFolder.fileCount > 0);
  assert.ok(srcFolder.coverageFileCount > 0);

  const settingsManager = data.files.find((file) => file.path === 'src/core/SettingsManager.js');
  assert.ok(settingsManager, 'SettingsManager is present');
  assert.equal(settingsManager.inCoverage, true);
  assert.ok(settingsManager.criticalPaths.includes('settings'));
  assert.ok(settingsManager.existsInGraph);

  const criticalPathIds = new Set(data.criticalPaths.map((entry) => entry.id));
  assert.ok(criticalPathIds.has('spawn'));
  assert.ok(criticalPathIds.has('settings'));

  assert.ok(Array.isArray(data.scopeCollisions));
  assert.ok(data.hotspots.activeUncovered.length > 0);
  assert.ok(data.architecture.importGraph.localEdgeCount > 0);
});

