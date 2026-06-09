import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  buildAutopilotPlan,
  classifyCandidateGate,
  executeAutopilotRun,
  extractActivePlanContext,
  getCurrentOpenSubphase,
  normalizeGateToken,
  parseAiExecutionMatrix,
  renderWorkerPrompt,
  scanRedSignals,
  validateDiffScope,
  validatePostWorkerGitState,
  validateWorkerOutput,
} from '../scripts/plan-autopilot.mjs';

const SAFE_PLAN = `---
id: V201
status: planned
---
# Safe

## AI-Ausfuehrungsmatrix

| Arbeit | Decision | Gate |
| --- | --- | --- |
| Dry-run Planner, Parser, Kandidatenreport | D0/D2 | [AUTO] |
| Tool-Implementation | D2 | REVIEW |
| Governance-Umbau | D3 | \`[USER-GATE]\` |

## Phasen

### 201.1 Dry-run Planner und Auswahlmodell

status: open

- [ ] 201.1.1 buildPlanMapData() als primaere Quelle nutzen.
- [ ] 201.1.2 Offene Phase erkennen.

Gate:

- node --test tests/plan-autopilot.contract.test.mjs

Evidence 2026-06-09:

- This evidence bullet is not a phase gate check.
`;

const GATED_PLAN = `---
id: V200
status: planned
---
# Gated

## AI-Ausfuehrungsmatrix

| Arbeit | Decision | Gate |
| --- | --- | --- |
| Full-Init Rebuild und Governance-Umbau | REVIEW; D4 falls produktiv | [USER-GATE] |

## Phasen

### 200.1 Full-Init Rebuild

status: open

- [ ] 200.1.1 Manuelle Uebernahme erforderlich vor Umsetzung.
`;

const HISTORY_HEAVY_PLAN = `---
id: V202
status: planned
---
# History Heavy

## AI-Ausfuehrungsmatrix

| Arbeit | Decision | Gate |
| --- | --- | --- |
| Dry-run Planner und Auswahlmodell | D0/D2 | [AUTO] |

## Phasen

### 202.1 Abgeschlossene Historie

status: done

- [x] 202.1.1 Alter D4 Rebuild, darf nicht im aktiven Kontext landen.

Gate:

- npm run gates:pre-commit

### 202.2 Aktuelle Phase

status: open

- [x] 202.2.1 Schon erledigt.
- [ ] 202.2.2 Naechste offene Subphase sparsam erkennen.

Gate:

- node --test tests/plan-autopilot.contract.test.mjs

### 202.3 Zukunft

status: open

- [ ] 202.3.1 Spaeter.
`;

const REVIEW_PLAN = `---
id: V203
status: planned
---
# Review

## AI-Ausfuehrungsmatrix

| Arbeit | Decision | Gate |
| --- | --- | --- |
| Tool-Implementation und Tests | D2 | REVIEW |

## Phasen

### 203.1 Tool-Implementation

status: open

- [ ] 203.1.1 Tool-Implementation und Tests fertigstellen.

Gate:

- node --test tests/plan-autopilot.contract.test.mjs
`;

function planMapFixture() {
  return {
    sources: {
      masterPlan: 'docs/Umsetzungsplan.md',
      structuredPlanIndex: 'docs/generated/plan-index.json',
    },
    scopeCollisions: [
      {
        leftBlock: 'V200',
        rightBlock: 'V201',
        sharedFiles: ['scripts/shared.mjs'],
      },
    ],
    blocks: [
      {
        id: 'V200',
        title: 'Gated first',
        status: 'planned',
        currentPhase: '200.1',
        planFile: 'docs/plaene/aktiv/V200.md',
        dependsOn: [{ raw: 'V100.99', blockId: 'V100', phase: 'V100.99' }],
        scopeFiles: ['scripts/gated.mjs'],
        verification: ['npm run plan:check'],
        readiness: {
          status: 'ready',
          reason: 'fixture',
          recommendedRank: 1,
        },
        impact: {
          score: 1,
          level: 'low',
        },
      },
      {
        id: 'V201',
        title: 'Safe second',
        status: 'planned',
        currentPhase: '201.1',
        planFile: 'docs/plaene/aktiv/V201.md',
        dependsOn: [{ raw: 'V100.99', blockId: 'V100', phase: 'V100.99' }],
        scopeFiles: ['scripts/plan-autopilot.mjs'],
        verification: ['node --test tests/plan-autopilot.contract.test.mjs'],
        readiness: {
          status: 'ready',
          reason: 'fixture',
          recommendedRank: 2,
        },
        impact: {
          score: 10,
          level: 'low',
        },
      },
    ],
  };
}

