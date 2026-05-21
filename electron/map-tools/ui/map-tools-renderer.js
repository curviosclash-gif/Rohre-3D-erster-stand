const api = window.mapToolsApi;

const state = {
  activeViewId: 'plan',
  serverUrl: '',
  repoRoot: '',
  views: [],
  refreshes: {},
  busy: false,
  activeHelpTerm: '',
  infoVisible: true,
};

const elements = {
  root: document.querySelector('[data-testid="map-tools-shell"]'),
  repoRoot: document.querySelector('#repoRoot'),
  viewTabs: document.querySelector('#viewTabs'),
  refreshCurrent: document.querySelector('#refreshCurrent'),
  refreshAll: document.querySelector('#refreshAll'),
  infoToggle: document.querySelector('#infoToggle'),
  activeViewLabel: document.querySelector('#activeViewLabel'),
  refreshStatus: document.querySelector('#refreshStatus'),
  lastRefresh: document.querySelector('#lastRefresh'),
  errorPanel: document.querySelector('#errorPanel'),
  errorTitle: document.querySelector('#errorTitle'),
  errorDetail: document.querySelector('#errorDetail'),
  retryRefresh: document.querySelector('#retryRefresh'),
  mapFrame: document.querySelector('#mapFrame'),
  helpPopover: document.querySelector('#helpPopover'),
};

const HELP_TERMS = {
  'refresh-current': {
    title: 'Aktualisieren',
    body: 'Erzeugt den Export fuer die aktuell sichtbare Karte neu und laedt den Viewer danach erneut.',
  },
  'refresh-all': {
    title: 'Alle Exporte',
    body: 'Erzeugt Plan Map, Repo Map und Agent Map neu. Sinnvoll, wenn Plan-, Repo- oder Governance-Daten gerade geaendert wurden.',
  },
  'active-view': {
    title: 'Aktive Karte',
    body: 'Zeigt, welche read-only Karte im Viewer geladen ist.',
  },
  plan: {
    title: 'Plan Map',
    body: 'Zeigt Planbloecke, Dependencies, Scope-Kollisionen, Changelog und Health-Signale.',
  },
  repo: {
    title: 'Repo Map',
    body: 'Zeigt Repo-Bereiche, Datei-Coverage, kritische Pfade und Planbezuege.',
  },
  agent: {
    title: 'Agent Map',
    body: 'Zeigt den Arbeitsweg von Aufgabentypen zu Workflows, Rules, Skills und Checks.',
  },
};

