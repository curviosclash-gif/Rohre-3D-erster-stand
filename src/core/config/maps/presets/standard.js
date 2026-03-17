import { TEST_HANGAR_GLB_DATA_URI } from '../EmbeddedGlbMapAssets.js';

export const STANDARD_MAPS = {
    standard: {
        name: 'Standard Arena',
        size: [80, 30, 80],
        obstacles: [
            { pos: [0, 5, 0], size: [4, 10, 4] },
            { pos: [20, 5, 20], size: [3, 10, 3] },
            { pos: [-20, 5, -20], size: [3, 10, 3] },
            { pos: [20, 5, -20], size: [3, 10, 3] },
            { pos: [-20, 5, 20], size: [3, 10, 3] },
        ],
        portals: [
            { a: [-30, 12, 0], b: [30, 12, 0], color: 0x00ffcc },
        ]
    },
    custom: {
        name: 'Custom (Editor gespeichert)',
        size: [80, 30, 80],
        obstacles: [],
        portals: [],
    },
    empty: {
        name: 'Leer',
        size: [50, 25, 50],
        obstacles: [],
        portals: []
    },
    glb_hangar: {
        name: 'GLB Test Hangar',
        size: [60, 25, 60],
        glbModel: TEST_HANGAR_GLB_DATA_URI,
        glbLoadDelayMs: 140,
        obstacles: [
            { pos: [-6, 4, 0], size: [2, 8, 10] },
            { pos: [6, 4, 0], size: [2, 8, 10], kind: 'foam' },
        ],
        portals: []
    },
};
