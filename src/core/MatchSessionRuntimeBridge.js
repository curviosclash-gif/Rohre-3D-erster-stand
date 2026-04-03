// ============================================
// MatchSessionRuntimeBridge.js - match session ref apply/clear facade
// ============================================
//
// Contract:
// - Inputs: game runtime + initializedMatch payload from MatchSessionFactory
// - Outputs: stable current-session reference object for lifecycle operations
// - Side effects: applies/clears game runtime refs (arena/entity/powerup/particles)

import {
    applyMatchSessionState,
    clearMatchSessionState,
    getCurrentMatchSessionRefs,
    getSessionRuntimeHandle,
    setSessionRuntimeHandle,
} from './runtime/GameRuntimeBundle.js';
import { createMatchKernelInteractiveAdapter } from './MatchKernelInteractiveAdapter.js';

const MATCH_KERNEL_HANDLE_KEY = 'matchKernel';
const MATCH_KERNEL_ADAPTER_HANDLE_KEY = 'matchKernelAdapter';

export class MatchSessionRuntimeBridge {
    constructor(deps = {}) {
        this.game = deps.game || null;
        this.ports = deps.ports || null;
        this.runtimeBundle = deps.runtimeBundle || this.game?.runtimeBundle || null;
    }

    _getRuntimeHandle(key) {
        return getSessionRuntimeHandle(this.runtimeBundle || this.game?.runtimeBundle, key);
    }

    _setRuntimeHandle(key, value) {
        return setSessionRuntimeHandle(this.runtimeBundle || this.game?.runtimeBundle, key, value);
    }

    _disposeKernelAdapter() {
        const kernelAdapter = this.getCurrentMatchKernelAdapter();
        this.game?.playingStateSystem?.setKernelAdapter?.(null);
        kernelAdapter?.dispose?.();
        this._setRuntimeHandle(MATCH_KERNEL_ADAPTER_HANDLE_KEY, null);
    }

    _disposeMatchKernel() {
        const matchKernel = this.getCurrentMatchKernel();
        matchKernel?.dispose?.();
        this._setRuntimeHandle(MATCH_KERNEL_HANDLE_KEY, null);
    }

    applyInitializedMatchSession(initializedMatch) {
        const matchSession = initializedMatch?.session;
        if (!this.game || !matchSession) return;
        applyMatchSessionState(this.runtimeBundle || this.game.runtimeBundle, matchSession);

        this._disposeKernelAdapter();
        this._disposeMatchKernel();

        const matchKernel = initializedMatch?.kernel || null;
        if (!matchKernel) return;
        this._setRuntimeHandle(MATCH_KERNEL_HANDLE_KEY, matchKernel);
        const kernelAdapter = createMatchKernelInteractiveAdapter({
            game: this.game,
            kernel: matchKernel,
        });
        this._setRuntimeHandle(MATCH_KERNEL_ADAPTER_HANDLE_KEY, kernelAdapter);
        this.game?.playingStateSystem?.setKernelAdapter?.(kernelAdapter);
    }

    getCurrentMatchSessionRefs() {
        return getCurrentMatchSessionRefs(this.runtimeBundle || this.game?.runtimeBundle);
    }

    getCurrentMatchKernel() {
        return this._getRuntimeHandle(MATCH_KERNEL_HANDLE_KEY) || null;
    }

    getCurrentMatchKernelAdapter() {
        return this._getRuntimeHandle(MATCH_KERNEL_ADAPTER_HANDLE_KEY) || null;
    }

    clearMatchSessionRefs() {
        if (!this.game) return;
        this._disposeKernelAdapter();
        this._disposeMatchKernel();
        clearMatchSessionState(this.runtimeBundle || this.game.runtimeBundle);
    }
}
