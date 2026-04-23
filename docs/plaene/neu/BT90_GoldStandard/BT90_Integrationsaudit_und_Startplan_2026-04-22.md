# BT90 Integrationsaudit und Startplan 2026-04-22

Stand: 2026-04-22
Status: Draft unter `docs/plaene/neu/`

## Rolle des Dokuments

Dieses Dokument buendelt die aktuellen Erkenntnisse zur Frage, ob der BT90-Draft fachgerecht in den aktiven Bot-Trainingsplan integriert wurde, und leitet daraus einen klaren Umsetzungs- und Untersuchungsrahmen ab.

Wichtig:

- Dieses Dokument ist **kein** aktiver Masterplan.
- Operative Phasen, Locks, Abschluss-Evidence und Claim-Status bleiben ausschliesslich in `docs/bot-training/Bot_Trainingsplan.md`.
- Dieses Dokument beschreibt, **was vor einem professionellen Start zu normalisieren und wie die Startstrecke zu schneiden ist**.
- Die Erstfassung fuehrte bewusst **keine** Umsetzung aus; diese Revision dokumentiert die Ausfuehrung von Phase 1 als Contract-Freeze, von Phase 2 als BT90-Zuschnitt, von Phase 3 als BT91-Zuschnitt und von Phase 4 als BT92-Zuschnitt. Operative Claims, Locks und Abschluss-Evidence bleiben weiterhin ausschliesslich im Bot-Trainingsplan.

Follow-up 2026-04-23:

- Dieses Audit bleibt als Integrations- und Zuschnittsreferenz bestehen.
- Die Review-Befunde nach dem spaeteren Repo-Audit liegen jetzt verbindlich in `BT90_Followup_Tracker_2026-04-23.md`.
- Neue Folge-Loops starten ab jetzt ueber `prompts/000_BT90_Followup_Loop.md` und muessen den Tracker aktualisieren.
- `BTF-06` hat den frueheren claimbaren Monolith `BT93` ersetzt: aktiv wird der Folgepfad jetzt als `BT93A` (Harness aus `BT101.4` bis `BT101.6`), `BT93B` (Scaffold aus `BT102.1` bis `BT102.3`) und `BT93C` (konservative Baseline aus `BT102.4` bis `BT102.6`) geschnitten.
- Stellen unten, die noch von einem einzelnen `BT93` sprechen, sind als historische 2026-04-22-Erstbewertung zu lesen; operativ gewinnt der spaetere Split aus dem Follow-up-Tracker.

## Management-Urteil

Die BT90-Integration ist formal und governance-seitig **teilweise gelungen**, aber fachlich und operativ **noch nicht reif fuer einen sofortigen professionellen Start ohne Vorarbeit**.

Positiv:

- BT90 wird nicht mehr als paralleler aktiver Master gefuehrt.
- Der aktive Bot-Trainingsplan uebernimmt den PPO-Zweitpfad sichtbar als `BT90` bis `BT95`.
- Die Startlogik wurde gegenueber frueheren Entwuerfen deutlich verkleinert und headless-first ausgerichtet.

Negativ:

- Der claimbare Startpfad `BT90 -> BT91 -> BT92` ist jetzt professionell zugeschnitten; offene Arbeit liegt vor allem im evidenzbasierten Re-Baselining von `BT93` bis `BT95`.
- Der Authority-Freeze ist dokumentiert, muss aber gegen `V101`- und Adjacent-Drift kontrolliert werden.
- Spaetere Bloecke sind teilweise wieder zu gross oder methodisch noch nicht sauber genug fuer claimbare operative Arbeit.

## Harter Befundkatalog

### 1. Kritisch: BT94 hat eine driftende Urteilssystematik

Der aktive Bot-Trainingsplan fuehrt fuer BT94 die Klassen `promote`, `hold`, `rollback`, `diagnose`.
Der Quellblock BT104 definiert dagegen `promote`, `hold`, `reject`.

Folge:

