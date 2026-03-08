// ============================================
// StartSetupUiOps.js - shared DOM/state helpers for start-setup UI
// ============================================

export function ensureStartSetupLocalState(settings) {
    if (!settings.localSettings || typeof settings.localSettings !== 'object') {
        settings.localSettings = {};
    }
    if (!settings.localSettings.startSetup || typeof settings.localSettings.startSetup !== 'object') {
        settings.localSettings.startSetup = {};
    }
    const startSetup = settings.localSettings.startSetup;
    if (!Array.isArray(startSetup.favoriteMaps)) startSetup.favoriteMaps = [];
    if (!Array.isArray(startSetup.recentMaps)) startSetup.recentMaps = [];
    if (!Array.isArray(startSetup.favoriteVehicles)) startSetup.favoriteVehicles = [];
    if (!Array.isArray(startSetup.recentVehicles)) startSetup.recentVehicles = [];
    if (typeof startSetup.mapSearch !== 'string') startSetup.mapSearch = '';
    if (typeof startSetup.mapFilter !== 'string') startSetup.mapFilter = 'all';
    if (typeof startSetup.vehicleSearch !== 'string') startSetup.vehicleSearch = '';
    if (typeof startSetup.vehicleFilter !== 'string') startSetup.vehicleFilter = 'all';
    return startSetup;
}

export function toggleFavoriteEntry(list, value, maxItems = 8) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue || !Array.isArray(list)) return;
    const index = list.indexOf(normalizedValue);
    if (index >= 0) {
        list.splice(index, 1);
        return;
    }
    list.unshift(normalizedValue);
    if (list.length > maxItems) list.length = maxItems;
}

export function pushRecentEntry(list, value, maxItems = 6) {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue || !Array.isArray(list)) return;
    const filtered = list.filter((entry) => entry !== normalizedValue);
    filtered.unshift(normalizedValue);
    if (filtered.length > maxItems) filtered.length = maxItems;
    list.length = 0;
    list.push(...filtered);
}

export function renderQuickList(container, items, dataKey) {
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'menu-hint';
        empty.textContent = 'keine';
        container.appendChild(empty);
        return;
    }
    items.forEach((value) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary-btn quick-pill';
        button.textContent = String(value);
        button.dataset[dataKey] = String(value);
        container.appendChild(button);
    });
}

export function humanizePreviewCategory(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'small') return 'Kompakt';
    if (normalized === 'medium') return 'Mittel';
    if (normalized === 'large') return 'Gross';
    if (normalized === 'light') return 'Leicht';
    if (normalized === 'heavy') return 'Schwer';
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Standard';
}

export function renderSummaryBlocks(container, blocks) {
    if (!container) return;
    const normalizedBlocks = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
    if (normalizedBlocks.length === 0) {
        container.textContent = 'Keine Auswahl vorhanden.';
        return;
    }
    container.innerHTML = normalizedBlocks.map((block) => {
        const label = String(block.label || '').trim();
        const value = String(block.value || '').trim();
        const toneClass = block.muted ? ' is-muted' : '';
        return `
                <div class="start-summary-block">
                    <span class="start-summary-label">${label}</span>
                    <span class="start-summary-value${toneClass}">${value}</span>
                </div>
            `;
    }).join('');
}

export function renderPreviewCard(container, payload = {}) {
    if (!container) return;
    const title = String(payload.title || '').trim() || 'Vorschau';
    const badges = Array.isArray(payload.badges) ? payload.badges.filter(Boolean) : [];
    const facts = Array.isArray(payload.facts) ? payload.facts.filter(Boolean) : [];
    const badgesMarkup = badges.map((badge) => `<span class="preview-badge">${String(badge)}</span>`).join('');
    const factsMarkup = facts.map((fact) => `
            <div class="preview-kv">
                <span class="preview-kv-label">${String(fact.label || '')}</span>
                <span class="preview-kv-value">${String(fact.value || '')}</span>
            </div>
        `).join('');
    container.innerHTML = `
            <div class="preview-card-title">${title}</div>
            <div class="preview-card-meta">${badgesMarkup}</div>
            <div class="preview-kv-grid">${factsMarkup}</div>
        `;
}
