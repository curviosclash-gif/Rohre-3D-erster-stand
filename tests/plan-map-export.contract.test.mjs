import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlanMapData } from '../scripts/export-plan-map.mjs';

test('plan map export builds a read-only implementation-plan dataset', async () => {
  const data = await buildPlanMapData({ rootDir: process.cwd() });

  assert.equal(data.contract, 'curvios.plan-map.v1');
  assert.equal(data.readOnly, true);
  assert.ok(data.summary.blockCount >= 30);
  assert.ok(data.summary.dependencyCount > 0);
  assert.ok(data.sources.masterPlan.endsWith('docs/Umsetzungsplan.md'));

  const v126 = data.blocks.find((block) => block.id === 'V126');
  assert.ok(v126, 'V126 is present');
  assert.equal(v126.priority, 'P1');
  assert.ok(v126.phaseProgress.total > 0);
  assert.ok(v126.scopeFiles.includes('vite.config.js'));
  assert.ok(v126.readiness);
  assert.ok(['ready', 'ready-with-risk', 'blocked', 'locked', 'done'].includes(v126.readiness.status));
  assert.ok(v126.impact.scopeFileCount > 0);
  assert.ok(v126.explanation);
  assert.ok(typeof v126.explanation.brief === 'string');
  assert.ok(Array.isArray(v126.explanation.goal));
  assert.ok(Array.isArray(v126.explanation.implementedHighlights));
  assert.ok(v126.explanation.completionCounts.phaseTotal > 0);

  const v121OpenDependency = data.dependencies.find((edge) => (
    edge.from === 'V121'
    && edge.to === 'V120'
    && edge.phase === 'V120.99'
  ));
  assert.ok(v121OpenDependency, 'V121 -> V120.99 dependency is present');
  assert.equal(v121OpenDependency.fulfilled, false);

  assert.ok(data.graph.nodeCount > 0);
  assert.ok(data.scorecard.metrics.criticalPathTotalCount >= 4);
  assert.ok(Array.isArray(data.scopeCollisions));
  assert.ok(data.summary.byReadiness);
  assert.ok(data.fileIndex.some((entry) => entry.path === 'vite.config.js'));
});
