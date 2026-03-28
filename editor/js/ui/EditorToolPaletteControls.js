import {
    findEditorBuildEntryByToolAndSubtype,
    getEditorBuildCategories,
    getEditorBuildEntriesForCategory
} from './EditorBuildCatalog.js';
import { createEditorToolDockState } from './EditorToolDockState.js';

function syncLegacySubtypeInputs(dom, entry) {
    if (!dom || !entry) return;

    const entryValue = String(entry.subType ?? '');
    if (entry.tool === 'spawn' && dom.selSpawnType) dom.selSpawnType.value = entryValue;
    if (entry.tool === 'tunnel' && dom.selTunnelType) dom.selTunnelType.value = entryValue;
    if (entry.tool === 'portal' && dom.selPortalType) dom.selPortalType.value = entryValue;
    if (entry.tool === 'item' && dom.selItemType) dom.selItemType.value = entryValue;
    if (entry.tool === 'aircraft' && dom.selAircraftType) dom.selAircraftType.value = entryValue;
}

function createEntryButton(entry, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.entryId = entry.id;
    button.dataset.tool = entry.tool;
    button.dataset.subType = String(entry.subType ?? '');
    button.style.setProperty('--entry-accent', entry.accentColor);
    button.className = options.compact ? 'dockMiniCard' : 'buildCard';

    if (options.isActive) {
        button.classList.add('is-active');
    } else if (options.isSelected) {
        button.classList.add('is-selected');
    }

    if (options.compact) {
        button.innerHTML = `
            <span class="dockMiniGlyph">${entry.previewGlyph}</span>
            <span class="dockMiniLabel">${entry.label}</span>
        `;
        return button;
    }

    button.innerHTML = `
        <span class="buildCardPreview" data-preview-token="${entry.previewToken}" aria-hidden="true">
            <span class="buildCardPreviewGlyph">${entry.previewGlyph}</span>
        </span>
        <span class="buildCardBody">
            <span class="buildCardTitleRow">
                <span class="buildCardTitle">${entry.label}</span>
                ${entry.badge ? `<span class="buildCardBadge">${entry.badge}</span>` : ''}
            </span>
            <span class="buildCardDescription">${entry.description}</span>
        </span>
    `;

    return button;
}

function renderShortcutList(container, entries, snapshot, onSelect, emptyLabel) {
    if (!container) return;
    container.replaceChildren();

    if (!entries.length) {
        const emptyState = document.createElement('span');
        emptyState.className = 'dockShortcutEmpty';
        emptyState.textContent = emptyLabel;
        container.appendChild(emptyState);
        return;
    }

    for (const entry of entries) {
        const button = createEntryButton(entry, {
            compact: true,
            isActive: snapshot.mode === 'place' && snapshot.selectedEntry?.id === entry.id,
            isSelected: snapshot.selectedEntry?.id === entry.id
        });
        button.addEventListener('click', () => onSelect(entry.id));
        container.appendChild(button);
    }
}

function enableHorizontalWheelScroll(container) {
    if (!container || container.dataset.horizontalWheelBound === '1') return;
    container.dataset.horizontalWheelBound = '1';
    container.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        container.scrollLeft += event.deltaY;
        event.preventDefault();
    }, { passive: false });
}

function updateSummaryViews(dom, snapshot) {
    const activeEntry = snapshot.selectedEntry;
    const isSelectionMode = snapshot.mode === 'select';
    const title = isSelectionMode
        ? 'Auswahl / Bewegen'
        : (activeEntry?.label || 'Build-Dock');
    const description = isSelectionMode
        ? `Letzte Baukarte: ${activeEntry?.label || 'keine'}. Unten eine Karte anklicken und dann in die Szene klicken.`
        : `${activeEntry?.description || 'Objekt platzieren.'} Klick in die Szene, um die Platzierung auszufuehren.`;
    const badgeText = isSelectionMode ? 'Auswahl' : 'Bau-Modus';

    if (dom.inspectorToolModeBadge) dom.inspectorToolModeBadge.textContent = badgeText;
    if (dom.inspectorToolTitle) dom.inspectorToolTitle.textContent = title;
    if (dom.inspectorToolDescription) dom.inspectorToolDescription.textContent = description;
    if (dom.dockModeBadge) dom.dockModeBadge.textContent = badgeText;
    if (dom.dockActiveTitle) dom.dockActiveTitle.textContent = title;
    if (dom.dockActiveDescription) dom.dockActiveDescription.textContent = description;
}

