#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const FINDINGS_PATH = 'docs/prozess/Open_Findings.md';
const DECISIONS_PATH = 'docs/prozess/finding-decisions.json';
const MASTER_PATH = 'docs/Umsetzungsplan.md';
const CHANGELOG_PATH = 'docs/plaene/CHANGELOG.md';
const OUTPUT_PATH = 'docs/generated/open-findings-index.json';

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').trim();
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function cleanCell(value) {
  return String(value || '').trim().replace(/^`|`$/g, '').trim();
}

function splitTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cleanCell);
}

function splitRawTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((value) => value.trim());
}

function parseMasterBlocks(markdown) {
  const blocks = new Map();
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (!/^\|\s*V\d+\s*\|/.test(line)) continue;
    const cells = splitTableRow(line);
    if (cells.length < 8 || !/^V\d+$/.test(cells[0])) continue;
    blocks.set(cells[0], {
      id: cells[0],
      title: cells[1],
      status: cells[2],
      current_phase: cells[6],
      plan_file: normalizePath(cells[7]),
    });
  }
  return blocks;
}

function expandFindingRange(text) {
  const ids = new Set(Array.from(String(text || '').matchAll(/\bP(\d+)\b/g), (match) => `P${match[1]}`));
  for (const match of String(text || '').matchAll(/\bP(\d+)`?\s+bis\s+`?P(\d+)\b/gi)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    for (let value = Math.min(start, end); value <= Math.max(start, end); value += 1) {
      ids.add(`P${value}`);
    }
  }
  return Array.from(ids);
}

function parseOwnerMappings(markdown) {
  const ownerBlocksByFinding = new Map();
  for (const line of String(markdown || '').split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+`(V\d+)`:\s+(.+)$/);
    if (!match) continue;
    const [, blockId, rawTail] = match;
    const owningClause = rawTail.split(';')[0];
    if (/keine offenen Findings/i.test(owningClause)) continue;
    for (const findingId of expandFindingRange(owningClause)) {
      const owners = ownerBlocksByFinding.get(findingId) || [];
      owners.push(blockId);
      ownerBlocksByFinding.set(findingId, Array.from(new Set(owners)).sort());
    }
  }
  return ownerBlocksByFinding;
}

