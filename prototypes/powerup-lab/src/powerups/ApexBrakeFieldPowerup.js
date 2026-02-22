import * as THREE from 'three';
import { PrototypePowerupBase } from './PrototypePowerupBase.js';

export class ApexBrakeFieldPowerup extends PrototypePowerupBase {
    constructor(scene, options = {}) {
        super(scene, {
            label: 'Apex Brake Field',
            color: options.color ?? 0xc6ff6b,
            triggerRadius: options.triggerRadius ?? 2.9,
            cooldown: options.cooldown ?? 7.0,
            ...options,
        });
        this.outerRadius = options.outerRadius ?? 2.9;
        this.portalDepth = options.portalDepth ?? 1.0;
    }

    buildVisual() {
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0xc6ff6b,
            emissive: 0x4db725,
            emissiveIntensity: 0.85,
            roughness: 0.35,
            metalness: 0.4,
        });
        const ribbonMat = new THREE.MeshBasicMaterial({
            color: 0xe8ffb7,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });

        this.frame = new THREE.Mesh(new THREE.TorusKnotGeometry(1.6, 0.12, 70, 10, 2, 3), frameMat);
        this.frame.scale.set(1.5, 1.5, 0.2);
        this.group.add(this.frame);

        this.ribbons = [];
        const ribbonGeo = new THREE.PlaneGeometry(0.22, 4.4, 1, 12);
        for (let i = 0; i < 3; i++) {
            const r = new THREE.Mesh(ribbonGeo, ribbonMat.clone());
            r.rotation.z = (Math.PI / 3) * i;
            r.userData.phase = i * 1.7;
            this.group.add(r);
            this.ribbons.push(r);
        }

        this.core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.45, 0),
            new THREE.MeshStandardMaterial({
                color: 0xf1ffcf,
                emissive: 0xa6ff2d,
                emissiveIntensity: 0.7,
                roughness: 0.2,
                metalness: 0.2,
            }),
        );
        this.group.add(this.core);
    }

    updateVisual(dt, time) {
        this.frame.rotation.z += dt * 0.8;
        this.frame.rotation.x -= dt * 0.35;
        this.core.rotation.x += dt * 1.1;
        this.core.rotation.y += dt * 0.9;

        for (let i = 0; i < this.ribbons.length; i++) {
            const r = this.ribbons[i];
            const p = r.userData.phase || 0;
            r.rotation.y = Math.sin(time * 1.8 + p) * 0.5;
            r.material.opacity = 0.32 + Math.sin(time * 6 + p) * 0.12;
            r.scale.x = 0.85 + Math.sin(time * 4.5 + p) * 0.18;
        }
    }

    sampleTrigger(player) {
        return this.samplePortalCrossing(player, {
            outerRadius: this.outerRadius,
            innerRadius: 0.2,
            halfDepth: this.portalDepth,
        });
    }

    onActivate(context) {
        context.player.activateApex({
            duration: 3.6,
            turnBonus: 1.7,
            speedPenalty: 10,
            impulseDampingMultiplier: 2.2,
        });
        this.emit(context, 'Apex Field: mehr Kontrolle, weniger Topspeed', 'cool');
    }
}
