import { resolveMenuCatalogText } from '../menu/MenuTextCatalog.js';
import { setupArcadeVehicleManager } from './ArcadeVehicleManager.js';

const ARCADE_SEED_STORAGE_KEY = 'cuviosclash.arcade.seed.v1';
const ARCADE_LAST_RUN_STORAGE_KEY = 'cuviosclash.arcade.last_run.v1';

function t(textId, fallback) {
    return resolveMenuCatalogText(textId, fallback);
}

function normalizeString(value, fallback = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function safeReadLocalStorage(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeWriteLocalStorage(key, value) {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function computeDailySeed() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    return (year * 10000) + (month * 100) + day;
}

function loadSeed() {
    const raw = safeReadLocalStorage(ARCADE_SEED_STORAGE_KEY);
    const parsed = toInt(raw, 0);
    if (parsed > 0) return parsed;
    return Math.floor(Math.random() * 1_000_000) + 1;
}

function saveSeed(seed) {
    safeWriteLocalStorage(ARCADE_SEED_STORAGE_KEY, String(seed));
}

function loadLastRunSnapshot() {
    const raw = safeReadLocalStorage(ARCADE_LAST_RUN_STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

function saveLastRunSnapshot(snapshot) {
    safeWriteLocalStorage(ARCADE_LAST_RUN_STORAGE_KEY, JSON.stringify(snapshot));
}

function formatRunTime(isoTime) {
    const date = new Date(isoTime);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
}

function createElement(tag, className, textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

function createMetric(labelText, valueText = '-') {
    const metric = createElement('div', 'arcade-hud-metric');
    const label = createElement('span', 'arcade-hud-metric-label', labelText);
    const value = createElement('strong', 'arcade-hud-metric-value', valueText);
    metric.appendChild(label);
    metric.appendChild(value);
    return { metric, value };
}

function buildArcadeSurface(level3Body, ui) {
    const details = createElement('details', 'menu-section menu-accordion start-section-card arcade-inline-surface hidden');
    details.id = 'arcade-inline-surface';
    details.dataset.startSection = 'arcade';

    const summary = createElement('summary', 'menu-accordion-summary');
    const summaryTitle = createElement('span', 'section-title', t('menu.arcade.title', 'Arcade Run'));
    const summaryCopy = createElement('span', 'menu-accordion-copy', t('menu.arcade.summary', 'Run-Layer, Score-Jagd und Seed-Anker'));
    summary.appendChild(summaryTitle);
    summary.appendChild(summaryCopy);
    details.appendChild(summary);

    const body = createElement('div', 'menu-accordion-body arcade-surface-body');

    const runLine = createElement('p', 'menu-hint arcade-run-line');
    runLine.id = 'arcade-run-line';
    body.appendChild(runLine);

    const cardGrid = createElement('div', 'arcade-surface-grid');

    const seedCard = createElement('section', 'arcade-surface-card');
    seedCard.appendChild(createElement('h3', 'arcade-surface-card-title', t('menu.arcade.seed.title', 'Seed und Challenge')));
    const seedLine = createElement('p', 'arcade-surface-card-value');
    seedLine.id = 'arcade-seed-line';
    seedCard.appendChild(seedLine);
    const seedActions = createElement('div', 'arcade-surface-actions');
    const rerollSeedButton = createElement('button', 'secondary-btn', t('menu.arcade.seed.reroll.label', 'Seed neu rollen'));
    rerollSeedButton.type = 'button';
    rerollSeedButton.id = 'btn-arcade-seed-reroll';
    const copySeedButton = createElement('button', 'secondary-btn', t('menu.arcade.seed.copy.label', 'Seed als Challenge nutzen'));
    copySeedButton.type = 'button';
    copySeedButton.id = 'btn-arcade-seed-copy';
    seedActions.appendChild(rerollSeedButton);
    seedActions.appendChild(copySeedButton);
    seedCard.appendChild(seedActions);
    cardGrid.appendChild(seedCard);

    const hudCard = createElement('section', 'arcade-surface-card');
    hudCard.appendChild(createElement('h3', 'arcade-surface-card-title', t('menu.arcade.hud.title', 'HUD Shell')));
    const hudGrid = createElement('div', 'arcade-hud-shell-grid');
    const metricScore = createMetric(t('menu.arcade.hud.score.label', 'Score'), '0');
    const metricMultiplier = createMetric(t('menu.arcade.hud.multiplier.label', 'x-Multi'), 'x1.0');
    const metricSector = createMetric(t('menu.arcade.hud.sector.label', 'Sektor'), '1');
    const metricChain = createMetric(t('menu.arcade.hud.chain.label', 'Combo'), '0');
    hudGrid.appendChild(metricScore.metric);
    hudGrid.appendChild(metricMultiplier.metric);
    hudGrid.appendChild(metricSector.metric);
    hudGrid.appendChild(metricChain.metric);
    hudCard.appendChild(hudGrid);
    cardGrid.appendChild(hudCard);

    const postRunCard = createElement('section', 'arcade-surface-card');
    postRunCard.appendChild(createElement('h3', 'arcade-surface-card-title', t('menu.arcade.postrun.title', 'Post-Run Feedback')));
    const postRunLine = createElement('p', 'arcade-surface-card-value');
    postRunLine.id = 'arcade-post-run-line';
    postRunCard.appendChild(postRunLine);
    const postRunActions = createElement('div', 'arcade-surface-actions');
    const replayButton = createElement('button', 'secondary-btn', t('menu.arcade.postrun.replay.label', 'Replay (Platzhalter)'));
    replayButton.type = 'button';
    replayButton.id = 'btn-arcade-replay-placeholder';
    const dailyButton = createElement('button', 'secondary-btn', t('menu.arcade.postrun.daily.label', 'Daily Seed (Platzhalter)'));
    dailyButton.type = 'button';
    dailyButton.id = 'btn-arcade-daily-placeholder';
    postRunActions.appendChild(replayButton);
    postRunActions.appendChild(dailyButton);
    postRunCard.appendChild(postRunActions);
    cardGrid.appendChild(postRunCard);

    const masteryCard = createElement('section', 'arcade-surface-card');
    masteryCard.appendChild(createElement('h3', 'arcade-surface-card-title', t('menu.arcade.mastery.title', 'Vehicle Mastery')));
    const masteryLine = createElement('p', 'arcade-surface-card-value');
    masteryLine.id = 'arcade-mastery-line';
    masteryCard.appendChild(masteryLine);
    const masteryHint = createElement('p', 'menu-hint', t('menu.arcade.mastery.hint', 'Mastery-, Blueprint- und Lab-Hooks folgen in V45.3.'));
    masteryCard.appendChild(masteryHint);
    cardGrid.appendChild(masteryCard);

    body.appendChild(cardGrid);

    // Vehicle Manager card placeholder (inserted by setupArcadeMenuSurface)
    const vehicleManagerSlot = createElement('div', 'arcade-vehicle-manager-slot');
    vehicleManagerSlot.id = 'arcade-vehicle-manager-slot';
    body.appendChild(vehicleManagerSlot);

    const ctaRow = createElement('div', 'arcade-surface-cta');
    const startRunButton = createElement('button', 'start-btn', t('menu.arcade.start.label', 'Arcade Run starten'));
    startRunButton.type = 'button';
    startRunButton.id = 'btn-arcade-start-inline';
    ctaRow.appendChild(startRunButton);
    body.appendChild(ctaRow);

    details.appendChild(body);

    const multiplayerSection = level3Body.querySelector('[data-start-section="multiplayer"]');
    if (multiplayerSection && multiplayerSection.parentElement === level3Body) {
        level3Body.insertBefore(details, multiplayerSection);
    } else {
        level3Body.appendChild(details);
    }

    ui.arcadeInlineSurface = details;
    ui.arcadeStartInlineButton = startRunButton;
    ui.arcadeSeedRerollButton = rerollSeedButton;
    ui.arcadeSeedCopyButton = copySeedButton;
    ui.arcadeReplayPlaceholderButton = replayButton;
    ui.arcadeDailyPlaceholderButton = dailyButton;

    return {
        details,
        runLine,
        seedLine,
        postRunLine,
        masteryLine,
        metricScore: metricScore.value,
        metricMultiplier: metricMultiplier.value,
        metricSector: metricSector.value,
        metricChain: metricChain.value,
        startRunButton,
        rerollSeedButton,
        copySeedButton,
        replayButton,
        dailyButton,
    };
}

function shouldShowArcade(settings) {
    const modePath = String(settings?.localSettings?.modePath || '').trim().toLowerCase();
    return modePath === 'arcade';
}

function createArcadeRunSnapshot(settings, seed) {
    return {
        at: new Date().toISOString(),
        mapKey: normalizeString(settings?.mapKey, 'standard'),
        vehicleId: normalizeString(settings?.vehicles?.PLAYER_1, 'ship5'),
        botCount: toInt(settings?.numBots, 0),
        botDifficulty: normalizeString(settings?.botDifficulty, 'NORMAL').toUpperCase(),
        seed: toInt(seed, 0),
    };
}

export function setupArcadeMenuSurface(ctx = {}) {
    const ui = ctx.ui || {};
    const settings = ctx.settings && typeof ctx.settings === 'object' ? ctx.settings : {};
    const emit = typeof ctx.emit === 'function' ? ctx.emit : null;
    const eventTypes = ctx.eventTypes && typeof ctx.eventTypes === 'object' ? ctx.eventTypes : {};
    const bind = typeof ctx.bind === 'function' ? ctx.bind : null;

    if (!emit || !bind) return;

    const level3Body = document.querySelector('#submenu-game .level3-body');
    if (!level3Body) return;

    const existing = document.getElementById('arcade-inline-surface');
    if (existing?.parentElement) {
        existing.parentElement.removeChild(existing);
    }

    const refs = buildArcadeSurface(level3Body, ui);
    let activeSeed = loadSeed();
    let lastRunSnapshot = loadLastRunSnapshot();

    // Setup Vehicle Manager (V57)
    const vehicleManager = setupArcadeVehicleManager({
        ui,
        settings,
        emit,
        eventTypes,
        bind,
        settingsManager: ctx.settingsManager || null,
    });
    if (vehicleManager?.container) {
        const slot = document.getElementById('arcade-vehicle-manager-slot');
        if (slot) slot.appendChild(vehicleManager.container);
    }

    const sync = () => {
        const isArcade = shouldShowArcade(settings);
        refs.details.classList.toggle('hidden', !isArcade);
        refs.details.open = isArcade;
        if (!isArcade) return;

        const mapKey = normalizeString(settings?.mapKey, 'standard');
        const vehicleId = normalizeString(settings?.vehicles?.PLAYER_1, 'ship5');
        const difficulty = normalizeString(settings?.botDifficulty, 'NORMAL').toUpperCase();
        const botCount = toInt(settings?.numBots, 0);
        const dailySeed = computeDailySeed();

        refs.runLine.textContent = `${t('menu.arcade.runline.label', 'Aktueller Arcade-Layer')}: ${mapKey} | Bots ${botCount} | ${difficulty}`;
        refs.seedLine.textContent = `${t('menu.arcade.seed.current.label', 'Run-Seed')}: ${activeSeed} | ${t('menu.arcade.seed.daily.label', 'Daily')}: ${dailySeed}`;

        refs.metricScore.textContent = String((botCount + 1) * 1000);
        refs.metricMultiplier.textContent = botCount > 3 ? 'x1.8' : 'x1.2';
        refs.metricSector.textContent = botCount > 3 ? '2' : '1';
        refs.metricChain.textContent = botCount > 3 ? '6' : '3';

        if (lastRunSnapshot) {
            const timeLabel = formatRunTime(lastRunSnapshot.at);
            refs.postRunLine.textContent = `${t('menu.arcade.postrun.last.label', 'Letzter Start')}: ${timeLabel} | ${lastRunSnapshot.mapKey} | ${lastRunSnapshot.vehicleId} | Seed ${lastRunSnapshot.seed}`;
        } else {
            refs.postRunLine.textContent = t('menu.arcade.postrun.empty', 'Noch kein Arcade-Run gestartet.');
        }

        refs.masteryLine.textContent = `${t('menu.arcade.mastery.current.label', 'Aktives Airframe')}: ${vehicleId} | ${t('menu.arcade.mastery.progress.label', 'Mastery')} 0/5`;
    };

    const recordRunStart = () => {
        if (!shouldShowArcade(settings)) return;
        const snapshot = createArcadeRunSnapshot(settings, activeSeed);
        lastRunSnapshot = snapshot;
        saveLastRunSnapshot(snapshot);
        sync();
    };

    bind(refs.startRunButton, 'click', () => {
        recordRunStart();
        emit(eventTypes.START_MATCH);
    });

    bind(refs.rerollSeedButton, 'click', () => {
        activeSeed = Math.floor(Math.random() * 1_000_000) + 1;
        saveSeed(activeSeed);
        sync();
        emit(eventTypes.SHOW_STATUS_TOAST, {
            message: t('menu.arcade.seed.rerolled.toast', 'Arcade-Seed aktualisiert.'),
            tone: 'info',
            duration: 1100,
        });
    });

    bind(refs.copySeedButton, 'click', () => {
        emit(eventTypes.SHOW_STATUS_TOAST, {
            message: `${t('menu.arcade.seed.challenge.toast', 'Challenge-Seed bereit')}: ${activeSeed}`,
            tone: 'info',
            duration: 1400,
        });
    });

    bind(refs.replayButton, 'click', () => {
        emit(eventTypes.SHOW_STATUS_TOAST, {
            message: t('menu.arcade.postrun.replay.toast', 'Replay-Hook folgt in V45.2.'),
            tone: 'warning',
            duration: 1300,
        });
    });

    bind(refs.dailyButton, 'click', () => {
        emit(eventTypes.SHOW_STATUS_TOAST, {
            message: `${t('menu.arcade.postrun.daily.toast', 'Daily-Seed-Hook folgt in V45.8')}: ${computeDailySeed()}`,
            tone: 'warning',
            duration: 1400,
        });
    });

    if (ui.startButton) {
        bind(ui.startButton, 'click', () => {
            recordRunStart();
        });
    }

    const syncOnInteraction = () => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(sync);
            return;
        }
        setTimeout(sync, 0);
    };

    const syncTriggers = [
        ...(Array.isArray(ui.modePathButtons) ? ui.modePathButtons : []),
        ...(Array.isArray(ui.sessionButtons) ? ui.sessionButtons : []),
        ui.mapSelect,
        ui.vehicleSelectP1,
        ui.botSlider,
        ui.botDifficultySelect,
        ui.level3ResetButton,
    ].filter(Boolean);

    syncTriggers.forEach((element) => {
        bind(element, 'change', syncOnInteraction);
        bind(element, 'input', syncOnInteraction);
        bind(element, 'click', syncOnInteraction);
    });

    sync();
}
