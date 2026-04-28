# B03 Kernsimulation, Arena und Entity-Systems - Findings

Stand: 2026-04-29
Status: in Arbeit
Planquelle: [README.md](./README.md)

## Scope

- Blockscope laut Audit-README:
  - `src/entities/EntityManager.js`
  - `src/entities/runtime/**`
  - `src/entities/arena/**`
  - `src/entities/systems/**`
  - `src/entities/player/**`
  - `src/entities/directors/**`
- Bisher konkret geprueft:
  - `src/entities/arena/portal/PortalLayoutBuilder.js`
  - `src/entities/arena/CheckpointRingMeshFactory.js`
  - `src/entities/arena/portal/CheckpointRingRuntime.js`
  - `src/entities/runtime/EntityTickPipeline.js`
  - `src/entities/systems/PlayerLifecycleSystem.js`
  - `src/entities/systems/lifecycle/PlayerCollisionPhase.js`
  - `src/entities/systems/CollisionResponseSystem.js`
  - `src/entities/EntityManager.js`
  - `src/entities/arena/ArenaBuilder.js`
  - `src/core/MatchKernelReplayAdapter.js`
- Noch offen im Block:
  - Breiterer Sweep durch `src/entities/runtime/**`, `src/entities/player/**` und `src/entities/directors/**`
  - Zweitpass auf Hotpaths/Allokationen ausserhalb der bereits geprueften Arena- und Tick-Pfade

## Prueffokus

- Simulation, Kollision und Tick-Reihenfolge
- Arena-, Trail-, Projectile- und Player-Lifecycles
- Hotpaths, Allokationen und Determinismus-Risiken
- Kopplung zwischen Entity-Runtime und Matchstate

## Befunde

| ID | Schwere | Titel | Dateien | Evidenz | Empfehlung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| B03-F01 | hoch | Fixed-3D-Portal-Layout wiederholt bzw. kollabiert Pairings bei kleinen Slot-Mengen | `src/entities/arena/portal/PortalLayoutBuilder.js` | `pairCount` kommt direkt aus `PORTAL_COUNT`; `_buildFixed3DPortals()` kombiniert Slot-Indizes mit festen `+5`/`+7`-Offsets modulo `slots.length`, wodurch bei kleinen Slot-Mengen dieselben Paare immer wieder entstehen | Pairing ueber eindeutige, validierte Slot-Permutationen oder seeded Shuffle ableiten und Abstand nach Fallback erneut pruefen | offen |
| B03-F02 | mittel | Checkpoint-Ringe erzeugen neue Materialien ohne sichtbaren Dispose-Pfad | `src/entities/arena/CheckpointRingMeshFactory.js`, `src/entities/arena/portal/CheckpointRingRuntime.js` | Pro Ring werden neues Ring- und Label-Material erzeugt und als nackte `THREE.Group` in die Scene gelegt; im B03-Scope existiert fuer `checkpointRings` kein korrespondierender Material-Teardown | Expliziten Dispose-Hook fuer Ring-/Label-Materialien einfuehren oder geteilte Materialien/Label-Assets plus zentralen Arena-Teardown nutzen | offen |
| B03-F03 | mittel | Tick-Pipeline normalisiert `dt`, reicht aber weiter den rohen Framewert in die Simulation | `src/entities/runtime/EntityTickPipeline.js` | `safeDt` wird nur fuer `_simulationClockMs` genutzt; Projectile-, Respawn- und Player-Lifecycle-Systeme erhalten weiter das ungefilterte `dt` | `safeDt` konsequent an alle B03-Simulationssysteme durchreichen oder invalide Frames vor State-Mutationen hart abfangen | offen |
| B03-F04 | hoch | Kollisions-Resolve mischt ungeseedeten Zufall in den produktiven Simulationspfad und unterlaeuft Replay-Determinismus | `src/entities/systems/CollisionResponseSystem.js`, `src/entities/systems/lifecycle/PlayerCollisionPhase.js`, `src/core/MatchKernelReplayAdapter.js` | `PlayerCollisionPhase` ruft den Bounce im allgemeinen Player-Kollisionspfad auf; `CollisionResponseSystem` addiert drei `Math.random()`-Samples zur Bounce-Richtung, loggt aber nur das Event, waehrend der Replay-Adapter deterministische Rekonstruktion erwartet | Bounce-Streuung aus einem Seed-/Snapshot-basierten RNG ableiten oder den tatsaechlichen Resolve-Vektor explizit in den Replaypfad schreiben | offen |

