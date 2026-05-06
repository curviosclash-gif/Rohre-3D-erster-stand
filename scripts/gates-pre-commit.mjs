#!/usr/bin/env node
// Meta-Gate fuer V93/V94: fuehrt plan:check -> graph:check -> docs:sync -> docs:check in fester Reihenfolge aus.
// Jedes Einzel-Gate erhaelt eigenen Exit-Status und eigene Ausgabe, damit Einzelfehler nicht
// hinter einem Sammelexit verschwinden (Risiko R3 aus V93).
import { spawnSync } from 'node:child_process';

// Wir rufen die Node-Skripte direkt auf (ohne npm-Wrapper), um auf Windows
// `spawnSync npm.cmd EINVAL` sowie DEP0190 (shell-true-Warnung) zu vermeiden.
const steps = [
  ['plan:check', 'scripts/validate-umsetzungsplan.mjs', []],
  ['graph:check', 'scripts/check-knowledge-graph.mjs', []],
  ['parcours:check/strict', 'scripts/check-parcours-routes.mjs', ['--strict']],
  ['docs:sync', 'scripts/docs-freshness.mjs', ['--write']],
  ['docs:check', 'scripts/docs-freshness.mjs', ['--check']],
  ['docs:check/plan:check', 'scripts/validate-umsetzungsplan.mjs', []],
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
