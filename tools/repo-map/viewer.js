const DEFAULT_DATA_URLS = [
  '../../tmp/repo-map/repo-map.json',
  './repo-map.json',
  './repo-map.generated.json',
];

const state = {
  data: null,
  view: 'topology',
  selectedFolder: '',
  selectedPath: '',
  search: '',
  folder: 'all',
  classification: 'all',
  coverage: 'all',
};

const elements = {
  sourceMeta: document.querySelector('#sourceMeta'),
  fileInput: document.querySelector('#fileInput'),
  searchInput: document.querySelector('#searchInput'),
  folderFilter: document.querySelector('#folderFilter'),
  classificationFilter: document.querySelector('#classificationFilter'),
  coverageFilter: document.querySelector('#coverageFilter'),
  folderList: document.querySelector('#folderList'),
  metrics: document.querySelector('#metrics'),
  repoSvg: document.querySelector('#repoSvg'),
  topologyTables: document.querySelector('#topologyTables'),
  coveragePanel: document.querySelector('#coveragePanel'),
  plansPanel: document.querySelector('#plansPanel'),
  flowsPanel: document.querySelector('#flowsPanel'),
  detailPanel: document.querySelector('#detailPanel'),
  sourcesFootnote: document.querySelector('#sourcesFootnote'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function number(value) {
  return new Intl.NumberFormat('de-DE').format(Number(value || 0));
}

function percent(value) {
  return `${Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })}%`;
}

function sourceLabel(key) {
  const labels = {
    knowledgeGraph: 'Graph',
    knowledgeGraphCoverage: 'Coverage',
    knowledgeGraphScorecard: 'Scorecard',
    architectureReport: 'Architektur',
    trackedFiles: 'Git',
  };
  return labels[key] || key;
}

function statusBadge(label, tone = '') {
  return `<span class="badge ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function fileCoverageTone(file) {
  if (!file.inCoverage) return 'warn';
  if (file.excludedFromCoverage) return 'warn';
  return file.covered ? 'good' : 'bad';
}

function fileCoverageLabel(file) {
  if (!file.inCoverage) return 'unknown';
  if (file.excludedFromCoverage) return 'excluded';
  return file.covered ? 'covered' : 'open';
}

function activeFiles() {
  const query = state.search.trim().toLowerCase();
  return (state.data?.files || []).filter((file) => {
    if (state.folder !== 'all' && file.topLevel !== state.folder) return false;
    if (state.classification !== 'all' && file.classification !== state.classification) return false;
    if (state.coverage === 'uncovered' && (!file.inCoverage || file.covered || file.excludedFromCoverage)) return false;
    if (state.coverage === 'covered' && !file.covered) return false;
    if (state.coverage === 'excluded' && !file.excludedFromCoverage) return false;
    if (state.coverage === 'unknown' && file.inCoverage) return false;
    if (!query) return true;
    const haystack = [
      file.path,
      file.classification,
      file.topLevel,
      file.scopeBlocks?.join(' '),
      file.criticalPaths?.join(' '),
      file.surfaces?.join(' '),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function activeFolders() {
  const files = activeFiles();
  const folderIds = new Set(files.map((file) => file.topLevel));
  return (state.data?.folders || []).filter((folder) => folderIds.has(folder.id));
}

function selectFolder(folderId) {
  state.selectedFolder = folderId;
  state.selectedPath = '';
  state.folder = folderId || 'all';
  elements.folderFilter.value = state.folder;
  render();
}

function selectFile(filePath) {
  state.selectedPath = filePath;
  state.selectedFolder = '';
  render();
}

function renderSources() {
  const entries = Object.entries(state.data?.sources || {}).filter(([, value]) => value);
  elements.sourcesFootnote.textContent = entries.length
    ? `Quellen: ${entries.map(([key, value]) => `${sourceLabel(key)}=${value}`).join(' | ')}`
    : '';
}

function renderFilters() {
  const folders = [...(state.data?.folders || [])].sort((left, right) => left.id.localeCompare(right.id));
  const classifications = [...new Set((state.data?.files || []).map((file) => file.classification))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  elements.folderFilter.innerHTML = '<option value="all">Alle</option>'
    + folders.map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.label)}</option>`).join('');
  elements.classificationFilter.innerHTML = '<option value="all">Alle</option>'
    + classifications.map((classification) => `<option value="${escapeHtml(classification)}">${escapeHtml(classification)}</option>`).join('');
  elements.folderFilter.value = state.folder;
  elements.classificationFilter.value = state.classification;
}

function renderMetrics() {
  const summary = state.data?.summary || {};
  const coverage = summary.coverage || {};
  const scorecard = summary.scorecard || {};
  const metrics = [
    ['Files', number(summary.fileCount)],
    ['Adjusted Coverage', percent(coverage.adjustedCoveragePercent)],
    ['Aktiv offen', number(summary.activeUncoveredFileCount)],
    ['Graph Score', scorecard.score == null ? '-' : String(scorecard.score)],
    ['Critical Paths', number(summary.criticalPathCount)],
    ['Architekturflags', number(summary.architectureFlaggedFileCount)],
  ];
  elements.metrics.innerHTML = metrics.map(([label, value]) => `
    <section class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </section>
  `).join('');
}

function renderFolderList() {
  const rows = activeFolders().map((folder) => {
    const active = state.selectedFolder === folder.id || (state.folder === folder.id && !state.selectedPath);
    return `
      <button type="button" class="folder-row ${active ? 'is-active' : ''}" data-select-folder="${escapeHtml(folder.id)}">
        <strong>${escapeHtml(folder.label)}</strong>
        <span>${number(folder.fileCount)} Files | ${number(folder.uncoveredActiveCount)} offen | ${number(folder.disallowedArchitectureFlagCount)} Flags</span>
      </button>
    `;
  }).join('');

  elements.folderList.innerHTML = rows || '<div class="muted">Keine Treffer</div>';
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function folderRiskClass(folder) {
  if (folder.uncoveredActiveCount >= 20 || folder.disallowedArchitectureFlagCount > 0) return 'risk-high';
  if (folder.uncoveredActiveCount > 0 || folder.architectureFlagCount > 0) return 'risk-medium';
  return 'risk-low';
}

function renderTopologyMap() {
  const folders = activeFolders().slice(0, 22);
  const width = Math.max(340, Math.round(elements.repoSvg.clientWidth || 980));
  const columns = width < 620 ? 2 : width < 900 ? 3 : 4;
  const cellWidth = Math.floor((width - 36) / columns);
  const cellHeight = 92;
  const nodeWidth = Math.max(142, cellWidth - 26);
  const height = Math.max(260, Math.ceil(Math.max(1, folders.length) / columns) * cellHeight + 34);
  elements.repoSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  elements.repoSvg.style.height = `${Math.min(760, height)}px`;
  elements.repoSvg.innerHTML = '';

  folders.forEach((folder, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = 18 + col * cellWidth;
    const y = 18 + row * cellHeight;
    const group = svgElement('g', {
      class: `folder-node ${state.selectedFolder === folder.id ? 'is-active' : ''}`,
      'data-select-folder': folder.id,
      transform: `translate(${x}, ${y})`,
    });
    group.appendChild(svgElement('rect', { width: nodeWidth, height: 70, rx: 8 }));
    group.appendChild(svgElement('circle', {
      class: folderRiskClass(folder),
      cx: 16,
      cy: 18,
      r: 6,
    }));
    const title = svgElement('text', { x: 30, y: 23 });
    const titleLimit = width < 620 ? 15 : 24;
    title.textContent = folder.label.length > titleLimit ? `${folder.label.slice(0, titleLimit - 2)}...` : folder.label;
    group.appendChild(title);
    const files = svgElement('text', { class: 'sub', x: 14, y: 46 });
    files.textContent = `${folder.fileCount} Files | ${folder.uncoveredActiveCount} offen`;
    group.appendChild(files);
    const flags = svgElement('text', { class: 'sub', x: 14, y: 62 });
    flags.textContent = `${percent(folder.coveragePercent)} covered | ${folder.architectureFlagCount} Arch`;
    group.appendChild(flags);
    elements.repoSvg.appendChild(group);
  });
}

function fileButton(file) {
  return `
    <button type="button" class="file-link" data-select-file="${escapeHtml(file.path)}">
      <strong>${escapeHtml(file.path)}</strong>
      <span>${escapeHtml(file.classification)} | ${escapeHtml(fileCoverageLabel(file))}</span>
    </button>
  `;
}

function renderFileRows(files, limit = 12) {
  const rows = files.slice(0, limit).map((file) => `
    <tr>
      <td>${fileButton(file)}</td>
      <td>${statusBadge(fileCoverageLabel(file), fileCoverageTone(file))}</td>
      <td>${escapeHtml(file.scopeBlocks.slice(0, 4).join(', ') || '-')}</td>
      <td>${escapeHtml(file.criticalPaths.join(', ') || '-')}</td>
    </tr>
  `).join('');

  return `
    <table>
      <thead><tr><th>Datei</th><th>Coverage</th><th>Blocks</th><th>Flows</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="muted">Keine Treffer</td></tr>'}</tbody>
    </table>
  `;
}

function renderTopologyTables() {
  const files = activeFiles();
  const riskFiles = files
    .filter((file) => file.inCoverage && !file.covered && !file.excludedFromCoverage)
    .slice(0, 12);
  const architectureFiles = files
    .filter((file) => file.architectureFlagCount > 0)
    .sort((left, right) => right.disallowedArchitectureFlagCount - left.disallowedArchitectureFlagCount)
    .slice(0, 12);

  elements.topologyTables.innerHTML = `
    <section class="table-section">
      <h2>Aktiv offen</h2>
      ${renderFileRows(riskFiles)}
    </section>
    <section class="table-section">
      <h2>Architektur</h2>
      ${renderFileRows(architectureFiles)}
    </section>
  `;
}

function renderCoverageView() {
  const folders = activeFolders().slice(0, 18).map((folder) => `
    <tr>
      <td><button type="button" class="text-button" data-select-folder="${escapeHtml(folder.id)}">${escapeHtml(folder.label)}</button></td>
      <td>${number(folder.coverageFileCount)}</td>
      <td>${percent(folder.coveragePercent)}</td>
      <td>${number(folder.uncoveredActiveCount)}</td>
      <td>${number(folder.excludedCount)}</td>
    </tr>
  `).join('');

  const files = activeFiles()
    .filter((file) => file.inCoverage && !file.covered && !file.excludedFromCoverage)
    .slice(0, 40);

  elements.coveragePanel.innerHTML = `
    <section class="table-section">
      <h2>Bereiche</h2>
      <table>
        <thead><tr><th>Bereich</th><th>Coverage-Files</th><th>Covered</th><th>Offen</th><th>Excluded</th></tr></thead>
        <tbody>${folders}</tbody>
      </table>
    </section>
    <section class="table-section">
      <h2>Aktive Luecken</h2>
      ${renderFileRows(files, 40)}
    </section>
  `;
}

function renderPlansView() {
  const blocks = (state.data?.blocks || [])
    .filter((block) => state.search ? `${block.id} ${block.title}`.toLowerCase().includes(state.search.toLowerCase()) : true)
    .slice(0, 40)
    .map((block) => `
      <tr>
        <td>${escapeHtml(block.id)}</td>
        <td>${escapeHtml(block.title)}</td>
        <td>${statusBadge(block.status, block.status === 'done' ? 'good' : block.status === 'planned' ? 'warn' : 'accent')}</td>
        <td>${escapeHtml(block.currentPhase || '-')}</td>
        <td>${escapeHtml((block.source || []).join(', ') || '-')}</td>
      </tr>
    `).join('');

  const collisions = (state.data?.scopeCollisions || []).slice(0, 30).map((collision) => `
    <tr>
      <td>${escapeHtml(collision.leftBlock)}</td>
      <td>${escapeHtml(collision.rightBlock)}</td>
      <td>${number(collision.sharedFileCount)}</td>
      <td>${collision.sharedFiles.slice(0, 5).map((filePath) => `<button type="button" class="text-button" data-select-file="${escapeHtml(filePath)}">${escapeHtml(filePath)}</button>`).join('<br>')}</td>
    </tr>
  `).join('');

  elements.plansPanel.innerHTML = `
    <section class="table-section">
      <h2>Blocks</h2>
      <table>
        <thead><tr><th>ID</th><th>Titel</th><th>Status</th><th>Phase</th><th>Quelle</th></tr></thead>
        <tbody>${blocks}</tbody>
      </table>
    </section>
    <section class="table-section">
      <h2>Scope-Kollisionen</h2>
      <table>
        <thead><tr><th>Links</th><th>Rechts</th><th>Dateien</th><th>Beispiele</th></tr></thead>
        <tbody>${collisions}</tbody>
      </table>
    </section>
  `;
}

function renderFlowsView() {
  const panels = (state.data?.criticalPaths || []).map((flow) => `
    <section class="flow-panel">
      <h2>${escapeHtml(flow.id)}</h2>
      <div class="badge-row">
        ${statusBadge(flow.status, flow.status === 'ok' ? 'good' : 'warn')}
        ${statusBadge(`${number(flow.nodeCount)} nodes`, 'accent')}
        ${statusBadge(`${number(flow.files.length)} files`)}
      </div>
      <ul class="mini-list">
        ${flow.files.slice(0, 8).map((filePath) => `<li><button type="button" class="text-button" data-select-file="${escapeHtml(filePath)}">${escapeHtml(filePath)}</button></li>`).join('') || '<li class="muted">Keine Dateien</li>'}
      </ul>
    </section>
  `).join('');

  elements.flowsPanel.innerHTML = `<div class="flow-grid">${panels}</div>`;
}

function selectedFile() {
  return (state.data?.files || []).find((file) => file.path === state.selectedPath) || null;
}

function selectedFolder() {
  return (state.data?.folders || []).find((folder) => folder.id === state.selectedFolder || folder.id === state.folder) || null;
}

function renderDetail() {
  const file = selectedFile();
  if (file) {
    elements.detailPanel.innerHTML = `
      <h2 class="detail-title">${escapeHtml(file.path)}</h2>
      <div class="badge-row">
        ${statusBadge(file.classification)}
        ${statusBadge(fileCoverageLabel(file), fileCoverageTone(file))}
        ${file.criticalPaths.length ? statusBadge('critical', 'accent') : ''}
        ${file.architectureFlagCount ? statusBadge(`${file.architectureFlagCount} arch`, file.disallowedArchitectureFlagCount ? 'bad' : 'warn') : ''}
      </div>
      <section class="detail-section">
        <h2>Datei</h2>
        <dl>
          <dt>Bereich</dt><dd>${escapeHtml(file.topLevel)}</dd>
          <dt>Graph</dt><dd>${escapeHtml(file.existsInGraph ? 'yes' : 'no')}</dd>
          <dt>Sources</dt><dd>${escapeHtml(file.graphSources.join(', ') || '-')}</dd>
          <dt>Coverage</dt><dd>${escapeHtml(file.coverageSources.join(', ') || '-')}</dd>
        </dl>
      </section>
      <section class="detail-section">
        <h2>Bezug</h2>
        <dl>
          <dt>Blocks</dt><dd>${escapeHtml(file.scopeBlocks.join(', ') || '-')}</dd>
          <dt>Flows</dt><dd>${escapeHtml(file.criticalPaths.join(', ') || '-')}</dd>
          <dt>Surfaces</dt><dd>${escapeHtml(file.surfaces.join(', ') || '-')}</dd>
        </dl>
      </section>
      <section class="detail-section">
        <h2>Architektur</h2>
        <ul class="mini-list">
          ${file.architectureFlags.length ? file.architectureFlags.map((flag) => `<li>${escapeHtml(flag.kind)}${flag.line ? `:${escapeHtml(flag.line)}` : ''}${flag.target ? ` -> ${escapeHtml(flag.target)}` : ''}</li>`).join('') : '<li class="muted">Keine Flags</li>'}
        </ul>
      </section>
    `;
    return;
  }

  const folder = selectedFolder();
  if (folder) {
    elements.detailPanel.innerHTML = `
      <h2 class="detail-title">${escapeHtml(folder.label)}</h2>
      <div class="badge-row">
        ${statusBadge(`${number(folder.fileCount)} files`, 'accent')}
        ${statusBadge(`${number(folder.uncoveredActiveCount)} offen`, folder.uncoveredActiveCount ? 'bad' : 'good')}
        ${statusBadge(`${number(folder.architectureFlagCount)} arch`, folder.architectureFlagCount ? 'warn' : 'good')}
      </div>
      <section class="detail-section">
        <h2>Bereich</h2>
        <dl>
          <dt>Coverage</dt><dd>${percent(folder.coveragePercent)}</dd>
          <dt>Graph-Files</dt><dd>${number(folder.graphFileCount)}</dd>
          <dt>Critical</dt><dd>${number(folder.criticalFileCount)}</dd>
          <dt>Unbekannt</dt><dd>${number(folder.unknownCoverageCount)}</dd>
        </dl>
      </section>
      <section class="detail-section">
        <h2>Klassen</h2>
        <ul class="mini-list">
          ${Object.entries(folder.classifications).map(([key, value]) => `<li>${escapeHtml(key)}: ${number(value)}</li>`).join('')}
        </ul>
      </section>
    `;
    return;
  }

  elements.detailPanel.innerHTML = `
    <h2 class="detail-title">Repo</h2>
    <section class="detail-section">
      <h2>Status</h2>
      <dl>
        <dt>Contract</dt><dd>${escapeHtml(state.data?.contract || '-')}</dd>
        <dt>Generated</dt><dd>${escapeHtml(state.data?.generatedAt || '-')}</dd>
        <dt>Read-only</dt><dd>${escapeHtml(state.data?.readOnly ? 'yes' : 'no')}</dd>
      </dl>
    </section>
  `;
}

function renderCurrentView() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === state.view);
  });
  document.querySelector('#topologyView').classList.toggle('is-active', state.view === 'topology');
  document.querySelector('#coverageView').classList.toggle('is-active', state.view === 'coverage');
  document.querySelector('#plansView').classList.toggle('is-active', state.view === 'plans');
  document.querySelector('#flowsView').classList.toggle('is-active', state.view === 'flows');

  if (state.view === 'topology') {
    renderTopologyMap();
    renderTopologyTables();
  } else if (state.view === 'coverage') {
    renderCoverageView();
  } else if (state.view === 'plans') {
    renderPlansView();
  } else if (state.view === 'flows') {
    renderFlowsView();
  }
}

