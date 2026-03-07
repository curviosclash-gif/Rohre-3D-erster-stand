# Archiv: Phase 17 (V17 Kernmodule weiter modularisieren)

**Datum des Abschlusses:** 2026-03-04

## Ziel

- Fokus: `main.js`, `EntityManager.js`, `Bot.js` weiter in kleine, KI-freundliche Module splitten; Hotpath-Performance absichern.
- Referenzplan: `docs/Feature_Modularisierung_Kernmodule_2Agenten.md`.

## Abgeschlossene Aufgaben (Parallelblock V17)

- Rollenmodell:
  - Agent A implementiert Phasen `20.x` und fuehrt **keine** Tests aus.
  - Agent B kontrolliert, fuehrt Tests aus und gibt Gates `Q0..Q3` frei.

- [x] 20.0 Vorbereitende Leitplanken (Scope-Hygiene + Contracts + Hotpath-Guardrails)
- [x] 20.1 EntityManager Split A (SpawnPlacementSystem, CollisionResponseSystem, HuntCombatSystem)
- [x] 20.2 main.js Split B (MatchSessionRuntimeBridge, PlanarAimAssistSystem, BuildInfo-Kapselung)
- [x] 20.3 Bot.js Split C (BotProbeOps, BotPortalOps, BotThreatOps)
- [x] 20.4 Abschluss + Doku-Freeze (`docs:sync`, `docs:check`)

- QA-Gates (Agent B):
  - [x] Q0 Baseline/Import-Gate
  - [x] Q1 Entity/Hunt-Regression-Gate
  - [x] Q2 Runtime/UI-Regression-Gate
  - [x] Q3 Bot-Behavior-Gate + Endabnahme
