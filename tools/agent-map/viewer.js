const DATA_URLS = [
  '../../tmp/agent-map/agent-map.json',
  './agent-map.json',
  './agent-map.generated.json',
];

const state = {
  data: null,
  activeView: 'path',
  selectedId: 'entry:agents',
  search: '',
  workflowFilter: 'all',
  layerFilter: 'all',
  infoVisible: true,
};

const elements = {
  sourceMeta: document.querySelector('#sourceMeta'),
  fileInput: document.querySelector('#fileInput'),
  searchInput: document.querySelector('#searchInput'),
  workflowFilter: document.querySelector('#workflowFilter'),
  layerFilter: document.querySelector('#layerFilter'),
  taskList: document.querySelector('#taskList'),
  metrics: document.querySelector('#metrics'),
  svg: document.querySelector('#agentSvg'),
  pathTables: document.querySelector('#pathTables'),
  workflowPanel: document.querySelector('#workflowPanel'),
  skillsPanel: document.querySelector('#skillsPanel'),
  checksPanel: document.querySelector('#checksPanel'),
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function byId(items) {
  return new Map(toArray(items).map((item) => [item.id, item]));
}

function nodeById() {
  return byId(state.data?.nodes);
}

function workflowById() {
  return byId(state.data?.workflows);
}

function taskByNodeId(nodeId) {
  return state.data?.tasks?.find((task) => `task:${task.id}` === nodeId) || null;
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function textMatches(item, needle) {
  if (!needle) return true;
  return normalizeText([
    item.id,
    item.label,
    item.path,
    item.description,
    item.command,
    item.workflowIds?.join(' '),
    item.ruleIds?.join(' '),
    item.skillIds?.join(' '),
    item.checkIds?.join(' '),
  ].filter(Boolean).join(' ')).includes(needle);
}

function truncate(value, max = 28) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function setView(viewId) {
  state.activeView = viewId;
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewId);
  });
  document.querySelectorAll('.view-panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === `${viewId}View`);
  });
}

function outgoingEdges(id, type = null) {
  return toArray(state.data?.edges).filter((edge) => (
    edge.from === id && (!type || edge.type === type)
  ));
}

function incomingEdges(id, type = null) {
  return toArray(state.data?.edges).filter((edge) => (
    edge.to === id && (!type || edge.type === type)
  ));
}

function relatedNodeIds(id) {
  return new Set([
    id,
    ...outgoingEdges(id).map((edge) => edge.to),
    ...incomingEdges(id).map((edge) => edge.from),
  ]);
}

function renderMetrics() {
  const summary = state.data?.summary || {};
  const entries = [
    ['Tasks', summary.taskCount],
    ['Workflows', summary.workflowCount],
    ['Rules', summary.ruleCount],
    ['Skills', summary.skillCount],
    ['Checks', summary.checkCount],
    ['Kanten', summary.edgeCount],
  ];
  elements.metrics.innerHTML = entries.map(([label, value]) => `
    <div class="metric"><strong>${escapeHtml(value ?? 0)}</strong><span>${escapeHtml(label)}</span></div>
  `).join('');
}

function filteredTasks() {
  const needle = normalizeText(state.search);
  return toArray(state.data?.tasks).filter((task) => {
    const workflowMatch = state.workflowFilter === 'all'
      || toArray(task.workflowIds).includes(state.workflowFilter);
    return workflowMatch && textMatches(task, needle);
  });
}

function renderWorkflowFilter() {
  const active = state.workflowFilter;
  elements.workflowFilter.innerHTML = [
    '<option value="all">Alle</option>',
    ...toArray(state.data?.workflows).map((workflow) => (
      `<option value="${escapeHtml(workflow.id)}">${escapeHtml(workflow.id)}</option>`
    )),
  ].join('');
  elements.workflowFilter.value = active;
}

