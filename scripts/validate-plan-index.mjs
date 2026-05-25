#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPlanIndex } from './build-plan-index.mjs';

const ROOT = process.cwd();
const INDEX_PATH = 'docs/generated/plan-index.json';

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function blockIdFromDependency(value) {
  return String(value || '').match(/\b(V\d+)\b/)?.[1] || null;
}

function addViolation(violations, type, message, details = {}) {
  violations.push({ type, message, ...details });
}

function idsFor(items, field = 'id') {
  return (items || []).map((item) => String(item?.[field] || '')).filter(Boolean);
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
}

function byId(items) {
  return new Map((items || []).map((item) => [String(item.id || ''), item]));
}

async function exists(rootDir, relativePath) {
  try {
    await fs.access(path.resolve(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareTopLevelFields({ actual, expected, violations }) {
  for (const field of ['schema_version', 'updated']) {
    if (!sameJson(actual?.[field], expected[field])) {
      addViolation(violations, 'field-mismatch', `Top-level field ${field} differs.`, {
        field,
        expected: expected[field],
        actual: actual?.[field],
      });
    }
  }

  for (const field of ['start_anchor', 'next_recommended_start', 'sources']) {
    if (!sameJson(actual?.[field], expected[field])) {
      addViolation(violations, 'field-mismatch', `Top-level field ${field} differs.`, {
        field,
        expected: expected[field],
        actual: actual?.[field],
      });
    }
  }
}

function compareWorkstreams({ actual, expected, violations }) {
  const actualWorkstreams = Array.isArray(actual?.workstreams) ? actual.workstreams : [];
  const expectedWorkstreams = expected.workstreams;
  const actualById = byId(actualWorkstreams);
  const expectedById = byId(expectedWorkstreams);

  for (const duplicate of findDuplicates(idsFor(actualWorkstreams))) {
    addViolation(violations, 'duplicate-id', `Duplicate workstream id ${duplicate} in index.`, {
      id: duplicate,
    });
  }

  for (const expectedWorkstream of expectedWorkstreams) {
    const actualWorkstream = actualById.get(expectedWorkstream.id);
    if (!actualWorkstream) {
      addViolation(violations, 'unknown-workstream', `Workstream ${expectedWorkstream.id} missing in index.`, {
        id: expectedWorkstream.id,
      });
      continue;
    }
    if (!sameJson(actualWorkstream, expectedWorkstream)) {
      addViolation(violations, 'workstream-mismatch', `Workstream ${expectedWorkstream.id} differs from master.`, {
        id: expectedWorkstream.id,
        expected: expectedWorkstream,
        actual: actualWorkstream,
      });
    }
  }

  for (const actualWorkstream of actualWorkstreams) {
    if (!expectedById.has(actualWorkstream.id)) {
      addViolation(violations, 'unknown-workstream', `Unknown workstream ${actualWorkstream.id} in index.`, {
        id: actualWorkstream.id,
      });
    }
  }
}

async function compareBlocks({ rootDir, actual, expected, violations }) {
  const actualBlocks = Array.isArray(actual?.blocks) ? actual.blocks : [];
  const expectedBlocks = expected.blocks;
  const actualById = byId(actualBlocks);
  const expectedById = byId(expectedBlocks);
  const expectedWorkstreamIds = new Set(expected.workstreams.map((entry) => entry.id));

  for (const duplicate of findDuplicates(idsFor(actualBlocks))) {
    addViolation(violations, 'duplicate-id', `Duplicate block id ${duplicate} in index.`, {
      id: duplicate,
    });
  }

  for (const expectedBlock of expectedBlocks) {
    const actualBlock = actualById.get(expectedBlock.id);
    if (!actualBlock) {
      addViolation(violations, 'missing-in-index', `Block ${expectedBlock.id} is missing in index.`, {
        id: expectedBlock.id,
      });
      continue;
    }

    for (const field of ['title', 'status', 'priority', 'owner', 'current_phase', 'plan_file']) {
      if (!sameJson(actualBlock[field], expectedBlock[field])) {
        addViolation(violations, 'field-mismatch', `Block ${expectedBlock.id} field ${field} differs.`, {
          id: expectedBlock.id,
          field,
          expected: expectedBlock[field],
          actual: actualBlock[field],
        });
      }
    }

    if (!sameJson(actualBlock.depends_on, expectedBlock.depends_on)) {
      addViolation(violations, 'field-mismatch', `Block ${expectedBlock.id} field depends_on differs.`, {
        id: expectedBlock.id,
        field: 'depends_on',
        expected: expectedBlock.depends_on,
        actual: actualBlock.depends_on,
      });
    }

    if (actualBlock.workstream !== expectedBlock.workstream) {
      addViolation(violations, 'workstream-mismatch', `Block ${expectedBlock.id} workstream differs.`, {
        id: expectedBlock.id,
        expected: expectedBlock.workstream,
        actual: actualBlock.workstream,
      });
    }

    if (!sameJson(actualBlock.lock, expectedBlock.lock)) {
      addViolation(violations, 'lock-mismatch', `Block ${expectedBlock.id} lock projection differs.`, {
        id: expectedBlock.id,
        expected: expectedBlock.lock,
        actual: actualBlock.lock,
      });
    }
  }

  for (const actualBlock of actualBlocks) {
    if (!expectedById.has(actualBlock.id)) {
      addViolation(violations, 'missing-in-master', `Block ${actualBlock.id} exists in index but not in master.`, {
        id: actualBlock.id,
      });
    }

    if (!expectedWorkstreamIds.has(actualBlock.workstream)) {
      addViolation(violations, 'unknown-workstream', `Block ${actualBlock.id} references unknown workstream ${actualBlock.workstream}.`, {
        id: actualBlock.id,
        workstream: actualBlock.workstream,
      });
    }

    if (!actualBlock.plan_file || !(await exists(rootDir, normalizePath(actualBlock.plan_file)))) {
      addViolation(violations, 'invalid-plan-file', `Block ${actualBlock.id} references missing plan_file ${actualBlock.plan_file}.`, {
        id: actualBlock.id,
        plan_file: actualBlock.plan_file || null,
      });
    }

    for (const dependency of actualBlock.depends_on || []) {
      const dependencyBlock = blockIdFromDependency(dependency);
      if (!dependencyBlock) {
        addViolation(violations, 'unknown-dependency', `Block ${actualBlock.id} has unparseable dependency ${dependency}.`, {
          id: actualBlock.id,
          dependency,
        });
        continue;
      }

      const activePlanPath = `docs/plaene/aktiv/${dependencyBlock}.md`;
      if (!expectedById.has(dependencyBlock) && !(await exists(rootDir, activePlanPath))) {
        addViolation(violations, 'unknown-dependency', `Block ${actualBlock.id} depends on unknown ${dependency}.`, {
          id: actualBlock.id,
          dependency,
        });
      }
    }
  }
}

export async function validatePlanIndex({ rootDir = ROOT, indexPath = INDEX_PATH } = {}) {
  const absoluteIndexPath = path.resolve(rootDir, indexPath);
  const violations = [];
  let indexText = '';
  let actual = null;
  let expected = null;

  try {
    indexText = await fs.readFile(absoluteIndexPath, 'utf8');
  } catch (error) {
    addViolation(violations, 'missing-in-index', `${indexPath} is not readable.`, {
      path: indexPath,
      error: error.message,
    });
    return violations;
  }

  try {
    actual = JSON.parse(indexText);
  } catch (error) {
    addViolation(violations, 'field-mismatch', `${indexPath} is not valid JSON.`, {
      path: indexPath,
      error: error.message,
    });
    return violations;
  }

  try {
    expected = await buildPlanIndex({ rootDir });
  } catch (error) {
    addViolation(violations, 'field-mismatch', `Expected plan index could not be built: ${error.message}`, {
      path: indexPath,
    });
    return violations;
  }

  if (stableJson(actual) !== stableJson(expected)) {
    addViolation(violations, 'manual-generated-edit', `${indexPath} differs from generator output.`, {
      path: indexPath,
      generator: 'scripts/build-plan-index.mjs',
    });
  }

  compareTopLevelFields({ actual, expected, violations });
  compareWorkstreams({ actual, expected, violations });
  await compareBlocks({ rootDir, actual, expected, violations });

  return violations;
}

function formatViolation(violation) {
  const suffix = violation.id ? ` (${violation.id})` : '';
  return `[${violation.type}] ${violation.message}${suffix}`;
}

async function main() {
  const violations = await validatePlanIndex();
  if (violations.length === 0) {
    process.stdout.write('[plan:index:check] passed\n');
    return;
  }

  console.error(`[plan:index:check] failed violations=${violations.length}`);
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[plan:index:check] ${error.message}`);
    process.exitCode = 1;
  });
}
