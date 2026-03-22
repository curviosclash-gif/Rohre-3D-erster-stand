import * as THREE from 'three';

function toPositiveNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

// Shot types cycled by the director.
const SHOT_TYPE = Object.freeze({
    WIDE_ORBIT: 0,
    CHASE_CLOSE: 1,
    SIDE_TRACK: 2,
    HIGH_OVERVIEW: 3,
});

const SHOT_SEQUENCE = Object.freeze([
    SHOT_TYPE.WIDE_ORBIT,
    SHOT_TYPE.CHASE_CLOSE,
    SHOT_TYPE.SIDE_TRACK,
    SHOT_TYPE.HIGH_OVERVIEW,
    SHOT_TYPE.CHASE_CLOSE,
    SHOT_TYPE.WIDE_ORBIT,
]);

// Duration range per shot in seconds.  Actual duration is picked
// pseudo-randomly per cycle so cuts feel less mechanical.
const SHOT_DURATION_MIN = 3.0;
const SHOT_DURATION_MAX = 5.5;

function pickShotDuration(sequenceIndex, playerIndex) {
    // Deterministic but varied duration derived from indices.
    const t = Math.sin((sequenceIndex + 1) * 2.17 + playerIndex * 1.31) * 0.5 + 0.5;
    return SHOT_DURATION_MIN + t * (SHOT_DURATION_MAX - SHOT_DURATION_MIN);
}

export { SHOT_TYPE };

export class RecordingOrbitCameraDirector {
    constructor({
        orbitSpeed = 0.9,
        smoothSpeed = 8.0,
        enterSpeed = 3.5,
        exitSpeed = 7.5,
        minDistance = 2.5,
        baseRadius = 10.0,
        baseLift = 3.8,
        baseLookAhead = 5.5,
        transitionSpeed = 4.5,
    } = {}) {
        this.orbitSpeed = toPositiveNumber(orbitSpeed, 0.9);
        this.smoothSpeed = toPositiveNumber(smoothSpeed, 8.0);
        this.enterSpeed = toPositiveNumber(enterSpeed, 3.5);
        this.exitSpeed = toPositiveNumber(exitSpeed, 7.5);
        this.minDistance = toPositiveNumber(minDistance, 2.5);
        this.baseRadius = toPositiveNumber(baseRadius, 10.0);
        this.baseLift = toPositiveNumber(baseLift, 3.8);
        this.baseLookAhead = toPositiveNumber(baseLookAhead, 5.5);
        this.transitionSpeed = toPositiveNumber(transitionSpeed, 4.5);

        this._phaseByPlayer = [];
        this._blendByPlayer = [];

        // Shot-switching state per player.
        this._shotTimerByPlayer = [];
        this._shotDurationByPlayer = [];
        this._shotSeqIndexByPlayer = [];

        this._tmpDir = new THREE.Vector3();
        this._tmpSide = new THREE.Vector3();
        this._tmpDesiredPosition = new THREE.Vector3();
        this._tmpDesiredLookAt = new THREE.Vector3();
        this._tmpTargetPosition = new THREE.Vector3();
        this._tmpTargetLookAt = new THREE.Vector3();
        this._up = new THREE.Vector3(0, 1, 0);
    }

    reset() {
        this._phaseByPlayer.length = 0;
        this._blendByPlayer.length = 0;
        this._shotTimerByPlayer.length = 0;
        this._shotDurationByPlayer.length = 0;
        this._shotSeqIndexByPlayer.length = 0;
    }

    _isWithinArenaBounds(position, arena) {
        const bounds = arena?.bounds || null;
        if (!bounds?.min || !bounds?.max) return true;
        const margin = 1.25;
        return (
            position.x >= (bounds.min.x + margin)
            && position.x <= (bounds.max.x - margin)
            && position.y >= (bounds.min.y + margin)
            && position.y <= (bounds.max.y - margin)
            && position.z >= (bounds.min.z + margin)
            && position.z <= (bounds.max.z - margin)
        );
    }

    // --- Shot computation helpers ----------------------------------------

