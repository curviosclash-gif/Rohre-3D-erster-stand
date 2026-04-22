# BT90 Integrationsaudit und Startplan 2026-04-22

Stand: 2026-04-22
Status: Draft unter `docs/plaene/neu/`

## Rolle des Dokuments

Dieses Dokument buendelt die aktuellen Erkenntnisse zur Frage, ob der BT90-Draft fachgerecht in den aktiven Bot-Trainingsplan integriert wurde, und leitet daraus einen klaren Umsetzungs- und Untersuchungsrahmen ab.

Wichtig:

- Dieses Dokument ist **kein** aktiver Masterplan.
- Operative Phasen, Locks, Abschluss-Evidence und Claim-Status bleiben ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md`.
- Dieses Dokument beschreibt, **was vor einem professionellen Start zu normalisieren und wie die Startstrecke zu schneiden ist**.
- Es fuehrt bewusst **keine** Umsetzung aus.

## Management-Urteil

Die BT90-Integration ist formal und governance-seitig **teilweise gelungen**, aber fachlich und operativ **noch nicht reif fuer einen sofortigen professionellen Start ohne Vorarbeit**.

Positiv:

- BT90 wird nicht mehr als paralleler aktiver Master gefuehrt.
- Der aktive Bot-Trainingsplan uebernimmt den PPO-Zweitpfad sichtbar als `BT90` bis `BT95`.
- Die Startlogik wurde gegenueber frueheren Entwuerfen deutlich verkleinert und headless-first ausgerichtet.

Negativ:

- Zwischen Draft-Quelle und aktivem Bot-Trainingsplan bestehen noch Semantik- und Zuschnittsdrifts.
- Der Start ist nicht ueber alle BT90-Dokumente hinweg einheitlich beschrieben.
- Die fachliche Authority fuer Contracts und Schemas ist vor dem Start nicht hart genug eingefroren.
- Spaetere Bloecke sind teilweise wieder zu gross oder methodisch noch nicht sauber genug fuer claimbare operative Arbeit.

## Harter Befundkatalog

### 1. Kritisch: BT94 hat eine driftende Urteilssystematik

Der aktive Bot-Trainingsplan fuehrt fuer BT94 die Klassen `promote`, `hold`, `rollback`, `diagnose`.
Der Quellblock BT104 definiert dagegen `promote`, `hold`, `reject`.

Folge:

- Die aktive Kette und die Draft-Quelle meinen nicht mehr exakt dasselbe.
- Das ist kein kosmetischer Unterschied, sondern ein methodischer Drift im Entscheidungsmodell.
- Vor einem professionellen Start muss diese Taxonomie vereinheitlicht werden.

## 2. Hoch: Es existieren zwei konkurrierende Startnarrative

In Teilen des BT90-Drafts wird weiterhin suggeriert, dass `BT100` direkt als erster Umsetzungsblock startet.
Die spaetere operative Landung im aktiven Bot-Trainingsplan arbeitet aber korrekt mit der kleineren Leiter `BT90 -> BT91 -> BT92`.

Folge:

- Teamseitig droht ein falscher Startscope.
- Diskussionen ueber Sidecar, 1-Worker-Lane und Single-Env koennen wieder in denselben ersten Startblock zurueckrutschen.
- Das muss vor jedem Claim textlich auf eine einzige Wahrheit reduziert werden.

## 3. Hoch: V101 ist als moeglicher Contract- und Authority-Drift nur benannt, nicht eingefroren

Der aktive Bot-Trainingsplan erkennt korrekt an, dass `V101` vor BT90-BT92 an Shared-Contracts, Schema- oder Typ-Ratchets ziehen kann.
Gleichzeitig ist `V101` im Gesamtplan als naechster prioritaerer Qualitaetsblock eingeordnet.

Folge:

- BT90 kann sonst auf einer Contract-Basis starten, die kurz darauf wieder verschoben wird.
- Ein professioneller Start braucht vorher einen klaren Freeze oder eine explizite Reihenfolgeentscheidung.

## 4. Mittel: BT93 ist in der aktiven Landung nicht vollstaendig rueckverlinkt

Die Zerlegung im aktiven Trainingsplan nennt `BT101.4` bis `BT101.6` plus `BT102` als Quelle fuer BT93.
Der konkrete BT93-Block referenziert aber praktisch nur BT102 als Quelle.

Folge:

- Der Mehr-Env-Folgepfad ist logisch beschrieben, aber dokumentarisch nicht ganz sauber geschlossen.
- Das ist kein Sofort-Blocker fuer den Start, aber ein klarer Nachschaerfungspunkt vor BT93.

## 5. Mittel: BT94 ist fuer einen sauberen operativen Block wieder zu breit

BT94 vereint:

- Ablationsmatrix
- Candidate Freeze
- externe A/B-Evidence
- verdict-sensitive Folgeentscheidung

Folge:

- Der Block ist fuer spaetere claimbare Arbeit erneut monolithisch gefaehrdet.
- Vor BT94 sollte geprueft werden, ob Freeze und externe Evidence getrennt werden muessen.

## 6. Mittel: BT95 ist ehrlich, aber nur eingeschraenkt ein echter Umsetzungsblock

BT95 ist im Kern ein Handoff- und Rollout-Intake-Vorbereitungsblock.
Das ist fachlich legitim, aber nicht derselbe Blocktyp wie ein technischer Bootstrap-, Env- oder Trainingsblock.

Folge:

- BT95 darf spaeter nicht wie ein normaler Implementierungsblock missverstanden werden.
- Die Rolle als Handoff-Block muss bis zum Ende explizit sichtbar bleiben.

## 7. Hoch: Der reale Repo-Startzustand ist schwacher als die Planoptik

Der Plan spricht bereits in operativen Begriffen ueber Python-Sidecar, PPO-Artefakte und Env-Pfade.
Im aktuellen Repo ist der Python-/PPO-Bauort jedoch noch nicht als echte Arbeitsbasis vorhanden.

Folge:

- Der erste echte Arbeitsblock ist noch klarer Bootstrap- und Contract-Freeze als das Vokabular teilweise suggeriert.
- Ein zu frueher Wechsel in PPO-, Torch- oder Throughput-Debatten waere fachlich unprofessionell.

## Gesamtbewertung

### Integrationsbewertung

- Governance und Planstruktur: **solide**
- Fachliche Semantik und operative Scharfstellung: **noch nicht ausreichend**
- Sofortige Startfaehigkeit ohne Vorarbeit: **nicht gegeben**

### Gesamtnote

Die Integration ist aktuell eher **befriedigend minus**:

- formal brauchbar
- organisatorisch deutlich besser als fruehere Entwuerfe
- aber noch nicht auf dem Niveau eines wirklich harten, professionell claimbaren Startplans

## Verbindliche Leitplanken fuer die weitere Arbeit

1. BT90 bleibt Draft- und Handoff-Material unter `docs/plaene/neu/`.
2. Aktive Bot-Training-Phasen leben nur in `docs/bot-training/Bot_Trainingsplan.md`.
3. Vor dem ersten BT90-Claim muss die Contract-Authority explizit eingefroren oder gegen `V101` abgesichert werden.
4. Der erste echte Start darf nicht mit PPO-Baseline, VecEnv oder Ablationen beginnen.
5. Produktive Runtime-, Matchstart- und AI-Hub-Surfaces bleiben bis zu einem spaeteren Integrationsblock read-only.

## Professionelle Startstrategie

Der professionelle Start ist **nicht**:

- BT90 komplett "einfach anfangen"
- `BT100` direkt als grossen ersten Umsetzungsblock lesen
- Sidecar, 1-Worker-Lane, Single-Env und Mehr-Env gleichzeitig oeffnen
- PPO-/Torch-/CUDA-Fragen vor der Contract-Wahrheit diskutieren

Der professionelle Start ist stattdessen:

1. Governance und Startnarrativ normalisieren.
2. Contract-Authority und Drift-Fenster gegen `V101` absichern.
3. Nur den kleinstmoeglichen aktiven BT90-Startblock vorbereiten.
4. Erst danach den Sidecar- und 1-Worker-Block vorbereiten.
5. Erst danach die Single-Env-Minimalspur vorbereiten.
6. Alles ab Mehr-Env und PPO-Baseline bewusst als Folgepfad behandeln.

## Phasen zur Umsetzung

Hinweis:

- Diese Phasen sind als professionelle Leitlinie fuer die naechsten Dokumentations- und Intake-Schritte formuliert.
- Sie sollen **noch nicht ausgefuehrt**, sondern als Arbeitsrahmen verwendet werden.

### Phase 0 - Governance-Normalisierung und Dokumentenklarheit

Ziel:

Den BT90-Pfad auf **eine** konsistente Sprache, **eine** Startlogik und **eine** Entscheidungssystematik reduzieren.

Arbeitspakete:

- Urteilssystematik fuer BT94, BT104 und BT105 auf eine verbindliche Taxonomie harmonisieren.
- README, Intake-Master und Implementierungs-README auf dieselbe aktive Landung `BT90 -> BT91 -> BT92` ausrichten.
- BT93-Dokumentation so nachziehen, dass `BT101.4` bis `BT101.6` als echter Quellanteil sichtbar bleiben.
- BT95 textlich klar als Handoff-/Intake-Vorbereitungsblock markieren und nicht als normalen Implementierungsblock verpacken.

Abschlusskriterien:

- Es gibt nur noch **eine** Startgeschichte.
- Es gibt nur noch **eine** Urteilstaxonomie.
- Die spaeteren Folgepfade sind nicht weich oder doppeldeutig beschrieben.

No-Go:

- Kein BT90-Claim, solange diese Normalisierung offen ist.

### Phase 1 - Contract-Freeze und Authority-Snapshot

Ziel:

Vor dem Start klarstellen, welche Artefakte fuer BT90-BT92 authoritativ sind und wie auf Drift reagiert wird.

Arbeitspakete:

- `TrainingContractV1`, `TrainerPayloadAdapter`, `ObservationSchemaV2` und `BotActionContract` als Authority-Viereck festziehen.
- Entscheiden, ob `V101` vor BT90 gezogen wird oder ob fuer BT90 ein expliziter Dokumentations-Freeze gegen den heutigen Stand gilt.
- Pflichtfelder, Drift-Regeln und Blocker-Signale fuer BT90-BT92 in einem kleinen, eindeutigen Authority-Snapshot notieren.
- Klar dokumentieren, dass Contract- oder Schema-Drift nicht still im Python-Pfad wegadaptiert werden darf.

Abschlusskriterien:

- Die Authority-Frage ist vor dem ersten Claim beantwortet.
- `V101` ist entweder vorgelagert oder bewusst als kontrolliertes Restrisiko behandelt.
- Fuer BT90-BT92 ist klar, welche Quelle bei Widerspruch gewinnt.

No-Go:

- Kein professioneller Start auf "vermutlich stabilem" Contract-Stand.

### Phase 2 - Intake-Vorbereitung fuer BT90

Ziel:

Den ersten aktiven Block auf den kleinstmoeglichen Wahrheitskern begrenzen.

Inhalt von BT90:

- Python-Version, venv-Pfad und Minimal-Bootstrap
- JS-authoritative Contract-Wahrheit
- erlaubte PPO-Bauorte
- read-only Runtime-Grenzen
- klare Blocker-Regel fuer Contract- oder Runtime-Drift

Bewusst nicht in BT90 ziehen:

- Sidecar-Handshake
- 1-Worker-Lane
- Single-Env
- VecEnv
- PPO-Baseline

Abschlusskriterien:

- BT90 ist klein genug, um als echter Wahrheitsblock zu funktionieren.
- Der Block enthaelt keine versteckte operative Scope-Ausweitung.

No-Go:

- Kein "nur noch schnell" Sidecar oder Worker-Scope in BT90.

### Phase 3 - Intake-Vorbereitung fuer BT91

Ziel:

Den zweiten aktiven Block auf exakt den Sidecar- und 1-Worker-Nachweis begrenzen.

Inhalt von BT91:

- Python-Sidecar ueber bestehenden Contract `v1`
- `trainer-ready`
- Lesen von `bot-action-request`, `training-reset`, `training-step`, `trainer-stats-request`
- genau eine deterministische 1-Worker-Lane
- mindestens 100 Steps
- kleine Boot-/Reset-/Step-Baseline

Bewusst nicht in BT91 ziehen:

- 2-Worker- oder 4-Worker-Arbeit
- Mehr-Env-/VecEnv-Themen
- PPO-Baseline

Abschlusskriterien:

- BT91 ist ein enger Integrations- und Stabilitaetsblock.
- Mehr-Worker- oder Throughput-Druck wird sichtbar abgewehrt.

### Phase 4 - Intake-Vorbereitung fuer BT92

Ziel:

Den dritten aktiven Block nur als Single-Env- und Semantik-Block aufziehen.

Inhalt von BT92:

- Observation-/Action-Authority
- genau ein headless `gymnasium.Env`
- `reset()`, `step()`, `close()`
- JS-authoritative Reward-, `done`-, `truncated`- und Info-Semantik
- sichtbare Behandlung von `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion`, `observationLength`

Bewusst nicht in BT92 ziehen:

- Mehr-Env
- VecEnv
- echte PPO-Baseline
- Parallelisierungsversprechen

Abschlusskriterien:

- BT92 schliesst nur als sauberer Single-Env-Minimalblock.
- Parallelisierung bleibt explizit ausserhalb von `BT92.99`.

### Phase 5 - Re-Baselining fuer BT93 bis BT95

Ziel:

Die spaeteren BT90-Folgepfade erst nach echter Evidence aus BT90-BT92 wieder scharfziehen.

Arbeitspakete:

- BT93 nur auf Basis echter Single-Env- und Throughput-Daten nachkalibrieren.
- BT94 vor der spaeteren operativen Nutzung auf Monolith-Risiko pruefen.
- BT95 als Handoff-Block sauber von echtem Runtime-Rollout trennen.
- `BT80C 80.9.3` als Restblocker fuer spaetere Integrationsnahe weiter sichtbar halten.

Abschlusskriterien:

- Kein spaeterer Block baut mehr auf Wunschannahmen aus dem Draft.
- Jede Folgephase ist an echte Vorlaeufer-Evidence gekoppelt.

## Empfohlene Untersuchungsreihenfolge fuer die naechsten Sessions

### Session A - Dokumenten- und Governance-Audit

Ziel:

Phase 0 vollstaendig abschliessen.

Ergebnis:

- harmonisierte Taxonomie
- eindeutige Startlogik
- bereinigte spaetere Rollendefinitionen

### Session B - Contract- und Authority-Audit

Ziel:

Phase 1 abschliessen.

Ergebnis:

- klarer Authority-Snapshot
- dokumentierte Drift-Regeln
- eindeutige Entscheidung zu `V101`

### Session C - BT90-Startblock final zuschneiden

Ziel:

Phase 2 als claimbaren Vorbereitungsstand erreichen.

Ergebnis:

- professionell kleiner BT90-Wahrheitsblock
- keine versteckte Sidecar- oder Worker-Last

### Session D - BT91-Vorbereitung

Ziel:

Phase 3 als enger Integrationsblock vorbereiten.

Ergebnis:

- deterministischer 1-Worker-Pfad als einziges Ziel

### Session E - BT92-Vorbereitung

Ziel:

Phase 4 als sauberer Single-Env-Block vorbereiten.

Ergebnis:

- klare Semantikuebernahme
- keine voreilige Parallelisierung

## Klare Handlungsempfehlung

Wenn BT90 professionell gestartet werden soll, lautet die Reihenfolge:

1. **Nicht** sofort implementieren.
2. Zuerst Phase 0 und Phase 1 dokumentarisch sauber schliessen.
3. Dann nur BT90 als kleinstmoeglichen Wahrheitsblock vorbereiten.
4. Erst nach gruener BT90-Logik BT91 vorbereiten.
5. Erst danach BT92 vorbereiten.
6. BT93-BT95 erst auf Basis echter Evidence re-baselinen.

## Abschlussurteil

BT90 ist heute **kein schlechter Draft**, aber noch **kein hart professionell startklarer Ausfuehrungspfad**.

Der richtige naechste Schritt ist daher nicht direkte Umsetzung, sondern:

- Normalisierung
- Authority-Freeze
- enger Startblock-Zuschnitt
- erst danach operative Uebernahme in den aktiven Bot-Trainingsplan
