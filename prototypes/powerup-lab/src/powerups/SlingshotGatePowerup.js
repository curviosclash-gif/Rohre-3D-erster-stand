import * as THREE from 'three';
import { PrototypePowerupBase } from './PrototypePowerupBase.js';

export class SlingshotGatePowerup extends PrototypePowerupBase {
    constructor(scene, options = {}) {
        super(scene, {
            label: 'Slingshot Gate',
            color: options.color ?? 0x7dfbff,
            triggerRadius: options.triggerRadius ?? 2.9,
            cooldown: options.cooldown ?? 5.2,
            ...options,
        });
        this.outerRadius = options.outerRadius ?? 2.9;
        this.portalDepth = options.portalDepth ?? 1.1;
    }

    buildVisual() {
        const ringMatA = new THREE.MeshStandardMaterial({
            color: 0x7dfbff,
            emissive: 0x1da4ff,
            emissiveIntensity: 0.95,
            roughness: 0.3,
            metalness: 0.6,
        });
        const ringMatB = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x61d8ff,
            emissiveIntensity: 0.6,
            roughness: 0.4,
            metalness: 0.45,
        });
        const chevronMat = new THREE.MeshBasicMaterial({ color: 0x9cf6ff, transparent: true, opacity: 0.85 });

        this.frontRing = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.12, 10, 44), ringMatA);
        this.frontRing.position.z = 0.55;
        this.group.add(this.frontRing);

        this.backRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.1, 10, 36), ringMatB);
        this.backRing.position.z = -0.55;
        this.group.add(this.backRing);

        this.chevrons = new THREE.Group();
        const chevronGeo = new THREE.ConeGeometry(0.18, 0.55, 3);
        chevronGeo.rotateZ(Math.PI);
        for (let i = 0; i < 12; i++) {
            const c = new THREE.Mesh(chevronGeo, chevronMat);
            const angle = (Math.PI * 2 * i) / 12;
            c.position.set(Math.cos(angle) * 2.55, Math.sin(angle) * 2.55, 0);
            c.rotation.z = angle;
            this.chevrons.add(c);
        }
        this.group.add(this.chevrons);

        this.axisBeam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8),
            new THREE.MeshBasicMaterial({ color: 0xa7fcff, transparent: true, opacity: 0.25 }),
        );
        this.axisBeam.rotation.x = Math.PI / 2;
        this.group.add(this.axisBeam);
    }

    updateVisual(dt, time) {
        this.frontRing.rotation.z += dt * 0.85;
        this.backRing.rotation.z -= dt * 1.1;
        this.chevrons.rotation.z -= dt * 1.6;
        this.axisBeam.scale.z = 0.7 + Math.sin(time * 7) * 0.18;
        this.axisBeam.material.opacity = 0.2 + Math.sin(time * 9) * 0.07;
    }

    sampleTrigger(player) {
        return this.samplePortalCrossing(player, {
            outerRadius: this.outerRadius,
            innerRadius: 0.2,
            halfDepth: this.portalDepth,
        });
    }

    onActivate(context) {
        context.player.activateSlingshot({
            forwardImpulse: 28,
            liftImpulse: 5.5,
            duration: 2.4,
            assistStrength: 5.2,
            turnBonus: 1.45,
        }, this.getForward(), this.getUp());
        this.emit(context, 'Slingshot Gate: Stabilisierung + Impuls', 'cool');
    }
}
