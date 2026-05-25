#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normalizePlanPath,
  parsePlanMapMaster,
} from './planning/PlanIntakeOps.mjs';

const ROOT = process.cwd();
const MASTER_PLAN_PATH = 'docs/Umsetzungsplan.md';
const OUTPUT_PATH = 'docs/generated/plan-index.json';

const WORKSTREAM_ID_BY_LABEL = new Map([
  ['Hauptspiel', 'main-game'],
  ['Map Content, Map Tools & Settings', 'map-tools-settings'],
  ['Android / Mobile', 'android-mobile'],
  ['Architektur & Runtime', 'architecture-runtime'],
  ['Repo-Pflege & Governance', 'repo-governance'],
  ['AI / Graph / Agenten-Werkzeuge', 'ai-graph-tools'],
]);

function cleanCell(value) {
  return String(value || '')
    .trim()
    .replace(/^`|`$/g, '')
    .trim();
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeList(value) {
  const raw = cleanCell(value);
  if (!raw || raw === '-' || raw === '[]') return [];

  return raw
    .split(',')
    .map((entry) => cleanCell(entry))
    .filter(Boolean);
}

function getSection(markdown, heading) {
  const start = String(markdown || '').indexOf(heading);
  if (start < 0) return '';

  const afterHeading = markdown.slice(start);
  const next = /\n##\s+/.exec(afterHeading.slice(heading.length));
  return next ? afterHeading.slice(0, heading.length + next.index) : afterHeading;
}

function splitMarkdownTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cleanCell);
}

function parseMarkdownTable(section) {
  const lines = String(section || '')
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'));

  if (lines.length < 3) return [];

  const headers = splitMarkdownTableRow(lines[0]);
  return lines.slice(2).map((line) => {
    const cells = splitMarkdownTableRow(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || '';
    });
    return row;
  });
}

function parseHeaderMetadata(markdown) {
  const firstLines = String(markdown || '').split(/\r?\n/).slice(0, 8).join('\n');
  const updated = firstLines.match(/Stand:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || '';
  const startAnchorRaw = firstLines.match(/Startanker:\s*`([^`]+)`/)?.[1] || '';
  const startAnchorBlock = startAnchorRaw.match(/\b(V\d+)\b/)?.[1] || null;
  const startAnchorPhase = startAnchorRaw.match(/\b(\d+(?:\.\d+)+)\b/)?.[1] || null;
  const nextRaw = firstLines.match(/naechster empfohlener P1-Schritt ist\s*`([^`]+)`/i)?.[1] || '';
  const nextBlock = nextRaw.match(/\b(V\d+)\b/)?.[1] || null;
  const nextPhase = nextRaw.match(/\b(\d+(?:\.\d+)+)\b/)?.[1] || null;

  return {
    updated,
    startAnchor: {
      block: startAnchorBlock,
      phase: startAnchorPhase,
      source: MASTER_PLAN_PATH,
    },
    nextRecommendedStart: {
      block: nextBlock,
      phase: nextPhase,
      source: MASTER_PLAN_PATH,
      authority: 'recommendation',
    },
  };
}

function parseWorkstreams(markdown) {
  const section = getSection(markdown, '## Arbeitsstrom-Index');
  const rows = parseMarkdownTable(section);
  const workstreams = [];
  const workstreamByBlock = new Map();

  for (const row of rows) {
    const label = cleanCell(row.Arbeitsstrom);
    if (!label) continue;

    const id = WORKSTREAM_ID_BY_LABEL.get(label) || slugify(label);
    workstreams.push({
      id,
      label,
      source: `${MASTER_PLAN_PATH}#arbeitsstrom-index`,
    });

    for (const match of String(row['Master-Bloecke'] || '').matchAll(/\b(V\d+)\b/g)) {
      workstreamByBlock.set(match[1], id);
    }
  }

  return { workstreams, workstreamByBlock };
}

function parseMasterLocks(markdown) {
  const section = getSection(markdown, '## Lock-Status');
  const rows = parseMarkdownTable(section);
  const locksByBlock = new Map();

  for (const row of rows) {
    const block = cleanCell(row['Block / Stream']);
    if (!/^V\d+$/.test(block)) continue;

    locksByBlock.set(block, {
      status: cleanCell(row.Status) || null,
      agent: cleanCell(row.Agent) || null,
      start_date: cleanCell(row['Start-Datum']) || null,
      target: cleanCell(row['Ziel-Abschluss']) || null,
      source: `${MASTER_PLAN_PATH}#lock-status`,
    });
  }

  return locksByBlock;
}

function buildBlockRows({ master, workstreamByBlock, locksByBlock }) {
  return master.rows.map((row) => {
    const workstream = workstreamByBlock.get(row.blockId);
    if (!workstream) {
      throw new Error(`Missing workstream mapping for ${row.blockId}`);
    }

    return {
      id: row.blockId,
      title: row.title,
      status: row.status,
      priority: row.priority,
      owner: row.owner,
      workstream,
      depends_on: normalizeList(row.dependsOn),
      current_phase: row.phase,
      plan_file: normalizePlanPath(row.planFile),
      lock: locksByBlock.get(row.blockId) || {
        status: null,
        agent: null,
        start_date: null,
        target: null,
        source: `${MASTER_PLAN_PATH}#lock-status`,
      },
    };
  });
}

export async function buildPlanIndex({ rootDir = ROOT } = {}) {
  const masterMarkdown = await fs.readFile(path.resolve(rootDir, MASTER_PLAN_PATH), 'utf8');
  const master = parsePlanMapMaster(masterMarkdown);
  const { updated, startAnchor, nextRecommendedStart } = parseHeaderMetadata(masterMarkdown);
  const { workstreams, workstreamByBlock } = parseWorkstreams(masterMarkdown);
  const locksByBlock = parseMasterLocks(masterMarkdown);

  return {
    schema_version: 1,
    updated,
    start_anchor: startAnchor,
    next_recommended_start: nextRecommendedStart,
    sources: {
      master: MASTER_PLAN_PATH,
      changelog: 'docs/plaene/CHANGELOG.md',
      open_findings: 'docs/prozess/Open_Findings.md',
      lock_registry: 'docs/lock-status/*.json',
      generator: 'scripts/build-plan-index.mjs',
    },
    workstreams,
    blocks: buildBlockRows({ master, workstreamByBlock, locksByBlock }),
  };
}

export async function writePlanIndex({ rootDir = ROOT, outputPath = OUTPUT_PATH } = {}) {
  const index = await buildPlanIndex({ rootDir });
  const absoluteOutput = path.resolve(rootDir, outputPath);
  await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });
  await fs.writeFile(absoluteOutput, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const outputPath = outputArg ? normalizePlanPath(outputArg.slice('--output='.length)) : OUTPUT_PATH;
  const index = await writePlanIndex({ outputPath });
  process.stdout.write(`[plan-index] wrote ${outputPath} (${index.blocks.length} blocks, ${index.workstreams.length} workstreams)\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[plan-index] ${error.message}`);
    process.exitCode = 1;
  });
}
