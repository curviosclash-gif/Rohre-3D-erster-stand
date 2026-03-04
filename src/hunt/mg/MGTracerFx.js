import * as THREE from 'three';

const MG_TRACER_UP_AXIS = new THREE.Vector3(0, 1, 0);
const MG_TRACER_UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 8);
const MG_TRACER_UNIT_SPHERE = new THREE.SphereGeometry(1, 10, 10);
const MG_TRACER_DEFAULT_BEAM_RADIUS = 0.16;
const MG_TRACER_DEFAULT_BULLET_RADIUS = 0.42;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export class MGTracerFx {
    constructor(entityManager) {
        this.entityManager = entityManager;
        this.tracers = [];
        this._tmpTracerDir = new THREE.Vector3();
        this._tmpTracerMid = new THREE.Vector3();
    }

    spawnTracer(start, end, hit = false, mg = null) {
        const renderer = this.entityManager?.renderer;
        if (!renderer?.addToScene) return;

        this._tmpTracerDir.subVectors(end, start);
        const length = this._tmpTracerDir.length();
        if (!Number.isFinite(length) || length <= 0.001) return;
        this._tmpTracerDir.divideScalar(length);

        const beamRadius = Math.max(0.02, Number(mg?.TRACER_BEAM_RADIUS) || MG_TRACER_DEFAULT_BEAM_RADIUS);
        const bulletRadius = Math.max(0.04, Number(mg?.TRACER_BULLET_RADIUS) || MG_TRACER_DEFAULT_BULLET_RADIUS);
        const tracerColor = hit ? 0xffe38a : 0x8ad5ff;

        const beamMaterial = new THREE.MeshBasicMaterial({
            color: tracerColor,
            transparent: true,
            opacity: 0.92,
            depthWrite: false,
        });
        const bulletMaterial = new THREE.MeshBasicMaterial({
            color: tracerColor,
            transparent: true,
            opacity: 0.96,
            depthWrite: false,
        });

        const tracerRoot = new THREE.Group();
        tracerRoot.renderOrder = 210;
        tracerRoot.quaternion.setFromUnitVectors(MG_TRACER_UP_AXIS, this._tmpTracerDir);
        this._tmpTracerMid.addVectors(start, end).multiplyScalar(0.5);
        tracerRoot.position.copy(this._tmpTracerMid);

        const beam = new THREE.Mesh(MG_TRACER_UNIT_CYLINDER, beamMaterial);
        beam.scale.set(beamRadius, length, beamRadius);
        tracerRoot.add(beam);

        const bullet = new THREE.Mesh(MG_TRACER_UNIT_SPHERE, bulletMaterial);
        bullet.position.y = length * 0.5;
        bullet.scale.setScalar(bulletRadius);
        tracerRoot.add(bullet);

        renderer.addToScene(tracerRoot);

        const maxTtl = hit ? 0.11 : 0.08;
        this.tracers.push({
            mesh: tracerRoot,
            ttl: maxTtl,
            maxTtl,
            materials: [beamMaterial, bulletMaterial],
        });
    }

    update(dt) {
        if (!Array.isArray(this.tracers) || this.tracers.length === 0) return;
        const renderer = this.entityManager?.renderer;
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const tracer = this.tracers[i];
            if (!tracer?.mesh) {
                this.tracers.splice(i, 1);
                continue;
            }
            tracer.ttl -= Math.max(0, dt);
            const fade = clamp(tracer.ttl / Math.max(0.001, tracer.maxTtl), 0, 1);
            if (Array.isArray(tracer.materials)) {
                const opacity = fade * 0.92;
                for (const material of tracer.materials) {
                    if (material) material.opacity = opacity;
                }
            } else if (tracer.mesh.material) {
                tracer.mesh.material.opacity = fade * 0.92;
            }
            if (tracer.ttl > 0) continue;

            if (renderer?.removeFromScene) {
                renderer.removeFromScene(tracer.mesh);
            } else if (tracer.mesh.parent) {
                tracer.mesh.parent.remove(tracer.mesh);
            }
            if (Array.isArray(tracer.materials)) {
                for (const material of tracer.materials) {
                    material?.dispose?.();
                }
            } else {
                tracer.mesh.material?.dispose?.();
            }
            this.tracers.splice(i, 1);
        }
    }

    clear() {
        if (!Array.isArray(this.tracers) || this.tracers.length === 0) return;
        const renderer = this.entityManager?.renderer;
        for (const tracer of this.tracers) {
            const mesh = tracer?.mesh;
            if (!mesh) continue;
            if (renderer?.removeFromScene) {
                renderer.removeFromScene(mesh);
            } else if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            if (Array.isArray(tracer.materials)) {
                for (const material of tracer.materials) {
                    material?.dispose?.();
                }
            } else {
                mesh.material?.dispose?.();
            }
        }
        this.tracers.length = 0;
    }
}
