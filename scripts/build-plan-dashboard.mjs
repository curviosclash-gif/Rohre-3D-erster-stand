#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const INDEX_PATH = 'docs/generated/plan-index.json';
const OUTPUT_PATH = 'docs/generated/plan-dashboard.html';

function normalizePlanPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item) || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right, 'en', { numeric: true }));
}

function createOptions(entries, selected = '') {
  const optionLines = [`<option value="${htmlEscape(selected)}">Alle</option>`];
  for (const [value, count] of entries) {
    optionLines.push(`<option value="${htmlEscape(value)}">${htmlEscape(value)} (${count})</option>`);
  }
  return optionLines.join('');
}

function createWorkstreamOptions({ workstreams, blocks }) {
  const labelById = new Map(workstreams.map((entry) => [entry.id, entry.label]));
  return createOptions(countBy(blocks, (block) => labelById.get(block.workstream) || block.workstream));
}

export function buildPlanDashboardHtml({ planIndex }) {
  if (!planIndex || !Array.isArray(planIndex.blocks) || !Array.isArray(planIndex.workstreams)) {
    throw new Error('planIndex must contain blocks and workstreams arrays.');
  }

  const blocks = planIndex.blocks;
  const statusOptions = createOptions(countBy(blocks, (block) => block.status));
  const priorityOptions = createOptions(countBy(blocks, (block) => block.priority));
  const workstreamOptions = createWorkstreamOptions({ workstreams: planIndex.workstreams, blocks });
  const data = {
    source: INDEX_PATH,
    authority: 'human-view-only',
    conflictRule: 'docs/Umsetzungsplan.md wins',
    planIndex,
  };

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Curvios Plan Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7f9;
      --panel: #ffffff;
      --ink: #17202a;
      --muted: #5f6f7d;
      --line: #d8e1e8;
      --accent: #166b63;
      --accent-soft: #e3f3f0;
      --warn: #8a4b06;
      --warn-soft: #fff0d9;
      --done: #356b2c;
      --done-soft: #e7f3e4;
      font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
    }

    header {
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    main,
    .header-inner {
      width: min(1320px, calc(100% - 32px));
      margin: 0 auto;
    }

    .header-inner {
      display: grid;
      gap: 12px;
      padding: 22px 0 18px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f9fbfc;
      color: var(--ink);
      white-space: nowrap;
    }

    .badge.read-only {
      border-color: #b4d9d2;
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 650;
    }

    .toolbar {
      display: grid;
      grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
      gap: 10px;
      align-items: end;
      padding: 18px 0 16px;
    }

    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
      text-transform: uppercase;
    }

    select,
    button {
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      color: var(--ink);
      font: inherit;
    }

    select {
      width: 100%;
      padding: 0 10px;
    }

    button {
      padding: 0 14px;
      cursor: pointer;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .metric {
      min-height: 80px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .metric strong {
      display: block;
      font-size: 26px;
      line-height: 1.1;
      letter-spacing: 0;
    }

    .metric span {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    table {
      width: 100%;
      min-width: 1080px;
      border-collapse: collapse;
      font-size: 14px;
    }

    th,
    td {
      padding: 11px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #edf3f6;
      color: #34424d;
      font-size: 12px;
      text-transform: uppercase;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    a {
      color: #0f5f8f;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      margin: 0 4px 4px 0;
      padding: 3px 8px;
      border-radius: 999px;
      background: #eef2f5;
      color: #34424d;
      font-size: 12px;
      white-space: nowrap;
    }

    .pill.done {
      background: var(--done-soft);
      color: var(--done);
    }

    .pill.planned,
    .pill.open {
      background: var(--warn-soft);
      color: var(--warn);
    }

    .empty {
      padding: 26px;
      color: var(--muted);
      text-align: center;
    }

    @media (max-width: 760px) {
      main,
      .header-inner {
        width: min(100% - 20px, 1320px);
      }

      .toolbar,
      .summary {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <h1>Curvios Plan Dashboard</h1>
      <div class="meta">
        <span class="badge read-only">Generierte Menschenansicht</span>
        <span class="badge">Quelle: ${htmlEscape(INDEX_PATH)}</span>
        <span class="badge">Stand: ${htmlEscape(planIndex.updated || 'unbekannt')}</span>
        <span class="badge">Konfliktregel: docs/Umsetzungsplan.md gewinnt</span>
      </div>
    </div>
  </header>

  <main>
    <section class="toolbar" aria-label="Planfilter">
      <label>Status
        <select id="statusFilter" data-filter="status">${statusOptions}</select>
      </label>
      <label>Prioritaet
        <select id="priorityFilter" data-filter="priority">${priorityOptions}</select>
      </label>
      <label>Arbeitsstrom
        <select id="workstreamFilter" data-filter="workstreamLabel">${workstreamOptions}</select>
      </label>
      <button type="button" id="resetFilters">Zuruecksetzen</button>
    </section>

    <section class="summary" aria-label="Planzusammenfassung">
      <div class="metric"><strong id="visibleCount">0</strong><span>Sichtbare Bloecke</span></div>
      <div class="metric"><strong id="plannedCount">0</strong><span>Geplant/offen</span></div>
      <div class="metric"><strong id="doneCount">0</strong><span>Abgeschlossen</span></div>
      <div class="metric"><strong id="lockedCount">0</strong><span>Nicht frei</span></div>
    </section>

    <section class="table-wrap" aria-label="Planbloecke">
      <table>
        <thead>
          <tr>
            <th>Block</th>
            <th>Titel</th>
            <th>Status</th>
            <th>Prio</th>
            <th>Arbeitsstrom</th>
            <th>Phase</th>
            <th>Lock</th>
            <th>Dependencies</th>
          </tr>
        </thead>
        <tbody id="blockRows"></tbody>
      </table>
      <div id="emptyState" class="empty" hidden>Keine Bloecke fuer diese Filter.</div>
    </section>
  </main>

  <script type="application/json" id="plan-index-data">${jsonForScript(data)}</script>
  <script>
    const payload = JSON.parse(document.getElementById('plan-index-data').textContent);
    const planIndex = payload.planIndex;
    const workstreamLabels = new Map(planIndex.workstreams.map((entry) => [entry.id, entry.label]));
    const rows = document.getElementById('blockRows');
    const emptyState = document.getElementById('emptyState');
    const filters = [...document.querySelectorAll('[data-filter]')];
    const resetButton = document.getElementById('resetFilters');
    const metrics = {
      visible: document.getElementById('visibleCount'),
      planned: document.getElementById('plannedCount'),
      done: document.getElementById('doneCount'),
      locked: document.getElementById('lockedCount'),
    };

    function text(value) {
      return value == null || value === '' ? '-' : String(value);
    }

    function relativePlanHref(planFile) {
      return '../' + text(planFile).replace(/^docs\\//, '');
    }

    function createPill(value, className) {
      const span = document.createElement('span');
      span.className = 'pill ' + (className || '');
      span.textContent = text(value);
      return span;
    }

    function dependencyCell(block) {
      const fragment = document.createDocumentFragment();
      if (!block.depends_on || block.depends_on.length === 0) {
        fragment.append(createPill('-', ''));
        return fragment;
      }
      for (const dependency of block.depends_on) {
        const blockId = String(dependency).match(/V\\d+/)?.[0] || dependency;
        const link = document.createElement('a');
        link.href = '#block-' + blockId;
        link.className = 'pill';
        link.textContent = dependency;
        fragment.append(link);
      }
      return fragment;
    }

    function render() {
      const activeFilters = Object.fromEntries(filters.map((filter) => [filter.dataset.filter, filter.value]));
      const blocks = planIndex.blocks
        .map((block) => ({
          ...block,
          workstreamLabel: workstreamLabels.get(block.workstream) || block.workstream,
          lockLabel: [block.lock?.status, block.lock?.agent].filter(Boolean).join(' / ') || '-',
        }))
        .filter((block) => Object.entries(activeFilters).every(([field, value]) => !value || block[field] === value));

      rows.replaceChildren();
      for (const block of blocks) {
        const row = document.createElement('tr');
        row.id = 'block-' + block.id;

        const idCell = document.createElement('td');
        const link = document.createElement('a');
        link.href = relativePlanHref(block.plan_file);
        link.textContent = block.id;
        idCell.append(link);

        const titleCell = document.createElement('td');
        titleCell.textContent = text(block.title);

        const statusCell = document.createElement('td');
        statusCell.append(createPill(block.status, block.status));

        const priorityCell = document.createElement('td');
        priorityCell.textContent = text(block.priority);

        const workstreamCell = document.createElement('td');
        workstreamCell.textContent = text(block.workstreamLabel);

        const phaseCell = document.createElement('td');
        phaseCell.textContent = text(block.current_phase);

        const lockCell = document.createElement('td');
        lockCell.textContent = text(block.lockLabel);

        const dependencyTargetCell = document.createElement('td');
        dependencyTargetCell.append(dependencyCell(block));

        row.append(idCell, titleCell, statusCell, priorityCell, workstreamCell, phaseCell, lockCell, dependencyTargetCell);
        rows.append(row);
      }

      const planned = blocks.filter((block) => block.status !== 'done').length;
      const done = blocks.filter((block) => block.status === 'done').length;
      const locked = blocks.filter((block) => block.lock?.status && block.lock.status !== 'frei' && block.lock.status !== 'closed').length;
      metrics.visible.textContent = String(blocks.length);
      metrics.planned.textContent = String(planned);
      metrics.done.textContent = String(done);
      metrics.locked.textContent = String(locked);
      emptyState.hidden = blocks.length > 0;
    }

    filters.forEach((filter) => filter.addEventListener('change', render));
    resetButton.addEventListener('click', () => {
      filters.forEach((filter) => {
        filter.value = '';
      });
      render();
    });
    render();
  </script>
</body>
</html>
`;
}

export async function writePlanDashboard({
  rootDir = ROOT,
  indexPath = INDEX_PATH,
  outputPath = OUTPUT_PATH,
} = {}) {
  const absoluteIndexPath = path.resolve(rootDir, indexPath);
  const absoluteOutputPath = path.resolve(rootDir, outputPath);
  const planIndex = JSON.parse(await fs.readFile(absoluteIndexPath, 'utf8'));
  const html = buildPlanDashboardHtml({ planIndex });
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(absoluteOutputPath, html, 'utf8');
  return { planIndex, outputPath };
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const outputPath = outputArg ? normalizePlanPath(outputArg.slice('--output='.length)) : OUTPUT_PATH;
  const result = await writePlanDashboard({ outputPath });
  process.stdout.write(`[plan-dashboard] wrote ${outputPath} (${result.planIndex.blocks.length} blocks)\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[plan-dashboard] ${error.message}`);
    process.exitCode = 1;
  });
}
