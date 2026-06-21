#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { auditStagedDiff } from './check-ai-diff-audit.mjs';
import { parseWorkflowFrontmatter } from './check-workflow-contracts.mjs';

const DECISION_ORDER = new Map([
  ['D0', 0],
  ['D1', 1],
  ['D2', 2],
  ['D3', 3],
  ['D4', 4],
]);

const D3_SURFACE_PATTERNS = [
  /^AGENTS\.md$/,
  /^\.agents(?:\/|$)/,
  /^\.husky\/(?:pre-commit|commit-msg)$/,
  /^docs\/Umsetzungsplan\.md$/,
  /^docs\/plaene\/aktiv\//,
  /^docs\/bot-training\/Bot_Trainingsplan\.md$/,
  /^scripts\/(?:agent-commit-wrapper|agent-preflight|check-agent-commit-message|check-ai-diff-audit|check-workflow-contracts|docs-freshness|gates-pre-commit|validate-umsetzungsplan)\.mjs$/,
];

const KNOWLEDGE_GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const NONE_VALUES = new Set(['none', 'keine', 'n/a', '-']);
const KNOWN_GENERATED_CHURN_FILES = new Set([
  'docs/lock-status/_locks-registry.json',
]);
const BROAD_CLAIM_PATTERN = /\b(alles geprueft|vollstaendig verifiziert|repo-weit konsistent|alle workflows|alle rules|alle regeln|alle scope_files|vollstaendige scope_files|all workflows|all rules|entire repo|whole repo)\b/i;

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
  return (await readWorkflowMetadata({ root })).map((workflow) => workflow.name);
}

export async function readWorkflowMetadata({ root = process.cwd() } = {}) {
  const workflowDir = path.join(root, '.agents', 'workflows');
  const entries = await fs.readdir(workflowDir, { withFileTypes: true });
  const workflows = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map(async (entry) => {
      const name = entry.name.slice(0, -'.md'.length);
      const file = `.agents/workflows/${entry.name}`;
      const content = await fs.readFile(path.join(workflowDir, entry.name), 'utf8');
      return {
        name,
        file,
        frontmatter: parseWorkflowFrontmatter(content),
      };
    }));
  return workflows
    .sort((a, b) => a.name.localeCompare(b.name));
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

export function getStagedDiff({ root = process.cwd() } = {}) {
  return runGit(['diff', '--cached', '--no-ext-diff', '--unified=0'], { root });
}

export function parseShortStatusPath(line) {
  const rawLine = line.trimEnd();
  if (!rawLine) {
    return '';
  }
  const rawPath = rawLine.slice(3).trim();
  if (!rawPath) {
    return '';
  }
  const normalizedPath = normalizePath(rawPath);
  const renameTarget = normalizedPath.split(' -> ').pop().trim();
  return renameTarget;
}