function singleReviewPlanMapFixture() {
  return {
    sources: {
      masterPlan: 'docs/Umsetzungsplan.md',
      structuredPlanIndex: 'docs/generated/plan-index.json',
    },
    scopeCollisions: [],
    locks: {
      active: [],
    },
    blocks: [
      {
        id: 'V203',
        title: 'Review tool scope',
        status: 'planned',
        currentPhase: '203.1',
        planFile: 'docs/plaene/aktiv/V203.md',
        dependsOn: [],
        scopeFiles: ['scripts/plan-autopilot.mjs', 'tests/plan-autopilot.contract.test.mjs'],
        verification: ['node --test tests/plan-autopilot.contract.test.mjs'],
        readiness: {
          status: 'ready',
          reason: 'fixture',
          recommendedRank: 1,
        },
        impact: {
          score: 2,
          level: 'low',
        },
      },
    ],
  };
}

test('normalizes AI gate spellings used in active plans', () => {
  assert.equal(normalizeGateToken('[AUTO]'), 'AUTO');
  assert.equal(normalizeGateToken('AUTO'), 'AUTO');
  assert.equal(normalizeGateToken('`[USER-GATE]`'), 'USER-GATE');
  assert.equal(normalizeGateToken('REVIEW; D4 falls produktiv'), 'REVIEW');
});

test('parses execution matrix rows with decision and gate data', () => {
  const rows = parseAiExecutionMatrix(SAFE_PLAN);

  assert.equal(rows.length, 3);
  assert.equal(rows[0].normalizedGate, 'AUTO');
  assert.equal(rows[0].normalizedDecision, 'D2');
  assert.equal(rows[2].normalizedGate, 'USER-GATE');
  assert.equal(rows[2].normalizedDecision, 'D3');
});

test('extracts the current open subphase and phase gate without completed history', () => {
  const open = getCurrentOpenSubphase(SAFE_PLAN, '201.1');

  assert.equal(open.phaseId, '201.1');
  assert.equal(open.subphaseId, '201.1.1');
  assert.equal(open.nextOpenSubphaseId, '201.1.2');
  assert.deepEqual(open.checks, ['node --test tests/plan-autopilot.contract.test.mjs']);
});

test('builds an active plan context without loading completed phase history', () => {
  const context = extractActivePlanContext(HISTORY_HEAVY_PLAN, '202.2');
  const open = getCurrentOpenSubphase(context.text, '202.2');
  const rows = parseAiExecutionMatrix(context.text);

  assert.equal(context.readMode, 'provided-slice');
  assert.equal(context.selectedPhaseId, '202.2');
  assert.equal(context.phaseSectionsLoaded, 1);
  assert.equal(context.completedPhaseSectionsLoaded, 0);
  assert.equal(open.subphaseId, '202.2.2');
  assert.equal(open.nextOpenSubphaseId, null);
  assert.equal(rows[0].normalizedGate, 'AUTO');
  assert.doesNotMatch(context.text, /Alter D4 Rebuild/);
  assert.doesNotMatch(context.text, /202\.3\.1/);
});

