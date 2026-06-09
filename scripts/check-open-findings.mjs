#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildOpenFindingsIndex } from './build-open-findings-index.mjs';

const ROOT = process.cwd();
const INDEX_PATH = 'docs/generated/open-findings-index.json';

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function checkOpenFindings({
  rootDir = ROOT,
  asOf,
  findingsMarkdown,
  decisionsDocument,
  masterMarkdown,
  changelogMarkdown,
  trackedFiles,
  currentIndexDocument,
} = {}) {
  const expected = await buildOpenFindingsIndex({
    rootDir,
    asOf,
    findingsMarkdown,
    decisionsDocument,
    masterMarkdown,
    changelogMarkdown,
    trackedFiles,
  });
  let current = null;
  if (currentIndexDocument) {
    current = currentIndexDocument;
  } else {
    try {
      current = JSON.parse(await fs.readFile(path.resolve(rootDir, INDEX_PATH), 'utf8'));
    } catch {
      // Missing or malformed generated output is reported as WARN during the pilot.
    }
  }

  const warnings = [];
  if (!current || stableJson(current) !== stableJson(expected)) {
    warnings.push({
      code: 'open-findings-index-stale',
      finding_id: null,
      severity: 'warn',
      message: `Run npm run findings:index:build to refresh ${INDEX_PATH}.`,
    });
  }

  for (const finding of expected.findings) {
    for (const drift of finding.drift) {
      warnings.push({
        code: drift.code,
        finding_id: finding.id,
        severity: drift.severity || 'warn',
        message: drift.message,
      });
    }
  }

  return { index: expected, warnings };
}

async function main() {
  const asOfArg = process.argv.find((arg) => arg.startsWith('--as-of='));
  const asOf = asOfArg ? asOfArg.slice('--as-of='.length) : undefined;
  const { index, warnings } = await checkOpenFindings({ asOf });

  for (const warning of warnings) {
    const finding = warning.finding_id ? ` ${warning.finding_id}` : '';
    const level = warning.severity === 'info' ? 'INFO' : 'WARN';
    console.warn(`[findings:check] ${level} ${warning.code}${finding}: ${warning.message}`);
  }
  console.log(
    `[findings:check] PASS pilot=warn-only findings=${index.summary.finding_count} warnings=${warnings.length}`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[findings:check] FAIL ${error.message}`);
    process.exitCode = 1;
  });
}
