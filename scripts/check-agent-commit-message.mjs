#!/usr/bin/env node
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { validateAgentEnvelope } from './agent-preflight.mjs';

function stripComments(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .join('\n');
}

function extractField(text, name) {
  const pattern = new RegExp(`^${name}:\\s*(.+?)\\s*$`, 'mi');
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

function isAutoCommitMessage(text) {
  return /^(Merge|Revert)\b/.test(text.trim());
}

export async function validateAgentCommitMessage({
  root = process.cwd(),
  messageText,
  changes = null,
} = {}) {
  const text = stripComments(messageText || '');
  if (isAutoCommitMessage(text)) {
    return { skipped: true, violations: [], warnings: [] };
  }

  const workflow = extractField(text, 'Workflow');
  const decision = extractField(text, 'Decision');
  const evidence = extractField(text, 'Evidence');
  const gate = extractField(text, 'Gate');
  const recovery = extractField(text, 'Recovery');

  const result = await validateAgentEnvelope({
    root,
    workflow,
    decision,
    evidence,
    gate,
    recovery,
    changes,
  });

  return {
    skipped: false,
    workflow,
    decision,
    evidence,
    gate,
    recovery,
    ...result,
  };
}

async function main() {
  const messagePath = process.argv[2];
  if (!messagePath) {
    console.error('[agent-commit] missing commit message path');
    process.exitCode = 1;
    return;
  }

  const messageText = await fs.readFile(messagePath, 'utf8');
  const result = await validateAgentCommitMessage({ messageText });

  if (result.skipped) {
    console.log('[agent-commit] skipped auto-generated commit message');
    return;
  }

  if (result.violations.length > 0) {
    console.error(`[agent-commit] ${result.violations.length} violation(s)`);
    for (const violation of result.violations) {
      console.error(`- [${violation.id}] ${violation.message}`);
      if (violation.files.length > 0) {
        console.error(`  files: ${violation.files.join(', ')}`);
      }
    }
    console.error('');
    console.error('Commit-Body braucht z. B.:');
    console.error('Workflow: code');
    console.error('Decision: D2');
    console.error('Evidence: npm run plan:check');
    console.error('Gate: User approved D3 scope');
    console.error('Recovery: git revert <commit>');
    process.exitCode = 1;
    return;
  }

  console.log(`[agent-commit] ok workflow=${result.workflow} decision=${result.decision}`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[agent-commit] failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
