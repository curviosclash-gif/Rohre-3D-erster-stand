// ============================================
// SpectatorInputSource.js - spectator mode input stub (C.5)
// ============================================

import { PlayerInputSource } from '../core/input/PlayerInputSource.js';

/**
 * Input source for spectators (PlayerRole.SPECTATOR).
 * Returns no gameplay inputs — spectators observe but do not control a vehicle.
 * Can be extended later for camera controls (switch between players, free-cam).
 */
export class SpectatorInputSource extends PlayerInputSource {
    constructor() {
        super('spectator');
    }

    poll() {
        return {
            pitchUp: false,
            pitchDown: false,
            yawLeft: false,
            yawRight: false,
            rollLeft: false,
            rollRight: false,
            boost: false,
            boostPressed: false,
            cameraSwitch: false,
            dropItem: false,
            shootItem: false,
            shootMG: false,
            nextItem: false,
        };
    }
}
