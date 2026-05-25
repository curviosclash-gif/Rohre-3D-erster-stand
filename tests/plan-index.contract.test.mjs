import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { writePlanIndex } from '../scripts/build-plan-index.mjs';
import { validatePlanIndex } from '../scripts/validate-plan-index.mjs';

const MASTER_FIXTURE = `Stand: 2026-05-23. Aktiver Lock: \`-\`; Startanker: \`V1 1.99 abgeschlossen\`; naechster empfohlener P1-Schritt ist \`V2 2.1\`.

## Arbeitsstrom-Index

| Arbeitsstrom | Master-Bloecke | Hinweis |
| --- | --- | --- |
| Repo-Pflege & Governance | \`V1\`, \`V2\` | Tests |

## Aktive Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1 | Basis | done | P1 | frei | - | 1.99 | \`docs/plaene/aktiv/V1.md\` |
| V2 | Folge | planned | P2 | frei | V1.99 | 2.1 | \`docs/plaene/aktiv/V2.md\` |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V1 | 2026-05-01 | closed | Abgeschlossen |
| - | V2 | - | frei | Geplant |
`;

async function createFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'curvios-plan-index-'));
  await fs.mkdir(path.join(rootDir, 'docs/generated'), { recursive: true });
  await fs.mkdir(path.join(rootDir, 'docs/plaene/aktiv'), { recursive: true });
  await fs.writeFile(path.join(rootDir, 'docs/Umsetzungsplan.md'), MASTER_FIXTURE, 'utf8');
  await fs.writeFile(path.join(rootDir, 'docs/plaene/aktiv/V1.md'), '# V1\n', 'utf8');
  await fs.writeFile(path.join(rootDir, 'docs/plaene/aktiv/V2.md'), '# V2\n', 'utf8');
  await writePlanIndex({ rootDir });
  return rootDir;
}

async function readFixtureIndex(rootDir) {
  const indexPath = path.join(rootDir, 'docs/generated/plan-index.json');
  return JSON.parse(await fs.readFile(indexPath, 'utf8'));
}

async function writeFixtureIndex(rootDir, index) {
  const indexPath = path.join(rootDir, 'docs/generated/plan-index.json');
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

function violationTypes(violations) {
  return new Set(violations.map((violation) => violation.type));
}

test('validatePlanIndex accepts generated master mirror', async () => {
  const rootDir = await createFixture();

  const violations = await validatePlanIndex({ rootDir });

  assert.deepEqual(violations, []);
});

test('validatePlanIndex reports field drift against generator output', async () => {
  const rootDir = await createFixture();
  const index = await readFixtureIndex(rootDir);
  index.blocks[0].title = 'Drifted title';
  await writeFixtureIndex(rootDir, index);

  const violations = await validatePlanIndex({ rootDir });
  const types = violationTypes(violations);

  assert(types.has('manual-generated-edit'));
  assert(types.has('field-mismatch'));
  assert(violations.some((violation) => violation.field === 'title' && violation.id === 'V1'));
});

test('validatePlanIndex reports structural block and relation drift', async () => {
  const rootDir = await createFixture();
  const index = await readFixtureIndex(rootDir);
  const duplicate = structuredClone(index.blocks[0]);
  duplicate.lock = { ...duplicate.lock, status: 'claimed' };
  index.blocks = [
    duplicate,
    duplicate,
    {
      id: 'V999',
      title: 'Extra',
      status: 'planned',
      priority: 'P1',
      owner: 'frei',
      workstream: 'ghost-lane',
      depends_on: ['V404.99'],
      current_phase: '999.1',
      plan_file: 'docs/plaene/aktiv/V999.md',
      lock: { status: 'frei', agent: '-', start_date: '-', target: 'Geplant', source: 'test' },
    },
  ];
  index.workstreams.push({ id: 'ghost-lane', label: 'Ghost Lane', source: 'test' });
  await writeFixtureIndex(rootDir, index);

  const violations = await validatePlanIndex({ rootDir });
  const types = violationTypes(violations);

  assert(types.has('duplicate-id'));
  assert(types.has('missing-in-index'));
  assert(types.has('missing-in-master'));
  assert(types.has('unknown-workstream'));
  assert(types.has('invalid-plan-file'));
  assert(types.has('unknown-dependency'));
  assert(types.has('lock-mismatch'));
});
