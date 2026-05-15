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
