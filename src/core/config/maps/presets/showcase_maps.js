// ============================================
// Showcase Maps (Feature-Demos mit Gates, Items, Aircraft)
// upgrade_showcase, showcase_nexus
// ============================================

import { TEST_HANGAR_GLB_DATA_URI } from '../EmbeddedGlbMapAssets.js';

export const SHOWCASE_MAPS = {
    upgrade_showcase: {
        name: 'Upgrade Showcase',
        size: [100, 40, 100],
        obstacles: [
            { pos: [0, 2, 0], size: [20, 4, 20], kind: 'foam' }
        ],
        gates: [
            // Ein Boost-Portal in der Mitte
            {
                type: 'boost',
                pos: [0, 12, -20],
                forward: [0, 0, -1],
                params: { duration: 1.5, forwardImpulse: 45, bonusSpeed: 60 }
            },
            // Ein Slingshot-Gate
            {
                type: 'slingshot',
                pos: [20, 15, 0],
                forward: [1, 0, 0],
                up: [0, 1, 0],
                params: { duration: 2.0, forwardImpulse: 30, liftImpulse: 8 }
            },
            // Ein weiteres Boost-Portal (Rückweg)
            {
                type: 'boost',
                pos: [0, 20, 20],
                forward: [0, 0, 1],
                params: { duration: 1.2, forwardImpulse: 40 }
            }
        ],
        portals: []
    },
    showcase_nexus: {
        name: 'Showcase Nexus',
        size: [130, 52, 130],
        glbModel: TEST_HANGAR_GLB_DATA_URI,
        glbLoadDelayMs: 180,
        glbColliderMode: 'fallbackOnly',
        preferAuthoredPortals: true,
        portalLevels: [12, 26, 40],
        obstacles: [
            { pos: [0, 4, 0], size: [24, 8, 24], kind: 'foam' },
            { pos: [-36, 10, 0], size: [6, 20, 44] },
            { pos: [36, 10, 0], size: [6, 20, 44], kind: 'foam' },
            { pos: [0, 12, -34], size: [40, 18, 6], tunnel: { radius: 4.8, axis: 'x' } },
            { pos: [0, 28, 30], size: [36, 10, 6], kind: 'foam', tunnel: { radius: 3.9, axis: 'x' } },
            { pos: [-20, 24, 34], size: [8, 18, 18] },
            { pos: [22, 20, 34], size: [10, 14, 20], kind: 'foam' },
            { shape: 'tube', kind: 'hard', start: [-44, 18, -26], end: [44, 18, -26], radius: 4.2 },
            { shape: 'tube', kind: 'hard', start: [0, 10, 44], end: [0, 34, 44], radius: 3.6 },
        ],
        portals: [
            { a: [-52, 12, -52], b: [52, 26, 52], color: 0x00ffcc },
            { a: [52, 12, -48], b: [-52, 40, 48], color: 0xff88cc },
        ],
        gates: [
            {
                type: 'boost',
                pos: [0, 12, -50],
                forward: [0, 0, -1],
                params: { duration: 1.4, forwardImpulse: 46, bonusSpeed: 62 }
            },
            {
                type: 'slingshot',
                pos: [-48, 26, 0],
                forward: [1, 0, 0],
                up: [0, 1, 0],
                params: { duration: 1.8, forwardImpulse: 34, liftImpulse: 10 }
            },
            {
                type: 'boost',
                pos: [48, 40, 0],
                forward: [-1, 0, 0],
                params: { duration: 1.2, forwardImpulse: 42, bonusSpeed: 54 }
            }
        ],
        playerSpawn: { x: -54, y: 12, z: 18 },
        botSpawns: [
            { x: 54, y: 12, z: 18 },
            { x: 54, y: 26, z: -20 },
            { x: -54, y: 40, z: -18 },
            { x: 0, y: 12, z: 56 },
        ],
        items: [
            { id: 'showcase_speed_lane', type: 'item_battery', pickupType: 'SPEED_UP', x: 0, y: 12, z: -12, weight: 2 },
            { id: 'showcase_rocket_cross', type: 'item_rocket', pickupType: 'ROCKET_WEAK', x: 20, y: 26, z: 18, weight: 1 },
            { id: 'showcase_shield_upper', type: 'item_shield', pickupType: 'SHIELD', x: -20, y: 40, z: 22, weight: 1.5 },
            { id: 'showcase_random_lane', type: 'item_coin', x: 40, y: 12, z: -28, weight: 0.8 },
        ],
        aircraft: [
            { id: 'showcase_air_1', jetId: 'ship3', x: -28, y: 34, z: -46, scale: 1.2, rotateY: 0.6 },
            { id: 'showcase_air_2', jetId: 'ship6', x: 34, y: 20, z: 12, scale: 1.05, rotateY: -1.15 },
            { id: 'showcase_air_3', jetId: 'aircraft', x: 0, y: 46, z: 48, scale: 1.35, rotateY: 3.14159 },
        ],
    },
};