- Die aktive Kette und die Draft-Quelle meinen nicht mehr exakt dasselbe.
- Das ist kein kosmetischer Unterschied, sondern ein methodischer Drift im Entscheidungsmodell.
- Vor einem professionellen Start muss diese Taxonomie vereinheitlicht werden.

Status 2026-04-22 nach Phase 0:

- behoben
- BT104 und BT105 wurden auf die aktive Urteilssystematik `promote|hold|rollback|diagnose` ausgerichtet

## 2. Hoch: Es existieren zwei konkurrierende Startnarrative

In Teilen des BT90-Drafts wird weiterhin suggeriert, dass `BT100` direkt als erster Umsetzungsblock startet.
Die spaetere operative Landung im aktiven Bot-Trainingsplan arbeitet aber korrekt mit der kleineren Leiter `BT90 -> BT91 -> BT92`.

Folge:

- Teamseitig droht ein falscher Startscope.
- Diskussionen ueber Sidecar, 1-Worker-Lane und Single-Env koennen wieder in denselben ersten Startblock zurueckrutschen.
- Das muss vor jedem Claim textlich auf eine einzige Wahrheit reduziert werden.

Status 2026-04-22 nach Phase 0:

- behoben
- README und Intake-Master fuehren die operative Landung jetzt konsistent als `BT90 -> BT91 -> BT92`

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

Status 2026-04-23 nach Follow-up `BTF-06`:

- behoben und weiter geschaerft
- der fruehere Sammelblock `BT93` ist jetzt operativ in `BT93A` (`BT101.4` bis `BT101.6`), `BT93B` (`BT102.1` bis `BT102.3`) und `BT93C` (`BT102.4` bis `BT102.6`) getrennt

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

Status 2026-04-22 nach Phase 0:

- behoben
- BT95 ist im aktiven Bot-Trainingsplan jetzt zusaetzlich explizit als Handoff-/Intake-Vorbereitungsblock markiert

## 7. Hoch: Der reale Repo-Startzustand ist schwacher als die Planoptik

Der Plan spricht bereits in operativen Begriffen ueber Python-Sidecar, PPO-Artefakte und Env-Pfade.
Im aktuellen Repo ist der Python-/PPO-Bauort unter `python/**` und `data/training/ppo/**` zwar bereits lokal im Worktree vorhanden, aber noch nicht repo-versioniert und damit noch keine belastbare repo-getragene Arbeitsbasis.

Folge:

- Der erste echte Arbeitsblock ist noch klarer Bootstrap- und Contract-Freeze als das Vokabular teilweise suggeriert.
- Ein zu frueher Wechsel in PPO-, Torch- oder Throughput-Debatten waere fachlich unprofessionell.

## Gesamtbewertung

### Integrationsbewertung

- Governance und Planstruktur: **solide**
- Fachliche Semantik und operative Scharfstellung des Startpfads: **solide**
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

## Umsetzungsstand Phase 0 (2026-04-22)

Phase 0 wurde mit dieser Revision dokumentarisch umgesetzt.

### Ergebnis

- Die einzige operative Startgeschichte lautet jetzt durchgehend `BT90 -> BT91 -> BT92`.
- Die aktive Urteilssystematik `promote|hold|rollback|diagnose` wurde als Wahrheit fuer BT104/BT105 durchgezogen.
- BT93 referenziert den Mehr-Env-Folgepfad jetzt explizit ueber `BT101.4` bis `BT101.6` plus `BT102`.
- BT95 ist ueber die Live-Dokumente hinweg sichtbar als Handoff-/Intake-Vorbereitungsblock markiert.

### Aenderungen dieser Revision

- `docs/plaene/neu/BT90_GoldStandard/README.md` auf die aktive Landung `BT90 -> BT91 -> BT92` umgestellt.
- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md` auf dieselbe operative Startlogik und die aktive BT104-/BT105-Taxonomie ausgerichtet.
- `docs/bot-training/Bot_Trainingsplan.md` fuer `BT93` und `BT95` textlich geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md` auf `promote|hold|rollback|diagnose` harmonisiert.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md` auf dieselbe Urteilssystematik und Handoff-Rolle geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/prompts/005_BT104_Vertiefung.md` und `006_BT105_Vertiefung.md` auf die aktive Taxonomie umgestellt.

