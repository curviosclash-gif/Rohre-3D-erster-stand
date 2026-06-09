import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAutopilotPlan,
  classifyCandidateGate,
  extractActivePlanContext,
  getCurrentOpenSubphase,
  normalizeGateToken,
  parseAiExecutionMatrix,
  scanRedSignals,
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

test('current V145 plan exposes a dry-run planner candidate', async () => {
  const report = await buildAutopilotPlan({
    rootDir: process.cwd(),
    mode: 'auto-safe',
    blockFilter: 'V145',
    gitDirtyFiles: [],
  });

  const candidate = report.candidates.find((entry) => entry.blockId === 'V145');
  assert.ok(candidate);
  assert.equal(candidate.phaseId, '145.1');
  assert.match(candidate.subphaseId, /^145\.1\.\d+$/);
  assert.match(candidate.gate, /^(AUTO|REVIEW|USER-GATE|UNKNOWN)$/);
  assert.equal(candidate.planRead.mode, 'active-file-slice');
  assert.equal(candidate.planRead.phaseSectionsLoaded, 1);
  assert.equal(candidate.planRead.completedPhaseSectionsLoaded, 0);
  if (!report.selected) {
    assert(report.parked.some((entry) => entry.blockId === 'V145' && entry.reason === 'lock'));
  }
});
