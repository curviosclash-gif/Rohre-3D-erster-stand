import { DEFAULT_PORTAL_COLORS } from './MapSchemaConstants.js';
import { asPositiveNumber } from './MapSchemaSanitizeOps.js';
import { createMapDocument } from './MapSchemaMigrationOps.js';

export function toArenaMapDefinition(mapDocument, options = {}) {
    const normalized = createMapDocument(mapDocument);
    const mapScale = asPositiveNumber(options.mapScale, 1, 0.0001);
    const invScale = 1 / mapScale;
    const warnings = [];

    const obstacles = [];
    const pushBlockAsObstacle = (block, kind = 'hard') => {
        const obstacle = {
            pos: [
                block.x * invScale,
                block.y * invScale,
                block.z * invScale,
            ],
            size: [
                block.width * invScale,
                block.height * invScale,
                block.depth * invScale,
            ],
            kind,
        };
        if (block.tunnel && typeof block.tunnel === 'object') {
            obstacle.tunnel = {
                radius: asPositiveNumber(block.tunnel.radius, Math.min(block.width, block.height, block.depth) * 0.3, 0.1) * invScale,
                axis: block.tunnel.axis === 'x' || block.tunnel.axis === 'y' || block.tunnel.axis === 'z'
                    ? block.tunnel.axis
                    : 'z',
            };
        }
        obstacles.push(obstacle);
    };

    normalized.hardBlocks.forEach((block) => pushBlockAsObstacle(block, 'hard'));
    normalized.foamBlocks.forEach((block) => pushBlockAsObstacle(block, 'foam'));

    normalized.tunnels.forEach((tunnel, tunnelIndex) => {
        const start = [
            tunnel.ax * invScale,
            tunnel.ay * invScale,
            tunnel.az * invScale,
        ];
        const end = [
            tunnel.bx * invScale,
            tunnel.by * invScale,
            tunnel.bz * invScale,
        ];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const dz = end[2] - start[2];
        const lengthSq = dx * dx + dy * dy + dz * dz;
        if (lengthSq < 0.25) {
            warnings.push(`Tunnel ${tunnel.id || tunnelIndex + 1} was ignored because it is too short.`);
            return;
        }

        obstacles.push({
            shape: 'tube',
            kind: 'hard',
            start,
            end,
            radius: asPositiveNumber(tunnel.radius, 1, 0.1) * invScale,
        });
    });

    const defaultPlayerSpawn = {
        x: -800,
        y: normalized.arenaSize.height * 0.55,
        z: 0,
    };

    const portals = [];
    for (let i = 0; i < normalized.portals.length; i += 2) {
        const entryA = normalized.portals[i];
        const entryB = normalized.portals[i + 1];
        if (!entryA || !entryB) {
            warnings.push('Odd number of portal nodes found; the last portal node was ignored.');
            break;
        }

        const pairIndex = Math.floor(i / 2);
        portals.push({
            a: [entryA.x * invScale, entryA.y * invScale, entryA.z * invScale],
            b: [entryB.x * invScale, entryB.y * invScale, entryB.z * invScale],
            color: DEFAULT_PORTAL_COLORS[pairIndex % DEFAULT_PORTAL_COLORS.length],
        });
    }

    const items = normalized.items.map((entry) => ({
        id: entry.id,
        type: entry.type,
        pickupType: entry.pickupType,
        model: entry.model,
        weight: asPositiveNumber(entry.weight, 1, 0.01),
        x: entry.x * invScale,
        y: entry.y * invScale,
        z: entry.z * invScale,
        rotateY: Number(entry.rotateY) || 0,
    }));

    const aircraft = normalized.aircraft.map((entry) => ({
        id: entry.id,
        jetId: entry.jetId,
        x: entry.x * invScale,
        y: entry.y * invScale,
        z: entry.z * invScale,
        scale: asPositiveNumber(entry.scale, 1, 0.01) * invScale,
        rotateY: Number(entry.rotateY) || 0,
    }));

    const playerSpawn = normalized.playerSpawn
        ? {
            id: normalized.playerSpawn.id,
            x: normalized.playerSpawn.x * invScale,
            y: normalized.playerSpawn.y * invScale,
            z: normalized.playerSpawn.z * invScale,
        }
        : {
            x: defaultPlayerSpawn.x * invScale,
            y: defaultPlayerSpawn.y * invScale,
            z: defaultPlayerSpawn.z * invScale,
        };

    const botSpawns = normalized.botSpawns.map((entry) => ({
        id: entry.id,
        x: entry.x * invScale,
        y: entry.y * invScale,
        z: entry.z * invScale,
    }));

    const gates = normalized.gates.map((gate) => ({
        id: gate.id,
        type: gate.type,
        pos: [
            gate.pos[0] * invScale,
            gate.pos[1] * invScale,
            gate.pos[2] * invScale,
        ],
        radius: asPositiveNumber(gate.radius, gate.type === 'boost' ? 3.25 : 2.9, 0.1) * invScale,
        rot: Array.isArray(gate.rot) ? [...gate.rot] : undefined,
        forward: Array.isArray(gate.forward) ? [...gate.forward] : undefined,
        up: Array.isArray(gate.up) ? [...gate.up] : undefined,
        color: gate.color,
        params: gate.params ? { ...gate.params } : undefined,
    }));

    return {
        map: {
            name: String(options.name || 'Custom Map'),
            size: [
                normalized.arenaSize.width * invScale,
                normalized.arenaSize.height * invScale,
                normalized.arenaSize.depth * invScale,
            ],
            obstacles,
            portals,
            portalLevels: normalized.portalLevels.map((level) => level * invScale),
            preferAuthoredPortals: normalized.preferAuthoredPortals === true || normalized.portals.length > 0,
            gates,
            playerSpawn,
            botSpawns,
            items,
            aircraft,
            glbModel: typeof normalized.glbModel === 'string' ? normalized.glbModel : undefined,
            glbColliderMode: typeof normalized.glbColliderMode === 'string' ? normalized.glbColliderMode : undefined,
        },
        warnings,
        mapDocument: normalized,
    };
}
