// Load page and wait for visible main menu.
export async function loadGame(page) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#main-menu', { state: 'visible', timeout: 10000 });
}

export async function selectSessionType(page, sessionType = 'single') {
    const selector = `#menu-nav [data-session-type="${sessionType}"]`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const sessionButton = page.locator(selector).first();
        await sessionButton.waitFor({ state: 'visible', timeout: 4000 });
        await sessionButton.click({ force: true });

        const panelVisible = await page.evaluate(() => {
            const panel = document.getElementById('submenu-custom');
            return !!(panel && !panel.classList.contains('hidden'));
        });
        if (panelVisible) return;

        try {
            await openViaNavigationRuntime(page, 'submenu-custom');
            return;
        } catch {
            await page.waitForTimeout(150 * (attempt + 1));
        }
    }

    await page.waitForSelector('#submenu-custom:not(.hidden)', { timeout: 4000 });
}

async function openViaNavigationRuntime(page, submenuId) {
    const opened = await page.evaluate((panelId) => {
        const runtime = window.GAME_INSTANCE?.uiManager?.menuNavigationRuntime;
        if (!runtime?.showPanel) return false;
        return !!runtime.showPanel(panelId, { trigger: 'test_helper' });
    }, submenuId);
    if (!opened) {
        throw new Error(`Panel konnte nicht geoeffnet werden: ${submenuId}`);
    }
}

export async function openSubmenu(page, submenuId, options = {}) {
    if (submenuId === 'submenu-custom') {
        await selectSessionType(page, options.sessionType || 'single');
        return;
    }

    if (submenuId === 'submenu-game') {
        await selectSessionType(page, options.sessionType || 'single');
        const modePathButton = page.locator('#submenu-custom:not(.hidden) [data-mode-path="normal"]').first();
        if (await modePathButton.count()) {
            await modePathButton.click({ force: true });
        } else {
            await page.locator('#submenu-custom:not(.hidden) [data-menu-step-target="submenu-game"]').click({ force: true });
        }
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        return;
    }

    const navButton = page.locator(`#menu-nav [data-submenu="${submenuId}"]`).first();
    if (await navButton.count()) {
        await navButton.click({ force: true });
    } else {
        await openViaNavigationRuntime(page, submenuId);
    }
    await page.waitForSelector(`#${submenuId}:not(.hidden)`, { timeout: 4000 });
}

export async function openGameSubmenu(page, options = {}) {
    await openSubmenu(page, 'submenu-game', options);
}

export async function openStartSetupSection(page, sectionId) {
    const normalizedSectionId = String(sectionId || '').trim();
    if (!normalizedSectionId) {
        throw new Error('Start-Setup-Sektion fehlt.');
    }
    const gamePanelVisible = await page.locator('#submenu-game:not(.hidden)').count();
    if (!gamePanelVisible) {
        await openGameSubmenu(page);
    }
    const section = page.locator(`#submenu-game details[data-start-section="${normalizedSectionId}"]`).first();
    await section.waitFor({ state: 'attached', timeout: 4000 });
    const isOpen = await section.evaluate((element) => element instanceof HTMLDetailsElement && element.open);
    if (isOpen) return;
    await section.locator('summary').click({ force: true });
    await page.waitForFunction((id) => {
        const element = document.querySelector(`#submenu-game details[data-start-section="${id}"]`);
        return element instanceof HTMLDetailsElement && element.open === true;
    }, normalizedSectionId, { timeout: 4000 });
}

export async function openCustomSubmenu(page) {
    await openSubmenu(page, 'submenu-custom');
}

export async function openMultiplayerSubmenu(page) {
    await openSubmenu(page, 'submenu-game', { sessionType: 'multiplayer' });
}

export async function openLevel4Drawer(page, options = {}) {
    const gamePanelVisible = await page.locator('#submenu-game:not(.hidden)').count();
    if (!gamePanelVisible) {
        await openGameSubmenu(page, options);
    }
    await page.click('#btn-open-level4');
    await page.waitForSelector('#submenu-level4:not(.hidden)', { timeout: 4000 });
    if (options.section) {
        const sectionId = String(options.section).trim();
        await page.click(`#submenu-level4 [data-level4-section-target="${sectionId}"]`);
        await page.waitForSelector(`#submenu-level4 [data-level4-section="${sectionId}"].is-active`, { timeout: 4000 });
    }
}

export async function openExpertSubmenu(page) {
    const expertPanel = page.locator('#submenu-expert');
    if (await expertPanel.count()) {
        const isVisible = await expertPanel.isVisible().catch(() => false);
        if (isVisible) return;
    }
    const level4DrawerVisible = await page.locator('#submenu-level4:not(.hidden)').count();
    if (level4DrawerVisible) {
        await page.click('#btn-close-level4');
        await page.waitForFunction(() => {
            const drawer = document.getElementById('submenu-level4');
            return !!drawer && drawer.classList.contains('hidden');
        }, null, { timeout: 4000 });
    }
    await page.click('#btn-open-expert');
    await page.waitForSelector('#submenu-expert:not(.hidden)', { timeout: 4000 });
}

export async function unlockExpertMode(page, password = '1307') {
    const isUnlocked = await page.evaluate(() => !!window.GAME_INSTANCE?.menuExpertLoginRuntime?.isUnlocked?.());
    if (isUnlocked) return;
    await openExpertSubmenu(page);
    await page.fill('#expert-password-input', password);
    await page.click('#btn-expert-unlock');
    await page.waitForFunction(() => !!window.GAME_INSTANCE?.menuExpertLoginRuntime?.isUnlocked?.(), null, { timeout: 4000 });
}

