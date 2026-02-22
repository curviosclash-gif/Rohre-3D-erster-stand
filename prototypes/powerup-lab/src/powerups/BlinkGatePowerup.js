import * as THREE from 'three';
import { PrototypePowerupBase } from './PrototypePowerupBase.js';

export class BlinkGatePowerup extends PrototypePowerupBase {
    constructor(scene, options = {}) {
        super(scene, {
            label: 'Blink Gate',
            color: options.color ?? 0xffffff,
            triggerRadius: options.triggerRadius ?? 2.45,
            cooldown: options.cooldown ?? 6.2,
            ...options,
        });
        this.outerRadius = options.outerRadius ?? 2.45;
        this.portalDepth = options.portalDepth ?? 0.95;
    }

    buildVisual() {
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0xf2f6ff,
            emissive: 0x9ac3ff,
            emissiveIntensity: 0.9,
            roughness: 0.25,
            metalness: 0.55,
        });
        const laneMat = new THREE.MeshBasicMaterial({
            color: 0xcfe6ff,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
        });
        const shardMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
        });

        this.ringA = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.1, 8, 36), rimMat);
        this.group.add(this.ringA);

        this.ringB = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.05, 8, 28), rimMat.clone());
        this.ringB.material.emissive.setHex(0x66d4ff);
        this.ringB.position.z = -0.18;
        this.group.add(this.ringB);

        this.innerField = new THREE.Mesh(new THREE.RingGeometry(0.25, 2.15, 30), laneMat);
        this.group.add(this.innerField);

        this.shardGroup = new THREE.Group();
        const shardGeo = new THREE.BoxGeometry(0.12, 0.12, 0.55);
        for (let i = 0; i < 12; i++) {
            const s = new THREE.Mesh(shardGeo, shardMat);
            const a = (Math.PI * 2 * i) / 12;
            s.position.set(Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0);
            s.rotation.z = a;
            s.userData.phase = Math.random() * Math.PI * 2;
            this.shardGroup.add(s);
        }
        this.group.add(this.shardGroup);
    }

    updateVisual(dt, time) {
        this.ringA.rotation.z += dt * 1.7;
        this.ringB.rotation.z -= dt * 2.6;
        this.innerField.rotation.z += dt * 0.9;
        this.innerField.material.opacity = 0.22 + Math.sin(time * 10) * 0.08;

        for (let i = 0; i < this.shardGroup.children.length; i++) {
            const s = this.shardGroup.children[i];
            const p = s.userData.phase || 0;
            s.position.z = Math.sin(time * 9 + p) * 0.42;
            const pulse = 0.9 + Math.sin(time * 15 + p) * 0.2;
            s.scale.set(1, 1, pulse);
        }
    }

    sampleTrigger(player) {
        return this.samplePortalCrossing(player, {
            outerRadius: this.outerRadius,
            innerRadius: 0.1,
            halfDepth: this.portalDepth,
        });
    }

    onActivate(context) {
        context.player.activateBlink({
            distance: 26,
            exitImpulse: 20,
            visualDuration: 0.95,
        }, this.getForward());
        this.emit(context, 'Blink Gate: Kurzsprung nach vorne', 'cool');
    }
}
