#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DECISION_ORDER = new Map([
  ['D0', 0],
  ['D1', 1],
  ['D2', 2],
  ['D3', 3],
  ['D4', 4],
]);

const FILE_CLASS_RULES = [
  {
    className: 'runtime-code',
    patterns: [
      /^src\//,
      /^server\//,
      /^electron\//,
      /^android-classic\/(?:app|src)\//,
      /^android-map-tools\/(?:app|src)\//,
    ],
  },
  {
    className: 'generator-code',
    patterns: [
      /^scripts\/(?:build|export|migrate)-.+\.mjs$/,
      /^scripts\/(?:check|validate)-.+\.mjs$/,
      /^scripts\/docs-freshness\.mjs$/,
      /^scripts\/query-knowledge-graph\.mjs$/,
      /^scripts\/gates-pre-commit\.mjs$/,
      /^tools\/graph-viewer\//,
    ],
  },
  {
    className: 'generated-artifact',
    patterns: [
      /^docs\/generated\//,
      /^docs\/lock-status\/_locks-registry\.json$/,
    ],
  },
  {
    className: 'governance',
    patterns: [
      /^AGENTS\.md$/,
      /^package\.json$/,
      /^\.agents\//,
      /^\.husky\//,
      /^scripts\/agent-preflight\.mjs$/,
      /^scripts\/agent-commit-wrapper\.mjs$/,
      /^scripts\/check-agent-commit-message\.mjs$/,
      /^scripts\/check-ai-diff-audit\.mjs$/,
      /^scripts\/check-.+\.mjs$/,
      /^scripts\/gates-.+\.mjs$/,
      /^scripts\/validate-.+\.mjs$/,
      /^scripts\/ensure-main-branch\.mjs$/,
    ],
  },
  {
    className: 'source-of-truth',
    patterns: [
      /^docs\/Umsetzungsplan\.md$/,
      /^docs\/plaene\/aktiv\//,
      /^docs\/bot-training\/Bot_Trainingsplan\.md$/,
    ],
  },
  {
    className: 'tests',
    patterns: [
      /^tests\//,
      /^playwright(?:\..+)?\.config\.(?:js|mjs|ts)$/,
    ],
  },
];

const ALLOWED_DOC_NEW_FILE_PATTERNS = [
  /^docs\/plaene\/neu\//,
  /^docs\/referenz\//,
  /^docs\/Fehlerberichte\//,
  /^docs\/generated\//,
  /^docs\/lock-status\//,
];

const PROTECTED_SURFACE_PATTERNS = [
  /^package\.json$/,
  /^\.husky\//,
  /^\.agents\//,
  /^scripts\/agent-preflight\.mjs$/,
  /^scripts\/check-agent-commit-message\.mjs$/,
  /^scripts\/check-ai-diff-audit\.mjs$/,
  /^scripts\/check-.+\.mjs$/,
  /^scripts\/gates-.+\.mjs$/,
  /^scripts\/validate-.+\.mjs$/,
];

const AUTHORITY_PATTERN = /\b(source[- ]of[- ]truth|kanonisch|canonical|dod|scope_files|lock-status|phase|entscheidung|decision class)\b/i;
const FOCUS_OR_SKIP_PATTERN = new RegExp('\\b(?:it|test|describe)\\s*\\.\\s*(?:only|skip)\\s*\\(');
const NO_VERIFY_FLAG_PATTERN = new RegExp('--' + 'no-verify\\b');
const FORCE_FLAG_PATTERN = new RegExp('--' + 'force\\b');
const MAX_WARNINGS_PATTERN = /max-warnings(?:=|\s+)(?:[1-9]\d*)\b/i;
const WEAK_EXIT_PATTERN = /\b(?:\|\|\s*true|exit\s+0|process\.exitCode\s*=\s*0)\b/;
const GATE_COMMAND_PATTERN = /\b(?:guard:main|plan:check|gates:pre-commit|scope:validate|lock:validate|check:agent-commit|agent:preflight)\b/;
const SNAPSHOT_PATTERN = /\btoMatch(?:Inline)?Snapshot\b/;
const MOCK_ONLY_PATTERN = /\b(?:mock|toHaveBeenCalled|toHaveBeenCalledTimes|callCount)\b/i;

function normalizePath(value = '') {
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
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return result.stdout;
}

export function parseStagedNameStatus(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      return {
        status: parts[0],
        file: normalizePath(parts[parts.length - 1]),
      };
    });
}

