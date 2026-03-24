// ============================================
// StateReconciler.js - client-side state correction
// ============================================
import { normalizeMultiplayerStateUpdateEvent } from '../shared/contracts/MultiplayerSessionContract.js';

/**
 * Compares local predicted state with authoritative host state.
 * Applies corrections via interpolation to avoid visual snapping.
 *
 * Stretch goal: rollback and replay for high-latency scenarios.
 */
export class StateReconciler {
    constructor(options = {}) {
        this._correctionRate = options.correctionRate || 0.3;
        this._snapThreshold = options.snapThreshold || 5.0;
        this._lastStateUpdate = null;
    }

    receiveServerState(serverState) {
        this._lastStateUpdate = normalizeMultiplayerStateUpdateEvent(serverState);
    }

    reconcile(localPlayers, entityManager) {
        if (!this._lastStateUpdate || !localPlayers) return;

        const serverPlayers = this._lastStateUpdate?.state?.players;
        if (!serverPlayers) return;

        for (const serverPlayer of serverPlayers) {
            const localPlayer = localPlayers.find((p) => p.index === serverPlayer.index);
            if (!localPlayer || !localPlayer.position) continue;

            const sp = serverPlayer.pos;
            if (!sp || sp.length < 3) continue;

            const dx = sp[0] - localPlayer.position.x;
            const dy = sp[1] - localPlayer.position.y;
            const dz = sp[2] - localPlayer.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist > this._snapThreshold) {
                // Large deviation: snap immediately
                localPlayer.position.set(sp[0], sp[1], sp[2]);
            } else if (dist > 0.01) {
                // Small deviation: interpolate
                localPlayer.position.x += dx * this._correctionRate;
                localPlayer.position.y += dy * this._correctionRate;
                localPlayer.position.z += dz * this._correctionRate;
            }

            // Reconcile score
            if (typeof serverPlayer.score === 'number') {
                localPlayer.score = serverPlayer.score;
            }

            // Reconcile health
            if (typeof serverPlayer.health === 'number') {
                localPlayer.health = serverPlayer.health;
            }
        }
    }

    reset() {
        this._lastStateUpdate = null;
    }
}