## Umsetzungsstand Phase 1 (2026-04-22)

Phase 1 wurde mit dieser Revision dokumentarisch umgesetzt.

### Ergebnis

- Ein expliziter Authority-Freeze fuer `BT90` bis `BT92` wurde als eigenes Snapshot-Dokument festgezogen.
- Das Authority-Viereck aus `TrainingContractV1`, `TrainerPayloadAdapter`, `ObservationSchemaV2` und `BotActionContract` ist jetzt fuer den Startpfad priorisiert und gegen historische Kontextdrift abgegrenzt.
- `V101` wurde nicht als harter Vorblocker gesetzt, sondern als kontrolliertes Restrisiko mit klarer Re-Audit-Regel fuer Authority- und Adjacent-Dateien entschieden.
- Der Freeze wurde in die claim-relevanten BT90-Dokumente und in den aktiven Bot-Trainingsplan verdrahtet, damit der Startpfad nicht wieder auf uneinheitlichen Textquellen basiert.

### Aenderungen dieser Revision

- `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md` neu angelegt.
- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md` um einen verpflichtenden Pre-Claim-Hook auf den Snapshot erweitert.
- `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md` um Contract-Freeze und `V101`-Regel erweitert.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` auf den Snapshot als Konflikt- und Freeze-Referenz ausgerichtet.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md` auf dieselbe Authority-Precedence ausgerichtet.
- `docs/bot-training/Bot_Trainingsplan.md` in `BT90` und `BT92` um Snapshot- und Re-Audit-Regeln erweitert.
- `docs/plaene/neu/BT90_GoldStandard/prompts/001_BT100_Vertiefung.md` und `002_BT101_Vertiefung.md` um den Snapshot in der Pflicht-Lektuere erweitert.

### Materielle Freeze-Entscheidung

Fuer den aktuellen Stand gilt:

- `TrainingContractV1.js` bleibt authoritative fuer den internen Reset-/Step-Transitionshape.
- `TrainerPayloadAdapter.js` bleibt authoritative fuer den externen Transport- und Projektionsshape.
- `ObservationSchemaV2.js` friert den runtime-near Zielshape auf `v2-runtime-near` und Laenge `64` ein.
- `BotActionContract.js` friert Feldnamen, Clamping, Invalid-Handling und die Index-Semantik von `useItem`/`shootItemIndex` ein; fuer spaetere PPO-Claims bleibt diese rohe BT92-Surface nur Boundary-Wahrheit, waehrend der claimbare Folgepfad ab `BT93B` ueber `Split-Head` statt ueber reine `Action-Mask`- oder Sanitizer-Toleranz laufen muss.
- `TrainingDomain.js`, `RuntimeNearObservationAdapter.js`, `HybridDecisionArchitecture.js` und `EpisodeController.js` sind als semantiknahe Adjacent-Dateien fuer Re-Audits markiert.

## Umsetzungsstand Phase 2 (2026-04-22)

Phase 2 wurde mit dieser Revision dokumentarisch umgesetzt.

### Ergebnis

- Der aktive `BT90`-Block im Bot-Trainingsplan ist jetzt als kleinstmoeglicher Wahrheitsblock geschnitten.
- `BT90` traegt jetzt nur Python-Minimalbootstrap, JS-authoritative Contract-Wahrheit, erlaubte PPO-Bauorte, read-only Runtime-Grenzen und die Drift-Blocker-Regel.
- Sidecar-Handshake, 1-Worker-Lane, Single-Env, VecEnv und PPO-Baseline sind in `BT90` jetzt explizit ausgeschlossen und bleiben in `BT91` bis `BT93`.
- Die Referenzdokumente im BT90-Ordner spiegeln die aktive Trennung jetzt deutlicher, ohne dort operative Phasen zu pflegen.

### Aenderungen dieser Revision

- `docs/bot-training/Bot_Trainingsplan.md` fuer `BT90` um Bauort-, Runtime-Grenzen-, Ausschluss- und Drift-Blocker-Scope geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md` auf denselben minimalen aktiven BT90-Wahrheitskern nachgezogen.
- `docs/plaene/neu/BT90_GoldStandard/README.md` um die explizite BT90-Nicht-Ziehen-Liste erweitert.
- `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md` fuer die aktive Trennung `BT90 = 100.1-100.2` vs. `BT91 = 100.3-100.5` geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` als Draft-Sammelblock mit expliziter aktiver Landung `BT90`/`BT91` markiert.

## Umsetzungsstand Phase 3 (2026-04-22)

Phase 3 wurde mit dieser Revision dokumentarisch umgesetzt.

### Ergebnis

- Der aktive `BT91`-Block im Bot-Trainingsplan ist jetzt explizit als enger Integrations- und Stabilitaetsblock zugeschnitten.
- `BT91` traegt jetzt nur bestehenden Contract `v1`, `trainer-ready`, Lesen von `bot-action-request`, `training-reset`, `training-step`, `trainer-stats-request`, genau eine deterministische 1-Worker-Lane, mindestens 100 Steps und eine kleine Boot-/Reset-/Step-Baseline.
- 2-Worker-, 4-Worker-, Mehr-Env-/VecEnv- und PPO-Baseline-Scope sind im aktiven `BT91` jetzt ausdruecklich ausgeschlossen.
- Der direkte BT100-Referenzblock spiegelt denselben Zuschnitt, ohne selbst zu einem zweiten aktiven Wahrheitsraum zu werden.

### Aenderungen dieser Revision

- `docs/bot-training/Bot_Trainingsplan.md` fuer `BT91` um Quellzuschnitt, Snapshot-Hook und harte Ausschlussliste geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` auf denselben engen aktiven `BT91`-Zuschnitt nachgezogen.