export function bindEditorToolPaletteControls(editor) {
    if (!editor) return;
    const dom = editor.dom || {};
    const categories = getEditorBuildCategories();
    const toolDockState = createEditorToolDockState();
    editor.toolDockState = toolDockState;

    const applySnapshotToEditor = (snapshot, options = {}) => {
        const activeEntry = snapshot.selectedEntry;
        syncLegacySubtypeInputs(dom, activeEntry);

        const nextTool = snapshot.mode === 'place' ? (activeEntry?.tool || 'select') : 'select';
        const shouldClearSelection = options.clearSelection === true && nextTool !== 'select';
        editor.currentTool = nextTool;

        if (shouldClearSelection) {
            editor.selectObject(null);
        }

        updateSummaryViews(dom, snapshot);

        if (dom.btnDockSelectMode) {
            dom.btnDockSelectMode.classList.toggle('active', snapshot.mode === 'select');
            dom.btnDockSelectMode.setAttribute('aria-pressed', snapshot.mode === 'select' ? 'true' : 'false');
        }

        if (dom.btnDockFavoriteToggle) {
            const favoriteActive = !!activeEntry && snapshot.favoriteEntries.some((entry) => entry.id === activeEntry.id);
            dom.btnDockFavoriteToggle.textContent = favoriteActive ? 'Favorit loesen' : 'Favorit merken';
            dom.btnDockFavoriteToggle.classList.toggle('active', favoriteActive);
            dom.btnDockFavoriteToggle.disabled = !activeEntry;
        }
    };

    const renderCategoryTabs = (snapshot) => {
        if (!dom.dockCategoryTabs) return;
        dom.dockCategoryTabs.replaceChildren();

        for (const category of categories) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dockCategoryTab';
            button.dataset.categoryId = category.id;
            button.style.setProperty('--entry-accent', category.accentColor);
            if (snapshot.currentCategoryId === category.id) {
                button.classList.add('active');
            }
            const categoryCount = getEditorBuildEntriesForCategory(category.id).length;
            button.innerHTML = `
                <span class="dockCategoryLabel">${category.label}</span>
                <span class="dockCategoryCount">${categoryCount}</span>
            `;
            button.addEventListener('click', () => {
                const nextSnapshot = toolDockState.activateCategory(category.id);
                applySnapshotToEditor(nextSnapshot, { clearSelection: true });
                renderAll(nextSnapshot);
            });
            dom.dockCategoryTabs.appendChild(button);
        }
    };

    const renderCards = (snapshot) => {
        if (!dom.dockCards) return;
        dom.dockCards.replaceChildren();

        const entries = getEditorBuildEntriesForCategory(snapshot.currentCategoryId);

        for (const entry of entries) {
            const button = createEntryButton(entry, {
                isActive: snapshot.mode === 'place' && snapshot.selectedEntry?.id === entry.id,
                isSelected: snapshot.selectedEntry?.id === entry.id
            });
            button.addEventListener('click', () => {
                const nextSnapshot = toolDockState.activateEntry(entry.id);
                applySnapshotToEditor(nextSnapshot, { clearSelection: true });
                renderAll(nextSnapshot);
            });
            dom.dockCards.appendChild(button);
        }
    };

    const renderAll = (snapshot = toolDockState.getSnapshot()) => {
        renderCategoryTabs(snapshot);
        renderCards(snapshot);
        renderShortcutList(
            dom.dockRecentList,
            snapshot.recentEntries,
            snapshot,
            (entryId) => {
                const nextSnapshot = toolDockState.activateEntry(entryId);
                applySnapshotToEditor(nextSnapshot, { clearSelection: true });
                renderAll(nextSnapshot);
            },
            'Noch nichts benutzt'
        );
        renderShortcutList(
            dom.dockFavoriteList,
            snapshot.favoriteEntries,
            snapshot,
            (entryId) => {
                const nextSnapshot = toolDockState.activateEntry(entryId, { recordRecent: false });
                applySnapshotToEditor(nextSnapshot, { clearSelection: true });
                renderAll(nextSnapshot);
            },
            'Keine Favoriten'
        );
    };

    dom.btnDockSelectMode?.addEventListener('click', () => {
        const nextSnapshot = toolDockState.activateSelectionMode();
        applySnapshotToEditor(nextSnapshot);
        renderAll(nextSnapshot);
    });

    dom.btnDockFavoriteToggle?.addEventListener('click', () => {
        const nextSnapshot = toolDockState.toggleFavorite();
        applySnapshotToEditor(nextSnapshot);
        renderAll(nextSnapshot);
    });

    [
        ['spawn', dom.selSpawnType],
        ['tunnel', dom.selTunnelType],
        ['portal', dom.selPortalType],
        ['item', dom.selItemType],
        ['aircraft', dom.selAircraftType]
    ].forEach(([tool, select]) => {
        select?.addEventListener('change', () => {
            const entry = findEditorBuildEntryByToolAndSubtype(tool, select.value);
            if (!entry) return;
            const nextSnapshot = toolDockState.activateEntry(entry.id, { recordRecent: false });
            applySnapshotToEditor(nextSnapshot);
            renderAll(nextSnapshot);
        });
    });

    enableHorizontalWheelScroll(dom.dockCards);
    enableHorizontalWheelScroll(dom.dockRecentList);
    enableHorizontalWheelScroll(dom.dockFavoriteList);

    const initialSnapshot = toolDockState.getSnapshot();
    applySnapshotToEditor(initialSnapshot);
    renderAll(initialSnapshot);
}
