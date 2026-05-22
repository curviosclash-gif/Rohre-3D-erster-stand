#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return result.stdout;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function listStagedFiles() {
  return runGit(['diff', '--cached', '--name-only'])
    .split(/\r?\n/)
    .map((line) => normalizePath(line.trim()))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function listUncommittedFiles() {
  return runGit(['status', '--short'])
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => normalizePath(line.slice(3).trim()))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function isMasterPlan(file) {
  return file === 'docs/Umsetzungsplan.md';
}

function isPlanGraphDoc(file) {
  return isMasterPlan(file)
    || file.startsWith('docs/plaene/')
    || file.startsWith('docs/generated/')
    || file.startsWith('docs/lock-status/')
    || file.startsWith('docs/prozess/')
    || file.startsWith('docs/referenz/');
}

function isGovernanceDoc(file) {
  return file.startsWith('.agents/') || file === 'AGENTS.md' || file === 'CLAUDE.md';
}

function isCodeLike(file) {
  return !file.startsWith('docs/') && !isGovernanceDoc(file);
}

function printList(title, files) {
  console.log(title);
  if (files.length === 0) {
    console.log('  - none');
    return;
  }
  for (const file of files) {
    console.log(`  - ${file}`);
  }
}

function main() {
  const staged = listStagedFiles();
  const uncommitted = listUncommittedFiles();
  const unstaged = uncommitted.filter((file) => !staged.includes(file));
  const codeSlice = staged.filter((file) => isCodeLike(file));
  const planGraphDocSlice = staged.filter((file) => isPlanGraphDoc(file) || isGovernanceDoc(file));
  const masterWithCode = staged.some(isMasterPlan) && codeSlice.length > 0;

  console.log('[agent:commit] staged files:', staged.length);
  printList('Recommended Code/Test-Slice:', codeSlice);
  printList('Recommended Plan/Graph/Doku-Slice:', planGraphDocSlice);
  console.log(`Known-uncommitted: ${unstaged.length > 0 ? unstaged.join(', ') : 'none'}`);

  if (masterWithCode) {
    console.error('');
    console.error('BLOCKED: docs/Umsetzungsplan.md ist zusammen mit Code/Test-Dateien gestaged.');
    console.error('Empfohlen: erst Code/Test-Slice committen, danach Plan/Graph/Doku-Slice.');
    process.exitCode = 1;
    return;
  }

  if (staged.length === 0) {
    console.warn('[agent:commit] Keine gestagten Dateien gefunden.');
    return;
  }

  console.log('');
  console.log('Next checks: git diff --cached --name-only; npm run agent:preflight -- --workflow=<workflow> --decision=<D0-D4> --evidence="<gate> -> PASS" --scope="<staged files>" --known-uncommitted="<line above>"');
}

try {
  main();
} catch (error) {
  console.error(`[agent:commit] failed: ${error?.message || error}`);
  process.exitCode = 1;
}
