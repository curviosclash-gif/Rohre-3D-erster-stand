// ============================================
// Themed Maps (thematische Arenen)
// foam_forest, crossfire, checkerboard, the_pit,
// core_fusion, pillar_hall, spiral_tower, portal_madness, the_loop
// ============================================

export const THEMED_MAPS = {
    foam_forest: {
        name: 'Schaumwald',
        size: [100, 30, 100],
        obstacles: [
            { pos: [15, 15, 15], size: [3, 30, 3], kind: 'foam' },
            { pos: [-15, 15, 15], size: [3, 30, 3], kind: 'foam' },
            { pos: [15, 15, -15], size: [3, 30, 3], kind: 'foam' },
            { pos: [-15, 15, -15], size: [3, 30, 3], kind: 'foam' },
            { pos: [30, 15, 0], size: [3, 30, 3], kind: 'foam' },
            { pos: [-30, 15, 0], size: [3, 30, 3], kind: 'foam' },
            { pos: [0, 15, 30], size: [3, 30, 3], kind: 'foam' },
            { pos: [0, 15, -30], size: [3, 30, 3], kind: 'foam' },
            { pos: [0, 8, 0], size: [10, 16, 10], kind: 'foam' }
        ],
        portals: []
    },
    crossfire: {
        name: 'Kreuzfeuer',
        size: [120, 40, 120],
        obstacles: [
            { pos: [0, 20, 0], size: [120, 20, 4] }, // Zentrales Kreuz Z
            { pos: [0, 20, 0], size: [4, 20, 120] }, // Zentrales Kreuz X
        ],
        portals: [
            { a: [-50, 20, -50], b: [50, 20, 50], color: 0xffff00 },
            { a: [50, 20, -50], b: [-50, 20, 50], color: 0x00ffff }
        ]
    },
    checkerboard: {
        name: 'Schachbrett',
        size: [100, 40, 100],
        obstacles: [
            // Boden-Hindernisse
            { pos: [-25, 10, -25], size: [15, 20, 15] },
            { pos: [25, 10, 25], size: [15, 20, 15] },
            // Decken-Hindernisse
            { pos: [25, 30, -25], size: [15, 20, 15] },
            { pos: [-25, 30, 25], size: [15, 20, 15] }
        ],
        portals: []
    },
    the_pit: {
        name: 'Die Arena',
        size: [120, 30, 120],
        obstacles: [
            { pos: [0, 4, 0], size: [40, 8, 40], kind: 'foam' } // Zentrales Bouncing Pad
        ],
        portals: [
            { a: [-55, 15, 0], b: [55, 15, 0], color: 0xff0000 },
            { a: [0, 15, -55], b: [0, 15, 55], color: 0x0000ff }
        ]
    },
    core_fusion: {
        name: 'Kern-Fusion',
        size: [100, 40, 100],
        obstacles: [
            { pos: [0, 20, 0], size: [50, 20, 50], kind: 'foam' } // Riesiger Schaumkern
        ],
        portals: [
            { a: [-45, 10, -45], b: [45, 30, 45], color: 0x00ff00 },
            { a: [45, 10, -45], b: [-45, 30, 45], color: 0xff8800 }
        ]
    },
    pillar_hall: {
        name: 'Saeulen-Halle',
        size: [100, 30, 100],
        obstacles: [
            { pos: [-30, 15, -30], size: [4, 30, 4] }, { pos: [-30, 15, 0], size: [4, 30, 4] }, { pos: [-30, 15, 30], size: [4, 30, 4] },
            { pos: [0, 15, -30], size: [4, 30, 4] }, { pos: [0, 15, 0], size: [4, 30, 4] }, { pos: [0, 15, 30], size: [4, 30, 4] },
            { pos: [30, 15, -30], size: [4, 30, 4] }, { pos: [30, 15, 0], size: [4, 30, 4] }, { pos: [30, 15, 30], size: [4, 30, 4] }
        ],
        portals: []
    },
    spiral_tower: {
        name: 'Spiralen-Turm',
        size: [80, 70, 80],
        obstacles: [
            { pos: [0, 10, 20], size: [20, 4, 10] },
            { pos: [20, 25, 0], size: [10, 4, 20] },
            { pos: [0, 40, -20], size: [20, 4, 10] },
            { pos: [-20, 55, 0], size: [10, 4, 20] }
        ],
        portals: [
            { a: [0, 5, 0], b: [0, 65, 0], color: 0xffffff } // Vertikaler Lift
        ]
    },
    portal_madness: {
        name: 'Portal-Wahnsinn',
        size: [100, 40, 100],
        obstacles: [
            { pos: [0, 20, 0], size: [10, 10, 10] }
        ],
        portals: [
            { a: [-40, 10, 0], b: [40, 10, 0], color: 0xff0000 },
            { a: [0, 10, -40], b: [0, 10, 40], color: 0x00ff00 },
            { a: [-40, 30, 0], b: [40, 30, 0], color: 0x0000ff },
            { a: [0, 30, -40], b: [0, 30, 40], color: 0xffff00 },
            { a: [-30, 20, -30], b: [30, 20, 30], color: 0xff00ff },
            { a: [30, 20, -30], b: [-30, 20, 30], color: 0x00ffff }
        ]
    },
    the_loop: {
        name: 'Die Schleife',
        size: [120, 30, 120],
        obstacles: [
            // Innerer Block
            { pos: [0, 15, 0], size: [60, 30, 60] },
            // Äußere Ring-Elemente
            { pos: [0, 25, 55], size: [120, 10, 4] },
            { pos: [0, 25, -55], size: [120, 10, 4] },
            { pos: [55, 25, 0], size: [4, 10, 120] },
            { pos: [-55, 25, 0], size: [4, 10, 120] }
        ],
        portals: []
    },
};
