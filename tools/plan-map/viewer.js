const DEFAULT_DATA_URLS = [
  '../../tmp/plan-map/plan-map.json',
  './plan-map.json',
  './plan-map.generated.json',
];

const state = {
  data: null,
  view: 'map',
  selectedId: null,
  search: '',
  status: 'all',
  priority: 'all',
};

const elements = {
  sourceMeta: document.querySelector('#sourceMeta'),
  fileInput: document.querySelector('#fileInput'),
  searchInput: document.querySelector('#searchInput'),
  statusFilter: document.querySelector('#statusFilter'),
  priorityFilter: document.querySelector('#priorityFilter'),
  blockList: document.querySelector('#blockList'),
  metrics: document.querySelector('#metrics'),
  planSvg: document.querySelector('#planSvg'),
  detailPanel: document.querySelector('#detailPanel'),
  collisionsTable: document.querySelector('#collisionsTable'),
  healthPanel: document.querySelector('#healthPanel'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function blockSortValue(block) {
  const order = state.data?.recommendedOrder?.find((entry) => entry.blockId === block.id);
  if (order) {
    return order.rank;
  }
  const numeric = Number(String(block.id).replace(/^[A-Z]+/, ''));
  return Number.isFinite(numeric) ? 1000 + numeric : 9999;
}

function blockMatchesFilters(block) {
  const haystack = [
    block.id,
    block.title,
    block.affectedArea,
    block.currentPhase,
    block.scopeFiles?.join(' '),
  ].join(' ').toLowerCase();

  if (state.search && !haystack.includes(state.search.toLowerCase())) {
    return false;
  }

  if (state.status !== 'all' && block.status !== state.status) {
    return false;
  }

  if (state.priority !== 'all' && block.priority !== state.priority) {
    return false;
  }

  return true;
}

function visibleBlocks() {
  return (state.data?.blocks || [])
    .filter(blockMatchesFilters)
    .sort((left, right) => (
      blockSortValue(left) - blockSortValue(right)
      || left.id.localeCompare(right.id, 'en', { numeric: true })
    ));
}

function selectedBlock() {
  return (state.data?.blocks || []).find((block) => block.id === state.selectedId) || visibleBlocks()[0] || null;
}

function updateFilterOptions() {
  const blocks = state.data?.blocks || [];
  const statuses = [...new Set(blocks.map((block) => block.status).filter(Boolean))].sort();
  const priorities = [...new Set(blocks.map((block) => block.priority).filter(Boolean))].sort();

  elements.statusFilter.innerHTML = '<option value="all">Alle</option>'
    + statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('');
  elements.priorityFilter.innerHTML = '<option value="all">Alle</option>'
    + priorities.map((priority) => `<option value="${escapeHtml(priority)}">${escapeHtml(priority)}</option>`).join('');
}

function renderMetrics() {
  const summary = state.data?.summary || {};
  const score = state.data?.scorecard?.scorecard?.score ?? state.data?.scorecard?.score ?? null;
  const coverage = state.data?.coverage?.summary?.adjustedCoveragePercent
    ?? state.data?.scorecard?.metrics?.adjustedCoveragePercent
    ?? null;
  const openDeps = (state.data?.dependencies || []).filter((edge) => edge.fulfilled === false).length;
  const activeLocks = state.data?.locks?.active?.length || 0;

  const metrics = [
    { value: summary.blockCount ?? 0, label: 'Bloecke' },
    { value: summary.dependencyCount ?? 0, label: 'Dependencies' },
    { value: summary.collisionCount ?? 0, label: 'Scope-Kollisionen' },
    { value: score == null ? '-' : score, label: 'Graph Score' },
    { value: coverage == null ? `${activeLocks}` : `${coverage}%`, label: coverage == null ? 'Aktive Locks' : 'Coverage' },
  ];

  if (coverage != null && activeLocks > 0) {
    metrics[4].label = `Coverage, ${activeLocks} Lock`;
  }

  elements.metrics.innerHTML = metrics.map((metric) => `
    <div class="metric">
      <span class="metric-value">${escapeHtml(metric.value)}</span>
      <span class="metric-label">${escapeHtml(metric.label)}</span>
    </div>
  `).join('');

  if (openDeps > 0) {
    elements.metrics.insertAdjacentHTML('beforeend', `
      <div class="metric">
        <span class="metric-value">${openDeps}</span>
        <span class="metric-label">Offene harte/soft Gates</span>
      </div>
    `);
  }
}

function renderBlockList() {
  const blocks = visibleBlocks();
  elements.blockList.innerHTML = blocks.map((block) => {
    const activeLock = (state.data?.locks?.active || []).some((lock) => lock.blockId === block.id);
    const isActive = block.id === state.selectedId ? ' is-active' : '';
    return `
      <button type="button" class="block-row${isActive}" data-block-id="${escapeHtml(block.id)}">
        <span class="block-id">${escapeHtml(block.id)}</span>
        <span class="block-title">${escapeHtml(block.title)}</span>
        <span class="chip ${escapeHtml(block.status)}">${activeLock ? 'lock' : escapeHtml(block.priority)}</span>
      </button>
    `;
  }).join('');

  elements.blockList.querySelectorAll('[data-block-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedId = button.dataset.blockId;
      render();
    });
  });
}