test('classifies red text and D3/D4 signals conservatively', () => {
  const matrixRows = parseAiExecutionMatrix(GATED_PLAN);
  const classification = classifyCandidateGate({
    candidateText: 'V200 200.1 Full-Init Rebuild 200.1.1 Manuelle Uebernahme erforderlich',
    matrixRows,
    mode: 'auto-d2-review',
  });

  assert.equal(classification.runnable, false);
  assert.equal(classification.decision, 'D4');
  assert.equal(classification.gate, 'USER-GATE');
  assert.equal(classification.reason, 'red_text_signal');
  assert(scanRedSignals('Draft fuer User-Intake').some((signal) => signal.id === 'user_intake_draft'));
});

test('parks a gated top candidate and selects the next safe AUTO subphase', async () => {
  const report = await buildAutopilotPlan({
    rootDir: process.cwd(),
    mode: 'auto-safe',
    planMapData: planMapFixture(),
    planTextByPath: {
      'docs/plaene/aktiv/V200.md': GATED_PLAN,
      'docs/plaene/aktiv/V201.md': SAFE_PLAN,
    },
    gitDirtyFiles: [],
  });

  assert.equal(report.contract, 'curvios.plan-autopilot.plan.v1');
  assert.equal(report.summary.candidateCount, 2);
  assert.equal(report.selected.blockId, 'V201');
  assert.equal(report.selected.subphaseId, '201.1.1');
  assert.equal(report.selected.gate, 'AUTO');
  assert.equal(report.selected.dependencies[0].raw, 'V100.99');
  assert.equal(report.selected.scopeCollisions[0].sharedFiles[0], 'scripts/shared.mjs');
  assert(report.parked.some((entry) => (
    entry.blockId === 'V200'
    && entry.reason === 'red_text_signal'
  )));
});

test('report-only mode never selects a runnable slice', async () => {
  const report = await buildAutopilotPlan({
    rootDir: process.cwd(),
    mode: 'report-only',
    planMapData: planMapFixture(),
    planTextByPath: {
      'docs/plaene/aktiv/V200.md': GATED_PLAN,
      'docs/plaene/aktiv/V201.md': SAFE_PLAN,
    },
    gitDirtyFiles: [],
  });

  assert.equal(report.selected, null);
  assert(report.parked.some((entry) => entry.reason === 'report_only'));
});

test('auto-safe parks D2 REVIEW while auto-d2-review may select it', async () => {
  const safeReport = await buildAutopilotPlan({
    rootDir: process.cwd(),
    mode: 'auto-safe',
    planMapData: singleReviewPlanMapFixture(),
    planTextByPath: {
      'docs/plaene/aktiv/V203.md': REVIEW_PLAN,
    },
    gitDirtyFiles: [],
  });
  const reviewReport = await buildAutopilotPlan({
    rootDir: process.cwd(),
    mode: 'auto-d2-review',
    planMapData: singleReviewPlanMapFixture(),
    planTextByPath: {
      'docs/plaene/aktiv/V203.md': REVIEW_PLAN,
    },
    gitDirtyFiles: [],
  });

  assert.equal(safeReport.selected, null);
  assert(safeReport.parked.some((entry) => (
    entry.type === 'gate'
    && entry.reason === 'review_gate_parked'
  )));
  assert.equal(reviewReport.selected.blockId, 'V203');
  assert.equal(reviewReport.selected.reason, undefined);
  assert.equal(reviewReport.selected.gate, 'REVIEW');
});

test('parking distinguishes dirty worktree and active scope conflicts', async () => {
  const fixture = singleReviewPlanMapFixture();
  fixture.scopeCollisions = [
    {
      leftBlock: 'V203',
      rightBlock: 'V999',
      sharedFiles: ['scripts/plan-autopilot.mjs'],
      sharedFileCount: 1,
    },
  ];
  fixture.locks.active = [
    {
      blockId: 'V999',
      person: 'other-agent',
      phase: '999.1',
      status: 'active',
    },
  ];

  const report = await buildAutopilotPlan({
    rootDir: process.cwd(),
    mode: 'auto-d2-review',
    planMapData: fixture,
    planTextByPath: {
      'docs/plaene/aktiv/V203.md': REVIEW_PLAN,
    },
    gitDirtyFiles: ['docs/plaene/neu/other.md'],
  });

  assert.equal(report.selected, null);
  assert(report.parked.some((entry) => (
    entry.type === 'dirty-worktree'
    && entry.reason === 'dirty_worktree'
  )));
  assert(report.parked.some((entry) => (
    entry.type === 'scope-conflict'
    && entry.reason === 'scope_conflict'
    && /V999/.test(entry.detail)
  )));
});