### B03-F01 - Fixed-3D-Portal-Layout wiederholt bzw. kollabiert Pairings bei kleinen Slot-Mengen

Problem:
`_buildFixed3DPortals()` nimmt `pairCount` direkt aus `config.GAMEPLAY.PORTAL_COUNT` und bildet `slotA`, `slotB` und `slotBAlt` ueber starre Modulo-Offsets auf `slots.length`. Bei kleinen Slot-Mengen entstehen dadurch reproduzierbar dieselben Start-/Ziel-Paare oder schnell wiederholte Paarungen, obwohl mehrere Portalpaare erzeugt werden sollen.

Risiko:
Maps mit wenigen 3D-Portal-Slots verlieren Varianz oder erzeugen nahezu identische Links. Das kann Traversal-Design entwerten, Portale optisch uebereinanderziehen und spaeteres Balancing pro Map unzuverlaessig machen.

Evidenz:
`src/entities/arena/portal/PortalLayoutBuilder.js:255-260` leitet `pairCount` direkt aus `PORTAL_COUNT` ab. `src/entities/arena/portal/PortalLayoutBuilder.js:297-308` berechnet `slotA`, `slotB` und `slotBAlt` ueber `(i * 2) % slots.length`, `(i * 2 + 5) % slots.length` und `(i * 2 + 7) % slots.length`. Der Distanz-Fallback probiert genau ein alternatives Ziel, validiert das Ergebnis danach aber nicht erneut.

Betroffene Dateien:
`src/entities/arena/portal/PortalLayoutBuilder.js`

Empfehlung:
Die Paarbildung sollte ueber eine eindeutige Slot-Permutation oder einen seedbasierten Shuffle mit Kollisions-/Abstandsvalidierung laufen. Der aktuelle Offset-Ansatz ist fuer kleine Slot-Mengen zu fragil.

### B03-F02 - Checkpoint-Ringe erzeugen neue Materialien ohne sichtbaren Dispose-Pfad

Problem:
Jeder Checkpoint- und Finish-Ring erzeugt eigene `MeshStandardMaterial`- und `MeshBasicMaterial`-Instanzen. Die Factory gibt anschliessend nur eine `THREE.Group` zurueck und haengt sie direkt in die Scene; im geprueften B03-Scope ist kein korrespondierender Ring-Material-Teardown erkennbar.

Risiko:
Bei Arena-Rebuilds, Map-Wechseln oder wiederholtem Setup koennen GPU-Materialien und Label-Texturen anwachsen. Das fuehrt nicht sofort zu funktionalen Fehlern, belastet aber VRAM, Render-Stabilitaet und laenger laufende Sessions.

Evidenz:
`src/entities/arena/CheckpointRingMeshFactory.js:49-70` erzeugt neue Ring- und Label-Materialien. `src/entities/arena/CheckpointRingMeshFactory.js:133-149` und `:153-159` erstellen pro Ring ein neues Material, legen die Group per `renderer?.addToScene?.(group)` in die Scene und liefern die Group unveraendert zurueck. Im B03-Scope taucht `checkpointRings` anschliessend nur in Aufbau- und Runtime-Reads auf (`src/entities/arena/portal/PortalLayoutBuilder.js:91-157`, `src/entities/arena/portal/CheckpointRingRuntime.js:50-165`), nicht in einem Material-Dispose-Pfad.

Betroffene Dateien:
`src/entities/arena/CheckpointRingMeshFactory.js`
`src/entities/arena/portal/PortalLayoutBuilder.js`
`src/entities/arena/portal/CheckpointRingRuntime.js`

Empfehlung:
Ring- und Label-Materialien brauchen einen expliziten Teardown beim Arena-Abbau oder einen geteilten Material-/Label-Cache mit klarer Ownership. Ein nacktes Scene-Add ohne Dispose-Hook ist fuer wiederholte Builds zu riskant.

### B03-F03 - Tick-Pipeline normalisiert `dt`, reicht aber weiter den rohen Framewert in die Simulation

Problem:
Die Tick-Pipeline berechnet ein abgesichertes `safeDt`, verwendet es aber nur fuer `_simulationClockMs`. Danach werden Projectile-, Overheat-, Respawn- und Player-Lifecycle-Systeme weiterhin mit dem ungefilterten `dt` versorgt.

Risiko:
Bei negativen, `NaN`- oder sonst ungueltigen Framezeiten koennen Simulations-Subsysteme und der zentrale Simulations-Clock auseinanderlaufen. Das oeffnet Fehlerbilder rund um Cooldowns, Respawns, Projectile-Lebensdauern und Replay-/Telemetry-Timestamps.

