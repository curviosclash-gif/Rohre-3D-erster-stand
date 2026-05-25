import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReport } from '../scripts/plan-context-report.mjs';

test('plan context report exposes separated structured-index drift fields', async () => {
  const report = await buildReport();

  assert.equal(report.masterSource, 'docs/Umsetzungsplan.md');
  assert.equal(report.structuredIndexSource, 'docs/generated/plan-index.json');
  assert.equal(report.driftStatus, 'clean');
  assert.deepEqual(report.missingInIndex, []);
  assert.deepEqual(report.missingInMaster, []);
  assert.deepEqual(report.fieldMismatches, []);
  assert.deepEqual(report.workstreamMismatches, []);
  assert.deepEqual(report.lockMismatches, []);
  assert.equal(report.summary.planIndexDriftStatus, 'clean');
  assert.equal(report.summary.planIndexViolationCount, 0);
  assert.equal(report.inputs.masterPlan, report.masterSource);
  assert.equal(report.inputs.structuredPlanIndex, report.structuredIndexSource);
});
