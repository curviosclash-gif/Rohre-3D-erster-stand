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
};

const frame = document.querySelector('#mapFrame');
const activeLabel = document.querySelector('#activeLabel');
const buildMeta = document.querySelector('#buildMeta');
const updateStatus = document.querySelector('#updateStatus');
const updateCheck = document.querySelector('#updateCheck');
const updateOpen = document.querySelector('#updateOpen');
const planFilterStrip = document.querySelector('#planFilterStrip');
const planWorkstream = document.querySelector('#planWorkstream');
const planChangelog = document.querySelector('#planChangelog');
const tabButtons = [...document.querySelectorAll('[data-view-id]')];

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

function openPlanChangelog(attempt = 0) {
  selectView('plan');
  applyPlanWorkstreamFilter();
  try {
    frame.contentWindow?.postMessage({
      type: 'curvios.plan-map:set-filter',
      view: 'changelog',
      workstream: planWorkstream.value || 'all',
    }, '*');
  } catch {
    if (attempt < 8) {
      window.setTimeout(() => openPlanChangelog(attempt + 1), 120);
    }
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
  updateStatus.textContent = text;
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
    state.updateTargetUrl = release.html_url || state.updateConfig.latestReleaseUrl;
    updateOpen.hidden = false;
    setUpdateStatus(`GitHub ${release.tag_name || release.name || 'Release'}`);
  } catch {
    state.updateTargetUrl = state.updateConfig.latestReleaseUrl;
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
      return;
    }
    const manifest = await response.json();
    state.updateConfig = normalizeUpdateConfig(manifest);
    state.updateTargetUrl = state.updateConfig.latestReleaseUrl;
    buildMeta.textContent = manifest.generatedAt
      ? `Snapshot ${new Date(manifest.generatedAt).toLocaleDateString('de-DE')}`
      : 'read-only Android snapshot';
  } catch {
    buildMeta.textContent = 'read-only Android snapshot';
  }
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectView(button.dataset.viewId);
  });
});

frame.addEventListener('load', () => {
  applyPlanWorkstreamFilter();
});

planWorkstream.addEventListener('change', () => {
  applyPlanWorkstreamFilter();
});

planChangelog.addEventListener('click', () => {
  openPlanChangelog();
});

updateCheck.addEventListener('click', () => {
  void checkGithubRelease();
});

updateOpen.addEventListener('click', openUpdateTarget);

selectView('plan');
void hydrateBuildMeta();
