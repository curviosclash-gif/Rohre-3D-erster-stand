#!/usr/bin/env node
// Read-only Meta-Gate: fuehrt Governance- und Dokumentationschecks in fester Reihenfolge aus.
// Jedes Einzel-Gate erhaelt eigenen Exit-Status und eigene Ausgabe, damit Einzelfehler nicht
// hinter einem Sammelexit verschwinden (Risiko R3 aus V93).
import { spawnSync } from 'node:child_process';

// Wir rufen die Node-Skripte direkt auf (ohne npm-Wrapper), um auf Windows
// `spawnSync npm.cmd EINVAL` sowie DEP0190 (shell-true-Warnung) zu vermeiden.
const steps = [
  ['plan:check', 'scripts/validate-umsetzungsplan.mjs', []],
  ['plan:evidence-claims', 'scripts/check-plan-evidence-claims.mjs', []],
  ['workflow-contracts', 'scripts/check-workflow-contracts.mjs', []],
  ['graph:check', 'scripts/check-knowledge-graph.mjs', []],
  ['parcours:check/strict', 'scripts/check-parcours-routes.mjs', ['--strict']],
  ['docs:check', 'scripts/docs-freshness.mjs', ['--check']],
  ['docs:check/plan:check', 'scripts/validate-umsetzungsplan.mjs', []],
  ['docs:check/check:agent-context', 'scripts/check-agent-context.mjs', []],
  ['docs:check/check:gemini', 'scripts/check-gemini-governance.mjs', []],
];

let failed = null;
for (const [label, script, extraArgs] of steps) {
  process.stdout.write(`\n[gates:pre-commit] step ${label}\n`);
  const result = spawnSync(process.execPath, [script, ...extraArgs], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = { label, status: result.status ?? 1 };
    break;
  }
}

if (failed) {
  process.stderr.write(`\n[gates:pre-commit] FAILED at step ${failed.label} (exit ${failed.status})\n`);
  process.exit(failed.status);
}

process.stdout.write('\n[gates:pre-commit] all steps passed\n');