function renderTaskList() {
  const tasks = filteredTasks();
  elements.taskList.innerHTML = tasks.map((task) => {
    const workflowText = toArray(task.workflowIds).join(', ') || 'kein Workflow';
    return `
      <button type="button" class="task-button ${state.selectedId === `task:${task.id}` ? 'is-active' : ''}" data-select-id="task:${escapeHtml(task.id)}">
        <strong>${escapeHtml(task.label)}</strong>
        <span>${escapeHtml(workflowText)}</span>
      </button>
    `;
  }).join('');
}

function layerNodes() {
  const nodes = toArray(state.data?.nodes);
  const selectedTask = taskByNodeId(state.selectedId);
  if (!selectedTask) {
    return nodes.filter((node) => (
      ['entry', 'workflow', 'rule', 'skill', 'check'].includes(node.layer)
      && (state.layerFilter === 'all' || node.layer === state.layerFilter)
      && textMatches(node, normalizeText(state.search))
    ));
  }

  const allowedIds = new Set([state.selectedId]);
  for (const workflowId of toArray(selectedTask.workflowIds)) {
    allowedIds.add(`workflow:${workflowId}`);
    const workflow = workflowById().get(workflowId);
    for (const ruleId of toArray(workflow?.ruleIds)) allowedIds.add(`rule:${ruleId}`);
    for (const skillId of toArray(workflow?.skillIds)) allowedIds.add(`skill:${skillId}`);
    for (const checkId of toArray(workflow?.checkIds)) allowedIds.add(`check:${checkId}`);
  }
  return nodes.filter((node) => (
    allowedIds.has(node.id)
    && (state.layerFilter === 'all' || node.layer === state.layerFilter)
  ));
}

function layoutGraph(nodes) {
  const columns = [
    { id: 'task', label: 'Aufgabe', x: 30 },
    { id: 'workflow', label: 'Workflow', x: 230 },
    { id: 'rule', label: 'Rules', x: 430 },
    { id: 'skill', label: 'Skills', x: 630 },
    { id: 'check', label: 'Checks', x: 810 },
  ];
  const byLayer = new Map(columns.map((column) => [column.id, []]));
  for (const node of nodes) {
    if (node.id === 'entry:agents') continue;
    const layer = byLayer.has(node.layer) ? node.layer : 'workflow';
    byLayer.get(layer).push(node);
  }
  const positions = new Map();
  for (const column of columns) {
    const items = byLayer.get(column.id) || [];
    items.forEach((node, index) => {
      positions.set(node.id, {
        x: column.x,
        y: 58 + index * 74,
        width: column.id === 'check' ? 170 : 164,
        height: 48,
      });
    });
  }
  return { columns, positions };
}

function edgePath(from, to) {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;
  const mid = Math.max(40, (endX - startX) / 2);
  return `M ${startX} ${startY} C ${startX + mid} ${startY}, ${endX - mid} ${endY}, ${endX} ${endY}`;
}

function renderSvg() {
  const nodes = layerNodes();
  const nodeIds = new Set(nodes.map((node) => node.id));
  const { columns, positions } = layoutGraph(nodes);
  const activeRelated = relatedNodeIds(state.selectedId);
  const visibleEdges = toArray(state.data?.edges).filter((edge) => (
    nodeIds.has(edge.from) && nodeIds.has(edge.to)
  ));
  const height = Math.max(520, ...[...positions.values()].map((pos) => pos.y + pos.height + 34));
  elements.svg.setAttribute('viewBox', `0 0 1020 ${height}`);
  elements.svg.style.height = `${height}px`;

  const labels = columns.map((column) => `
    <text class="column-label" x="${column.x}" y="28">${escapeHtml(column.label)}</text>
  `).join('');
  const edgeMarkup = visibleEdges.map((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return '';
    const active = activeRelated.has(edge.from) && activeRelated.has(edge.to);
    return `<path class="edge-line ${active ? 'is-active' : ''}" d="${edgePath(from, to)}"></path>`;
  }).join('');
  const nodeMarkup = nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return '';
    return `
      <g class="node-card ${node.id === state.selectedId ? 'is-active' : ''}" data-select-id="${escapeHtml(node.id)}" transform="translate(${pos.x} ${pos.y})">
        <rect rx="8" ry="8" width="${pos.width}" height="${pos.height}"></rect>
        <text class="node-kind" x="10" y="16">${escapeHtml(node.type)}</text>
        <text x="10" y="35">${escapeHtml(truncate(node.label || node.id, 24))}</text>
      </g>
    `;
  }).join('');
  elements.svg.innerHTML = `${labels}${edgeMarkup}${nodeMarkup}`;
}

