// ============================================
// PlayerLifecycleSystem.js - player tick and lifecycle updates
// ============================================

import { isHuntHealthActive } from '../../hunt/HealthSystem.js';
import { PlayerActionPhase } from './lifecycle/PlayerActionPhase.js';
import { PlayerCollisionPhase } from './lifecycle/PlayerCollisionPhase.js';
import { PlayerInteractionPhase } from './lifecycle/PlayerInteractionPhase.js';

export class PlayerLifecycleSystem {
    constructor(entityManager) {
        this.entityManager = entityManager;
        this._actionPhase = new PlayerActionPhase(entityManager);
        this._collisionPhase = new PlayerCollisionPhase(entityManager);
        this._interactionPhase = new PlayerInteractionPhase(entityManager);
    }

    updateShootCooldown(player, dt) {
        player.shootCooldown = Math.max(0, (player.shootCooldown || 0) - dt);
    }

    updatePlayer(player, dt, input, renderFrameId = 0) {
        const huntModeActive = isHuntHealthActive();
        const runtimeProfiler = this.entityManager?.runtimeProfiler || null;
        this._actionPhase.run(player, input, huntModeActive);

        const prevPos = this._interactionPhase.capturePreviousPosition(player);
        player.update(dt, input, renderFrameId);
        if (player.alive && typeof player.prepareObbCollisionQuery === 'function') {
            player.prepareObbCollisionQuery();
        }
        if (player.alive && player.trail) {
            player.trail.update(dt, player.position, player._tmpVec);
        }

        this._interactionPhase.runSpecialGates(player, prevPos);
        const collisionStart = runtimeProfiler?.startSample?.();
        const aborted = this._collisionPhase.run(player, prevPos, huntModeActive);
        runtimeProfiler?.endSample?.('collision', collisionStart);
        if (aborted || !player.alive) return;

        this._interactionPhase.runPortalAndPickup(player);
    }
}

