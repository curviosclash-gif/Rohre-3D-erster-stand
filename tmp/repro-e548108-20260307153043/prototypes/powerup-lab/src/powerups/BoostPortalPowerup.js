import * as THREE from 'three';
import { PrototypePowerupBase } from './PrototypePowerupBase.js';

export class BoostPortalPowerup extends PrototypePowerupBase {
    constructor(scene, options = {}) {
        super(scene, {
            label: 'Boost Portal',
            color: options.color ?? 0xffb34d,
            triggerRadius: options.triggerRadius ?? 3.25,
            cooldown: options.cooldown ?? 4.5,
            ...options,
        });
        this.outerRadius = options.outerRadius ?? 3.25;
        this.portalDepth = options.portalDepth ?? 1.1;
    }

    buildVisual() {
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xffca6b,
            emissive: 0xff9b2e,
            emissiveIntensity: 1.0,
            roughness: 0.25,
            metalness: 0.65,
        });
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0xfff0a8,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
        });
        const arcMat = new THREE.MeshBasicMaterial({
            color: 0xff8a1f,
            transparent: true,
            opacity: 0.75,
        });

        this.outerRing = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.22, 12, 48), ringMat);
        this.group.add(this.outerRing);

        this.innerDisk = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.95, 40, 1), innerMat);
        this.group.add(this.innerDisk);

        this.arcGroup = new THREE.Group();
        const arcGeo = new THREE.BoxGeometry(0.22, 0.1, 0.95);
        for (let i = 0; i < 8; i++) {
            const arc = new THREE.Mesh(arcGeo, arcMat);
            const angle = (Math.PI * 2 * i) / 8;
            arc.position.set(Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, 0);
            arc.lookAt(0, 0, 0);
            this.arcGroup.add(arc);
        }
        this.group.add(this.arcGroup);

        this.spines = [];
        const spineGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6);
        const spineMat = new THREE.MeshBasicMaterial({ color: 0xffd17c, transparent: true, opacity: 0.65 });
        for (let i = 0; i < 6; i++) {
            const spine = new THREE.Mesh(spineGeo, spineMat);
            const angle = (Math.PI * 2 * i) / 6;
            spine.position.set(Math.cos(angle) * 1.75, Math.sin(angle) * 1.75, 0);
            spine.rotation.z = angle;
            spine.rotation.x = Math.PI / 2;
            this.group.add(spine);
            this.spines.push(spine);
        }
    }

    updateVisual(dt, time) {
        this.outerRing.rotation.z += dt * 0.55;
        this.arcGroup.rotation.z -= dt * 1.4;
        this.innerDisk.rotation.z += dt * 0.32;
        this.innerDisk.scale.setScalar(1 + Math.sin(time * 9) * 0.05);
        this.innerDisk.material.opacity = 0.24 + Math.sin(time * 12) * 0.05;
        for (let i = 0; i < this.spines.length; i++) {
            this.spines[i].scale.y = 0.75 + Math.sin(time * 8 + i) * 0.2;
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
        context.player.activateBoostPortal({
            forwardImpulse: 46,
            bonusSpeed: 58,
            duration: 1.6,
        }, this.getForward());
        this.emit(context, 'Boost Portal: Schubimpuls aktiviert', 'warm');
    }
}
