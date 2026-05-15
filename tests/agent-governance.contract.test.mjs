import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateAgentEnvelope } from '../scripts/agent-preflight.mjs';
import { validateAgentCommitMessage } from '../scripts/check-agent-commit-message.mjs';

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'curvios-agent-governance-'));
  await fs.mkdir(path.join(root, '.agents', 'workflows'), { recursive: true });
  await fs.writeFile(path.join(root, '.agents', 'workflows', 'code.md'), '---\ndescription: Test\n---\n', 'utf8');
  await fs.writeFile(path.join(root, '.agents', 'workflows', 'quick.md'), '---\ndescription: Test\n---\n', 'utf8');
  return root;
}

async function writeGraphFixture(root, graph) {
  const target = path.join(root, 'docs', 'generated', 'knowledge-graph.json');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(graph, null, 2), 'utf8');
}

test('agent envelope accepts scoped D2 code commit metadata', async () => {
  const root = await createFixture();
  const result = await validateAgentEnvelope({
    root,
    workflow: 'quick',
    decision: 'D2',
    evidence: 'npm run plan:check -> PASS',
    scope: 'src/core/main.js',
    knownUncommitted: 'none',
    changes: [{ status: 'M', file: 'src/core/main.js' }],
    uncommittedFiles: ['src/core/main.js'],
  });

  assert.deepEqual(result.violations, []);
});

test('agent envelope blocks governance surfaces below D3', async () => {
  const root = await createFixture();
  const result = await validateAgentEnvelope({
    root,
    workflow: 'code',
    decision: 'D2',
    evidence: 'npm run plan:check -> PASS',
    scope: '.agents/workflows/code.md',
    knownUncommitted: 'none',
    changes: [{ status: 'M', file: '.agents/workflows/code.md' }],
    uncommittedFiles: ['.agents/workflows/code.md'],
  });

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].id, 'd3-surface-underrated');
});

test('agent envelope requires recovery for tracked deletions', async () => {
  const root = await createFixture();
  const result = await validateAgentEnvelope({
    root,
    workflow: 'code',
    decision: 'D3',
    evidence: 'npm run plan:check -> PASS',
    gate: 'User approved D3 scope',
    scope: 'src/old-path.js',
    knownUncommitted: 'none',
    residualRisk: 'none',
    notChecked: 'full suite',
    changes: [{ status: 'D', file: 'src/old-path.js' }],
    uncommittedFiles: ['src/old-path.js'],
  });

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].id, 'tracked-delete-underrated');
});

test('commit message validator requires workflow decision and evidence trailers', async () => {
  const root = await createFixture();
  const result = await validateAgentCommitMessage({
    root,
    messageText: 'fix: tiny fix\n',
    changes: [{ status: 'M', file: 'src/core/main.js' }],
    uncommittedFiles: ['src/core/main.js'],
  });
  const ids = result.violations.map((violation) => violation.id).sort();

  assert(ids.includes('missing-workflow'));
  assert(ids.includes('missing-decision'));
  assert(ids.includes('missing-evidence'));
});

test('commit message validator accepts D3 governance commit with gate', async () => {
  const root = await createFixture();
  const result = await validateAgentCommitMessage({
    root,
    messageText: [
      'docs: enforce agent workflow metadata',
      '',
      'Workflow: code',
      'Decision: D3',
      'Evidence: npm run plan:check -> PASS',
      'Scope: .agents/workflows/code.md',
      'Known-uncommitted: none',
      'Residual-risk: none',
      'Not-checked: full suite',
      'Gate: User requested repository enforcement',
    ].join('\n'),
    changes: [{ status: 'M', file: '.agents/workflows/code.md' }],
    uncommittedFiles: ['.agents/workflows/code.md'],
  });

  assert.deepEqual(result.violations, []);
});

test('agent envelope reports missing graph as a warning only', async () => {
  const root = await createFixture();
  const result = await validateAgentEnvelope({
    root,
    workflow: 'quick',
    decision: 'D2',
    evidence: 'npm run plan:check -> PASS',
    scope: 'src/core/main.js',
    knownUncommitted: 'none',
    changes: [{ status: 'M', file: 'src/core/main.js' }],
    uncommittedFiles: ['src/core/main.js'],
  });

  assert.deepEqual(result.violations, []);
  assert.equal(result.graphContext.available, false);
  assert(result.warnings.some((warning) => warning.includes('Graph: docs/generated/knowledge-graph.json fehlt')));
});

