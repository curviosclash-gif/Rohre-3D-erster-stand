#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASELINE_SCAN_ROOTS = [
  'AGENTS.md',
  '.agents/rules/planning_and_governance.md',
  '.agents/rules/git_and_commits.md',
  '.agents/workflows/plan.md',
  '.agents/workflows/code.md',
  '.agents/workflows/quick.md',
  '.agents/workflows/bugfix.md',
  '.agents/workflows/cleanup.md',
  'docs/plaene/aktiv/V117.md',
  'docs/plaene/neu/Feature_Repo_Context_Cleanup.md',
];
const EXCLUDED_PARTS = ['/alt/', '/archive/', '/generated/', '/CHANGELOG.md'];
const MAX_PRINTED_FINDINGS = 40;

const rules = [
  {
    id: 'd4-term-without-user-gate-nearby',
    severity: 'warn',
    pattern: /\b(D4|Auto-Move|auto-?move|Rebuild|Reborn|Loesch|Lösch|delete|move|verschieb|Archivierung|Archiv-Move|gross(?:e|er|en)? Refactor|groß(?:e|er|en)? Refactor)\b/i,
    nearby: /\b(User-Gate|USER-GATE|User-Freigabe|explizite Freigabe|Recovery|Rollback)\b/i,
    message: 'D4-nahe Begriffe sollten nahe User-Gate und Recovery/Rollback nennen.',
  },
  {
    id: 'source-of-truth-change-without-d3',
    severity: 'warn',
    pattern: /\b(AGENTS\.md|\.agents\/rules|\.agents\\rules|\.agents\/workflows|\.agents\\workflows|Umsetzungsplan\.md|Planstruktur|Governance-Edits?)\b/i,
    nearby: /\b(D3|User-Gate|USER-GATE|User-Freigabe)\b/i,
    message: 'Source-of-truth-/Governance-Flaechen sollten als D3 oder User-Gate-nahe beschrieben sein.',
  },
  {
    id: 'new-doc-storage-without-purpose-class',
    severity: 'info',
    pattern: /\b(neue(?:r|s|n)?\s+(?:Datei|Ablage|Report|Doku)|docs\/(?:referenz|prozess|plaene|archive)|docs\\(?:referenz|prozess|plaene|archive))\b/i,
    nearby: /\b(Zweckklasse|transient|evidence|reference|governance|archive-index|Schatten-Wahrheit|Schattenwahrheit)\b/i,
    message: 'Neue dauerhafte Ablagen sollten Zweckklasse und kanonische Zielquelle nennen.',
  },
];

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function isExcluded(relPath) {
  const normalized = `/${normalizePath(relPath)}`;
  return EXCLUDED_PARTS.some((part) => normalized.includes(part));
}

async function exists(root, relPath) {
  try {
    await fs.access(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root, relPath) {
  if (!await exists(root, relPath)) {
    return [];
  }

  const fullPath = path.join(root, relPath);
  const stat = await fs.stat(fullPath);
  if (stat.isFile()) {
    return relPath.endsWith('.md') ? [normalizePath(relPath)] : [];
  }

  const out = [];
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const child = normalizePath(path.join(relPath, entry.name));
    if (isExcluded(child)) {
      continue;
    }

    if (entry.isDirectory()) {
      out.push(...await listFiles(root, child));
    } else if (entry.isFile() && child.endsWith('.md')) {
      out.push(child);
    }
  }

  return out;
}

function isScannableChangedFile(relPath) {
  const normalized = normalizePath(relPath);
  if (isExcluded(normalized)) {
    return false;
  }

  if (normalized === 'AGENTS.md') {
    return true;
  }

  if (!normalized.endsWith('.md')) {
    return false;
  }

  return normalized.startsWith('.agents/')
    || normalized.startsWith('docs/plaene/aktiv/')
    || normalized.startsWith('docs/plaene/neu/');
}

function listChangedLineNumbers(root) {
  const result = spawnSync('git', ['diff', '--unified=5', '--diff-filter=ACMRT', 'HEAD', '--'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return new Map();
  }

  const changed = new Map();
  let currentFile = null;
  let newLineNumber = 0;

  for (const rawLine of result.stdout.split(/\r?\n/)) {
    if (rawLine.startsWith('+++ b/')) {
      const relPath = normalizePath(rawLine.slice('+++ b/'.length));
      currentFile = isScannableChangedFile(relPath) ? relPath : null;
      if (currentFile && !changed.has(currentFile)) {
        changed.set(currentFile, new Set());
      }
      continue;
    }

    const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineNumber = Number.parseInt(hunkMatch[1], 10);
      continue;
    }

    if (!currentFile || rawLine.startsWith('--- ')) {
      continue;
    }

    if (rawLine.startsWith('+')) {
      changed.get(currentFile).add(newLineNumber);
      newLineNumber += 1;
      continue;
    }

    if (rawLine.startsWith(' ')) {
      newLineNumber += 1;
    }
  }

  return changed;
}

function hasNearby(lines, index, pattern) {
  const start = Math.max(0, index - 5);
  const end = Math.min(lines.length - 1, index + 5);
  for (let cursor = start; cursor <= end; cursor += 1) {
    pattern.lastIndex = 0;
    if (pattern.test(lines[cursor])) {
      return true;
    }
  }
  return false;
}

async function scanFile(root, relPath, targetLineNumbers = null) {
  const text = await fs.readFile(path.join(root, relPath), 'utf8');
  const lines = text.split(/\r?\n/);
  const findings = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (targetLineNumbers && !targetLineNumbers.has(index + 1)) {
      continue;
    }

    const line = lines[index];
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(line)) {
        continue;
      }

      if (hasNearby(lines, index, rule.nearby)) {
        continue;
      }

      findings.push({
        file: relPath,
        line: index + 1,
        id: rule.id,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }

  return findings;
}

export async function runAiDecisionPolicyReport({ root = process.cwd(), scanAll = false } = {}) {
  const files = [];
  const changedLines = scanAll ? null : listChangedLineNumbers(root);
  if (scanAll) {
    for (const scanRoot of BASELINE_SCAN_ROOTS) {
      files.push(...await listFiles(root, scanRoot));
    }
  } else {
    files.push(...changedLines.keys());
  }

  const uniqueFiles = Array.from(new Set(files)).sort((a, b) => a.localeCompare(b));
  const findings = [];
  for (const file of uniqueFiles) {
    findings.push(...await scanFile(root, file, changedLines?.get(file) || null));
  }

  return { files: uniqueFiles, findings };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const scanAll = args.has('--all');
  const report = await runAiDecisionPolicyReport({ scanAll });
  const warnCount = report.findings.filter((finding) => finding.severity === 'warn').length;
  const infoCount = report.findings.filter((finding) => finding.severity === 'info').length;

  const mode = scanAll ? 'baseline' : 'changed-files';
  process.stdout.write(`[ai-decision-policy] report-only mode=${mode} files=${report.files.length} warnings=${warnCount} info=${infoCount}\n`);

  for (const finding of report.findings.slice(0, MAX_PRINTED_FINDINGS)) {
    process.stdout.write(`- ${finding.severity.toUpperCase()} ${finding.file}:${finding.line} [${finding.id}] ${finding.message}\n`);
  }

  if (report.findings.length > MAX_PRINTED_FINDINGS) {
    process.stdout.write(`[ai-decision-policy] weitere Findings: ${report.findings.length - MAX_PRINTED_FINDINGS}\n`);
  }

  process.stdout.write('[ai-decision-policy] nicht blockierend; Findings sind Review-Hinweise.\n');
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[ai-decision-policy] failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
