// ============================================
// Arena-Style Maps (einfache bis mittlere Komplexität)
// maze, complex, pyramid, vertical_maze, trench
// ============================================

export const ARENA_MAPS = {
    maze: {
        name: 'Labyrinth',
        size: [80, 25, 80],
        obstacles: [
            { pos: [-20, 5, -20], size: [20, 10, 2] },
            { pos: [20, 5, -20], size: [20, 10, 2] },
            { pos: [0, 5, 0], size: [30, 10, 2] },
            { pos: [-20, 5, 20], size: [20, 10, 2] },
            { pos: [20, 5, 20], size: [20, 10, 2] },
            { pos: [-20, 5, 0], size: [2, 10, 20] },
            { pos: [20, 5, 0], size: [2, 10, 20] },
            { pos: [0, 5, -20], size: [2, 10, 15] },
            { pos: [0, 5, 20], size: [2, 10, 15] },
        ],
        portals: [
            { a: [-30, 10, -30], b: [30, 10, 30], color: 0xff66ff },
            { a: [30, 10, -30], b: [-30, 10, 30], color: 0x66ccff },
        ]
    },
    complex: {
        name: 'Komplex',
        size: [90, 30, 90],
        obstacles: [
            { pos: [0, 5, 0], size: [6, 12, 6] },
            { pos: [-25, 5, -25], size: [10, 8, 2] },
            { pos: [25, 5, -25], size: [2, 8, 10] },
            { pos: [-25, 5, 25], size: [2, 8, 10] },
            { pos: [25, 5, 25], size: [10, 8, 2] },
            { pos: [-15, 5, 0], size: [2, 15, 15] },
            { pos: [15, 5, 0], size: [2, 15, 15] },
            { pos: [0, 5, -15], size: [15, 15, 2] },
            { pos: [0, 5, 15], size: [15, 15, 2] },
            { pos: [-30, 3, 0], size: [5, 6, 5] },
            { pos: [30, 3, 0], size: [5, 6, 5] },
        ],
        portals: [
            { a: [-35, 12, -35], b: [35, 12, 35], color: 0xffaa00 },
            { a: [35, 12, -35], b: [-35, 12, 35], color: 0x00aaff },
        ]
    },
    pyramid: {
        name: 'Pyramide',
        size: [80, 35, 80],
        obstacles: [
            { pos: [0, 2, 0], size: [20, 4, 20] },
            { pos: [0, 6, 0], size: [15, 4, 15] },
            { pos: [0, 10, 0], size: [10, 4, 10] },
            { pos: [0, 14, 0], size: [5, 4, 5] },
            { pos: [-30, 5, -30], size: [3, 10, 3] },
            { pos: [30, 5, -30], size: [3, 10, 3] },
            { pos: [-30, 5, 30], size: [3, 10, 3] },
            { pos: [30, 5, 30], size: [3, 10, 3] },
        ],
        portals: [
            { a: [0, 25, -30], b: [0, 25, 30], color: 0xff44ff },
        ]
    },
    vertical_maze: {
        name: 'Vertikales Labyrinth',
        size: [100, 45, 100],
        obstacles: [
            // Pfeiler vom Boden
            { pos: [30, 15, 30], size: [8, 30, 8] },
            { pos: [-30, 15, -30], size: [8, 30, 8] },
            { pos: [-30, 15, 30], size: [8, 30, 8] },
            { pos: [30, 15, -30], size: [8, 30, 8] },
            // Zentraler Block
            { pos: [0, 35, 0], size: [24, 20, 24] },
            // Wechselnde vertikale Wände
            { pos: [-40, 35, 0], size: [4, 20, 60] }, // Decke Links
            { pos: [40, 10, 0], size: [4, 20, 60] },  // Boden Rechts
            { pos: [0, 35, 40], size: [60, 20, 4] },  // Decke Vorne
            { pos: [0, 10, -40], size: [60, 20, 4] }   // Boden Hinten
        ],
        portals: [
            { a: [-40, 10, -40], b: [40, 35, 40], color: 0x00ffcc },
            { a: [40, 10, -40], b: [-40, 35, 40], color: 0xff00ff }
        ]
    },
    trench: {
        name: 'Der Graben',
        size: [60, 40, 160],
        obstacles: [
            // Hohe Seitenwände für Graben-Gefühl
            { pos: [-25, 20, 0], size: [4, 40, 160] },
            { pos: [25, 20, 0], size: [4, 40, 160] },
            // Hindernisse im Graben
            { pos: [0, 10, -40], size: [20, 4, 4] },
            { pos: [0, 30, 0], size: [20, 4, 4] },
            { pos: [0, 10, 40], size: [20, 4, 4] },
        ],
        portals: []
    },
};
