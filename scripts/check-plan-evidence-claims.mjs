#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const ACTIVE_PLAN_ROOT = 'docs/plaene/aktiv';

export const CLAIM_PATTERNS = [
  {
    id: 'workflow-brace-glob',
    pattern: /\.agents[\\/]+workflows[\\/]+\{[^}]+\}\.md/i,
    message: 'Workflow-Glob-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
  {
    id: 'rules-brace-glob',
    pattern: /\.agents[\\/]+rules[\\/]+\{[^}]+\}\.md/i,
    message: 'Rule-Glob-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
  {
    id: 'docs-brace-glob',
    pattern: /docs[\\/]+[^`\s]*\{[^}]+\}[^`\s]*/i,
    message: 'Docs-Glob-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
  {
    id: 'all-workflows-claim',
    pattern: /\b(?:alle|all|core)\s+Workflows\b/i,
    message: '"Alle/core Workflows"-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
  {
    id: 'all-rules-claim',
    pattern: /\b(?:alle|all|core)\s+Rules\b|\balle\s+Regeln\b/i,
    message: '"Alle/core Rules/Regeln"-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
  {
    id: 'all-scope-files-claim',
    pattern: /\b(?:alle|all)\s+scope_files\b|\bscope_files\s+(?:sind\s+)?(?:alle|vollstaendig|konsistent)\b/i,
    message: '"Alle/vollstaendige scope_files"-Claims brauchen eine registrierte File-by-File-Assertion.',
  },
  {
    id: 'repo-wide-consistency-claim',
    pattern: /\b(repo-weit|repo-wide)\b.{0,80}\b(konsistent|consistent|abgeglichen|synchron|sync)\b/i,
    message: 'Repo-weite Konsistenzclaims brauchen konkrete Gate-Evidence oder eine registrierte Assertion.',
  },
];

export const ASSERTIONS = [
  {
    id: 'V117.workflow-decision-markers',
    claim: 'V117 claims all core workflows reference the AI decision framework.',
    evidenceFiles: ['docs/plaene/aktiv/V117.md'],
    coversClaimPatterns: ['workflow-brace-glob', 'all-workflows-claim'],
    files: [
      '.agents/workflows/plan.md',
      '.agents/workflows/code.md',
      '.agents/workflows/quick.md',
      '.agents/workflows/bugfix.md',
      '.agents/workflows/cleanup.md',
    ],
    mustContainAny: [
      /\bDecision-Klasse\b/i,
      /\bD3\b/,
      /\bD4\b/,
      /\bUser-Gate\b/i,
      /\bZweckklasse\b/i,
    ],
  },
  {
    id: 'V117.cleanup-gate-specificity',
    claim: 'V117 treats cleanup as D3/D4-near and user-gated.',
    files: ['.agents/workflows/cleanup.md'],
    mustContainAll: [
      /\bDecision-Klasse\b/i,
      /\bD3\/D4\b|\bD3\b[\s\S]*\bD4\b|\bD4\b[\s\S]*\bD3\b/,
      /\bUser-Gate\b/i,
      /\bZweckklasse\b/i,
    ],
  },
];

export const ARCHITECTURE_RELEVANT_SCOPE_PATTERNS = [
  /^src\//i,
  /^electron\//i,
  /^server\//i,
  /^src\/shared\/contracts\//i,
  /^src\/application\//i,
  /^src\/platform\//i,
];

const ARCHITECTURE_ACCEPTANCE_SECTION = /^##\s+Architecture Acceptance\b/im;
const ARCHITECTURE_CLAIM_PATTERN = /\b(Architecture Acceptance|Architecture|Architektur|Boundary|Boundaries|Legacy-Surface|Runtime-Surface|Application-Kante|Application-Kanten|Ratchet|Architektur-Gate)\b/i;
const ARCHITECTURE_EVIDENCE_PATTERN = /\b(check:architecture(?::[\w-]+)?|architecture:guard|architecture:report|typecheck:architecture|check:runtime:determinism|check:root:runtime|metrics|ratchet|boundaries|touched-strict|test:contract|node --test|contract\.test)\b/i;
const OPEN_TOP_LEVEL_DOD_PATTERN = /^\s*-\s*\[\s\]\s*DoD\.\d+\b/i;
const OPEN_FINAL_GATE_PATTERN = /^\s*-\s*\[\s\]\s*(?:V?\d+[A-Z]?)\.99(?:\.\d+)?\b/i;
const COMPLETED_ITEM_PATTERN = /^\s*-\s*\[x\]\s*(.+)$/i;
const WEAK_EVIDENCE_PATTERNS = [
  {
    id: 'verified-only',
    pattern: /\bevidence:\s*`?verified`?\s*(?:[).;]|$)/i,
  },
  {
    id: 'generic-test-pass',
    pattern: /\bevidence:\s*`?test`?\s*->\s*pass\b/i,
  },
  {
    id: 'generic-lint-pass',
    pattern: /\bevidence:\s*`?lint`?\s*->\s*pass\b/i,
  },
  {
    id: 'mandatory-checks-pass',
    pattern: /\ball mandatory checks PASS\b/i,
  },
];

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

async function readText(root, relPath) {
  return fs.readFile(path.join(root, relPath), 'utf8');
}

function formatPatterns(patterns) {
  return patterns.map((pattern) => pattern.toString()).join(', ');
}

async function listActivePlanFiles(root) {
  const planRoot = path.join(root, ACTIVE_PLAN_ROOT);
  let entries = [];
  try {
    entries = await fs.readdir(planRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => normalizePath(path.join(ACTIVE_PLAN_ROOT, entry.name)));
}

function findLineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return {};
  }

  const data = {};
  let currentKey = null;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '---') {
      break;
    }

    const keyValue = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyValue) {
      const [, key, rawValue] = keyValue;
      currentKey = key;
      if (rawValue === '') {
        data[key] = [];
      } else if (rawValue.trim() === '[]') {
        data[key] = [];
        currentKey = null;
      } else {
        data[key] = rawValue.trim();
        currentKey = null;
      }
      continue;
    }

    const listItem = line.match(/^\s*-\s*(.+)\s*$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(listItem[1].trim());
    }
  }

  return data;
}

