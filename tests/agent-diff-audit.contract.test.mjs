import assert from 'node:assert/strict';
import test from 'node:test';

import { auditStagedDiff } from '../scripts/check-ai-diff-audit.mjs';

function diffFor(file, addedLines = []) {
  const added = addedLines.map((line) => `+${line}`).join('\n');
  return [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    '@@',
    added,
  ].join('\n');
}

function ids(result) {
  return result.violations.map((violation) => violation.id).sort();
}

test('runtime plus generated artifact requires D3 envelope', () => {
  const result = auditStagedDiff({
    changes: [
      { status: 'M', file: 'src/core/main.js' },
      { status: 'M', file: 'docs/generated/knowledge-graph.json' },
    ],
    diff: [
      diffFor('src/core/main.js', ['export const touched = true;']),
      diffFor('docs/generated/knowledge-graph.json', ['{"nodes":[]}']),
    ].join('\n'),
    envelope: {
      decision: 'D2',
      notChecked: 'full suite',
    },
  });

  assert(ids(result).includes('generated-runtime-requires-d3-envelope'));
});

test('generator plus generated artifact passes when Generated-by is present', () => {
  const result = auditStagedDiff({
    changes: [
      { status: 'M', file: 'scripts/build-plan-index.mjs' },
      { status: 'M', file: 'docs/generated/plan-index.json' },
    ],
    diff: [
      diffFor('scripts/build-plan-index.mjs', ['export const generator = true;']),
      diffFor('docs/generated/plan-index.json', ['{"schema_version":1}']),
    ].join('\n'),
    envelope: {
      decision: 'D2',
      generatedBy: 'npm run plan:index:build',
      notChecked: 'full suite',
    },
  });

  assert.deepEqual(result.violations, []);
  assert(result.info.some((finding) => finding.id === 'generated-artifact-with-generator'));
});

test('new authoritative docs file needs canonical source or D3 gate', () => {
  const result = auditStagedDiff({
    changes: [{ status: 'A', file: 'docs/new-status.md' }],
    diff: diffFor('docs/new-status.md', [
      '# New Status',
      'This file is canonical and defines scope_files plus Phase gates.',
    ]),
    envelope: {
      decision: 'D2',
      notChecked: 'full suite',
    },
  });

  assert(ids(result).includes('shadow-truth-requires-canonical-source'));
});

test('gate bypass pattern in protected surface requires D3', () => {
  const result = auditStagedDiff({
    changes: [{ status: 'M', file: 'package.json' }],
    diff: diffFor('package.json', [
      '"commit": "git commit --no-verify"',
    ]),
    envelope: {
      decision: 'D2',
      notChecked: 'full suite',
    },
  });

  assert(ids(result).includes('gate-bypass-requires-d3'));
});

test('focused test marker fails as a hard test signal', () => {
  const focusLine = 'test.' + 'only("focused", () => {});';
  const result = auditStagedDiff({
    changes: [{ status: 'M', file: 'tests/focused.contract.test.mjs' }],
    diff: diffFor('tests/focused.contract.test.mjs', [focusLine]),
    envelope: {
      decision: 'D2',
      notChecked: 'full suite',
    },
  });

  assert(ids(result).includes('test-focus-or-skip'));
});

test('D2 envelope without Not-checked fails', () => {
  const result = auditStagedDiff({
    changes: [{ status: 'M', file: 'src/core/main.js' }],
    diff: diffFor('src/core/main.js', ['export const touched = true;']),
    envelope: {
      decision: 'D2',
    },
  });

  assert(ids(result).includes('missing-not-checked-d2'));
});