export function getUncommittedFiles({ root = process.cwd() } = {}) {
  return runGit(['status', '--short'], { root })
    .split(/\r?\n/)
    .map(parseShortStatusPath)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
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

function parseListField(value) {
  if (!value) {
    return [];
  }
  if (NONE_VALUES.has(value.trim().toLowerCase())) {
    return [];
  }
  return value
    .split(/[,;]/)
    .map((item) => normalizePath(item.trim()))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function normalizeUnique(values) {
  return Array.from(new Set(values.map(normalizePath))).sort((a, b) => a.localeCompare(b));
}

function isPresent(value) {
  return Boolean(value && value.trim());
}

export function isExplicitUserGate(value) {
  if (!isPresent(value)) {
    return false;
  }
  const actor = String.raw`(?:user|nutzer(?:in|innen)?|benutzer(?:in|innen)?)`;
  const approval = String.raw`(?:approved|requested|confirmed|authorized|authorised|freigabe|freigegeben|beauftragt|bestaetigt|bestätigt|zugestimmt|genehmigt|angefordert)`;
  return new RegExp(`(?:${actor}.{0,120}${approval}|${approval}.{0,120}${actor})`, 'i').test(value);
}

function decisionAtLeast(decision, minimum) {
  return DECISION_ORDER.has(decision)
    && DECISION_ORDER.has(minimum)
    && DECISION_ORDER.get(decision) >= DECISION_ORDER.get(minimum);
}

function normalizeEvidenceText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function evidenceIncludesCheck(evidence, check) {
  const normalizedCheck = normalizeEvidenceText(check);
  return normalizedCheck.length > 0
    && normalizeEvidenceText(evidence).includes(normalizedCheck);
}

function listDifference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function formatKnownUncommittedSuggestion(files) {
  if (files.length === 0) {
    return '';
  }
  const suggestion = ` Vorschlag: \`Known-uncommitted: ${files.join(', ')}\`.`;
  const onlyKnownGeneratedChurn = files.every((file) => KNOWN_GENERATED_CHURN_FILES.has(file));
  if (!onlyKnownGeneratedChurn) {
    return suggestion;
  }
  return `${suggestion} Nur bekannte generierte Hook-/Timestamp-Churn-Datei(en) betroffen; trotzdem bewusst benennen oder den Generator-Diff vor dem Commit bereinigen.`;
}

async function readKnowledgeGraph(root) {
  const graphPath = path.join(root, KNOWLEDGE_GRAPH_PATH);
  try {
    const text = await fs.readFile(graphPath, 'utf8');
    const graph = JSON.parse(text);
    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      return { graph: null, warning: `${KNOWLEDGE_GRAPH_PATH} hat keine nodes/edges-Struktur.` };
    }
    return { graph, warning: null };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { graph: null, warning: `${KNOWLEDGE_GRAPH_PATH} fehlt; Graph-Kontext wird uebersprungen.` };
    }
    return { graph: null, warning: `${KNOWLEDGE_GRAPH_PATH} konnte nicht gelesen werden: ${error.message}` };
  }
}

function collectGraphContext(graph, files) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const scopeEdgesByFile = new Map();
  for (const edge of graph.edges) {
    if (edge.type !== 'scope') {
      continue;
    }
    if (!scopeEdgesByFile.has(edge.to)) {
      scopeEdgesByFile.set(edge.to, []);
    }
    scopeEdgesByFile.get(edge.to).push(edge);
  }

  return files.map((file) => {
    const node = nodeById.get(file);
    const scopeEdges = scopeEdgesByFile.get(file) || [];
    const scopeBlocks = new Set([
      ...((node?.attributes?.scopeBlocks) || []),
      ...scopeEdges.map((edge) => edge.from),
    ]);
    return {
      file,
      inGraph: Boolean(node),
      nodeType: node?.type || null,
      source: node?.attributes?.source || [],
      scopeBlocks: Array.from(scopeBlocks).sort((a, b) => a.localeCompare(b)),
      scopeEdgeCount: scopeEdges.length,
    };
  });
}

export async function readAgentGraphContext({ root = process.cwd(), files = [] } = {}) {
  const uniqueFiles = Array.from(new Set(files.map(normalizePath))).sort((a, b) => a.localeCompare(b));
  if (uniqueFiles.length === 0) {
    return { available: false, files: [], warnings: [] };
  }

  const { graph, warning } = await readKnowledgeGraph(root);
  if (!graph) {
    return { available: false, files: [], warnings: warning ? [warning] : [] };
  }

  const graphFiles = collectGraphContext(graph, uniqueFiles);
  const warnings = [];
  const missing = graphFiles.filter((entry) => !entry.inGraph).map((entry) => entry.file);
  if (missing.length > 0) {
    warnings.push(`Graph kennt ${missing.length} gestagte Datei(en) noch nicht: ${missing.join(', ')}`);
  }

  const withoutScope = graphFiles
    .filter((entry) => entry.inGraph && entry.scopeBlocks.length === 0)
    .map((entry) => entry.file);
  if (withoutScope.length > 0) {
    warnings.push(`Graph hat fuer ${withoutScope.length} Datei(en) keine Scope-Bloecke: ${withoutScope.join(', ')}`);
  }

  return { available: true, files: graphFiles, warnings };
}

