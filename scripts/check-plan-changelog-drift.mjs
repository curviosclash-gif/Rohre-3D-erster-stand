#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const MASTER_PATH = 'docs/Umsetzungsplan.md';
const CHANGELOG_PATH = 'docs/plaene/CHANGELOG.md';
const FINDINGS_INDEX_PATH = 'docs/generated/open-findings-index.json';

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').trim().replace(/^`|`$/g, '');
}

function splitTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => normalizePath(cell));
}

function parseMasterBlocks(markdown) {
  const blocks = [];
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (!/^\|\s*V\d+\s*\|/.test(line)) continue;
    const cells = splitTableRow(line);
    if (cells.length < 8 || !/^V\d+$/.test(cells[0])) continue;
    blocks.push({
      id: cells[0],
      title: cells[1],
      status: cells[2],
      current_phase: cells[6],
      plan_file: cells[7],
    });
  }
  return blocks;
}

function parsePlanState(markdown) {
  const frontmatter = String(markdown || '').match(/^---\r?\n([\s\S]*?)\r?\n---/m)?.[1] || '';
  const frontmatterStatus = frontmatter.match(/^status:\s*(\S+)/m)?.[1] || null;
  const finalGate = String(markdown || '').match(/^###\s+(\d+\.99)\b[\s\S]*?^status:\s*(\S+)/m);
  return {
    status: frontmatterStatus,
    final_phase: finalGate?.[1] || null,
    final_phase_status: finalGate?.[2] || null,
  };
}

function splitChangelogSections(markdown) {
  const sections = [];
  const lines = String(markdown || '').split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (current) sections.push(current);
      current = { heading: line, lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections.map((section) => ({
    heading: section.heading,
    text: section.lines.join('\n'),
  }));
}

function findClosureSection(sections, blockId) {
  const closurePattern = /\b(abgeschlossen|geschlossen|closure|closed|recovery|abschluss)\b/i;
  return sections.find((section) => section.text.includes(blockId) && closurePattern.test(section.text)) || null;
}

function hasDate(section) {
  return /\b20\d{2}-\d{2}-\d{2}\b/.test(section?.text || '');
}

function hasPhase(section, phase) {
  return Boolean(phase && new RegExp(`\\b${phase.replace('.', '\\.')}\\b`).test(section?.text || ''));
}

function hasEvidence(section) {
  return /\b(evidence|not-checked|nicht geprueft|gate|commit)\b/i.test(section?.text || '');
}

async function readOptionalText(rootDir, relPath) {
  try {
    return await fs.readFile(path.resolve(rootDir, relPath), 'utf8');
  } catch {
    return null;
  }
}

async function readOptionalJson(rootDir, relPath) {
  const text = await readOptionalText(rootDir, relPath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function checkPlanChangelogDrift({
  rootDir = ROOT,
  masterMarkdown,
  changelogMarkdown,
  planDocuments,
  findingsIndex,
} = {}) {
  const masterText = masterMarkdown ?? await fs.readFile(path.resolve(rootDir, MASTER_PATH), 'utf8');
  const changelogText = changelogMarkdown ?? await fs.readFile(path.resolve(rootDir, CHANGELOG_PATH), 'utf8');
  const blocks = parseMasterBlocks(masterText);
  const sections = splitChangelogSections(changelogText);
  const warnings = [];

  for (const block of blocks.filter((entry) => entry.status === 'done' && /\.99$/.test(entry.current_phase))) {
    const suppliedPlan = planDocuments instanceof Map ? planDocuments.get(block.plan_file) : null;
    const planText = suppliedPlan ?? await readOptionalText(rootDir, block.plan_file);
    const planState = planText ? parsePlanState(planText) : null;
    const closure = findClosureSection(sections, block.id);

    if (!closure) {
      warnings.push({
        code: 'missing-closure-note',
        severity: 'info',
        block_id: block.id,
        message: `${block.id} is done at ${block.current_phase} but has no changelog closure section.`,
      });
    } else {
      const missingFields = [];
      if (!hasDate(closure)) missingFields.push('date');
      if (!hasPhase(closure, block.current_phase)) missingFields.push('phase');
      if (!hasEvidence(closure)) missingFields.push('evidence-or-not-checked');
      if (missingFields.length > 0) {
        warnings.push({
          code: 'weak-closure-note',
          severity: 'info',
          block_id: block.id,
          message: `${block.id} closure note misses ${missingFields.join(', ')}.`,
        });
      }
    }

    if (!planState) {
      warnings.push({
        code: 'missing-active-plan',
        severity: 'warn',
        block_id: block.id,
        message: `${block.id} references missing active plan ${block.plan_file}.`,
      });
    } else if (
      planState.status !== 'done'
      || planState.final_phase !== block.current_phase
      || planState.final_phase_status !== 'done'
    ) {
      warnings.push({
        code: 'master-plan-status-mismatch',
        severity: 'warn',
        block_id: block.id,
        message: `${block.id} master=${block.status}/${block.current_phase} plan=${planState.status}/${planState.final_phase}/${planState.final_phase_status}.`,
      });
    }
  }

  const generatedFindings = findingsIndex ?? await readOptionalJson(rootDir, FINDINGS_INDEX_PATH);
  for (const finding of generatedFindings?.findings || []) {
    if (
      finding.declared_status === 'open'
      && finding.signals?.owner_block_status === 'done'
    ) {
      warnings.push({
        code: 'open-finding-owner-done',
        severity: 'warn',
        block_id: finding.owner_block,
        finding_id: finding.id,
        message: `${finding.id} remains open while ${finding.owner_block} is done.`,
      });
    }
  }

  return warnings;
}

async function main() {
  const warnings = await checkPlanChangelogDrift();
  for (const warning of warnings) {
    const target = warning.finding_id
      ? `${warning.finding_id}/${warning.block_id}`
      : warning.block_id;
    const level = warning.severity === 'info' ? 'INFO' : 'WARN';
    console.warn(`[plan-changelog:check] ${level} ${warning.code} ${target}: ${warning.message}`);
  }
  const warningCount = warnings.filter((warning) => warning.severity !== 'info').length;
  const infoCount = warnings.length - warningCount;
  console.log(
    `[plan-changelog:check] PASS pilot=warn-only warnings=${warningCount} info=${infoCount}`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[plan-changelog:check] FAIL ${error.message}`);
    process.exitCode = 1;
  });
}
