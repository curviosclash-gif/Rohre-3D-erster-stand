import {
    setCheckpointRingState,
    RING_STATE_INACTIVE,
    RING_STATE_NEXT,
    RING_STATE_PASSED,
} from '../CheckpointRingMeshFactory.js';

const TRIGGER_PULSE_DURATION_MS = 300;
const FINISH_PULSE_CYCLE_MS = 500;
const FINISH_PULSE_CYCLES = 3;
const NEXT_PULSE_HZ = 2.5;
const NEXT_EMISSIVE_MIN = 0.5;
const NEXT_EMISSIVE_MAX = 1.5;

function safeNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
}

export class CheckpointRingRuntime {
    constructor(arena) {
        this.arena = arena;
        this.spinEnabled = true;
        this.spinAngle = 0;
        this._progressProvider = null;
        this._particles = null;
        this._prevPassedMask = [];
        this._prevNextIndex = -1;
        this._prevCompleted = false;
        this._triggerAnimations = new Map(); // routeIndex -> { startMs, baseScale }
        this._finishAnimStartMs = -1;
        this._finishBaseScale = 1;
    }

    setProgressProvider(fn) {
        this._progressProvider = typeof fn === 'function' ? fn : null;
        this._prevPassedMask = [];
        this._prevNextIndex = -1;
        this._prevCompleted = false;
        this._triggerAnimations.clear();
        this._finishAnimStartMs = -1;
    }

    setParticleSystem(particles) {
        this._particles = particles && typeof particles.spawn === 'function' ? particles : null;
    }

    update(dt = 0) {
        const rings = this.arena.checkpointRings;
        if (!rings || rings.length === 0) return;

        const now = safeNow();
        const deltaSeconds = Number.isFinite(dt) ? Math.max(0, dt) : 0;

        if (this.spinEnabled) {
            this.spinAngle = (this.spinAngle + deltaSeconds * 0.2) % (Math.PI * 2);
            for (const entry of rings) {
                const ringMesh = entry?.mesh?.userData?.ringMesh;
                if (ringMesh) ringMesh.rotation.z = this.spinAngle;
            }
        }

        const snapshot = this._progressProvider?.();
        if (snapshot) {
            this._syncRingStates(rings, snapshot, now);
        }

        this._animateNextPulse(rings, now);
        this._animateTriggerPulses(rings, now);
        this._animateFinish(rings, now);
    }

    _syncRingStates(rings, snapshot, now) {
        const { passedMask, nextCheckpointIndex, completed } = snapshot;

        for (const entry of rings) {
            if (entry.isFinish) continue;
            const idx = entry.routeIndex;
            if (idx < 0) continue;

            const prevPassed = this._prevPassedMask[idx] === 1;
            const isPassed = Array.isArray(passedMask) && idx < passedMask.length && passedMask[idx] === 1;
            const isNext = !completed && nextCheckpointIndex === idx;

            if (isPassed && !prevPassed) {
                setCheckpointRingState(entry, RING_STATE_PASSED);
                const ringMesh = entry.mesh?.userData?.ringMesh;
                this._triggerAnimations.set(idx, { startMs: now, baseScale: ringMesh?.scale?.x ?? 1 });
                this._spawnCheckpointParticles(entry);
            } else if (!this._triggerAnimations.has(idx)) {
                const target = isPassed ? RING_STATE_PASSED : isNext ? RING_STATE_NEXT : RING_STATE_INACTIVE;
                if (entry.mesh?.userData?.ringState !== target) {
                    setCheckpointRingState(entry, target);
                }
            }
        }

        if (completed && !this._prevCompleted) {
            const finishEntry = rings.find((r) => r.isFinish);
            if (finishEntry) {
                const ringMesh = finishEntry.mesh?.userData?.ringMesh;
                this._finishBaseScale = ringMesh?.scale?.x ?? 1;
                this._finishAnimStartMs = now;
                this._spawnFinishParticles(finishEntry);
            }
        }

        if (Array.isArray(passedMask)) {
            for (let i = 0; i < passedMask.length; i++) {
                this._prevPassedMask[i] = passedMask[i];
            }
        }
        this._prevNextIndex = nextCheckpointIndex;
        this._prevCompleted = !!completed;
    }

    _animateNextPulse(rings, now) {
        const t = (Math.sin((now / 1000) * Math.PI * 2 * NEXT_PULSE_HZ) + 1) * 0.5;
        const intensity = NEXT_EMISSIVE_MIN + t * (NEXT_EMISSIVE_MAX - NEXT_EMISSIVE_MIN);
        for (const entry of rings) {
            if (entry.isFinish || entry.mesh?.userData?.ringState !== RING_STATE_NEXT) continue;
            const ringMesh = entry.mesh?.userData?.ringMesh;
            if (ringMesh?.material) ringMesh.material.emissiveIntensity = intensity;
        }
    }

    _animateTriggerPulses(rings, now) {
        for (const [routeIndex, anim] of this._triggerAnimations) {
            const elapsed = now - anim.startMs;
            const entry = rings.find((r) => r.routeIndex === routeIndex);
            const ringMesh = entry?.mesh?.userData?.ringMesh;

            if (elapsed >= TRIGGER_PULSE_DURATION_MS) {
                if (ringMesh) ringMesh.scale.setScalar(anim.baseScale);
                this._triggerAnimations.delete(routeIndex);
                continue;
            }

            if (ringMesh) {
                const t = elapsed / TRIGGER_PULSE_DURATION_MS;
                ringMesh.scale.setScalar(anim.baseScale * (1.0 + 0.3 * Math.sin(t * Math.PI)));
            }
        }
    }

    _animateFinish(rings, now) {
        if (this._finishAnimStartMs < 0) return;
        const totalMs = FINISH_PULSE_CYCLE_MS * FINISH_PULSE_CYCLES;
        const elapsed = now - this._finishAnimStartMs;
        const finishEntry = rings.find((r) => r.isFinish);
        const ringMesh = finishEntry?.mesh?.userData?.ringMesh;

        if (elapsed >= totalMs || !ringMesh) {
            if (ringMesh) {
                ringMesh.scale.setScalar(this._finishBaseScale);
                ringMesh.material.emissiveIntensity = 1.5;
            }
            this._finishAnimStartMs = -1;
            return;
        }

        const cycleT = (elapsed % FINISH_PULSE_CYCLE_MS) / FINISH_PULSE_CYCLE_MS;
        ringMesh.scale.setScalar(this._finishBaseScale * (1.0 + 0.25 * Math.sin(cycleT * Math.PI)));
        ringMesh.material.emissiveIntensity = Math.max(0.8, 1.0 + 1.5 * Math.sin(cycleT * Math.PI));
    }

    _spawnCheckpointParticles(entry) {
        if (!this._particles?.spawn || !entry?.pos) return;
        this._particles.spawn(entry.pos, 18, 0xaaff00, 8.0, 0.6, 0.8, { type: 'checkpoint-pass', gravity: -3.0 });
    }

    _spawnFinishParticles(entry) {
        if (!this._particles?.spawn || !entry?.pos) return;
        this._particles.spawn(entry.pos, 40, 0xffd700, 7.0, 0.8, 1.5, { type: 'finish-complete', gravity: 4.0 });
        this._particles.spawn(entry.pos, 20, 0xffffff, 12.0, 0.5, 0.9, { type: 'finish-burst', gravity: -2.0 });
    }
}
