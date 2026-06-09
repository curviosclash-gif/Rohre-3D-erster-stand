#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { buildPlanMapData } from './export-plan-map.mjs';

const CONTRACT = 'curvios.plan-autopilot.plan.v1';
const RUN_CONTRACT = 'curvios.plan-autopilot.run.v1';
const WORKER_OUTPUT_CONTRACT = 'curvios.plan-autopilot.worker-output.v1';
const WORKER_PROMPT_PATH = 'scripts/prompts/plan-autopilot-subphase.md';
const DEFAULT_MODE = 'auto-safe';
const SUPPORTED_MODES = new Set(['auto-safe', 'auto-d2-review', 'report-only']);
const SUPPORTED_EXECUTORS = new Set(['codex', 'fake']);
const WORKER_STATUSES = new Set(['completed', 'gate_required', 'blocked', 'no_change']);
const FAKE_STATUSES = new Set([...WORKER_STATUSES, 'out_of_scope']);
const DECISION_ORDER = new Map([
  ['D0', 0],
  ['D1', 1],
  ['D2', 2],
  ['D3', 3],
  ['D4', 4],
]);
const READINESS_ORDER = new Map([
  ['ready', 0],
  ['ready-with-risk', 1],
  ['planned', 2],
  ['unknown', 3],
  ['locked', 4],
  ['blocked', 5],
  ['done', 9],
]);
const TEXT_STOPWORDS = new Set([
  'und',
  'oder',
  'der',
  'die',
  'das',
  'den',
  'dem',
  'mit',
  'fuer',
  'fur',
  'eine',
  'einen',
  'als',
  'von',
  'aus',
  'vor',
  'nach',
  'ohne',
  'gegen',
  'dass',
  'werden',
  'wird',
  'tool',
]);
const RED_SIGNAL_PATTERNS = [
  {
    id: 'manual_takeover_required',
    label: 'Manuelle Uebernahme erforderlich',
    pattern: /manuelle\s+uebernahme\s+erforderlich/i,
  },
  {
    id: 'must_not_be_implemented_directly',
    label: 'darf nicht direkt umgesetzt werden',
    pattern: /darf\s+nicht\s+direkt\s+umgesetzt\s+werden/i,
  },
  {
    id: 'user_intake_draft',
    label: 'Draft fuer User-Intake',
    pattern: /draft\s+fuer\s+user-intake/i,
  },
  {
    id: 'decision_d3',
    label: 'D3',
    pattern: /\bD3\b/i,
  },
  {
    id: 'decision_d4',
    label: 'D4',
    pattern: /\bD4\b/i,
  },
  {
    id: 'full_init',
    label: 'Full-Init',
    pattern: /\bFull-Init\b/i,
  },
  {
    id: 'rebuild',
    label: 'Rebuild',
    pattern: /\bRebuild\b/i,
  },
  {
    id: 'reborn',
    label: 'Reborn',
    pattern: /\bReborn\b/i,
  },
];
const PARKING_REASON_META = {
  user_gate: {
    type: 'gate',
    requiredUserDecision: 'USER-GATE fuer diesen Slice explizit freigeben.',
  },
  d3_d4_requires_user_gate: {
    type: 'gate',
    requiredUserDecision: 'D3/D4-Blast-Radius und Umsetzung explizit freigeben.',
  },
  review_gate_parked: {
    type: 'gate',
    requiredUserDecision: 'REVIEW-Scope fuer auto-d2-review oder manuelle Umsetzung freigeben.',
  },
  missing_ai_gate: {
    type: 'gate',
    requiredUserDecision: 'AI-Gate im Plan klaeren oder Slice manuell freigeben.',
  },
  red_text_signal: {
    type: 'red-text-signal',
    requiredUserDecision: 'Rotes Textsignal pruefen und weiteren Umgang freigeben.',
  },
  lock: {
    type: 'lock',
    requiredUserDecision: 'Lock klaeren oder warten, bis der Scope frei ist.',
  },
  readiness_blocked: {
    type: 'dependency',
    requiredUserDecision: 'Blocker/Dependency klaeren.',
  },
  dirty_worktree: {
    type: 'dirty-worktree',
    requiredUserDecision: 'Uncommitted Worktree vor Live-Run bereinigen oder bewusst ausnehmen.',
  },
  scope_conflict: {
    type: 'scope-conflict',
    requiredUserDecision: 'Scope-Konflikt mit aktivem Lock klaeren.',
  },
  report_only: {
    type: 'mode',
    requiredUserDecision: 'Ausfuehrbaren Modus waehlen.',
  },
  no_open_subphase: {
    type: 'plan-shape',
    requiredUserDecision: 'Planstatus oder offene Subphase klaeren.',
  },
  missing_plan_file: {
    type: 'plan-shape',
    requiredUserDecision: 'Plan-Dateipfad im Master/Index klaeren.',
  },
  plan_file_unreadable: {
    type: 'plan-shape',
    requiredUserDecision: 'Plan-Datei lesbar machen.',
  },
};
const AI_MATRIX_HEADING_PATTERN = /^##\s+AI-Ausfuehrungsmatrix\b/i;
const PHASE_HEADING_PATTERN = /^###\s+(\d+\.(?:\d+|99))\s+(.+?)\s*$/;

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripMarkdown(value) {
  return normalizeWhitespace(String(value || '')
    .replace(/`+/g, '')
    .replace(/\*\*/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[(AUTO|REVIEW|USER-GATE)\]/gi, '$1'));
}

function tokenize(value) {
  return stripMarkdown(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !TEXT_STOPWORDS.has(token));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function decisionRank(decision) {
  return DECISION_ORDER.get(decision) ?? 99;
}

function readinessRank(status) {
  return READINESS_ORDER.get(String(status || 'unknown')) ?? READINESS_ORDER.get('unknown');
}

function isSecondLevelHeading(line) {
  return /^##\s+/.test(String(line || '').trim());
}

function phaseHasOpenSubphase(phaseLines) {
  const [phase] = parsePlanPhases(phaseLines.join('\n'));
  return Boolean(
    phase
    && phase.status !== 'done'
    && phase.status !== 'closed'
    && phase.items.some((item) => !item.done)
  );
}

export function normalizeGateToken(value) {
  const text = stripMarkdown(value);
  if (!text) return 'UNKNOWN';
  if (/\bUSER[-_\s]?GATE\b/i.test(text)) return 'USER-GATE';
  if (/\bREVIEW\b/i.test(text)) return 'REVIEW';
  if (/\bAUTO\b/i.test(text)) return 'AUTO';
  return 'UNKNOWN';
}

export function extractDecision(value, fallback = 'D2') {
  const matches = [...String(value || '').matchAll(/\bD([0-4])\b/gi)]
    .map((match) => `D${match[1]}`);
  if (matches.length === 0) return fallback;
  return matches.sort((left, right) => decisionRank(right) - decisionRank(left))[0];
}

export function scanRedSignals(value) {
  const text = stripMarkdown(value);
  return RED_SIGNAL_PATTERNS
    .filter((entry) => entry.pattern.test(text))
    .map(({ id, label }) => ({ id, label }));
}

function createParkingEntry({ blockId, itemId, reason, detail, requiredUserDecision = null }) {
  const meta = PARKING_REASON_META[reason] || {
    type: 'unknown',
    requiredUserDecision: 'Manuell pruefen.',
  };
  return {
    blockId: blockId || null,
    itemId: itemId || null,
    type: meta.type,
    reason,
    detail: detail || '',
    requiredUserDecision: requiredUserDecision || meta.requiredUserDecision,
  };
}

function parseMarkdownTable(section) {
  const rows = [];
  const lines = section.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;
    rows.push(trimmed
      .slice(1, -1)
      .split('|')
      .map((cell) => stripMarkdown(cell)));
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.toLowerCase());
  return rows.slice(1).map((cells) => {
    const row = {};
    for (const [index, header] of headers.entries()) {
      row[header] = cells[index] || '';
    }
    return row;
  });
}

function sectionAfterHeading(content, headingPattern) {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (startIndex < 0) return '';
  const collected = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line)) break;
    collected.push(line);
  }
  return collected.join('\n');
}

export function parseAiExecutionMatrix(content) {
  const section = sectionAfterHeading(content, /^##\s+AI-Ausfuehrungsmatrix\b/i);
  return parseMarkdownTable(section).map((row) => {
    const work = row.arbeit || row.scope || row.thema || row.task || '';
    const decision = row.decision || row.entscheidung || '';
    const gate = row.gate || row.freigabe || '';
    return {
      work,
      decision,
      gate,
      normalizedGate: normalizeGateToken(gate),
      normalizedDecision: extractDecision(decision, 'D2'),
      raw: stripMarkdown([work, decision, gate].join(' | ')),
    };
  }).filter((row) => row.work || row.decision || row.gate);
}

function matrixMatchScore(row, candidateText) {
  const candidateTokens = new Set(tokenize(candidateText));
  if (candidateTokens.size === 0) return 0;
  let score = 0;
  for (const token of unique(tokenize(row.work))) {
    if (candidateTokens.has(token)) score += 4;
  }
  return score;
}

export function findBestMatrixRow(matrixRows, candidateText) {
  const scored = matrixRows
    .map((row, index) => ({ row, index, score: matrixMatchScore(row, candidateText) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => (
      right.score - left.score
      || left.index - right.index
    ));
  return scored[0]?.row || null;
}

export function parsePlanPhases(content) {
  const phases = [];
  let current = null;
  let inGate = false;

  for (const line of content.split(/\r?\n/)) {
    const phaseMatch = line.match(PHASE_HEADING_PATTERN);
    if (phaseMatch) {
      current = {
        id: phaseMatch[1],
        title: stripMarkdown(phaseMatch[2]),
        status: 'unknown',
        items: [],
        checks: [],
      };
      phases.push(current);
      inGate = false;
      continue;
    }

    if (!current) continue;

    const statusMatch = line.match(/^status:\s*(.+?)\s*$/i);
    if (statusMatch) {
      current.status = stripMarkdown(statusMatch[1]).toLowerCase();
      continue;
    }

    if (/^Gate:\s*$/i.test(line.trim())) {
      inGate = true;
      continue;
    }

    if (/^###?\s+/.test(line)) {
      inGate = false;
    }

    if (inGate && line.trim() && !/^\s*-\s+/.test(line) && /^[A-Za-z].*:\s*$/.test(line.trim())) {
      inGate = false;
    }

    const checkboxMatch = line.match(/^\s*-\s+\[([ xX])\]\s+(\d+\.\d+(?:\.\d+)?)\s+(.+?)\s*$/);
    if (checkboxMatch) {
      current.items.push({
        done: checkboxMatch[1].toLowerCase() === 'x',
        id: checkboxMatch[2],
        title: stripMarkdown(checkboxMatch[3]),
      });
      continue;
    }

    if (inGate) {
      const checkMatch = line.match(/^\s*-\s+(.+?)\s*$/);
      if (checkMatch) current.checks.push(stripMarkdown(checkMatch[1]));
    }
  }

  return phases;
}

export function getCurrentOpenSubphase(content, preferredPhaseId = null) {
  const phases = parsePlanPhases(content);
  const openPhases = phases.filter((phase) => (
    phase.status !== 'done'
    && phase.status !== 'closed'
    && phase.items.some((item) => !item.done)
  ));
  const preferred = preferredPhaseId
    ? openPhases.find((phase) => phase.id === preferredPhaseId)
    : null;
  const phase = preferred || openPhases[0] || null;
  if (!phase) return null;
  const openItems = phase.items.filter((item) => !item.done);
  const item = openItems[0] || null;
  if (!item) return null;
  return {
    phaseId: phase.id,
    phaseTitle: phase.title,
    phaseStatus: phase.status,
    subphaseId: item.id,
    subphaseTitle: item.title,
    checks: phase.checks,
    nextOpenSubphaseId: openItems[1]?.id || null,
  };
}

function classifyPolicy({ decision, gate, redSignals, mode }) {
  if (redSignals.length > 0) {
    return {
      runnable: false,
      reason: 'red_text_signal',
      detail: redSignals.map((signal) => signal.label).join(', '),
    };
  }
  if (decisionRank(decision) >= decisionRank('D3')) {
    return {
      runnable: false,
      reason: 'd3_d4_requires_user_gate',
      detail: `${decision} is never auto-run`,
    };
  }
  if (gate === 'USER-GATE') {
    return {
      runnable: false,
      reason: 'user_gate',
      detail: 'USER-GATE is parked',
    };
  }
  if (mode === 'report-only') {
    return {
      runnable: false,
      reason: 'report_only',
      detail: 'report-only mode does not select a runnable slice',
    };
  }
  if (gate === 'AUTO') {
    return {
      runnable: true,
      reason: 'auto_allowed',
      detail: 'AUTO gate is allowed in dry-run selection',
    };
  }
  if (gate === 'REVIEW' && mode === 'auto-d2-review' && decisionRank(decision) <= decisionRank('D2')) {
    return {
      runnable: true,
      reason: 'd2_review_allowed',
      detail: 'auto-d2-review permits D2 REVIEW tool scope',
    };
  }
  if (gate === 'REVIEW') {
    return {
      runnable: false,
      reason: 'review_gate_parked',
      detail: 'auto-safe parks REVIEW work',
    };
  }
  return {
    runnable: false,
    reason: 'missing_ai_gate',
    detail: 'No explicit AUTO/REVIEW/USER-GATE classification found',
  };
}

export function classifyCandidateGate({ candidateText, matrixRows = [], mode = DEFAULT_MODE }) {
  const matrixRow = findBestMatrixRow(matrixRows, candidateText);
  const gateSource = matrixRow?.gate || candidateText;
  const decisionSource = matrixRow?.decision || candidateText;
  const rowRedSignals = scanRedSignals(matrixRow?.raw || '');
  const signalFixtureWork = matrixRow
    && matrixRow.normalizedGate === 'AUTO'
    && /dry-run|parser|kandidatenreport|fake-executor/i.test(matrixRow.work);
  const textRedSignals = signalFixtureWork ? [] : scanRedSignals(candidateText);
  const redSignals = unique([...rowRedSignals, ...textRedSignals].map((signal) => signal.id))
    .map((id) => [...rowRedSignals, ...textRedSignals].find((signal) => signal.id === id));
  const gate = normalizeGateToken(gateSource);
  const decision = extractDecision(decisionSource, 'D2');
  const policy = classifyPolicy({ decision, gate, redSignals, mode });
  return {
    decision,
    gate,
    matrixRow,
    redSignals,
    runnable: policy.runnable,
    reason: policy.reason,
    detail: policy.detail,
  };
}

function candidateSortKey(block, index) {
  const rank = Number.isFinite(block.readiness?.recommendedRank)
    ? block.readiness.recommendedRank
    : 9999;
  const readiness = readinessRank(block.readiness?.status);
  const impact = Number.isFinite(block.impact?.score) ? block.impact.score : 9999;
  return { rank, readiness, impact, index };
}

function compareCandidates(left, right) {
  return (
    left.sort.rank - right.sort.rank
    || left.sort.readiness - right.sort.readiness
    || left.sort.impact - right.sort.impact
    || left.sort.index - right.sort.index
  );
}

function shouldSkipBlock(block) {
  const status = String(block.status || '').toLowerCase();
  const readiness = String(block.readiness?.status || '').toLowerCase();
  return status === 'done' || status === 'closed' || readiness === 'done';
}

function createPlanContextCollector({ preferredPhaseId = null, readMode, planFile }) {
  const matrixLines = [];
  let inMatrix = false;
  let matrixDone = false;
  let phaseSectionsScanned = 0;
  let completedPhaseSectionsLoaded = 0;
  let preferredPhaseSeen = false;
  let selectedPhaseId = null;
  let selectedPhaseLines = [];
  let currentPhaseId = null;
  let currentPhaseLines = [];
  let collectCurrentPhase = false;
  let done = false;

  function maybeFinishCurrentPhase() {
    if (!collectCurrentPhase || currentPhaseLines.length === 0 || selectedPhaseLines.length > 0) {
      currentPhaseLines = [];
      return;
    }
    if (phaseHasOpenSubphase(currentPhaseLines)) {
      selectedPhaseId = currentPhaseId;
      selectedPhaseLines = currentPhaseLines;
      if (matrixDone || matrixLines.length === 0) done = true;
    } else {
      completedPhaseSectionsLoaded += 1;
    }
    currentPhaseLines = [];
  }

  function shouldCollectPhase(phaseId) {
    if (selectedPhaseLines.length > 0) return false;
    if (!preferredPhaseId) return true;
    if (phaseId === preferredPhaseId) {
      preferredPhaseSeen = true;
      return true;
    }
    return preferredPhaseSeen;
  }

  function accept(line) {
    if (done) return;
    const rawLine = String(line || '');
    const trimmed = rawLine.trim();

    if (AI_MATRIX_HEADING_PATTERN.test(trimmed)) {
      inMatrix = true;
      matrixDone = false;
      matrixLines.length = 0;
      matrixLines.push(rawLine);
      return;
    }
    if (inMatrix) {
      if (isSecondLevelHeading(rawLine)) {
        inMatrix = false;
        matrixDone = true;
        if (selectedPhaseLines.length > 0) {
          done = true;
          return;
        }
      } else {
        matrixLines.push(rawLine);
        return;
      }
    }

    const phaseMatch = rawLine.match(PHASE_HEADING_PATTERN);
    if (phaseMatch) {
      maybeFinishCurrentPhase();
      if (done) return;
      currentPhaseId = phaseMatch[1];
      phaseSectionsScanned += 1;
      collectCurrentPhase = shouldCollectPhase(currentPhaseId);
      currentPhaseLines = collectCurrentPhase ? [rawLine] : [];
      return;
    }

    if (collectCurrentPhase) {
      currentPhaseLines.push(rawLine);
    }
  }

  function finish() {
    if (inMatrix) {
      matrixDone = true;
      inMatrix = false;
    }
    maybeFinishCurrentPhase();
    const parts = [];
    if (matrixLines.length > 0) parts.push(matrixLines.join('\n'));
    if (selectedPhaseLines.length > 0) parts.push('## Phasen', selectedPhaseLines.join('\n'));
    return {
      text: parts.join('\n\n'),
      readMode,
      planFile,
      preferredPhaseId,
      selectedPhaseId,
      matrixLoaded: matrixLines.length > 0,
      phaseSectionsLoaded: selectedPhaseLines.length > 0 ? 1 : 0,
      completedPhaseSectionsLoaded,
      phaseSectionsScanned,
    };
  }

  return {
    accept,
    finish,
    get done() {
      return done;
    },
  };
}

export function extractActivePlanContext(content, preferredPhaseId = null, options = {}) {
  const collector = createPlanContextCollector({
    preferredPhaseId,
    readMode: options.readMode || 'provided-slice',
    planFile: options.planFile || null,
  });
  for (const line of String(content || '').split(/\r?\n/)) {
    collector.accept(line);
    if (collector.done) break;
  }
  return collector.finish();
}

async function readActivePlanContext({ rootDir, planFile, preferredPhaseId, planTextByPath }) {
  const normalized = normalizePath(planFile);
  if (planTextByPath && Object.hasOwn(planTextByPath, normalized)) {
    return extractActivePlanContext(planTextByPath[normalized], preferredPhaseId, {
      readMode: 'provided-slice',
      planFile: normalized,
    });
  }
  const collector = createPlanContextCollector({
    preferredPhaseId,
    readMode: 'active-file-slice',
    planFile: normalized,
  });
  const input = createReadStream(path.resolve(rootDir, normalized), { encoding: 'utf8' });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      collector.accept(line);
      if (collector.done) break;
    }
  } finally {
    lines.close();
    input.destroy();
  }
  return collector.finish();
}

function gitDirtyFiles(rootDir) {
  try {
    const output = execFileSync('git', ['status', '--porcelain'], {
      cwd: rootDir,
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => normalizePath(line.slice(3).trim() || line.slice(2).trim()));
  } catch {
    return [];
  }
}

function readinessParking(block) {
  const status = String(block.readiness?.status || '').toLowerCase();
  if (block.readiness?.activeLock || status === 'locked') {
    return createParkingEntry({
      blockId: block.id,
      itemId: block.currentPhase || null,
      reason: 'lock',
      detail: block.readiness?.activeLock?.agent
        ? `locked by ${block.readiness.activeLock.agent}`
        : 'active lock',
    });
  }
  if (status === 'blocked') {
    return createParkingEntry({
      blockId: block.id,
      itemId: block.currentPhase || null,
      reason: 'readiness_blocked',
      detail: block.readiness?.reason || 'readiness is blocked',
    });
  }
  return null;
}

function scopeConflictParking({ block, open, scopeCollisions, activeLocksByBlock = new Map() }) {
  const activeConflicts = (scopeCollisions || []).filter((collision) => {
    const otherBlockId = collision.leftBlock === block.id ? collision.rightBlock : collision.leftBlock;
    return otherBlockId && activeLocksByBlock.has(otherBlockId);
  });
  if (activeConflicts.length === 0) return null;
  const details = activeConflicts.map((collision) => {
    const otherBlockId = collision.leftBlock === block.id ? collision.rightBlock : collision.leftBlock;
    const fileCount = collision.sharedFileCount ?? (collision.sharedFiles || []).length;
    return `${otherBlockId} (${fileCount} shared file${fileCount === 1 ? '' : 's'})`;
  });
  return createParkingEntry({
    blockId: block.id,
    itemId: open.subphaseId,
    reason: 'scope_conflict',
    detail: `active lock collision: ${details.join(', ')}`,
  });
}

function createCandidate({ block, index, planContext, mode, scopeCollisions, activeLocksByBlock = new Map() }) {
  const planText = planContext.text;
  const open = getCurrentOpenSubphase(planText, block.currentPhase);
  if (!open) {
    return {
      parked: createParkingEntry({
        blockId: block.id,
        itemId: block.currentPhase || null,
        reason: 'no_open_subphase',
        detail: 'No unchecked subphase was found in the active plan file',
      }),
      candidate: null,
    };
  }

  const matrixRows = parseAiExecutionMatrix(planText);
  const candidateText = [
    block.id,
    block.title,
    open.phaseId,
    open.phaseTitle,
    open.subphaseId,
    open.subphaseTitle,
  ].join(' ');
  const gate = classifyCandidateGate({ candidateText, matrixRows, mode });
  const readiness = readinessParking(block);
  const candidate = {
    blockId: block.id,
    title: block.title,
    phaseId: open.phaseId,
    phaseTitle: open.phaseTitle,
    subphaseId: open.subphaseId,
    subphaseTitle: open.subphaseTitle,
    mode,
    decision: gate.decision,
    gate: gate.gate,
    readiness: block.readiness?.status || 'unknown',
    readinessReason: block.readiness?.reason || null,
    recommendedRank: block.readiness?.recommendedRank ?? null,
    dependencies: block.dependsOn || [],
    dependencyCounts: {
      total: block.readiness?.dependencyCount ?? (block.dependsOn || []).length,
      open: block.readiness?.openDependencyCount ?? 0,
      openHard: block.readiness?.openHardDependencyCount ?? 0,
    },
    scopeCollisions,
    impact: block.impact || null,
    allowedFiles: block.scopeFiles || [],
    checks: open.checks.length > 0 ? open.checks : (block.verification || []),
    planRead: {
      mode: planContext.readMode,
      planFile: planContext.planFile,
      preferredPhaseId: planContext.preferredPhaseId,
      selectedPhaseId: planContext.selectedPhaseId,
      matrixLoaded: planContext.matrixLoaded,
      phaseSectionsLoaded: planContext.phaseSectionsLoaded,
      completedPhaseSectionsLoaded: planContext.completedPhaseSectionsLoaded,
      phaseSectionsScanned: planContext.phaseSectionsScanned,
    },
    matrixMatch: gate.matrixRow ? {
      work: gate.matrixRow.work,
      decision: gate.matrixRow.decision,
      gate: gate.matrixRow.gate,
    } : null,
    redSignals: gate.redSignals,
    sort: candidateSortKey(block, index),
  };

  if (readiness) {
    readiness.itemId = open.subphaseId;
    return {
      candidate,
      parked: readiness,
    };
  }
  const scopeConflict = scopeConflictParking({ block, open, scopeCollisions, activeLocksByBlock });
  if (scopeConflict) {
    return {
      candidate,
      parked: scopeConflict,
    };
  }
  if (!gate.runnable) {
    return {
      candidate,
      parked: createParkingEntry({
        blockId: block.id,
        itemId: open.subphaseId,
        reason: gate.reason,
        detail: gate.detail,
      }),
    };
  }
  return { candidate, parked: null };
}

export async function buildAutopilotPlan(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const mode = options.mode || DEFAULT_MODE;
  if (!SUPPORTED_MODES.has(mode)) {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const planMapData = options.planMapData || await buildPlanMapData({ rootDir });
  const dirtyFiles = options.gitDirtyFiles || gitDirtyFiles(rootDir);
  const candidates = [];
  const parked = [];
  if (dirtyFiles.length > 0) {
    parked.push(createParkingEntry({
      blockId: null,
      itemId: null,
      reason: 'dirty_worktree',
      detail: dirtyFiles.join(', '),
    }));
  }
  const collisionsByBlock = new Map();
  for (const collision of planMapData.scopeCollisions || []) {
    for (const blockId of [collision.leftBlock, collision.rightBlock].filter(Boolean)) {
      if (!collisionsByBlock.has(blockId)) collisionsByBlock.set(blockId, []);
      collisionsByBlock.get(blockId).push(collision);
    }
  }
  const activeLocksByBlock = new Map((planMapData.locks?.active || [])
    .filter((lock) => lock?.blockId)
    .map((lock) => [lock.blockId, lock]));
  const blockFilter = options.blockFilter ? new Set([String(options.blockFilter).toUpperCase()]) : null;
  const blocks = (planMapData.blocks || []).filter((block) => (
    (!blockFilter || blockFilter.has(String(block.id).toUpperCase()))
    && !shouldSkipBlock(block)
  ));

  for (const [index, block] of blocks.entries()) {
    const planFile = normalizePath(block.planFile);
    if (!planFile) {
      parked.push({
        blockId: block.id,
        itemId: block.currentPhase || null,
        reason: 'missing_plan_file',
        detail: 'Plan-map entry has no plan file',
      });
      continue;
    }
    let planContext = null;
    try {
      planContext = await readActivePlanContext({
        rootDir,
        planFile,
        preferredPhaseId: block.currentPhase,
        planTextByPath: options.planTextByPath,
      });
    } catch (error) {
      parked.push({
        blockId: block.id,
        itemId: block.currentPhase || null,
        reason: 'plan_file_unreadable',
        detail: error.message,
      });
      continue;
    }

    const result = createCandidate({
      block,
      index,
      planContext,
      mode,
      scopeCollisions: collisionsByBlock.get(block.id) || [],
      activeLocksByBlock,
    });
    if (result.candidate) candidates.push(result.candidate);
    if (result.parked) parked.push(result.parked);
  }

  candidates.sort(compareCandidates);
  const parkedKeys = new Set(parked.map((entry) => `${entry.blockId}:${entry.itemId}`));
  const runnable = mode === 'report-only'
    ? []
    : candidates.filter((candidate) => !parkedKeys.has(`${candidate.blockId}:${candidate.subphaseId}`));
  const selected = runnable[0] || null;
  return {
    contract: CONTRACT,
    mode,
    dryRun: true,
    generatedAt: new Date().toISOString(),
    inputs: {
      planMap: 'scripts/export-plan-map.mjs#buildPlanMapData',
      masterPlan: planMapData.sources?.masterPlan || 'docs/Umsetzungsplan.md',
      structuredPlanIndex: planMapData.sources?.structuredPlanIndex || 'docs/generated/plan-index.json',
      lockRegistry: 'docs/lock-status/_locks-registry.json',
    },
    dirtyWorktree: dirtyFiles.length > 0,
    dirtyFiles,
    selected,
    candidates,
    parked,
    stopConditions: [
      'USER-GATE',
      'D3',
      'D4',
      'scope violation',
      'dirty unrelated files',
      'red text signal',
    ],
    summary: {
      candidateCount: candidates.length,
      parkedCount: parked.length,
      selectedBlockId: selected?.blockId || null,
      selectedSubphaseId: selected?.subphaseId || null,
    },
  };
}

function ensureStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function validateWorkerOutput(output, candidate) {
  const violations = [];
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return {
      valid: false,
      violations: ['worker output must be an object'],
    };
  }
  if (output.contract !== WORKER_OUTPUT_CONTRACT) {
    violations.push(`contract must be ${WORKER_OUTPUT_CONTRACT}`);
  }
  if (!WORKER_STATUSES.has(output.status)) {
    violations.push('status must be completed, gate_required, blocked or no_change');
  }
  for (const [field, expected] of [
    ['blockId', candidate?.blockId],
    ['phaseId', candidate?.phaseId],
    ['subphaseId', candidate?.subphaseId],
  ]) {
    if (expected && output[field] !== expected) {
      violations.push(`${field} must match selected slice ${expected}`);
    }
  }
  if (!ensureStringArray(output.checks)) {
    violations.push('checks must be an array of strings');
  }
  if (!ensureStringArray(output.notChecked)) {
    violations.push('notChecked must be an array of strings');
  }
  if (!ensureStringArray(output.changedFiles)) {
    violations.push('changedFiles must be an array of strings');
  }
  if (output.status === 'completed' && !output.commit) {
    violations.push('completed output requires commit');
  }
  if ((output.status === 'gate_required' || output.status === 'blocked') && !output.gateReason) {
    violations.push(`${output.status} output requires gateReason`);
  }
  return {
    valid: violations.length === 0,
    violations,
  };
}

export function validateDiffScope(changedFiles, allowedFiles) {
  const allowed = new Set((allowedFiles || []).map(normalizePath));
  const changed = (changedFiles || []).map(normalizePath).filter(Boolean);
  const outOfScope = changed.filter((file) => !allowed.has(file));
  return {
    valid: outOfScope.length === 0,
    changedFiles: changed,
    outOfScope,
  };
}

function parseWorkerJson(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    throw new Error('Worker produced no output');
  }
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) {
      return JSON.parse(fenced);
    }
    const objectMatch = raw.match(/\{[\s\S]*\}\s*$/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error('Worker output did not contain parseable JSON');
  }
}

function fakeWorkerOutput({ candidate, status }) {
  if (!FAKE_STATUSES.has(status)) {
    throw new Error(`Unsupported fake status: ${status}`);
  }
  const changedFiles = status === 'completed'
    ? [candidate.allowedFiles[0] || 'scripts/plan-autopilot.mjs']
    : status === 'out_of_scope'
      ? ['tmp/out-of-scope.txt']
      : [];
  return {
    contract: WORKER_OUTPUT_CONTRACT,
    status: status === 'out_of_scope' ? 'completed' : status,
    blockId: candidate.blockId,
    phaseId: candidate.phaseId,
    subphaseId: candidate.subphaseId,
    checks: status === 'completed' || status === 'out_of_scope'
      ? candidate.checks.map((check) => `${check} -> PASS`)
      : [],
    commit: status === 'completed' || status === 'out_of_scope' ? 'fake-commit' : null,
    gateReason: status === 'gate_required'
      ? 'Fake executor requested a gate'
      : status === 'blocked'
        ? 'Fake executor hit a blocker'
        : null,
    notChecked: status === 'no_change' ? ['fake executor made no changes'] : [],
    changedFiles,
  };
}

export function renderWorkerPrompt(candidate, templateText) {
  const payload = {
    contract: WORKER_OUTPUT_CONTRACT,
    blockId: candidate.blockId,
    phaseId: candidate.phaseId,
    subphaseId: candidate.subphaseId,
    subphaseTitle: candidate.subphaseTitle,
    mode: candidate.mode,
    decision: candidate.decision,
    gate: candidate.gate,
    allowedFiles: candidate.allowedFiles,
    forbiddenSurfaces: [
      'AGENTS.md',
      '.agents/rules/',
      '.agents/workflows/',
      'docs/Umsetzungsplan.md',
      'git add .',
      'git stash',
      'git reset --hard',
      'git clean',
    ],
    checks: candidate.checks,
    stopConditions: [
      'USER-GATE',
      'D3',
      'D4',
      'scope violation',
      'dirty unrelated files',
      'red text signal',
    ],
  };
  const renderedPayload = JSON.stringify(payload, null, 2);
  if (String(templateText || '').includes('{{PLAN_AUTOPILOT_SLICE_JSON}}')) {
    return String(templateText).replace('{{PLAN_AUTOPILOT_SLICE_JSON}}', renderedPayload);
  }
  return `${templateText || ''}\n\n${renderedPayload}\n`;
}

async function runCodexWorker({ rootDir, candidate }) {
  const template = await fs.readFile(path.resolve(rootDir, WORKER_PROMPT_PATH), 'utf8');
  const prompt = renderWorkerPrompt(candidate, template);
  let stdout = '';
  try {
    stdout = execFileSync('codex', ['exec', '--ask-for-approval', 'never', prompt], {
      cwd: rootDir,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    const message = stderr || error?.message || 'codex exec failed';
    throw new Error(`codex exec failed: ${message}`);
  }
  return parseWorkerJson(stdout);
}

function buildReviewChecklist({ plan, workerOutput, diffScope, status, reason }) {
  return {
    parkedGates: plan.parked
      .filter((entry) => entry.type === 'gate' || entry.type === 'red-text-signal')
      .map((entry) => ({
        blockId: entry.blockId,
        itemId: entry.itemId,
        reason: entry.reason,
        requiredUserDecision: entry.requiredUserDecision,
      })),
    processedScope: plan.selected ? {
      blockId: plan.selected.blockId,
      subphaseId: plan.selected.subphaseId,
      allowedFiles: plan.selected.allowedFiles,
      changedFiles: diffScope?.changedFiles || workerOutput?.changedFiles || [],
      outOfScope: diffScope?.outOfScope || [],
    } : null,
    checks: workerOutput?.checks || [],
    commit: workerOutput?.commit || null,
    notChecked: workerOutput?.notChecked || [],
    status,
    reason: reason || null,
    knownRisks: [
      'Codex-Live-Run bleibt lokal CLI-abhaengig.',
      'D3/D4 und USER-GATE bleiben geparkt statt automatisch ausgefuehrt.',
      'MVP verarbeitet maximal einen Slice pro Run.',
    ],
  };
}

export async function executeAutopilotRun(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const mode = options.mode || DEFAULT_MODE;
  const executor = options.executor || 'codex';
  const maxSlices = Number(options.maxSlices || 0);
  if (!SUPPORTED_EXECUTORS.has(executor)) {
    throw new Error(`Unsupported executor: ${executor}`);
  }
  if (!Number.isInteger(maxSlices) || maxSlices < 1) {
    throw new Error('run requires explicit --max-slices=N');
  }
  if (maxSlices !== 1) {
    throw new Error('V145 MVP supports --max-slices=1 only; raise the limit after review evidence.');
  }

  const plan = await buildAutopilotPlan({
    rootDir,
    mode,
    blockFilter: options.blockFilter,
    planMapData: options.planMapData,
    planTextByPath: options.planTextByPath,
    gitDirtyFiles: options.gitDirtyFiles,
  });

  if (plan.dirtyWorktree) {
    const status = 'blocked';
    const reason = 'dirty_worktree';
    return {
      contract: RUN_CONTRACT,
      status,
      reason,
      executor,
      maxSlices,
      selected: plan.selected,
      dirtyFiles: plan.dirtyFiles,
      parked: plan.parked,
      workerOutput: null,
      reviewChecklist: buildReviewChecklist({ plan, status, reason }),
    };
  }

  if (!plan.selected) {
    const status = 'no_change';
    const reason = 'no_runnable_candidate';
    return {
      contract: RUN_CONTRACT,
      status,
      reason,
      executor,
      maxSlices,
      selected: null,
      parked: plan.parked,
      workerOutput: null,
      reviewChecklist: buildReviewChecklist({ plan, status, reason }),
    };
  }

  let workerOutput = null;
  try {
    workerOutput = executor === 'fake'
      ? fakeWorkerOutput({ candidate: plan.selected, status: options.fakeStatus || 'completed' })
      : await runCodexWorker({ rootDir, candidate: plan.selected });
  } catch (error) {
    const status = 'blocked';
    const reason = 'executor_failed';
    return {
      contract: RUN_CONTRACT,
      status,
      reason,
      executor,
      maxSlices,
      selected: plan.selected,
      parked: plan.parked,
      error: error.message,
      workerOutput: null,
      reviewChecklist: buildReviewChecklist({ plan, status, reason }),
    };
  }

  const workerValidation = validateWorkerOutput(workerOutput, plan.selected);
  if (!workerValidation.valid) {
    const status = 'blocked';
    const reason = 'worker_contract_violation';
    return {
      contract: RUN_CONTRACT,
      status,
      reason,
      executor,
      maxSlices,
      selected: plan.selected,
      parked: plan.parked,
      workerOutput,
      violations: workerValidation.violations,
      reviewChecklist: buildReviewChecklist({ plan, workerOutput, status, reason }),
    };
  }

  const diffScope = validateDiffScope(workerOutput.changedFiles, plan.selected.allowedFiles);
  if (!diffScope.valid) {
    const status = 'blocked';
    const reason = 'scope_violation';
    return {
      contract: RUN_CONTRACT,
      status,
      reason,
      executor,
      maxSlices,
      selected: plan.selected,
      parked: plan.parked,
      workerOutput,
      diffScope,
      reviewChecklist: buildReviewChecklist({ plan, workerOutput, diffScope, status, reason }),
    };
  }

  if ((workerOutput.status === 'gate_required' || workerOutput.status === 'blocked')
    && diffScope.changedFiles.length > 0) {
    const status = 'blocked';
    const reason = 'partial_work_requires_manual_review';
    return {
      contract: RUN_CONTRACT,
      status,
      reason,
      executor,
      maxSlices,
      selected: plan.selected,
      parked: plan.parked,
      workerOutput,
      diffScope,
      reviewChecklist: buildReviewChecklist({ plan, workerOutput, diffScope, status, reason }),
    };
  }

  return {
    contract: RUN_CONTRACT,
    status: workerOutput.status,
    reason: workerOutput.gateReason || null,
    executor,
    maxSlices,
    selected: plan.selected,
    parked: plan.parked,
    workerOutput,
    diffScope,
    reviewChecklist: buildReviewChecklist({
      plan,
      workerOutput,
      diffScope,
      status: workerOutput.status,
      reason: workerOutput.gateReason,
    }),
  };
}

function parseArgs(argv) {
  const args = {
    command: null,
    mode: DEFAULT_MODE,
    dryRun: false,
    json: false,
    blockFilter: null,
    maxSlices: null,
    executor: 'codex',
    fakeStatus: 'completed',
    help: false,
  };
  for (const token of argv) {
    if (!args.command && !token.startsWith('--')) {
      args.command = token;
      continue;
    }
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--json') args.json = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else if (token.startsWith('--mode=')) args.mode = token.slice('--mode='.length);
    else if (token.startsWith('--block=')) args.blockFilter = token.slice('--block='.length);
    else if (token.startsWith('--max-slices=')) args.maxSlices = Number(token.slice('--max-slices='.length));
    else if (token.startsWith('--executor=')) args.executor = token.slice('--executor='.length);
    else if (token.startsWith('--fake-status=')) args.fakeStatus = token.slice('--fake-status='.length);
  }
  return args;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/plan-autopilot.mjs plan --dry-run [--mode=auto-safe|auto-d2-review|report-only] [--block=V145] [--json]
  node scripts/plan-autopilot.mjs run --max-slices=1 [--mode=auto-safe|auto-d2-review] [--executor=codex|fake] [--json]

plan is read-only. run requires an explicit max-slices limit and a clean worktree before it can start codex exec.
`);
}

function printTextReport(report) {
  const selected = report.selected
    ? `${report.selected.blockId} ${report.selected.subphaseId} ${report.selected.subphaseTitle}`
    : 'none';
  const lines = [
    `plan-autopilot ${report.mode} dry-run`,
    `selected: ${selected}`,
    `candidates: ${report.summary.candidateCount}`,
    `parked: ${report.summary.parkedCount}`,
  ];
  if (report.dirtyWorktree) {
    lines.push(`dirty-worktree: ${report.dirtyFiles.join(', ')}`);
  }
  for (const entry of report.parked.slice(0, 10)) {
    lines.push(`parked ${entry.blockId} ${entry.itemId || '-'}: ${entry.reason} (${entry.detail})`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function printRunReport(report) {
  const selected = report.selected
    ? `${report.selected.blockId} ${report.selected.subphaseId} ${report.selected.subphaseTitle}`
    : 'none';
  const lines = [
    `plan-autopilot run status=${report.status}`,
    `reason: ${report.reason || 'none'}`,
    `executor: ${report.executor}`,
    `selected: ${selected}`,
  ];
  if (report.dirtyFiles?.length > 0) {
    lines.push(`dirty-worktree: ${report.dirtyFiles.join(', ')}`);
  }
  if (report.diffScope?.outOfScope?.length > 0) {
    lines.push(`out-of-scope: ${report.diffScope.outOfScope.join(', ')}`);
  }
  if (report.workerOutput?.checks?.length > 0) {
    lines.push(`checks: ${report.workerOutput.checks.join('; ')}`);
  }
  if (report.workerOutput?.commit) {
    lines.push(`commit: ${report.workerOutput.commit}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command) {
    printHelp();
    return;
  }
  if (args.command !== 'plan' && args.command !== 'run') {
    throw new Error(`Unsupported command: ${args.command}`);
  }
  if (args.command === 'plan' && !args.dryRun) {
    throw new Error('plan requires --dry-run');
  }
  if (args.command === 'plan') {
    const report = await buildAutopilotPlan({
      mode: args.mode,
      blockFilter: args.blockFilter,
    });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      printTextReport(report);
    }
    return;
  }

  const report = await executeAutopilotRun({
    mode: args.mode,
    blockFilter: args.blockFilter,
    maxSlices: args.maxSlices,
    executor: args.executor,
    fakeStatus: args.fakeStatus,
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printRunReport(report);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`plan-autopilot: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
