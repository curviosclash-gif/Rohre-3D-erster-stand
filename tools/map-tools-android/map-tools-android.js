const views = {
  plan: {
    id: 'plan',
    label: 'Plan Map',
    path: './tools/plan-map/index.html',
  },
  repo: {
    id: 'repo',
    label: 'Repo Map',
    path: './tools/repo-map/index.html',
  },
  agent: {
    id: 'agent',
    label: 'Agent Map',
    path: './tools/agent-map/index.html',
  },
};

const defaultUpdateConfig = {
  provider: 'github-releases',
  repository: 'curviosclash-gif/Rohre-3D-erster-stand',
  apiUrl: 'https://api.github.com/repos/curviosclash-gif/Rohre-3D-erster-stand/releases/latest',
  latestReleaseUrl: 'https://github.com/curviosclash-gif/Rohre-3D-erster-stand/releases/latest',
};

const state = {
  updateConfig: { ...defaultUpdateConfig },
  updateTargetUrl: defaultUpdateConfig.latestReleaseUrl,
  activeViewId: 'plan',
  infoVisible: true,
  activeHelpTerm: '',
};

const helpTerms = {
  update: {
    title: 'Update',
    body: 'Prueft die neueste GitHub-Release-Seite fuer die Map-Tools-App.',
  },
  github: {
    title: 'GitHub',
    body: 'Oeffnet die Release-Seite, falls du die App oder den Snapshot manuell aktualisieren willst.',
  },
  apk: {
    title: 'APK',
    body: 'Oeffnet das APK-Asset des neuesten Releases, wenn GitHub eines bereitstellt.',
  },
  snapshot: {
    title: 'Snapshot',
    body: 'Die Android-App zeigt eine ausgelieferte, read-only Momentaufnahme der Map Tools.',
  },
  releases: {
    title: 'GitHub Releases',
    body: 'Status der Update-Pruefung. Bei Erfolg steht hier der gefundene Release-Name.',
  },
  workstream: {
    title: 'Arbeitsstrom',
    body: 'Filtert die Plan Map nach Themenbereich, zum Beispiel Android, Repo oder AI/Graph.',
  },
  info: {
    title: 'Info',
    body: 'Blendet die kleinen Hilfe-Buttons in der Android-Shell und in der geladenen Karte ein oder aus.',
  },
};

const frame = document.querySelector('#mapFrame');
const shell = document.querySelector('[data-testid="map-tools-android-shell"]');
const activeLabel = document.querySelector('#activeLabel');
const buildMeta = document.querySelector('#buildMeta');
const updateStatus = document.querySelector('#updateStatus');
const updateCheck = document.querySelector('#updateCheck');
const updateOpen = document.querySelector('#updateOpen');
const planFilterStrip = document.querySelector('#planFilterStrip');
const planWorkstream = document.querySelector('#planWorkstream');
const infoToggle = document.querySelector('#infoToggle');
const helpPopover = document.querySelector('#helpPopover');
const tabButtons = [...document.querySelectorAll('[data-view-id]')];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function helpButton(term) {
  const help = helpTerms[term];
  if (!help) return '';
  return `<button type="button" class="help-button" data-help-term="${escapeHtml(term)}" aria-label="${escapeHtml(help.title)} erklaeren">i</button>`;
}

function closeHelpPopover() {
  state.activeHelpTerm = '';
  document.querySelectorAll('.help-button.is-active').forEach((button) => button.classList.remove('is-active'));
  helpPopover.hidden = true;
}

