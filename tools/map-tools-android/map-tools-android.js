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

const frame = document.querySelector('#mapFrame');
const activeLabel = document.querySelector('#activeLabel');
const buildMeta = document.querySelector('#buildMeta');
const tabButtons = [...document.querySelectorAll('[data-view-id]')];

function normalizeViewId(viewId) {
  return Object.prototype.hasOwnProperty.call(views, viewId) ? viewId : 'plan';
}

function selectView(viewId) {
  const selectedView = views[normalizeViewId(viewId)];
  frame.src = selectedView.path;
  activeLabel.textContent = selectedView.label;
  tabButtons.forEach((button) => {
    const isSelected = button.dataset.viewId === selectedView.id;
    button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
}

async function hydrateBuildMeta() {
  try {
    const response = await fetch('./map-tools-android.manifest.json', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }
    const manifest = await response.json();
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

selectView('plan');
void hydrateBuildMeta();
