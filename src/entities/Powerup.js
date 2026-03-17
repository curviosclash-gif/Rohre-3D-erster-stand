// ============================================
// Powerup.js - Powerup-Spawning & Pickup
// ============================================

import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { getActiveRuntimeConfig } from '../core/runtime/ActiveRuntimeConfigStore.js';
import { isHuntHealthActive } from '../hunt/HealthSystem.js';
import { isRocketTierType, pickWeightedRocketTierType } from '../hunt/RocketPickupSystem.js';
import { PowerupModelFactory } from './PowerupModelFactory.js';

function getHuntPickupWeights() {
    return getActiveRuntimeConfig(CONFIG)?.HUNT?.PICKUP_WEIGHTS || {};
}

function pickWeightedType(typeEntries = []) {
    let totalWeight = 0;
    for (const entry of typeEntries) {
        totalWeight += Math.max(0, Number(entry?.weight) || 0);
    }
    if (totalWeight <= 0) return null;

    let roll = Math.random() * totalWeight;
    for (const entry of typeEntries) {
        roll -= Math.max(0, Number(entry?.weight) || 0);
        if (roll <= 0) {
            return entry.type;
        }
    }
    return typeEntries[typeEntries.length - 1]?.type || null;
}

const AUTHORED_ITEM_TYPE_ALIASES = Object.freeze({
    item_battery: 'SPEED_UP',
    item_health: 'SHIELD',
    item_rocket: 'ROCKET_WEAK',
    item_shield: 'SHIELD',
});

function isTypeAllowedForMode(type, huntModeActive) {
    const normalizedType = String(type || '').trim().toUpperCase();
    const entry = getActiveRuntimeConfig(CONFIG)?.POWERUP?.TYPES?.[normalizedType];
    if (!entry) return false;
    if (entry.huntOnly && !huntModeActive) return false;
    if (entry.classicOnly && huntModeActive) return false;
    return true;
}

function resolveAuthoredPickupType(anchor, huntModeActive) {
    if (!anchor || typeof anchor !== 'object') return null;
    const candidates = [
        anchor.pickupType,
        anchor.type,
        AUTHORED_ITEM_TYPE_ALIASES[String(anchor.type || '').trim().toLowerCase()],
        AUTHORED_ITEM_TYPE_ALIASES[String(anchor.model || '').trim().toLowerCase()],
    ];
    for (const candidate of candidates) {
        const normalizedType = String(candidate || '').trim().toUpperCase();
        if (!normalizedType) continue;
        if (isTypeAllowedForMode(normalizedType, huntModeActive)) {
            return normalizedType;
        }
    }
    return null;
}

function buildAnchorKey(anchor, index = 0) {
    if (typeof anchor?.id === 'string' && anchor.id.trim()) {
        return anchor.id.trim();
    }
    return [
        'anchor',
        index,
        Math.round((Number(anchor?.x) || 0) * 1000),
        Math.round((Number(anchor?.y) || 0) * 1000),
        Math.round((Number(anchor?.z) || 0) * 1000),
    ].join(':');
}

export class PowerupManager {
    constructor(renderer, arena, runtimeConfig = null) {
        const config = getActiveRuntimeConfig(CONFIG);
        this.renderer = renderer;
        this.arena = arena;
        this.runtimeConfig = runtimeConfig;
        this.items = []; // { mesh, type, box }
        this.spawnTimer = 0;
        this.typeKeys = Object.keys(config.POWERUP.TYPES);
        this._pickupBoxSize = new THREE.Vector3();
        this._pickupSphere = new THREE.Sphere();

        // Shared Geometries (einmal erstellen, wiederverwenden)
        const size = config.POWERUP.SIZE;
        this._modelFactory = new PowerupModelFactory(size);
        this._sharedGeo = new THREE.BoxGeometry(size, size, size);
        this._sharedWireGeo = new THREE.BoxGeometry(size * 1.15, size * 1.15, size * 1.15);
        this._occupiedAnchorKeys = new Set();
    }