function openHelpPopover(term, button) {
  const help = helpTerms[term];
  if (!help || !state.infoVisible) return;
  document.querySelectorAll('.help-button.is-active').forEach((node) => node.classList.remove('is-active'));
  button.classList.add('is-active');
  state.activeHelpTerm = term;
  helpPopover.innerHTML = `<strong>${escapeHtml(help.title)}</strong><span>${escapeHtml(help.body)}</span>`;
  helpPopover.hidden = false;
  const buttonRect = button.getBoundingClientRect();
  const popoverRect = helpPopover.getBoundingClientRect();
  const left = Math.min(window.innerWidth - popoverRect.width - 10, Math.max(10, buttonRect.left));
  const top = Math.min(window.innerHeight - popoverRect.height - 10, buttonRect.bottom + 8);
  helpPopover.style.left = `${left}px`;
  helpPopover.style.top = `${top}px`;
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

function syncFrameInfoVisibility() {
  try {
    frame.contentWindow?.postMessage({
      type: 'curvios.map-tools:set-help-visible',
      visible: state.infoVisible,
    }, '*');
  } catch {
    // The packaged Android shell serves the frame same-origin; ignore early iframe timing.
  }
}

function setInfoVisible(isVisible) {
  state.infoVisible = isVisible !== false;
  shell.classList.toggle('info-hidden', !state.infoVisible);
  infoToggle.classList.toggle('is-active', state.infoVisible);
  infoToggle.setAttribute('aria-pressed', state.infoVisible ? 'true' : 'false');
  if (!state.infoVisible) {
    closeHelpPopover();
  }
  syncFrameInfoVisibility();
}

function normalizeViewId(viewId) {
  return Object.prototype.hasOwnProperty.call(views, viewId) ? viewId : 'plan';
}

function selectView(viewId) {
  const selectedView = views[normalizeViewId(viewId)];
  const wasActive = state.activeViewId === selectedView.id;
  state.activeViewId = selectedView.id;
  if (!wasActive) {
    frame.src = selectedView.path;
  }
  activeLabel.textContent = selectedView.label;
  planFilterStrip.hidden = selectedView.id !== 'plan';
  tabButtons.forEach((button) => {
    const isSelected = button.dataset.viewId === selectedView.id;
    button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
  syncFrameInfoVisibility();
}

function applyPlanWorkstreamFilter(attempt = 0) {
  if (state.activeViewId !== 'plan') {
    return;
  }

  try {
    const filter = frame.contentDocument?.querySelector('#workstreamFilter');
    const targetValue = planWorkstream.value || 'all';
    const hasTargetOption = filter
      ? [...filter.options].some((option) => option.value === targetValue)
      : false;

    // Plan Map fills its options after loading JSON, so Android retries briefly after iframe load.
    if (!filter || !hasTargetOption) {
      if (attempt < 12) {
        window.setTimeout(() => applyPlanWorkstreamFilter(attempt + 1), 120);
      }
      return;
    }

    if (filter.value !== targetValue) {
      filter.value = targetValue;
      filter.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch {
    // Same-origin access is expected in the packaged app; ignore transient iframe timing issues.
  }
}

function normalizeUpdateConfig(manifest) {
  const updates = manifest?.updates && typeof manifest.updates === 'object'
    ? manifest.updates
    : {};
  const merged = { ...defaultUpdateConfig, ...updates };
  return {
    ...merged,
    apiUrl: merged.apiUrl || defaultUpdateConfig.apiUrl,
    latestReleaseUrl: merged.latestReleaseUrl || defaultUpdateConfig.latestReleaseUrl,
  };
}

function setUpdateStatus(text) {
  updateStatus.innerHTML = `${escapeHtml(text)} ${helpButton('releases')}`;
  bindHelpButtons(updateStatus);
}

function setUpdateOpenLabel(label, helpTerm = 'github') {
  updateOpen.innerHTML = `${escapeHtml(label)} ${helpButton(helpTerm)}`;
  bindHelpButtons(updateOpen);
}

function resolveReleaseUpdateTarget(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const apkAsset = assets.find((asset) => {
    const name = String(asset?.name || '');
    const contentType = String(asset?.content_type || '');
    return name.toLowerCase().endsWith('.apk')
      || contentType === 'application/vnd.android.package-archive';
  });
  if (apkAsset?.browser_download_url) {
    return {
      url: apkAsset.browser_download_url,
      label: 'APK laden',
      helpTerm: 'apk',
    };
  }
  return {
    url: release?.html_url || state.updateConfig.latestReleaseUrl,
    label: 'GitHub',
    helpTerm: 'github',
  };
}

function openUpdateTarget() {
  const url = state.updateTargetUrl || state.updateConfig.latestReleaseUrl;
  const opened = window.open(url, '_blank', 'noopener');
  if (!opened) {
    window.location.href = url;
  }
}

async function checkGithubRelease() {
  updateCheck.disabled = true;
  updateOpen.hidden = true;
  setUpdateStatus('GitHub prueft');
  try {
    const response = await fetch(state.updateConfig.apiUrl, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const release = await response.json();
    const target = resolveReleaseUpdateTarget(release);
    state.updateTargetUrl = target.url;
    setUpdateOpenLabel(target.label, target.helpTerm);
    updateOpen.hidden = false;
    setUpdateStatus(`GitHub ${release.tag_name || release.name || 'Release'}`);
  } catch {
    state.updateTargetUrl = state.updateConfig.latestReleaseUrl;
    setUpdateOpenLabel('GitHub');
    updateOpen.hidden = false;
    setUpdateStatus('GitHub Releases');
  } finally {
    updateCheck.disabled = false;
  }
}

async function hydrateBuildMeta() {
  try {
    const response = await fetch('./map-tools-android.manifest.json', { cache: 'no-store' });
    if (!response.ok) {
      buildMeta.innerHTML = `read-only Android snapshot ${helpButton('snapshot')}`;
      bindHelpButtons(buildMeta);
      return;
    }
    const manifest = await response.json();
    state.updateConfig = normalizeUpdateConfig(manifest);
    state.updateTargetUrl = state.updateConfig.latestReleaseUrl;
    buildMeta.textContent = manifest.generatedAt
      ? `Snapshot ${new Date(manifest.generatedAt).toLocaleDateString('de-DE')}`
      : 'read-only Android snapshot';
    buildMeta.insertAdjacentHTML('beforeend', ` ${helpButton('snapshot')}`);
    bindHelpButtons(buildMeta);
  } catch {
    buildMeta.innerHTML = `read-only Android snapshot ${helpButton('snapshot')}`;
    bindHelpButtons(buildMeta);
  }
}

function hydrateStaticHelp() {
  updateCheck.insertAdjacentHTML('beforeend', ` ${helpButton('update')}`);
  setUpdateOpenLabel('GitHub');
  updateStatus.innerHTML = `${escapeHtml(updateStatus.textContent || 'GitHub Releases')} ${helpButton('releases')}`;
  planFilterStrip.querySelector('span').insertAdjacentHTML('beforeend', ` ${helpButton('workstream')}`);
  infoToggle.insertAdjacentHTML('beforeend', ` ${helpButton('info')}`);
  bindHelpButtons(document);
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectView(button.dataset.viewId);
  });
});

frame.addEventListener('load', () => {
  applyPlanWorkstreamFilter();
  syncFrameInfoVisibility();
});

planWorkstream.addEventListener('change', () => {
  applyPlanWorkstreamFilter();
});

infoToggle.addEventListener('click', () => {
  setInfoVisible(!state.infoVisible);
});

updateCheck.addEventListener('click', () => {
  void checkGithubRelease();
});

updateOpen.addEventListener('click', openUpdateTarget);

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

window.addEventListener('resize', closeHelpPopover);

hydrateStaticHelp();
selectView('plan');
setInfoVisible(true);
void hydrateBuildMeta();