### Restlage

- Keine neue Zwischenphase noetig.
- Offener naechster Zuschnitt bleibt `BT92` als Single-Env- und Semantikblock aus Phase 4.

## Umsetzungsstand Phase 4 (2026-04-22)

Phase 4 wurde mit dieser Revision dokumentarisch umgesetzt.

### Ergebnis

- Der aktive `BT92`-Block im Bot-Trainingsplan ist jetzt als enger Single-Env- und Semantikblock zugeschnitten.
- `BT92` traegt jetzt nur Observation-/Action-Authority, genau ein headless `gymnasium.Env`, `reset()`, `step()`, `close()` sowie die JS-authoritative Reward-, `done`-, `truncated`- und Info-Semantik.
- `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength` sind im aktiven Block explizit als sichtbare Pflichtsignale verankert.
- Die offene Action-Surface-Entscheidung ist fuer den Folgepfad festgezogen: `BT92` bleibt rohe Boundary-Semantik, der erste PPO-Scaffold muss `Split-Head` pinnen; `Action-Mask` bleibt optional, Sanitizer-Toleranz kein primaerer Lernpfad.
- Mehr-Env, VecEnv, PPO-Baseline und Parallelisierungsversprechen sind in `BT92` jetzt ausdruecklich ausgeschlossen und bleiben Folgearbeit fuer `BT93`.

### Aenderungen dieser Revision

