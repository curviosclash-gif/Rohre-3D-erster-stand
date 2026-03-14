import * as THREE from 'three';

const SHARED_GHOST_GEOMETRIES = {};

function markSharedGeometry(geometry) {
    if (!geometry) return;
    geometry.userData = geometry.userData || {};
    geometry.userData.__sharedNoDispose = true;
}

function ensureSharedGhostGeometries() {
    if (SHARED_GHOST_GEOMETRIES.body) return;

    SHARED_GHOST_GEOMETRIES.body = new THREE.ConeGeometry(0.34, 1.9, 8);
    SHARED_GHOST_GEOMETRIES.body.rotateX(-Math.PI / 2);
    SHARED_GHOST_GEOMETRIES.wings = new THREE.BoxGeometry(1.45, 0.08, 0.32);
    SHARED_GHOST_GEOMETRIES.tail = new THREE.BoxGeometry(0.08, 0.5, 0.42);
    SHARED_GHOST_GEOMETRIES.halo = new THREE.BoxGeometry(1.18, 0.64, 2.24);
    SHARED_GHOST_GEOMETRIES.glow = new THREE.SphereGeometry(0.38, 12, 12);

    for (const geometry of Object.values(SHARED_GHOST_GEOMETRIES)) {
        markSharedGeometry(geometry);
    }
}

function buildGhostEntry(playerMeta = {}) {
    ensureSharedGhostGeometries();

    const color = new THREE.Color(Number(playerMeta?.color) || 0xffffff);
    color.lerp(new THREE.Color(0xffffff), 0.55);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
    });
    const frameMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        wireframe: true,
        depthWrite: false,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const group = new THREE.Group();
    group.name = `lastRoundGhost-${playerMeta?.idx ?? 'unknown'}`;
    group.visible = false;
    group.renderOrder = 4;

    const body = new THREE.Mesh(SHARED_GHOST_GEOMETRIES.body, coreMaterial);
    body.position.z = -0.08;
    const wings = new THREE.Mesh(SHARED_GHOST_GEOMETRIES.wings, coreMaterial);
    wings.position.z = 0.12;
    const tail = new THREE.Mesh(SHARED_GHOST_GEOMETRIES.tail, coreMaterial);
    tail.position.set(0, 0.2, 0.42);
    const halo = new THREE.Mesh(SHARED_GHOST_GEOMETRIES.halo, frameMaterial);
    const glow = new THREE.Mesh(SHARED_GHOST_GEOMETRIES.glow, glowMaterial);
    glow.scale.set(1.5, 1.0, 2.1);

    group.add(body);
    group.add(wings);
    group.add(tail);
    group.add(halo);
    group.add(glow);
    group.scale.setScalar(Math.max(0.6, Number(playerMeta?.modelScale) || 1));

    return {
        idx: Number(playerMeta?.idx),
        group,
        materials: [coreMaterial, frameMaterial, glowMaterial],
    };
}

function disposeEntry(entry) {
    const materials = Array.isArray(entry?.materials) ? entry.materials : [];
    for (let i = 0; i < materials.length; i++) {
        materials[i]?.dispose?.();
    }
}

function getSnapshotPlayer(snapshot, playerIndex) {
    const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
    for (let i = 0; i < players.length; i++) {
        const candidate = players[i];
        if (Number(candidate?.idx) === playerIndex) {
            return candidate;
        }
    }
    return null;
}

function resolveFramePair(frames, playbackTime) {
    const safeFrames = Array.isArray(frames) ? frames : [];
    if (safeFrames.length === 0) {
        return { previous: null, next: null, alpha: 0 };
    }
    if (safeFrames.length === 1) {
        return { previous: safeFrames[0], next: safeFrames[0], alpha: 0 };
    }

    const clampedTime = Math.max(0, Number(playbackTime) || 0);
    for (let i = 1; i < safeFrames.length; i++) {
        const next = safeFrames[i];
        if (clampedTime <= Number(next?.time) || i === safeFrames.length - 1) {
            const previous = safeFrames[i - 1];
            const prevTime = Number(previous?.time) || 0;
            const nextTime = Number(next?.time) || prevTime;
            const span = Math.max(0.0001, nextTime - prevTime);
            return {
                previous,
                next,
                alpha: THREE.MathUtils.clamp((clampedTime - prevTime) / span, 0, 1),
            };
        }
    }

    const last = safeFrames[safeFrames.length - 1];
    return { previous: last, next: last, alpha: 0 };
}

export class LastRoundGhostSystem {
    constructor(renderer) {
        this.renderer = renderer || null;
        this.root = new THREE.Group();
        this.root.name = 'lastRoundGhostRoot';
        this.root.visible = false;
        this.root.userData = this.root.userData || {};
        this.root.userData.entityViewType = 'last-round-ghost';

        this._entries = [];
        this._frames = [];
        this._active = false;
        this._elapsed = 0;
        this._displayDuration = 3;
        this._sourceDuration = 0;
        this._playbackRate = 1;
        this._tmpQuatA = new THREE.Quaternion();
        this._tmpQuatB = new THREE.Quaternion();
    }

