#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import {
  getStagedChanges,
  getStagedDiff,
  getUncommittedFiles,
  validateAgentEnvelope,
} from './agent-preflight.mjs';

function runGit(args, { input } = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    input,
    stdio: input === undefined ? 'pipe' : ['pipe', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return result.stdout;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function normalizeUnique(values) {
  return Array.from(new Set(values.map(normalizePath))).sort((a, b) => a.localeCompare(b));
}

export function parseCommitArgs(argv) {
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

export function deriveCommitScope({ changes, uncommittedFiles }) {
  const stagedFiles = normalizeUnique(changes.map((change) => change.file));
  const stagedSet = new Set(stagedFiles);
  const knownUncommitted = normalizeUnique(uncommittedFiles)
    .filter((file) => !stagedSet.has(file));
  return { stagedFiles, knownUncommitted };
}

function appendField(lines, name, value) {
  if (value) {
    lines.push(`${name}: ${value}`);
  }
}

export function buildCommitMessage({
  message,
  workflow,
  decision,
  evidence,
  stagedFiles,
  knownUncommitted,
  residualRisk,
  notChecked,
  gate,
  recovery,
  generatedBy,
  canonicalSource,
}) {
  const lines = [
    message.trim(),
    '',
    `Workflow: ${workflow}`,
    `Decision: ${decision}`,
    `Evidence: ${evidence}`,
  ];

  for (const file of stagedFiles) {
    lines.push(`Scope: ${file}`);
  }
  if (knownUncommitted.length === 0) {
    lines.push('Known-uncommitted: none');
  } else {
    for (const file of knownUncommitted) {
      lines.push(`Known-uncommitted: ${file}`);
    }
  }

  appendField(lines, 'Residual-risk', residualRisk);
  appendField(lines, 'Not-checked', notChecked);
  appendField(lines, 'Gate', gate);
  appendField(lines, 'Recovery', recovery);
  appendField(lines, 'Generated-by', generatedBy);
  appendField(lines, 'Canonical-source', canonicalSource);
  return `${lines.join('\n')}\n`;
}

export function findOverlongCommitLines(messageText, maxLength = 100) {
  return messageText
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, length: line.length, text: line }))
    .filter((entry) => entry.length > maxLength)
    .filter((entry) => !/^(?:Scope|Known-uncommitted):\s+\S+/.test(entry.text));
}

function printValidationResult(result) {
  for (const warning of result.warnings) {
    console.warn(`[agent:commit] warn: ${warning}`);
  }
  if (result.violations.length === 0) {
    return;
  }

  console.error(`[agent:commit] ${result.violations.length} violation(s)`);
  for (const violation of result.violations) {
    console.error(`- [${violation.id}] ${violation.message}`);
    if (violation.files.length > 0) {
      console.error(`  files: ${violation.files.join(', ')}`);
    }
  }
}

export async function createAgentCommit({
  root = process.cwd(),
  args = parseCommitArgs(process.argv.slice(2)),
} = {}) {
  const changes = getStagedChanges({ root });
  const diff = getStagedDiff({ root });
  const uncommittedFiles = getUncommittedFiles({ root });
  const { stagedFiles, knownUncommitted } = deriveCommitScope({ changes, uncommittedFiles });

  if (stagedFiles.length === 0) {
    throw new Error('Keine gestagten Dateien gefunden. Der Wrapper staged Dateien nicht selbst.');
  }

  const required = ['message', 'workflow', 'decision', 'evidence'];
  const missing = required.filter((field) => !args[field]);
  if (missing.length > 0) {
    throw new Error(`Fehlende Argumente: ${missing.map((field) => `--${field}=...`).join(', ')}`);
  }

  const envelope = {
    root,
    workflow: args.workflow,
    decision: args.decision,
    evidence: args.evidence,
    gate: args.gate || '',
    recovery: args.recovery || '',
    scope: stagedFiles.join(','),
    knownUncommitted: knownUncommitted.length > 0 ? knownUncommitted.join(',') : 'none',
    residualRisk: args['residual-risk'] || '',
    notChecked: args['not-checked'] || '',
    generatedBy: args['generated-by'] || '',
    canonicalSource: args['canonical-source'] || '',
    changes,
    diff,
    uncommittedFiles,
  };
  const result = await validateAgentEnvelope(envelope);
  printValidationResult(result);
  if (result.violations.length > 0) {
    throw new Error('Commit-Envelope ist ungueltig.');
  }

  const messageText = buildCommitMessage({
    message: args.message,
    workflow: args.workflow,
    decision: args.decision,
    evidence: args.evidence,
    stagedFiles,
    knownUncommitted,
    residualRisk: args['residual-risk'] || '',
    notChecked: args['not-checked'] || '',
    gate: args.gate || '',
    recovery: args.recovery || '',
    generatedBy: args['generated-by'] || '',
    canonicalSource: args['canonical-source'] || '',
  });
  const overlongLines = findOverlongCommitLines(messageText);
  if (overlongLines.length > 0) {
    const details = overlongLines
      .map((entry) => `Zeile ${entry.line}: ${entry.length} Zeichen`)
      .join(', ');
    throw new Error(`Commit-Nachricht verletzt body-max-line-length=100 (${details}).`);
  }

  if (args['dry-run']) {
    process.stdout.write(messageText);
    return { committed: false, messageText, stagedFiles, knownUncommitted };
  }

  const output = runGit(['commit', '-F', '-'], { input: messageText });
  process.stdout.write(output);
  return { committed: true, messageText, stagedFiles, knownUncommitted };
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  createAgentCommit().catch((error) => {
    console.error(`[agent:commit] failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
