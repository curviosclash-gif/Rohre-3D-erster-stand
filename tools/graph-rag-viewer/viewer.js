const VIEWER_CONTRACT = 'knowledge-graph.graph-rag.viewer-export.v1';
const CHAT_CONTRACT = 'knowledge-graph.graph-rag.chat-response.v1';
const FIXTURE_URL = '../../data/contracts/knowledge-graph/graph-rag-viewer-fixture.v1.json';
const CHAT_FIXTURE_URL = '../../data/contracts/knowledge-graph/graph-rag-chat-fixture.v1.json';
const DEFAULT_DATA_URLS = [
  '../../tmp/graph-rag/viewer/graph-rag-viewer-export.json',
  FIXTURE_URL,
];

const state = {
  data: null,
  chat: null,
  source: '',
  view: 'overview',
};

const elements = {
  sourceMeta: document.querySelector('#sourceMeta'),
  fixtureButton: document.querySelector('#fixtureButton'),
  fileInput: document.querySelector('#fileInput'),
  statusStrip: document.querySelector('#statusStrip'),
  errorBanner: document.querySelector('#errorBanner'),
  emptyState: document.querySelector('#emptyState'),
  dashboard: document.querySelector('#dashboard'),
  tabs: [...document.querySelectorAll('[data-view]')],
  panels: [...document.querySelectorAll('[data-panel]')],
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function badge(label, tone = 'neutral') {
  return `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;
}

function metric(label, value, hint = '') {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ''}
    </article>
  `;
}

function requireField(value, field, label) {
  if (value?.[field] === undefined) throw new Error(`${label}: Feld "${field}" fehlt.`);
}

function requireFields(value, fields, label) {
  fields.forEach((field) => requireField(value, field, label));
}

function validateExport(data) {
  if (data?.contract !== VIEWER_CONTRACT) {
    throw new Error(`Nicht unterstuetzter Contract: ${data?.contract || '<leer>'}`);
  }
  if (Number(data.schema_version) !== 1) {
    throw new Error(`Nicht unterstuetzte schema_version: ${data.schema_version}`);
  }
  requireFields(data, ['graphSummary', 'coverage', 'criticalPaths', 'evidence', 'chunks', 'diagnostics', 'safety', 'adapterStatus'], 'Viewer-Export');
  requireFields(data.graphSummary, ['nodeCount', 'edgeCount', 'nodeTypeCounts', 'edgeTypeCounts'], 'Graph-Summary');
  requireFields(data.safety, ['mode', 'redacted', 'rawIncluded', 'sourceOfTruth', 'safeToCommit', 'historicalVisible', 'promptInjectionSignals'], 'Safety');
  requireFields(data.diagnostics, ['maxChunks', 'chunksAvailable', 'graphCandidateChunks', 'candidatePathCount', 'chunksScored', 'chunksSelected', 'chunksRejected', 'selectedEstimatedTokens', 'fallbackRate', 'rejectedCandidates'], 'Diagnostics');
  requireFields(data.adapterStatus, ['mode', 'runtime', 'fallbackUsed', 'fallbackReason', 'graphRagBlocked'], 'Adapterstatus');
  if (!Array.isArray(data.criticalPaths) || !Array.isArray(data.evidence?.claims) || !Array.isArray(data.chunks)) {
    throw new Error('Critical Paths, Evidence-Claims und Chunks muessen Listen sein.');
  }
  if (data.safety.mode !== 'default-redacted' || data.safety.redacted !== true || data.safety.rawIncluded !== false) {
    throw new Error('Viewer akzeptiert nur default-redacted Exporte ohne Raw-Inhalt.');
  }
  if (data.safety.sourceOfTruth !== false || data.safety.safeToCommit !== false) {
    throw new Error('Viewer-Export muss nicht-kanonisch und nicht commitbar bleiben.');
  }
  return data;
}

function validateChatResponse(data) {
  if (data?.contract !== CHAT_CONTRACT) throw new Error(`Nicht unterstuetzter Chat-Contract: ${data?.contract || '<leer>'}`);
  requireFields(data, ['mode', 'status', 'question', 'context', 'answer', 'evidence', 'queries', 'replay', 'trace', 'links', 'safety', 'followups', 'cache'], 'Chat-Response');
  requireFields(data.answer, ['summary', 'confidence', 'uncertainties'], 'Chat-Antwort');
  requireFields(data.safety, ['redactionApplied', 'writesAllowed', 'sourceTextIsData', 'promptInjectionSignals', 'runtime'], 'Chat-Safety');
  if (!Array.isArray(data.evidence) || !Array.isArray(data.queries) || !Array.isArray(data.trace)) throw new Error('Chat-Evidence, Queries und Trace muessen Listen sein.');
  if (data.safety.redactionApplied !== true || data.safety.writesAllowed !== false || data.safety.sourceTextIsData !== true) throw new Error('Chat-Response verletzt die read-only Safety-Grenze.');
  if (data.cache?.finalAnswerCached !== false) throw new Error('Finale Chat-Antworten duerfen nicht gecacht werden.');
  return data;
}

function renderStatus() {
  const { data } = state;
  elements.statusStrip.innerHTML = [
    badge('READ-ONLY', 'good'),
    badge(data.safety.mode, 'good'),
    data.adapterStatus.fallbackUsed ? badge('LLM FALLBACK', 'warn') : badge('LLM READY', 'good'),
    data.safety.historicalVisible ? badge('HISTORICAL SOURCES', 'warn') : badge('ACTIVE SOURCES', 'neutral'),
    badge('RAW AUDIT DISABLED', 'neutral'),
    list(data.safety.promptInjectionSignals).length ? badge('SAFETY SIGNAL', 'bad') : badge('NO INJECTION SIGNAL', 'neutral'),
  ].join('');
}

function renderOverview() {
  const { data } = state;
  document.querySelector('#overviewView').innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow">Snapshot</p><h2>Overview</h2></div>
      <p>${escapeHtml(data.evidence.question || 'Keine Evidence-Frage')}</p>
    </div>
    <div class="metric-grid">
      ${metric('Graph nodes', data.graphSummary.nodeCount)}
      ${metric('Graph edges', data.graphSummary.edgeCount)}
      ${metric('Adjusted coverage', `${data.coverage.adjustedCoveragePercent ?? '-'}%`, data.coverage.gateStatus || 'unknown')}
      ${metric('Open active files', data.coverage.uncoveredActiveFileCount ?? '-')}
      ${metric('Evidence claims', list(data.evidence.claims).length)}
      ${metric('Selected chunks', list(data.chunks).length)}
    </div>
    <div class="two-column">
      ${keyValuePanel('Node types', data.graphSummary.nodeTypeCounts)}
      ${keyValuePanel('Edge types', data.graphSummary.edgeTypeCounts)}
    </div>
  `;
}

function keyValuePanel(title, values) {
  const rows = Object.entries(values || {}).map(([key, value]) => `
    <tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>
  `).join('');
  return `<article class="data-card"><h3>${escapeHtml(title)}</h3><table><tbody>${rows || '<tr><td>Keine Daten</td><td>-</td></tr>'}</tbody></table></article>`;
}

function renderCriticalPaths() {
  const rows = list(state.data.criticalPaths).map((entry) => `
    <tr>
      <td><strong>${escapeHtml(entry.criticalPath)}</strong></td>
      <td>${badge(entry.status || 'unknown', entry.status === 'ok' ? 'good' : 'warn')}</td>
      <td>${escapeHtml(Object.entries(entry.counts || {}).map(([key, value]) => `${key}: ${value}`).join(', ') || '-')}</td>
      <td>${escapeHtml(list(entry.missingLayers).join(', ') || '-')}</td>
      <td>${escapeHtml(list(entry.missingValidation).join(', ') || '-')}</td>
    </tr>
  `).join('');
  document.querySelector('#criticalPathsView').innerHTML = tablePanel('Critical Paths', 'Runtime-nahe Pfade aus dem Knowledge Graph.', ['Path', 'Status', 'Layer counts', 'Missing layers', 'Missing validation'], rows);
}

function renderEvidence() {
  const claims = list(state.data.evidence.claims).map((claim) => `
    <article class="evidence-card ${claim.historical ? 'is-historical' : ''}">
      <div class="card-header">
        <div>${badge(claim.confidence || 'unknown', claim.confidence === 'high' ? 'good' : 'warn')} ${claim.historical ? badge('historical', 'warn') : badge(claim.sourceClass || 'source', 'neutral')}</div>
        <code>${escapeHtml(claim.path)}#L${escapeHtml(claim.lineStart)}-L${escapeHtml(claim.lineEnd)}</code>
      </div>
      <p>${escapeHtml(claim.claim)}</p>
      <small>Source path: ${escapeHtml(claim.path)} | Lines: ${escapeHtml(claim.lineStart)}-${escapeHtml(claim.lineEnd)} | Confidence: ${escapeHtml(claim.confidence || 'unknown')}</small>
      <small>Uncertainties: ${escapeHtml(list(claim.uncertainties).join(', ') || 'none')}</small>
    </article>
  `).join('');
  const queries = list(state.data.evidence.graphQueries).map((query) => `<li><code>${escapeHtml(JSON.stringify(query))}</code></li>`).join('');
  document.querySelector('#evidenceView').innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Source-backed</p><h2>Evidence</h2></div><p>${escapeHtml(state.data.evidence.mode || '-')}</p></div>
    <div class="evidence-list">${claims || '<p>Keine Claims.</p>'}</div>
    <article class="data-card"><h3>Graph query origin</h3><ul class="code-list">${queries || '<li>Keine Queries.</li>'}</ul></article>
  `;
}

function renderChunks() {
  const rows = list(state.data.chunks).map((chunk) => `
    <tr>
      <td><code>${escapeHtml(chunk.path)}#L${escapeHtml(chunk.lineStart)}-L${escapeHtml(chunk.lineEnd)}</code></td>
      <td>${chunk.historical ? badge('historical', 'warn') : badge(chunk.sourceClass || 'source', 'neutral')}</td>
      <td>${escapeHtml(chunk.estimatedTokens)}</td>
      <td>${escapeHtml(chunk.excerpt)}</td>
    </tr>
  `).join('');
  document.querySelector('#chunksView').innerHTML = tablePanel('Chunks', 'Nur redigierte Excerpts, niemals Raw-Chunk-Text.', ['Source', 'Class', 'Tokens', 'Excerpt'], rows);
}

function renderAdapter() {
  const adapter = state.data.adapterStatus;
  document.querySelector('#adapterView').innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Local runtime</p><h2>Adapter status</h2></div></div>
    <div class="metric-grid">
      ${metric('Mode', adapter.mode)}
      ${metric('Runtime', adapter.runtime)}
      ${metric('Fallback used', adapter.fallbackUsed ? 'yes' : 'no')}
      ${metric('Graph-RAG blocked', adapter.graphRagBlocked ? 'yes' : 'no')}
    </div>
    <article class="data-card"><h3>Fallback reason</h3><p>${escapeHtml(adapter.fallbackReason || 'Kein Fallback aktiv.')}</p></article>
  `;
}

function renderSafety() {
  const safety = state.data.safety;
  const signals = list(safety.promptInjectionSignals).map((signal) => `
    <li><code>${escapeHtml(signal.path || '-')}</code>: ${escapeHtml(signal.signal || 'unknown')}</li>
  `).join('');
  document.querySelector('#safetyView').innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Consumer boundary</p><h2>Safety</h2></div></div>
    <div class="metric-grid">
      ${metric('Redaction mode', safety.mode)}
      ${metric('Raw included', safety.rawIncluded ? 'yes' : 'no')}
      ${metric('Source of truth', safety.sourceOfTruth ? 'yes' : 'no')}
      ${metric('Safe to commit', safety.safeToCommit ? 'yes' : 'no')}
    </div>
    <article class="warning-card">
      <h3>Unsafe raw audit mode is disabled</h3>
      <p>Dieser Viewer akzeptiert ausschliesslich <code>default-redacted</code>. Raw-Ausgaben sind nur fuer explizite lokale Incident-Audits ausserhalb dieses Viewers vorgesehen und duerfen nicht als Viewer-Export oder Commit-Artefakt verwendet werden.</p>
    </article>
    ${safety.historicalVisible ? '<article class="historical-note"><h3>Historical sources are context only</h3><p>Gelb markierte Quellen stammen aus historischen Plaenen. Sie erklaeren Drift, steuern aber keine aktiven Entscheidungen.</p></article>' : ''}
    <article class="data-card"><h3>Prompt-injection signals</h3><ul>${signals || '<li>Keine Signale im geladenen Export.</li>'}</ul></article>
  `;
}

function renderDiagnostics() {
  const diagnostics = state.data.diagnostics;
  const rejectedRows = list(diagnostics.rejectedCandidates).map((candidate) => `
    <tr>
      <td><code>${escapeHtml(candidate.path)}</code></td>
      <td>${candidate.historical ? badge('historical', 'warn') : badge(candidate.selectedVia || 'candidate', 'neutral')}</td>
      <td>${escapeHtml(candidate.retrievalScore ?? '-')}</td>
      <td>${escapeHtml(candidate.rejectedReason || '-')}</td>
    </tr>
  `).join('');
  return `
    <article class="data-card">
      <h3>Context budget</h3>
      <div class="metric-grid">
        ${metric('Chunk limit', diagnostics.maxChunks ?? '-')}
        ${metric('Available chunks', diagnostics.chunksAvailable ?? '-')}
        ${metric('Candidate paths', diagnostics.candidatePathCount ?? '-')}
        ${metric('Chunks scored', diagnostics.chunksScored ?? '-')}
        ${metric('Chunks selected', diagnostics.chunksSelected ?? '-')}
        ${metric('Estimated tokens', diagnostics.selectedEstimatedTokens ?? '-')}
      </div>
    </article>
    ${tablePanel('Rejected candidates', 'Kompakte Diagnose ohne Raw-Quelltext.', ['Source', 'Class', 'Score', 'Reason'], rejectedRows)}
  `;
}

function renderAskRepo() {
  const chat = state.chat;
  const response = chat ? `
    <div class="chat-response">
      <div class="card-header">
        <div>${badge(chat.status, chat.status === 'answered' ? 'good' : 'warn')} ${badge(chat.mode, 'neutral')} ${badge(chat.safety.runtime, 'neutral')}</div>
        <strong>${escapeHtml(chat.answer.confidence)}</strong>
      </div>
      <h3>${escapeHtml(chat.question)}</h3>
      <p>${escapeHtml(chat.answer.summary)}</p>
      <small>Uncertainties: ${escapeHtml(list(chat.answer.uncertainties).join(', ') || 'none')}</small>
    </div>
    <div class="two-column">
      <article class="data-card">
        <h3>Sources</h3>
        <div class="evidence-list">${list(chat.evidence).map((entry) => `
          <article class="evidence-card ${entry.historical ? 'is-historical' : ''}">
            <div>${badge(entry.confidence, entry.confidence === 'high' ? 'good' : 'warn')} ${entry.historical ? badge('historical', 'warn') : badge(entry.kind, 'neutral')}</div>
            <code>${escapeHtml(entry.path)}#L${escapeHtml(entry.lineStart)}-L${escapeHtml(entry.lineEnd)}</code>
            <p>${escapeHtml(entry.claim)}</p>
          </article>
        `).join('') || '<p>Keine Evidence vorhanden.</p>'}</div>
      </article>
      <article class="data-card">
        <h3>Explain this answer</h3>
        <ul class="code-list">${list(chat.trace).map((entry) => `<li><code>${escapeHtml(entry)}</code></li>`).join('')}</ul>
        <h3>Graph queries</h3>
        <ul class="code-list">${list(chat.queries).map((entry) => `<li><code>${escapeHtml(entry)}</code></li>`).join('')}</ul>
      </article>
    </div>
    <article class="data-card">
      <h3>Replay locally</h3>
      <code>${escapeHtml(chat.replay.command)}</code>
    </article>
  ` : '<p class="muted">Chat-Fixture laden oder eine lokal erzeugte Chat-Response aus <code>tmp/graph-rag/chat/</code> auswaehlen.</p>';
  document.querySelector('#askRepoView').innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">Read-only evidence chat</p>
      <h2>Ask Repo</h2>
      <p>Antworten werden lokal per CLI erzeugt. Der Viewer liest nur versionierte Responses und bietet keine Schreibaktionen.</p></div></div>
    <article class="chat-toolbar data-card">
      <label>Modus
        <select id="chatMode">
          ${['graph-only', 'evidence', 'rag-summary', 'explain', 'plan-next'].map((mode) => `<option${chat?.mode === mode ? ' selected' : ''}>${mode}</option>`).join('')}
        </select>
      </label>
      <label>Frage
        <input id="chatQuestion" value="${escapeHtml(chat?.question || 'Was blockiert V121?')}">
      </label>
      <button id="chatFixtureButton" type="button" class="button button-secondary">Chat-Fixture laden</button>
      <label class="button button-primary">Chat-JSON laden<input id="chatFileInput" type="file" accept="application/json,.json"></label>
    </article>
    ${response}
  `;
  document.querySelector('#chatFixtureButton').addEventListener('click', () => loadChatUrl(CHAT_FIXTURE_URL).catch(showError));
  document.querySelector('#chatFileInput').addEventListener('change', loadChatFile);
}

function tablePanel(title, description, headers, rows) {
  return `
    <div class="section-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></div>
    <article class="data-card table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${headers.length}">Keine Daten.</td></tr>`}</tbody>
      </table>
    </article>
  `;
}

function render() {
  renderStatus();
  renderOverview();
  renderCriticalPaths();
  renderEvidence();
  renderChunks();
  renderAdapter();
  renderSafety();
  document.querySelector('#chunksView').insertAdjacentHTML('beforeend', renderDiagnostics());
  renderAskRepo();
  elements.sourceMeta.textContent = `${state.source} | ${state.data.contract}`;
  elements.emptyState.hidden = true;
  elements.dashboard.hidden = false;
  setView(state.view);
}

function setView(view) {
  state.view = view;
  elements.tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === view));
  elements.panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.panel === view));
}

