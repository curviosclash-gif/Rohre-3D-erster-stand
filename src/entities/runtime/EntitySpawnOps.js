import { CONFIG } from '../../core/Config.js';

export class EntitySpawnOps {
    constructor(entityManager) {
        this.entityManager = entityManager || null;
    }

    spawnAll() {
        const owner = this.entityManager;
        if (!owner) return;
        owner._roundEnded = false;
        owner._respawnSystem.reset();
        owner._spawnPlacementSystem?.resetAssignments?.();
        const spawnContext = this.createSpawnContext();
        for (const player of owner.players) {
            this.spawnPlayer(player, spawnContext);
        }
    }

    createSpawnContext() {
        const owner = this.entityManager;
        const isPlanar = !!CONFIG.GAMEPLAY.PLANAR_MODE;
        return {
            planarSpawnLevel: isPlanar && owner ? owner._getPlanarSpawnLevel() : null,
        };
    }

    spawnPlayer(player, spawnContext = null) {
        const owner = this.entityManager;
        if (!owner || !player) return;
        const context = spawnContext || this.createSpawnContext();
        const pos = owner._findSpawnPosition(12, 12, {
            planarLevel: context.planarSpawnLevel,
            player,
        });
        const dir = owner._findSafeSpawnDirection(pos, player.hitboxRadius);
        player.spawn(pos, dir);
        player.shootCooldown = 0;
        if (owner.recorder) {
            owner.recorder.markPlayerSpawn(player);
            owner.recorder.logEvent('SPAWN', player.index, player.isBot ? 'bot=1' : 'bot=0');
        }
    }
}

