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
  workstream: 'all',
  readiness: 'all',
  changelogType: 'all',
  changelogEvidence: 'all',
  selectedChangelogId: null,
  focusMode: true,
  fileFocus: '',
  detailTab: 'overview',
  expandedSections: new Set(),
  activeHelpTerm: '',
  overlays: {
    dependencies: true,
    collisions: true,
    impact: true,
    progress: true,
  },
  whyOpen: false,
  lastSelectedId: null,
  helpVisible: true,
};

const elements = {
  sourceMeta: document.querySelector('#sourceMeta'),
  fileInput: document.querySelector('#fileInput'),
  legendToggle: document.querySelector('#legendToggle'),
  legendPanel: document.querySelector('#legendPanel'),
  legendSources: document.querySelector('#legendSources'),
  showDependencies: document.querySelector('#showDependencies'),
  showCollisions: document.querySelector('#showCollisions'),
  showImpact: document.querySelector('#showImpact'),
  showProgress: document.querySelector('#showProgress'),
  searchInput: document.querySelector('#searchInput'),
  statusFilter: document.querySelector('#statusFilter'),
  priorityFilter: document.querySelector('#priorityFilter'),
  workstreamFilter: document.querySelector('#workstreamFilter'),
  readinessFilter: document.querySelector('#readinessFilter'),
  changelogTypeFilter: document.querySelector('#changelogTypeFilter'),
  changelogEvidenceFilter: document.querySelector('#changelogEvidenceFilter'),
  focusToggle: document.querySelector('#focusToggle'),
  blockList: document.querySelector('#blockList'),
  metrics: document.querySelector('#metrics'),
  decisionBar: document.querySelector('#decisionBar'),
  planSvg: document.querySelector('#planSvg'),
  edgeTooltip: document.querySelector('#edgeTooltip'),
  changelogPanel: document.querySelector('#changelogPanel'),
  detailPanel: document.querySelector('#detailPanel'),
  collisionsTable: document.querySelector('#collisionsTable'),
  healthPanel: document.querySelector('#healthPanel'),
  sourcesFootnote: document.querySelector('#sourcesFootnote'),
};

const DETAIL_TABS = [
  { id: 'overview', label: 'Ueberblick' },
  { id: 'explain', label: 'Erklaerung' },
  { id: 'start', label: 'Start' },
  { id: 'scope', label: 'Scope' },
  { id: 'phases', label: 'Phasen' },
  { id: 'risks', label: 'Risiken' },
];

const MAP_NODE_HEIGHT = 62;
const MAP_NODE_GAP = 76;
const MAP_TOP_PADDING = 72;
const MAP_BOTTOM_PADDING = 96;