- `docs/bot-training/Bot_Trainingsplan.md` fuer `BT92` um harte Ausschlussliste, praezisierten Lifecycle (`reset()`, `step()`, `close()`), sichtbare Semantikfelder und strengeren BT93-Handover geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md` auf dokumentarisch abgeschlossene Phase 4, Session E und den Phase-5-Fokus aktualisiert.

### Restlage

- Keine neue Zwischenphase noetig.
- Naechster Schritt bleibt Phase 5 als Re-Baselining fuer `BT93` bis `BT95`.

## Umsetzungsstand Phase 5 (2026-04-22)

Phase 5 wurde mit dieser Revision dokumentarisch umgesetzt.

### Ergebnis

- Der fruehere `BT93`-Pfad ist jetzt explizit an echte `BT92`-Evidence gebunden und operativ in `BT93A` (Harness), `BT93B` (Scaffold) und `BT93C` (Baseline) zerlegt; der lokal vorhandene, aber noch nicht repo-versionierte Python-/PPO-Bauort bleibt dabei offen sichtbar.
- `BT93B` ist jetzt auch fachlich gegen die BT92-Action-Surface abgesichert: kein direkter PPO-Claim auf der rohen `257`er-Indexbreite, sondern dokumentierter `Split-Head` ueber Bool-/Intent-Felder plus Item-Indizes.
- `BT94` hat jetzt eine Claim-Grenze zwischen Freeze-Paket und externer A/B-Evidence; wenn Freeze-Artefakte, Matrix oder Lane-Budget unscharf bleiben, ist vor einem Claim Split oder Nachschaerfung Pflicht.
- `BT95` ist jetzt noch klarer als doc-only Handoff verankert; ohne `BT104=promote`, gruene produktionsnahe Validation und User-Entscheid oeffnet kein aktiver Rollout-Intake.
- `BT80C 80.9.3` bleibt mit der konkret benannten Restlage (`PLAYING`, `roundsRecorded=0`) sichtbar als produktionsnaher Integrationsblocker.

### Aenderungen dieser Revision

- `docs/bot-training/Bot_Trainingsplan.md` fuer `BT93` bis `BT95` um Evidence-Anker, Monolith-Guardrail, No-go-Regeln und den konkreten `BT80C 80.9.3`-Restblocker geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md` auf realen Repo- und Evidence-Anker nachkalibriert.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md` um Freeze-Hartgrenze und expliziten BT104-Handover erweitert.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md` um klare Freeze-/Diagnose-Grenzen und den konkreten BT80C-Zusatzsignal-Status geschaerft.
- `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md` als doc-only Handoff mit hartem No-go ohne `promote` plus gruene produktionsnahe Validation nachgeschaerft.

### Restlage

- Phase 5 ist dokumentarisch geschlossen.
- Operative Evidence fuer `BT93` bis `BT95` fehlt weiterhin bewusst; diese Bloecke bleiben rolling drafts hinter `BT90` bis `BT92`.
- Der reale Repo-Bauort fuer Python/PPO (`python/**`, `data/training/ppo/**`) ist im aktuellen Worktree vorhanden, bleibt laut Git-Status aber noch unversioniert; deshalb bleiben die frueheren Startbloecke fuer Repo-Wahrheit und Evidence-Haertung relevant, statt Phase 5 still als repo-getragene Basis zu behandeln.

## Phasen zur Umsetzung

Hinweis:

- Diese Phasen sind als professionelle Leitlinie fuer die naechsten Dokumentations- und Intake-Schritte formuliert.
- Phase 4 wurde mit dieser Revision dokumentarisch ausgefuehrt; Phase 5 und spaeter bleiben Arbeitsrahmen.

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

Status 2026-04-22:

- dokumentarisch umgesetzt
- Startlandung, Urteilssystematik, BT93-Quellverweise und BT95-Rolle sind ueber die relevanten Live-Dokumente harmonisiert

### Phase 1 - Contract-Freeze und Authority-Snapshot

Ziel:

Vor dem Start klarstellen, welche Artefakte fuer BT90-BT92 authoritativ sind und wie auf Drift reagiert wird.

Arbeitspakete:

- `TrainingContractV1`, `TrainerPayloadAdapter`, `ObservationSchemaV2` und `BotActionContract` als Authority-Viereck festziehen.
- Entscheiden, ob `V101` vor BT90 gezogen wird oder ob fuer BT90 ein expliziter Dokumentations-Freeze gegen den heutigen Stand gilt.
- Pflichtfelder, Drift-Regeln und Blocker-Signale fuer BT90-BT92 in einem kleinen, eindeutigen Authority-Snapshot notieren.
- Klar dokumentieren, dass Contract- oder Schema-Drift nicht still im Python-Pfad wegadaptiert werden darf.

Status 2026-04-22:

