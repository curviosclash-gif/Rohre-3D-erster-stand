// ============================================
// KeyboardInputSource.js - keyboard input adapter
// ============================================

import { PlayerInputSource } from './PlayerInputSource.js';

/**
 * Adapts the existing InputManager to the PlayerInputSource interface.
 * For splitscreen, two KeyboardInputSources can exist (P1 + P2 bindings).
 * For network play, only one exists (the local player).
 */
export class KeyboardInputSource extends PlayerInputSource {
    constructor(inputManager, options = {}) {
        super('keyboard');
        this._inputManager = inputManager;
        this._includeSecondaryBindings = !!options.includeSecondaryBindings;
    }

    poll() {
        if (!this._inputManager || this.playerIndex < 0) return null;
        return this._inputManager.getPlayerInput(this.playerIndex, {
            includeSecondaryBindings: this._includeSecondaryBindings,
        });
    }

    dispose() {
        this._inputManager = null;
        super.dispose();
    }
}
