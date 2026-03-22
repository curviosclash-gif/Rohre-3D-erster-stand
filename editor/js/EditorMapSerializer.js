import * as THREE from 'three';
import { createMapDocument, parseMapJSON } from '../../src/entities/MapSchema.js';

function cloneSerializable(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => cloneSerializable(entry));
    }
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const result = {};
    Object.entries(value).forEach(([key, entry]) => {
        const clonedEntry = cloneSerializable(entry);
        if (clonedEntry !== undefined) {
            result[key] = clonedEntry;
        }
    });
    return result;
}

function readManagerMapMetadata(manager) {
    const source = manager?.mapDocumentMeta && typeof manager.mapDocumentMeta === 'object'
        ? manager.mapDocumentMeta
        : {};
    const metadata = {};

    if (typeof source.glbModel === 'string' && source.glbModel) {
        metadata.glbModel = source.glbModel;
    }
    if (typeof source.glbColliderMode === 'string' && source.glbColliderMode) {
        metadata.glbColliderMode = source.glbColliderMode;
    }
    if (source.preferAuthoredPortals === true) {
        metadata.preferAuthoredPortals = true;
    }
    if (Array.isArray(source.portalLevels)) {
        metadata.portalLevels = cloneSerializable(source.portalLevels) || [];
    }
    if (Array.isArray(source.gates)) {
        metadata.gates = cloneSerializable(source.gates) || [];
    }
    if (source.parcours && typeof source.parcours === 'object') {
        metadata.parcours = cloneSerializable(source.parcours) || {};
    }

    return metadata;
}

function extractMapMetadata(data) {
    if (!data || typeof data !== 'object') return {};

    const metadata = {};
    if (typeof data.glbModel === 'string' && data.glbModel) {
        metadata.glbModel = data.glbModel;
    }
    if (typeof data.glbColliderMode === 'string' && data.glbColliderMode) {
        metadata.glbColliderMode = data.glbColliderMode;
    }
    if (data.preferAuthoredPortals === true) {
        metadata.preferAuthoredPortals = true;
    }
    if (Array.isArray(data.portalLevels) && data.portalLevels.length > 0) {
        metadata.portalLevels = cloneSerializable(data.portalLevels) || [];
    }
    if (Array.isArray(data.gates) && data.gates.length > 0) {
        metadata.gates = cloneSerializable(data.gates) || [];
    }
    if (data.parcours && typeof data.parcours === 'object') {
        metadata.parcours = cloneSerializable(data.parcours) || {};
    }
    return metadata;
}

export function generateJSONExport(manager, arenaSize) {
    const payload = createMapDocument({
        ...readManagerMapMetadata(manager),
        arenaSize,
        tunnels: [],
        hardBlocks: [],
        foamBlocks: [],
        botSpawns: [],
        portals: [],
        items: [],
        aircraft: [],
        playerSpawn: { x: -800, y: arenaSize.height * 0.55, z: 0 },
    });

    manager.core.objectsContainer.children.forEach((obj) => {
        const u = obj.userData || {};
        const p = obj.position;
        const ry = obj.rotation.y || 0;

        if (u.type === 'tunnel') {
            manager.syncTunnelEndpointsFromMesh(obj);
        }

        if (u.type === 'hard') {
            payload.hardBlocks.push({
                id: u.id,
                x: p.x, y: p.y, z: p.z,
                width: u.sizeX,
                depth: u.sizeZ,
                height: u.sizeY,
                size: u.sizeInfo,
                rotateY: ry
            });
        }
        else if (u.type === 'foam') {
            payload.foamBlocks.push({
                id: u.id,
                x: p.x, y: p.y, z: p.z,
                width: u.sizeX,
                depth: u.sizeZ,
                height: u.sizeY,
                size: u.sizeInfo,
                rotateY: ry
            });
        }
        else if (u.type === 'portal') {
            const portalEntry = { id: u.id, x: p.x, y: p.y, z: p.z, radius: u.sizeInfo };
            if (typeof u.subType === 'string' && u.subType) {
                portalEntry.model = u.subType;
            }
            payload.portals.push(portalEntry);
        }
        else if (u.type === 'spawn') {
            if (u.subType === 'player') {
                payload.playerSpawn = { id: u.id, x: p.x, y: p.y, z: p.z };
            } else {
                payload.botSpawns.push({ id: u.id, x: p.x, y: p.y, z: p.z });
            }
        }
        else if (u.type === 'item') {
            const itemEntry = { id: u.id, type: u.subType, x: p.x, y: p.y, z: p.z, rotateY: ry };
            if (typeof u.model === 'string' && u.model) {
                itemEntry.model = u.model;
            }
            if (typeof u.pickupType === 'string' && u.pickupType) {
                itemEntry.pickupType = u.pickupType;
            }
            if (Number.isFinite(Number(u.weight))) {
                itemEntry.weight = Number(u.weight);
            }
            payload.items.push(itemEntry);
        }
        else if (u.type === 'aircraft') {
            payload.aircraft.push({
                id: u.id,
                jetId: u.subType,
                x: p.x, y: p.y, z: p.z,
                scale: u.modelScale || 50,
                rotateY: ry
            });
        }
        else if (u.type === 'tunnel') {
            if (u.pointA && u.pointB) {
                const tunnelEntry = {
                    id: u.id,
                    ax: u.pointA.x, ay: u.pointA.y, az: u.pointA.z,
                    bx: u.pointB.x, by: u.pointB.y, bz: u.pointB.z,
                    radius: u.radius
                };
                if (typeof u.subType === 'string' && u.subType) {
                    tunnelEntry.model = u.subType;
                }
                payload.tunnels.push(tunnelEntry);
            }
        }
    });

    return JSON.stringify(payload, null, 2);
}

