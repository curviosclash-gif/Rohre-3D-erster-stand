// ============================================
// SpawnPlacementSystem.js - spawn and safe reposition helpers
// ============================================
//
// Contract:
// - Inputs: owner (EntityManager-like), optional isBotPositionSafe(player, position)
// - Outputs: deterministic spawn direction/position + safe bounce fallback placement
// - Side effects: mutates owner/player reusable temp vectors and player.position only
// - Hotpath guardrail: never allocate per call in update/render-adjacent paths

export class SpawnPlacementSystem {
    constructor(owner, options = {}) {
        this.owner = owner || null;
        this.isBotPositionSafe = typeof options.isBotPositionSafe === 'function'
            ? options.isBotPositionSafe
            : (() => false);
    }
}