function measureSvg() {
  const rect = elements.planSvg.getBoundingClientRect();
  return {
    width: Math.max(rect.width || 960, 760),
    height: Math.max(rect.height || 640, 620),
  };
}

function computeLayout(blocks, width, height) {
  const columns = [
    { key: 'done', x: width * 0.22, label: 'done' },
    { key: 'planned-p1', x: width * 0.52, label: 'P1 planned' },
    { key: 'planned-p2', x: width * 0.79, label: 'P2 planned' },
  ];

  const groups = new Map(columns.map((column) => [column.key, []]));
  for (const block of blocks) {
    if (block.status === 'done') {
      groups.get('done').push(block);
    } else if (block.priority === 'P1') {
      groups.get('planned-p1').push(block);
    } else {
      groups.get('planned-p2').push(block);
    }
  }

  const positions = new Map();
  for (const column of columns) {
    const groupBlocks = groups.get(column.key).sort((left, right) => blockSortValue(left) - blockSortValue(right));
    const gap = Math.max(76, (height - 120) / Math.max(groupBlocks.length, 1));
    groupBlocks.forEach((block, index) => {
      positions.set(block.id, {
        x: column.x,
        y: 72 + index * gap,
      });
    });
  }

  return positions;
}

function statusClass(block) {
  if (block.status === 'done') {
    return 'node-status-done';
  }
  if (block.status === 'planned') {
    return 'node-status-planned';
  }
  return 'node-status-other';
}

