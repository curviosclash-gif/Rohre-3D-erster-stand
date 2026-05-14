import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runAiDecisionPolicyReport } from '../scripts/check-ai-decision-policy.mjs';

async function createPolicyFixture(markdownByPath) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-decision-policy-'));
  for (const [relPath, text] of Object.entries(markdownByPath)) {
    const fullPath = path.join(root, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, text, 'utf8');
  }
  return root;
}

async function runFixture(markdownByPath) {
  const root = await createPolicyFixture(markdownByPath);
  return runAiDecisionPolicyReport({ root, scanAll: true });
}

test('flags D4-like auto-move without nearby user gate or recovery context', async () => {
  const report = await runFixture({
    'docs/plaene/aktiv/V117.md': [
      '# Test',
      '',
      '- Auto-Move fuer alte Plaene ausfuehren.',
    ].join('\n'),
  });

  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].id, 'd4-term-without-user-gate-nearby');
});

test('allows D4-like action when user gate and recovery are in the same section', async () => {
  const report = await runFixture({
    'docs/plaene/aktiv/V117.md': [
      '# Test',
      '',
      '- Auto-Move fuer alte Plaene nur nach User-Gate ausfuehren.',
      '- Recovery: verschobene Dateien koennen per scoped Commit zurueckgefuehrt werden.',
    ].join('\n'),
  });

  assert.deepEqual(report.findings, []);
});

test('ignores frontmatter and scope file lists', async () => {
  const report = await runFixture({
    'docs/plaene/aktiv/V117.md': [
      '---',
      'scope_files:',
      '  - AGENTS.md',
      '  - .agents/workflows/cleanup.md',
      '  - docs/plaene/aktiv/V117.md',
      '---',
      '',
      '# Test',
    ].join('\n'),
  });

  assert.deepEqual(report.findings, []);
});
