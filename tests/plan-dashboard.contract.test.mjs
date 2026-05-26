import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildPlanDashboardHtml,
  writePlanDashboard,
} from '../scripts/build-plan-dashboard.mjs';

const PLAN_INDEX_FIXTURE = {
  schema_version: 1,
  updated: '2026-05-26',
  start_anchor: {
    block: 'V1',
    phase: '1.99',
    source: 'docs/Umsetzungsplan.md',
  },
  next_recommended_start: {
    block: 'V2',
    phase: '2.1',
    source: 'docs/Umsetzungsplan.md',
    authority: 'recommendation',
  },
  sources: {
    master: 'docs/Umsetzungsplan.md',
    generator: 'scripts/build-plan-index.mjs',
  },
  workstreams: [
    {
      id: 'repo-governance',
      label: 'Repo-Pflege & Governance',
      source: 'docs/Umsetzungsplan.md#arbeitsstrom-index',
    },
  ],
  blocks: [
    {
      id: 'V1',
      title: 'Basis',
      status: 'done',
      priority: 'P1',
      owner: 'frei',
      workstream: 'repo-governance',
      depends_on: [],
      current_phase: '1.99',
      plan_file: 'docs/plaene/aktiv/V1.md',
      lock: {
        status: 'closed',
        agent: '-',
        start_date: '2026-05-01',
        target: 'Abgeschlossen',
        source: 'docs/Umsetzungsplan.md#lock-status',
      },
    },
    {
      id: 'V2',
      title: 'Folge',
      status: 'planned',
      priority: 'P2',
      owner: 'frei',
      workstream: 'repo-governance',
      depends_on: ['V1.99'],
      current_phase: '2.1',
      plan_file: 'docs/plaene/aktiv/V2.md',
      lock: {
        status: 'frei',
        agent: '-',
        start_date: '-',
        target: 'Geplant',
        source: 'docs/Umsetzungsplan.md#lock-status',
      },
    },
  ],
};

test('plan dashboard is a generated read-only human view of the plan index', () => {
  const html = buildPlanDashboardHtml({ planIndex: PLAN_INDEX_FIXTURE });

  assert.match(html, /Curvios Plan Dashboard/);
  assert.match(html, /Generierte Menschenansicht/);
  assert.match(html, /Quelle: docs\/generated\/plan-index\.json/);
  assert.match(html, /Konfliktregel: docs\/Umsetzungsplan\.md gewinnt/);
  assert.match(html, /id="statusFilter"/);
  assert.match(html, /id="priorityFilter"/);
  assert.match(html, /id="workstreamFilter"/);
  assert.match(html, /href = relativePlanHref\(block\.plan_file\)/);
  assert.match(html, /dependencyCell\(block\)/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /contenteditable/i);
  assert.doesNotMatch(html, /\bfetch\s*\(/i);
  assert.doesNotMatch(html, /\blocalStorage\b/i);
});

test('writePlanDashboard writes a deterministic dashboard file from an existing index', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'curvios-plan-dashboard-'));
  await fs.mkdir(path.join(rootDir, 'docs/generated'), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, 'docs/generated/plan-index.json'),
    `${JSON.stringify(PLAN_INDEX_FIXTURE, null, 2)}\n`,
    'utf8',
  );

  await writePlanDashboard({ rootDir });
  const first = await fs.readFile(path.join(rootDir, 'docs/generated/plan-dashboard.html'), 'utf8');
  await writePlanDashboard({ rootDir });
  const second = await fs.readFile(path.join(rootDir, 'docs/generated/plan-dashboard.html'), 'utf8');

  assert.equal(first, second);
  assert.match(first, /"authority":"human-view-only"/);
  assert.match(first, /"conflictRule":"docs\/Umsetzungsplan\.md wins"/);
});