function renderMap() {
  const blocks = visibleBlocks();
  const { width, height } = measureSvg();
  const positions = computeLayout(blocks, width, height);
  const visibleIds = new Set(blocks.map((block) => block.id));
  const selected = selectedBlock();
  const relatedIds = new Set([selected?.id]);

  for (const edge of state.data?.dependencies || []) {
    if (edge.from === selected?.id) {
      relatedIds.add(edge.to);
    }
    if (edge.to === selected?.id) {
      relatedIds.add(edge.from);
    }
  }

  elements.planSvg.innerHTML = '';
  elements.planSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const defs = svgElement('defs');
  const marker = svgElement('marker', {
    id: 'arrow',
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '6',
    markerHeight: '6',
    orient: 'auto-start-reverse',
  });
  marker.appendChild(svgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#a9a095' }));
  defs.appendChild(marker);
  elements.planSvg.appendChild(defs);

  const edgeLayer = svgElement('g');
  for (const edge of state.data?.dependencies || []) {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) {
      continue;
    }
    const from = positions.get(edge.to);
    const to = positions.get(edge.from);
    if (!from || !to) {
      continue;
    }
    const path = svgElement('path', {
      class: `edge${edge.fulfilled === false ? ' is-open' : ''}${edge.kind === 'soft' ? ' is-soft' : ''}`,
      d: `M ${from.x + 72} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x - 72} ${to.y}`,
      'marker-end': 'url(#arrow)',
    });
    edgeLayer.appendChild(path);
  }
  elements.planSvg.appendChild(edgeLayer);

  const nodeLayer = svgElement('g');
  for (const block of blocks) {
    const position = positions.get(block.id);
    if (!position) {
      continue;
    }
    const group = svgElement('g', {
      class: `node-group${block.id === state.selectedId ? ' is-selected' : ''}${selected && !relatedIds.has(block.id) ? ' is-dimmed' : ''}`,
      transform: `translate(${position.x - 74} ${position.y - 31})`,
      tabindex: '0',
      role: 'button',
    });
    group.dataset.blockId = block.id;

    group.appendChild(svgElement('rect', { class: 'node-card', width: '148', height: '62' }));
    group.appendChild(svgElement('circle', { class: statusClass(block), cx: '126', cy: '16', r: '5' }));

    const idText = svgElement('text', { class: 'node-id', x: '12', y: '20' });
    idText.textContent = block.id;
    group.appendChild(idText);

    const titleText = svgElement('text', { class: 'node-title', x: '12', y: '38' });
    titleText.textContent = String(block.title || '').slice(0, 22);
    group.appendChild(titleText);

    group.appendChild(svgElement('rect', { class: 'node-progress-bg', x: '12', y: '50', width: '124', height: '5', rx: '3' }));
    group.appendChild(svgElement('rect', {
      class: 'node-progress',
      x: '12',
      y: '50',
      width: String(Math.max(0, Math.min(124, (block.phaseProgress?.percent || 0) * 1.24))),
      height: '5',
      rx: '3',
    }));

    group.addEventListener('click', () => {
      state.selectedId = block.id;
      render();
    });
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        state.selectedId = block.id;
        render();
      }
    });

    nodeLayer.appendChild(group);
  }
  elements.planSvg.appendChild(nodeLayer);
}

function formatDependency(edge) {
  const status = edge.fulfilled === false ? 'offen' : edge.fulfilled === true ? 'erfuellt' : 'unbekannt';
  return `${edge.to}${edge.phase ? ` (${edge.phase})` : ''} - ${edge.kind}, ${status}`;
}

function collisionsForBlock(blockId) {
  return (state.data?.scopeCollisions || []).filter((collision) => (
    collision.leftBlock === blockId || collision.rightBlock === blockId
  ));
}

