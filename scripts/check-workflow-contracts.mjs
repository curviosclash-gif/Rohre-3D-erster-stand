#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_FIELDS = [
  'description',
  'decision_floor',
  'mutates',
  'user_gate',
  'commit_strategy',
  'required_checks',
  'outputs',
];
const DECISIONS = new Set(['D0', 'D1', 'D2', 'D3', 'D4']);
const MUTATION_MODES = new Set(['never', 'optional', 'required']);
const USER_GATE_MODES = new Set(['never', 'conditional', 'required']);
const COMMIT_STRATEGIES = new Set(['none', 'scoped', 'release']);
const OUTPUT_TYPES = new Set(['chat', 'commands', 'report', 'repo-change', 'release']);

function cleanScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseWorkflowFrontmatter(content) {
  const match = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }

  const data = {};
  let listKey = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) {
      continue;
    }
    const listItem = rawLine.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      data[listKey].push(cleanScalar(listItem[1]));
      continue;
    }
    const field = rawLine.match(/^([a-z_]+):\s*(.*)$/);
    if (!field) {
      listKey = null;
      continue;
    }
    const [, key, rawValue] = field;
    if (rawValue.trim() === '[]') {
      data[key] = [];
      listKey = null;
    } else if (rawValue.trim() === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = cleanScalar(rawValue);
      listKey = null;
    }
  }
  return data;
}

function addViolation(violations, file, id, message) {
  violations.push({ file, id, message });
}

function validateContract(file, data, violations) {
  if (!data) {
    addViolation(violations, file, 'missing-frontmatter', 'YAML-Frontmatter fehlt.');
    return;
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in data)) {
      addViolation(violations, file, 'missing-field', `Pflichtfeld \`${field}\` fehlt.`);
    }
  }
  if (typeof data.description !== 'string' || !data.description.trim()) {
    addViolation(violations, file, 'invalid-description', '`description` muss ein nicht-leerer Text sein.');
  }
  if (!DECISIONS.has(data.decision_floor)) {
    addViolation(violations, file, 'invalid-decision-floor', '`decision_floor` muss D0 bis D4 sein.');
  }
  if (!MUTATION_MODES.has(data.mutates)) {
    addViolation(violations, file, 'invalid-mutates', '`mutates` muss never, optional oder required sein.');
  }
  if (!USER_GATE_MODES.has(data.user_gate)) {
    addViolation(violations, file, 'invalid-user-gate', '`user_gate` muss never, conditional oder required sein.');
  }
  if (!COMMIT_STRATEGIES.has(data.commit_strategy)) {
    addViolation(violations, file, 'invalid-commit-strategy', '`commit_strategy` muss none, scoped oder release sein.');
  }
  if (!Array.isArray(data.required_checks)) {
    addViolation(violations, file, 'invalid-required-checks', '`required_checks` muss eine Liste sein.');
  }
  if (!Array.isArray(data.outputs) || data.outputs.length === 0) {
    addViolation(violations, file, 'invalid-outputs', '`outputs` muss eine nicht-leere Liste sein.');
  } else {
    for (const output of data.outputs) {
      if (!OUTPUT_TYPES.has(output)) {
        addViolation(violations, file, 'unknown-output', `Unbekannter Output-Typ \`${output}\`.`);
      }
    }
  }

  if (data.mutates === 'never' && data.commit_strategy !== 'none') {
    addViolation(violations, file, 'read-only-commit', 'Ein read-only Workflow darf keine Commit-Strategie haben.');
  }
  if (data.mutates === 'required' && data.commit_strategy === 'none') {
    addViolation(violations, file, 'mutation-without-commit', 'Ein mutierender Workflow braucht eine Commit-Strategie.');
  }
  if (data.commit_strategy === 'release' && (data.decision_floor !== 'D4' || data.user_gate !== 'required')) {
    addViolation(violations, file, 'invalid-release-contract', 'Release braucht D4 und ein erforderliches User-Gate.');
  }
  if ((data.decision_floor === 'D3' || data.decision_floor === 'D4') && data.user_gate === 'never') {
    addViolation(violations, file, 'high-risk-without-gate', 'D3/D4 darf das User-Gate nicht ausschliessen.');
  }
}

export async function validateWorkflowContracts({ root = process.cwd() } = {}) {
  const workflowDir = path.join(root, '.agents', 'workflows');
  const entries = await fs.readdir(workflowDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const violations = [];
  const workflows = [];

  for (const name of files) {
    const file = `.agents/workflows/${name}`;
    const content = await fs.readFile(path.join(workflowDir, name), 'utf8');
    const frontmatter = parseWorkflowFrontmatter(content);
    validateContract(file, frontmatter, violations);
    workflows.push({ file, frontmatter });
  }
  return { workflows, violations };
}

async function main() {
  const result = await validateWorkflowContracts();
  if (result.violations.length > 0) {
    console.error(`[workflow-contracts] ${result.violations.length} violation(s)`);
    for (const violation of result.violations) {
      console.error(`- ${violation.file}: [${violation.id}] ${violation.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`[workflow-contracts] ok workflows=${result.workflows.length}`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[workflow-contracts] failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