Evidenz:
`src/entities/runtime/EntityTickPipeline.js:9-10` berechnet `safeDt` und schreibt damit `_simulationClockMs`. `src/entities/runtime/EntityTickPipeline.js:14-16` und `:21-23` reichen anschliessend weiter das rohe `dt` in `_projectileSystem.update(dt)`, `_overheatGunSystem.update(dt)`, `_respawnSystem.update(dt)` und `updatePlayer(player, dt, ...)`.

Betroffene Dateien:
`src/entities/runtime/EntityTickPipeline.js`

Empfehlung:
Alle B03-Simulationssysteme sollten denselben normalisierten Zeitwert erhalten. Alternativ muss die Pipeline invalide Framewerte vor dem ersten State-Mutationsschritt komplett verwerfen.

### B03-F04 - Kollisions-Resolve mischt ungeseedeten Zufall in den produktiven Simulationspfad und unterlaeuft Replay-Determinismus

Problem:
Der allgemeine Player-Kollisionspfad ruft den Bounce-Resolve fuer Foam-Kontakte direkt in der Kernsimulation auf. `CollisionResponseSystem.bounceBot()` veraendert die Resolve-Richtung anschliessend mit drei `Math.random()`-Samples, loggt aber nur das BOUNCE-Event statt des resultierenden Vektors.

Risiko:
Foam-/Bounce-Ausgaenge koennen zwischen identischen Inputs abweichen. Das steht quer zu seed-/replay-orientierten Pfaden und erschwert reproduzierbare Bugs, deterministische Replays und spaetere Headless-/Kernel-Integration.

Evidenz:
`src/entities/systems/lifecycle/PlayerCollisionPhase.js:40-46` ruft `entityManager._bouncePlayerOnFoam(...)` im normalen Kollisionspfad auf. `src/entities/systems/CollisionResponseSystem.js:83-88` addiert drei `Math.random()`-basierte Offsets zur Bounce-Richtung. `src/entities/systems/CollisionResponseSystem.js:115-116` loggt danach nur `'BOUNCE_TRAIL'` bzw. `'BOUNCE_WALL'`. Gleichzeitig beschreibt `src/core/MatchKernelReplayAdapter.js:25-29`, dass Replays deterministisch rekonstruierbar bleiben sollen.

Betroffene Dateien:
`src/entities/systems/CollisionResponseSystem.js`
`src/entities/systems/lifecycle/PlayerCollisionPhase.js`
`src/core/MatchKernelReplayAdapter.js`

Empfehlung:
Die Streuung sollte aus einem seed-/snapshotbasierten RNG kommen oder als explizites Replay-Result gespeichert werden. Ungeseedetes `Math.random()` im produktiven Kollisions-Resolve ist fuer den B03-Kernpfad zu teuer.

## Offene Fragen

- Ist die Ring-/Portal-Cleanup-Ownership ausserhalb des bisher geprueften B03-Scope zentralisiert, oder fehlen die Dispose-Hooks tatsaechlich?
- Soll der B03-Zweitpass den Replay-/Determinismus-Abgleich direkt gegen `MatchKernel`/`HeadlessMatchKernelRuntime` mitpruefen?

## Folgearbeit

- Master-Abgleich:
  - `B03-F01` deckt sich fachlich mit `P6`.
  - `B03-F02` deckt sich fachlich mit `P12`.
  - `B03-F03` und `B03-F04` sind neue B03-Erstfunde und sollten beim naechsten Audit-/Intake-Abgleich mit dem offenen Planbacklog gespiegelt werden.
- Re-Check 2026-04-29:
  - Die Evidenzstellen fuer `B03-F01` bis `B03-F04` wurden erneut gegengeprueft; es ergab sich keine Entkraeftung der bestehenden Befunde.
- Re-Check 2026-04-29 (Wissensgraph-Refresh):
  - Nach `npm run graph:build` und `npm run graph:check` wurden die B03-Evidenzstellen erneut gegen den aktuellen Code abgeglichen; die vier Befunde bleiben unveraendert valide.
- B03 weiterhin offen fuer:
  - Sweep durch `EntityRuntimeAssembler`/`EntityRuntimeSystemAssembly`/`EntityRuntimeSupportAssembly`
  - Lifecycle-/Cleanup-Pruefung fuer Player-, Projectile- und Arena-Rebuild-Pfade
  - Hotpath-Check in `PlayerInputSystem`, `ParcoursProgressSystem` und `EntityManager`
