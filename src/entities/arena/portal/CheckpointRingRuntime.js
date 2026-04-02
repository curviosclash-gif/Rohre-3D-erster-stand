export class CheckpointRingRuntime {
    constructor(arena) {
        this.arena = arena;
        this.spinEnabled = true;
        this.spinAngle = 0;
    }

    update(dt = 0) {
        const rings = this.arena.checkpointRings;
        if (!rings || rings.length === 0) return;

        if (!this.spinEnabled) return;

        const deltaSeconds = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        this.spinAngle = (this.spinAngle + (deltaSeconds * 0.2)) % (Math.PI * 2);

        for (const entry of rings) {
            const ringMesh = entry?.mesh?.userData?.ringMesh;
            if (!ringMesh) continue;
            ringMesh.rotation.z = this.spinAngle;
        }
    }
}