    update(dt) {
        const config = getActiveRuntimeConfig(CONFIG);
        this.spawnTimer += dt;

        // Neue Items spawnen
        if (this.spawnTimer >= config.POWERUP.SPAWN_INTERVAL && this.items.length < config.POWERUP.MAX_ON_FIELD) {
            this.spawnTimer = 0;
            this._spawnRandom();
        }

        // Animation
        const time = performance.now() * 0.001;
        const pickupSize = config.POWERUP.PICKUP_RADIUS * 2;
        this._pickupBoxSize.set(pickupSize, pickupSize, pickupSize);
        for (const item of this.items) {
            item.mesh.rotation.y += config.POWERUP.ROTATION_SPEED * dt;
            item.mesh.position.y = item.baseY + Math.sin(time * config.POWERUP.BOUNCE_SPEED + item.phase) * config.POWERUP.BOUNCE_HEIGHT;

            // Bounding Box aktualisieren
            item.box.setFromCenterAndSize(
                item.mesh.position,
                this._pickupBoxSize
            );
        }
    }

    _spawnRandom() {
        const config = getActiveRuntimeConfig(CONFIG);
        const huntModeActive = isHuntHealthActive();
        const spawnableTypes = this.typeKeys.filter((typeKey) => {
            const entry = config.POWERUP.TYPES[typeKey];
            if (!entry) return false;
            if (entry.huntOnly && !huntModeActive) return false;
            if (entry.classicOnly && huntModeActive) return false;
            return true;
        });
        if (spawnableTypes.length === 0) return;

        const authoredAnchors = this._getAvailableAuthoredAnchors();
        const authoredAnchor = authoredAnchors.length > 0
            ? this._pickAuthoredAnchor(authoredAnchors)
            : null;
        if (!authoredAnchor && (this.arena?.getAuthoredItemAnchors?.()?.length || 0) > 0) {
            return;
        }

        let type = resolveAuthoredPickupType(authoredAnchor?.anchor, huntModeActive)
            || spawnableTypes[Math.floor(Math.random() * spawnableTypes.length)];
        if (huntModeActive) {
            const rocketSpawnChance = Math.max(0, Number(config?.HUNT?.ROCKET_PICKUP_SPAWN_CHANCE || 0));
            const nonRocketTypes = spawnableTypes.filter((typeKey) => !isRocketTierType(typeKey));
            const huntWeights = getHuntPickupWeights();
            const weightedNonRocketTypes = nonRocketTypes
                .map((typeKey) => ({
                    type: typeKey,
                    weight: Number(huntWeights?.[typeKey] ?? 1),
                }))
                .filter((entry) => entry.weight > 0);

            if (Math.random() < rocketSpawnChance) {
                const weightedRocketType = pickWeightedRocketTierType();
                if (spawnableTypes.includes(weightedRocketType) || isRocketTierType(weightedRocketType)) {
                    type = weightedRocketType;
                }
            } else if (weightedNonRocketTypes.length > 0) {
                type = pickWeightedType(weightedNonRocketTypes) || weightedNonRocketTypes[0].type;
            } else if (nonRocketTypes.length > 0) {
                type = nonRocketTypes[Math.floor(Math.random() * nonRocketTypes.length)];
            }
        }
        if (authoredAnchor?.anchor) {
            const fixedType = resolveAuthoredPickupType(authoredAnchor.anchor, huntModeActive);
            if (fixedType) {
                type = fixedType;
            }
        }

        const powerupConfig = config.POWERUP.TYPES[type];
        let pos = null;
        if (authoredAnchor?.anchor) {
            pos = new THREE.Vector3(
                Number(authoredAnchor.anchor.x) || 0,
                Number(authoredAnchor.anchor.y) || 0,
                Number(authoredAnchor.anchor.z) || 0,
            );
        } else if (config.GAMEPLAY.PLANAR_MODE && this.arena?.getPortalLevels) {
            const levels = this.arena.getPortalLevels();
            if (levels.length > 0) {
                const level = levels[Math.floor(Math.random() * levels.length)];
                pos = this.arena.getRandomPositionOnLevel(level, 8);
            }
        }
        if (!pos) {
            pos = this.arena.getRandomPosition(8);
        }

        const mesh = this._createPowerupMesh(type, powerupConfig);
        mesh.position.copy(pos);
        if (authoredAnchor?.anchor && Number.isFinite(Number(authoredAnchor.anchor.rotateY))) {
            mesh.rotation.y = Number(authoredAnchor.anchor.rotateY);
        }
        mesh.castShadow = false;

        this.renderer.addToScene(mesh);

        const box = new THREE.Box3().setFromCenterAndSize(
            pos,
            new THREE.Vector3(config.POWERUP.PICKUP_RADIUS * 2, config.POWERUP.PICKUP_RADIUS * 2, config.POWERUP.PICKUP_RADIUS * 2)
        );

        this.items.push({
            mesh,
            type,
            box,
            baseY: pos.y,
            phase: Math.random() * Math.PI * 2,
            anchorKey: authoredAnchor?.key || null,
        });
        if (authoredAnchor?.key) {
            this._occupiedAnchorKeys.add(authoredAnchor.key);
        }
    }

