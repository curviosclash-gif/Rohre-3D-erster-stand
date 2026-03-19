// ============================================
// Neon Abyss - Vertikale 5-Zonen Arcade Map
// ============================================

export const NEON_ABYSS_MAP = {
    neon_abyss: {
        name: 'Neon Abyss',
        size: [160, 75, 160],
        preferAuthoredPortals: true,
        portalLevels: [12, 22, 37, 52, 67],
        obstacles: [
            // ================================================================
            // ZONE 1: DER SCHLUND (Y 0-15)
            // Enger Bodenbereich mit Foam-Sumpf und Tunnel-Eingängen
            // ================================================================

            // Zentraler Foam-Sumpf (Bouncing Pad)
            { pos: [0, 4, 0], size: [30, 8, 30], kind: 'foam' },

            // 4 Boden-Wände mit Tunnel-Eingängen (kreuzförmig)
            { pos: [0, 7, -40], size: [50, 14, 5], tunnel: { radius: 5.0, axis: 'z' } },   // Nord
            { pos: [0, 7, 40], size: [50, 14, 5], tunnel: { radius: 5.0, axis: 'z' } },    // Süd
            { pos: [40, 7, 0], size: [5, 14, 50], tunnel: { radius: 5.0, axis: 'x' } },    // Ost
            { pos: [-40, 7, 0], size: [5, 14, 50], tunnel: { radius: 5.0, axis: 'x' } },   // West

            // Deckungssteine im Schlund
            { pos: [25, 4, 25], size: [6, 8, 6] },
            { pos: [-25, 4, -25], size: [6, 8, 6] },
            { pos: [25, 4, -25], size: [6, 8, 6] },
            { pos: [-25, 4, 25], size: [6, 8, 6] },

            // Foam-Stolperfallen
            { pos: [15, 3, -15], size: [4, 6, 4], kind: 'foam' },
            { pos: [-15, 3, 15], size: [4, 6, 4], kind: 'foam' },

            // ================================================================
            // ZONE 2: DIE BRÜCKEN (Y 15-30)
            // 4 kreuzförmige Brücken zum Zentrum, offene Lücken dazwischen
            // ================================================================

            // Zentrale Plattform (Knotenpunkt)
            { pos: [0, 20, 0], size: [14, 4, 14] },

            // Nord-Brücke
            { pos: [0, 20, -35], size: [8, 4, 56] },
            // Süd-Brücke
            { pos: [0, 20, 35], size: [8, 4, 56] },
            // Ost-Brücke
            { pos: [35, 20, 0], size: [56, 4, 8] },
            // West-Brücke
            { pos: [-35, 20, 0], size: [56, 4, 8] },

            // Brücken-Geländer (dünne Seitenwände für Deckung)
            { pos: [4, 24, -35], size: [1, 4, 56] },
            { pos: [-4, 24, -35], size: [1, 4, 56] },
            { pos: [4, 24, 35], size: [1, 4, 56] },
            { pos: [-4, 24, 35], size: [1, 4, 56] },
            { pos: [35, 24, 4], size: [56, 4, 1] },
            { pos: [35, 24, -4], size: [56, 4, 1] },
            { pos: [-35, 24, 4], size: [56, 4, 1] },
            { pos: [-35, 24, -4], size: [56, 4, 1] },

            // ================================================================
            // ZONE 3: DER KÄFIG (Y 30-45)
            // 3D-Gitterstruktur aus Hard- und Foam-Wänden
            // ================================================================

            // Horizontale Gitterwände (dünn, mit Lücken)
            { pos: [-30, 37, 0], size: [3, 14, 60], kind: 'foam' },     // West-Gitter
            { pos: [30, 37, 0], size: [3, 14, 60], kind: 'foam' },      // Ost-Gitter
            { pos: [0, 37, -30], size: [60, 14, 3] },                    // Nord-Gitter (hart)
            { pos: [0, 37, 30], size: [60, 14, 3] },                     // Süd-Gitter (hart)

            // Kreuzwände im Käfig
            { pos: [0, 37, 0], size: [3, 14, 40], tunnel: { radius: 4.0, axis: 'z' } },   // Zentral N-S
            { pos: [0, 37, 0], size: [40, 14, 3], tunnel: { radius: 4.0, axis: 'x' } },   // Zentral O-W

            // Diagonale Foam-Blöcke (durchbrechbar)
            { pos: [20, 35, 20], size: [8, 10, 8], kind: 'foam' },
            { pos: [-20, 35, -20], size: [8, 10, 8], kind: 'foam' },
            { pos: [20, 35, -20], size: [8, 10, 8], kind: 'foam' },
            { pos: [-20, 35, 20], size: [8, 10, 8], kind: 'foam' },

            // ================================================================
            // ZONE 4: DIE TÜRME (Y 45-60)
            // 4 Ecktürme mit vertikalen Tunneln, verbunden durch Tubes
            // ================================================================

            // 4 Ecktürme (mit vertikalem Durchflug)
            { pos: [50, 52, -50], size: [14, 16, 14], tunnel: { radius: 4.5, axis: 'y' } },   // NO-Turm
            { pos: [-50, 52, -50], size: [14, 16, 14], tunnel: { radius: 4.5, axis: 'y' } },  // NW-Turm
            { pos: [50, 52, 50], size: [14, 16, 14], tunnel: { radius: 4.5, axis: 'y' } },    // SO-Turm
            { pos: [-50, 52, 50], size: [14, 16, 14], tunnel: { radius: 4.5, axis: 'y' } },   // SW-Turm

            // Tubes zwischen den Türmen (gefährliche Röhren-Passagen)
            { shape: 'tube', kind: 'hard', start: [-50, 52, -50], end: [50, 52, -50], radius: 4.2 },   // Nord-Verbindung
            { shape: 'tube', kind: 'hard', start: [-50, 52, 50], end: [50, 52, 50], radius: 4.2 },     // Süd-Verbindung
            { shape: 'tube', kind: 'hard', start: [-50, 52, -50], end: [-50, 52, 50], radius: 4.2 },   // West-Verbindung
            { shape: 'tube', kind: 'hard', start: [50, 52, -50], end: [50, 52, 50], radius: 4.2 },     // Ost-Verbindung

            // Plattformen auf den Türmen
            { pos: [50, 61, -50], size: [18, 2, 18] },    // NO Plattform
            { pos: [-50, 61, -50], size: [18, 2, 18] },   // NW Plattform
            { pos: [50, 61, 50], size: [18, 2, 18] },     // SO Plattform
            { pos: [-50, 61, 50], size: [18, 2, 18] },    // SW Plattform

            // ================================================================
            // ZONE 5: DIE KRONE (Y 60-75)
            // Offene Gipfel-Arena, minimaler Schutz, Premium-Belohnungen
            // ================================================================

            // Zentraler Kronen-Pfeiler (einzige Deckung)
            { pos: [0, 67, 0], size: [8, 16, 8], tunnel: { radius: 3.0, axis: 'y' } },

            // Schwebende Foam-Inseln (minimale Deckung)
            { pos: [30, 65, 0], size: [6, 4, 6], kind: 'foam' },
            { pos: [-30, 65, 0], size: [6, 4, 6], kind: 'foam' },
            { pos: [0, 65, 30], size: [6, 4, 6], kind: 'foam' },
            { pos: [0, 65, -30], size: [6, 4, 6], kind: 'foam' },

            // Orientierungspfeiler an den Ecken (Boden bis Decke)
            { pos: [-72, 37, -72], size: [4, 75, 4] },
            { pos: [72, 37, -72], size: [4, 75, 4] },
            { pos: [-72, 37, 72], size: [4, 75, 4] },
            { pos: [72, 37, 72], size: [4, 75, 4] },
        ],
        portals: [
            // Schlund-Express: Boden ↔ Krone (vertikale Shortcuts)
            { a: [-55, 7, -55], b: [55, 67, 55], color: 0x00ffcc },       // NW unten → SO oben
            { a: [55, 7, -55], b: [-55, 67, 55], color: 0xff66ff },       // NO unten → SW oben

            // Brücken-Flip (horizontaler Wechsel)
            { a: [-60, 22, 0], b: [60, 22, 0], color: 0xffaa00 },        // West ↔ Ost

            // Käfig-Flucht
            { a: [0, 37, 0], b: [0, 37, 65], color: 0x44ff88 },          // Mitte → Außen

            // Turm-Hopping
            { a: [-50, 55, -50], b: [50, 55, 50], color: 0xff4444 },     // NW → SO
            { a: [50, 55, -50], b: [-50, 55, 50], color: 0x4488ff },     // NO → SW

            // Vertikaler Lift
            { a: [0, 5, 0], b: [0, 70, 0], color: 0xffffff },            // Boden → Krone

            // Seiten-Shift im Käfig
            { a: [-40, 37, 0], b: [40, 37, 0], color: 0xff8800 },        // West ↔ Ost
        ],
        gates: [
            // 4 Boost-Gates auf den Brücken (Richtung Zentrum)
            {
                type: 'boost',
                pos: [0, 22, -55],
                forward: [0, 0, 1],
                params: { duration: 1.8, forwardImpulse: 55, bonusSpeed: 70 }
            },
            {
                type: 'boost',
                pos: [0, 22, 55],
                forward: [0, 0, -1],
                params: { duration: 1.8, forwardImpulse: 55, bonusSpeed: 70 }
            },
            {
                type: 'boost',
                pos: [55, 22, 0],
                forward: [-1, 0, 0],
                params: { duration: 1.8, forwardImpulse: 55, bonusSpeed: 70 }
            },
            {
                type: 'boost',
                pos: [-55, 22, 0],
                forward: [1, 0, 0],
                params: { duration: 1.8, forwardImpulse: 55, bonusSpeed: 70 }
            },
            // Slingshot im Käfig (vertikal nach oben)
            {
                type: 'slingshot',
                pos: [0, 40, 0],
                forward: [0, 0, 1],
                up: [0, 1, 0],
                params: { duration: 2.0, forwardImpulse: 25, liftImpulse: 14 }
            },
            // Slingshot in der Krone (Gipfel-Katapult)
            {
                type: 'slingshot',
                pos: [0, 68, 0],
                forward: [0, 0, -1],
                up: [0, 1, 0],
                params: { duration: 2.5, forwardImpulse: 20, liftImpulse: 12 }
            },
        ],
        playerSpawn: { x: -65, y: 22, z: 0 },
        botSpawns: [
            { x: 65, y: 22, z: 0 },       // Ost-Brücke
            { x: 0, y: 22, z: -65 },       // Nord-Brücke
            { x: 0, y: 7, z: 30 },         // Schlund Süd
            { x: -50, y: 55, z: -50 },     // NW-Turm
            { x: 50, y: 55, z: 50 },       // SO-Turm
            { x: 0, y: 67, z: 0 },         // Krone Zentrum
        ],
        items: [
            // Zone 1: Schlund (hohes Risiko, gute Belohnung)
            { id: 'abyss_rocket_pit', type: 'item_rocket', pickupType: 'ROCKET_WEAK', x: 0, y: 5, z: 0, weight: 1.5 },
            { id: 'abyss_shield_pit', type: 'item_shield', pickupType: 'SHIELD', x: -20, y: 5, z: 20, weight: 1.2 },

            // Zone 2: Brücken (mittleres Risiko)
            { id: 'abyss_speed_bridge', type: 'item_battery', pickupType: 'SPEED_UP', x: 0, y: 24, z: 0, weight: 1.8 },
            { id: 'abyss_shield_bridge', type: 'item_shield', pickupType: 'SHIELD', x: 40, y: 24, z: 0, weight: 1.0 },

            // Zone 3: Käfig (taktisch)
            { id: 'abyss_ghost_cage', type: 'item_coin', pickupType: 'GHOST', x: 20, y: 37, z: 20, weight: 1.3 },
            { id: 'abyss_thick_cage', type: 'item_coin', pickupType: 'THICK', x: -20, y: 37, z: -20, weight: 1.0 },

            // Zone 5: Krone (Premium)
            { id: 'abyss_rocket_crown', type: 'item_rocket', pickupType: 'ROCKET_STRONG', x: 0, y: 70, z: 0, weight: 0.8 },
            { id: 'abyss_speed_crown', type: 'item_battery', pickupType: 'SPEED_UP', x: 30, y: 68, z: 0, weight: 1.5 },
        ],
        aircraft: [
            { id: 'abyss_air_1', jetId: 'ship3', x: 0, y: 55, z: -30, scale: 1.3, rotateY: 0.8 },
            { id: 'abyss_air_2', jetId: 'ship6', x: 30, y: 55, z: 30, scale: 1.1, rotateY: -1.2 },
            { id: 'abyss_air_3', jetId: 'aircraft', x: -35, y: 58, z: 0, scale: 1.4, rotateY: 1.57 },
            { id: 'abyss_air_4', jetId: 'ship1', x: 0, y: 72, z: 0, scale: 0.9, rotateY: 3.14 },
        ],
    },
};
