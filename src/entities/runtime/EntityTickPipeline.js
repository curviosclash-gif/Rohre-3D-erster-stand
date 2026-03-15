export class EntityTickPipeline {
    constructor(entityManager) {
        this.entityManager = entityManager || null;
    }

    update(dt, inputManager, renderFrameId = 0) {
        const owner = this.entityManager;
        if (!owner) return;

        owner._lockOnCache.clear();
        owner._projectileSystem.update(dt);
        owner._overheatGunSystem.update(dt);
        owner._respawnSystem.update(dt);
        owner._playerInputSystem.beginFrame?.();

        for (const player of owner.players) {
            if (!player.alive) continue;
            owner._playerLifecycleSystem.updateShootCooldown(player, dt);
            const input = owner._playerInputSystem.resolvePlayerInput(player, dt, inputManager);
            owner._playerLifecycleSystem.updatePlayer(player, dt, input, renderFrameId);
        }

        if (owner._roundEnded) return;

        const outcome = owner._roundOutcomeSystem.resolve();
        if (outcome.shouldEnd) {
            owner._roundEnded = true;
            owner._eventBus.emitRoundEnd(outcome.winner);
        }
    }
}