    _computeWideOrbit(phase, playerIndex, playerPosition) {
        const orbitRadius = this.baseRadius + (Math.sin((phase * 0.7) + playerIndex * 0.4) * 1.8);
        const orbitOffset = Math.cos((phase * 1.1) + playerIndex * 0.3) * orbitRadius;
        const forwardOffset = -4.2 + (Math.sin((phase * 0.55) + playerIndex * 0.2) * 1.6);
        const lift = this.baseLift + (Math.cos((phase * 0.4) + playerIndex) * 1.05);

        this._tmpDesiredPosition.copy(playerPosition)
            .addScaledVector(this._tmpSide, orbitOffset)
            .addScaledVector(this._tmpDir, forwardOffset);
        this._tmpDesiredPosition.y += lift;

        this._tmpDesiredLookAt.copy(playerPosition)
            .addScaledVector(this._tmpDir, this.baseLookAhead + (Math.sin(phase * 0.5) * 1.2));
    }

    _computeChaseClose(phase, playerIndex, playerPosition) {
        const behindDist = 3.8 + Math.sin(phase * 0.35 + playerIndex) * 0.6;
        const lift = 1.6 + Math.cos(phase * 0.25 + playerIndex * 0.5) * 0.3;
        const sideWobble = Math.sin(phase * 0.6 + playerIndex * 0.7) * 0.8;

        this._tmpDesiredPosition.copy(playerPosition)
            .addScaledVector(this._tmpDir, -behindDist)
            .addScaledVector(this._tmpSide, sideWobble);
        this._tmpDesiredPosition.y += lift;

        this._tmpDesiredLookAt.copy(playerPosition)
            .addScaledVector(this._tmpDir, 3.0);
    }

    _computeSideTrack(phase, playerIndex, playerPosition) {
        const sideDist = 6.5 + Math.sin(phase * 0.45 + playerIndex * 0.6) * 1.2;
        const side = (playerIndex % 2 === 0) ? 1 : -1;
        const forwardLead = 1.5 + Math.sin(phase * 0.3) * 1.0;
        const lift = 2.2 + Math.cos(phase * 0.5 + playerIndex) * 0.6;

        this._tmpDesiredPosition.copy(playerPosition)
            .addScaledVector(this._tmpSide, sideDist * side)
            .addScaledVector(this._tmpDir, forwardLead);
        this._tmpDesiredPosition.y += lift;

        this._tmpDesiredLookAt.copy(playerPosition)
            .addScaledVector(this._tmpDir, 2.0);
        this._tmpDesiredLookAt.y += 0.5;
    }

    _computeHighOverview(phase, playerIndex, playerPosition) {
        const height = 12.0 + Math.sin(phase * 0.3 + playerIndex * 0.4) * 2.0;
        const slowOrbit = Math.cos(phase * 0.25 + playerIndex * 0.5) * 4.0;
        const forwardDrift = Math.sin(phase * 0.2) * 2.0;

        this._tmpDesiredPosition.copy(playerPosition)
            .addScaledVector(this._tmpSide, slowOrbit)
            .addScaledVector(this._tmpDir, forwardDrift);
        this._tmpDesiredPosition.y += height;

        this._tmpDesiredLookAt.copy(playerPosition);
        this._tmpDesiredLookAt.y += 0.3;
    }

    // --- Shot selection ---------------------------------------------------

    _advanceShotTimer(playerIndex, dt) {
        if (this._shotTimerByPlayer[playerIndex] === undefined) {
            this._shotTimerByPlayer[playerIndex] = 0;
            this._shotSeqIndexByPlayer[playerIndex] = 0;
            this._shotDurationByPlayer[playerIndex] = pickShotDuration(0, playerIndex);
        }

        this._shotTimerByPlayer[playerIndex] += dt;

        const duration = this._shotDurationByPlayer[playerIndex];
        if (this._shotTimerByPlayer[playerIndex] >= duration) {
            this._shotTimerByPlayer[playerIndex] -= duration;
            const nextIdx = (this._shotSeqIndexByPlayer[playerIndex] + 1) % SHOT_SEQUENCE.length;
            this._shotSeqIndexByPlayer[playerIndex] = nextIdx;
            this._shotDurationByPlayer[playerIndex] = pickShotDuration(nextIdx, playerIndex);
        }

        return SHOT_SEQUENCE[this._shotSeqIndexByPlayer[playerIndex]];
    }