function render() {
  if (!state.data) {
    elements.metrics.innerHTML = '';
    elements.folderList.innerHTML = '';
    elements.detailPanel.innerHTML = '<p class="muted">Kein Export geladen</p>';
    return;
  }

  renderMetrics();
  renderFolderList();
  renderCurrentView();
  renderDetail();
  renderSources();
}

function hydrateData(data, sourceName) {
  if (!data || data.contract !== 'curvios.repo-map.v1') {
    throw new Error(`Unsupported repo-map contract: ${data?.contract || '<empty>'}`);
  }
  state.data = data;
  state.selectedFolder = data.folders?.[0]?.id || '';
  state.selectedPath = '';
  state.folder = 'all';
  state.classification = 'all';
  state.coverage = 'all';
  elements.sourceMeta.textContent = `${data.contract} - ${data.generatedAt || sourceName}`;
  renderFilters();
  render();
}

async function loadDefaultData() {
  for (const url of DEFAULT_DATA_URLS) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      hydrateData(await response.json(), url);
      return;
    } catch {
      // File input remains available when direct local fetch is blocked.
    }
  }
  render();
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    render();
  });
});

elements.searchInput.addEventListener('input', () => {
  state.search = elements.searchInput.value || '';
  render();
});

elements.folderFilter.addEventListener('change', () => {
  state.folder = elements.folderFilter.value;
  state.selectedFolder = state.folder === 'all' ? '' : state.folder;
  state.selectedPath = '';
  render();
});

elements.classificationFilter.addEventListener('change', () => {
  state.classification = elements.classificationFilter.value;
  render();
});

elements.coverageFilter.addEventListener('change', () => {
  state.coverage = elements.coverageFilter.value;
  render();
});

elements.fileInput.addEventListener('change', async () => {
  const file = elements.fileInput.files?.[0];
  if (!file) return;
  hydrateData(JSON.parse(await file.text()), file.name);
});

document.addEventListener('click', (event) => {
  const folderButton = event.target.closest('[data-select-folder]');
  if (folderButton) {
    selectFolder(folderButton.dataset.selectFolder);
    return;
  }

  const fileButtonTarget = event.target.closest('[data-select-file]');
  if (fileButtonTarget) {
    selectFile(fileButtonTarget.dataset.selectFile);
  }
});

loadDefaultData();