export async function validateAgentEnvelope({
  root = process.cwd(),
  workflow,
  decision,
  evidence,
  gate,
  recovery,
  scope,
  knownUncommitted,
  residualRisk,
  notChecked,
  generatedBy,
  canonicalSource,
  changes = null,
  diff = null,
  uncommittedFiles = null,
  graph = true,
  claimText = '',
} = {}) {
  const workflowMetadata = await readWorkflowMetadata({ root });
  const workflows = workflowMetadata.map((entry) => entry.name);
  const selectedWorkflow = workflowMetadata.find((entry) => entry.name === workflow);
  const stagedChanges = changes || getStagedChanges({ root });
  const stagedDiff = diff ?? (changes ? '' : getStagedDiff({ root }));
  const actualUncommittedFiles = uncommittedFiles || getUncommittedFiles({ root });
  const violations = [];
  const warnings = [];
  const stagedFiles = normalizeUnique(stagedChanges.map((change) => change.file));

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

  if (selectedWorkflow?.frontmatter) {
    const workflowFloor = selectedWorkflow.frontmatter.decision_floor;
    if (DECISION_ORDER.has(decision) && DECISION_ORDER.has(workflowFloor) && !decisionAtLeast(decision, workflowFloor)) {
      addViolation(
        violations,
        'workflow-decision-below-floor',
        `Workflow \`${workflow}\` verlangt mindestens \`Decision: ${workflowFloor}\`.`,
        [selectedWorkflow.file]
      );
    }

    const requiredChecks = Array.isArray(selectedWorkflow.frontmatter.required_checks)
      ? selectedWorkflow.frontmatter.required_checks.filter(Boolean)
      : [];
    if (isPresent(evidence) && !/^none$/i.test(evidence.trim())) {
      const missingRequiredChecks = requiredChecks.filter((check) => !evidenceIncludesCheck(evidence, check));
      if (missingRequiredChecks.length > 0) {
        addViolation(
          violations,
          'workflow-required-check-missing',
          `Evidence fehlt deklarierte Workflow-Checks: ${missingRequiredChecks.join(', ')}.`,
          [selectedWorkflow.file]
        );
      }
    }
  }

  if (!evidence || /^none$/i.test(evidence.trim())) {
    addViolation(violations, 'missing-evidence', 'Commit/Preflight braucht `Evidence: <command/result>`.');
  } else if (!/(->\s*)?(PASS|WARN|FAIL)\b/i.test(evidence)) {
    addViolation(
      violations,
      'evidence-without-result',
      '`Evidence:` muss ein pruefbares Ergebnis enthalten, z. B. `npm run plan:check -> PASS`.'
    );
  }

  const declaredScope = parseListField(scope);
  if (stagedFiles.length > 0 && declaredScope.length === 0) {
    addViolation(violations, 'missing-scope', 'Commit/Preflight braucht `Scope:` mit den gestagten Dateien.');
  } else if (declaredScope.length > 0) {
    const missingFromScope = listDifference(stagedFiles, declaredScope);
    const extraInScope = listDifference(declaredScope, stagedFiles);
    if (missingFromScope.length > 0) {
      addViolation(violations, 'scope-missing-staged-files', '`Scope:` nennt nicht alle gestagten Dateien.', missingFromScope);
    }
    if (extraInScope.length > 0) {
      addViolation(violations, 'scope-has-unstaged-files', '`Scope:` enthaelt Dateien, die nicht gestaged sind.', extraInScope);
    }
  }

  const declaredKnownUncommitted = parseListField(knownUncommitted);
  const unstagedFiles = listDifference(actualUncommittedFiles, stagedFiles);
  if (!knownUncommitted) {
    addViolation(violations, 'missing-known-uncommitted', 'Commit/Preflight braucht `Known-uncommitted:` (`none` wenn sauber).');
  } else {
    const missingKnown = listDifference(unstagedFiles, declaredKnownUncommitted);
    const extraKnown = listDifference(declaredKnownUncommitted, unstagedFiles);
    if (missingKnown.length > 0) {
      addViolation(
        violations,
        'known-uncommitted-missing-files',
        `\`Known-uncommitted:\` nennt nicht alle ungestagten/untracked Dateien.${formatKnownUncommittedSuggestion(missingKnown)}`,
        missingKnown
      );
    }
    if (extraKnown.length > 0) {
      addViolation(
        violations,
        'known-uncommitted-extra-files',
        '`Known-uncommitted:` enthaelt Dateien, die aktuell nicht uncommitted ausserhalb des Scope liegen.',
        extraKnown
      );
    }
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

  if (decision === 'D3' && !isExplicitUserGate(gate)) {
    addViolation(violations, 'd3-missing-user-gate', '`Decision: D3` braucht ein explizit bestaetigtes User-Gate in `Gate:`.');
  }

  if ((decision === 'D3' || decision === 'D4') && !isPresent(residualRisk)) {
    addViolation(violations, 'missing-residual-risk', '`Decision: D3/D4` braucht `Residual-risk:`.');
  }

  if (decisionAtLeast(decision, 'D2') && !isPresent(notChecked)) {
    addViolation(violations, 'missing-not-checked', '`Decision: D2/D3/D4` braucht `Not-checked:`.');
  }

  if (decision === 'D4') {
    if (!isExplicitUserGate(gate)) {
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

  if (BROAD_CLAIM_PATTERN.test(`${claimText}\n${evidence || ''}`) && !/gates:pre-commit|check:plan-evidence-claims|file-by-file|konkrete/i.test(evidence || '')) {
    addViolation(
      violations,
      'broad-claim-without-broad-evidence',
      'Breite Claims brauchen breite Evidence, z. B. `npm run gates:pre-commit -> PASS` oder konkrete File-by-File-Evidence.'
    );
  }

  const diffAudit = auditStagedDiff({
    changes: stagedChanges,
    diff: stagedDiff,
    envelope: {
      decision,
      gate,
      generatedBy,
      canonicalSource,
      residualRisk,
      notChecked,
    },
  });
  for (const finding of diffAudit.violations) {
    if (finding.id === 'missing-not-checked-d2' && violations.some((entry) => entry.id === 'missing-not-checked')) {
      continue;
    }
    addViolation(violations, `ai-diff-${finding.id}`, `AI-Diff-Audit: ${finding.message}`, finding.files);
  }
  for (const finding of diffAudit.warnings) {
    const files = finding.files.length > 0 ? ` files=${finding.files.join(', ')}` : '';
    warnings.push(`AI-Diff-Audit: [${finding.id}] ${finding.message}${files}`);
  }

  const graphContext = graph
    ? await readAgentGraphContext({ root, files: stagedFiles })
    : { available: false, files: [], warnings: [] };
  warnings.push(...graphContext.warnings.map((warning) => `Graph: ${warning}`));

  return {
    workflows,
    stagedChanges,
    uncommittedFiles: actualUncommittedFiles,
    graphContext,
    diffAudit,
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
  const scope = valueFromCliOrEnv(args, 'scope', 'AGENT_SCOPE');
  const knownUncommitted = valueFromCliOrEnv(args, 'known-uncommitted', 'AGENT_KNOWN_UNCOMMITTED');
  const residualRisk = valueFromCliOrEnv(args, 'residual-risk', 'AGENT_RESIDUAL_RISK');
  const notChecked = valueFromCliOrEnv(args, 'not-checked', 'AGENT_NOT_CHECKED');
  const generatedBy = valueFromCliOrEnv(args, 'generated-by', 'AGENT_GENERATED_BY');
  const canonicalSource = valueFromCliOrEnv(args, 'canonical-source', 'AGENT_CANONICAL_SOURCE');

  const result = await validateAgentEnvelope({
    workflow,
    decision,
    evidence,
    gate,
    recovery,
    scope,
    knownUncommitted,
    residualRisk,
    notChecked,
    generatedBy,
    canonicalSource,
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
  if (result.graphContext.available && result.graphContext.files.length > 0) {
    console.log('[agent:preflight] graph context:');
    for (const entry of result.graphContext.files) {
      const scopes = entry.scopeBlocks.length > 0 ? entry.scopeBlocks.join(',') : 'none';
      const marker = entry.inGraph ? 'ok' : 'missing';
      console.log(`- ${marker} ${entry.file} scopes=${scopes}`);
    }
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
