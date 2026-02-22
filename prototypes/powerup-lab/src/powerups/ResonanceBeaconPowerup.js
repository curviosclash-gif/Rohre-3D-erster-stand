import * as THREE from 'three';
import { PrototypePowerupBase } from './PrototypePowerupBase.js';

export class ResonanceBeaconPowerup extends PrototypePowerupBase {
    constructor(scene, options = {}) {
        super(scene, {
            label: 'Resonance Beacon',
            color: options.color ?? 0x7affc4,
            triggerRadius: options.radius ?? options.triggerRadius ?? 3.1,
            cooldown: options.cooldown ?? 8.4,
            ...options,
        });
        this.radius = options.radius ?? this.triggerRadius ?? 3.1;
    }

    buildVisual() {
        const radius = this.triggerRadius ?? 3.1;
        const shellMat = new THREE.MeshBasicMaterial({
            color: 0x65ffc2,
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
        });
        const crystalMat = new THREE.MeshStandardMaterial({
            color: 0xa9ffe0,
            emissive: 0x28d7a2,
            emissiveIntensity: 0.95,
            roughness: 0.15,
            metalness: 0.25,
        });
        const lineMat = new THREE.MeshBasicMaterial({
            color: 0x87ffd5,
            transparent: true,
            opacity: 0.65,
        });

        this.shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), shellMat);
        this.group.add(this.shell);

        this.crystals = new THREE.Group();
        const crystalGeo = new THREE.OctahedronGeometry(0.4, 0);
        for (let i = 0; i < 7; i++) {
            const c = new THREE.Mesh(crystalGeo, crystalMat);
            c.userData.phase = Math.random() * Math.PI * 2;
            c.userData.radius = 0.9 + Math.random() * 1.1;
            c.userData.speed = 0.55 + Math.random() * 0.95;
            this.crystals.add(c);
        }
        this.group.add(this.crystals);

        this.linkBars = new THREE.Group();
        const barGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 5);
        for (let i = 0; i < 8; i++) {
            const b = new THREE.Mesh(barGeo, lineMat);
            b.rotation.x = Math.PI / 2;
            b.userData.phase = i * 0.7;
            this.linkBars.add(b);
        }
        this.group.add(this.linkBars);
    }

    updateVisual(dt, time) {
        this.shell.material.opacity = 0.05 + Math.sin(time * 3.4) * 0.02;
        this.shell.rotation.y += dt * 0.15;
        this.shell.rotation.x -= dt * 0.11;

        for (let i = 0; i < this.crystals.children.length; i++) {
            const c = this.crystals.children[i];
            const phase = c.userData.phase;
            const r = c.userData.radius;
            const speed = c.userData.speed;
            const a = time * speed + phase;
            c.position.set(
                Math.cos(a) * r,
                Math.sin(a * 1.4 + phase) * r * 0.65,
                Math.sin(a * 0.8) * r * 0.75,
            );
            c.rotation.x += dt * 1.2;
            c.rotation.y += dt * 0.8;
        }

        for (let i = 0; i < this.linkBars.children.length; i++) {
            const b = this.linkBars.children[i];
            const a = time * 1.4 + b.userData.phase;
            b.position.set(Math.cos(a) * 1.4, Math.sin(a * 1.2) * 0.95, Math.sin(a * 0.8) * 0.8);
            b.scale.y = 0.65 + Math.sin(a * 2.3) * 0.2;
            b.rotation.z += dt * 0.25;
        }
    }

    sampleTrigger(player) {
        const inside = player.position.distanceToSquared(this.group.position) <= this.radius * this.radius;
        return { inside, activate: inside && !this._playerInsideLastFrame };
    }

    onActivate(context) {
        context.player.activateResonance({
            duration: 7.8,
            multiplier: 2,
        });
        this.emit(context, 'Resonance Beacon: Shards geben doppelte Energie', 'cool');
    }
}
