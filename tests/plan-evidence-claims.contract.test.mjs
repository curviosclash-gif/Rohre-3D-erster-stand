import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runPlanEvidenceClaimCheck } from '../scripts/check-plan-evidence-claims.mjs';

async function createFixture(files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-evidence-claims-'));
  for (const [relPath, text] of Object.entries(files)) {
    const fullPath = path.join(root, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, text, 'utf8');
  }
  return root;
}

test('flags a workflow evidence claim when cleanup has no decision markers', async () => {
  const root = await createFixture({
    '.agents/workflows/cleanup.md': '## Execute after confirmation\n- Remove approved items only.\n',
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [{
      id: 'fixture.cleanup',
      claim: 'cleanup has decision markers',
      files: ['.agents/workflows/cleanup.md'],
      mustContainAny: [/\bDecision-Klasse\b/i, /\bD3\b/, /\bD4\b/, /\bUser-Gate\b/i],
    }],
  });

  assert.equal(report.violations.length, 1);
  assert.equal(report.violations[0].id, 'fixture.cleanup');
});

test('accepts cleanup evidence when decision class and user gate markers are present', async () => {
  const root = await createFixture({
    '.agents/workflows/cleanup.md': [
      '- Decision-Klasse bestimmen; Cleanup ist D3/D4-nah.',
      '- Vor Umsetzung User-Gate einholen und Zweckklasse fuer neue Ablagen nennen.',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [{
      id: 'fixture.cleanup',
      claim: 'cleanup has decision markers',
      files: ['.agents/workflows/cleanup.md'],
      mustContainAll: [/\bDecision-Klasse\b/i, /\bD3\/D4\b/, /\bUser-Gate\b/i, /\bZweckklasse\b/i],
    }],
  });

  assert.deepEqual(report.violations, []);
});

test('flags workflow glob claims without a matching assertion', async () => {
  const root = await createFixture({
    'docs/plaene/aktiv/V200.md': [
      '# V200',
      '',
      '- Evidence: `.agents/workflows/{plan,code,cleanup}.md` ist konsistent.',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [],
    activePlanFiles: ['docs/plaene/aktiv/V200.md'],
  });

  assert.equal(report.violations.length, 1);
  assert.equal(report.violations[0].id, 'claim-coverage.workflow-brace-glob');
});

test('flags broad rule, scope and repo-wide claims without matching assertions', async () => {
  const root = await createFixture({
    'docs/plaene/aktiv/V201.md': [
      '# V201',
      '',
      '- Evidence: `.agents/rules/{planning_and_governance,git_and_commits}.md` ist konsistent.',
      '- Alle scope_files sind vollstaendig abgedeckt.',
      '- Repo-weit konsistent nach Abschluss.',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [],
    activePlanFiles: ['docs/plaene/aktiv/V201.md'],
  });
  const ids = report.violations.map((violation) => violation.id);

  assert(ids.includes('claim-coverage.rules-brace-glob'));
  assert(ids.includes('claim-coverage.all-scope-files-claim'));
  assert(ids.includes('claim-coverage.repo-wide-consistency-claim'));
});

test('reports active code plans without architecture acceptance', async () => {
  const root = await createFixture({
    'docs/plaene/aktiv/V202.md': [
      '---',
      'id: V202',
      'status: planned',
      'scope_files:',
      '  - src/core/main.js',
      '---',
      '',
      '# V202',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [],
    activePlanFiles: ['docs/plaene/aktiv/V202.md'],
  });

  assert.deepEqual(report.violations, []);
  assert.equal(report.warnings.length, 1);
  assert.equal(report.warnings[0].id, 'architecture-acceptance.missing');
});

test('reports architecture closure claims without concrete guard evidence', async () => {
  const root = await createFixture({
    'docs/plaene/aktiv/V203.md': [
      '---',
      'id: V203',
      'status: planned',
      'scope_files:',
      '  - src/application/session-runtime/Foo.js',
      '---',
      '',
      '# V203',
      '',
      '## Architecture Acceptance',
      '',
      '- Betroffene Schichten: application',
      '',
      '- [x] DoD.1 Boundary ist geschlossen. (abgeschlossen: 2026-05-21; evidence: npm run plan:check -> PASS)',
      '- [x] DoD.2 Ratchet ist belegt. (abgeschlossen: 2026-05-21; evidence: npm run check:architecture:ratchet -> PASS)',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [],
    activePlanFiles: ['docs/plaene/aktiv/V203.md'],
  });

  assert.deepEqual(report.violations, []);
  assert.equal(report.warnings.length, 1);
  assert.equal(report.warnings[0].id, 'architecture-claim.weak-evidence');
});

test('reports done active plans with open top-level DoDs', async () => {
  const root = await createFixture({
    'docs/plaene/aktiv/V204.md': [
      '---',
      'id: V204',
      'status: done',
      '---',
      '',
      '# V204',
      '',
      '## Definition of Done',
      '',
      '- [ ] DoD.1 Abschluss ist formal offen.',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [],
    activePlanFiles: ['docs/plaene/aktiv/V204.md'],
  });

  assert.deepEqual(report.violations, []);
  assert.equal(report.warnings.length, 1);
  assert.equal(report.warnings[0].id, 'closure.open-top-level-dod');
});

test('reports done active plans with open final gates', async () => {
  const root = await createFixture({
    'docs/plaene/aktiv/V205.md': [
      '---',
      'id: V205',
      'status: done',
      '---',
      '',
      '# V205',
      '',
      '### 205.99 Abschluss-Gate',
      '',
      '- [ ] 205.99.1 Abschlussgate ist offen.',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [],
    activePlanFiles: ['docs/plaene/aktiv/V205.md'],
  });

  assert.deepEqual(report.violations, []);
  assert.equal(report.warnings.length, 1);
  assert.equal(report.warnings[0].id, 'closure.open-final-gate');
});

test('reports weak completed evidence claims as warnings', async () => {
  const root = await createFixture({
    'docs/plaene/aktiv/V206.md': [
      '---',
      'id: V206',
      'status: planned',
      '---',
      '',
      '# V206',
      '',
      '- [x] 206.1.1 Abschlussclaim. (abgeschlossen: 2026-05-23; evidence: verified)',
    ].join('\n'),
  });

  const report = await runPlanEvidenceClaimCheck({
    root,
    assertions: [],
    activePlanFiles: ['docs/plaene/aktiv/V206.md'],
  });

  assert.deepEqual(report.violations, []);
  assert.equal(report.warnings.length, 1);
  assert.equal(report.warnings[0].id, 'closure.weak-evidence');
});

test('default assertions cover the real V117 workflow evidence claim', async () => {
  const report = await runPlanEvidenceClaimCheck();

  assert.deepEqual(report.violations, []);
});
