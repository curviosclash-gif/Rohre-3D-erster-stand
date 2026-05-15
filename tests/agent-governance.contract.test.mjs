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

test('agent envelope accepts scoped D2 code commit metadata', async () => {
  const root = await createFixture();
  const result = await validateAgentEnvelope({
    root,
    workflow: 'quick',
    decision: 'D2',
    evidence: 'npm run plan:check',
    changes: [{ status: 'M', file: 'src/core/main.js' }],
  });

  assert.deepEqual(result.violations, []);
});

test('agent envelope blocks governance surfaces below D3', async () => {
  const root = await createFixture();
  const result = await validateAgentEnvelope({
    root,
    workflow: 'code',
    decision: 'D2',
    evidence: 'npm run plan:check',
    changes: [{ status: 'M', file: '.agents/workflows/code.md' }],
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
    evidence: 'npm run plan:check',
    gate: 'User approved D3 scope',
    changes: [{ status: 'D', file: 'src/old-path.js' }],
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
      'Evidence: npm run plan:check',
      'Gate: User requested repository enforcement',
    ].join('\n'),
    changes: [{ status: 'M', file: '.agents/workflows/code.md' }],
  });

  assert.deepEqual(result.violations, []);
});
