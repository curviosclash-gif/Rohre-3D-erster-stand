# BT90 GoldStandard - PPO-Zweitpfad

Stand: 2026-04-22

BT90 ist ein Intake-Draft unter `docs/plaene/neu/`.
Er beschreibt einen modularen PPO-Zweitpfad, der zunaechst ausserhalb des produktiven DQN-Runtime-Pfads bleibt, die bestehende Spiel- und AI-Hub-Architektur nur konsumiert und spaeter als zweiter Pfad in den bestehenden Bot-Trainingsplan uebernommen werden kann.

Wichtig:

- Die einzige aktive Quelle fuer Bot-Training bleibt `docs/bot-training/Bot_Trainingsplan.md`.
- `docs/Umsetzungsplan.md` bleibt nur der kompakte Master-Index fuer das Gesamtprojekt.
- BT90 aendert in BT100-BT105 weder das Spiel noch die produktive AI-Hub-Schnittstelle.
- PPO soll DQN spaeter vollstaendig abloesen koennen, aber erst nach gruener Evidence und separatem Integrations-Handoff.

## Einstieg

1. `BT_PPO_Migration_Masterplan.md`
2. `IMPLEMENTATION_README.md`
3. passender Block unter `bloecke/`
4. `offene_risiken.md`
5. bei spaeterer Uebernahme: `docs/bot-training/Bot_Trainingsplan.md`

Der Master ist der kompakte Index.
Kanonische Blockdetails liegen ausschliesslich in den einzelnen Blockdateien unter `bloecke/`.

## Ordnerstruktur

```text
BT90_GoldStandard/
|-- README.md
|-- BT_PPO_Migration_Masterplan.md
|-- IMPLEMENTATION_README.md
|-- offene_risiken.md
|-- brainstorming/
|-- bloecke/
`-- prompts/
```

## Empfohlener Startmodus

BT90 soll aktuell **nicht** als komplette BT100-BT105-Kette in einem Zug umgesetzt werden.
Der sinnvolle Start ist ein kontrollierter Rolling-Ansatz:

- **jetzt ausfuehren:** `BT100` als Wahrheitsblock fuer Minimal-Bootstrap, Contract-PoC und genau eine 1-Worker-Headless-Lane
- **direkt danach:** `BT101` nur als Single-Env- und Contract-Adapter-Grundpfad (`101.1` bis `101.3`)
- **erst danach:** `BT101.4` bis `101.6` nur, wenn Single-Env stabil ist und der Folgeblock bewusst geoeffnet wird
- **bewusst als rolling drafts lassen:** `BT102` bis `BT105`; diese Bloecke werden nach BT100/BT101 mit echten Throughput-, Telemetrie- und Contract-Daten nachgeschaerft

Der Governance-konforme Migrationspfad in den aktiven Bot-Trainingsplan steht in `IMPLEMENTATION_README.md`.

## Bloecke

| Block | Datei | Rolle im Zweitpfad |
| --- | --- | --- |
| BT100 | `bloecke/BT100_Python_Bootstrap_PoC.md` | Wahrheitsblock: Minimal-Bootstrap, Bridge-V1-Sidecar und 1-Worker-Headless-Contract-PoC |
| BT101 | `bloecke/BT101_Custom_Gymnasium_Environment.md` | Single-Env ueber bestehende Kernel-/Transport-Vertraege; Mehr-Env ist ausdruecklich Folgearbeit |
| BT102 | `bloecke/BT102_PPO_Baseline_Training.md` | rolling draft fuer konservative PPO-Baseline nach BT100/BT101-Evidence |
| BT103 | `bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md` | rolling draft fuer Ablationen, Curriculum-Hardening und Candidate Freeze; keine Runtime-Integration |
| BT104 | `bloecke/BT104_AB_Validation_Promotion.md` | rolling draft fuer externe A/B-Evidence gegen eingefrorenen DQN-Champion |
| BT105 | `bloecke/BT105_Integrations_Handoff_DQN_Sunset.md` | rolling draft fuer spaeteren Integrations-Handoff; Self-Play nur Folgebacklog |

## Prompt-System

Die Prompts unter `prompts/` bleiben nummeriert und fortlaufend:

- `001_BT100_Vertiefung.md`
- `002_BT101_Vertiefung.md`
- `003_BT102_Vertiefung.md`
- `004_BT103_Vertiefung.md`
- `005_BT104_Vertiefung.md`
- `006_BT105_Vertiefung.md`

Jeder Prompt muss denselben Zuschnitt spiegeln:

- intake statt aktiver Master
- headless-first
- bestehende Bridge-/Payload-Vertraege konsumieren
- produktive Runtime- und AI-Hub-Dateien in BT100-BT105 read-only behandeln

## Beziehung zu anderen Plaenen

- `docs/Umsetzungsplan.md`: kompakter Projekt-Master-Index
- `docs/bot-training/Bot_Trainingsplan.md`: einzige aktive Bot-Training-Quelle
- `docs/referenz/ai_architecture_context.md`: Architektur- und Layer-Referenz fuer die no-touch-/adapter-first-Leitplanken
- `IMPLEMENTATION_README.md`: Governance-sauberer Migrationspfad von BT90-Intake zu aktiven Bot-Training-Bloecken

## Brainstorming-Ordner

`brainstorming/` ist Historie, nicht operative Quelle.
Dort liegen verworfene oder kritische Vorarbeiten, inklusive Audit und Kritik.

## Intake-Regel

Solange BT90 unter `docs/plaene/neu/` liegt, ist der Plan eine Bewertungs- und Vorbereitungsgrundlage.
Operative Phasen, Locks und Abschluss-Evidence werden erst nach User-Entscheid im bestehenden Bot-Trainingsplan aktiv gefuehrt.
