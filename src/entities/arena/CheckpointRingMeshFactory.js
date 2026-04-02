import * as THREE from 'three';
import { getCheckpointLabelTexture } from './ArenaBuildResourceCache.js';

const CHECKPOINT_COLOR = 0xaaff00;
const CHECKPOINT_FINISH_COLOR = 0xffd700;
const RING_RADIUS = 12;
const RING_TUBE = 0.2;
const FINISH_TUBE = 0.35;
const LABEL_SIZE = 8;

let sharedRingGeometry = null;
let sharedFinishGeometry = null;
let sharedLabelGeometry = null;

function getRingGeometry() {
    if (!sharedRingGeometry) {
        sharedRingGeometry = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 12, 56);
    }
    return sharedRingGeometry;
}

function getFinishGeometry() {
    if (!sharedFinishGeometry) {
        sharedFinishGeometry = new THREE.TorusGeometry(RING_RADIUS, FINISH_TUBE, 12, 56);
    }
    return sharedFinishGeometry;
}

function getLabelGeometry() {
    if (!sharedLabelGeometry) {
        sharedLabelGeometry = new THREE.PlaneGeometry(LABEL_SIZE, LABEL_SIZE);
    }
    return sharedLabelGeometry;
}

function createRingMaterial(color) {
    return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.7,
    });
}

function createLabelMaterial(label) {
    return new THREE.MeshBasicMaterial({
        map: getCheckpointLabelTexture(label),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

function buildRingGroup(position, rotation, ringGeometry, ringMaterial, label) {
    const group = new THREE.Group();
    group.position.copy(position);
    if (rotation) {
        group.rotation.copy(rotation);
    }

    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.frustumCulled = false;
    group.add(ringMesh);

    const labelMesh = new THREE.Mesh(getLabelGeometry(), createLabelMaterial(label));
    labelMesh.frustumCulled = false;
    group.add(labelMesh);

    group.userData.ringMesh = ringMesh;
    group.userData.labelMesh = labelMesh;
    return group;
}

export function createCheckpointRingMesh(position, rotation, number, renderer) {
    const material = createRingMaterial(CHECKPOINT_COLOR);
    const group = buildRingGroup(position, rotation, getRingGeometry(), material, number);
    group.userData.checkpointNumber = number;
    renderer.addToScene(group);
    return group;
}

export function createFinishRingMesh(position, rotation, renderer) {
    const material = createRingMaterial(CHECKPOINT_FINISH_COLOR);
    material.emissiveIntensity = 1.0;
    material.roughness = 0.2;
    material.metalness = 0.75;
    const group = buildRingGroup(position, rotation, getFinishGeometry(), material, 'F');
    group.userData.isFinish = true;
    renderer.addToScene(group);
    return group;
}