    _ensureAttached() {
        if (this.root.parent || !this.renderer?.addToScene) return;
        this.renderer.addToScene(this.root);
    }

    _clearEntries() {
        for (let i = 0; i < this._entries.length; i++) {
            const entry = this._entries[i];
            if (entry?.group?.parent === this.root) {
                this.root.remove(entry.group);
            }
            disposeEntry(entry);
        }
        this._entries.length = 0;
    }

    clear() {
        this._active = false;
        this._elapsed = 0;
        this._frames = [];
        this.root.visible = false;
        this._clearEntries();
    }

    playClip(clip = null) {
        this.clear();
        if (!clip || !Array.isArray(clip.frames) || clip.frames.length < 2) {
            return false;
        }

        const playerMeta = Array.isArray(clip.players) ? clip.players : [];
        for (let i = 0; i < playerMeta.length; i++) {
            const entry = buildGhostEntry(playerMeta[i]);
            this._entries.push(entry);
            this.root.add(entry.group);
        }

        if (this._entries.length === 0) {
            this.clear();
            return false;
        }

        this._frames = clip.frames;
        this._sourceDuration = Math.max(0.0001, Number(clip.sourceDuration) || Number(clip.frames[clip.frames.length - 1]?.time) || 0.0001);
        this._displayDuration = Math.max(0.35, Number(clip.displayDuration) || this._sourceDuration);
        this._playbackRate = this._sourceDuration / this._displayDuration;
        this._active = true;
        this._ensureAttached();
        this.root.visible = true;
        this.update(0);
        return true;
    }

    update(dt) {
        if (!this._active || this._entries.length === 0 || this._frames.length === 0) {
            return;
        }

        this._elapsed += Math.max(0, Number(dt) || 0);
        const cycleTime = this._displayDuration > 0
            ? (this._elapsed % this._displayDuration)
            : this._elapsed;
        const playbackTime = Math.min(this._sourceDuration, cycleTime * this._playbackRate);
        const framePair = resolveFramePair(this._frames, playbackTime);

        for (let i = 0; i < this._entries.length; i++) {
            const entry = this._entries[i];
            const prevPose = getSnapshotPlayer(framePair.previous, entry.idx);
            const nextPose = getSnapshotPlayer(framePair.next, entry.idx);
            const poseA = prevPose || nextPose;
            const poseB = nextPose || prevPose;

            if (!poseA || !poseB || (!poseA.alive && !poseB.alive)) {
                entry.group.visible = false;
                continue;
            }

            entry.group.visible = true;
            entry.group.position.set(
                THREE.MathUtils.lerp(Number(poseA.x) || 0, Number(poseB.x) || 0, framePair.alpha),
                THREE.MathUtils.lerp(Number(poseA.y) || 0, Number(poseB.y) || 0, framePair.alpha)
                    + 0.55
                    + Math.sin(this._elapsed * 4 + entry.idx) * 0.08,
                THREE.MathUtils.lerp(Number(poseA.z) || 0, Number(poseB.z) || 0, framePair.alpha)
            );

            this._tmpQuatA.set(
                Number(poseA.qx) || 0,
                Number(poseA.qy) || 0,
                Number(poseA.qz) || 0,
                Number(poseA.qw) || 1
            );
            this._tmpQuatB.set(
                Number(poseB.qx) || 0,
                Number(poseB.qy) || 0,
                Number(poseB.qz) || 0,
                Number(poseB.qw) || 1
            );
            entry.group.quaternion.copy(this._tmpQuatA).slerp(this._tmpQuatB, framePair.alpha);
        }
    }

    getState() {
        const ghosts = [];
        for (let i = 0; i < this._entries.length; i++) {
            const entry = this._entries[i];
            ghosts.push({
                idx: entry.idx,
                visible: !!entry?.group?.visible,
                x: Number(entry?.group?.position?.x?.toFixed?.(2) || 0),
                y: Number(entry?.group?.position?.y?.toFixed?.(2) || 0),
                z: Number(entry?.group?.position?.z?.toFixed?.(2) || 0),
            });
        }

        return {
            active: this._active,
            frameCount: this._frames.length,
            entryCount: this._entries.length,
            elapsed: Number(this._elapsed.toFixed(3)),
            displayDuration: Number(this._displayDuration.toFixed(3)),
            sourceDuration: Number(this._sourceDuration.toFixed(3)),
            ghosts,
        };
    }

    dispose() {
        this.clear();
        if (this.root.parent) {
            this.root.parent.remove(this.root);
        }
    }
}
