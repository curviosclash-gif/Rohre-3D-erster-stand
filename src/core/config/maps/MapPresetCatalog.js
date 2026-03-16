// ============================================
// MapPresets.js - Ausgelagerte Map-Presets
// ============================================

import { TEST_HANGAR_GLB_DATA_URI } from './EmbeddedGlbMapAssets.js';

export const MAP_PRESET_CATALOG = {
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
    mega_maze: {
        name: 'Mega-Labyrinth',
        size: [100, 35, 100],
        obstacles: [
            // ========================================================
            // 5x5 Grid-Labyrinth mit alternierenden Boden/Decken-Wänden
            // Bodenwand: pos Y=12, H=24 ? Y 0-24, Lücke oben (24-35)
            // Deckenwand: pos Y=23, H=24 ? Y 11-35, Lücke unten (0-11)
            // Zellen: A(-40) B(-20) C(0) D(20) E(40)
            // Wandlinien: -30, -10, 10, 30
            // ========================================================

            // --- Horizontale Wände (E-W laufend, dünn in Z) ---

            // Z=-30 (Reihe 1?2)
            { pos: [-40, 12, -30], size: [20, 24, 3], tunnel: { radius: 4.0, axis: 'z' } },     // ? Boden: A1?A2 blockiert
            { pos: [0, 23, -30], size: [20, 24, 3], tunnel: { radius: 3.8, axis: 'z' } },       // ? Decke: C1?C2 blockiert
            { pos: [40, 12, -30], size: [20, 24, 3] },      // ? Boden: E1?E2 blockiert

            // Z=-10 (Reihe 2?3)
            { pos: [-20, 23, -10], size: [20, 24, 3] },     // ? Decke: B2?B3 blockiert
            { pos: [20, 12, -10], size: [20, 24, 3], tunnel: { radius: 4.2, axis: 'z' } },      // ? Boden: D2?D3 blockiert

            // Z=10 (Reihe 3?4)
            { pos: [-40, 12, 10], size: [20, 24, 3] },      // ? Boden: A3?A4 blockiert
            { pos: [0, 23, 10], size: [20, 24, 3], tunnel: { radius: 3.6, axis: 'z' } },        // ? Decke: C3?C4 blockiert
            { pos: [20, 12, 10], size: [20, 24, 3] },       // ? Boden: D3?D4 blockiert

            // Z=30 (Reihe 4?5)
            { pos: [-20, 23, 30], size: [20, 24, 3], tunnel: { radius: 4.0, axis: 'z' } },      // ? Decke: B4?B5 blockiert
            { pos: [0, 12, 30], size: [20, 24, 3] },        // ? Boden: C4?C5 blockiert

            // --- Vertikale Wände (N-S laufend, dünn in X) ---

            // X=-30 (Spalte A?B)
            { pos: [-30, 23, -40], size: [3, 24, 20] },     // ? Decke: A1?B1 blockiert
            { pos: [-30, 12, 0], size: [3, 24, 20], tunnel: { radius: 4.2, axis: 'x' } },       // ? Boden: A3?B3 blockiert
            { pos: [-30, 23, 20], size: [3, 24, 20] },      // ? Decke: A4?B4 blockiert

            // X=-10 (Spalte B?C)
            { pos: [-10, 12, -20], size: [3, 24, 20] },     // ? Boden: B2?C2 blockiert
            { pos: [-10, 23, 20], size: [3, 24, 20], tunnel: { radius: 3.8, axis: 'x' } },      // ? Decke: B4?C4 blockiert
            { pos: [-10, 12, 40], size: [3, 24, 20] },      // ? Boden: B5?C5 blockiert

            // X=10 (Spalte C?D)
            { pos: [10, 23, -40], size: [3, 24, 20] },      // ? Decke: C1?D1 blockiert
            { pos: [10, 12, 0], size: [3, 24, 20] },        // ? Boden: C3?D3 blockiert

            // X=30 (Spalte D?E)
            { pos: [30, 12, -20], size: [3, 24, 20] },      // ? Boden: D2?E2 blockiert
            { pos: [30, 23, 0], size: [3, 24, 20], tunnel: { radius: 4.0, axis: 'x' } },        // ? Decke: D3?E3 blockiert
            { pos: [30, 12, 30], size: [3, 24, 20] },       // ? Boden: D5?E5 blockiert (Sackgasse)

            // --- Orientierungs-Pfeiler (Boden?Decke durchgehend) ---
            { pos: [-45, 17.5, -45], size: [3, 35, 3] },    // Ecke NW
            { pos: [45, 17.5, -45], size: [3, 35, 3] },     // Ecke NO
            { pos: [-45, 17.5, 45], size: [3, 35, 3] },     // Ecke SW
            { pos: [45, 17.5, 45], size: [3, 35, 3] },      // Ecke SO
        ],
        portals: [
            { a: [-40, 5, -40], b: [40, 30, 40], color: 0x00ffcc },    // NW unten ? SO oben
            { a: [40, 5, -40], b: [-40, 30, 40], color: 0xff66ff },    // NO unten ? SW oben
            { a: [-40, 30, 0], b: [40, 5, 0], color: 0xffaa00 },      // W oben ? O unten
            { a: [0, 5, -40], b: [0, 30, 40], color: 0x44ff88 },      // N unten ? S oben
        ]
    },
    die_festung: {
        name: 'Die Festung',
        size: [300, 80, 300],
        obstacles: [
            // ================================================================
            // ZONE 1: ZENTRALER TURM & SPIRALPLATTFORMEN
            // Mächtiger Turm mit vertikalem Tunnel, umgeben von
            // spiralförmig aufsteigenden Plattformen
            // ================================================================

            // Zentraler Mega-Turm (Boden bis Decke, vertikaler Durchflug)
            { pos: [0, 40, 0], size: [16, 80, 16], tunnel: { radius: 5.5, axis: 'y' } },

            // Spiralförmig aufsteigende Plattformen um den Turm
            { pos: [22, 10, 0], size: [14, 3, 10] },        // Ost, Ebene 1
            { pos: [0, 18, 22], size: [10, 3, 14] },        // Süd, Ebene 2
            { pos: [-22, 26, 0], size: [14, 3, 10] },       // West, Ebene 3
            { pos: [0, 34, -22], size: [10, 3, 14] },       // Nord, Ebene 4
            { pos: [22, 42, 0], size: [14, 3, 10] },        // Ost, Ebene 5
            { pos: [0, 50, 22], size: [10, 3, 14] },        // Süd, Ebene 6
            { pos: [-22, 58, 0], size: [14, 3, 10] },       // West, Ebene 7
            { pos: [0, 66, -22], size: [10, 3, 14] },       // Nord, Ebene 8

            // Zentrale Schaum-Arena (Bouncing Pad am Boden)
            { pos: [0, 4, 0], size: [36, 8, 36], kind: 'foam' },

            // ================================================================
            // ZONE 2: INNERE FESTUNGSMAUERN & TÜRME
            // 4 massive Ecktürme verbunden durch Mauern mit Tunneln,
            // darüber Wehrgänge, im Innenhof Schaum-Sprungfelder
            // ================================================================

            // 4 Festungstürme (Ecken des inneren Quadrats, durchgehend)
            { pos: [60, 40, -60], size: [12, 80, 12] },     // Nordost-Turm
            { pos: [-60, 40, -60], size: [12, 80, 12] },    // Nordwest-Turm
            { pos: [60, 40, 60], size: [12, 80, 12] },      // Südost-Turm
            { pos: [-60, 40, 60], size: [12, 80, 12] },     // Südwest-Turm

            // Festungsmauern mit Durchflug-Tunneln (verbinden die Türme)
            { pos: [0, 22, -60], size: [108, 44, 5], tunnel: { radius: 7.0, axis: 'z' } },   // Nordmauer
            { pos: [0, 22, 60], size: [108, 44, 5], tunnel: { radius: 7.0, axis: 'z' } },    // Südmauer
            { pos: [60, 22, 0], size: [5, 44, 108], tunnel: { radius: 7.0, axis: 'x' } },    // Ostmauer
            { pos: [-60, 22, 0], size: [5, 44, 108], tunnel: { radius: 7.0, axis: 'x' } },   // Westmauer

            // Wehrgänge auf den Mauern (begehbare Plattformen oben)
            { pos: [30, 48, -60], size: [44, 3, 14] },      // Nord-Wehrgang Ost
            { pos: [-30, 48, -60], size: [44, 3, 14] },     // Nord-Wehrgang West
            { pos: [30, 48, 60], size: [44, 3, 14] },       // Süd-Wehrgang Ost
            { pos: [-30, 48, 60], size: [44, 3, 14] },      // Süd-Wehrgang West
            { pos: [60, 48, 30], size: [14, 3, 44] },       // Ost-Wehrgang Süd
            { pos: [60, 48, -30], size: [14, 3, 44] },      // Ost-Wehrgang Nord
            { pos: [-60, 48, 30], size: [14, 3, 44] },      // West-Wehrgang Süd
            { pos: [-60, 48, -30], size: [14, 3, 44] },     // West-Wehrgang Nord

            // Schaum-Sprungfelder im Innenhof (katapultieren nach oben)
            { pos: [38, 4, 0], size: [10, 8, 10], kind: 'foam' },    // Ost
            { pos: [-38, 4, 0], size: [10, 8, 10], kind: 'foam' },   // West
            { pos: [0, 4, 38], size: [10, 8, 10], kind: 'foam' },    // Süd
            { pos: [0, 4, -38], size: [10, 8, 10], kind: 'foam' },   // Nord

            // Diagonale Hindernisse im Innenhof (Deckung zwischen Türmen)
            { pos: [38, 25, -38], size: [6, 20, 6] },       // NO Deckung
            { pos: [-38, 25, -38], size: [6, 20, 6] },      // NW Deckung
            { pos: [38, 25, 38], size: [6, 20, 6] },        // SO Deckung
            { pos: [-38, 25, 38], size: [6, 20, 6] },       // SW Deckung

            // ================================================================
            // ZONE 3: DAS LABYRINTH (Radius ~70-110)
            // Komplexes 3D-Labyrinth mit alternierenden Boden/Decken-Wänden
            // Bodenwand: Y=15, H=30 → überdeckt Y 0-30, Lücke Y 30-80
            // Deckenwand: Y=65, H=30 → überdeckt Y 50-80, Lücke Y 0-50
            // ================================================================

            // --- Horizontale Labyrinthwände (E-W laufend, dünn in Z) ---

            // Z = -100
            { pos: [-105, 15, -100], size: [50, 30, 3], tunnel: { radius: 4.5, axis: 'z' } },  // Boden
            { pos: [0, 65, -100], size: [40, 30, 3] },                                          // Decke
            { pos: [95, 15, -100], size: [50, 30, 3], tunnel: { radius: 5.0, axis: 'z' } },     // Boden

            // Z = -85
            { pos: [-80, 65, -85], size: [50, 30, 3], tunnel: { radius: 4.2, axis: 'z' } },    // Decke
            { pos: [40, 15, -85], size: [40, 30, 3] },                                          // Boden
            { pos: [105, 65, -85], size: [30, 30, 3] },                                         // Decke

            // Z = 85
            { pos: [-105, 15, 85], size: [40, 30, 3] },                                         // Boden
            { pos: [-20, 65, 85], size: [60, 30, 3], tunnel: { radius: 4.8, axis: 'z' } },      // Decke
            { pos: [80, 15, 85], size: [50, 30, 3], tunnel: { radius: 4.4, axis: 'z' } },       // Boden

            // Z = 100
            { pos: [-80, 65, 100], size: [40, 30, 3] },                                         // Decke
            { pos: [30, 15, 100], size: [50, 30, 3], tunnel: { radius: 4.6, axis: 'z' } },      // Boden
            { pos: [105, 65, 100], size: [30, 30, 3] },                                         // Decke

            // --- Vertikale Labyrinthwände (N-S laufend, dünn in X) ---

            // X = -100
            { pos: [-100, 65, -90], size: [3, 30, 40] },                                        // Decke
            { pos: [-100, 15, 0], size: [3, 30, 60], tunnel: { radius: 5.0, axis: 'x' } },      // Boden
            { pos: [-100, 65, 80], size: [3, 30, 40] },                                         // Decke

            // X = -85
            { pos: [-85, 15, -80], size: [3, 30, 40] },                                         // Boden
            { pos: [-85, 65, 20], size: [3, 30, 50], tunnel: { radius: 4.5, axis: 'x' } },      // Decke
            { pos: [-85, 15, 100], size: [3, 30, 30] },                                         // Boden

            // X = 85
            { pos: [85, 65, -100], size: [3, 30, 40], tunnel: { radius: 4.3, axis: 'x' } },    // Decke
            { pos: [85, 15, -20], size: [3, 30, 50] },                                          // Boden
            { pos: [85, 65, 70], size: [3, 30, 40] },                                           // Decke

            // X = 100
            { pos: [100, 15, -80], size: [3, 30, 50], tunnel: { radius: 4.8, axis: 'x' } },    // Boden
            { pos: [100, 65, 10], size: [3, 30, 40] },                                          // Decke
            { pos: [100, 15, 90], size: [3, 30, 30] },                                          // Boden

            // Labyrinth-Blockaden (große Landmark-Blöcke zur Orientierung)
            { pos: [-90, 15, -50], size: [18, 30, 18] },    // Bodenblock Nordwest
            { pos: [90, 65, -50], size: [18, 30, 18] },     // Deckenblock Nordost
            { pos: [-90, 65, 50], size: [18, 30, 18] },     // Deckenblock Südwest
            { pos: [90, 15, 50], size: [18, 30, 18] },      // Bodenblock Südost

            // Schaum-Säulen im Labyrinth (Orientierung + Bouncing)
            { pos: [-75, 15, -75], size: [5, 30, 5], kind: 'foam' },
            { pos: [75, 15, -75], size: [5, 30, 5], kind: 'foam' },
            { pos: [-75, 15, 75], size: [5, 30, 5], kind: 'foam' },
            { pos: [75, 15, 75], size: [5, 30, 5], kind: 'foam' },

            // ================================================================
            // ZONE 4: ÄUßERE FESTUNG & GRÄBEN
            // 8 Wachtürme, massive Außenmauern mit Tunneln,
            // Schaum-Barrikaden als Verteidigungslinien
            // ================================================================

            // 8 Wachtürme am äußeren Ring (Boden bis Decke)
            { pos: [0, 40, -135], size: [8, 80, 8] },       // Nord
            { pos: [0, 40, 135], size: [8, 80, 8] },        // Süd
            { pos: [135, 40, 0], size: [8, 80, 8] },        // Ost
            { pos: [-135, 40, 0], size: [8, 80, 8] },       // West
            { pos: [100, 40, -100], size: [8, 80, 8] },     // Nordost
            { pos: [-100, 40, -100], size: [8, 80, 8] },    // Nordwest
            { pos: [100, 40, 100], size: [8, 80, 8] },      // Südost
            { pos: [-100, 40, 100], size: [8, 80, 8] },     // Südwest

            // Äußere Befestigungsmauern mit Tunneln (je 2 Segmente pro Seite)
            { pos: [-65, 30, -125], size: [62, 60, 4], tunnel: { radius: 6.0, axis: 'z' } },    // Nord-West
            { pos: [65, 30, -125], size: [62, 60, 4], tunnel: { radius: 6.0, axis: 'z' } },     // Nord-Ost
            { pos: [-65, 30, 125], size: [62, 60, 4], tunnel: { radius: 6.0, axis: 'z' } },     // Süd-West
            { pos: [65, 30, 125], size: [62, 60, 4], tunnel: { radius: 6.0, axis: 'z' } },      // Süd-Ost
            { pos: [125, 30, -65], size: [4, 60, 62], tunnel: { radius: 6.0, axis: 'x' } },     // Ost-Nord
            { pos: [125, 30, 65], size: [4, 60, 62], tunnel: { radius: 6.0, axis: 'x' } },      // Ost-Süd
            { pos: [-125, 30, -65], size: [4, 60, 62], tunnel: { radius: 6.0, axis: 'x' } },    // West-Nord
            { pos: [-125, 30, 65], size: [4, 60, 62], tunnel: { radius: 6.0, axis: 'x' } },     // West-Süd

            // Schaum-Barrikaden vor den Außenmauern (Verteidigung)
            { pos: [-65, 8, -140], size: [20, 16, 6], kind: 'foam' },   // Nord-West
            { pos: [65, 8, -140], size: [20, 16, 6], kind: 'foam' },    // Nord-Ost
            { pos: [-65, 8, 140], size: [20, 16, 6], kind: 'foam' },    // Süd-West
            { pos: [65, 8, 140], size: [20, 16, 6], kind: 'foam' },     // Süd-Ost
            { pos: [140, 8, -65], size: [6, 16, 20], kind: 'foam' },    // Ost-Nord
            { pos: [140, 8, 65], size: [6, 16, 20], kind: 'foam' },     // Ost-Süd
            { pos: [-140, 8, -65], size: [6, 16, 20], kind: 'foam' },   // West-Nord
            { pos: [-140, 8, 65], size: [6, 16, 20], kind: 'foam' },    // West-Süd

            // Orientierungspfeiler an den äußersten Ecken (Boden bis Decke)
            { pos: [-140, 40, -140], size: [4, 80, 4] },    // Ecke NW
            { pos: [140, 40, -140], size: [4, 80, 4] },     // Ecke NO
            { pos: [-140, 40, 140], size: [4, 80, 4] },     // Ecke SW
            { pos: [140, 40, 140], size: [4, 80, 4] },      // Ecke SO
        ],
        portals: [
            // Fernreise: Diagonal durch die gesamte Festung
            { a: [-130, 10, -130], b: [130, 70, 130], color: 0x00ffcc },    // NW unten → SO oben
            { a: [130, 10, -130], b: [-130, 70, 130], color: 0xff66ff },    // NO unten → SW oben

            // Festungsinnen ↔ Festungsaußen (Mauerüberwindung)
            { a: [-55, 10, 0], b: [-130, 40, 0], color: 0xffaa00 },        // Innenmauer W → Außen W
            { a: [55, 10, 0], b: [130, 40, 0], color: 0x44ffaa },          // Innenmauer O → Außen O

            // Vertikale Schnellwege (Boden ↔ Decke)
            { a: [0, 5, -55], b: [0, 75, 55], color: 0xff4444 },           // Boden Nord → Decke Süd
            { a: [0, 5, 55], b: [0, 75, -55], color: 0x4488ff },           // Boden Süd → Decke Nord

            // Labyrinth-Shortcuts (Abkürzungen durch das Labyrinth)
            { a: [-90, 10, -90], b: [90, 40, 90], color: 0xffff44 },       // Lab NW → Lab SO
            { a: [90, 10, -90], b: [-90, 40, 90], color: 0x44ffff },       // Lab NO → Lab SW
        ],
        gates: [
            // 4 Boost-Tore im Labyrinth (Hochgeschwindigkeits-Korridore)
            {
                type: 'boost',
                pos: [0, 40, -90],
                forward: [0, 0, -1],
                params: { duration: 2.0, forwardImpulse: 60, bonusSpeed: 80 }
            },
            {
                type: 'boost',
                pos: [0, 40, 90],
                forward: [0, 0, 1],
                params: { duration: 2.0, forwardImpulse: 60, bonusSpeed: 80 }
            },
            {
                type: 'boost',
                pos: [90, 40, 0],
                forward: [1, 0, 0],
                params: { duration: 2.0, forwardImpulse: 60, bonusSpeed: 80 }
            },
            {
                type: 'boost',
                pos: [-90, 40, 0],
                forward: [-1, 0, 0],
                params: { duration: 2.0, forwardImpulse: 60, bonusSpeed: 80 }
            },
            // 2 Slingshot-Tore auf den Mauern (vertikaler Katapult-Start)
            {
                type: 'slingshot',
                pos: [0, 52, -60],
                forward: [0, 0, -1],
                up: [0, 1, 0],
                params: { duration: 2.5, forwardImpulse: 30, liftImpulse: 15 }
            },
            {
                type: 'slingshot',
                pos: [0, 52, 60],
                forward: [0, 0, 1],
                up: [0, 1, 0],
                params: { duration: 2.5, forwardImpulse: 30, liftImpulse: 15 }
            },
        ]
    },
    mega_maze_xl: {
        name: 'Mega-Labyrinth XL',
        size: [200, 45, 200],
        obstacles: [
            // 10x10 Grid, 20er Zellen, Boden(?Y=11,H=22)/Decke(?Y=34,H=22)
            // Zellzentren: -90,-70,-50,-30,-10,10,30,50,70,90
            // Wandlinien: -80,-60,-40,-20,0,20,40,60,80

            // ===== Horizontale Wände (E-W, dünn in Z) =====
            // Z=-80
            { pos: [-60, 11, -80], size: [60, 22, 3], tunnel: { radius: 4.5, axis: 'z' } },     // ? Boden
            { pos: [20, 34, -80], size: [60, 22, 3], tunnel: { radius: 4.2, axis: 'z' } },      // ? Decke
            { pos: [80, 11, -80], size: [20, 22, 3] },      // ? Boden
            // Z=-60
            { pos: [-60, 34, -60], size: [20, 22, 3] },     // ? Decke
            { pos: [0, 11, -60], size: [20, 22, 3], tunnel: { radius: 3.8, axis: 'z' } },       // ? Boden
            { pos: [70, 34, -60], size: [40, 22, 3] },      // ? Decke
            // Z=-40
            { pos: [-80, 11, -40], size: [20, 22, 3] },     // ? Boden
            { pos: [-10, 34, -40], size: [40, 22, 3], tunnel: { radius: 4.4, axis: 'z' } },     // ? Decke
            { pos: [50, 11, -40], size: [40, 22, 3] },      // ? Boden
            // Z=-20
            { pos: [-30, 34, -20], size: [40, 22, 3] },     // ? Decke
            { pos: [20, 11, -20], size: [20, 22, 3] },      // ? Boden
            { pos: [80, 34, -20], size: [20, 22, 3] },      // ? Decke
            // Z=0
            { pos: [-80, 11, 0], size: [20, 22, 3] },       // ? Boden
            { pos: [-20, 34, 0], size: [20, 22, 3] },       // ? Decke
            { pos: [50, 11, 0], size: [40, 22, 3], tunnel: { radius: 4.6, axis: 'z' } },        // ? Boden
            // Z=20
            { pos: [-50, 34, 20], size: [40, 22, 3] },      // ? Decke
            { pos: [30, 11, 20], size: [40, 22, 3], tunnel: { radius: 4.2, axis: 'z' } },       // ? Boden
            { pos: [80, 34, 20], size: [20, 22, 3] },       // ? Decke
            // Z=40
            { pos: [-70, 11, 40], size: [40, 22, 3] },      // ? Boden
            { pos: [10, 34, 40], size: [40, 22, 3], tunnel: { radius: 4.0, axis: 'z' } },       // ? Decke
            { pos: [60, 11, 40], size: [20, 22, 3] },       // ? Boden
            // Z=60
            { pos: [-40, 34, 60], size: [20, 22, 3] },      // ? Decke
            { pos: [0, 11, 60], size: [20, 22, 3] },        // ? Boden
            { pos: [70, 34, 60], size: [40, 22, 3], tunnel: { radius: 4.8, axis: 'z' } },       // ? Decke
            // Z=80
            { pos: [-70, 11, 80], size: [40, 22, 3] },      // ? Boden
            { pos: [-10, 34, 80], size: [40, 22, 3], tunnel: { radius: 4.1, axis: 'z' } },      // ? Decke
            { pos: [60, 11, 80], size: [20, 22, 3] },       // ? Boden

            // ===== Vertikale Wände (N-S, dünn in X) =====
            // X=-80
            { pos: [-80, 34, -70], size: [3, 22, 40] },     // ? Decke
            { pos: [-80, 11, 10], size: [3, 22, 40], tunnel: { radius: 4.4, axis: 'x' } },      // ? Boden
            { pos: [-80, 34, 70], size: [3, 22, 40] },      // ? Decke
            // X=-60
            { pos: [-60, 11, -50], size: [3, 22, 40] },     // ? Boden
            { pos: [-60, 34, 30], size: [3, 22, 40] },      // ? Decke
            { pos: [-60, 11, 80], size: [3, 22, 20] },      // ? Boden
            // X=-40
            { pos: [-40, 34, -80], size: [3, 22, 20] },     // ? Decke
            { pos: [-40, 11, -10], size: [3, 22, 40], tunnel: { radius: 4.0, axis: 'x' } },     // ? Boden
            { pos: [-40, 34, 50], size: [3, 22, 40] },      // ? Decke
            // X=-20
            { pos: [-20, 11, -30], size: [3, 22, 40] },     // ? Boden
            { pos: [-20, 34, 40], size: [3, 22, 20] },      // ? Decke
            { pos: [-20, 11, 80], size: [3, 22, 20] },      // ? Boden
            // X=0
            { pos: [0, 34, -70], size: [3, 22, 40] },       // ? Decke
            { pos: [0, 11, 0], size: [3, 22, 20] },         // ? Boden
            { pos: [0, 34, 70], size: [3, 22, 40] },        // ? Decke
            // X=20
            { pos: [20, 11, -60], size: [3, 22, 20] },      // ? Boden
            { pos: [20, 34, 10], size: [3, 22, 40], tunnel: { radius: 4.6, axis: 'x' } },       // ? Decke
            { pos: [20, 11, 60], size: [3, 22, 20] },       // ? Boden
            // X=40
            { pos: [40, 34, -60], size: [3, 22, 60] },      // ? Decke
            { pos: [40, 11, 30], size: [3, 22, 40] },       // ? Boden
            { pos: [40, 34, 80], size: [3, 22, 20] },       // ? Decke
            // X=60
            { pos: [60, 11, -30], size: [3, 22, 40], tunnel: { radius: 4.3, axis: 'x' } },      // ? Boden
            { pos: [60, 34, 50], size: [3, 22, 40] },       // ? Decke
            // X=80
            { pos: [80, 11, -70], size: [3, 22, 40] },      // ? Boden
            { pos: [80, 34, -10], size: [3, 22, 40], tunnel: { radius: 4.1, axis: 'x' } },      // ? Decke
            { pos: [80, 11, 70], size: [3, 22, 40] },       // ? Boden

            // ===== Orientierungs-Pfeiler (durchgehend) =====
            { pos: [-90, 22.5, -90], size: [4, 45, 4] },
            { pos: [90, 22.5, -90], size: [4, 45, 4] },
            { pos: [-90, 22.5, 90], size: [4, 45, 4] },
            { pos: [90, 22.5, 90], size: [4, 45, 4] },
            { pos: [0, 22.5, 0], size: [6, 45, 6], tunnel: { radius: 2.4, axis: 'y' } },        // Zentraler Pfeiler
        ],
        portals: [
            { a: [-85, 5, -85], b: [85, 40, 85], color: 0x00ffcc },     // NW?SO diagonal
            { a: [85, 5, -85], b: [-85, 40, 85], color: 0xff66ff },     // NO?SW diagonal
            { a: [-85, 40, 0], b: [85, 5, 0], color: 0xffaa00 },       // W oben?O unten
            { a: [0, 5, -85], b: [0, 40, 85], color: 0x44ff88 },       // N unten?S oben
            { a: [-45, 5, -45], b: [45, 40, 45], color: 0xff4444 },    // Inner NW?SO
            { a: [45, 5, -45], b: [-45, 40, 45], color: 0x4488ff },    // Inner NO?SW
        ]
    },
};

