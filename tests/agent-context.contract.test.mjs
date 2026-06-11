import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateAgentContext } from '../scripts/check-agent-context.mjs';

async function writeFixture(root, relPath, content) {
  const target = path.join(root, relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'curvios-agent-context-'));
  await writeFixture(root, 'AGENTS.md', [
    '# AGENTS.md',
    '',
    '## Leseweg',
    '',
    '1. `AGENTS.md`',
    '2. passende Rule in `.agents/rules/`',
    '3. passenden Workflow in `.agents/workflows/`',
    '4. `docs/Umsetzungsplan.md`',
    '5. `docs/plaene/aktiv/VXX.md`',
  ].join('\n'));
  await writeFixture(root, 'CLAUDE.md', [
    '@AGENTS.md',
    '',
    '# CLAUDE.md',
    '',
    '> Diese Datei definiert keine eigene Governance.',
    '> Verbindlich sind `AGENTS.md` und `.agents/rules`.',
  ].join('\n'));
  await writeFixture(root, '.claude/settings.json', JSON.stringify({
    permissions: {
      defaultMode: 'acceptEdits',
      allow: [
        'PowerShell(git status *)',
        'PowerShell(npm run plan:check)',
        'Bash(git status *)',
        'Bash(npm run plan:check)',
      ],
    },
  }, null, 2));
  await writeFixture(root, '.gemini/README.md', [
    '# Gemini-Konfiguration',
    '',
    'Bei Konflikt gewinnt die Repo-Governance aus `AGENTS.md` und `.agents/rules`.',
  ].join('\n'));
  await writeFixture(root, 'docs/referenz/ai_project_onboarding.md', [
    '# AI Project Onboarding (Aktiv)',
    '',
    '## 2. Canonical Quellen (zuerst lesen)',
    '',
    '1. `AGENTS.md`',
    '2. `docs/bot-training/Bot_Trainingsplan.md` nur bei Bot-Training-Scope',
    '',
    'Bei Scope-Fragen zuerst den Knowledge-Graph nutzen.',
    '',
    '## 3. Referenzquellen bei Bedarf',
    '',
    'Historische Quellen: `docs/archive/` und `docs/plaene/alt/`.',
    'Nicht als Standardkontext lesen: `tmp/`, `logs/`, `videos/`.',
    '',
    '## 4. Entscheidungs- und Gate-Regeln',
    '',
    'Vor D3-/D4-Freigaben als `no-op`, `read-only evidence`, `optional` oder `edit required` klassifizieren.',
  ].join('\n'));
  return root;
}

test('validateAgentContext accepts the intended context policy shape', async () => {
  const root = await createFixture();

  const result = await validateAgentContext({ root });

  assert.deepEqual(result.violations, []);
  assert.equal(result.checked.currentContextPresent, false);
});

test('validateAgentContext rejects plan-like CURRENT_CONTEXT content', async () => {
  const root = await createFixture();
  await writeFixture(root, 'docs/CURRENT_CONTEXT.md', [
    '# CURRENT_CONTEXT',
    '',
    'Definition of Done',
    '',
    '| V116 | active |',
  ].join('\n'));

  const result = await validateAgentContext({ root });
  const ids = result.violations.map((violation) => violation.id).sort();

  assert(ids.includes('definition-of-done'));
  assert(ids.includes('master-table-row'));
});

test('validateAgentContext requires minimal D3/D4 classification language', async () => {
  const root = await createFixture();
  await writeFixture(root, 'docs/referenz/ai_project_onboarding.md', [
    '# AI Project Onboarding (Aktiv)',
    '',
    '## 2. Canonical Quellen (zuerst lesen)',
    '`docs/bot-training/Bot_Trainingsplan.md` und Knowledge-Graph.',
    '## 3. Referenzquellen bei Bedarf',
    '`docs/archive/`, `docs/plaene/alt/`, `tmp/`, `logs/`, `videos/`.',
  ].join('\n'));

  const result = await validateAgentContext({ root });
  const ids = result.violations.map((violation) => violation.id);

  assert(ids.includes('gate-class-no-op'));
  assert(ids.includes('gate-class-edit-required'));
});

test('validateAgentContext requires Claude to import AGENTS.md', async () => {
  const root = await createFixture();
  await writeFixture(root, 'CLAUDE.md', [
    '# CLAUDE.md',
    '',
    '> Diese Datei definiert keine eigene Governance.',
    '> Verbindlich sind `AGENTS.md` und `.agents/rules`.',
  ].join('\n'));

  const result = await validateAgentContext({ root });

  assert(result.violations.some((violation) => violation.id === 'claude-agents-import'));
});

test('validateAgentContext rejects provider pins and incomplete shell coverage', async () => {
  const root = await createFixture();
  await writeFixture(root, '.claude/settings.json', JSON.stringify({
    model: 'claude-opus-4-7',
    env: {
      CLAUDE_CODE_USE_VERTEX: '1',
    },
    permissions: {
      allow: ['PowerShell(git status *)'],
    },
  }, null, 2));

  const result = await validateAgentContext({ root });
  const ids = result.violations.map((violation) => violation.id);

  assert(ids.includes('claude-settings-provider-pinned'));
  assert(ids.includes('claude-settings-shell-coverage'));
});