function activeView() {
  return state.views.find((view) => view.id === state.activeViewId) || state.views[0] || null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function closeHelpPopover() {
  state.activeHelpTerm = '';
  document.querySelectorAll('.help-button.is-active').forEach((button) => button.classList.remove('is-active'));
  elements.helpPopover.hidden = true;
}

function syncFrameInfoVisibility() {
  try {
    elements.mapFrame.contentWindow?.postMessage({
      type: 'curvios.map-tools:set-help-visible',
      visible: state.infoVisible,
    }, '*');
  } catch {
    // The embedded viewers receive the next message after their iframe finishes loading.
  }
}

function setInfoVisible(isVisible) {
  state.infoVisible = isVisible !== false;
  elements.root.classList.toggle('info-hidden', !state.infoVisible);
  elements.infoToggle.classList.toggle('is-active', state.infoVisible);
  elements.infoToggle.setAttribute('aria-pressed', state.infoVisible ? 'true' : 'false');
  if (!state.infoVisible) {
    closeHelpPopover();
  }
  syncFrameInfoVisibility();
}

function openHelpPopover(term, anchor) {
  const help = HELP_TERMS[term];
  if (!help) return;
  document.querySelectorAll('.help-button.is-active').forEach((button) => button.classList.remove('is-active'));
  if (anchor.classList.contains('help-button')) {
    anchor.classList.add('is-active');
  }
  state.activeHelpTerm = term;
  elements.helpPopover.innerHTML = `<strong>${escapeHtml(help.title)}</strong><span>${escapeHtml(help.body)}</span>`;
  elements.helpPopover.hidden = false;
  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = elements.helpPopover.getBoundingClientRect();
  const left = Math.min(window.innerWidth - popoverRect.width - 12, Math.max(12, anchorRect.left));
  const top = Math.min(window.innerHeight - popoverRect.height - 12, anchorRect.bottom + 8);
  elements.helpPopover.style.left = `${left}px`;
  elements.helpPopover.style.top = `${top}px`;
}

function bindHelpButtons(root = document) {
  root.querySelectorAll('[data-help-term]').forEach((node) => {
    if (node.dataset.helpBound === 'true') return;
    node.dataset.helpBound = 'true';
    const anchor = node.closest('button') || node;
    anchor.addEventListener('click', (event) => {
      if (!node.classList.contains('button-help') && event.target !== node) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      const term = node.dataset.helpTerm;
      if (state.activeHelpTerm === term) {
        closeHelpPopover();
      } else {
        openHelpPopover(term, anchor);
      }
    });
  });
}

function formatTimestamp(value) {
  if (!value) {
    return 'noch kein Refresh';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function mergeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return;
  }
  state.activeViewId = snapshot.activeViewId || state.activeViewId;
  state.serverUrl = snapshot.serverUrl || state.serverUrl;
  state.repoRoot = snapshot.repoRoot || state.repoRoot;
  state.views = Array.isArray(snapshot.views) ? snapshot.views : state.views;
  state.refreshes = snapshot.refreshes && typeof snapshot.refreshes === 'object'
    ? snapshot.refreshes
    : state.refreshes;
}

function setBusy(isBusy, message = '') {
  state.busy = isBusy === true;
  elements.root.toggleAttribute('aria-busy', state.busy);
  elements.refreshCurrent.disabled = state.busy;
  elements.refreshAll.disabled = state.busy;
  elements.refreshStatus.textContent = message || (state.busy ? 'arbeitet' : 'bereit');
}

function setError(failedResults) {
  const failures = (failedResults || []).filter((result) => result?.ok === false);
  if (failures.length === 0) {
    elements.errorPanel.hidden = true;
    elements.errorTitle.textContent = '';
    elements.errorDetail.textContent = '';
    return;
  }

  const detail = failures.map((failure) => {
    const error = failure.error || {};
    return [
      `${failure.label || failure.viewId}: ${error.message || 'Export fehlgeschlagen'}`,
      error.stderr ? `stderr:\n${error.stderr}` : '',
      error.stdout ? `stdout:\n${error.stdout}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  elements.errorTitle.textContent = failures.length === 1
    ? `${failures[0].label || 'Map'} Export fehlgeschlagen`
    : `${failures.length} Exporte fehlgeschlagen`;
  elements.errorDetail.textContent = detail;
  elements.errorPanel.hidden = false;
}

function updateFrame(forceReload = false) {
  const view = activeView();
  if (!view || !state.serverUrl) {
    elements.mapFrame.removeAttribute('src');
    return;
  }
  const suffix = forceReload ? `?mapToolsRefresh=${Date.now()}` : '';
  elements.mapFrame.src = `${state.serverUrl}${view.viewPath}${suffix}`;
}

function renderTabs() {
  elements.viewTabs.textContent = '';
  for (const view of state.views) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.viewId = view.id;
    button.innerHTML = `${escapeHtml(view.label)} <span class="button-help" data-help-term="${escapeHtml(view.id)}" aria-label="${escapeHtml(view.label)} erklaeren">i</span>`;
    button.classList.toggle('is-active', view.id === state.activeViewId);
    button.addEventListener('click', () => {
      void selectView(view.id, { refresh: true });
    });
    elements.viewTabs.appendChild(button);
  }
}

function renderStatus() {
  const view = activeView();
  const refresh = view ? state.refreshes[view.id] : null;
  elements.repoRoot.textContent = state.repoRoot || 'Repository unbekannt';
  elements.activeViewLabel.textContent = view?.label || 'Map';
  elements.lastRefresh.textContent = refresh?.ok === false
    ? `letzter Versuch: ${formatTimestamp(refresh.refreshedAt)}`
    : `letzter Refresh: ${formatTimestamp(refresh?.refreshedAt)}`;
  if (!state.busy) {
    elements.refreshStatus.textContent = refresh?.ok === false ? 'Exportfehler' : 'bereit';
  }
}

function render(forceFrameReload = false) {
  renderTabs();
  renderStatus();
  updateFrame(forceFrameReload);
  bindHelpButtons(document);
  setInfoVisible(state.infoVisible);
}

async function selectView(viewId, options = {}) {
  const snapshot = await api.setView(viewId);
  mergeSnapshot(snapshot);
  if (options.refresh) {
    await refreshMaps(state.activeViewId);
    return;
  }
  render();
}

async function refreshMaps(viewId = state.activeViewId) {
  const target = viewId || 'all';
  setBusy(true, target === 'all' ? 'alle Exporte laufen' : 'Export laeuft');
  try {
    const response = await api.refresh(target);
    mergeSnapshot(response);
    const results = response?.refresh?.results || [];
    setError(results);
    render(true);
  } catch (error) {
    setError([{
      viewId: target,
      label: target === 'all' ? 'Map Tools' : target,
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error || 'Refresh fehlgeschlagen'),
      },
    }]);
  } finally {
    setBusy(false);
    renderStatus();
  }
}

function bindEvents() {
  elements.refreshCurrent.addEventListener('click', () => {
    void refreshMaps(state.activeViewId);
  });
  elements.refreshAll.addEventListener('click', () => {
    void refreshMaps('all');
  });
  elements.infoToggle.addEventListener('click', () => {
    setInfoVisible(!state.infoVisible);
  });
  elements.retryRefresh.addEventListener('click', () => {
    void refreshMaps(state.activeViewId);
  });
  elements.mapFrame.addEventListener('load', syncFrameInfoVisibility);
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-help-term]') && !event.target.closest('.help-popover')) {
      closeHelpPopover();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHelpPopover();
    }
  });
  window.addEventListener('resize', closeHelpPopover);
  api.onViewRequested((payload) => {
    void selectView(payload?.viewId || 'plan', { refresh: true });
  });
  api.onRefreshRequested((payload) => {
    void refreshMaps(payload?.viewId || 'all');
  });
}

async function init() {
  bindEvents();
  setBusy(true, 'Shell wird geladen');
  const snapshot = await api.getState();
  mergeSnapshot(snapshot);
  const failures = Object.values(state.refreshes).filter((result) => result?.ok === false);
  setError(failures);
  setBusy(false);
  render();
}

init().catch((error) => {
  setBusy(false);
  setError([{
    viewId: 'shell',
    label: 'Map Tools',
    ok: false,
    error: {
      message: error instanceof Error ? error.message : String(error || 'Shell-Start fehlgeschlagen'),
    },
  }]);
});