const HELP_TERMS = {
  'readiness-ready': {
    title: 'startklar',
    body: 'Alle harten Startbedingungen sind erfuellt. Der Block kann grundsaetzlich begonnen werden.',
  },
  'readiness-risk': {
    title: 'mit Risiko',
    body: 'Der Start ist moeglich, aber Soft-Gates, unklare Abhaengigkeiten oder Scope-Risiken sollten vorher kurz geprueft werden.',
  },
  'readiness-blocked': {
    title: 'blockiert',
    body: 'Ein harter Vorblock, ein Lock oder eine offene Dependency verhindert den sauberen Start.',
  },
  readiness: {
    title: 'Startbarkeit',
    body: 'Verdichtete Einschaetzung, ob ein Planblock jetzt sinnvoll gestartet werden kann.',
  },
  dependency: {
    title: 'Dependency',
    body: 'Ein anderer Block, eine Phase oder ein Gate, das fuer diesen Block relevant ist.',
  },
  'deps-layer': {
    title: 'Deps',
    body: 'Blendet die Dependency-Kanten der Karte ein oder aus. Die Richtung zeigt, welcher Block von welchem Vorlauf abhaengt.',
  },
  collision: {
    title: 'Scope-Kollision',
    body: 'Zwei Bloecke nennen dieselben Dateien. Das ist kein Fehler, aber parallele Arbeit braucht Lock- und Scope-Abgleich.',
  },
  impact: {
    title: 'Impact',
    body: 'Gewicht aus Scope-Groesse, geteilten Dateien, Governance-Naehe und betroffenen Code-/Testbereichen.',
  },
  progress: {
    title: 'Fortschritt',
    body: 'Zeigt den gelesenen Stand aus Phasenpunkten und DoD. Es ist ein Plan-Signal, kein Live-Testlauf.',
  },
  evidence: {
    title: 'Evidence',
    body: 'Nachvollziehbare Belege wie Tests, Checks, Dateipfade oder Planhinweise, auf denen eine Aussage basiert.',
  },
  'changelog-type': {
    title: 'Changelog-Typ',
    body: 'Filtert Historieneintraege nach ihrer Art, zum Beispiel Umsetzung, Gate, Sync oder Abschluss.',
  },
  consumer: {
    title: 'Consumer',
    body: 'Bloecke, die vom aktuell ausgewaehlten Block abhaengen oder dessen Ergebnis spaeter nutzen.',
  },
  scope: {
    title: 'Scope',
    body: 'Die Dateien und Bereiche, die ein Block planmaessig beruehren darf oder besonders im Blick behalten muss.',
  },
  health: {
    title: 'Health',
    body: 'Zusammenfassung von Graph-, Coverage- und Scorecard-Signalen zur Qualitaet der Plan- und Repo-Daten.',
  },
  rank: {
    title: 'Rank',
    body: 'Empfohlene Reihenfolge aus der Plananalyse. Niedrigere Zahl bedeutet: frueher sinnvoll ansehen.',
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function helpButton(term) {
  const help = HELP_TERMS[term];
  if (!help) return '';
  return `<button type="button" class="help-button" data-help-term="${escapeHtml(term)}" aria-label="${escapeHtml(help.title)} erklaeren">i</button>`;
}

function ensureHelpPopover() {
  let popover = document.querySelector('#helpPopover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'helpPopover';
    popover.className = 'help-popover';
    popover.hidden = true;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-live', 'polite');
    document.body.appendChild(popover);
  }
  return popover;
}

function closeHelpPopover() {
  state.activeHelpTerm = '';
  document.querySelectorAll('.help-button.is-active').forEach((button) => button.classList.remove('is-active'));
  ensureHelpPopover().hidden = true;
}

function setHelpVisible(isVisible) {
  state.helpVisible = isVisible !== false;
  document.body.classList.toggle('help-hidden', !state.helpVisible);
  if (!state.helpVisible) {
    closeHelpPopover();
  }
}

function openHelpPopover(term, button) {
  const help = HELP_TERMS[term];
  if (!help) return;
  const popover = ensureHelpPopover();
  document.querySelectorAll('.help-button.is-active').forEach((node) => node.classList.remove('is-active'));
  button.classList.add('is-active');
  state.activeHelpTerm = term;
  popover.innerHTML = `<strong>${escapeHtml(help.title)}</strong><span>${escapeHtml(help.body)}</span>`;
  popover.hidden = false;

  const buttonRect = button.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const left = Math.min(window.innerWidth - popoverRect.width - 12, Math.max(12, buttonRect.left));
  const top = Math.min(window.innerHeight - popoverRect.height - 12, buttonRect.bottom + 8);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function bindHelpButtons(root = document) {
  root.querySelectorAll('[data-help-term]').forEach((button) => {
    if (button.dataset.helpBound === 'true') return;
    button.dataset.helpBound = 'true';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const term = button.dataset.helpTerm;
      if (state.activeHelpTerm === term) {
        closeHelpPopover();
      } else {
        openHelpPopover(term, button);
      }
    });
  });
}

function sourceLabel(key) {
  const labels = {
    masterPlan: 'Master',
    changelog: 'Changelog',
    openFindings: 'Findings',
    knowledgeGraph: 'Graph',
    knowledgeGraphCoverage: 'Coverage',
    knowledgeGraphScorecard: 'Scorecard',
    lockRegistry: 'Locks',
  };
  return labels[key] || key;
}

function sourceEntries() {
  return Object.entries(state.data?.sources || {}).filter(([, value]) => value);
}

function renderSources() {
  const entries = sourceEntries();
  const items = entries.map(([key, value]) => `
    <li><strong>${escapeHtml(sourceLabel(key))}</strong><span>${escapeHtml(value)}</span></li>
  `).join('');

  elements.legendSources.innerHTML = items || '<li><span>Export noch nicht geladen</span></li>';
  elements.sourcesFootnote.innerHTML = entries.length
    ? `Quellen: ${entries.map(([key, value]) => `${sourceLabel(key)}=${value}`).map(escapeHtml).join(' | ')}`
    : '';
}

function selectBlock(blockId) {
  if (state.selectedId !== blockId) {
    state.selectedId = blockId;
    state.whyOpen = false;
  }
  render();
}

function sectionKey(name) {
  const selection = state.view === 'changelog' ? state.selectedChangelogId : state.selectedId;
  return `${selection || 'none'}:${state.detailTab}:${name}`;
}

function sectionExpanded(name) {
  return state.expandedSections.has(sectionKey(name));
}

function limitedItems(name, items, limit) {
  return sectionExpanded(name) ? items : items.slice(0, limit);
}

function showMoreButton(name, total, limit) {
  if (total <= limit) {
    return '';
  }
  const expanded = sectionExpanded(name);
  return `
    <button type="button" class="show-more" data-toggle-section="${escapeHtml(name)}">
      ${expanded ? 'Weniger anzeigen' : `Mehr anzeigen (${escapeHtml(total - limit)})`}
    </button>
  `;
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

function readinessRank(block) {
  const ranks = {
    ready: 0,
    'ready-with-risk': 1,
    locked: 2,
    blocked: 3,
    done: 4,
  };
  return ranks[block.readiness?.status] ?? 5;
}

function blockHasFile(block, filePath) {
  if (!filePath) {
    return true;
  }

  const directScope = (block.scopeFiles || []).some((entry) => entry === filePath || entry.includes(filePath) || filePath.includes(entry.replace('/**', '')));
  if (directScope) {
    return true;
  }

  return (state.data?.scopeCollisions || []).some((collision) => (
    (collision.leftBlock === block.id || collision.rightBlock === block.id)
    && (collision.sharedFiles || []).includes(filePath)
  ));
}

function blockMatchesFilters(block) {
  const explanation = block.explanation || {};
  const haystack = [
    block.id,
    block.title,
    block.affectedArea,
    block.workstream,
    block.workstreamLabel,
    block.currentPhase,
    block.readiness?.label,
    block.readiness?.reason,
    explanation.brief,
    explanation.background,
    explanation.goal?.join(' '),
    explanation.implementedHighlights?.map((item) => item.text).join(' '),
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

  if (state.workstream !== 'all' && block.workstream !== state.workstream) {
    return false;
  }

  if (state.readiness !== 'all' && block.readiness?.status !== state.readiness) {
    return false;
  }

  if (state.fileFocus && !blockHasFile(block, state.fileFocus)) {
    return false;
  }

  return true;
}

function visibleBlocks() {
  return (state.data?.blocks || [])
    .filter(blockMatchesFilters)
    .sort((left, right) => (
      readinessRank(left) - readinessRank(right)
      || blockSortValue(left) - blockSortValue(right)
      || left.id.localeCompare(right.id, 'en', { numeric: true })
    ));
}

function changelogMatchesFilters(entry) {
  const haystack = [
    entry.title,
    entry.summary,
    entry.typeLabel,
    entry.workstream,
    entry.workstreamLabel,
    entry.blockIds?.join(' '),
    entry.phaseIds?.join(' '),
    entry.bullets?.join(' '),
    entry.evidence?.commands?.map((command) => command.command).join(' '),
  ].join(' ').toLowerCase();

  if (state.search && !haystack.includes(state.search.toLowerCase())) {
    return false;
  }

  if (state.workstream !== 'all' && entry.workstream !== state.workstream) {
    return false;
  }

  if (state.changelogType !== 'all' && entry.type !== state.changelogType) {
    return false;
  }

  if (state.changelogEvidence === 'with-evidence' && !entry.evidence?.hasEvidence) {
    return false;
  }

  if (state.changelogEvidence === 'not-checked' && !entry.evidence?.hasNotChecked) {
    return false;
  }

  return true;
}

function visibleChangelogEntries() {
  return (state.data?.changelog || [])
    .filter(changelogMatchesFilters)
    .sort((left, right) => (
      String(right.date || '').localeCompare(String(left.date || ''))
      || (left.order || 0) - (right.order || 0)
    ));
}

function selectedBlock() {
  return (state.data?.blocks || []).find((block) => block.id === state.selectedId) || visibleBlocks()[0] || null;
}

function selectedChangelogEntry() {
  return (state.data?.changelog || []).find((entry) => entry.id === state.selectedChangelogId)
    || visibleChangelogEntries()[0]
    || null;
}

function updateFilterOptions() {
  const blocks = state.data?.blocks || [];
  const statuses = [...new Set(blocks.map((block) => block.status).filter(Boolean))].sort();
  const priorities = [...new Set(blocks.map((block) => block.priority).filter(Boolean))].sort();
  const exportedWorkstreams = state.data?.workstreams || [];
  const fallbackWorkstreams = [...new Map(blocks
    .filter((block) => block.workstream)
    .map((block) => [block.workstream, { id: block.workstream, label: block.workstreamLabel || block.workstream }])).values()]
    .sort((left, right) => left.label.localeCompare(right.label, 'de'));
  const workstreams = exportedWorkstreams.length ? exportedWorkstreams : fallbackWorkstreams;
  const readinesses = [...new Set(blocks.map((block) => block.readiness?.status).filter(Boolean))]
    .sort((left, right) => (readinessRank({ readiness: { status: left } }) - readinessRank({ readiness: { status: right } })));
  const changelogTypes = [...new Map((state.data?.changelog || [])
    .filter((entry) => entry.type)
    .map((entry) => [entry.type, { id: entry.type, label: entry.typeLabel || entry.type }])).values()]
    .sort((left, right) => left.label.localeCompare(right.label, 'de'));

  elements.statusFilter.innerHTML = '<option value="all">Alle</option>'
    + statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('');
  elements.priorityFilter.innerHTML = '<option value="all">Alle</option>'
    + priorities.map((priority) => `<option value="${escapeHtml(priority)}">${escapeHtml(priority)}</option>`).join('');
  elements.workstreamFilter.innerHTML = '<option value="all">Alle</option>'
    + workstreams.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join('');
  elements.readinessFilter.innerHTML = '<option value="all">Alle</option>'
    + readinesses.map((readiness) => `<option value="${escapeHtml(readiness)}">${escapeHtml(readinessLabel(readiness))}</option>`).join('');
  elements.changelogTypeFilter.innerHTML = '<option value="all">Alle</option>'
    + changelogTypes.map((type) => `<option value="${escapeHtml(type.id)}">${escapeHtml(type.label)}</option>`).join('');
}

function readinessLabel(value) {
  const labels = {
    ready: 'startklar',
    'ready-with-risk': 'mit Risiko',
    locked: 'in Arbeit',
    blocked: 'blockiert',
    done: 'abgeschlossen',
  };
  return labels[value] || value || '-';
}

function shortWorkstreamLabel(block) {
  const labels = {
    'main-game': 'Hauptspiel',
    'map-tools-settings': 'Map/Settings',
    'android-mobile': 'Android',
    'architecture-runtime': 'Architektur',
    'repo-governance': 'Repo',
    'ai-graph-tools': 'AI/Graph',
  };
  return labels[block.workstream] || block.workstreamLabel || block.workstream || '-';
}

function renderMetrics() {
  const summary = state.data?.summary || {};
  const score = state.data?.scorecard?.scorecard?.score ?? state.data?.scorecard?.score ?? null;
  const coverage = state.data?.coverage?.summary?.adjustedCoveragePercent
    ?? state.data?.scorecard?.metrics?.adjustedCoveragePercent
    ?? null;
  const openDeps = (state.data?.dependencies || []).filter((edge) => edge.fulfilled === false).length;
  const activeLocks = state.data?.locks?.active?.length || 0;
  const startable = (summary.byReadiness?.ready || 0) + (summary.byReadiness?.['ready-with-risk'] || 0);
  const blocked = (summary.byReadiness?.blocked || 0) + (summary.byReadiness?.locked || 0);

  const metrics = [
    { value: summary.blockCount ?? 0, label: 'Bloecke' },
    { value: startable, label: 'Startbar' },
    { value: blocked, label: 'Blockiert/in Arbeit' },
    { value: summary.collisionCount ?? 0, label: 'Scope-Kollisionen' },
    { value: summary.changelogCount ?? 0, label: 'Changelog' },
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

function getNextStartableBlock() {
  return (state.data?.blocks || [])
    .filter((block) => block.status !== 'done')
    .filter((block) => block.readiness?.status === 'ready' || block.readiness?.status === 'ready-with-risk')
    .sort((left, right) => (
      (left.readiness?.recommendedRank || 999) - (right.readiness?.recommendedRank || 999)
      || readinessRank(left) - readinessRank(right)
      || blockSortValue(left) - blockSortValue(right)
    ))[0] || null;
}

function renderDecisionBar() {
  const selected = selectedBlock();
  const next = getNextStartableBlock();
  if (!state.data || !selected) {
    elements.decisionBar.innerHTML = '';
    return;
  }

  const fileFocus = state.fileFocus
    ? `<button type="button" class="pill-button is-active" data-clear-file>${escapeHtml(state.fileFocus)} entfernen</button>`
    : '<span class="decision-muted">kein Datei-Fokus</span>';
  const selectedReadiness = selected.readiness || {};
  const nextAction = next
    ? `<button type="button" class="pill-button" data-select-block="${escapeHtml(next.id)}">${escapeHtml(next.id)} als naechster Start</button>`
    : '<span class="decision-muted">kein startklarer geplanter Block</span>';

  elements.decisionBar.innerHTML = `
    <div class="decision-item">
      <strong>${escapeHtml(selected.id)}</strong>
      <span class="chip readiness-${escapeHtml(selectedReadiness.status || 'unknown')}">${escapeHtml(selectedReadiness.label || '-')}</span>
      <span>${escapeHtml(selectedReadiness.reason || '')}</span>
    </div>
    <div class="decision-item">${nextAction}</div>
    <div class="decision-item">${fileFocus}</div>
  `;

  elements.decisionBar.querySelectorAll('[data-select-block]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = 'map';
      selectBlock(button.dataset.selectBlock);
    });
  });
  elements.decisionBar.querySelector('[data-clear-file]')?.addEventListener('click', () => {
    state.fileFocus = '';
    render();
  });
}

function renderBlockList() {
  const blocks = visibleBlocks();
  elements.blockList.innerHTML = blocks.map((block) => {
    const activeLock = (state.data?.locks?.active || []).some((lock) => lock.blockId === block.id);
    const isActive = block.id === state.selectedId ? ' is-active' : '';
    const readiness = block.readiness?.status || 'unknown';
    const collisionMarker = block.readiness?.collisionCount > 0 ? `<span class="mini-count">${escapeHtml(block.readiness.collisionCount)}</span>` : '';
    return `
      <button type="button" class="block-row${isActive}" data-block-id="${escapeHtml(block.id)}">
        <span class="block-id">${escapeHtml(block.id)}</span>
        <span class="block-title">${escapeHtml(block.title)}</span>
        <span class="block-badges">
          ${collisionMarker}
          <span class="chip priority" title="${escapeHtml(block.workstreamLabel || '')}">${escapeHtml(shortWorkstreamLabel(block))}</span>
          <span class="chip readiness-${escapeHtml(readiness)}">${activeLock ? 'lock' : escapeHtml(readinessLabel(readiness))}</span>
        </span>
      </button>
    `;
  }).join('');

  elements.blockList.querySelectorAll('[data-block-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectBlock(button.dataset.blockId);
    });
  });
}