function renderDetail() {
  const block = selectedBlock();
  if (!block) {
    elements.detailPanel.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
    return;
  }

  const activeLock = (state.data?.locks?.active || []).find((lock) => lock.blockId === block.id);
  const outgoingDeps = (state.data?.dependencies || []).filter((edge) => edge.from === block.id);
  const incomingDeps = (state.data?.dependencies || []).filter((edge) => edge.to === block.id);
  const collisions = collisionsForBlock(block.id);
  const progress = block.phaseProgress || { total: 0, done: 0, percent: 0 };

  elements.detailPanel.innerHTML = `
    <h2 class="detail-title">${escapeHtml(block.id)} ${escapeHtml(block.title)}</h2>
    <div class="detail-kicker">
      <span class="chip ${escapeHtml(block.status)}">${escapeHtml(block.status)}</span>
      <span class="chip priority">${escapeHtml(block.priority || '-')}</span>
      ${activeLock ? '<span class="chip locked">lock</span>' : ''}
    </div>

    <div class="detail-section">
      <h3>Fortschritt</h3>
      <div class="progress-track"><div class="progress-fill" style="width:${progress.percent || 0}%"></div></div>
      <dl class="key-value" style="margin-top:12px">
        <dt>Phase</dt><dd>${escapeHtml(block.currentPhase || '-')}</dd>
        <dt>Phasenpunkte</dt><dd>${escapeHtml(progress.done)} / ${escapeHtml(progress.total)}</dd>
        <dt>DoD</dt><dd>${escapeHtml(block.dodProgress?.done || 0)} / ${escapeHtml(block.dodProgress?.total || 0)}</dd>
        <dt>Area</dt><dd>${escapeHtml(block.affectedArea || '-')}</dd>
        <dt>Plan</dt><dd>${escapeHtml(block.planFile || '-')}</dd>
      </dl>
    </div>

    <div class="detail-section">
      <h3>Dependencies</h3>
      <ul class="plain-list">
        ${outgoingDeps.length ? outgoingDeps.map((edge) => `<li>${escapeHtml(formatDependency(edge))}</li>`).join('') : '<li class="muted">keine</li>'}
      </ul>
    </div>

    <div class="detail-section">
      <h3>Consumer</h3>
      <ul class="plain-list">
        ${incomingDeps.length ? incomingDeps.map((edge) => `<li>${escapeHtml(edge.from)} braucht ${escapeHtml(edge.phase || block.id)}</li>`).join('') : '<li class="muted">keine</li>'}
      </ul>
    </div>

    <div class="detail-section">
      <h3>Scope-Kollisionen</h3>
      <ul class="plain-list">
        ${collisions.length ? collisions.slice(0, 8).map((collision) => {
          const other = collision.leftBlock === block.id ? collision.rightBlock : collision.leftBlock;
          return `<li>${escapeHtml(other)} - ${escapeHtml(collision.sharedFileCount)} Datei(en)</li>`;
        }).join('') : '<li class="muted">keine</li>'}
      </ul>
    </div>

    <div class="detail-section">
      <h3>Phasen</h3>
      ${block.phases?.slice(0, 10).map((phase) => `
        <div class="phase-row">
          <strong>${escapeHtml(phase.id)}</strong>
          <span>${escapeHtml(phase.title)}</span>
          <span class="muted">${escapeHtml(phase.progress.done)} / ${escapeHtml(phase.progress.total)}</span>
        </div>
      `).join('') || '<p class="muted">keine Phasen gelesen</p>'}
    </div>

    <div class="detail-section">
      <h3>Scope Files</h3>
      <ul class="plain-list">
        ${(block.scopeFiles || []).slice(0, 14).map((file) => `<li>${escapeHtml(file)}</li>`).join('') || '<li class="muted">keine</li>'}
      </ul>
    </div>
  `;
}