export async function lockExpertMode(page) {
    await openExpertSubmenu(page);
    const isUnlocked = await page.evaluate(() => !!window.GAME_INSTANCE?.menuExpertLoginRuntime?.isUnlocked?.());
    if (!isUnlocked) return;
    await page.click('#btn-expert-lock');
    await page.waitForFunction(() => !window.GAME_INSTANCE?.menuExpertLoginRuntime?.isUnlocked?.(), null, { timeout: 4000 });
}

export async function openDeveloperSubmenu(page) {
    await unlockExpertMode(page);
    await openExpertSubmenu(page);
    await page.click('#btn-open-developer');
    await page.waitForSelector('#submenu-developer:not(.hidden)', { timeout: 4000 });
}

export async function openDebugSubmenu(page) {
    await unlockExpertMode(page);
    await openExpertSubmenu(page);
    await page.click('#btn-open-debug');
    await page.waitForSelector('#submenu-debug:not(.hidden)', { timeout: 4000 });
}

const BENIGN_ERROR_PATTERNS = [
    /wasm streaming compile failed/i,
    /falling back to ArrayBuffer instantiation/i,
    /\[AiBot\] Failed to load model:/i,
    /\[MediaRecorderSystem\] VideoEncoder error/i,
    /Encoder creation error/i,
    /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/i,
];

function isBenignErrorMessage(message) {
    return BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

async function triggerMatchStart(page) {
    const started = await page.evaluate(() => {
        const game = window.GAME_INSTANCE;
        if (game?.startMatch && typeof game.startMatch === 'function') {
            setTimeout(() => {
                try {
                    game.startMatch();
                } catch {
                    // Keep helper resilient; readiness wait will fail if start did not happen.
                }
            }, 0);
            return true;
        }

        const startButton = document.querySelector('#submenu-game:not(.hidden) #btn-start');
        if (!(startButton instanceof HTMLButtonElement)) return false;
        startButton.click();
        return true;
    });
    if (!started) {
        throw new Error('Start-Trigger nicht verfuegbar.');
    }
}

// Start game with default configuration.
export async function startGame(page) {
    await loadGame(page);
    await openGameSubmenu(page);
    await triggerMatchStart(page);
    await page.waitForFunction(() => {
        const hud = document.getElementById('hud');
        const g = window.GAME_INSTANCE;
        return !!(
            hud && !hud.classList.contains('hidden')
            && g?.entityManager?.players?.length > 0
        );
    }, null, { timeout: 30000 });
}

// Start game with N bots.
export async function startGameWithBots(page, botCount = 1) {
    await loadGame(page);
    await openGameSubmenu(page);
    await page.evaluate((count) => {
        const slider = document.getElementById('bot-count');
        slider.value = String(count);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, botCount);
    await triggerMatchStart(page);
    await page.waitForFunction(() => {
        const hud = document.getElementById('hud');
        const g = window.GAME_INSTANCE;
        return !!(
            hud && !hud.classList.contains('hidden')
            && g?.entityManager?.players?.length > 0
        );
    }, null, { timeout: 30000 });
}

// Start hunt mode with default bot count.
export async function startHuntGame(page) {
    await loadGame(page);
    await openCustomSubmenu(page);
    await page.click('#submenu-custom:not(.hidden) [data-mode-path="fight"]');
    await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
    await triggerMatchStart(page);
    await page.waitForFunction(() => {
        const hud = document.getElementById('hud');
        const huntHud = document.getElementById('hunt-hud');
        const game = window.GAME_INSTANCE;
        return !!(
            hud && !hud.classList.contains('hidden')
            && huntHud && !huntHud.classList.contains('hidden')
            && game?.entityManager?.players?.length > 0
        );
    }, null, { timeout: 30000 });
}

// Start hunt mode with configurable bot count.
export async function startHuntGameWithBots(page, botCount = 1) {
    await loadGame(page);
    await openCustomSubmenu(page);
    await page.click('#submenu-custom:not(.hidden) [data-mode-path="fight"]');
    await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
    await page.evaluate((count) => {
        const slider = document.getElementById('bot-count');
        slider.value = String(count);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, botCount);
    await triggerMatchStart(page);
    await page.waitForFunction(() => {
        const hud = document.getElementById('hud');
        const huntHud = document.getElementById('hunt-hud');
        const game = window.GAME_INSTANCE;
        return !!(
            hud && !hud.classList.contains('hidden')
            && huntHud && !huntHud.classList.contains('hidden')
            && game?.entityManager?.players?.length > 1
        );
    }, null, { timeout: 30000 });
}

// Press ESC and wait for main menu.
export async function returnToMenu(page) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await page.keyboard.press('Escape');
        const menuVisible = await page.evaluate(() => {
            const mainMenu = document.getElementById('main-menu');
            return !!(mainMenu && !mainMenu.classList.contains('hidden'));
        });
        if (menuVisible) return;
        await page.waitForTimeout(180);
    }

    await page.evaluate(() => {
        window.GAME_INSTANCE?._returnToMenu?.();
    });
    await page.waitForSelector('#main-menu', { state: 'visible', timeout: 8000 });
}

// Register error listeners and return captured error list.
export function collectErrors(page) {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const message = msg.text();
            if (isBenignErrorMessage(message)) return;
            errors.push(`console.error: ${message}`);
        }
    });
    return errors;
}
