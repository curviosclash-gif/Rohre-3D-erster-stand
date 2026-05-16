#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_FILES = {
  agents: 'AGENTS.md',
  claude: 'CLAUDE.md',
  gemini: '.gemini/README.md',
  onboarding: 'docs/referenz/ai_project_onboarding.md',
  currentContext: 'docs/CURRENT_CONTEXT.md',
};

const ONBOARDING_SNIPPETS = [
  ['canonical-sources', 'Canonical Quellen'],
  ['bot-training-special-path', 'docs/bot-training/Bot_Trainingsplan.md'],
  ['archive-read-rule', 'docs/archive/'],
  ['old-plan-read-rule', 'docs/plaene/alt/'],
  ['tmp-non-standard-context', 'tmp/'],
  ['logs-non-standard-context', 'logs/'],
  ['videos-protected-path', 'videos/'],
  ['graph-first', 'Knowledge-Graph'],
  ['gate-class-no-op', 'no-op'],
  ['gate-class-read-only', 'read-only evidence'],
  ['gate-class-optional', 'optional'],
  ['gate-class-edit-required', 'edit required'],
];

const FORBIDDEN_CURRENT_CONTEXT_PATTERNS = [
  ['frontmatter', /^---\s*$/m, 'CURRENT_CONTEXT.md darf kein eigener Plan mit Frontmatter werden.'],
  ['scope-files', /^scope_files:/m, 'CURRENT_CONTEXT.md darf keine scope_files fuehren.'],
  ['depends-on', /^depends_on:/m, 'CURRENT_CONTEXT.md darf keine Dependencies steuern.'],
  ['definition-of-done', /Definition of Done/i, 'CURRENT_CONTEXT.md darf keine DoD duplizieren.'],
  ['phase-heading', /^###\s+\d+\.\d/m, 'CURRENT_CONTEXT.md darf keine Phasenliste duplizieren.'],
  ['master-table-row', /^\|\s*V\d+\s*\|/m, 'CURRENT_CONTEXT.md darf die Master-Tabelle nicht duplizieren.'],
];

const FORBIDDEN_REPO_ARTIFACTS = [
  '.gemini/tmp',
  '.gemini/antigravity',
  '.gemini/memory',
];

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

async function exists(root, relPath) {
  try {
    await fs.access(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function readUtf8(root, relPath) {
  return fs.readFile(path.join(root, relPath), 'utf8');
}

function addViolation(violations, file, id, message, line = 1) {
  violations.push({ file, line, id, message });
}

function lineOf(text, pattern) {
  const match = pattern.exec(text);
  if (!match) {
    return 1;
  }
  return text.slice(0, match.index).split(/\r?\n/).length;
}

function firstOrderedItem(text, heading) {
  const lines = text.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) {
    return '';
  }
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (/^\d+\.\s+/.test(line)) {
      return line;
    }
    if (line.startsWith('## ') && index > headingIndex + 1) {
      break;
    }
  }
  return '';
}

function validateAgentsFile(text, violations) {
  const firstRead = firstOrderedItem(text, '## Leseweg');
  if (!firstRead.includes('AGENTS.md')) {
    addViolation(
      violations,
      REQUIRED_FILES.agents,
      'agents-not-first-read',
      'AGENTS.md muss im Leseweg der erste Einstieg sein.'
    );
  }

  const required = [
    ['rules-read-path', '.agents/rules/'],
    ['workflows-read-path', '.agents/workflows/'],
    ['master-index-read-path', 'docs/Umsetzungsplan.md'],
    ['active-plan-read-path', 'docs/plaene/aktiv/VXX.md'],
  ];
  for (const [id, snippet] of required) {
    if (!text.includes(snippet)) {
      addViolation(violations, REQUIRED_FILES.agents, id, `AGENTS.md muss ${snippet} als kanonischen Leseweg nennen.`);
    }
  }
}

function validateClaudeAdapter(text, violations) {
  const required = [
    ['claude-no-own-governance', 'keine eigene Governance'],
    ['claude-agents-reference', 'AGENTS.md'],
    ['claude-rules-reference', '.agents/rules'],
  ];
  for (const [id, snippet] of required) {
    if (!text.includes(snippet)) {
      addViolation(violations, REQUIRED_FILES.claude, id, `CLAUDE.md muss als Adapter ${snippet} nennen.`);
    }
  }
}

function validateGeminiAdapter(text, violations) {
  const required = [
    ['gemini-conflict-priority', 'Bei Konflikt gewinnt'],
    ['gemini-agents-reference', 'AGENTS.md'],
    ['gemini-rules-reference', '.agents/rules'],
  ];
  for (const [id, snippet] of required) {
    if (!text.includes(snippet)) {
      addViolation(violations, REQUIRED_FILES.gemini, id, `.gemini/README.md muss als Adapter ${snippet} nennen.`);
    }
  }
}

function validateOnboarding(text, violations) {
  for (const [id, snippet] of ONBOARDING_SNIPPETS) {
    if (!text.includes(snippet)) {
      addViolation(
        violations,
        REQUIRED_FILES.onboarding,
        id,
        `Onboarding muss den Agenten-Kontext-Baustein ${snippet} nennen.`
      );
    }
  }
}

function validateCurrentContext(text, violations) {
  const lines = text.split(/\r?\n/);
  if (lines.length > 80) {
    addViolation(
      violations,
      REQUIRED_FILES.currentContext,
      'current-context-too-long',
      'CURRENT_CONTEXT.md muss ein kurzer Lagezettel bleiben (maximal 80 Zeilen).',
      81
    );
  }

  for (const [id, pattern, message] of FORBIDDEN_CURRENT_CONTEXT_PATTERNS) {
    if (pattern.test(text)) {
      addViolation(violations, REQUIRED_FILES.currentContext, id, message, lineOf(text, pattern));
    }
  }
}

async function listMarkdownAndLogFiles(root, relDir) {
  const fullDir = path.join(root, relDir);
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(fullDir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const relPath = normalizePath(path.join(relDir, entry.name));
    if (entry.isDirectory()) {
      out.push(...await listMarkdownAndLogFiles(root, relPath));
    } else if (entry.isFile() && /\.(log|tmp|bak)$/i.test(entry.name)) {
      out.push(relPath);
    }
  }
  return out;
}

async function validateForbiddenArtifacts(root, violations) {
  for (const relPath of FORBIDDEN_REPO_ARTIFACTS) {
    if (await exists(root, relPath)) {
      addViolation(
        violations,
        relPath,
        'forbidden-agent-artifact-dir',
        `${relPath} ist kein repo-lokaler Agenten-Kontext und darf nicht committed werden.`
      );
    }
  }

  for (const relPath of await listMarkdownAndLogFiles(root, '.gemini')) {
    if (/\.(log|tmp|bak)$/i.test(relPath)) {
      addViolation(
        violations,
        relPath,
        'forbidden-agent-artifact-file',
        `${relPath} sieht nach lokalem Memory-/Log-Artefakt aus.`
      );
    }
  }
}

export async function validateAgentContext({ root = process.cwd() } = {}) {
  const violations = [];

  for (const relPath of [REQUIRED_FILES.agents, REQUIRED_FILES.onboarding]) {
    if (!await exists(root, relPath)) {
      addViolation(violations, relPath, 'required-file-missing', `${relPath} fehlt.`);
    }
  }

  if (await exists(root, REQUIRED_FILES.agents)) {
    validateAgentsFile(await readUtf8(root, REQUIRED_FILES.agents), violations);
  }
  if (await exists(root, REQUIRED_FILES.claude)) {
    validateClaudeAdapter(await readUtf8(root, REQUIRED_FILES.claude), violations);
  }
  if (await exists(root, REQUIRED_FILES.gemini)) {
    validateGeminiAdapter(await readUtf8(root, REQUIRED_FILES.gemini), violations);
  }
  if (await exists(root, REQUIRED_FILES.onboarding)) {
    validateOnboarding(await readUtf8(root, REQUIRED_FILES.onboarding), violations);
  }
  if (await exists(root, REQUIRED_FILES.currentContext)) {
    validateCurrentContext(await readUtf8(root, REQUIRED_FILES.currentContext), violations);
  }

  await validateForbiddenArtifacts(root, violations);

  return {
    violations,
    checked: {
      currentContextPresent: await exists(root, REQUIRED_FILES.currentContext),
    },
  };
}

async function main() {
  const result = await validateAgentContext();
  if (result.violations.length > 0) {
    console.error(`[agent-context] ${result.violations.length} violation(s)`);
    for (const violation of result.violations) {
      console.error(`- ${violation.file}:${violation.line} [${violation.id}] ${violation.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const currentContext = result.checked.currentContextPresent ? 'present' : 'absent';
  console.log(`[agent-context] ok currentContext=${currentContext}`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[agent-context] failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
