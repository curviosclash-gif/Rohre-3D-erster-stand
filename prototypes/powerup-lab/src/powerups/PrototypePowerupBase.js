import * as THREE from 'three';

export class PrototypePowerupBase {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.label = options.label || 'Powerup';
        this.position = (options.position || new THREE.Vector3()).clone();
        this.cooldown = options.cooldown ?? 5;
        this.cooldownLeft = 0;
        this.color = options.color ?? 0x5ce0ff;
        this.triggerRadius = options.triggerRadius ?? 2.5;
        this.flashTimer = 0;
        this._playerInsideLastFrame = false;

        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        if (options.quaternion) {
            this.group.quaternion.copy(options.quaternion);
        } else if (options.direction) {
            const dir = options.direction.clone().normalize();
            this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
        }
        scene.add(this.group);

        this._tmpMat = new THREE.Matrix4();
        this._tmpPrev = new THREE.Vector3();
        this._tmpCurr = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
        this._tmpDir2 = new THREE.Vector3();
        this._emissiveMaterials = [];

        this.buildVisual();
        this._collectEmissiveMaterials();
    }

    buildVisual() {}

    step(dt, time, context) {
        this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
        this.flashTimer = Math.max(0, this.flashTimer - dt);

        this.updateVisual(dt, time, context);
        this._updateReadyVisualState(time);

        const sample = this.sampleTrigger(context.player);
        const inside = !!sample.inside;
        const shouldActivate = !!sample.activate;

        if (this.cooldownLeft <= 0 && shouldActivate) {
            this.onActivate(context);
            this.cooldownLeft = this.cooldown;
            this.flashTimer = 0.25;
        }

        this._playerInsideLastFrame = inside;
    }

    updateVisual(_dt, _time, _context) {}

    sampleTrigger(player) {
        const inside = player.position.distanceToSquared(this.group.position) <= this.triggerRadius * this.triggerRadius;
        return { inside, activate: inside && !this._playerInsideLastFrame };
    }

    onActivate(_context) {}

    getForward(out = null) {
        const target = out || new THREE.Vector3();
        return target.set(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    }

    getUp(out = null) {
        const target = out || new THREE.Vector3();
        return target.set(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
    }

    samplePortalCrossing(player, options = {}) {
        const outerRadius = options.outerRadius ?? this.triggerRadius;
        const innerRadius = options.innerRadius ?? 0;
        const halfDepth = options.halfDepth ?? 1.25;
        const requireForward = options.requireForward ?? false;

        this.group.updateMatrixWorld(true);
        this._tmpMat.copy(this.group.matrixWorld).invert();
        this._tmpPrev.copy(player.previousPosition).applyMatrix4(this._tmpMat);
        this._tmpCurr.copy(player.position).applyMatrix4(this._tmpMat);

        const currRadialSq = this._tmpCurr.x * this._tmpCurr.x + this._tmpCurr.y * this._tmpCurr.y;
        const insideNow = currRadialSq <= outerRadius * outerRadius && Math.abs(this._tmpCurr.z) <= halfDepth;

        const prevZ = this._tmpPrev.z;
        const currZ = this._tmpCurr.z;
        const zDelta = currZ - prevZ;
        if (Math.abs(zDelta) < 1e-6) return { inside: insideNow, activate: false };

        const crossedPlane = (prevZ <= 0 && currZ >= 0) || (prevZ >= 0 && currZ <= 0);
        if (!crossedPlane) return { inside: insideNow, activate: false };

        const t = -prevZ / zDelta;
        if (t < 0 || t > 1) return { inside: insideNow, activate: false };

        const crossX = this._tmpPrev.x + (this._tmpCurr.x - this._tmpPrev.x) * t;
        const crossY = this._tmpPrev.y + (this._tmpCurr.y - this._tmpPrev.y) * t;
        const crossRadialSq = crossX * crossX + crossY * crossY;

        const withinRing = crossRadialSq <= outerRadius * outerRadius && crossRadialSq >= innerRadius * innerRadius;
        if (!withinRing) return { inside: insideNow, activate: false };

        if (requireForward) {
            const gateForward = this.getForward(this._tmpDir);
            const playerForward = player.forward || player.velocity || this._tmpDir2.set(0, 0, -1);
            if (gateForward.dot(playerForward) < -0.2) {
                return { inside: insideNow, activate: false };
            }
        }

        return { inside: insideNow, activate: true };
    }

    emit(context, text, tone = 'cool') {
        context?.emitEvent?.(text, tone);
    }

    _collectEmissiveMaterials() {
        this._emissiveMaterials.length = 0;
        this.group.traverse((node) => {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            for (let i = 0; i < mats.length; i++) {
                const mat = mats[i];
                if (mat && 'emissiveIntensity' in mat) {
                    this._emissiveMaterials.push(mat);
                }
            }
        });
    }

    _updateReadyVisualState(time) {
        const ready = this.cooldownLeft <= 0;
        const flash = this.flashTimer > 0 ? (0.7 + this.flashTimer * 2.2) : 0;
        const pulse = ready ? (0.9 + Math.sin(time * 5.5) * 0.2) : 0.25;
        const emissiveScale = pulse + flash;
        for (let i = 0; i < this._emissiveMaterials.length; i++) {
            this._emissiveMaterials[i].emissiveIntensity = emissiveScale;
        }

        const cooldownRatio = this.cooldown > 0 ? this.cooldownLeft / this.cooldown : 0;
        const scale = ready ? 1 : (0.92 + (1 - cooldownRatio) * 0.08);
        this.group.scale.setScalar(scale);
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse((node) => {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
                if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
                else node.material.dispose();
            }
        });
    }
}
