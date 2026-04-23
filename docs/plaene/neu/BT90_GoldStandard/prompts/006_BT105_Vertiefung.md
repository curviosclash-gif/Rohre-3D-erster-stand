# Prompt 006: BT105-Vertiefung (Integrations-Handoff und DQN-Sunset-Vorbereitung)

## ROLLE

Du vertiefst BT105 im BT90-PPO-Zweitpfad.
Der Block soll den spaeteren Integrationspfad vorbereiten, aber nicht vorwegnehmen.

## VORSTART / GATE

Bevor du block-spezifisch arbeitest, lies zwingend:

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/prompts/000_BT90_Followup_Loop.md`

Wenn im Tracker ein hoeher priorisierter offener oder blockierter Punkt existiert, dessen Abhaengigkeiten bereits erfuellt sind, bearbeite nicht direkt BT105 weiter.
Arbeite stattdessen den naechsten faelligen Tracker-Punkt ab, aktualisiere Status, `Wie erledigt`, Evidence und Verweise und gib danach wieder einen `NEXT_PROMPT` im selben Standard aus.

## KONTEXT (LIES IN DIESER REIHENFOLGE)

### Pflicht-Lektuere

1. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
2. `docs/plaene/neu/BT90_GoldStandard/BT_PPO_Migration_Masterplan.md`
3. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md`
4. `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md`
5. `docs/plaene/neu/BT90_GoldStandard/offene_risiken.md`
6. `docs/bot-training/Bot_Trainingsplan.md`
7. `docs/referenz/ai_architecture_context.md`

### Optional bei Bedarf

- `src/entities/ai/ObservationBridgePolicy.js`
- `src/core/RuntimeConfig.js`
- `src/entities/ai/BotPolicyRegistry.js`
- `src/entities/ai/BotPolicyTypes.js`
- `src/entities/ai/inference/**`

## WAS DU TUN SOLLST

### Phase 1: Analyse

- pruefe, ob BT105 wirklich nur Handoff, Touchpoints, Rollout und Rollback beschreibt
- suche nach Stellen, an denen Self-Play oder Runtime-Integration noch Teil des Kernpfads sind
- pruefe, ob die Voraussetzungen fuer eine spaetere DQN-Ablosung klar und hart genug sind
- pruefe, ob BT105 nur bei `BT104=promote` als echter Integrationskandidat oeffnet

### Phase 2: BT105 ausarbeiten oder schaerfen

- dokumentiere Touchpoints fuer einen spaeteren aktiven Integrationsblock
- halte Rollout-, Rollback- und Sunset-Regeln fest
- trenne Self-Play und weitere Forschung explizit in einen Folgebacklog aus
- formuliere klar, dass die finale DQN-Ablosung einen User-Entscheid braucht
- halte bei `hold`, `rollback` oder `diagnose` explizit fest, warum **kein** aktiver Integrations-Intake entsteht

## LEITPLANKEN

- Keine produktiven Codeaenderungen in BT105.
- Kein automatischer Champion-Wechsel.
- Ohne gruene produktive Validation-Lane kein ehrlicher Sunset-Handoff.

## PFLICHT-AUSGABE

### A. Aenderungsliste

Welche BT105-Abschnitte wurden geschaerft, ersetzt oder entfernt?

### B. Offene Risiken und Loesungsansaetze

Welche Integrations- oder Sunset-Risiken bleiben offen?

### C. Naechste sinnvolle Schritte

Welche Voraussetzungen muessen vor einer echten Uebernahme in den aktiven Bot-Trainingsplan noch stehen?

### D. Folge-Prompt

Erzeuge am Ende nur dann einen Folge-Prompt, wenn ein weiterer klar abgegrenzter Integrations- oder Backlog-Block identifiziert wurde.
