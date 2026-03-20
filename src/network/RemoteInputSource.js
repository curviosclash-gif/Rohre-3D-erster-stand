// ============================================
// RemoteInputSource.js - deserialized network inputs
// ============================================

import { PlayerInputSource } from '../core/input/PlayerInputSource.js';

/**
 * Input source for remote players (received over WebRTC).
 * Buffers the latest input received from the network and returns it on poll().
 */
export class RemoteInputSource extends PlayerInputSource {
    constructor() {
        super('remote');
        this._latestInput = null;
    }

    receiveInput(inputData) {
        this._latestInput = inputData;
    }

    poll() {
        if (!this._latestInput) {
            return {
                pitchUp: false, pitchDown: false,
                yawLeft: false, yawRight: false,
                rollLeft: false, rollRight: false,
                boost: false, boostPressed: false,
                cameraSwitch: false, dropItem: false,
                useItem: false,
                shootItem: false, shootMG: false, nextItem: false,
            };
        }
        return this._latestInput;
    }

    dispose() {
        this._latestInput = null;
        super.dispose();
    }
}
