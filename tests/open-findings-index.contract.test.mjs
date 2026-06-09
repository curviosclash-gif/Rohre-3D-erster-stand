import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOpenFindingsIndex } from '../scripts/build-open-findings-index.mjs';

const MASTER = `
| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1 | Done owner | done | P1 | frei | - | 1.99 | \`docs/plaene/aktiv/V1.md\` |
| V2 | Open owner | planned | P2 | frei | - | 2.1 | \`docs/plaene/aktiv/V2.md\` |
`;

const FINDINGS = `
## Zuordnung nach Zielblock

- \`V1\`: \`P1\`, \`P2\`, \`P3\`, \`P4\`
- \`V2\`: \`P5\`, \`P6\`

## Offene Findings

| ID | Datei(en) | Problem | Schwere |
| --- | --- | --- | --- |
| P1 | \`src/p1.js\` | Accepted risk | hoch |
| P2 | \`src/p2.js\` | Done owner | hoch |
| P3 | \`src/p3.js\` | Due review | hoch |
| P4 | \`src/missing.js\` | Missing file | mittel |
| P5 | \`src/p5.js\` | Mapping mismatch | mittel |
| P6 | \`src/p6.js\` | Clean open finding | niedrig |
`;

const DECISIONS = {
  schema_version: 'finding-decisions.v1',
  decisions: [
    {
      id: 'P1',
      status: 'accepted-risk',
      owner_block: 'V1',
      severity: 'high',
      review_after: '2026-06-17',
      reason: 'scheduled review',
      manual_override: true,
    },
    {
      id: 'P2',
      status: 'open',
      owner_block: 'V1',
      severity: 'high',
      review_after: null,
      reason: 'pilot',
      manual_override: false,
    },
    {
      id: 'P3',
      status: 'open',
      owner_block: 'V1',
      severity: 'high',
      review_after: '2026-06-01',
      reason: 'due',
      manual_override: false,
    },
    {
      id: 'P5',
      status: 'open',
      owner_block: 'V1',
      severity: 'medium',
      review_after: null,
      reason: 'wrong owner',
      manual_override: false,
    },
  ],
};

const TRACKED_FILES = [
  'src/p1.js',
  'src/p2.js',
  'src/p3.js',
  'src/p5.js',
  'src/p6.js',
  'docs/plaene/aktiv/V1.md',
  'docs/plaene/aktiv/V2.md',
];

function codesFor(index, id) {
  return new Set(index.findings.find((finding) => finding.id === id).drift.map((entry) => entry.code));
}

async function buildFixture() {
  return buildOpenFindingsIndex({
    asOf: '2026-06-09',
    findingsMarkdown: FINDINGS,
    decisionsDocument: DECISIONS,
    masterMarkdown: MASTER,
    changelogMarkdown: 'V1 abgeschlossen und Recovery geschlossen.',
    trackedFiles: TRACKED_FILES,
  });
}

test('accepted risk remains open without stale-owner or due-review drift', async () => {
  const index = await buildFixture();
  assert.deepEqual(codesFor(index, 'P1'), new Set());
  assert.equal(index.findings.find((finding) => finding.id === 'P1').declared_status, 'accepted-risk');
});

test('open finding on completed owner reports owner and changelog drift', async () => {
  const index = await buildFixture();
  const codes = codesFor(index, 'P2');
  assert(codes.has('owner-block-done'));
  assert(codes.has('changelog-resolved-open'));
});

test('past review date reports review-after-due', async () => {
  const index = await buildFixture();
  assert(codesFor(index, 'P3').has('review-after-due'));
});

test('missing tracked path reports missing-file', async () => {
  const index = await buildFixture();
  assert(codesFor(index, 'P4').has('missing-file'));
});

test('manual owner disagreement reports mapping-table-mismatch', async () => {
  const index = await buildFixture();
  assert(codesFor(index, 'P5').has('mapping-table-mismatch'));
});

test('planned owner with existing file has no drift', async () => {
  const index = await buildFixture();
  assert.deepEqual(codesFor(index, 'P6'), new Set());
});