function measureSvg() {
  const containerRect = elements.planSvg.parentElement?.getBoundingClientRect();
  const rect = elements.planSvg.getBoundingClientRect();
  return {
    width: Math.max(containerRect?.width || rect.width || 960, 760),
    height: Math.max(containerRect?.height || rect.height || 640, 520),
  };
}

function mapColumnKey(block) {
  if (block.status === 'done') {
    return 'done';
  }
  return block.priority === 'P1' ? 'planned-p1' : 'planned-p2';
}

function requiredMapHeight(blocks, viewportHeight) {
  const groupCounts = new Map([
    ['done', 0],
    ['planned-p1', 0],
    ['planned-p2', 0],
  ]);
  for (const block of blocks) {
    groupCounts.set(mapColumnKey(block), (groupCounts.get(mapColumnKey(block)) || 0) + 1);
  }

  const maxColumnCount = Math.max(1, ...groupCounts.values());
  const contentHeight = MAP_TOP_PADDING
    + ((maxColumnCount - 1) * MAP_NODE_GAP)
    + MAP_NODE_HEIGHT
    + MAP_BOTTOM_PADDING;
  return Math.max(viewportHeight, contentHeight);
}

function computeLayout(blocks, width, height) {
  const columns = [
    { key: 'done', x: width * 0.22, label: 'done' },
    { key: 'planned-p1', x: width * 0.52, label: 'P1 planned' },
    { key: 'planned-p2', x: width * 0.79, label: 'P2 planned' },
  ];

  const groups = new Map(columns.map((column) => [column.key, []]));
  for (const block of blocks) {
    groups.get(mapColumnKey(block)).push(block);
  }

  const positions = new Map();
  for (const column of columns) {
    const groupBlocks = groups.get(column.key).sort((left, right) => blockSortValue(left) - blockSortValue(right));
    const gap = Math.max(MAP_NODE_GAP, (height - MAP_TOP_PADDING - MAP_BOTTOM_PADDING) / Math.max(groupBlocks.length, 1));
    groupBlocks.forEach((block, index) => {
      positions.set(block.id, {
        x: column.x,
        y: MAP_TOP_PADDING + index * gap,
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
  const viewport = measureSvg();
  const width = viewport.width;
  const height = requiredMapHeight(blocks, viewport.height);
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
  if (selected && state.focusMode) {
    for (const collision of collisionsForBlock(selected.id)) {
      relatedIds.add(collision.leftBlock);
      relatedIds.add(collision.rightBlock);
    }
  }

  elements.planSvg.innerHTML = '';
  elements.planSvg.style.height = `${height}px`;
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
  if (state.overlays.dependencies) {
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
      const title = svgElement('title');
      title.textContent = edgeTooltipText(edge);
      path.appendChild(title);
      path.addEventListener('mousemove', (event) => showEdgeTooltip(edge, event));
      path.addEventListener('mouseleave', hideEdgeTooltip);
      edgeLayer.appendChild(path);
    }
  }

  if (state.overlays.collisions) {
    for (const collision of state.data?.scopeCollisions || []) {
      if (!visibleIds.has(collision.leftBlock) || !visibleIds.has(collision.rightBlock)) {
        continue;
      }
      if (state.focusMode && selected && collision.leftBlock !== selected.id && collision.rightBlock !== selected.id) {
        continue;
      }
      const left = positions.get(collision.leftBlock);
      const right = positions.get(collision.rightBlock);
      if (!left || !right) {
        continue;
      }
      const path = svgElement('path', {
        class: 'collision-edge',
        d: `M ${left.x} ${left.y + 30} C ${(left.x + right.x) / 2} ${left.y + 64}, ${(left.x + right.x) / 2} ${right.y + 64}, ${right.x} ${right.y + 30}`,
      });
      const title = svgElement('title');
      title.textContent = collisionTooltipText(collision);
      path.appendChild(title);
      path.addEventListener('mousemove', (event) => showCollisionTooltip(collision, event));
      path.addEventListener('mouseleave', hideEdgeTooltip);
      edgeLayer.appendChild(path);
    }
  }
  elements.planSvg.appendChild(edgeLayer);

  const nodeLayer = svgElement('g');
  for (const block of blocks) {
    const position = positions.get(block.id);
    if (!position) {
      continue;
    }
    const group = svgElement('g', {
      class: `node-group${block.id === state.selectedId ? ' is-selected' : ''}${state.focusMode && selected && !relatedIds.has(block.id) ? ' is-dimmed' : ''}`,
      transform: `translate(${position.x - 74} ${position.y - 31})`,
      tabindex: '0',
      role: 'button',
    });
    group.dataset.blockId = block.id;

    group.appendChild(svgElement('rect', {
      class: `node-card${state.overlays.impact ? ` impact-${block.impact?.level || 'low'}` : ''}`,
      width: '148',
      height: '62',
    }));
    if (state.overlays.impact) {
      group.appendChild(svgElement('rect', {
        class: `node-impact impact-${block.impact?.level || 'low'}`,
        x: '0',
        y: '0',
        width: '5',
        height: '62',
        rx: '3',
      }));
    }
    group.appendChild(svgElement('circle', { class: statusClass(block), cx: '126', cy: '16', r: '5' }));
    group.appendChild(svgElement('circle', { class: `readiness-dot readiness-${block.readiness?.status || 'unknown'}`, cx: '136', cy: '16', r: '4' }));
    if (state.overlays.collisions && block.readiness?.collisionCount > 0) {
      group.appendChild(svgElement('circle', { class: 'node-collision-badge', cx: '128', cy: '43', r: '9' }));
      const collisionText = svgElement('text', { class: 'node-collision-text', x: '128', y: '47' });
      collisionText.textContent = String(Math.min(block.readiness.collisionCount, 9));
      group.appendChild(collisionText);
    }

    const idText = svgElement('text', { class: 'node-id', x: '12', y: '20' });
    idText.textContent = block.id;
    group.appendChild(idText);

    const titleText = svgElement('text', { class: 'node-title', x: '12', y: '38' });
    titleText.textContent = String(block.title || '').slice(0, 22);
    group.appendChild(titleText);

    if (state.overlays.progress) {
      group.appendChild(svgElement('rect', { class: 'node-progress-bg', x: '12', y: '50', width: '124', height: '5', rx: '3' }));
      group.appendChild(svgElement('rect', {
        class: 'node-progress',
        x: '12',
        y: '50',
        width: String(Math.max(0, Math.min(124, (block.phaseProgress?.percent || 0) * 1.24))),
        height: '5',
        rx: '3',
      }));
    }

    group.addEventListener('click', () => {
      selectBlock(block.id);
    });
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectBlock(block.id);
      }
    });

    nodeLayer.appendChild(group);
  }
  elements.planSvg.appendChild(nodeLayer);
}

function edgeTooltipText(edge) {
  const status = edge.fulfilled === false ? 'offen' : edge.fulfilled === true ? 'erfuellt' : 'unbekannt';
  return `${edge.from} braucht ${edge.to}${edge.phase ? ` (${edge.phase})` : ''}\n${edge.kind}, ${status}${edge.hint ? `\n${edge.hint}` : ''}`;
}

function collisionTooltipText(collision) {
  const files = (collision.sharedFiles || []).slice(0, 3).join(', ');
  return `${collision.leftBlock} <-> ${collision.rightBlock}\n${collision.sharedFileCount} gemeinsame Datei(en)${files ? `\n${files}` : ''}`;
}

function showEdgeTooltip(edge, event) {
  elements.edgeTooltip.hidden = false;
  elements.edgeTooltip.innerHTML = `
    <strong>${escapeHtml(edge.from)} -> ${escapeHtml(edge.to)}</strong>
    <span>${escapeHtml(edge.kind)} / ${escapeHtml(edge.fulfilled === false ? 'offen' : edge.fulfilled === true ? 'erfuellt' : 'unbekannt')}</span>
    ${edge.phase ? `<span>${escapeHtml(edge.phase)}</span>` : ''}
    ${edge.hint ? `<span>${escapeHtml(edge.hint)}</span>` : ''}
  `;
  const rect = elements.planSvg.getBoundingClientRect();
  elements.edgeTooltip.style.left = `${event.clientX - rect.left + 14}px`;
  elements.edgeTooltip.style.top = `${event.clientY - rect.top + 14}px`;
}

function showCollisionTooltip(collision, event) {
  elements.edgeTooltip.hidden = false;
  elements.edgeTooltip.innerHTML = `
    <strong>${escapeHtml(collision.leftBlock)} &lt;-&gt; ${escapeHtml(collision.rightBlock)}</strong>
    <span>${escapeHtml(collision.sharedFileCount)} gemeinsame Datei(en)</span>
    ${(collision.sharedFiles || []).slice(0, 3).map((file) => `<span>${escapeHtml(file)}</span>`).join('')}
  `;
  const rect = elements.planSvg.getBoundingClientRect();
  elements.edgeTooltip.style.left = `${event.clientX - rect.left + 14}px`;
  elements.edgeTooltip.style.top = `${event.clientY - rect.top + 14}px`;
}

function hideEdgeTooltip() {
  elements.edgeTooltip.hidden = true;
}

function formatDependency(edge) {
  const status = edge.fulfilled === false ? 'offen' : edge.fulfilled === true ? 'erfuellt' : 'unbekannt';
  return `${edge.to}${edge.phase ? ` (${edge.phase})` : ''} - ${edge.kind}, ${status}`;
}

function progressWidth(progress) {
  return Math.max(0, Math.min(100, Number(progress?.percent) || 0));
}

function detailTabsMarkup() {
  return `
    <div class="detail-tabs" role="tablist" aria-label="Detailbereiche">
      ${DETAIL_TABS.map((tab) => `
        <button
          type="button"
          class="detail-tab${state.detailTab === tab.id ? ' is-active' : ''}"
          data-detail-tab="${escapeHtml(tab.id)}"
          role="tab"
          aria-selected="${state.detailTab === tab.id ? 'true' : 'false'}"
        >${escapeHtml(tab.label)}</button>
      `).join('')}
    </div>
  `;
}

function dependencyItems(edges) {
  return edges.length
    ? edges.map((edge) => `<li>${escapeHtml(formatDependency(edge))}</li>`).join('')
    : '<li class="muted">keine</li>';
}

function consumerItems(edges, blockId) {
  return edges.length
    ? edges.map((edge) => `<li><button type="button" class="text-button" data-select-block="${escapeHtml(edge.from)}">${escapeHtml(edge.from)}</button> braucht ${escapeHtml(edge.phase || blockId)}</li>`).join('')
    : '<li class="muted">keine</li>';
}

function collisionItems(blockId, collisions, sectionName, limit) {
  const visible = limitedItems(sectionName, collisions, limit);
  return visible.length
    ? visible.map((collision) => {
      const other = collision.leftBlock === blockId ? collision.rightBlock : collision.leftBlock;
      return `<li><button type="button" class="text-button" data-select-block="${escapeHtml(other)}">${escapeHtml(other)}</button> - ${escapeHtml(collision.sharedFileCount)} Datei(en): ${collision.sharedFiles.slice(0, 3).map(fileButton).join(' ')}</li>`;
    }).join('')
    : '<li class="muted">keine</li>';
}

function fileItems(files, sectionName, limit) {
  const visible = limitedItems(sectionName, files || [], limit);
  return visible.length
    ? visible.map((file) => `<li>${fileButton(file)}</li>`).join('')
    : '<li class="muted">keine</li>';
}

function textItems(items, sectionName, limit) {
  const visible = limitedItems(sectionName, items || [], limit);
  return visible.length
    ? visible.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li class="muted">keine</li>';
}

function explanationItems(items, sectionName, limit, emptyText = 'keine') {
  const visible = limitedItems(sectionName, items || [], limit);
  return visible.length
    ? visible.map((item) => `
      <li class="explain-item">
        ${item.label ? `<strong>${escapeHtml(item.label)}</strong>` : ''}
        <span>${escapeHtml(item.text || item)}</span>
        ${item.evidence ? `<small>${escapeHtml(item.evidence)}</small>` : ''}
      </li>
    `).join('')
    : `<li class="muted">${escapeHtml(emptyText)}</li>`;
}

function phaseRows(block, sectionName, limit) {
  const phases = block.phases || [];
  const visible = limitedItems(sectionName, phases, limit);
  return visible.length
    ? visible.map((phase) => `
      <div class="phase-row">
        <strong>${escapeHtml(phase.id)}</strong>
        <span>${escapeHtml(phase.title)}</span>
        <span class="muted">${escapeHtml(phase.progress?.done ?? 0)} / ${escapeHtml(phase.progress?.total ?? 0)}</span>
      </div>
    `).join('')
    : '<p class="muted">keine Phasen gelesen</p>';
}

function riskHintItems(block, readiness, impact, collisions) {
  const hints = [];
  if ((readiness.openHardDependencyCount || 0) > 0) {
    hints.push({
      title: `${readiness.openHardDependencyCount} harte Dependency noch offen.`,
      kind: 'Gate',
      detail: 'Harte Dependencies sind Start- oder Abschlussbedingungen. Der Block sollte erst weiterlaufen, wenn diese Vorbedingung erfuellt oder bewusst neu bewertet wurde.',
    });
  }
  if ((readiness.openSoftDependencyCount || 0) + (readiness.openUnknownDependencyCount || 0) > 0) {
    hints.push({
      title: 'Soft-Gates oder unklare Dependencies vor Start pruefen.',
      kind: 'Unsicherheit',
      detail: 'Soft- oder Unknown-Kanten blockieren nicht automatisch, koennen aber Scope, Reihenfolge oder Verifikation veraendern. Vor Umsetzung kurz abgleichen, ob daraus ein echter Blocker geworden ist.',
    });
  }
  if (collisions.length > 0) {
    hints.push({
      title: `${collisions.length} Scope-Kollision(en) mit anderen Bloecken.`,
      kind: 'Scope',
      detail: 'Andere Bloecke nennen dieselben Dateien. Das ist kein Fehler, aber parallele Arbeit braucht Lock-/Scope-Abgleich, damit sich Aenderungen nicht gegenseitig ueberdecken.',
    });
  }
  if ((impact.governanceFileCount || 0) > 0) {
    hints.push({
      title: `${impact.governanceFileCount} Governance-nahe Datei(en) im Scope.`,
      kind: 'Governance',
      detail: 'Governance-nahe Dateien koennen Regeln, Workflows oder Planwahrheiten beeinflussen. Solche Aenderungen brauchen strengere Gates und duerfen nicht nebenbei mitlaufen.',
    });
  }
  if ((impact.packageFileCount || 0) > 0) {
    hints.push({
      title: `${impact.packageFileCount} Package-/Lockfile-nahe Datei(en) im Scope.`,
      kind: 'Dependency',
      detail: 'Package- und Lockfile-Aenderungen koennen Build, Tests und GitHub-Actions beeinflussen. Nach solchen Aenderungen ist mindestens ein gezieltes Install-/Build- oder Contract-Signal sinnvoll.',
    });
  }
  if ((block.blockedBy || []).length > 0) {
    hints.push({
      title: `Blocked-by: ${(block.blockedBy || []).join(', ')}`,
      kind: 'Blocker',
      detail: 'Der Plan nennt konkrete Vorbedingungen. Vor Abschluss sollte klar sein, ob sie erledigt, entfallen oder in einen eigenen Follow-up verschoben wurden.',
    });
  }
  return hints;
}

function riskHintMarkup(hints) {
  if (!hints.length) {
    return '<p class="muted">keine verdichteten Hinweise</p>';
  }

  return `
    <div class="risk-list">
      ${hints.map((hint) => `
        <details class="risk-disclosure">
          <summary>
            <span>${escapeHtml(hint.title)}</span>
            <span class="risk-kind">${escapeHtml(hint.kind)}</span>
          </summary>
          <p>${escapeHtml(hint.detail)}</p>
        </details>
      `).join('')}
    </div>
  `;
}

function collisionsForBlock(blockId) {
  return (state.data?.scopeCollisions || []).filter((collision) => (
    collision.leftBlock === blockId || collision.rightBlock === blockId
  ));
}

function fileButton(filePath) {
  return `<button type="button" class="text-button" data-file-focus="${escapeHtml(filePath)}">${escapeHtml(filePath)}</button>`;
}

function bindInlineActions(root) {
  root.querySelectorAll('[data-select-block]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = 'map';
      selectBlock(button.dataset.selectBlock);
    });
  });
  root.querySelectorAll('[data-file-focus]').forEach((button) => {
    button.addEventListener('click', () => {
      state.fileFocus = button.dataset.fileFocus;
      state.search = '';
      elements.searchInput.value = '';
      render();
    });
  });
  root.querySelectorAll('[data-detail-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.detailTab = button.dataset.detailTab;
      state.whyOpen = false;
      render();
    });
  });
  root.querySelectorAll('[data-toggle-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = sectionKey(button.dataset.toggleSection);
      if (state.expandedSections.has(key)) {
        state.expandedSections.delete(key);
      } else {
        state.expandedSections.add(key);
      }
      render();
    });
  });
  root.querySelector('[data-toggle-why]')?.addEventListener('click', () => {
    state.whyOpen = !state.whyOpen;
    render();
  });
}

