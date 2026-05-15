#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const ACTIVE_PLAN_ROOT = 'docs/plaene/aktiv';

export const CLAIM_PATTERNS = [
  {
    id: 'workflow-brace-glob',
    pattern: /\.agents[\\/]+workflows[\\/]+\{[^}]+\}\.md/i,
    message: 'Workflow-Glob-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
  {
    id: 'all-workflows-claim',
    pattern: /\b(?:alle|all|core)\s+Workflows\b/i,
    message: '"Alle/core Workflows"-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
];

export const ASSERTIONS = [
  {
    id: 'V117.workflow-decision-markers',
    claim: 'V117 claims all core workflows reference the AI decision framework.',
    evidenceFiles: ['docs/plaene/aktiv/V117.md'],
    coversClaimPatterns: ['workflow-brace-glob', 'all-workflows-claim'],
    files: [
      '.agents/workflows/plan.md',
      '.agents/workflows/code.md',
      '.agents/workflows/quick.md',
      '.agents/workflows/bugfix.md',
      '.agents/workflows/cleanup.md',
    ],
    mustContainAny: [
      /\bDecision-Klasse\b/i,
      /\bD3\b/,
      /\bD4\b/,
      /\bUser-Gate\b/i,
      /\bZweckklasse\b/i,
    ],
  },
  {
    id: 'V117.cleanup-gate-specificity',
    claim: 'V117 treats cleanup as D3/D4-near and user-gated.',
    files: ['.agents/workflows/cleanup.md'],
    mustContainAll: [
      /\bDecision-Klasse\b/i,
      /\bD3\/D4\b|\bD3\b[\s\S]*\bD4\b|\bD4\b[\s\S]*\bD3\b/,
      /\bUser-Gate\b/i,
      /\bZweckklasse\b/i,
    ],
  },
];

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

async function readText(root, relPath) {
  return fs.readFile(path.join(root, relPath), 'utf8');
}

function formatPatterns(patterns) {
  return patterns.map((pattern) => pattern.toString()).join(', ');
}

async function listActivePlanFiles(root) {
  const planRoot = path.join(root, ACTIVE_PLAN_ROOT);
  let entries = [];
  try {
    entries = await fs.readdir(planRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => normalizePath(path.join(ACTIVE_PLAN_ROOT, entry.name)));
}

function findLineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function assertionCoversClaim(assertion, planFile, patternId) {
  return assertion.evidenceFiles?.map(normalizePath).includes(normalizePath(planFile))
    && assertion.coversClaimPatterns?.includes(patternId);
}

async function validatePlanClaimCoverage(root, assertions, activePlanFiles) {
  const violations = [];

  for (const planFile of activePlanFiles) {
    let text = '';
    try {
      text = await readText(root, planFile);
    } catch {
      continue;
    }

    for (const claimPattern of CLAIM_PATTERNS) {
      const match = claimPattern.pattern.exec(text);
      if (!match) {
        continue;
      }

      const covered = assertions.some((assertion) => (
        assertionCoversClaim(assertion, planFile, claimPattern.id)
      ));

      if (!covered) {
        violations.push({
          id: `claim-coverage.${claimPattern.id}`,
          file: normalizePath(planFile),
          line: findLineNumber(text, match.index),
          message: claimPattern.message,
        });
      }
    }
  }

  return violations;
}

export async function runPlanEvidenceClaimCheck({
  root = ROOT,
  assertions = ASSERTIONS,
  activePlanFiles = null,
} = {}) {
  const violations = [];

  for (const assertion of assertions) {
    for (const relPath of assertion.files) {
      let text = '';
      try {
        text = await readText(root, relPath);
      } catch (error) {
        violations.push({
          id: assertion.id,
          file: normalizePath(relPath),
          message: `Claim-Datei nicht lesbar: ${error?.message || error}`,
        });
        continue;
      }

      if (assertion.mustContainAny?.length
        && !assertion.mustContainAny.some((pattern) => pattern.test(text))) {
        violations.push({
          id: assertion.id,
          file: normalizePath(relPath),
          message: `${assertion.claim} Erwartet mindestens einen Marker: ${formatPatterns(assertion.mustContainAny)}`,
        });
      }

      if (assertion.mustContainAll?.length) {
        for (const pattern of assertion.mustContainAll) {
          if (!pattern.test(text)) {
            violations.push({
              id: assertion.id,
              file: normalizePath(relPath),
              message: `${assertion.claim} Fehlender Marker: ${pattern.toString()}`,
            });
          }
        }
      }
    }
  }

  const planFiles = activePlanFiles ?? await listActivePlanFiles(root);
  violations.push(...await validatePlanClaimCoverage(root, assertions, planFiles));

  return { assertions: assertions.length, activePlanFiles: planFiles.length, violations };
}

async function main() {
  const report = await runPlanEvidenceClaimCheck();
  if (report.violations.length === 0) {
    console.log(`[plan-evidence-claims] passed assertions=${report.assertions} activePlans=${report.activePlanFiles}`);
    return;
  }

  console.error(`[plan-evidence-claims] failed assertions=${report.assertions} activePlans=${report.activePlanFiles} violations=${report.violations.length}`);
  for (const violation of report.violations) {
    const location = violation.line ? `${violation.file}:${violation.line}` : violation.file;
    console.error(`- ${location} [${violation.id}] ${violation.message}`);
  }
  process.exit(1);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  await main();
}