- dokumentarisch umgesetzt
- Snapshot: `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
- Entscheid zu `V101`: kontrolliertes Restrisiko mit Re-Audit-Pflicht statt harter Vorblocker

Abschlusskriterien:

- Die Authority-Frage ist vor dem ersten Claim beantwortet.
- `V101` ist entweder vorgelagert oder bewusst als kontrolliertes Restrisiko behandelt.
- Fuer BT90-BT92 ist klar, welche Quelle bei Widerspruch gewinnt.

No-Go:

- Kein professioneller Start auf "vermutlich stabilem" Contract-Stand.

### Phase 1.5 - Kontrollierte Drift- und Re-Audit-Gates

Ziel:

Die Restrisiken sichtbar kontrollieren, die Phase 1 nicht sofort technisch aufloesen kann, ohne den Scope in `V101` oder globale Referenzpflege aufzuweiten.

Offene Risiken und warum sie nicht sofort loesbar sind:

| Restrisiko | Warum nicht sofort loesbar | Zwischenloesung fuer Phase 1.5 |
| --- | --- | --- |
| `V101` kann angrenzende Semantikdateien wie `TrainingDomain.js`, `RuntimeNearObservationAdapter.js` oder `HybridDecisionArchitecture.js` veraendern | `V101` ist ein separater, repo-weiter Hardening-Block und nicht Teil dieses BT90-Unterauftrags | Dokumentations-Freeze gegen den Stand 2026-04-22; Re-Audit vor dem naechsten `BT90`- bis `BT92`-Claim, sobald Authority- oder Adjacent-Dateien driften |
| `docs/referenz/ai_architecture_context.md` enthaelt weiterhin eine historische Bridge-V1-Sektion, die fuer `BT90` bis `BT92` allein nicht ausreicht | Die Referenzdatei bedient auch andere aktive Trainings- und Runtime-Pfade; ein globaler Umbau waere hier Scope-Drift | Fuer `BT90` bis `BT92` gewinnt der neue Snapshot bei Feldkonflikten; ein spaeterer repo-weiter Referenzabgleich bleibt eigene Folgearbeit |

Abschlusskriterien:

- Offene Driftfenster sind sichtbar dokumentiert statt implizit toleriert.
- Fuer `BT90` bis `BT92` ist klar, wann ein Re-Audit Pflicht wird.
- `BT92` wird nicht ohne frische Bestaetigung nach relevanter `V101`-Aenderung vorbereitet.

No-Go:

- Kein Sidecar-, Env- oder Python-Fallback, der Drift still kapselt statt den Snapshot zu erneuern.

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

Status 2026-04-22:

- dokumentarisch umgesetzt
- der aktive BT90-Block traegt jetzt nur Minimal-Bootstrap, Contract-Wahrheit, Bauort-/Read-only-Grenzen und Drift-Blocker
- Sidecar-, 1-Worker-, Single-Env-, VecEnv- und PPO-Baseline-Scope bleiben explizit ausserhalb von BT90

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

Status 2026-04-22:

- dokumentarisch umgesetzt
- `BT91` ist im aktiven Bot-Trainingsplan jetzt explizit auf Contract-`v1`-Sidecar, `trainer-ready`, bestehende Message-Typen, genau einen deterministischen Worker, mindestens 100 Steps und eine kleine Boot-/Reset-/Step-Baseline begrenzt
- 2-/4-Worker, Mehr-Env-/VecEnv und PPO-Baseline sind dort jetzt ausdruecklich ausgeschlossen

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

Status 2026-04-22:

- dokumentarisch umgesetzt
- `BT92` ist im aktiven Bot-Trainingsplan jetzt explizit auf Observation-/Action-Authority, genau ein headless Env, `reset()`/`step()`/`close()` und sichtbare JS-authoritative Semantikfelder begrenzt
- Mehr-Env, VecEnv, PPO-Baseline und Parallelisierungsversprechen sind dort jetzt ausdruecklich ausgeschlossen

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

Status 2026-04-22:

- dokumentarisch umgesetzt
- `BT93` bis `BT95` sind jetzt an reale Vorlaeufer-Evidence, Freeze-Handover, No-go-Regeln und den offenen `BT80C 80.9.3`-Restblocker gebunden

## Empfohlene Untersuchungsreihenfolge fuer die naechsten Sessions

### Session A - Dokumenten- und Governance-Audit

Ziel:

Phase 0 vollstaendig abschliessen.

Ergebnis:

- harmonisierte Taxonomie
- eindeutige Startlogik
- bereinigte spaetere Rollendefinitionen

Status 2026-04-22:

- abgeschlossen

### Session B - Contract- und Authority-Audit

Ziel:

Phase 1 abschliessen.

Ergebnis:

- klarer Authority-Snapshot
- dokumentierte Drift-Regeln
- eindeutige Entscheidung zu `V101`

Status 2026-04-22:

- abgeschlossen

### Session C - BT90-Startblock final zuschneiden

Ziel:

Phase 2 als claimbaren Vorbereitungsstand erreichen.

Ergebnis:

- professionell kleiner BT90-Wahrheitsblock
- keine versteckte Sidecar- oder Worker-Last

Status 2026-04-22:

- abgeschlossen

### Session D - BT91-Vorbereitung

Ziel:

Phase 3 als enger Integrationsblock vorbereiten.

Ergebnis:

- deterministischer 1-Worker-Pfad als einziges Ziel

Status 2026-04-22:

- abgeschlossen

### Session E - BT92-Vorbereitung

Ziel:

Phase 4 als sauberer Single-Env-Block vorbereiten.

Ergebnis:

- klare Semantikuebernahme
- keine voreilige Parallelisierung

Status 2026-04-22:

- abgeschlossen

### Session F - BT93-BT95 Re-Baselining

Ziel:

Phase 5 dokumentarisch abschliessen.

Ergebnis:

- `BT93` an echte `BT92`-Evidence, Repo-Bauorte und gemessene Budgets gebunden
- `BT94` mit Monolith-Guardrail zwischen Freeze und externer Evidence versehen
- `BT95` als doc-only Handoff mit explizitem `BT80C 80.9.3`-Restblocker verschaerft

Status 2026-04-22:

- abgeschlossen

## Klare Handlungsempfehlung

Wenn BT90 nach Phase 0 bis Phase 4 professionell weitergezogen werden soll, lautet die Reihenfolge:

1. Den Snapshot aus Phase 1 bis zum ersten Claim als bindenden Freeze behandeln.
2. Wenn `V101` oder anderer Scope relevante Authority-/Adjacent-Dateien aendert, zuerst Phase 1 per Re-Audit erneuern.
3. `BT91` und `BT92` auf genau diesem Zuschnitt halten und keine Mehr-Worker-, Mehr-Env-, VecEnv- oder PPO-Arbeit in die Bloecke zurueckziehen.
4. `BT92` nur mit frischer Snapshot-Bestaetigung claimen, falls Authority- oder Adjacent-Dateien seit dem Freeze gedriftet sind.
5. `BT93` bis `BT95` weiter nur auf Basis echter Vorlaeufer-Evidence behandeln; ohne gruene `BT90`- bis `BT92`-Artefakte bleiben sie rolling drafts.
6. Einen spaeteren produktiven Rollout erst nach `BT104=promote`, gruener produktionsnaher Validation und explizitem User-Entscheid diskutieren.

## Abschlussurteil

BT90 ist heute **kein schlechter Draft**, aber noch **kein hart professionell startklarer Ausfuehrungspfad**.

Der richtige naechste Schritt ist daher nicht direkte Umsetzung ausserhalb des aktiven Plans, sondern:

- Freeze halten und Restrisiken aus Phase 1.5 kontrollieren
- die jetzt zugeschnittenen `BT91`- und `BT92`-Bloecke nicht wieder aufweiten
- Phase 5 als evidenzbasiertes Re-Baselining fuer `BT93` bis `BT95` vorbereiten
- erst danach weitere operative Uebernahme im aktiven Bot-Trainingsplan fortsetzen
