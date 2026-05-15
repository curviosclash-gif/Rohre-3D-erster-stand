#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DECISION_ORDER = new Map([
  ['D0', 0],
  ['D1', 1],
  ['D2', 2],
  ['D3', 3],
  ['D4', 4],
]);

const D3_SURFACE_PATTERNS = [
  /^AGENTS\.md$/,
  /^\.agents\/rules\//,
  /^\.agents\/workflows\//,
  /^docs\/Umsetzungsplan\.md$/,
  /^docs\/plaene\/aktiv\//,
  /^docs\/bot-training\/Bot_Trainingsplan\.md$/,
  /^scripts\/validate-umsetzungsplan\.mjs$/,
  /^scripts\/gates-pre-commit\.mjs$/,
];

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      out[match[1]] = match[2];
      continue;
    }
    if (arg.startsWith('--')) {
      out[arg.slice(2)] = true;
    }
  }
  return out;
}

function runGit(args, { root = process.cwd() } = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return result.stdout;
}

export async function listWorkflows({ root = process.cwd() } = {}) {
  const workflowDir = path.join(root, '.agents', 'workflows');
  const entries = await fs.readdir(workflowDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name.slice(0, -'.md'.length))
    .sort((a, b) => a.localeCompare(b));
}

export function parseStagedNameStatus(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      const status = parts[0];
      const file = normalizePath(parts[parts.length - 1]);
      return { status, file };
    });
}

export function getStagedChanges({ root = process.cwd() } = {}) {
  return parseStagedNameStatus(runGit(['diff', '--cached', '--name-status'], { root }));
}

function isD3Surface(file) {
  return D3_SURFACE_PATTERNS.some((pattern) => pattern.test(file));
}

function isTrackedDeletion(change) {
  return /^[DR]/.test(change.status);
}

function addViolation(violations, id, message, files = []) {
  violations.push({ id, message, files });
}

export async function validateAgentEnvelope({
  root = process.cwd(),
  workflow,
  decision,
  evidence,
  gate,
  recovery,
  changes = null,
} = {}) {
  const workflows = await listWorkflows({ root });
  const stagedChanges = changes || getStagedChanges({ root });
  const violations = [];
  const warnings = [];
  const stagedFiles = stagedChanges.map((change) => change.file);

  if (!workflow) {
    addViolation(violations, 'missing-workflow', 'Commit/Preflight braucht `Workflow: <name>`.');
  } else if (!workflows.includes(workflow)) {
    addViolation(
      violations,
      'unknown-workflow',
      `Unbekannter Workflow \`${workflow}\`. Erlaubt: ${workflows.join(', ')}.`
    );
  }

  if (!decision) {
    addViolation(violations, 'missing-decision', 'Commit/Preflight braucht `Decision: D0|D1|D2|D3|D4`.');
  } else if (!DECISION_ORDER.has(decision)) {
    addViolation(violations, 'unknown-decision', `Unbekannte Decision-Klasse \`${decision}\`.`);
  }

  if (!evidence || /^none$/i.test(evidence.trim())) {
    addViolation(violations, 'missing-evidence', 'Commit/Preflight braucht `Evidence: <command/result>`.');
  }

  const d3Files = stagedFiles.filter(isD3Surface);
  if (d3Files.length > 0 && DECISION_ORDER.has(decision) && DECISION_ORDER.get(decision) < 3) {
    addViolation(
      violations,
      'd3-surface-underrated',
      'Governance-/Plan-Source-of-truth-Aenderungen brauchen mindestens `Decision: D3`.',
      d3Files
    );
  }

  const deletionFiles = stagedChanges.filter(isTrackedDeletion).map((change) => change.file);
  if (deletionFiles.length > 0 && DECISION_ORDER.has(decision) && DECISION_ORDER.get(decision) < 4) {
    addViolation(
      violations,
      'tracked-delete-underrated',
      'Getrackte Deletes/Renames brauchen `Decision: D4` mit Recovery-Angabe.',
      deletionFiles
    );
  }

  if (decision === 'D3' && !gate) {
    addViolation(violations, 'd3-missing-gate', '`Decision: D3` braucht `Gate: <User-Gate oder Grund>`.');
  }

  if (decision === 'D4') {
    if (!gate || !/\b(user|freigabe|approved|gate|confirm)/i.test(gate)) {
      addViolation(violations, 'd4-missing-user-gate', '`Decision: D4` braucht ein explizites User-Gate in `Gate:`.');
    }
    if (!recovery) {
      addViolation(violations, 'd4-missing-recovery', '`Decision: D4` braucht `Recovery: <Rollback/Restore-Pfad>`.');
    }
  }

  if (stagedFiles.includes('docs/Umsetzungsplan.md')) {
    const mixedCode = stagedFiles.filter((file) => (
      !file.startsWith('docs/')
      && !file.startsWith('.agents/')
      && file !== 'AGENTS.md'
      && file !== 'CLAUDE.md'
    ));
    if (mixedCode.length > 0) {
      addViolation(
        violations,
        'master-plan-mixed-with-code',
        '`docs/Umsetzungsplan.md` darf nicht zusammen mit Code-Dateien committed werden.',
        mixedCode
      );
    }
  }

  if (stagedFiles.length === 0) {
    warnings.push('Keine gestagten Dateien gefunden; nur Envelope-Felder wurden geprueft.');
  }

  return {
    workflows,
    stagedChanges,
    violations,
    warnings,
  };
}

function valueFromCliOrEnv(args, key, envName) {
  return args[key] || process.env[envName] || '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workflow = valueFromCliOrEnv(args, 'workflow', 'AGENT_WORKFLOW');
  const decision = valueFromCliOrEnv(args, 'decision', 'AGENT_DECISION');
  const evidence = valueFromCliOrEnv(args, 'evidence', 'AGENT_EVIDENCE');
  const gate = valueFromCliOrEnv(args, 'gate', 'AGENT_GATE');
  const recovery = valueFromCliOrEnv(args, 'recovery', 'AGENT_RECOVERY');

  const result = await validateAgentEnvelope({
    workflow,
    decision,
    evidence,
    gate,
    recovery,
  });

  if (result.violations.length > 0) {
    console.error(`[agent:preflight] ${result.violations.length} violation(s)`);
    for (const violation of result.violations) {
      console.error(`- [${violation.id}] ${violation.message}`);
      if (violation.files.length > 0) {
        console.error(`  files: ${violation.files.join(', ')}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  for (const warning of result.warnings) {
    console.warn(`[agent:preflight] warn: ${warning}`);
  }
  console.log(`[agent:preflight] ok workflow=${workflow} decision=${decision} staged=${result.stagedChanges.length}`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[agent:preflight] failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