    _computeDesiredShotPosition(shotType, phase, playerIndex, playerPosition) {
        switch (shotType) {
            case SHOT_TYPE.CHASE_CLOSE:
                this._computeChaseClose(phase, playerIndex, playerPosition);
                break;
            case SHOT_TYPE.SIDE_TRACK:
                this._computeSideTrack(phase, playerIndex, playerPosition);
                break;
            case SHOT_TYPE.HIGH_OVERVIEW:
                this._computeHighOverview(phase, playerIndex, playerPosition);
                break;
            default:
                this._computeWideOrbit(phase, playerIndex, playerPosition);
                break;
        }
    }

    // --- Main entry point ------------------------------------------------

    apply({
        playerIndex,
        camera,
        fallbackTarget,
        playerPosition,
        playerDirection,
        dt,
        arena = null,
    }) {
        if (!camera || !playerPosition || !playerDirection) return;
        if (!Number.isInteger(playerIndex) || playerIndex < 0) return;

        const safeDt = Math.max(0, Number(dt) || 0);
        const previousPhase = this._phaseByPlayer[playerIndex] || 0;
        const phase = previousPhase + (safeDt * this.orbitSpeed * (1 + playerIndex * 0.13));
        this._phaseByPlayer[playerIndex] = phase;

        this._tmpDir.copy(playerDirection);
        if (this._tmpDir.lengthSq() <= 0.000001) {
            this._tmpDir.set(0, 0, -1);
        } else {
            this._tmpDir.normalize();
        }

        this._tmpSide.crossVectors(this._up, this._tmpDir);
        if (this._tmpSide.lengthSq() <= 0.000001) {
            this._tmpSide.set(1, 0, 0);
        } else {
            this._tmpSide.normalize();
        }

        // Advance shot timer and pick current shot type.
        const shotType = this._advanceShotTimer(playerIndex, safeDt);

        this._computeDesiredShotPosition(shotType, phase, playerIndex, playerPosition);

        const finitePosition = Number.isFinite(this._tmpDesiredPosition.x)
            && Number.isFinite(this._tmpDesiredPosition.y)
            && Number.isFinite(this._tmpDesiredPosition.z);
        const finiteLookAt = Number.isFinite(this._tmpDesiredLookAt.x)
            && Number.isFinite(this._tmpDesiredLookAt.y)
            && Number.isFinite(this._tmpDesiredLookAt.z);
        const validDistance = this._tmpDesiredPosition.distanceToSquared(playerPosition) >= (this.minDistance * this.minDistance);
        const withinBounds = this._isWithinArenaBounds(this._tmpDesiredPosition, arena);
        const useOrbitShot = finitePosition && finiteLookAt && validDistance && withinBounds;

        const previousBlend = this._blendByPlayer[playerIndex] || 0;
        const targetBlend = useOrbitShot ? 1 : 0;
        const blendSpeed = targetBlend > previousBlend ? this.enterSpeed : this.exitSpeed;
        const blendAlpha = 1 - Math.exp(-blendSpeed * safeDt);
        const blend = THREE.MathUtils.clamp(
            THREE.MathUtils.lerp(previousBlend, targetBlend, blendAlpha),
            0,
            1
        );
        this._blendByPlayer[playerIndex] = blend;

        const fallbackLookAt = fallbackTarget?.lookAt || playerPosition;
        if (!useOrbitShot || blend <= 0.0001) {
            camera.lookAt(fallbackLookAt);
            return;
        }

        this._tmpTargetPosition.copy(camera.position).lerp(this._tmpDesiredPosition, blend);
        this._tmpTargetLookAt.copy(fallbackLookAt).lerp(this._tmpDesiredLookAt, blend);

        // Use transitionSpeed for smooth cuts between shot types.
        const smoothAlpha = 1 - Math.exp(-this.transitionSpeed * safeDt);
        camera.position.lerp(this._tmpTargetPosition, smoothAlpha);
        camera.lookAt(this._tmpTargetLookAt);
    }
}
