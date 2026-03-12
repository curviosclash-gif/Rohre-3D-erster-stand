const EXPERT_PASSWORD = '1307';
const MENU_EXPERT_STATE_KEY = Symbol('menuExpertState');

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function setElementHidden(element, hidden) {
    if (!element) return;
    element.classList.toggle('hidden', !!hidden);
    element.setAttribute('aria-hidden', String(!!hidden));
    if (hidden) {
        element.setAttribute('tabindex', '-1');
        return;
    }
    element.removeAttribute('tabindex');
}

export function attachMenuExpertState(settings, state) {
    if (!settings || typeof settings !== 'object') return null;
    Object.defineProperty(settings, MENU_EXPERT_STATE_KEY, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: state,
    });
    return state;
}

export function resolveMenuExpertState(settings) {
    const state = settings && typeof settings === 'object'
        ? settings[MENU_EXPERT_STATE_KEY]
        : null;
    return state && typeof state === 'object' ? state : null;
}

export class MenuExpertLoginRuntime {
    constructor(options = {}) {
        this.settings = options.settings || null;
        this.ui = options.ui || null;
        this.showStatusToast = typeof options.showStatusToast === 'function'
            ? options.showStatusToast
            : (() => { });
        this.onStateChanged = typeof options.onStateChanged === 'function'
            ? options.onStateChanged
            : null;
        this.state = {
            unlocked: false,
            error: '',
            lastAttemptAt: 0,
        };
        attachMenuExpertState(this.settings, this.state);
    }

    bindUi(ui) {
        this.ui = ui || this.ui;
        this.syncUi();
    }

    isUnlocked() {
        return this.state.unlocked === true;
    }

    getState() {
        return {
            unlocked: this.isUnlocked(),
            error: String(this.state.error || ''),
            lastAttemptAt: Number(this.state.lastAttemptAt || 0),
        };
    }

    clearError() {
        if (!this.state.error) return;
        this.state.error = '';
        this.syncUi();
    }

    unlock(rawPassword = '') {
        const password = normalizeString(rawPassword);
        this.state.lastAttemptAt = Date.now();
        if (password !== EXPERT_PASSWORD) {
            this.state.unlocked = false;
            this.state.error = 'Passwort falsch.';
            this.syncUi();
            return {
                success: false,
                reason: 'invalid_password',
                state: this.getState(),
            };
        }

        this.state.unlocked = true;
        this.state.error = '';
        if (this.ui?.expertPasswordInput) {
            this.ui.expertPasswordInput.value = '';
        }
        this.syncUi();
        this.showStatusToast('Expertenbereich freigeschaltet.', 1400, 'success');
        return {
            success: true,
            reason: 'unlocked',
            state: this.getState(),
        };
    }

    lock(options = {}) {
        const silent = options?.silent === true;
        const wasUnlocked = this.state.unlocked === true;
        this.state.unlocked = false;
        this.state.error = '';
        this.state.lastAttemptAt = Date.now();
        if (this.ui?.expertPasswordInput) {
            this.ui.expertPasswordInput.value = '';
        }
        this.syncUi();
        if (wasUnlocked && !silent) {
            this.showStatusToast('Expertenbereich gesperrt.', 1400, 'info');
        }
        return {
            success: true,
            reason: 'locked',
            state: this.getState(),
        };
    }

    focusPrimaryControl() {
        if (!this.ui) return;
        if (this.isUnlocked()) {
            this.ui.openDeveloperButton?.focus?.();
            return;
        }
        this.ui.expertPasswordInput?.focus?.();
    }

    syncUi() {
        if (!this.ui) {
            this._notifyStateChanged();
            return;
        }

        const unlocked = this.isUnlocked();
        const statusText = unlocked
            ? 'Expertenbereich fuer diese Sitzung freigeschaltet.'
            : (this.state.error || 'Developer, Debug und Training sind lokal gesperrt.');

        if (this.ui.openExpertButton) {
            this.ui.openExpertButton.textContent = unlocked ? 'Expert offen' : 'Expert';
            this.ui.openExpertButton.setAttribute('aria-pressed', String(unlocked));
        }
        setElementHidden(this.ui.expertQuickLockButton, !unlocked);
        setElementHidden(this.ui.expertLockedState, unlocked);
        setElementHidden(this.ui.expertUnlockedState, !unlocked);

        if (this.ui.expertStatus) {
            this.ui.expertStatus.textContent = statusText;
            this.ui.expertStatus.classList.toggle('is-error', !unlocked && !!this.state.error);
            this.ui.expertStatus.classList.toggle('is-success', unlocked);
            this.ui.expertStatus.classList.remove('hidden');
        }

        if (this.ui.expertPasswordInput) {
            this.ui.expertPasswordInput.setAttribute('aria-invalid', String(!unlocked && !!this.state.error));
        }

        this._notifyStateChanged();
    }

    _notifyStateChanged() {
        this.onStateChanged?.(this.getState());
    }
}