function renderCollisionView() {
  const rows = (state.data?.scopeCollisions || []).slice(0, 80);
  elements.collisionsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Block A</th>
          <th>Block B</th>
          <th>Dateien</th>
          <th>Gemeinsame Pfade</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((collision) => `
          <tr>
            <td>${escapeHtml(collision.leftBlock)}</td>
            <td>${escapeHtml(collision.rightBlock)}</td>
            <td>${escapeHtml(collision.sharedFileCount)}</td>
            <td>${escapeHtml(collision.sharedFiles.slice(0, 5).join(', '))}${collision.sharedFiles.length > 5 ? ' ...' : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderHealthView() {
  const scorecard = state.data?.scorecard || {};
  const coverage = state.data?.coverage || {};
  const graph = state.data?.graph || {};
  const findings = state.data?.openFindings || [];
  const activeLocks = state.data?.locks?.active || [];

  elements.healthPanel.innerHTML = `
    <section class="health-panel">
      <h2>Graph</h2>
      <dl class="key-value">
        <dt>Score</dt><dd>${escapeHtml(scorecard.score ?? '-')}</dd>
        <dt>Status</dt><dd>${escapeHtml(scorecard.status || '-')}</dd>
        <dt>Nodes</dt><dd>${escapeHtml(graph.nodeCount ?? '-')}</dd>
        <dt>Edges</dt><dd>${escapeHtml(graph.edgeCount ?? '-')}</dd>
      </dl>
    </section>
    <section class="health-panel">
      <h2>Coverage</h2>
      <dl class="key-value">
        <dt>Adjusted</dt><dd>${escapeHtml(coverage.summary?.adjustedCoveragePercent ?? scorecard.metrics?.adjustedCoveragePercent ?? '-')}</dd>
        <dt>Gate</dt><dd>${escapeHtml(coverage.gate?.status || scorecard.metrics?.coverageGateStatus || '-')}</dd>
        <dt>Critical</dt><dd>${escapeHtml(scorecard.metrics?.criticalPathOkCount ?? '-')}/${escapeHtml(scorecard.metrics?.criticalPathTotalCount ?? '-')}</dd>
      </dl>
    </section>
    <section class="health-panel">
      <h2>Locks</h2>
      <ul class="plain-list">
        ${activeLocks.length ? activeLocks.map((lock) => `<li>${escapeHtml(lock.blockId)} ${escapeHtml(lock.phase || '')} - ${escapeHtml(lock.status)}</li>`).join('') : '<li class="muted">keine aktiven Locks</li>'}
      </ul>
    </section>
    <section class="health-panel">
      <h2>Open Findings</h2>
      <ul class="plain-list">
        ${findings.length ? findings.map((finding) => `<li>${escapeHtml(finding.id)} - ${escapeHtml(finding.severity || '-')} - ${escapeHtml(finding.finding)}</li>`).join('') : '<li class="muted">keine</li>'}
      </ul>
    </section>
  `;
}

function updateViewPanels() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === state.view);
  });
  document.querySelector('#mapView').classList.toggle('is-active', state.view === 'map');
  document.querySelector('#collisionsView').classList.toggle('is-active', state.view === 'collisions');
  document.querySelector('#healthView').classList.toggle('is-active', state.view === 'health');
}

function renderEmpty() {
  elements.metrics.innerHTML = '';
  elements.blockList.innerHTML = '';
  elements.planSvg.innerHTML = '';
  elements.detailPanel.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
  elements.collisionsTable.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
  elements.healthPanel.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
}

function render() {
  updateViewPanels();
  if (!state.data) {
    renderEmpty();
    return;
  }

  if (!state.selectedId || !visibleBlocks().some((block) => block.id === state.selectedId)) {
    state.selectedId = visibleBlocks()[0]?.id || null;
  }

  renderMetrics();
  renderBlockList();
  renderMap();
  renderDetail();
  renderCollisionView();
  renderHealthView();
}

async function loadDataFromUrl(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function loadDefaultData() {
  for (const url of DEFAULT_DATA_URLS) {
    try {
      const data = await loadDataFromUrl(url);
      state.data = data;
      elements.sourceMeta.textContent = `${data.contract || 'plan-map'} - ${data.generatedAt || url}`;
      updateFilterOptions();
      render();
      return;
    } catch {
      // Keep trying known local export locations before falling back to file input.
    }
  }
  render();
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
    });
  });

  elements.searchInput.addEventListener('input', () => {
    state.search = elements.searchInput.value.trim();
    render();
  });
  elements.statusFilter.addEventListener('change', () => {
    state.status = elements.statusFilter.value;
    render();
  });
  elements.priorityFilter.addEventListener('change', () => {
    state.priority = elements.priorityFilter.value;
    render();
  });

  elements.fileInput.addEventListener('change', async () => {
    const file = elements.fileInput.files?.[0];
    if (!file) {
      return;
    }
    const data = JSON.parse(await file.text());
    state.data = data;
    state.selectedId = null;
    elements.sourceMeta.textContent = `${data.contract || 'plan-map'} - ${file.name}`;
    updateFilterOptions();
    render();
  });

  window.addEventListener('resize', () => {
    if (state.view === 'map') {
      renderMap();
    }
  });
}

bindEvents();
loadDefaultData();