function isArchitectureRelevantPlan(text) {
  const frontmatter = parseFrontmatter(text);
  if (frontmatter.status === 'done') return false;

  const scopeFiles = Array.isArray(frontmatter.scope_files) ? frontmatter.scope_files : [];
  return scopeFiles
    .map(normalizePath)
    .some((scopeFile) => ARCHITECTURE_RELEVANT_SCOPE_PATTERNS.some((pattern) => pattern.test(scopeFile)));
}

function normalizeFrontmatterValue(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

async function validateArchitectureAcceptanceCoverage(root, activePlanFiles) {
  const warnings = [];

  for (const planFile of activePlanFiles) {
    let text = '';
    try {
      text = await readText(root, planFile);
    } catch {
      continue;
    }

    if (!isArchitectureRelevantPlan(text)) continue;
    if (ARCHITECTURE_ACCEPTANCE_SECTION.test(text)) continue;

    warnings.push({
      id: 'architecture-acceptance.missing',
      file: normalizePath(planFile),
      line: 1,
      message: 'Aktiver Code-/Runtime-Plan ohne `## Architecture Acceptance`; bei naechster Planpflege Zielpfade, verbotene Surfaces, Guard und Ratchet-Auswirkung ergaenzen.',
    });
  }

  return warnings;
}

async function validateArchitectureClosureEvidence(root, activePlanFiles) {
  const warnings = [];

  for (const planFile of activePlanFiles) {
    let text = '';
    try {
      text = await readText(root, planFile);
    } catch {
      continue;
    }

    if (!isArchitectureRelevantPlan(text)) continue;

    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(COMPLETED_ITEM_PATTERN);
      if (!match) continue;

      const itemText = match[1];
      if (!ARCHITECTURE_CLAIM_PATTERN.test(itemText)) continue;
      if (ARCHITECTURE_EVIDENCE_PATTERN.test(itemText)) continue;

      warnings.push({
        id: 'architecture-claim.weak-evidence',
        file: normalizePath(planFile),
        line: index + 1,
        message: 'Architektur-Abschlussclaim ohne konkrete Guard-, Metrics-, Ratchet- oder Contract-Evidence.',
      });
    }
  }

  return warnings;
}