test('fake executor covers completed, gate, blocker and no-change statuses', async () => {
  for (const fakeStatus of ['completed', 'gate_required', 'blocked', 'no_change']) {
    const report = await executeAutopilotRun({
      rootDir: process.cwd(),
      mode: 'auto-d2-review',
      maxSlices: 1,
      executor: 'fake',
      fakeStatus,
      planMapData: singleReviewPlanMapFixture(),
      planTextByPath: {
        'docs/plaene/aktiv/V203.md': REVIEW_PLAN,
      },
      gitDirtyFiles: [],
    });

    assert.equal(report.contract, 'curvios.plan-autopilot.run.v1');
    assert.equal(report.status, fakeStatus);
    assert.equal(report.selected.blockId, 'V203');
    assert.equal(report.reviewChecklist.processedScope.blockId, 'V203');
  }
});

test('run stops before executor on dirty worktree', async () => {
  const report = await executeAutopilotRun({
    rootDir: process.cwd(),
    mode: 'auto-d2-review',
    maxSlices: 1,
    executor: 'fake',
    planMapData: singleReviewPlanMapFixture(),
    planTextByPath: {
      'docs/plaene/aktiv/V203.md': REVIEW_PLAN,
    },
    gitDirtyFiles: ['src/unrelated.js'],
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.reason, 'dirty_worktree');
  assert.equal(report.workerOutput, null);
  assert(report.reviewChecklist.knownRisks.some((entry) => /D3\/D4/.test(entry)));
});

test('run blocks out-of-scope worker diffs', async () => {
  const report = await executeAutopilotRun({
    rootDir: process.cwd(),
    mode: 'auto-d2-review',
    maxSlices: 1,
    executor: 'fake',
    fakeStatus: 'out_of_scope',
    planMapData: singleReviewPlanMapFixture(),
    planTextByPath: {
      'docs/plaene/aktiv/V203.md': REVIEW_PLAN,
    },
    gitDirtyFiles: [],
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.reason, 'scope_violation');
  assert.deepEqual(report.diffScope.outOfScope, ['tmp/out-of-scope.txt']);
});

test('worker output contract validation rejects missing commit and scope drift', () => {
  const candidate = {
    blockId: 'V203',
    phaseId: '203.1',
    subphaseId: '203.1.1',
    allowedFiles: ['scripts/plan-autopilot.mjs'],
  };
  const validation = validateWorkerOutput({
    contract: 'curvios.plan-autopilot.worker-output.v1',
    status: 'completed',
    blockId: 'V203',
    phaseId: '203.1',
    subphaseId: '203.1.1',
    checks: [],
    commit: null,
    gateReason: null,
    notChecked: [],
    changedFiles: [],
  }, candidate);
  const diff = validateDiffScope(
    ['scripts/plan-autopilot.mjs', 'src/outside.js'],
    ['scripts/plan-autopilot.mjs'],
  );

  assert.equal(validation.valid, false);
  assert(validation.violations.some((entry) => /commit/.test(entry)));
  assert.equal(diff.valid, false);
  assert.deepEqual(diff.outOfScope, ['src/outside.js']);
});

test('post-worker git validation blocks unverified commits and mismatched changed files', () => {
  const candidate = {
    blockId: 'V203',
    phaseId: '203.1',
    subphaseId: '203.1.1',
    allowedFiles: ['scripts/plan-autopilot.mjs', 'tests/plan-autopilot.contract.test.mjs'],
  };
  const workerOutput = {
    contract: 'curvios.plan-autopilot.worker-output.v1',
    status: 'completed',
    blockId: 'V203',
    phaseId: '203.1',
    subphaseId: '203.1.1',
    checks: ['node --test tests/plan-autopilot.contract.test.mjs -> PASS'],
    commit: 'abcdef1',
    gateReason: null,
    notChecked: [],
    changedFiles: ['scripts/plan-autopilot.mjs'],
  };

  const unverified = validatePostWorkerGitState({
    workerOutput,
    candidate,
    gitState: {
      source: 'git',
      dirtyFiles: [],
      commit: 'abcdef1',
      commitVerified: false,
      commitFiles: ['scripts/plan-autopilot.mjs'],
      commitError: 'bad object',
    },
  });
  const mismatch = validatePostWorkerGitState({
    workerOutput,
    candidate,
    gitState: {
      source: 'git',
      dirtyFiles: [],
      commit: 'abcdef1',
      commitVerified: true,
      commitFiles: ['scripts/plan-autopilot.mjs', 'tests/plan-autopilot.contract.test.mjs'],
      commitError: null,
    },
  });

  assert.equal(unverified.valid, false);
  assert.equal(unverified.reason, 'commit_verification_failed');
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.reason, 'worker_changed_files_mismatch');
  assert(mismatch.violations.some((entry) => /commit-only/.test(entry)));
});

test('run blocks completed worker output when git cannot verify the commit', async () => {
  const report = await executeAutopilotRun({
    rootDir: process.cwd(),
    mode: 'auto-d2-review',
    maxSlices: 1,
    executor: 'fake',
    fakeStatus: 'completed',
    planMapData: singleReviewPlanMapFixture(),
    planTextByPath: {
      'docs/plaene/aktiv/V203.md': REVIEW_PLAN,
    },
    gitDirtyFiles: [],
    gitPostWorkerState: {
      source: 'git',
      dirtyFiles: [],
      commit: 'fake-commit',
      commitVerified: false,
      commitFiles: [],
      commitError: 'commit must be a git hash',
    },
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.reason, 'commit_verification_failed');
  assert.equal(report.postWorkerValidation.reason, 'commit_verification_failed');
});

test('worker prompt and contract file expose the one-slice JSON handoff', async () => {
  const [template, contractText] = await Promise.all([
    fs.readFile(new URL('../scripts/prompts/plan-autopilot-subphase.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../data/contracts/plan-autopilot-worker-output.v1.json', import.meta.url), 'utf8'),
  ]);
  const rendered = renderWorkerPrompt({
    blockId: 'V203',
    phaseId: '203.1',
    subphaseId: '203.1.1',
    subphaseTitle: 'Tool-Implementation und Tests fertigstellen.',
    mode: 'auto-d2-review',
    decision: 'D2',
    gate: 'REVIEW',
    allowedFiles: ['scripts/plan-autopilot.mjs'],
    checks: ['node --test tests/plan-autopilot.contract.test.mjs'],
  }, template);
  const contract = JSON.parse(contractText);

  assert.match(rendered, /curvios\.plan-autopilot\.worker-output\.v1/);
  assert.match(rendered, /"subphaseId": "203\.1\.1"/);
  assert.match(rendered, /git add \./);
  assert.equal(contract.contract, 'curvios.plan-autopilot.worker-output.v1');
  assert(contract.status_values.includes('gate_required'));
});

test('current V145 plan is skipped once the block is closed', async () => {
  const report = await buildAutopilotPlan({
    rootDir: process.cwd(),
    mode: 'auto-safe',
    blockFilter: 'V145',
    gitDirtyFiles: [],
  });

  assert.equal(report.summary.candidateCount, 0);
  assert.equal(report.selected, null);
  assert(!report.parked.some((entry) => entry.blockId === 'V145'));
});