function showError(error) {
  elements.errorBanner.textContent = error.message || String(error);
  elements.errorBanner.hidden = false;
}

async function loadUrl(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Export konnte nicht geladen werden: ${url} (${response.status})`);
  state.data = validateExport(await response.json());
  state.source = url;
  elements.errorBanner.hidden = true;
  render();
}

async function loadChatUrl(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Chat-Response konnte nicht geladen werden: ${url} (${response.status})`);
  state.chat = validateChatResponse(await response.json());
  elements.errorBanner.hidden = true;
  renderAskRepo();
}

async function loadChatFile(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    state.chat = validateChatResponse(JSON.parse(await file.text()));
    elements.errorBanner.hidden = true;
    renderAskRepo();
  } catch (error) {
    showError(error);
  }
}

async function loadDefault() {
  for (const url of DEFAULT_DATA_URLS) {
    try {
      await loadUrl(url);
      return;
    } catch {
      // A local runtime export is optional; the tracked fixture is the stable baseline.
    }
  }
  showError(new Error('Kein Viewer-Export gefunden. Fixture laden oder JSON aus tmp/graph-rag/viewer/ waehlen.'));
}

elements.fixtureButton.addEventListener('click', () => loadUrl(FIXTURE_URL).catch(showError));
elements.fileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    state.data = validateExport(JSON.parse(await file.text()));
    state.source = file.name;
    elements.errorBanner.hidden = true;
    render();
  } catch (error) {
    showError(error);
  }
});
elements.tabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));

loadDefault();
