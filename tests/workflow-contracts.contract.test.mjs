import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  parseWorkflowFrontmatter,
  validateWorkflowContracts,
} from '../scripts/check-workflow-contracts.mjs';

test('all repository workflows satisfy the workflow contract', async () => {
  const result = await validateWorkflowContracts();
  assert.deepEqual(result.violations, []);
  assert(result.workflows.length > 0);
});

test('workflow contract parser reads scalar and list fields', () => {
  const frontmatter = parseWorkflowFrontmatter([
    '---',
    'description: Test workflow',
    'decision_floor: D2',
    'mutates: required',
    'user_gate: conditional',
    'commit_strategy: scoped',
    'required_checks:',
    '  - npm run plan:check',
    'outputs:',
    '  - repo-change',
    '---',
  ].join('\n'));

  assert.equal(frontmatter.decision_floor, 'D2');
  assert.deepEqual(frontmatter.required_checks, ['npm run plan:check']);
  assert.deepEqual(frontmatter.outputs, ['repo-change']);
});

test('workflow contract reports missing fields and invalid read-only commits', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'curvios-workflow-contract-'));
  const workflowDir = path.join(root, '.agents', 'workflows');
  await fs.mkdir(workflowDir, { recursive: true });
  await fs.writeFile(path.join(workflowDir, 'bad.md'), [
    '---',
    'description: Broken workflow',
    'decision_floor: D0',
    'mutates: never',
    'user_gate: never',
    'commit_strategy: scoped',
    'required_checks: []',
    '---',
  ].join('\n'), 'utf8');

  const result = await validateWorkflowContracts({ root });
  const ids = result.violations.map((violation) => violation.id);
  assert(ids.includes('missing-field'));
  assert(ids.includes('invalid-outputs'));
  assert(ids.includes('read-only-commit'));
});
