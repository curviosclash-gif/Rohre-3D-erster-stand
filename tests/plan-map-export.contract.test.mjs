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
});