function getStagedChanges({ root = process.cwd() } = {}) {
  return parseStagedNameStatus(runGit(['diff', '--cached', '--name-status'], { root }));
}

function getStagedDiff({ root = process.cwd() } = {}) {
  return runGit(['diff', '--cached', '--no-ext-diff', '--unified=0'], { root });
}

function classifyFile(file) {
  const normalized = normalizePath(file);
  return FILE_CLASS_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(normalized)))
    .map((rule) => rule.className);
}

function parseDiffByFile(diff = '') {
  const out = new Map();
  let currentFile = null;

  function ensure(file) {
    if (!out.has(file)) {
      out.set(file, { added: [], removed: [] });
    }
    return out.get(file);
  }

  for (const line of diff.split(/\r?\n/)) {
    const diffMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffMatch) {
      currentFile = normalizePath(diffMatch[2]);
      ensure(currentFile);
      continue;
    }

    const targetMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (targetMatch) {
      currentFile = normalizePath(targetMatch[1]);
      ensure(currentFile);
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      ensure(currentFile).added.push(line.slice(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      ensure(currentFile).removed.push(line.slice(1));
    }
  }

  return out;
}

function normalizeEnvelope(envelope = {}) {
  return {
    decision: String(envelope.decision || envelope.Decision || '').trim().toUpperCase(),
    gate: String(envelope.gate || envelope.Gate || '').trim(),
    generatedBy: String(envelope.generatedBy || envelope['Generated-by'] || envelope.generated_by || '').trim(),
    canonicalSource: String(envelope.canonicalSource || envelope['Canonical-source'] || envelope.canonical_source || '').trim(),
    residualRisk: String(envelope.residualRisk || envelope['Residual-risk'] || envelope.residual_risk || '').trim(),
    notChecked: String(envelope.notChecked || envelope['Not-checked'] || envelope.not_checked || '').trim(),
  };
}

function isPresent(value) {
  return Boolean(value && value.trim());
}

function decisionAtLeast(decision, minimum) {
  return DECISION_ORDER.has(decision)
    && DECISION_ORDER.has(minimum)
    && DECISION_ORDER.get(decision) >= DECISION_ORDER.get(minimum);
}

function isAddedChange(change) {
  return /^A/.test(change.status);
}

function isAllowedDocNewFile(file) {
  return ALLOWED_DOC_NEW_FILE_PATTERNS.some((pattern) => pattern.test(file));
}

function isProtectedSurface(file) {
  return PROTECTED_SURFACE_PATTERNS.some((pattern) => pattern.test(file));
}

function isCommentOnlyLine(line) {
  const trimmed = line.trim();
  return trimmed === ''
    || trimmed.startsWith('//')
    || trimmed.startsWith('#')
    || trimmed.startsWith('*');
}

function formatFiles(files) {
  return Array.from(new Set(files)).sort((a, b) => a.localeCompare(b));
}

function hasClass(classesByFile, className) {
  return Array.from(classesByFile.values()).some((classes) => classes.includes(className));
}

function filesWithClass(classesByFile, className) {
  return formatFiles(
    Array.from(classesByFile.entries())
      .filter(([, classes]) => classes.includes(className))
      .map(([file]) => file)
  );
}

function addedTextFor(diffByFile, file) {
  return (diffByFile.get(file)?.added || []).join('\n');
}

function changedLinesFor(diffByFile, file) {
  return diffByFile.get(file) || { added: [], removed: [] };
}

function addFinding(findings, level, id, message, files = []) {
  findings.push({
    level,
    id,
    message,
    files: formatFiles(files),
  });
}

function auditGeneratedArtifacts({ findings, classesByFile, envelope }) {
  const generatedFiles = filesWithClass(classesByFile, 'generated-artifact');
  if (generatedFiles.length === 0) {
    return;
  }

  const runtimeFiles = filesWithClass(classesByFile, 'runtime-code');
  const generatorFiles = filesWithClass(classesByFile, 'generator-code');
  const testFiles = filesWithClass(classesByFile, 'tests');

  if (runtimeFiles.length > 0) {
    const hasRequiredEnvelope = decisionAtLeast(envelope.decision, 'D3')
      && isPresent(envelope.gate)
      && isPresent(envelope.generatedBy)
      && isPresent(envelope.notChecked)
      && isPresent(envelope.residualRisk);
    if (!hasRequiredEnvelope) {
      addFinding(
        findings,
        'fail',
        'generated-runtime-requires-d3-envelope',
        '`generated-artifact + runtime-code` braucht Decision>=D3, Gate, Generated-by, Residual-risk und Not-checked.',
        [...generatedFiles, ...runtimeFiles]
      );
      return;
    }
    addFinding(
      findings,
      'warn',
      'generated-runtime-governed',
      '`generated-artifact + runtime-code` ist nur mit explizitem D3/D4-Envelope erlaubt.',
      [...generatedFiles, ...runtimeFiles]
    );
    return;
  }

  if (generatorFiles.length > 0 || testFiles.length > 0) {
    if (!isPresent(envelope.generatedBy)) {
      addFinding(
        findings,
        'fail',
        'generated-artifact-missing-generated-by',
        '`generated-artifact + generator-code/tests` braucht `Generated-by:`.',
        [...generatedFiles, ...generatorFiles, ...testFiles]
      );
      return;
    }
    addFinding(
      findings,
      'info',
      'generated-artifact-with-generator',
      '`generated-artifact` ist mit Generator-/Test-Scope gekoppelt und benennt `Generated-by:`.',
      [...generatedFiles, ...generatorFiles, ...testFiles]
    );
    return;
  }

  addFinding(
    findings,
    'info',
    'generated-artifact-only',
    '`generated-artifact` ohne Runtime-/Generator-Code: bewusstes Artefakt-Signal pruefen.',
    generatedFiles
  );
}

function auditShadowTruth({ findings, changes, diffByFile, envelope }) {
  for (const change of changes) {
    const file = normalizePath(change.file);
    if (!isAddedChange(change) || !file.startsWith('docs/') || isAllowedDocNewFile(file)) {
      continue;
    }
    if (!AUTHORITY_PATTERN.test(addedTextFor(diffByFile, file))) {
      continue;
    }

    const hasAuthorityEnvelope = isPresent(envelope.canonicalSource)
      || (decisionAtLeast(envelope.decision, 'D3') && isPresent(envelope.gate));
    if (!hasAuthorityEnvelope) {
      addFinding(
        findings,
        'fail',
        'shadow-truth-requires-canonical-source',
        'Neue autoritative `docs/**`-Datei braucht `Canonical-source:` oder D3-Gate.',
        [file]
      );
    }
  }
}

function suspiciousGateBypassLines(lines) {
  return lines.filter((line) => {
    if (isCommentOnlyLine(line)) {
      return false;
    }
    return FOCUS_OR_SKIP_PATTERN.test(line)
      || NO_VERIFY_FLAG_PATTERN.test(line)
      || FORCE_FLAG_PATTERN.test(line)
      || MAX_WARNINGS_PATTERN.test(line)
      || WEAK_EXIT_PATTERN.test(line);
  });
}

function auditGateBypass({ findings, changes, diffByFile, envelope }) {
  const bypassFiles = [];
  const softenedGateFiles = [];

  for (const change of changes) {
    const file = normalizePath(change.file);
    if (!isProtectedSurface(file)) {
      continue;
    }

    const lines = changedLinesFor(diffByFile, file);
    if (suspiciousGateBypassLines(lines.added).length > 0) {
      bypassFiles.push(file);
    }

    const removedGate = lines.removed.some((line) => GATE_COMMAND_PATTERN.test(line));
    const addedGate = lines.added.some((line) => GATE_COMMAND_PATTERN.test(line));
    if (removedGate && !addedGate) {
      softenedGateFiles.push(file);
    }
  }

  const files = formatFiles([...bypassFiles, ...softenedGateFiles]);
  if (files.length === 0) {
    return;
  }

  if (!decisionAtLeast(envelope.decision, 'D3')) {
    addFinding(
      findings,
      'fail',
      'gate-bypass-requires-d3',
      'Gate-Bypass- oder Schutzflaechen-Abschwaechung braucht mindestens `Decision: D3`.',
      files
    );
    return;
  }

  addFinding(
    findings,
    'warn',
    'gate-bypass-d3-review',
    'Gate-Bypass- oder Schutzflaechen-Abschwaechung im D3-Scope manuell pruefen.',
    files
  );
}

function auditTestSignals({ findings, changes, diffByFile, classesByFile }) {
  const hardFiles = [];
  const snapshotWarnFiles = [];
  const mockWarnFiles = [];

  for (const change of changes) {
    const file = normalizePath(change.file);
    const classes = classesByFile.get(file) || [];
    const shouldScan = classes.includes('tests') || isProtectedSurface(file);
    if (!shouldScan) {
      continue;
    }

    const added = changedLinesFor(diffByFile, file).added.filter((line) => !isCommentOnlyLine(line));
    if (added.some((line) => FOCUS_OR_SKIP_PATTERN.test(line))) {
      hardFiles.push(file);
    }
    if (classes.includes('tests') && added.some((line) => SNAPSHOT_PATTERN.test(line))) {
      snapshotWarnFiles.push(file);
    }
    if (classes.includes('tests') && added.some((line) => MOCK_ONLY_PATTERN.test(line))) {
      mockWarnFiles.push(file);
    }
  }

  if (hardFiles.length > 0) {
    addFinding(
      findings,
      'fail',
      'test-focus-or-skip',
      '`test.only`/`describe.only` oder `.skip`-Spuren sind im staged Diff nicht erlaubt.',
      hardFiles
    );
  }
  if (snapshotWarnFiles.length > 0) {
    addFinding(
      findings,
      'warn',
      'snapshot-only-test-signal',
      'Snapshot-Aenderungen bleiben Review-Hinweise, keine semantische Qualitaetsaussage.',
      snapshotWarnFiles
    );
  }
  if (mockWarnFiles.length > 0) {
    addFinding(
      findings,
      'warn',
      'mock-callcount-test-signal',
      'Mock-/Callcount-Testanker bleiben Review-Hinweise.',
      mockWarnFiles
    );
  }
}

function auditEnvelope({ findings, envelope }) {
  if (decisionAtLeast(envelope.decision, 'D2') && !isPresent(envelope.notChecked)) {
    addFinding(
      findings,
      'fail',
      'missing-not-checked-d2',
      '`Decision: D2` und hoeher braucht `Not-checked:` fuer ehrliche Nicht-Pruefung.',
      []
    );
  }
}

export function auditStagedDiff({ changes = [], diff = '', envelope = {} } = {}) {
  const normalizedEnvelope = normalizeEnvelope(envelope);
  const normalizedChanges = changes.map((change) => ({
    ...change,
    file: normalizePath(change.file),
  }));
  const diffByFile = parseDiffByFile(diff);
  const files = formatFiles(normalizedChanges.map((change) => change.file));
  const classesByFile = new Map(files.map((file) => [file, classifyFile(file)]));
  const findings = [];

  auditEnvelope({ findings, envelope: normalizedEnvelope });
  auditGeneratedArtifacts({ findings, classesByFile, envelope: normalizedEnvelope });
  auditShadowTruth({ findings, changes: normalizedChanges, diffByFile, envelope: normalizedEnvelope });
  auditGateBypass({ findings, changes: normalizedChanges, diffByFile, envelope: normalizedEnvelope });
  auditTestSignals({ findings, changes: normalizedChanges, diffByFile, classesByFile });

  return {
    files,
    classifications: Object.fromEntries(classesByFile),
    hasGeneratedArtifact: hasClass(classesByFile, 'generated-artifact'),
    findings,
    violations: findings.filter((finding) => finding.level === 'fail'),
    warnings: findings.filter((finding) => finding.level === 'warn'),
    info: findings.filter((finding) => finding.level === 'info'),
  };
}

function envelopeFromArgsAndEnv(args) {
  return {
    decision: args.decision || process.env.AGENT_DECISION || '',
    gate: args.gate || process.env.AGENT_GATE || '',
    generatedBy: args['generated-by'] || process.env.AGENT_GENERATED_BY || '',
    canonicalSource: args['canonical-source'] || process.env.AGENT_CANONICAL_SOURCE || '',
    residualRisk: args['residual-risk'] || process.env.AGENT_RESIDUAL_RISK || '',
    notChecked: args['not-checked'] || process.env.AGENT_NOT_CHECKED || '',
  };
}

function printFinding(finding) {
  const files = finding.files.length > 0 ? ` files=${finding.files.join(', ')}` : '';
  const label = finding.level.toUpperCase();
  console.log(`[ai-diff-audit] ${label} ${finding.id}: ${finding.message}${files}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const changes = getStagedChanges({ root });
  const diff = getStagedDiff({ root });
  const result = auditStagedDiff({
    changes,
    diff,
    envelope: envelopeFromArgsAndEnv(args),
  });

  for (const finding of result.findings) {
    printFinding(finding);
  }

  if (changes.length === 0) {
    console.log('[ai-diff-audit] ok staged=0');
  } else if (result.violations.length === 0) {
    console.log(`[ai-diff-audit] ok staged=${changes.length} warnings=${result.warnings.length}`);
  } else {
    console.error(`[ai-diff-audit] failed violations=${result.violations.length}`);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[ai-diff-audit] failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
