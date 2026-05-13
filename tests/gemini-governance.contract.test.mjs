import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateGeminiGovernance } from '../scripts/check-gemini-governance.mjs';

async function writeFixture(root, relPath, content) {
    const target = path.join(root, relPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
}

async function createFixture() {
    return fs.mkdtemp(path.join(os.tmpdir(), 'curvios-gemini-governance-'));
}

const AGENT_WITH_PREAMBLE = `---
name: test_agent
description: Test
---

Repo-Governance zuerst:
- Lies vor Aenderungen \`AGENTS.md\`, die passende Rule unter \`.agents/rules/\` und den passenden Workflow unter \`.agents/workflows/\`.

Du bist ein Test-Agent.
`;

const PLAN_GENERATOR_WITH_GOVERNANCE = `---
description: Test
---

Erstelle eine Intake-Datei unter \`docs/plaene/neu/Feature_[Name].md\`.
Die Uebernahme bleibt User-owned.
3. **Kein Master-Update:** Aendere \`docs/Umsetzungsplan.md\` nicht.
`;

test('validateGeminiGovernance accepts current governance shape', async () => {
    const root = await createFixture();
    await writeFixture(root, '.gemini/agents/test_agent.md', AGENT_WITH_PREAMBLE);
    await writeFixture(root, '.gemini/skills/plan-generator/SKILL.md', PLAN_GENERATOR_WITH_GOVERNANCE);

    const result = await validateGeminiGovernance({ root });

    assert.equal(result.skipped, false);
    assert.equal(result.agentFileCount, 1);
    assert.deepEqual(result.violations, []);
});

test('validateGeminiGovernance flags missing preamble and obsolete references', async () => {
    const root = await createFixture();
    await writeFixture(root, '.gemini/agents/test_agent.md', [
        '---',
        'name: test_agent',
        '---',
        '',
        'Nutze Open_Findings.md und npm run test:e2e:desktop.',
    ].join('\n'));
    await writeFixture(root, '.gemini/skills/plan-generator/SKILL.md', [
        'Erstelle die Datei `docs/plaene/aktiv/VXX.md`.',
        'Füge eine neue Zeile in `docs/Umsetzungsplan.md` ein.',
        'Melde, dass der Entwurf in den Master-Index übernommen wurde.',
    ].join('\n'));

    const result = await validateGeminiGovernance({ root });
    const ids = result.violations.map((violation) => violation.id).sort();

    assert(ids.includes('missing-repo-governance-preamble'));
    assert(ids.includes('open-findings-reference'));
    assert(ids.includes('legacy-test-script'));
    assert(ids.includes('direct-active-plan-create'));
    assert(ids.includes('direct-master-update'));
    assert(ids.includes('master-claim'));
    assert(ids.includes('plan-generator-governance-missing'));
});