function renderDetail() {
  if (state.view === 'changelog') {
    const entry = selectedChangelogEntry();
    if (!entry) {
      elements.detailPanel.innerHTML = '<div class="empty-state">Kein Changelog-Eintrag</div>';
      return;
    }

    elements.detailPanel.innerHTML = `
      <h2 class="detail-title">${escapeHtml(entry.title)}</h2>
      <div class="detail-kicker">
        <span class="chip priority">${escapeHtml(entry.date || '-')}</span>
        <span class="chip priority">${escapeHtml(entry.typeLabel || '-')}</span>
        <span class="chip priority">${escapeHtml(entry.workstreamLabel || '-')}</span>
        ${entry.evidence?.hasEvidence ? '<span class="chip readiness-ready">Evidence</span>' : ''}
        ${entry.evidence?.hasNotChecked ? '<span class="chip open-risk">Not checked</span>' : ''}
      </div>
      <div class="detail-section">
        <h3>Kurzfazit</h3>
        <p class="detail-note">${escapeHtml(entry.summary || '-')}</p>
      </div>
      <div class="detail-section">
        <h3>Bloecke und Phasen</h3>
        <dl class="key-value">
          <dt>Bloecke</dt><dd>${entry.blockIds?.length ? entry.blockIds.map((blockId) => `<button type="button" class="text-button" data-select-block="${escapeHtml(blockId)}">${escapeHtml(blockId)}</button>`).join(' ') : '-'}</dd>
          <dt>Phasen</dt><dd>${entry.phaseIds?.length ? escapeHtml(entry.phaseIds.join(', ')) : '-'}</dd>
          <dt>Quelle</dt><dd>${escapeHtml(entry.source || '-')}</dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Eintrag</h3>
        <ul class="plain-list">${textItems(entry.bullets || [], 'changelogBullets', 12)}</ul>
        ${showMoreButton('changelogBullets', (entry.bullets || []).length, 12)}
      </div>
      <div class="detail-section">
        <h3>Evidence</h3>
        <div class="evidence-badges">${evidenceBadges(entry, 12) || '<span class="muted">keine Evidence-Badges</span>'}</div>
        <ul class="plain-list">${textItems(entry.evidence?.lines || [], 'changelogEvidenceLines', 8)}</ul>
        ${showMoreButton('changelogEvidenceLines', (entry.evidence?.lines || []).length, 8)}
      </div>
    `;
    bindInlineActions(elements.detailPanel);
    return;
  }

  const block = selectedBlock();
  if (!block) {
    elements.detailPanel.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
    return;
  }
  if (!DETAIL_TABS.some((tab) => tab.id === state.detailTab)) {
    state.detailTab = 'overview';
  }

  const activeLock = (state.data?.locks?.active || []).find((lock) => lock.blockId === block.id);
  const outgoingDeps = (state.data?.dependencies || []).filter((edge) => edge.from === block.id);
  const incomingDeps = (state.data?.dependencies || []).filter((edge) => edge.to === block.id);
  const collisions = collisionsForBlock(block.id);
  const progress = block.phaseProgress || { total: 0, done: 0, percent: 0 };
  const readiness = block.readiness || {};
  const impact = block.impact || {};
  const hints = riskHintItems(block, readiness, impact, collisions);
  const verification = block.verification || [];
  const sourceFindings = block.sourceFindings || [];
  const followups = block.relatedFollowupBlocks || [];
  const referenceFiles = block.scopeReferenceFiles || [];
  const explanation = block.explanation || {};
  const implemented = explanation.implementedHighlights || [];
  const openNextSteps = explanation.openNextSteps || [];
  const sourceSections = explanation.sourceSections || [];
  const completionCounts = explanation.completionCounts || {};
  let tabContent = '';

  if (state.detailTab === 'overview') {
    tabContent = `
      <div class="detail-section">
        <h3>Schnellbild</h3>
        <div class="summary-grid">
          <div class="summary-card"><span>${escapeHtml(readiness.label || '-')}</span><strong>Start</strong></div>
          <div class="summary-card"><span>${escapeHtml(progress.done)} / ${escapeHtml(progress.total)}</span><strong>Phasen</strong></div>
          <div class="summary-card"><span>${escapeHtml(collisions.length)}</span><strong>Kollisionen</strong></div>
          <div class="summary-card"><span>${escapeHtml(impact.score || 0)}</span><strong>Impact</strong></div>
        </div>
        <div class="progress-track detail-progress"><div class="progress-fill" style="width:${progressWidth(progress)}%"></div></div>
        <dl class="key-value">
          <dt>Phase</dt><dd>${escapeHtml(block.currentPhase || '-')}</dd>
          <dt>DoD</dt><dd>${escapeHtml(block.dodProgress?.done || 0)} / ${escapeHtml(block.dodProgress?.total || 0)}</dd>
          <dt>Arbeitsstrom</dt><dd>${escapeHtml(block.workstreamLabel || shortWorkstreamLabel(block))}</dd>
          <dt>Area</dt><dd>${escapeHtml(block.affectedArea || '-')}</dd>
          <dt>Plan</dt><dd>${escapeHtml(block.planFile || '-')}</dd>
          <dt>Gruppe</dt><dd>${escapeHtml(block.groupLabel || block.group || '-')}</dd>
        </dl>
      </div>
      ${explanation.brief ? `
        <div class="detail-section">
          <h3>Kurz erklaert</h3>
          <p class="detail-note">${escapeHtml(explanation.brief)}</p>
        </div>
      ` : ''}
      <div class="detail-section">
        <h3>Naechster sinnvoller Blick</h3>
        <p class="detail-note">${escapeHtml(readiness.recommendedText || readiness.reason || 'Keine Empfehlung im Export.')}</p>
      </div>
    `;
  }

  if (state.detailTab === 'explain') {
    tabContent = `
      <div class="detail-section">
        <h3>Worum geht es?</h3>
        <p class="detail-note">${escapeHtml(explanation.brief || 'Keine Kurzfassung im Plan gefunden.')}</p>
        ${explanation.background ? `<p class="detail-note detail-note-secondary">${escapeHtml(explanation.background)}</p>` : ''}
      </div>
      <div class="detail-section">
        <h3>Warum wichtig?</h3>
        <ul class="plain-list explain-list">${textItems(explanation.goal || [], 'explainGoals', 5)}</ul>
        ${showMoreButton('explainGoals', (explanation.goal || []).length, 5)}
      </div>
      <div class="detail-section">
        <h3>Was wurde umgesetzt?</h3>
        <div class="explain-meter">
          <span>${escapeHtml(completionCounts.dodDone ?? 0)} / ${escapeHtml(completionCounts.dodTotal ?? 0)} DoD</span>
          <span>${escapeHtml(completionCounts.phaseDone ?? 0)} / ${escapeHtml(completionCounts.phaseTotal ?? 0)} Phasenpunkte</span>
        </div>
        <ul class="plain-list explain-list">
          ${explanationItems(implemented, 'implementedHighlights', 5, block.status === 'done' ? 'keine Umsetzungspunkte gelesen' : 'noch nichts als umgesetzt markiert')}
        </ul>
        ${showMoreButton('implementedHighlights', implemented.length, 5)}
      </div>
      <div class="detail-section">
        <h3>Noch offen</h3>
        <ul class="plain-list explain-list">${explanationItems(openNextSteps, 'openNextSteps', 5, 'keine offenen Schritte gelesen')}</ul>
        ${showMoreButton('openNextSteps', openNextSteps.length, 5)}
      </div>
      <div class="detail-section">
        <h3>Grenzen</h3>
        <ul class="plain-list explain-list">${textItems(explanation.nonGoals || [], 'nonGoals', 4)}</ul>
        ${showMoreButton('nonGoals', (explanation.nonGoals || []).length, 4)}
      </div>
      <div class="detail-section">
        <h3>Quellabschnitte</h3>
        <div class="section-pills">
          ${sourceSections.length ? sourceSections.map((section) => `<span>${escapeHtml(section)}</span>`).join('') : '<span>keine</span>'}
        </div>
      </div>
    `;
  }

  if (state.detailTab === 'start') {
    tabContent = `
      <div class="detail-section">
        <h3>Startentscheidung ${helpButton('readiness')}</h3>
        <div class="why-row">
          <button type="button" class="pill-button" data-toggle-why aria-expanded="${state.whyOpen ? 'true' : 'false'}">Warum?</button>
          <span>${escapeHtml(readiness.reason || '-')}</span>
        </div>
        ${state.whyOpen ? `
          <div class="why-popover">
            <strong>${escapeHtml(readiness.label || '-')}</strong>
            <dl class="key-value">
              <dt>Harte Gates</dt><dd>${escapeHtml(readiness.openHardDependencyCount || 0)} offen</dd>
              <dt>Soft/unklar</dt><dd>${escapeHtml((readiness.openSoftDependencyCount || 0) + (readiness.openUnknownDependencyCount || 0))} offen</dd>
              <dt>Dependencies ${helpButton('dependency')}</dt><dd>${escapeHtml(readiness.dependencyCount || 0)}</dd>
              <dt>Consumer ${helpButton('consumer')}</dt><dd>${escapeHtml(readiness.consumerCount || 0)}</dd>
              <dt>Rank ${helpButton('rank')}</dt><dd>${readiness.recommendedRank ? `#${escapeHtml(readiness.recommendedRank)}` : '-'}</dd>
            </dl>
          </div>
        ` : ''}
        <dl class="key-value">
          <dt>Status</dt><dd>${escapeHtml(readiness.label || '-')}</dd>
          <dt>Lock</dt><dd>${activeLock ? `${escapeHtml(activeLock.phase || '')} ${escapeHtml(activeLock.status || '')}` : 'keiner'}</dd>
          <dt>Reihenfolge</dt><dd>${readiness.recommendedRank ? `#${escapeHtml(readiness.recommendedRank)}` : '-'}</dd>
          <dt>Begruendung</dt><dd>${escapeHtml(readiness.recommendedText || readiness.reason || '-')}</dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Dependencies ${helpButton('dependency')}</h3>
        <ul class="plain-list">${dependencyItems(limitedItems('dependencies', outgoingDeps, 8))}</ul>
        ${showMoreButton('dependencies', outgoingDeps.length, 8)}
      </div>
      <div class="detail-section">
        <h3>Consumer ${helpButton('consumer')}</h3>
        <ul class="plain-list">${consumerItems(limitedItems('consumers', incomingDeps, 8), block.id)}</ul>
        ${showMoreButton('consumers', incomingDeps.length, 8)}
      </div>
    `;
  }

  if (state.detailTab === 'scope') {
    tabContent = `
      <div class="detail-section">
        <h3>Impact ${helpButton('impact')}</h3>
        <dl class="key-value">
          <dt>Level</dt><dd>${escapeHtml(impact.level || 'low')} (${escapeHtml(impact.score || 0)} Punkte)</dd>
          <dt>Scope ${helpButton('scope')}</dt><dd>${escapeHtml(impact.scopeFileCount || 0)} Dateien, ${escapeHtml(impact.sharedFileCount || 0)} geteilt</dd>
          <dt>Governance</dt><dd>${escapeHtml(impact.governanceFileCount || 0)}</dd>
          <dt>Source/Test</dt><dd>${escapeHtml(impact.sourceFileCount || 0)} / ${escapeHtml(impact.testFileCount || 0)}</dd>
          <dt>Docs</dt><dd>${escapeHtml(impact.docsFileCount || 0)}</dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Scope-Kollisionen ${helpButton('collision')}</h3>
        <ul class="plain-list">${collisionItems(block.id, collisions, 'collisions', 7)}</ul>
        ${showMoreButton('collisions', collisions.length, 7)}
      </div>
      <div class="detail-section">
        <h3>Scope Files ${helpButton('scope')}</h3>
        <ul class="plain-list">${fileItems(block.scopeFiles, 'scopeFiles', 12)}</ul>
        ${showMoreButton('scopeFiles', (block.scopeFiles || []).length, 12)}
      </div>
      <div class="detail-section">
        <h3>Referenzen</h3>
        <ul class="plain-list">${fileItems(referenceFiles, 'referenceFiles', 8)}</ul>
        ${showMoreButton('referenceFiles', referenceFiles.length, 8)}
      </div>
    `;
  }

  if (state.detailTab === 'phases') {
    tabContent = `
      <div class="detail-section">
        <h3>Fortschritt ${helpButton('progress')}</h3>
        <div class="progress-track detail-progress"><div class="progress-fill" style="width:${progressWidth(progress)}%"></div></div>
        <dl class="key-value">
          <dt>Phase</dt><dd>${escapeHtml(block.currentPhase || '-')}</dd>
          <dt>Phasenpunkte</dt><dd>${escapeHtml(progress.done)} / ${escapeHtml(progress.total)}</dd>
          <dt>DoD</dt><dd>${escapeHtml(block.dodProgress?.done || 0)} / ${escapeHtml(block.dodProgress?.total || 0)}</dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Phasen</h3>
        ${phaseRows(block, 'phases', 9)}
        ${showMoreButton('phases', (block.phases || []).length, 9)}
      </div>
    `;
  }

  if (state.detailTab === 'risks') {
    tabContent = `
      <div class="detail-section">
        <h3>Risikohinweise</h3>
        ${riskHintMarkup(hints)}
      </div>
      <div class="detail-section">
        <h3>Verification ${helpButton('evidence')}</h3>
        <ul class="plain-list">${textItems(verification, 'verification', 8)}</ul>
        ${showMoreButton('verification', verification.length, 8)}
      </div>
      <div class="detail-section">
        <h3>Findings</h3>
        <ul class="plain-list">
          ${limitedItems('findings', sourceFindings, 6).length ? limitedItems('findings', sourceFindings, 6).map((finding) => `<li>${escapeHtml(finding.id || '')} ${escapeHtml(finding.severity || '')} ${escapeHtml(finding.finding || finding.title || finding)}</li>`).join('') : '<li class="muted">keine blocknahen Findings</li>'}
        </ul>
        ${showMoreButton('findings', sourceFindings.length, 6)}
      </div>
      <div class="detail-section">
        <h3>Follow-ups</h3>
        <ul class="plain-list">${followups.length ? limitedItems('followups', followups, 8).map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li class="muted">keine</li>'}</ul>
        ${showMoreButton('followups', followups.length, 8)}
      </div>
    `;
  }

  elements.detailPanel.innerHTML = `
    <h2 class="detail-title">${escapeHtml(block.id)} ${escapeHtml(block.title)}</h2>
    <div class="detail-kicker">
      <span class="chip ${escapeHtml(block.status)}">${escapeHtml(block.status)}</span>
      <span class="chip priority">${escapeHtml(block.priority || '-')}</span>
      <span class="chip priority" title="${escapeHtml(block.workstreamLabel || '')}">${escapeHtml(shortWorkstreamLabel(block))}</span>
      <span class="chip readiness-${escapeHtml(readiness.status || 'unknown')}">${escapeHtml(readiness.label || '-')}</span>
      <span class="chip impact-${escapeHtml(impact.level || 'low')}">Impact ${escapeHtml(impact.level || 'low')}</span>
      ${activeLock ? '<span class="chip locked">lock</span>' : ''}
    </div>
    ${detailTabsMarkup()}
    <div class="detail-tab-panel">${tabContent}</div>
  `;

  bindInlineActions(elements.detailPanel);
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
            <td><button type="button" class="text-button" data-select-block="${escapeHtml(collision.leftBlock)}">${escapeHtml(collision.leftBlock)}</button></td>
            <td><button type="button" class="text-button" data-select-block="${escapeHtml(collision.rightBlock)}">${escapeHtml(collision.rightBlock)}</button></td>
            <td>${escapeHtml(collision.sharedFileCount)}</td>
            <td>${collision.sharedFiles.slice(0, 5).map(fileButton).join(' ')}${collision.sharedFiles.length > 5 ? ' ...' : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  bindInlineActions(elements.collisionsTable);
}

function evidenceBadges(entry, limit = 4) {
  const commands = entry.evidence?.commands || [];
  const badges = commands.slice(0, limit).map((command) => {
    const result = String(command.result || 'mentioned').toLowerCase();
    return `<span class="evidence-badge ${escapeHtml(result)}">${escapeHtml(command.result || 'MENTIONED')}</span>`;
  });

  if (entry.evidence?.hasNotChecked) {
    badges.push('<span class="evidence-badge not-checked">NOT CHECKED</span>');
  }
  if (!badges.length && entry.evidence?.hasEvidence) {
    badges.push('<span class="evidence-badge mentioned">EVIDENCE</span>');
  }
  return badges.join('');
}

function renderChangelogView() {
  const entries = visibleChangelogEntries();
  if (!state.selectedChangelogId || !entries.some((entry) => entry.id === state.selectedChangelogId)) {
    state.selectedChangelogId = entries[0]?.id || null;
  }

  const activeId = state.selectedChangelogId;
  elements.changelogPanel.innerHTML = `
    <aside class="changelog-timeline" aria-label="Changelog Timeline">
      ${entries.map((entry) => `
        <button type="button" class="timeline-dot${entry.id === activeId ? ' is-active' : ''}" data-changelog-id="${escapeHtml(entry.id)}">
          <span class="timeline-date">${escapeHtml(entry.date || 'ohne Datum')}</span>
          <span class="timeline-label">${escapeHtml(entry.blockIds?.[0] || entry.typeLabel || 'Notiz')}</span>
        </button>
      `).join('') || '<p class="muted">keine Eintraege</p>'}
    </aside>
    <div class="changelog-cards">
      ${entries.map((entry) => `
        <button type="button" class="changelog-card${entry.id === activeId ? ' is-active' : ''}" data-changelog-id="${escapeHtml(entry.id)}">
          <span class="changelog-card-meta">
            <span class="chip priority">${escapeHtml(entry.date || '-')}</span>
            <span class="chip priority">${escapeHtml(entry.typeLabel || '-')}</span>
            <span class="chip priority">${escapeHtml(entry.workstreamLabel || '-')}</span>
            ${(entry.blockIds || []).slice(0, 4).map((blockId) => `<span class="chip">${escapeHtml(blockId)}</span>`).join('')}
          </span>
          <h2 class="changelog-card-title">${escapeHtml(entry.title)}</h2>
          <p class="changelog-card-summary">${escapeHtml(entry.summary || 'Keine Zusammenfassung gelesen.')}</p>
          <span class="evidence-badges">${evidenceBadges(entry)}</span>
        </button>
      `).join('') || '<div class="empty-state">Keine Changelog-Eintraege fuer diese Filter</div>'}
    </div>
  `;

  elements.changelogPanel.querySelectorAll('[data-changelog-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedChangelogId = button.dataset.changelogId;
      state.view = 'changelog';
      render();
    });
  });
}

function renderHealthView() {
  const scorecard = state.data?.scorecard || {};
  const coverage = state.data?.coverage || {};
  const graph = state.data?.graph || {};
  const findings = state.data?.openFindings || [];
  const activeLocks = state.data?.locks?.active || [];

  elements.healthPanel.innerHTML = `
    <section class="health-panel">
      <h2>Graph ${helpButton('health')}</h2>
      <dl class="key-value">
        <dt>Score</dt><dd>${escapeHtml(scorecard.score ?? '-')}</dd>
        <dt>Status</dt><dd>${escapeHtml(scorecard.status || '-')}</dd>
        <dt>Nodes</dt><dd>${escapeHtml(graph.nodeCount ?? '-')}</dd>
        <dt>Edges</dt><dd>${escapeHtml(graph.edgeCount ?? '-')}</dd>
      </dl>
    </section>
    <section class="health-panel">
      <h2>Coverage ${helpButton('evidence')}</h2>
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
  document.querySelector('#changelogView').classList.toggle('is-active', state.view === 'changelog');
  document.querySelector('#collisionsView').classList.toggle('is-active', state.view === 'collisions');
  document.querySelector('#healthView').classList.toggle('is-active', state.view === 'health');
}

function renderEmpty() {
  elements.metrics.innerHTML = '';
  elements.decisionBar.innerHTML = '';
  elements.blockList.innerHTML = '';
  elements.planSvg.innerHTML = '';
  elements.changelogPanel.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
  elements.detailPanel.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
  elements.collisionsTable.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
  elements.healthPanel.innerHTML = '<div class="empty-state">Kein Export geladen</div>';
  renderSources();
}

function render() {
  updateViewPanels();
  renderSources();
  if (!state.data) {
    renderEmpty();
    return;
  }

  if (!state.selectedId || !visibleBlocks().some((block) => block.id === state.selectedId)) {
    state.selectedId = visibleBlocks()[0]?.id || null;
  }
  if (state.lastSelectedId !== state.selectedId) {
    state.whyOpen = false;
    state.lastSelectedId = state.selectedId;
  }

  renderMetrics();
  renderDecisionBar();
  renderBlockList();
  renderMap();
  renderChangelogView();
  renderDetail();
  renderCollisionView();
  renderHealthView();
  bindHelpButtons(document);
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
  elements.legendToggle.addEventListener('click', () => {
    const isOpen = elements.legendPanel.hidden;
    elements.legendPanel.hidden = !isOpen;
    elements.legendToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    elements.legendToggle.classList.toggle('is-active', isOpen);
  });

  [
    [elements.showDependencies, 'dependencies'],
    [elements.showCollisions, 'collisions'],
    [elements.showImpact, 'impact'],
    [elements.showProgress, 'progress'],
  ].forEach(([checkbox, key]) => {
    checkbox.addEventListener('change', () => {
      state.overlays[key] = checkbox.checked;
      renderMap();
    });
  });

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
  elements.workstreamFilter.addEventListener('change', () => {
    state.workstream = elements.workstreamFilter.value;
    render();
  });
  elements.readinessFilter.addEventListener('change', () => {
    state.readiness = elements.readinessFilter.value;
    render();
  });
  elements.changelogTypeFilter.addEventListener('change', () => {
    state.changelogType = elements.changelogTypeFilter.value;
    state.view = 'changelog';
    render();
  });
  elements.changelogEvidenceFilter.addEventListener('change', () => {
    state.changelogEvidence = elements.changelogEvidenceFilter.value;
    state.view = 'changelog';
    render();
  });
  elements.focusToggle.addEventListener('click', () => {
    state.focusMode = !state.focusMode;
    elements.focusToggle.classList.toggle('is-active', state.focusMode);
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
    state.workstream = 'all';
    state.changelogType = 'all';
    state.changelogEvidence = 'all';
    state.selectedChangelogId = null;
    elements.sourceMeta.textContent = `${data.contract || 'plan-map'} - ${file.name}`;
    updateFilterOptions();
    render();
  });

  window.addEventListener('resize', () => {
    closeHelpPopover();
    if (state.view === 'map') {
      renderMap();
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.help-button') && !event.target.closest('.help-popover')) {
      closeHelpPopover();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHelpPopover();
    }
  });

  window.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type === 'curvios.map-tools:set-help-visible') {
      setHelpVisible(message.visible !== false);
      return;
    }
    if (message.type !== 'curvios.plan-map:set-filter') {
      return;
    }
    if (message.view) {
      state.view = message.view;
    }
    if (message.workstream) {
      state.workstream = message.workstream;
      elements.workstreamFilter.value = message.workstream;
    }
    render();
  });
}

bindEvents();
bindHelpButtons(document);
loadDefaultData();