function parseFindingRows(markdown) {
  const findings = new Map();
  let inTable = false;
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (/^##\s+Offene Findings\b/.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && /^##\s+/.test(line)) break;
    if (!inTable || !/^\|\s*P\d+\s*\|/.test(line)) continue;

    const cells = splitRawTableRow(line);
    const id = cleanCell(cells[0]);
    const fileCell = cells[1];
    const problem = cleanCell(cells[2]);
    const severity = cleanCell(cells[3]);
    if (!/^P\d+$/.test(id)) continue;

    const entry = findings.get(id) || {
      id,
      declared_status: 'open',
      severity: severity || null,
      file_references: [],
      descriptions: [],
    };
    const quotedReferences = Array.from(
      String(fileCell || '').matchAll(/`([^`]+)`/g),
      (match) => normalizePath(match[1])
    );
    entry.file_references.push(
      ...(quotedReferences.length > 0
        ? quotedReferences
        : String(fileCell || '').split(',').map(normalizePath).filter(Boolean))
    );
    if (problem) entry.descriptions.push(problem);
    if (!entry.severity && severity) entry.severity = severity;
    entry.file_references = Array.from(new Set(entry.file_references)).sort();
    findings.set(id, entry);
  }
  return findings;
}

function globToRegex(pattern) {
  const escaped = normalizePath(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const doubleStarToken = '__DOUBLE_STAR__';
  const regexBody = escaped
    .replace(/\*\*/g, doubleStarToken)
    .replace(/\*/g, '[^/]*')
    .replaceAll(doubleStarToken, '.*');
  return new RegExp(`^${regexBody}$`);
}

function referenceExists(reference, trackedFiles) {
  const normalized = normalizePath(reference);
  if (!normalized) return true;
  if (normalized.includes('*')) {
    const regex = globToRegex(normalized);
    return trackedFiles.some((file) => regex.test(file));
  }
  if (normalized.includes('/')) {
    return trackedFiles.includes(normalized);
  }
  return trackedFiles.some((file) => file === normalized || file.endsWith(`/${normalized}`));
}

function listTrackedFiles(rootDir) {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) return [];
  return result.stdout.split('\0').map(normalizePath).filter(Boolean).sort();
}

function changelogSignalsResolution(changelog, findingId, ownerBlock) {
  const resolutionPattern = /\b(abgeschlossen|geschlossen|resolved|erledigt|bereinigt|recovery)\b/i;
  const lines = String(changelog || '').split(/\r?\n/);
  return lines.some((line, index) => {
    if (line.includes(findingId) && resolutionPattern.test(line)) return true;
    if (!ownerBlock || !line.includes(ownerBlock)) return false;
    return lines.slice(index, index + 4).some((candidate) => resolutionPattern.test(candidate));
  });
}

function buildDrift({
  finding,
  decision,
  ownerBlocks,
  ownerBlock,
  block,
  trackedFiles,
  changelog,
  asOf,
}) {
  const drift = [];
  const status = decision?.status || finding.declared_status;
  const isOpen = status === 'open';

  if (decision?.owner_block && ownerBlocks.length > 0 && !ownerBlocks.includes(decision.owner_block)) {
    drift.push({
      code: 'mapping-table-mismatch',
      severity: 'warn',
      message: `${finding.id} maps to ${ownerBlocks.join(', ')} in Open_Findings.md but manual decision owns ${decision.owner_block}.`,
    });
  }

  if (isOpen && block?.status === 'done') {
    drift.push({
      code: 'owner-block-done',
      severity: 'warn',
      message: `${finding.id} is open while owner ${ownerBlock} is done at ${block.current_phase}.`,
    });
  }

  if (decision?.review_after && decision.review_after < asOf) {
    drift.push({
      code: 'review-after-due',
      severity: decision.severity === 'high' ? 'warn' : 'info',
      message: `${finding.id} review_after ${decision.review_after} is before ${asOf}.`,
    });
  }

  for (const reference of finding.file_references) {
    if (!referenceExists(reference, trackedFiles)) {
      drift.push({
        code: 'missing-file',
        severity: 'warn',
        message: `${finding.id} references missing path ${reference}.`,
        path: reference,
      });
    }
  }

  if (isOpen && changelogSignalsResolution(changelog, finding.id, ownerBlock)) {
    drift.push({
      code: 'changelog-resolved-open',
      severity: 'warn',
      message: `${finding.id} remains open while the changelog contains a resolution signal for ${ownerBlock || finding.id}.`,
    });
  }

  return drift;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function buildOpenFindingsIndex({
  rootDir = ROOT,
  asOf = todayUtc(),
  findingsMarkdown,
  decisionsDocument,
  masterMarkdown,
  changelogMarkdown,
  trackedFiles,
} = {}) {
  const findingsText = findingsMarkdown ?? await fs.readFile(path.resolve(rootDir, FINDINGS_PATH), 'utf8');
  const decisions = decisionsDocument ?? await readJson(path.resolve(rootDir, DECISIONS_PATH));
  const masterText = masterMarkdown ?? await fs.readFile(path.resolve(rootDir, MASTER_PATH), 'utf8');
  const changelogText = changelogMarkdown ?? await fs.readFile(path.resolve(rootDir, CHANGELOG_PATH), 'utf8');
  const repoFiles = (trackedFiles ?? listTrackedFiles(rootDir)).map(normalizePath).sort();

  const findings = parseFindingRows(findingsText);
  const ownerMappings = parseOwnerMappings(findingsText);
  const blocks = parseMasterBlocks(masterText);
  const decisionsById = new Map((decisions.decisions || []).map((decision) => [decision.id, decision]));

  const outputFindings = Array.from(findings.values())
    .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }))
    .map((finding) => {
      const decision = decisionsById.get(finding.id) || null;
      const ownerBlocks = ownerMappings.get(finding.id) || [];
      const ownerBlock = decision?.owner_block || ownerBlocks[0] || null;
      const block = ownerBlock ? blocks.get(ownerBlock) || null : null;
      const drift = buildDrift({
        finding,
        decision,
        ownerBlocks,
        ownerBlock,
        block,
        trackedFiles: repoFiles,
        changelog: changelogText,
        asOf,
      });

      return {
        id: finding.id,
        declared_status: decision?.status || finding.declared_status,
        owner_block: ownerBlock,
        owner_mappings: ownerBlocks,
        severity: decision?.severity || finding.severity,
        review_after: decision?.review_after || null,
        manual_override: decision?.manual_override === true,
        reason: decision?.reason || null,
        file_references: finding.file_references,
        descriptions: finding.descriptions,
        signals: {
          owner_block_status: block?.status || null,
          owner_block_phase: block?.current_phase || null,
          referenced_file_count: finding.file_references.length,
          missing_file_count: drift.filter((entry) => entry.code === 'missing-file').length,
        },
        drift,
        confidence: decision && ownerBlocks.includes(ownerBlock) ? 'high' : decision || ownerBlocks.length > 0 ? 'medium' : 'low',
        sources: [
          FINDINGS_PATH,
          ...(decision ? [DECISIONS_PATH] : []),
          ...(block ? [MASTER_PATH, block.plan_file] : []),
          CHANGELOG_PATH,
        ],
      };
    });

  const warningCount = outputFindings.reduce(
    (count, finding) => count + finding.drift.filter((entry) => entry.severity === 'warn').length,
    0
  );

  return {
    schema_version: 'open-findings-index.v1',
    generated_by: 'scripts/build-open-findings-index.mjs',
    authority: 'generated-signals-only',
    as_of: asOf,
    canonical_sources: {
      findings: FINDINGS_PATH,
      manual_decisions: DECISIONS_PATH,
      master: MASTER_PATH,
      changelog: CHANGELOG_PATH,
    },
    summary: {
      finding_count: outputFindings.length,
      manual_decision_count: outputFindings.filter((finding) => finding.sources.includes(DECISIONS_PATH)).length,
      drift_count: outputFindings.reduce((count, finding) => count + finding.drift.length, 0),
      warning_count: warningCount,
    },
    findings: outputFindings,
  };
}

export async function writeOpenFindingsIndex({
  rootDir = ROOT,
  outputPath = OUTPUT_PATH,
  asOf = todayUtc(),
} = {}) {
  const index = await buildOpenFindingsIndex({ rootDir, asOf });
  const absoluteOutput = path.resolve(rootDir, outputPath);
  await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });
  await fs.writeFile(absoluteOutput, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const asOfArg = process.argv.find((arg) => arg.startsWith('--as-of='));
  const outputPath = outputArg ? normalizePath(outputArg.slice('--output='.length)) : OUTPUT_PATH;
  const asOf = asOfArg ? asOfArg.slice('--as-of='.length) : todayUtc();
  const index = await writeOpenFindingsIndex({ outputPath, asOf });
  process.stdout.write(
    `[findings:index] wrote ${outputPath} (${index.summary.finding_count} findings, ${index.summary.warning_count} warnings)\n`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[findings:index] ${error.message}`);
    process.exitCode = 1;
  });
}
