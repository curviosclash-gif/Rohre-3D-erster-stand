#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();

const ASSERTIONS = [
  {
    id: 'V117.workflow-decision-markers',
    claim: 'V117 claims all core workflows reference the AI decision framework.',
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

export async function runPlanEvidenceClaimCheck({ root = ROOT, assertions = ASSERTIONS } = {}) {
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

  return { assertions: assertions.length, violations };
}

async function main() {
  const report = await runPlanEvidenceClaimCheck();
  if (report.violations.length === 0) {
    console.log(`[plan-evidence-claims] passed assertions=${report.assertions}`);
    return;
  }

  console.error(`[plan-evidence-claims] failed assertions=${report.assertions} violations=${report.violations.length}`);
  for (const violation of report.violations) {
    console.error(`- ${violation.file} [${violation.id}] ${violation.message}`);
  }
  process.exit(1);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  await main();
}