export function importFromJSON(manager, jsonString, options = {}) {
    try {
        const parsed = parseMapJSON(jsonString);
        const data = parsed.map;
        const onArenaSize = typeof options === 'function'
            ? options
            : (typeof options?.onArenaSize === 'function' ? options.onArenaSize : null);

        if (parsed.warnings.length > 0) {
            console.warn('[EditorMapManager] Import migration warnings:', parsed.warnings);
        }

        if (data.arenaSize && onArenaSize) {
            onArenaSize(data.arenaSize);
        }

        manager.clearAllObjects();
        manager.mapDocumentMeta = extractMapMetadata(data);

        manager.withSceneMutation(() => {
            if (data.hardBlocks) {
                data.hardBlocks.forEach((b) => manager.createMesh('hard', null, b.x, b.y, b.z, b.size, {
                    id: b.id,
                    sizeX: b.width || b.size * 2,
                    sizeZ: b.depth || b.size * 2,
                    sizeY: b.height || b.size * 2,
                    rotateY: b.rotateY || 0
                }, { updateUi: false }));
            }

            if (data.foamBlocks) {
                data.foamBlocks.forEach((b) => manager.createMesh('foam', null, b.x, b.y, b.z, b.size, {
                    id: b.id,
                    sizeX: b.width || b.size * 2,
                    sizeZ: b.depth || b.size * 2,
                    sizeY: b.height || b.size * 2,
                    rotateY: b.rotateY || 0
                }, { updateUi: false }));
            }

            if (data.portals) {
                data.portals.forEach((b) => manager.createMesh('portal', b.model || null, b.x, b.y, b.z, b.radius, {
                    id: b.id
                }, { updateUi: false }));
            }

            if (data.items) {
                data.items.forEach((b) => manager.createMesh('item', b.type, b.x, b.y, b.z, 0, {
                    id: b.id,
                    model: b.model,
                    pickupType: b.pickupType,
                    weight: b.weight,
                    rotateY: b.rotateY || 0
                }, { updateUi: false }));
            }

            if (data.aircraft) {
                data.aircraft.forEach((a) => manager.createMesh('aircraft', a.jetId, a.x, a.y, a.z, 0, {
                    id: a.id,
                    modelScale: a.scale || 50,
                    rotateY: a.rotateY || 0
                }, { updateUi: false }));
            }

            if (data.botSpawns) {
                data.botSpawns.forEach((b) => manager.createMesh('spawn', 'bot', b.x, b.y, b.z, 0, {
                    id: b.id
                }, { updateUi: false }));
            }

            if (data.playerSpawn) {
                manager.createMesh('spawn', 'player', data.playerSpawn.x, data.playerSpawn.y, data.playerSpawn.z, 0, {
                    id: data.playerSpawn.id
                }, { updateUi: false });
            }

            if (data.tunnels) {
                data.tunnels.forEach((t) => {
                    const pA = new THREE.Vector3(t.ax, t.ay, t.az);
                    const pB = new THREE.Vector3(t.bx, t.by, t.bz);
                    const center = pA.clone().lerp(pB, 0.5);
                    manager.createMesh('tunnel', t.model || null, center.x, center.y, center.z, t.radius, {
                        id: t.id,
                        pointA: pA,
                        pointB: pB,
                        radius: t.radius
                    }, { updateUi: false });
                });
            }

            manager.queueSceneUiRefresh({ tunnelVisuals: true });
        });
    } catch (e) {
        console.error('[EditorMapManager] Map import failed:', e);
        alert(`Map Import Error: ${e.message}`);
    }
}
