import * as THREE from 'three';
import { PrototypePowerupBase } from './PrototypePowerupBase.js';

export class ChronoBubblePowerup extends PrototypePowerupBase {
    constructor(scene, options = {}) {
        super(scene, {
            label: 'Chrono Bubble',
            color: options.color ?? 0xb48dff,
            triggerRadius: options.radius ?? options.triggerRadius ?? 3.8,
            cooldown: options.cooldown ?? 8.0,
            ...options,
        });
        this.radius = options.radius ?? this.triggerRadius ?? 3.8;
    }

    buildVisual() {
        const radius = this.triggerRadius ?? 3.8;
        const shellMat = new THREE.MeshBasicMaterial({
            color: 0xb48dff,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
        });
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xdbbcff,
            transparent: true,
            opacity: 0.45,
            wireframe: true,
        });
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xded0ff,
            emissive: 0x8f69ff,
            emissiveIntensity: 0.9,
            roughness: 0.25,
            metalness: 0.3,
        });

        this.shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 16), shellMat);
        this.group.add(this.shell);

        this.wireShell = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.98, 14, 12), wireMat);
        this.group.add(this.wireShell);

        this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), coreMat);
        this.group.add(this.core);

        this.rings = [];
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1.15 + i * 0.28, 0.02, 6, 24),
                new THREE.MeshBasicMaterial({
                    color: 0xcdb3ff,
                    transparent: true,
                    opacity: 0.55 - i * 0.1,
                }),
            );
            ring.rotation.x = i * 0.65;
            ring.rotation.y = i * 0.45;
            this.group.add(ring);
            this.rings.push(ring);
        }
    }

    updateVisual(dt, time) {
        this.core.rotation.x += dt * 0.9;
        this.core.rotation.y -= dt * 1.2;
        this.shell.material.opacity = 0.08 + Math.sin(time * 2.7) * 0.03;
        this.wireShell.rotation.y += dt * 0.18;
        this.wireShell.rotation.x -= dt * 0.13;

        for (let i = 0; i < this.rings.length; i++) {
            const ring = this.rings[i];
            ring.rotation.z += dt * (0.35 + i * 0.2);
            ring.scale.setScalar(1 + Math.sin(time * (2 + i) + i) * 0.05);
        }
    }

    sampleTrigger(player) {
        const inside = player.position.distanceToSquared(this.group.position) <= this.radius * this.radius;
        return { inside, activate: inside && !this._playerInsideLastFrame };
    }

    onActivate(context) {
        context.player.activateChrono({
            duration: 4.8,
            worldTimeScale: 0.38,
        });
        this.emit(context, 'Chrono Bubble: Welt verlangsamt (du bleibst schnell)', 'cool');
    }
}