    _createPowerupMesh(type, config) {
        if (this._modelFactory) {
            const model = this._modelFactory.createModel(type, config);
            if (model) return model;
        }

        const mat = new THREE.MeshStandardMaterial({
            color: config.color,
            emissive: config.color,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.85,
        });
        const mesh = new THREE.Mesh(this._sharedGeo, mat);

        const wireMat = new THREE.MeshBasicMaterial({
            color: config.color,
            wireframe: true,
            transparent: true,
            opacity: 0.3,
        });
        const wire = new THREE.Mesh(this._sharedWireGeo, wireMat);
        mesh.add(wire);
        return mesh;
    }

    /** Prueft ob ein Spieler ein Item einsammelt */
    checkPickup(playerPosition, radius) {
        this._pickupSphere.center.copy(playerPosition);
        this._pickupSphere.radius = radius + getActiveRuntimeConfig(CONFIG).POWERUP.PICKUP_RADIUS;

        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.items[i].box.intersectsSphere(this._pickupSphere)) {
                const item = this.items.splice(i, 1)[0];
                this._disposeSpawnedItem(item);
                return item.type;
            }
        }
        return null;
    }

    clear() {
        for (const item of this.items) {
            this._disposeSpawnedItem(item);
        }
        this.items = [];
        this.spawnTimer = 0;
        this._occupiedAnchorKeys.clear();
    }

    dispose() {
        this.clear();
        if (this._modelFactory) {
            this._modelFactory.dispose();
            this._modelFactory = null;
        }
        if (this._sharedGeo) {
            this._sharedGeo.dispose();
            this._sharedGeo = null;
        }
        if (this._sharedWireGeo) {
            this._sharedWireGeo.dispose();
            this._sharedWireGeo = null;
        }
    }

    _getAvailableAuthoredAnchors() {
        const anchors = this.arena?.getAuthoredItemAnchors?.() || [];
        const availableAnchors = [];
        for (let i = 0; i < anchors.length; i += 1) {
            const anchor = anchors[i];
            if (!anchor || !Number.isFinite(Number(anchor.x)) || !Number.isFinite(Number(anchor.z))) continue;
            const key = buildAnchorKey(anchor, i);
            if (this._occupiedAnchorKeys.has(key)) continue;
            availableAnchors.push({
                key,
                anchor,
                weight: Math.max(0.01, Number(anchor.weight) || 1),
            });
        }
        return availableAnchors;
    }

    _pickAuthoredAnchor(availableAnchors = []) {
        if (!Array.isArray(availableAnchors) || availableAnchors.length === 0) return null;
        let totalWeight = 0;
        for (const entry of availableAnchors) {
            totalWeight += Math.max(0.01, Number(entry.weight) || 1);
        }
        let roll = Math.random() * totalWeight;
        for (const entry of availableAnchors) {
            roll -= Math.max(0.01, Number(entry.weight) || 1);
            if (roll <= 0) {
                return entry;
            }
        }
        return availableAnchors[availableAnchors.length - 1];
    }

    _disposeSpawnedItem(item) {
        if (!item) return;
        if (item.anchorKey) {
            this._occupiedAnchorKeys.delete(item.anchorKey);
        }
        this.renderer.removeFromScene(item.mesh);
        item.mesh.traverse((node) => {
            if (node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach((material) => material.dispose());
                } else {
                    node.material.dispose();
                }
            }
        });
    }
}

