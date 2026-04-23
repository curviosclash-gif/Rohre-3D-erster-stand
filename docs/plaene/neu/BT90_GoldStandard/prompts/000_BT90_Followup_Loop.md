# Prompt 000: BT90 Follow-up Loop

Du arbeitest im Repo `d:\Antigravity\Projekte\Neuer Ordner (6)` am PPO-Zweitpfad ab `BT90`.

## Ziel dieses Prompts

Dieser Prompt ist der verbindliche Start fuer alle Follow-up-Loops nach dem Audit vom 2026-04-23.
Er startet **nicht** mit neuer PPO-Feature-Arbeit.
Er arbeitet zuerst die offenen Review-Befunde aus `BT90_Followup_Tracker_2026-04-23.md` ab.

## Pflichtlektuere

1. `AGENTS.md`
2. `.agents/rules/planning_and_governance.md`
3. `.agents/rules/token_efficiency_and_tools.md`
4. `.agents/workflows/bot-training-plan.md`
5. `docs/bot-training/Bot_Trainingsplan.md`
6. `docs/Umsetzungsplan.md`
7. `docs/referenz/ai_architecture_context.md`
8. `docs/plaene/neu/BT90_GoldStandard/BT90_Followup_Tracker_2026-04-23.md`
9. `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
10. `docs/plaene/neu/BT90_GoldStandard/BT90_Integrationsaudit_und_Startplan_2026-04-22.md`
11. `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

## Arbeitsregel

Bearbeite pro Durchlauf genau den hoechstpriorisierten offenen Punkt aus `BT90_Followup_Tracker_2026-04-23.md`, dessen Abhaengigkeiten bereits erfuellt sind.

Wenn Voraussetzungen rot sind:

- behebe zuerst Repo-, Doku-, Freeze- oder Scope-Probleme
- starte **keine** BT93-, PPO-Baseline-, Freeze- oder A/B-Arbeit

Wenn ein Punkt erledigt ist, aktualisiere im Tracker zwingend:

- `Status`
- `Erledigt am`
- `Wie erledigt`
- `Evidence`
- `Dateien / Verweise nach Erledigung`
- `Abarbeitungslog`

## Harte No-Gos

- Kein `BT93`-Claim, solange `BTF-01` bis `BTF-06` nicht gruen sind.
- Kein "repo-versioniert" fuer untracked oder nicht belastbar nachgewiesene Arbeit.
- Kein stilles Drift-Kapseln im Python-Pfad.
- Keine Evidence nur ueber `git status` oder mutable README-Texte.
- Keine Writes an read-only Runtime-, Matchstart- oder AI-Hub-Surfaces ohne neuen Intake.

## Startpunkt dieses Loops

Starte mit:

1. `BTF-01` Repo-Wahrheit vs. behauptete repo-versionierte BT91/BT92-Evidence
2. direkt danach `BTF-02` Lock-/Status-Widersprueche
3. direkt danach `BTF-03` veraltete Aussagen zum fehlenden Python-/PPO-Bauort

Erst wenn diese drei Punkte sauber sind, gehe weiter zu:

4. `BTF-04` Freeze-/Re-Audit-Haertung
5. `BTF-10` Evidence-Haertung
6. `BTF-06` BT93-Neuzuschnitt

## Erwartete Abschlussausgabe je Durchlauf

Die Antwort am Ende jedes Durchlaufs muss enthalten:

- `Status`
- `Bearbeiteter Punkt`
- `Aenderungen`
- `Evidence`
- `Offene Risiken`
- `Naechster sinnvoller Punkt`
- `NEXT_PROMPT`

## NEXT_PROMPT-Regel

`NEXT_PROMPT` muss wieder im selben Standard formuliert sein:

- derselbe Repo-Kontext
- derselbe Tracker als Arbeitsliste
- aktualisierter Startpunkt auf den naechsten offenen sinnvollen Punkt
- Pflicht, den Tracker erneut zu aktualisieren