async function validateClosureEvidenceFindings(root, activePlanFiles) {
  const warnings = [];

  for (const planFile of activePlanFiles) {
    let text = '';
    try {
      text = await readText(root, planFile);
    } catch {
      continue;
    }

    const frontmatter = parseFrontmatter(text);
    const status = normalizeFrontmatterValue(frontmatter.status);
    const isDonePlan = status.toLowerCase() === 'done';
    const lines = text.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (isDonePlan && OPEN_TOP_LEVEL_DOD_PATTERN.test(line)) {
        warnings.push({
          id: 'closure.open-top-level-dod',
          file: normalizePath(planFile),
          line: index + 1,
          message: '`status: done` mit offenem Top-Level-DoD; Abschlussclaim braucht Nachbeleg oder dokumentierten Restwiderspruch.',
        });
      }

      if (isDonePlan && OPEN_FINAL_GATE_PATTERN.test(line)) {
        warnings.push({
          id: 'closure.open-final-gate',
          file: normalizePath(planFile),
          line: index + 1,
          message: '`status: done` mit offenem `*.99`-Gate; Abschlussclaim braucht Nachbeleg oder dokumentierten Restwiderspruch.',
        });
      }

      const completedMatch = line.match(COMPLETED_ITEM_PATTERN);
      if (!completedMatch || !/\bevidence\s*:/i.test(line)) {
        continue;
      }

      const weakPattern = WEAK_EVIDENCE_PATTERNS.find((entry) => entry.pattern.test(line));
      if (!weakPattern) {
        continue;
      }

      warnings.push({
        id: 'closure.weak-evidence',
        file: normalizePath(planFile),
        line: index + 1,
        message: `Abschluss-Evidence nutzt schwaches Muster \`${weakPattern.id}\`; konkrete Commands, Commits, Testreports oder Plan-/Changelog-Belege bevorzugen.`,
      });
    }
  }

  return warnings;
}

function assertionCoversClaim(assertion, planFile, patternId) {
  return assertion.evidenceFiles?.map(normalizePath).includes(normalizePath(planFile))
    && assertion.coversClaimPatterns?.includes(patternId);
}

async function validatePlanClaimCoverage(root, assertions, activePlanFiles) {
  const violations = [];

  for (const planFile of activePlanFiles) {
    let text = '';
    try {
      text = await readText(root, planFile);
    } catch {
      continue;
    }

    for (const claimPattern of CLAIM_PATTERNS) {
      const match = claimPattern.pattern.exec(text);
      if (!match) {
        continue;
      }

      const covered = assertions.some((assertion) => (
        assertionCoversClaim(assertion, planFile, claimPattern.id)
      ));

      if (!covered) {
        violations.push({
          id: `claim-coverage.${claimPattern.id}`,
          file: normalizePath(planFile),
          line: findLineNumber(text, match.index),
          message: claimPattern.message,
        });
      }
    }
  }

  return violations;
}

export async function runPlanEvidenceClaimCheck({
  root = ROOT,
  assertions = ASSERTIONS,
  activePlanFiles = null,
} = {}) {
  const violations = [];
  const warnings = [];

  for (const assertion of assertions) {
    for (const relPath of assertion.files) {
      let text = '';
      try {
        text = await readText(root, relPath);
      } catch (error) {
        violations.push({
          id: assertion.id,
          file: normalizePath(relPath),
          message: `Claim-Datei nicht lesbar: ${error?.message || error}`,
        });
        continue;
      }

      if (assertion.mustContainAny?.length
        && !assertion.mustContainAny.some((pattern) => pattern.test(text))) {
        violations.push({
          id: assertion.id,
          file: normalizePath(relPath),
          message: `${assertion.claim} Erwartet mindestens einen Marker: ${formatPatterns(assertion.mustContainAny)}`,
        });
      }

      if (assertion.mustContainAll?.length) {
        for (const pattern of assertion.mustContainAll) {
          if (!pattern.test(text)) {
            violations.push({
              id: assertion.id,
              file: normalizePath(relPath),
              message: `${assertion.claim} Fehlender Marker: ${pattern.toString()}`,
            });
          }
        }
      }
    }
  }

  const planFiles = activePlanFiles ?? await listActivePlanFiles(root);
  violations.push(...await validatePlanClaimCoverage(root, assertions, planFiles));
  warnings.push(...await validateArchitectureAcceptanceCoverage(root, planFiles));
  warnings.push(...await validateArchitectureClosureEvidence(root, planFiles));
  warnings.push(...await validateClosureEvidenceFindings(root, planFiles));

  return { assertions: assertions.length, activePlanFiles: planFiles.length, warnings, violations };
}

async function main() {
  const report = await runPlanEvidenceClaimCheck();
  for (const warning of report.warnings) {
    const location = warning.line ? `${warning.file}:${warning.line}` : warning.file;
    console.log(`- ${location} [${warning.id}] ${warning.message}`);
  }

  if (report.violations.length === 0) {
    console.log(`[plan-evidence-claims] passed assertions=${report.assertions} activePlans=${report.activePlanFiles} warnings=${report.warnings.length}`);
    return;
  }

  console.error(`[plan-evidence-claims] failed assertions=${report.assertions} activePlans=${report.activePlanFiles} warnings=${report.warnings.length} violations=${report.violations.length}`);
  for (const violation of report.violations) {
    const location = violation.line ? `${violation.file}:${violation.line}` : violation.file;
    console.error(`- ${location} [${violation.id}] ${violation.message}`);
  }
  process.exit(1);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  await main();
}
