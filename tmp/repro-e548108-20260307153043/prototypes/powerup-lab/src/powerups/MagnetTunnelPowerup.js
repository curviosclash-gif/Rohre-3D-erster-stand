import * as THREE from 'three';
import { PrototypePowerupBase } from './PrototypePowerupBase.js';

export class MagnetTunnelPowerup extends PrototypePowerupBase {
    constructor(scene, options = {}) {
        super(scene, {
            label: 'Magnet Tunnel',
            color: options.color ?? 0x57a9ff,
            triggerRadius: options.triggerRadius ?? 2.8,
            cooldown: options.cooldown ?? 7.5,
            ...options,
        });
        this.outerRadius = options.outerRadius ?? 2.8;
        this.portalDepth = options.portalDepth ?? 1.1;
    }

    buildVisual() {
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x77b9ff,
            emissive: 0x2a6fff,
            emissiveIntensity: 0.9,
            roughness: 0.25,
            metalness: 0.7,
        });
        const fieldMat = new THREE.MeshBasicMaterial({
            color: 0x68c4ff,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
        });
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0xbce5ff,
            transparent: true,
            opacity: 0.9,
        });

        this.ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.14, 10, 40), ringMat);
        this.group.add(this.ring);

        this.field = new THREE.Mesh(new THREE.RingGeometry(0.45, 2.55, 36), fieldMat);
        this.group.add(this.field);

        this.orbiters = [];
        this.orbiterGroup = new THREE.Group();
        const orbGeo = new THREE.SphereGeometry(0.1, 8, 8);
        for (let i = 0; i < 10; i++) {
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.userData.angle = (Math.PI * 2 * i) / 10;
            orb.userData.radius = 1.2 + (i % 3) * 0.55;
            orb.userData.speed = 0.8 + (i % 4) * 0.35;
            this.orbiters.push(orb);
            this.orbiterGroup.add(orb);
        }
        this.group.add(this.orbiterGroup);
    }

    updateVisual(dt, time) {
        this.ring.rotation.z -= dt * 0.95;
        this.field.rotation.z += dt * 0.4;
        this.field.material.opacity = 0.14 + Math.sin(time * 5.5) * 0.05;

        for (let i = 0; i < this.orbiters.length; i++) {
            const orb = this.orbiters[i];
            const angle = orb.userData.angle + time * orb.userData.speed;
            const radius = orb.userData.radius + Math.sin(time * 2.5 + i) * 0.08;
            orb.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle * 1.15) * radius * 0.65,
                Math.sin(angle * 1.7) * 0.5,
            );
        }
    }

    sampleTrigger(player) {
        return this.samplePortalCrossing(player, {
            outerRadius: this.outerRadius,
            innerRadius: 0.15,
            halfDepth: this.portalDepth,
        });
    }

    onActivate(context) {
        context.player.activateMagnet({
            duration: 8.5,
            radius: 18,
            strength: 52,
        });
        this.emit(context, 'Magnet Tunnel: Energy-Shards werden angezogen', 'cool');
    }
}
