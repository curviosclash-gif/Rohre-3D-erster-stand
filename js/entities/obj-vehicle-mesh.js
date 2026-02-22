/**
 * OBJ-VEHICLE-MESH.JS - 3D Modell-Loader für OBJ-Schiffe
 * Lädt Modelle aus dem Spaceship-Pack und fügt Triebwerke hinzu.
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export class OBJVehicleMesh extends THREE.Group {
    constructor(color, shipId = 'ship5') {
        super();
        this.playerColor = color;
        this.shipId = shipId;
        this._loaded = false;

        // Materialien
        this.glowMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.6
        });

        this.forceFieldMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5
        });

        this._time = 0;
        this.forceFields = [];
        this.muzzle = new THREE.Object3D();
        this.add(this.muzzle);

        this.loadModel();
    }

    loadModel() {
        const mtlLoader = new MTLLoader();
        const basePath = 'assets/models/jets/cc0/spaceship_pack/dist/obj_mtl/';

        mtlLoader.setPath(basePath);
        mtlLoader.load(`${this.shipId}.mtl`, (materials) => {
            materials.preload();

            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.setPath(basePath);
            objLoader.load(`${this.shipId}.obj`, (object) => {
                // Modell zentrieren und skalieren
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Modell so ausrichten, dass -Z vorne ist
                object.position.sub(center);

                // Skalierung anpassen (die Modelle scheinen recht groß zu sein)
                const targetSize = 4.5;
                const scale = targetSize / Math.max(size.x, size.y, size.z);
                object.scale.setScalar(scale);

                // Speichere die lokale BoundingBox für OBB-Kollisionen
                this.localBox = new THREE.Box3().setFromObject(object);

                // Alle Meshes im Objekt finden und ggf. Farbe anpassen
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.add(object);
                this.model = object;

                // Triebwerke hinzufügen
                this.createWingEngines(
                    size.x * scale * 0.45,
                    size.z * scale,
                    size.x * scale * 0.5,
                    size.z * scale * 0.4
                );

                // Muzzle position anpassen (vor dem Schiff)
                this.muzzle.position.set(0, 0, -size.z * scale * 0.6);



                this._loaded = true;
                this.dispatchEvent({ type: 'loaded' });
            });
        });
    }



    createWingEngines(wingSpan, depth, forceFieldWidth, forceFieldDepth) {
        const shroudGeo = new THREE.CylinderGeometry(0.4, 0.35, 1.5, 12);
        shroudGeo.rotateX(Math.PI / 2);

        const nozzleGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 12, 1, true);
        nozzleGeo.rotateX(Math.PI / 2);

        const coreGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const engineCoreMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2.0
        });

        const createEngineAssembly = (side) => {
            const group = new THREE.Group();
            group.position.set(side * (wingSpan + 0.8), 0, depth * 1.2 + 1.5);

            // Shroud
            const shroud = new THREE.Mesh(shroudGeo, new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 }));
            group.add(shroud);

            // Nozzle
            const nozzle = new THREE.Mesh(nozzleGeo, new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1, roughness: 0.2 }));
            nozzle.position.z = 0.75;
            group.add(nozzle);

            // Core
            const core = new THREE.Mesh(coreGeo, engineCoreMat);
            core.position.z = 0.5;
            group.add(core);

            this.add(group);
            return group;
        };

        const lEng = createEngineAssembly(-1);
        const rEng = createEngineAssembly(1);

        // Force Fields
        this.createForceField(forceFieldWidth, forceFieldDepth, 1.5, -1);
        this.createForceField(forceFieldWidth, forceFieldDepth, 1.5, 1);

        // Glow / Flame
        const glowGeo = new THREE.CylinderGeometry(0.3, 0.01, 1.5, 8);
        glowGeo.rotateX(-Math.PI / 2);

        const addFlame = (parent) => {
            const flame = new THREE.Mesh(glowGeo, this.glowMat.clone());
            flame.name = 'flame';
            flame.position.z = 1.6;
            parent.add(flame);
        };

        addFlame(lEng);
        addFlame(rEng);
    }

    createForceField(width, depth, dist, side) {
        const fieldGeo = new THREE.CylinderGeometry(0.15, 0.15, dist, 8, 1, true);
        fieldGeo.rotateX(Math.PI / 2);

        const field = new THREE.Mesh(fieldGeo, this.forceFieldMat.clone());
        field.position.set(side * width, 0, depth + dist / 2);
        this.add(field);
        this.forceFields.push(field);

        const wire = new THREE.Mesh(fieldGeo, new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        }));
        field.add(wire);
    }

    tick(dt) {
        this._time += dt;

        // Force field pulsing
        this.forceFields.forEach((field, i) => {
            const pulse = 0.2 + 0.1 * Math.sin(this._time * 10 + i);
            field.material.opacity = pulse;
        });

    }
}