function renderListPanel(title, items, getBadges) {
  return `
    <div class="data-panel">
      <h2>${escapeHtml(title)}</h2>
      <div class="data-grid">
        ${items.map((item) => `
          <article class="item-card">
            <h3>${escapeHtml(item.label || item.id)}</h3>
            <p>${escapeHtml(item.description || item.command || item.path || '')}</p>
            <div class="badge-row">${getBadges(item).map((badge) => `<span class="badge ${escapeHtml(badge.kind || '')}">${escapeHtml(badge.label)}</span>`).join('')}</div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPathTables() {
  const selectedTask = taskByNodeId(state.selectedId) || toArray(state.data?.tasks)[0];
  const workflows = toArray(selectedTask?.workflowIds)
    .map((id) => workflowById().get(id))
    .filter(Boolean);
  elements.pathTables.innerHTML = [
    renderListPanel('Workflow-Pfad', workflows, (workflow) => [
      { label: workflow.path, kind: 'workflow' },
      ...toArray(workflow.ruleIds).slice(0, 3).map((id) => ({ label: id, kind: 'rule' })),
    ]),
    renderListPanel('Empfohlene Skills und Checks', workflows.flatMap((workflow) => [
      ...toArray(workflow.skillIds).map((id) => state.data.skills.find((skill) => skill.id === id)).filter(Boolean),
      ...toArray(workflow.checkIds).map((id) => state.data.checks.find((check) => check.id === id)).filter(Boolean),
    ]), (item) => [
      { label: item.command || item.scope || item.source || 'read-only', kind: item.command ? 'check' : 'skill' },
    ]),
  ].join('');
}

function renderPanels() {
  elements.workflowPanel.innerHTML = renderListPanel('Workflows', toArray(state.data?.workflows), (workflow) => [
    { label: workflow.path, kind: 'workflow' },
    { label: `${toArray(workflow.ruleIds).length} Rules`, kind: 'rule' },
    { label: `${toArray(workflow.checkIds).length} Checks`, kind: 'check' },
  ]);
  elements.skillsPanel.innerHTML = renderListPanel('Skills', toArray(state.data?.skills), (skill) => [
    { label: skill.source, kind: 'skill' },
    { label: skill.scope, kind: 'skill' },
  ]);
  elements.checksPanel.innerHTML = renderListPanel('Checks', toArray(state.data?.checks), (check) => [
    { label: check.kind, kind: 'check' },
    { label: check.command, kind: 'check' },
  ]);
}

function renderDetailLinks(title, edges, direction) {
  if (edges.length === 0) return '';
  const nodes = nodeById();
  return `
    <div class="detail-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="link-list">
        ${edges.map((edge) => {
          const targetId = direction === 'out' ? edge.to : edge.from;
          const node = nodes.get(targetId);
          return `<button type="button" data-select-id="${escapeHtml(targetId)}">${escapeHtml(node?.label || targetId)} <span class="muted">(${escapeHtml(edge.label || edge.type)})</span></button>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDetail() {
  const nodes = nodeById();
  const node = nodes.get(state.selectedId) || nodes.get('entry:agents') || toArray(state.data?.nodes)[0];
  if (!node) {
    elements.detailPanel.innerHTML = '<p class="muted">Keine Daten geladen.</p>';
    return;
  }
  state.selectedId = node.id;
  const description = node.description || node.command || node.path || 'Read-only Governance-Anker.';
  elements.detailPanel.innerHTML = `
    <h2>${escapeHtml(node.label || node.id)}</h2>
    <div class="badge-row">
      <span class="badge ${escapeHtml(node.type)}">${escapeHtml(node.type)}</span>
      ${node.path ? `<span class="badge">${escapeHtml(node.path)}</span>` : ''}
    </div>
    <p>${escapeHtml(description)}</p>
    ${node.command ? `<div class="detail-section"><h3>Command</h3><code>${escapeHtml(node.command)}</code></div>` : ''}
    ${renderDetailLinks('Ausgehend', outgoingEdges(node.id), 'out')}
    ${renderDetailLinks('Eingehend', incomingEdges(node.id), 'in')}
  `;
}

function renderSources() {
  const sources = state.data?.sources || {};
  elements.sourcesFootnote.textContent = [
    `Quelle: ${sources.entrypoint || 'AGENTS.md'}`,
    `Rules: ${sources.rules || '.agents/rules'}`,
    `Workflows: ${sources.workflows || '.agents/workflows'}`,
    `Graph-Mapping: ${state.data?.graphMapping?.path || sources.graphMapping || 'unbekannt'}`,
  ].join(' | ');
}

function render() {
  if (!state.data) return;
  renderMetrics();
  renderWorkflowFilter();
  renderTaskList();
  renderSvg();
  renderPathTables();
  renderPanels();
  renderDetail();
  renderSources();
}

function selectNode(id) {
  state.selectedId = id;
  render();
}

async function loadDataFromUrl(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  const data = await response.json();
  if (data?.contract !== 'curvios.agent-map.v1') {
    throw new Error(`Unsupported agent-map contract: ${data?.contract || '<empty>'}`);
  }
  state.data = data;
  state.selectedId = data.tasks?.[0] ? `task:${data.tasks[0].id}` : 'entry:agents';
  elements.sourceMeta.textContent = `${data.contract} - ${data.generatedAt || url}`;
  render();
}

async function loadDefaultData() {
  const errors = [];
  for (const url of DATA_URLS) {
    try {
      await loadDataFromUrl(url);
      return;
    } catch (error) {
      errors.push(error.message);
    }
  }
  elements.detailPanel.innerHTML = `<div class="error"><strong>Agent Map Daten fehlen.</strong><br>${escapeHtml(errors.join(' | '))}</div>`;
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      setView(button.dataset.view || 'path');
    });
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-select-id]');
    if (target) {
      selectNode(target.dataset.selectId);
    }
  });
  elements.searchInput.addEventListener('input', () => {
    state.search = elements.searchInput.value;
    render();
  });
  elements.workflowFilter.addEventListener('change', () => {
    state.workflowFilter = elements.workflowFilter.value || 'all';
    render();
  });
  elements.layerFilter.addEventListener('change', () => {
    state.layerFilter = elements.layerFilter.value || 'all';
    render();
  });
  elements.fileInput.addEventListener('change', async () => {
    const file = elements.fileInput.files?.[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    if (data?.contract !== 'curvios.agent-map.v1') {
      throw new Error(`Unsupported agent-map contract: ${data?.contract || '<empty>'}`);
    }
    state.data = data;
    state.selectedId = data.tasks?.[0] ? `task:${data.tasks[0].id}` : 'entry:agents';
    elements.sourceMeta.textContent = `${data.contract} - ${file.name}`;
    render();
  });
  window.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type === 'curvios.map-tools:set-help-visible') {
      state.infoVisible = message.visible !== false;
      document.body.classList.toggle('help-hidden', !state.infoVisible);
    }
  });
}

bindEvents();
void loadDefaultData();
