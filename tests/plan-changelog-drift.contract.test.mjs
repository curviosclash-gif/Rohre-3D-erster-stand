import assert from 'node:assert/strict';
import test from 'node:test';

import { checkPlanChangelogDrift } from '../scripts/check-plan-changelog-drift.mjs';

const MASTER = `
| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1 | Good | done | P1 | frei | - | 1.99 | \`docs/plaene/aktiv/V1.md\` |
| V2 | Missing note | done | P1 | frei | - | 2.99 | \`docs/plaene/aktiv/V2.md\` |
| V3 | Plan mismatch | done | P1 | frei | - | 3.99 | \`docs/plaene/aktiv/V3.md\` |
| V4 | Weak note | done | P1 | frei | - | 4.99 | \`docs/plaene/aktiv/V4.md\` |
`;

const CHANGELOG = `
## V1 Abschluss 2026-06-09
- V1 1.99 abgeschlossen; evidence: node --test -> PASS.

## V3 Abschluss 2026-06-09
- V3 3.99 abgeschlossen; not-checked: full suite.

## V4 Abschluss
- V4 abgeschlossen.
`;

function plan(status, phase, phaseStatus) {
  return `---
status: ${status}
---
# Plan
### ${phase} Abschluss-Gate
status: ${phaseStatus}
`;
}

const PLAN_DOCUMENTS = new Map([
  ['docs/plaene/aktiv/V1.md', plan('done', '1.99', 'done')],
  ['docs/plaene/aktiv/V2.md', plan('done', '2.99', 'done')],
  ['docs/plaene/aktiv/V3.md', plan('planned', '3.99', 'open')],
  ['docs/plaene/aktiv/V4.md', plan('done', '4.99', 'done')],
]);

const FINDINGS_INDEX = {
  findings: [
    {
      id: 'P1',
      declared_status: 'open',
      owner_block: 'V1',
      signals: { owner_block_status: 'done' },
    },
  ],
};

async function warnings() {
  return checkPlanChangelogDrift({
    masterMarkdown: MASTER,
    changelogMarkdown: CHANGELOG,
    planDocuments: PLAN_DOCUMENTS,
    findingsIndex: FINDINGS_INDEX,
  });
}

test('complete closure note and matching plan stay clean', async () => {
  const result = await warnings();
  assert(!result.some((warning) => warning.block_id === 'V1' && warning.code !== 'open-finding-owner-done'));
});

test('missing closure note is reported', async () => {
  const result = await warnings();
  assert(result.some((warning) => warning.block_id === 'V2' && warning.code === 'missing-closure-note'));
});

test('master and active plan mismatch is reported', async () => {
  const result = await warnings();
  assert(result.some((warning) => warning.block_id === 'V3' && warning.code === 'master-plan-status-mismatch'));
});

test('closure note without date phase and evidence is weak', async () => {
  const result = await warnings();
  assert(result.some((warning) => warning.block_id === 'V4' && warning.code === 'weak-closure-note'));
});

test('open finding owned by completed block is reported', async () => {
  const result = await warnings();
  assert(result.some((warning) => warning.finding_id === 'P1' && warning.code === 'open-finding-owner-done'));
});