test('agent envelope includes graph scope context for staged files', async () => {
  const root = await createFixture();
  await writeGraphFixture(root, {
    nodes: [
      {
        id: 'src/core/main.js',
        type: 'file',
        attributes: {
          source: ['scope-files'],
          scopeBlocks: ['V99'],
        },
      },
    ],
    edges: [
      {
        from: 'B13',
        to: 'src/core/main.js',
        type: 'scope',
        attributes: { declaredBy: 'audit-scope' },
      },
    ],
  });

  const result = await validateAgentEnvelope({
    root,
    workflow: 'quick',
    decision: 'D2',
    evidence: 'npm run plan:check -> PASS',
    scope: 'src/core/main.js',
    knownUncommitted: 'none',
    changes: [{ status: 'M', file: 'src/core/main.js' }],
    uncommittedFiles: ['src/core/main.js'],
  });

  assert.deepEqual(result.violations, []);
  assert.equal(result.graphContext.available, true);
  assert.equal(result.graphContext.files[0].inGraph, true);
  assert.deepEqual(result.graphContext.files[0].scopeBlocks, ['B13', 'V99']);
});

test('commit message validator blocks scope mismatch and unnamed uncommitted files', async () => {
  const root = await createFixture();
  const result = await validateAgentCommitMessage({
    root,
    messageText: [
      'fix: tiny fix',
      '',
      'Workflow: quick',
      'Decision: D2',
      'Evidence: npm run plan:check -> PASS',
      'Scope: src/core/other.js',
      'Known-uncommitted: none',
    ].join('\n'),
    changes: [{ status: 'M', file: 'src/core/main.js' }],
    uncommittedFiles: ['src/core/main.js', 'docs/user-note.md'],
  });
  const ids = result.violations.map((violation) => violation.id).sort();

  assert(ids.includes('scope-missing-staged-files'));
  assert(ids.includes('scope-has-unstaged-files'));
  assert(ids.includes('known-uncommitted-missing-files'));
});

test('commit message validator requires D3 residual risk and not checked fields', async () => {
  const root = await createFixture();
  const result = await validateAgentCommitMessage({
    root,
    messageText: [
      'docs: governance change',
      '',
      'Workflow: code',
      'Decision: D3',
      'Evidence: npm run gates:pre-commit -> PASS',
      'Scope: .agents/workflows/code.md',
      'Known-uncommitted: none',
      'Gate: User requested repository enforcement',
    ].join('\n'),
    changes: [{ status: 'M', file: '.agents/workflows/code.md' }],
    uncommittedFiles: ['.agents/workflows/code.md'],
  });
  const ids = result.violations.map((violation) => violation.id).sort();

  assert(ids.includes('missing-residual-risk'));
  assert(ids.includes('missing-not-checked'));
});

test('commit message validator blocks broad claims without broad evidence', async () => {
  const root = await createFixture();
  const result = await validateAgentCommitMessage({
    root,
    messageText: [
      'docs: claim everything',
      '',
      'Everything is repo-weit konsistent.',
      '',
      'Workflow: code',
      'Decision: D3',
      'Evidence: npm run plan:check -> PASS',
      'Scope: .agents/workflows/code.md',
      'Known-uncommitted: none',
      'Residual-risk: none',
      'Not-checked: full suite',
      'Gate: User requested repository enforcement',
    ].join('\n'),
    changes: [{ status: 'M', file: '.agents/workflows/code.md' }],
    uncommittedFiles: ['.agents/workflows/code.md'],
  });

  assert(result.violations.some((violation) => violation.id === 'broad-claim-without-broad-evidence'));
});

test('commit message validator accepts repeated scope and known-uncommitted fields', async () => {
  const root = await createFixture();
  const result = await validateAgentCommitMessage({
    root,
    messageText: [
      'docs: multiline fields',
      '',
      'Workflow: code',
      'Decision: D3',
      'Evidence: npm run plan:check -> PASS',
      'Scope: scripts/agent-preflight.mjs',
      'Scope: scripts/check-agent-commit-message.mjs',
      'Known-uncommitted: docs/Umsetzungsplan.md',
      'Known-uncommitted: docs/plaene/aktiv/V119.md',
      'Residual-risk: none',
      'Not-checked: full suite',
      'Gate: User requested repository enforcement',
    ].join('\n'),
    changes: [
      { status: 'M', file: 'scripts/agent-preflight.mjs' },
      { status: 'M', file: 'scripts/check-agent-commit-message.mjs' },
    ],
    uncommittedFiles: [
      'scripts/agent-preflight.mjs',
      'scripts/check-agent-commit-message.mjs',
      'docs/Umsetzungsplan.md',
      'docs/plaene/aktiv/V119.md',
    ],
  });

  assert.deepEqual(result.violations, []);
});
