# Bot Trainingsplan (Aktiver Master)

Stand: 2026-04-25

Dieser Plan ist die einzige aktive Quelle fuer Bot-Training.
Allgemeine Architektur-/Gameplay-Arbeit bleibt in `docs/Umsetzungsplan.md`.
Roadmap-Horizont fuer kommende Trainingsfenster: `docs/bot-training/Bot_Trainings_Roadmap.md`.

## Status-Legende

- [ ] Offen
- [/] In Bearbeitung
- [x] Abgeschlossen

## Governance-Regeln (verbindlich)

1. `*.99`-Gates duerfen nur `[x]` sein, wenn alle vorherigen Phasen desselben Blocks `[x]` sind.
2. Jeder abgeschlossene Phasenpunkt (`[x]` mit ID) braucht Evidence:
   - `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`
3. Jeder aktive Block hat genau einen `LOCK`-Header, eine `Definition of Done (DoD)` und ein Risiko-Register.
4. Bot-Training-Phasen werden nur hier gepflegt, nicht in `docs/Umsetzungsplan.md`.
5. `docs/plaene/neu/BT90_GoldStandard/**` bleibt Referenz- und Handoff-Material; aktive PPO-Phasen werden nur als BT90-BT95 in diesem Master gefuehrt.
6. Fuer BT90-BT95 bleibt `docs/referenz/ai_architecture_context.md` die autoritative Layer-Quelle; produktive Runtime-/AI-Hub-Surfaces sind bis zu einem spaeteren Integrationsblock read-only.

## Zielbild (Survival First)

- Primaeres Ziel: Bot-Ueberlebenszeit deutlich steigern.
- Leit-KPI 1: `avgStepsPerEpisode` mindestens +30% gegen Baseline.
- Leit-KPI 2: `averageBotSurvival` aus einer PPO-spezifischen Validate-Lane mindestens +30% gegen Baseline.
- Stabilitaets-KPI: `runtimeErrorCount = 0`, Gate bleibt gruen.
- Baseline-Pflicht: Vor `93C.5` muss genau ein Baseline-Buendel mit Baseline-ID, Datum, Command, Seeds, Modi, Maps, Semantikfenster, DQN-Champion und Artefaktpfaden fixiert sein. Alte Reports wie `data/bot_validation_report.json` ohne PPO-Kandidat und ohne aktuelles Publish-Command zaehlen nicht als PPO-Baseline oder PPO-Qualitaet.
- Survival-Evidence ist nur closure-faehig, wenn sie versioniert ist (`data/**` oder `docs/**`) und die konkrete Vergleichsbasis nennt; `tmp/**`, Durchsatzwerte, Scaffold-Reports und Plan-Selbstzaehlungen sind keine Survival-Evidence.

## Report-Modi und PPO-Validate-Lane

- `npm run bot:validate` schreibt Standard-Reports lokal nach `tmp/` (nicht versioniert).
- `npm run bot:validate:publish` schreibt zusaetzlich Evidence nach `data/bot_validation_report.json` sowie einen Tagesreport unter `docs/` (Dateiname `Testergebnisse_Phase4b_<Datum>.md`).
- Der bestehende `bot:validate`-/BT80C-Pfad bleibt historische DQN-/Produktionskontext-Lane und ist keine harte PPO-Promotion-Voraussetzung mehr.
- PPO bekommt eine eigene Validate-Lane in `BT94B.3`: Kandidat/Modellhash, Normalize-State, Config, Semantikfenster, Seeds, Modi, Maps, Runtime-/Failure-Klassen und `averageBotSurvival` muessen dort PPO-spezifisch geschrieben und versioniert werden.
- Bis diese Lane existiert, darf kein PPO-Ergebnis `promote`, `rollout-ready` oder `BT95-Handoff-ready` heissen; erlaubte Urteile bleiben `hold`, `diagnose`, `external-candidate` oder `ppo-validate-missing`.

## PPO-Zweitpfad (BT90-BT95)

Die Analyse des BT90-Drafts aus `docs/plaene/neu/BT90_GoldStandard/` wird hier nicht als Direktuebernahme von `BT100` bis `BT105` gespiegelt.
Der aktive Zuschnitt folgt stattdessen dem Rolling-Intake aus `IMPLEMENTATION_README.md`: kleine claimbare Bloecke `BT90` bis `BT95`, damit der Bot-Trainingsplan die einzige operative Quelle bleibt und kein zweiter Wahrheitsraum entsteht.

Cross-Plan-Fit zu `docs/Umsetzungsplan.md`:

- `docs/Umsetzungsplan.md` bleibt kompakter Gesamtprojekt-Index und fuehrt weiterhin keine Bot-Training-Phasen.
- Die dort geltenden Surface-/Ownership-Ratchets aus `V77`, `V91` und `V92` bleiben fuer den PPO-Zweitpfad bindend.
- `V101` ist seit 2026-04-24 abgeschlossen und beruehrte auch `TrainingDomain`, `ObservationBridgePolicy`, `RuntimeNearObservationAdapter`, `HybridDecisionArchitecture`, `RuntimeConfig` und `docs/referenz/ai_architecture_context.md`; vor `93C.6` muss ein V101-Folgecheck pruefen, ob PPO-Contracts, Observation/Reward/Safety-Semantik oder Authority-Listen invalidiert wurden.

## Audit-Haertung 2026-04-24

| Befundsklasse | Verbindliche Planfolge |
| --- | --- |
| Contract-Freeze mit rotem Artefakt | Vor echtem PPO-Learner muss `93C.0` `bt90_freeze_check.py` mit `freezeOk=true` nachweisen; `Exit-Code 1`/`reAuditRequired=true` zaehlt nicht als gruenes Startsignal. |
| Evidence- und Lock-Hygiene | `93C.0` bereinigt `[x]` ohne Evidence, Lock-Tabellen-/Header-Widersprueche, unversionierte PPO-Artefakte, `tmp/`-Only-Evidence, Selbstzaehlungs-Gates und offene `mojibake`-Warnungen. |
| DQN-Gold-Standard ist operativ haerter | PPO darf erst ab `93C.4`/`94B` als methodisch vergleichbar gelten, wenn Safety-, Intent-, Recovery-, Reward-, Death-/Terminal- und PPO-Validate-Metriken auf derselben Matrix sichtbar sind. |
| Sidecar bleibt Sidecar | BT90-BT95 liefern Training, Evidence und Handoff; produktive PPO-Inference in JS, Runtime-Flag, Rollback und Modellregistry bleiben separater Rollout-Block. |
| Throughput ist kein Lernbeweis | BT93A-Throughput oeffnet nur die machbare Lane; Baseline-, Freeze- oder Promotion-Aussagen brauchen echten PPO-Learner, Eval, Holdout und Repro-Evidence. |
| VecNormalize/Heads muessen real sein | Manifest-Spezifikation reicht nicht; BT93C muss Normalize-State, Optimizer-State und Actor/Critic-Head-Implementierung in Train, Eval und Resume beweisen. |
| Startfreigabe ist klein | Naechste Arbeit ist `BT93C.0` und danach `93C.1`/`93C.2`; kein Langlauf und keine Baseline vor sauberem Freeze-, Dependency-, Action- und Matrix-Gate. |
| PPO-Validate wird eigenstaendig | BT80C `80.9.3` wird nicht mehr als harte PPO-Validate-Abhaengigkeit verwendet; `BT94B.3` baut und bewertet eine eigene PPO-Validate-Lane. |
| V101 kann PPO-Contracts verschoben haben | Vor DQN/PPO-Vergleich muss `93C.6` pruefen, ob der abgeschlossene V101-Ratchet Observation, Reward, Safety, RuntimeConfig oder Authority-Dateien fuer PPO veraendert hat. |

Audit-Befund-Matrix 2026-04-24:

| ID | Klasse | Plananker | Konsequenz |
| --- | --- | --- | --- |
| A.01 | kritisch | `93C.0.3`, `93C.0.4` | Rotes Freeze-Artefakt blockiert jeden Learner-Start, bis `freezeOk=true` und Evidence-Hygiene gruen sind. |
| A.02 | kritisch | `93C.4`, `94B.1` bis `94B.4` | PPO gilt erst als methodisch vergleichbar, wenn Safety-, Intent-, Recovery-, Reward-, Death-/Terminal- und PPO-Validate-Metriken auf gleicher Matrix liegen. |
| A.03 | kritisch | `BT95`, spaeterer separater Rollout-Intake | Kein JS-Runtime-Inferenzpfad in BT93C-BT95; Training bleibt Sidecar, Runtime-Umschaltung bleibt verboten. |
| A.04 | kritisch | `94B.3`, `95.4` | Fehlende PPO-Validate-Lane blockiert `promote` und jeden operativen Rollout-Intake; BT80C `80.9.3` bleibt nur Alt-/Produktionskontext. |
| A.05 | kritisch | `93C.4.3`, `94A.2`, `94B.1` | Offene BT73-Intent-/Recovery-Haertung bleibt als Restschuld in PPO/DQN-Vergleichen sichtbar. |
| A.06 | kritisch | `93C.3`, `93C.99.2` | BT93B-Scaffold zaehlt nicht als Lernfortschritt; echter PPO-Optimizer-Update ist Pflicht. |
| A.07 | kritisch | `93C.3.1`, `93C.3.2`, `94A.3.2` | Normalize-/Optimizer-State und Actor/Critic-Heads muessen real gespeichert, geladen, gehasht und resumed werden. |
| A.08 | kritisch | `93C.2` | SB3-trainierbare Action-Surface ist Pflicht; Sanitizer-Fallbacks duerfen keine Policy-Qualitaet simulieren. |
| A.09 | kritisch | `93C.2.2`, `93C.4.2`, `94B.2` | Sanitizer-/Mask-/Veto-/Invalid-Action-Raten werden Gate-Metriken in Train, Eval und A/B. |
| A.10 | kritisch | `93C.5`, `93C.99.3` | `4-Env` bleibt gesperrt, bis direkte Evidence vorliegt; 2-Env-Schwellen reichen nicht. |
| A.11 | kritisch | `93C.3.3`, `BT95`, spaeterer Rollout-Intake | Python-Forward-Pass ist kein JS-Tick-Latenzbeweis; Latenzbudget bleibt Rollout-Blocker. |
| A.12 | kritisch | `95.1`, `95.2`, `95.4` | Runtime-Flag, Rollback-Test, Modellregistry und Export-/Load-Vertrag werden als Rollout-Voraussetzungen dokumentiert, nicht im Training versteckt. |
| B.01 | logik | `93C.5` | Throughput ist nur Lane-Evidence; Pilot/Baseline starten erst nach Learner- und Diagnose-Gates. |
| B.02 | logik | `93C.0.3` | BT93A/BT93B-Handover muss gegen frisches `freezeOk=true` revalidiert werden. |
| B.03 | logik | `93C.0.1`, `93C.0.2` | Erfuellte Upstream-Abhaengigkeiten bleiben formal, aber nicht train-ready, bis Freshness und Gate-Disziplin bereinigt sind. |
| B.04 | logik | `94B.1.2`, `94B.2.1`, `94B.99.2` | Drei Runs sind Mindestbasis, aber Urteil braucht Episodenzahl, Streuung, Median-Delta, Holdout und Stability. |
| B.05 | logik | `94B.3.2`, `95.4.2` | PPO-Validate ist fuer `promote` hard; positive A/B-Evidence ohne PPO-Validate bleibt nur externer Kandidat. |
| B.06 | logik | `93C.0.2`, `93C.3`, `93C.5` | Begriff `Baseline-Scaffold` darf nicht als Baseline verstanden werden; Reports labeln Scaffold/Pilot/Baseline hart getrennt. |
| B.07 | logik | `93C.6`, `94B.1` | DQN-Champion und Semantikfenster werden eingefroren; Vergleich gegen historisch stabilen, aber ggf. semantisch veralteten Champion wird offengelegt. |
| C.01 | luecke | `93C.1` | PPO-Dependency-Lock und Clean-Env-Smoke sind Pflicht vor jedem Learner. |
| C.02 | luecke | `93C.3`, `93C.7`, `94A.3.2` | Echtes PPO-Modellpaket mit Modellhash, Confighash, Git-SHA, Optimizer- und Normalize-State wird Closure-Pflicht. |
| C.03 | luecke | `93C.0.5`, `93C.6.1` | DQN-Champion, Semantikfenster, Seeds, Modi, Maps, Holdout und Invalidierungsregeln muessen im Startmanifest stehen. |
| C.04 | luecke | `93C.4.1` | KL, Entropy, Clip-Fraction, Value-Loss, Grad-Norm und Collapse-Schwellen werden Report-Pflicht. |
| C.05 | luecke | `93C.4.2`, `94A.2` | Reward-Hacking, Episode-Shortening, Death-/Terminal- und Safety-Overrule-Diagnostik werden Pflicht. |
| C.06 | luecke | `95.1`, `95.4` | Exportformat und JS-kompatible Modellausfuehrung bleiben harte Rollout-Voraussetzung. |
| C.07 | luecke | `95.2`, `95.4` | Warmup-, Timeout-, Fallback- und Max-Latency-Regeln muessen vor Runtime-Aktivierung dokumentiert und getestet werden. |
| C.08 | luecke | `95.1`, `95.2` | Modellregistry koppelt Modellhash, Confighash, Normalize-State, Registry-ID und Semantikfenster. |
| D.01 | governance | `93C.0.4` | Untracked PPO-Artefakte muessen versioniert oder eindeutig lokal markiert werden. |
| D.02 | governance | `93C.0.4` | `tmp/`-Only-Evidence wird fuer Closure ersetzt oder als nicht closure-faehig markiert. |
| D.03 | governance | `93C.0.4`, `DoD.10` | Offene `mojibake`-Warnungen duerfen nicht als sauberer Abschluss ignoriert werden. |
| D.04 | governance | `93C.0.2`, `93C.0.4` | Selbstzaehlungs-Gates wie `completed_phase_items` zaehlen nicht als alleinige Closure-Evidence. |
| D.05 | governance | `93C.0` | BT93C startet mit Plan-Wahrheit, Lock-/Header-Abgleich, Evidence-Hygiene und BTF-Statusbereinigung. |

Audit-Sanierungsregister 2026-04-24:

| ID | Severity | Befund | Planverankerung | Exit-Kriterium |
| --- | --- | --- | --- | --- |
| F.01 | kritisch | Es gibt noch kein echtes PPO-Lernen; BT93B ist Scaffold-only. | `93C.3`, `93C.99.2` | `model.learn(...)` oder gleichwertiger PPO-Optimizer-Update, echtes Modellpaket und Lernmetriken liegen vor. |
| F.02 | kritisch | PPO-Dependencies sind nicht reproduzierbar gepinnt; lokaler venv-Stand darf nicht als Planwahrheit gelten. | `93C.1.2`, `93C.1.3` | Lock/Requirements, Clean-Env-Install, `pip check` und Import-Smoke sind versioniert. |
| F.03 | kritisch | Action-Surface ist nur als Manifest/Spec sichtbar, nicht als SB3-trainierbares Interface. | `93C.2` | Wrapper/Policy-Entscheid laeuft im Train-/Eval-Pfad und misst Mask-/Veto-/Invalid-Raten. |
| F.04 | kritisch | Normalize-State, Optimizer-State und Actor/Critic-Heads sind bisher nicht real als PPO-State bewiesen. | `93C.3.1`, `93C.3.2`, `93C.7.2` | Modell, Optimizer, Normalize, Config und Hashes werden gespeichert, geladen und resumed. |
| F.05 | kritisch | Survival-First ist fuer PPO nicht belegt; alter `bot:validate`-Report ist keine PPO-Evidence. | `93C.1.4`, `93C.5.4`, `94B.2` | Baseline-ID und PPO-Vergleich liefern `avgStepsPerEpisode`/`averageBotSurvival` gegen dieselbe Matrix. |
| F.06 | kritisch | PPO hat noch keine eigene Validate-Lane; BT80C `80.9.3` darf diese Luecke nicht stellvertretend blockieren oder ersetzen. | `94B.3`, `95.4` | Promote oeffnet nur mit gruener PPO-Validate-Evidence einen echten Handoff; BT80C bleibt Alt-/Produktionskontext. |
| F.07 | hoch | Direkte `4-Env`-Evidence fehlt; 2-Env-Schwelle reicht nicht. | `93C.5`, `93C.99.3` | `4-Env` wird nur nach eigenem versionierten 4-Env-Artefakt genutzt. |
| F.08 | hoch | Throughput wird leicht als Lernbeweis missverstanden. | `93C.5.1`, `93C.6` | Durchsatz bleibt nur Budget-/Lane-Evidence; Modellqualitaet kommt aus Eval/Holdout. |
| F.09 | hoch | Historische BT90-Closure enthielt rotes Freeze-Signal; aktuelle Freigabe darf nur aus frischem Freeze kommen. | `93C.0.3`, `93C.1.1` | Start basiert auf `freezeOk=true`, nicht auf altem roten Artefakt. |
| F.10 | hoch | Stale `untracked`-/README-Hinweise widersprechen aktueller versionierter Artefaktlage. | `93C.1.1`, `93C.7.3` | Plan/README/Artefakttexte widersprechen der Git-Lage nicht mehr. |
| F.11 | hoch | `tmp/**` ist nicht closure-faehig, auch wenn lokale Spuren existieren. | `93C.1.1`, `93C.7.3`, `94B.99.2` | Closure-Evidence zeigt auf versionierte Artefakte; `tmp` nur Zusatzspur. |
| F.12 | hoch | DQN-Champion, Semantikfenster und Holdout sind reserviert, aber noch nicht apples-to-apples ausgefuehrt. | `93C.6`, `94B.1` | Champion, Seeds, Modi, Maps, Holdout und Invalidierungsregeln sind eingefroren. |
| F.13 | hoch | Drei A/B-Laeufe allein sind statistisch schwach. | `94B.1.2`, `94B.2` | Episodenzahl, Mindestdelta, Streuung, Holdout und Non-Inferiority sind vor Laufstart fixiert. |
| F.14 | hoch | `bot:validate` ist noch nicht PPO-spezifisch mit Kandidat, Modellhash, Normalize-State und Semantikfenster gekoppelt. | `94B.3`, `95.4` | PPO-Kandidat schreibt publish-faehige, versionierte PPO-Validate-Evidence oder bleibt `ppo-validate-missing`. |
| F.15 | hoch | Runtime-Handoff ist nicht Implementierung: kein JS-Inference-, Registry-, Flag-, Latenz- oder Rollback-Beweis. | `BT95`, spaeterer Rollout-Intake | BT95 bleibt doc-only; operative PPO-Aktivierung braucht separaten Block. |
| F.16 | mittel | Begriff `Baseline-Scaffold` ist gefaehrlich und muss in Reports hart getrennt bleiben. | `93C.1.1`, `93C.5` | Artefakte labeln `scaffold`, `pilot`, `baseline`, `candidate` eindeutig. |
| F.17 | mittel | `python/eval.py` ist aktuell Scaffold-Eval, keine echte Modell-Evaluation. | `93C.3.4`, `93C.6.2` | Eval laedt echtes Modellpaket und schreibt Vergleichsartefakte. |
| F.18 | mittel | `runtimeErrorCount=0` ist fuer PPO nur in kleinen Headless-/Python-Reports belegt, nicht in einer PPO-Validate-Lane. | `93C.4.4`, `94B.2`, `94B.3`, `95.4` | Crash-/Timeout-/Forced-/Runtime-Fehlerklassen werden in Reports und PPO-Validate auf `runtimeErrorCount` abgebildet. |
| F.19 | mittel | Death-/Terminal-Klassen sind sichtbar, aber noch nicht diagnostisch belastbar; Smokes enden oft per `max-steps`. | `93C.4.2`, `93C.4.4` | Natuerliche Terminal-/Death-Cases und Survival-Verteilung werden als Gate-Matrix berichtet. |
| F.20 | mittel | Sanitizer-/Mask-/Veto-Raten fehlen als geschlossene Gate-Metriken. | `93C.2.2`, `93C.4.2`, `94B.2` | Policy-Fehler koennen nicht durch Clamp/Veto versteckt werden. |
| F.21 | mittel | Draft-Risiken und aktive Planlage koennen auseinanderlaufen. | `93C.1.1`, `93C.7.3`, `94A.2.3` | Risikoabgleich gegen `docs/plaene/neu/BT90_GoldStandard/**` ist im Handover dokumentiert. |
| F.22 | niedrig | `plan:check` ist Governance-/Syntax-Signal, kein semantischer PPO-Beweis. | alle `*.99` | Plancheck darf nie allein als Lern-, Baseline-, Holdout- oder Survival-Evidence gelten. |
| F.23 | mittel | Self-Count- oder Plan-Grep-Evidence ist schwach, wenn keine Artefakte darunter liegen. | `93C.1.1`, `93C.7.3` | Closure-Gates referenzieren konkrete Commands plus Artefaktinhalte, nicht nur Planzeilen. |
| F.24 | mittel | BT91-Shutdown-Failures sind plausibel klassifiziert, aber kein Langzeit-Stabilitaetsbeweis. | `93C.4.4`, `93C.5` | Laengere Runs fuehren Failure-Klassen fort; Teardown bleibt Monitoring, nicht Qualitaetsbeweis. |
| F.25 | mittel | Lokale venv-Pakete ohne Requirements-Pin sind Reproduzierbarkeitsluecke. | `93C.1.2`, `93C.1.3` | Frische Umgebung reproduziert denselben Stack ohne ambient dependencies. |
| F.26 | mittel | Baseline-Begriff ist mehrdeutig: Roadmap- und alter Validation-Report liefern verschiedene Survival-Werte. | `93C.1.4`, `93C.5.4`, `94B.1.2` | Genau eine Baseline-ID mit Metrikquelle und Semantikfenster wird vor Vergleich fixiert. |
| F.27 | kritisch | BT93C.5-Baseline ist ein technisches Paket, kein Qualitaetsnachweis: `16.0` Steps/Survival liegt deutlich unter dem DQN-Anker. | `93C.6`, `94A.1`, `94B.1` | DQN/PPO-Vergleich klassifiziert ehrlich `ppo-regression`/`hold`/`diagnose`; BT94A startet nur bei belastbarer Begruendung. |
| F.28 | kritisch | `averageBotSurvival` in BT93C.5 stammt aus interner runtime-near Eval-Laenge, nicht aus PPO-Validate. | `93C.6.2`, `94B.3` | Metrikquelle wird getrennt: interne Eval-Survival-Werte zaehlen nicht als Validate- oder Promotions-Evidence. |
| F.29 | kritisch | Holdout-Seeds sind reserviert, aber noch nicht verbraucht. | `93C.6`, `94A.99` | Kein Freeze-Kandidat ohne Holdout-Ergebnis und ohne dokumentierte Nicht-Nachoptimierung auf Holdout. |
| F.30 | hoch | Action-`mask` ist aktuell Post-Decode-Clamp/Telemetry, keine Policy-Level-Maskierung; hohe Mask-/Veto-Raten koennen Policy-Fehler verdecken. | `93C.6.2`, `94A.1.3`, `94B.2.3` | Reports unterscheiden `policy-mask` von `post-decode-clamp`; Kandidaten verlieren Freeze-Faehigkeit bei verdeckter Invalid-Action-Last. |
| F.31 | hoch | Episode-/Death-Semantik ist noch durch `max-steps` und leere Death-Cause-Klassen dominiert. | `93C.6.2`, `94B.2`, `94B.3` | Natural-Terminal-/Death-Cases und Survival-Verteilung werden vor Promotion als Gate-Matrix sichtbar. |
| F.32 | hoch | BT93C.5 nutzt extrem kleine Timesteps/Eval-Steps und hat keine statistische Urteilskraft. | `93C.6`, `94A.1`, `94B.1` | Mindest-Episodenzahl, Streuung, Seed-Matrix, Median und Abbruchkriterien werden vor Kandidatenlaeufen fixiert. |
| F.33 | hoch | Mutable `latest_*`-Pointer und Modellpakete sind keine Champion-Freeze-Evidence. | `93C.7.2`, `94A.3.2`, `95.2.4` | Freeze- und Rollout-Pakete referenzieren unveraenderliche Run-IDs, Hashes und Manifeste statt `latest` allein. |
| F.34 | hoch | V101 ist abgeschlossen und kann Shared-Contracts im PPO-Scope veraendert haben. | `93C.6.1`, `93C.7.2`, `94A.1.5` | V101-Folgecheck vergleicht Authority-/Schema-/Typ-Ratchets und markiert Drift als Blocker oder No-Op. |
| F.35 | mittel | Saubere `plan:check`-/Docs-Gates beweisen keine PPO-Semantik, kein Lernen und keine Validate-Faehigkeit. | alle `*.99`, `94B.99` | Closure trennt Governance-Gruen von semantischer Run-/Validate-Evidence. |
| F.36 | mittel | BT91/BT93A-Stabilitaets-Smokes sind zu kurz fuer Langzeitstabilitaet. | `93C.6.2`, `94A.3`, `94B.2` | Laengere Kandidatenlaeufe fuehren Teardown-/Socket-/Timeout-Klassen fort und duerfen Smokes nicht als Stabilitaetsbeweis verwenden. |
| F.37 | hoch | PPO-Validate-Bauort, Artefaktformat und Publish-Ziel sind noch nicht definiert. | `94B.3` | `BT94B.3` definiert Runner/Command, Report-Schema, versionierte Zielpfade und Fehlerklassen fuer PPO-Validate vor jedem Promote-Urteil. |

## PPO-Zielarchitektur und Arbeitszuschnitt

Ziel ist eine PPO-basierte Bot-KI, die nicht nur auf Reward oder Steps gewinnt, sondern messbar besser ueberlebt, stabil bleibt und spaeter kontrolliert in die Runtime integrierbar ist.

Qualitaetsdefinition fuer `fantastisch`:

- Survival gewinnt reproduzierbar gegen den eingefrorenen DQN-Champion auf derselben Seed-/Mode-/Map-/Holdout-Matrix.
- Safety bleibt sichtbar: `invalidActionRate`, Sanitizer-/Mask-/Veto-Rate, Death-/Terminal-Klassen, Crash-/Timeout-/Forced-Round-Klassen werden nicht schlechter.
- Lernen ist echt: PPO-Optimizer-Updates, Modellpaket, Normalize-/Optimizer-State, Actor/Critic-Heads, Lernmetriken und Resume sind nachgewiesen.
- Integration bleibt kontrolliert: Export-/Load-Vertrag, Runtime-Strategieflag, Modellregistry, Latenzbudget und Rollback werden nicht in Training versteckt, sondern als separater Rollout-Intake behandelt.

Mikro-Claim-Regel:

- Ein Claim loest genau eine Problemklasse und maximal zwei direkt benachbarte Subphasen.
- Kein `pilot`, `baseline`, `ablation`, `promote` oder Runtime-Intake wird gestartet, solange das vorherige Gate nicht gruen ist.
- Jeder Stop mit `diagnose`, `hold`, `throughput insufficient`, `freeze red` oder `validation blocked` ist ein gueltiges Ergebnis und darf nicht durch groessere Laeufe ueberdeckt werden.

| Problemklasse | Kleinster naechster Claim | Gruenes Ergebnis |
| --- | --- | --- |
| Freeze/Hygiene | `93C.0` | `freezeOk=true`, versionierte Artefakte, keine Self-Count-/`tmp`-Only-Gates, Startmanifest vorhanden |
| Dependency | `93C.1` | gepinnter PPO-Stack, Clean-Env-Smoke, `pip check`, Import-/Mini-Train-Smoke |
| Action-Surface | `93C.2` | SB3-trainierbares Interface, Sanitizer-/Mask-/Veto-Telemetrie messbar |
| Learner | `93C.3` | echter PPO-Update, Modell-, Optimizer-, Normalize-, Config- und Manifest-Artefakte |
| Diagnostik | `93C.4` | KL/Entropy/Clip/Value/Grad-Norm plus Reward-/Death-/Terminal-/Safety-Matrix |
| Pilot/Baseline | `93C.5` | `learner-smoke -> pilot -> baseline`, kein Sprung in Langlauf |
| Vergleich | `93C.6` | DQN/PPO auf gleicher Matrix, Holdout separat, PPO-Validate-Bedarf sichtbar |
| Handover | `93C.7` | Repro-Lauf, Hashes, Artefaktmanifest, klares `BT94A`-Go oder `diagnose` |
| Candidate | `BT94A` | kleine Ablationen in Batches, ein Freeze-Kandidat oder `hold` |
| Externe Evidence | `BT94B` | medianbasiertes Urteil; `promote` nur mit Stability- und Validation-Disziplin |
| Integration | `BT95` | doc-only Rollout-Intake, keine produktive Umschaltung ohne separaten User-Entscheid |

## BT90-Zerlegung aus dem Draft

| Aktiver Block hier | Draft-Quelle | Rolle |
| --- | --- | --- |
| `BT90` | `BT100.1` bis `BT100.2` | Python-Minimalbootstrap, JS-authoritative Contract-Wahrheit sowie Bauort- und Drift-Grenzen |
| `BT91` | `BT100.3` bis `BT100.5` | Python-Sidecar-Handshake, Contract-Smoke und deterministische 1-Worker-Lane |
| `BT92` | `BT101.1` bis `BT101.3` | Observation-/Action-Authority, Single-Env und JS-authoritative Semantik |
| `BT93A` | `BT101.4` bis `BT101.6` | Mehr-Env-/Throughput-Harness ausserhalb der produktiven Runtime |
| `BT93B` | `BT102.1` bis `BT102.3` | minimaler PPO-Baseline-Scaffold mit Smoke-, Checkpoint- und Resume-Kette |
| `BT93C` | `BT102.4` bis `BT102.6` plus PPO-Learner-Gap | echter PPO-Learner, konservative Baseline, DQN-Vorvergleich und reproduzierbarer Referenzlauf |
| `BT94A` | `BT103` | Candidate Freeze und Ablationen |
| `BT94B` | `BT104` | Externe A/B-Evidence und Urteil |
| `BT95` | `BT105` | Integrations-Handoff und spaeterer Rollout-Intake |

## Layer-Leitplanken fuer BT90-BT95

| Layer | Autoritativer Pfad | Regel fuer BT90-BT95 |
| --- | --- | --- |
| Match-/Runtime-Kern | `HeadlessMatchKernelRuntime`, `MatchKernelTrainingAdapter` | primaerer Simulationspfad; kein zweiter Matchstart ausserhalb dieses Kerns |
| Trainings-Adapter | `TrainingTransportFacade`, `TrainerPayloadAdapter` | Reset-/Step-/Reward-Vertrag nur konsumieren, nicht duplizieren |
| Transport / AI-Hub | `WebSocketTrainerBridge`, `TrainingContractV1` | Bridge-V1 bleibt eingefroren; kein neuer produktiver Transportpfad |
| Runtime-Bot-Auswahl | `ObservationBridgePolicy`, `RuntimeConfig`, `BotPolicyRegistry`, `BotPolicyTypes`, `LocalDqnInference` | bis BT95 read-only; keine produktive PPO-Umschaltung |
| Reward / Safety / Intent | `RewardCalculator`, `HybridDecisionArchitecture` | produktive Semantik bleibt authoritative; BT93G darf Trainings-Reward-/Diagnose-Semantik nur transparent schaerfen, PPO trainiert dagegen statt daran vorbei |
| Neuer PPO-Bauort | `python/**`, `data/training/ppo/**`, optional `scripts/training-headless-bridge-smoke.mjs` | neue Arbeit nur ausserhalb des produktiven Runtime-Pfads |

## Abhaengigkeiten (Hard/Soft)

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| BT10 | - | soft | ja | Operatorlauf kann isoliert laufen |
| BT11 | BT10 Baseline-Laufdaten | soft | ja | Folgefenster fuer 10h-Operatorlauf |
| BT12 | BT11 Abschlussartefakte | soft | ja | weiteres 10h-Folgefenster fuer Bot-Stabilisierung |
| BT15 | BT10 Baseline-Laufdaten | soft | ja | Zukunftsplanung nutzt aktuelle Lauf-KPIs |
| BT20 | BT10 Baseline-Laufdaten + BT15 Zyklenplan | hard | ja | BT10-Baseline vorhanden; BT15 Zielkorridor in 15.1/15.2.1 dokumentiert |
| BT30 | 20.99 | hard | nein | startet erst nach Survival-Policy-Phase |
| BT40 | 30.99 | hard | nein | Eval/Gate-Haertung nach Curriculum/Hyperparameter |
| BT73 | 40.99 | hard | nein | Deep-Survival-/Intent-/Resume-Folgeblock baut auf den haerteten BT20-BT40-Gates auf |
| BT73 | Fehlerbericht `2026-03-28_training_resume-command-timeout.md` | hard | nein | `trainer-checkpoint-load`/Preview-/Publish-Pfad muss vor Abschluss des Blocks belastbar sein |
| BT73 | V69.99 | soft | ja | Fight/Hunt-Combat-Baseline aus V69 liefert die aktuelle Survival-/Item-Grundlage |
| BT73 | V72 | soft | nein | Portal-/Gate-/Item-Vertraege aus V72 muessen fuer finale Bot-Semantik synchronisiert werden |
| BT90 | V77.99, V91.99, V92.99 | hard | ja | PPO-Zweitpfad respektiert bestehende Surface-/Ownership-Ratchets und bleibt read-only gegen produktive Runtime-Surfaces |
| BT91 | BT90.99 | hard | ja | Sidecar-Handshake, Contract-Smoke und 1-Worker-Lane sind versioniert dokumentiert; BTF-09 ordnet die Shutdown-Failure-Klasse ein |
| BT92 | BT91.99 | hard | ja | gruene BT91-Evidence liefert Sidecar-/100-Step-Handover fuer die Single-Env-Minimalspur |
| BT93A | BT92.99 | hard | ja | BT93A.99 ist abgeschlossen; Harness-/Throughput-Handover fuer BT93B/BT93C liegt artefaktbasiert vor |
| BT93B | BT93A.99 | hard | ja | PPO-Scaffold wurde nach artefaktbasiertem Harness-/Throughput-Handover aus BT93A abgeschlossen |
| BT93C | BT93B.99 + Audit-Haertung 2026-04-24 | hard | ja | `93C.0` endet `go`; echter Learner-Start erst nach `93C.1`/`93C.2` mit Clean-Env, Action-Surface und Startmanifest |
| BT93D | BT93C.99 + `data/training/ppo/bt94a/no_start_gate.json` (`claimable=false`) | hard | ja | Zwischenphase fuer PPO-Diagnose-Reparatur und BT94A-Startfreigabe; endete `diagnose-blocked` mit offenen F.05/F.19/F.27/F.30/F.31 |
| BT93E | BT93D.99 + `data/training/ppo/bt93d/start_gate_package.json` (`diagnose-blocked`) | hard | ja | Vollstaendige Startbefund-Reparatur; endete `diagnose-blocked` mit F.05/F.19/F.27/F.30/F.31/R.01 |
| BT93F | BT93E.99 + `data/training/ppo/bt93e/handover_package.json` (`diagnose-blocked`) | hard | ja | Gezielte Startreparatur; bewies den No-Start erneut und pinnt `BT94A remains closed before 94A.1` |
| BT93G | BT93F.99 + `data/training/ppo/bt93f/handover_package.json` (`diagnose-blocked`) + User-Replan 2026-04-25 | hard | ja | Masked Comparable Repair Lane: vergleichbarer Horizont, echtes Pre-Sampling-Masking, echte Terminal-/Death-/Reward-Semantik vor jedem BT94A-Claim |
| BT94A | BT93G.99 + `bt94a_gate_check.py` (`claimable=true`) | hard | nein | BT94A bleibt vor `94A.1` geschlossen, bis BT93G den Gate-Check gruen schreibt; Kandidatenlaeufe/Freeze bleiben vorher verboten |
| BT94B | BT94A.99 | hard | nein | Externe A/B-Evidence braucht einen eingefrorenen Kandidaten |
| BT94B PPO-Validate | BT94A.99 + 94B.1/94B.2 feste Kandidatenmatrix | hard | nein | `94B.3` baut eine eigene PPO-Validate-Lane; BT80C `80.9.3` ersetzt diese Lane nicht |
| BT94B `promote` | gruene PPO-Validate-Lane aus `94B.3` | hard | nein | harter Blocker fuer jedes Rollout-Signal und jeden echten BT95-Handoff |
| BT95 | BT94B Urteil `promote` | hard | nein | Integrations-Handoff ist erst nach positiver externer Evidence sinnvoll |
| BT95 | gruene PPO-Validate-Evidence aus `94B.3` | hard | nein | fuer BT95-Handoff muss PPO selbst validate-faehig sein; BT80C bleibt historische Alt-Lane |

## Datei-Ownership (Bot-Training)

| Pfadmuster | Block / Stream | Status | Hinweis |
| --- | --- | --- | --- |
| `scripts/training-*.mjs`, `scripts/bot-validation-*.mjs` | BT10-BT40, BT73 | offen | Orchestrierung, Eval, Gate, Validation |
| `src/entities/ai/training/**`, `trainer/**` | BT20-BT30, BT73 | offen | Runner/Bridge/Trainer-Verhalten |
| `src/state/training/**` | BT20-BT40, BT73 | offen | Gate-, KPI- und Reward-Logik |
| `src/entities/ai/**`, `src/hunt/HuntBotPolicy.js`, `src/state/validation/**`, `tests/physics-policy.spec.js`, `tests/training-*.mjs`, `docs/referenz/ai_architecture_context.md`, `docs/bot-training/Bot_Trainings_Roadmap.md` | BT73 | offen | Deep-Survival-, Intent-, Resume- und Operator-Haertung fuer Runtime + Training |
| `tests/trainer-*.mjs`, `tests/training-*.mjs` | BT10-BT40 | shared | Nur trainingsnahe Tests |
| `docs/bot-training/Bot_Trainingsplan.md`, `docs/bot-training/Bot_Survival_Training_Plan_12h.md`, `docs/bot-training/Bot_Survival_Training_Plan_10h.md`, `docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md` | BT10-BT40, BT73, BT80C, BT90-BT95 | shared | Masterplan + Detailplaene + PPO-Intake-Leiter |
| `python/**`, `data/training/ppo/**` | BT90-BT95 | offen | neuer Sidecar-/PPO-Pfad ausserhalb der produktiven Runtime |
| `python/scripts/**`, `python/tests/**`, `scripts/training-headless-bridge-smoke.mjs` | BT90-BT93A | offen | Boundary-Harness, Compliance-Smokes und nichtproduktive Mehr-Env-Orchestrierung |
| `python/train.py`, `python/eval.py`, `python/configs/**`, `python/callbacks/**`, `python/requirements*.txt`, `python/envs/ppo_action_surface.py` | BT93B-BT93G | offen | PPO-Scaffold, echter PPO-Learner, Eval-, Resume-, Diagnose-, Reparatur- und maskierte Comparable-Lane ausserhalb der produktiven Runtime |
| `scripts/training-headless-lane-runner.mjs`, `src/state/training/EpisodeController.js`, `src/state/training/RewardCalculator.js`, `tests/training-*.mjs` | BT93G | offen | Enge Trainingssemantik fuer Natural-Terminal-/Death-/Reward-Rueckfuehrung; keine produktive Matchstart-, AI-Hub- oder Runtime-Umschaltung |
| `src/state/HeadlessMatchKernelRuntime.js`, `src/core/MatchKernelTrainingAdapter.js`, `src/entities/ai/training/TrainingTransportFacade.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`, `src/entities/ai/ObservationBridgePolicy.js`, `src/core/RuntimeConfig.js`, `src/entities/ai/BotPolicyRegistry.js`, `src/entities/ai/BotPolicyTypes.js`, `src/entities/ai/inference/LocalDqnInference.js`, `src/entities/ai/hybrid/HybridDecisionArchitecture.js`, `src/state/MatchSessionFactory.js` | BT90-BT95 | read-only | Layer-sicher konsumieren; keine produktive Runtime-, Matchstart- oder AI-Hub-Umschaltung |
| `docs/plaene/neu/BT90_GoldStandard/**` | BT90-BT95 | referenz | Draft-, Audit- und Handoff-Material; keine aktiven Locks oder Evidence hier fuehren |
| `data/training/**`, `output/training/**` | BT10 | shared | Laufartefakte, Logs, Serien |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| Train-Ops | BT10 | 2026-03-22 | active | 2026-03-22 |
| Bot-Codex | BT11 | 2026-03-23 | frei | 2026-03-24 (abgeschlossen) |
| Bot-Codex | BT12 | 2026-03-25 | active | 2026-03-25 |
| Train-Ops | BT15 | 2026-03-22 | active | 2026-03-24 |
| Bot-Codex | BT20 | 2026-03-28 | active | 2026-03-28 |
| Bot-B | BT30 | 2026-03-22 | frei | - |
| Bot-C | BT40 | 2026-03-22 | frei | - |
| - | BT73 | - | frei | Intake 2026-03-31 abgeschlossen; Claim nach BT20-/BT30-/BT40-Abstimmung |
| Bot-Codex | BT80C | 2026-04-03 | active | 80.99 offen; 80.7-80.9 repo-technisch vorgezogen |
| Bot-Codex | BT90 | 2026-04-22 | frei | 2026-04-22 (abgeschlossen) |
| Bot-Codex | BT91 | 2026-04-22 | frei | 2026-04-22 (abgeschlossen) |
| Bot-Codex | BT92 | 2026-04-23 | frei | 2026-04-23 (abgeschlossen) |
| Bot-Codex | BT93A | 2026-04-23 | frei | 2026-04-24 (abgeschlossen) |
| Bot-Codex | BT93B | 2026-04-24 | frei | 2026-04-24 (abgeschlossen) |
| - | BT93C | - | frei | 93C.99 abgeschlossen; BT94A-Gate geschlossen |
| Bot-Codex | BT93D | 2026-04-24 | frei | 2026-04-24 (abgeschlossen) |
| Bot-Codex | BT93E | 2026-04-25 | frei | 2026-04-25 (abgeschlossen; `diagnose-blocked`) |
| Bot-Codex | BT93F | 2026-04-25 | frei | 2026-04-25 (abgeschlossen; `diagnose-blocked`) |
| Bot-Codex | BT93G | 2026-04-25 | active | 93G.2 abgeschlossen; 93G.3 offen |
| - | BT94A | - | frei | wartet auf `BT93G.99=BT94A-ready` und `data/training/ppo/bt94a/no_start_gate.json` (`claimable=true`) |
| - | BT94B | - | frei | wartet auf BT94A.99; Externe A/B-Evidence und Urteilsdisziplin |
| - | BT95 | - | frei | wartet auf BT94B `promote`; Integrations-Handoff |

## Conflict-Log (Cross-Block-Aenderungen)

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | Noch leer | - | - |

---

## Aktive Bloecke

## Block BT10: 12h Survival Operatorlauf

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_12h.md`

<!-- LOCK: Bot-TrainOps seit 2026-03-22 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT10-Phasen inkl. 10.99.* sind abgeschlossen.
- [ ] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit finalen Artefakten dokumentiert.
- [ ] DoD.3 KPI-Vergleich gegen Baseline ist im Plan eingetragen.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 10.1 Laufstabilitaet und Betrieb

- [x] 10.1.1 12h-Laufparameter fuer Stabilitaet haerten (Stage-Timeout, Backpressure, Retry, Learn-Profile) (abgeschlossen: 2026-03-22; evidence: npm run training:12h:survival -> commit 045de8b)
- [/] 10.1.2 Aktiven Lauf ueberwachen und Zwischenstatus in Artefakten pruefen

### 10.2 Zwischenvalidierung waehrend Lauf

- [ ] 10.2.1 Alle 2h `bot:validate` refreshen und Report in Run-Ordner pinnen
- [ ] 10.2.2 Survival-KPI-Delta (`avgStepsPerEpisode`, `averageBotSurvival`) pro Checkpoint protokollieren

### Checkpoint-Log BT10 (laufend)

| Datum | Typ | RunStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs Baseline | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-22 | Baseline | `20260321T180755Z-r01` | `123.799` | `31.908458` | `0.247460` | Referenz | `data/training/runs/20260321T180755Z-r01/run.json` |
| 2026-03-22 | Zwischenstand | `20260322T023812Z-r4344` | `124.138` | `null` | `0.000000` | `+0.274%` (`+0.339`) | `data/training/runs/20260322T023812Z-r4344/run.json` |

### 10.99 Abschluss-Gate

- [ ] 10.99.1 Finales `run -> eval -> gate` plus `bot:validate` mit passendem Report abschliessen
- [ ] 10.99.2 Finale Artefaktpfade + KPI-Vergleich dokumentieren und Lock freigeben

### Risiko-Register BT10

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Langlauf stoppt durch Timeout/Backpressure | hoch | Train-Ops | Guarded retries + Zwischencheck alle 2h | Unvollstaendige Laufserie |
| KPI-Drift trotz gruenem Gate | mittel | Train-Ops | KPI-Deltas je Checkpoint protokollieren | Survival sinkt trotz Pass |
| Artefakt-Luecken bei Resume | mittel | Trainer | latest/series pointers nach jedem Schritt pruefen | fehlende eval/gate Dateien |

---

## Block BT11: 10h Survival Folgefenster

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_10h.md`

<!-- LOCK: frei -->

### Definition of Done (DoD)

- [x] DoD.1 Alle BT11-Phasen inkl. 11.99.* sind abgeschlossen. (abgeschlossen: 2026-03-24; evidence: 11.99.1/11.99.2 -> final dokumentiert)
- [x] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit Artefaktpfaden dokumentiert. (abgeschlossen: 2026-03-24; evidence: `output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log`, `data/bot_validation_report.json`)
- [x] DoD.3 KPI-Deltas gegen BT10-Baseline sind im Checkpoint-Log eingetragen. (abgeschlossen: 2026-03-24; evidence: Checkpoint-Log BT11 -> Steps `-5.068%`, Survival `+17.138%`)
- [x] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS. (abgeschlossen: 2026-03-24; evidence: 11.99 Closure-Evidence -> Abschluss-Gate dokumentiert)

### 11.1 Plan und Laufstart

- [x] 11.1.1 10h-Trainingsplan mit KPI-/Checkpoint-Vorgaben anlegen (abgeschlossen: 2026-03-23; evidence: create 10h plan -> docs/bot-training/Bot_Survival_Training_Plan_10h.md)
- [x] 11.1.2 10h-Lauf starten und Operator-Artefakte (Series, Log, PID) dokumentieren (abgeschlossen: 2026-03-23; evidence: npm run training:10h -- --series-stamp BT11_20260323T013933 --stop-on-fail false -> output/training/BT11_20260323T013933-10h.log, PID 9332)
- [x] 11.1.3 Fight-Profil fuer 10h-Lauf festlegen (`hunt-3d`,`hunt-2d`, stabile Seeds/Timeouts) (abgeschlossen: 2026-03-24; evidence: update fight profile commands -> docs/bot-training/Bot_Survival_Training_Plan_10h.md)
- [x] 11.1.4 Fight-10h-Lauf starten und Operator-Artefakte dokumentieren (abgeschlossen: 2026-03-24; evidence: npm run training:10h -- --series-stamp BT11_FIGHT_20260324T014853 --modes hunt-3d,hunt-2d --stop-on-fail false -> output/training/BT11_FIGHT_20260324T014853-10h.log, PID 2772)

### 11.2 Laufmonitoring im 2h-Takt

- [x] 11.2.1 Alle 2h `bot:validate` ausfuehren und Report im aktiven Run-Ordner pinnen (abgeschlossen: 2026-03-23; evidence: BOT_RUNNER_FORCE_KILL_PORT=false BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3 npm run bot:validate -> data/bot_validation_report.json, docs/tests/Testergebnisse_Phase4b_2026-03-23.md)
- [x] 11.2.2 `avgStepsPerEpisode` und `averageBotSurvival` je Checkpoint gegen BT10-Baseline protokollieren (abgeschlossen: 2026-03-24; evidence: final checkpoint update -> `data/training/runs/BT11_FIGHT_20260324T014853-r4042/run.json`, `data/bot_validation_report.json`)

### Checkpoint-Log BT11 (laufend)

| Datum | Typ | SeriesStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs Baseline | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-23 | Plan erstellt | `pending` | `-` | `-` | `-` | Referenz BT10 | `docs/bot-training/Bot_Survival_Training_Plan_10h.md` |
| 2026-03-23 | Laufstart | `BT11_20260323T013933` | `pending` | `pending` | `pending` | wird in 2h-Checkpoints gefuellt | `output/training/BT11_20260323T013933-10h.log` |
| 2026-03-23 | Checkpoint C1 | `BT11_20260323T013933` | `126.444444` | `40.690933` | `0.248243` | Steps `+2.137%`, Survival `+27.524%` (vs BT10 Baseline) | `data/training/runs/BT11_20260323T013933-r2137/run.json`, `data/bot_validation_report.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-23.md`; Hinweis: forced-round-rate `100%` |
| 2026-03-24 | Fight-Plan aktualisiert | `BT11_FIGHT_pending` | `pending` | `pending` | `pending` | hunt-only Fenster vorbereitet | `docs/bot-training/Bot_Survival_Training_Plan_10h.md` |
| 2026-03-24 | Fight-Laufstart | `BT11_FIGHT_20260324T014853` | `pending` | `pending` | `pending` | 10h-Operatorlauf aktiv; 2h-Checkpoints offen | `output/training/BT11_FIGHT_20260324T014853-10h.log`, PID `2772` |
| 2026-03-24 | 10h-Loop abgeschlossen | `BT11_FIGHT_20260324T014853` | `117.525000` | `pending` | `1.000000` | Steps `-5.068%`, Survival offen (vs BT10 Baseline) | `data/training/series/BT11_FIGHT_20260324T014853/loop.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/run.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/eval.json`, `data/training/runs/BT11_FIGHT_20260324T014853-r4042/gate.json` |
| 2026-03-24 | Abschlussvalidate blockiert | `BT11_FIGHT_20260324T014853` | `117.525000` | `null` | `1.000000` | `bot:validate` bricht in `app:game-instance` ab | `output/training/BT11_FIGHT_20260324T014853-botvalidate-final.log`; Hinweis: frueherer HUD-NPE gefixt via commit `40dc4ab` |
| 2026-03-24 | Abschlussvalidate erfolgreich | `BT11_FIGHT_20260324T014853` | `117.525000` | `37.376986` | `1.000000` | Steps `-5.068%`, Survival `+17.138%` (vs BT10 Baseline) | `output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log`, `data/bot_validation_report.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-24.md`; Hinweis: scenarioLimit `2`, forced-round-rate `85.714%` |

### 11.99 Abschluss-Gate

- [x] 11.99.1 Finales `run -> eval -> gate` plus `bot:validate` mit gueltigem Report abschliessen (abgeschlossen: 2026-03-24; evidence: `npm run bot:validate` mit `BOT_RUNNER_FORCE_KILL_PORT=false BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3` -> `output/training/BT11_FIGHT_20260324T014853-botvalidate-final-pass.log`, `data/bot_validation_report.json`)
- [x] 11.99.2 Finale KPI-Deltas, Artefaktpfade und Lock-Release dokumentieren (abgeschlossen: 2026-03-24; evidence: final KPI row + lock release -> `docs/bot-training/Bot_Trainingsplan.md`, `docs/bot-training/Bot_Survival_Training_Plan_10h.md`)

### Risiko-Register BT11

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Lauf stoppt vor 10h durch Stage-Failure | hoch | Bot-Codex | `stop-on-fail` aus + Logmonitoring + Resume ueber latest checkpoint | `loop.json` zeigt fruehen stopReason |
| KPI-Delta unklar ohne valide Zwischenreports | mittel | Bot-Codex | fester 2h Checkpoint-Rhythmus mit `bot:validate` | fehlendes `averageBotSurvival` im Abschluss |
| Artefaktdrift zwischen runs/series/logs | mittel | Bot-Codex | SeriesStamp fixieren und Logpfad im Plan pinnen | mismatch zwischen `loop.json` und run stamps |
| `bot:validate`-Boot timeout (`GAME_INSTANCE` bleibt `null`) | mittel | Bot-Codex | Runtime fallback ueber statischen Localhost-Server + Szenario-Limit-Fix (`8ef8b75`) fuer stabilen Abschlusslauf | erneuter Timeout bei Final-Validate trotz Fallback |

---

## Block BT12: 10h Bot Folgefenster (Classic + Fight Matrix)

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md`

<!-- LOCK: Bot-Codex seit 2026-03-25 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT12-Phasen inkl. 12.99.* sind abgeschlossen.
- [ ] DoD.2 `training:run/eval/gate` sowie `bot:validate` sind mit Artefaktpfaden dokumentiert.
- [ ] DoD.3 KPI-Deltas gegen BT11-Abschlusswerte sind im Checkpoint-Log eingetragen.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 12.1 Plan und Laufstart

- [x] 12.1.1 10h-Folgeplan fuer Classic/Fight Matrix anlegen (abgeschlossen: 2026-03-24; evidence: create BT12 plan -> docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md)
- [x] 12.1.2 10h-Lauf starten und Operator-Artefakte (Series, Log, PID) dokumentieren (abgeschlossen: 2026-03-24; evidence: Start-Process `npm run training:10h -- --series-stamp BT12_20260324T152103 ...` -> `output/training/BT12_20260324T152103-10h.log`, PID `3476`)
- [x] 12.1.3 Survival-First-Restart (Classic + Fight) mit 10h-Matrixlauf starten und dokumentieren (abgeschlossen: 2026-03-25; evidence: `npm run training:10h -- --series-stamp BT12_SURV_20260325T030951 --stop-on-fail false --stage-timeout-ms 5400000 --episodes 8 --seeds 11,23,37,41,53 --modes classic-3d,classic-2d,hunt-3d,hunt-2d --max-steps 240 --runner-profile learn --inject-invalid-actions false --step-timeout-retries 1 --timeout-step-ms 220 --timeout-episode-ms 240000 --timeout-run-ms 1200000 --bridge-max-pending-acks 1024 --bridge-backpressure-threshold 768 --bridge-drop-training-when-backlogged true` -> `output/training/BT12_SURV_20260325T030951-10h.log`, PID `5856`)

### 12.2 Laufmonitoring im 2h-Takt

- [/] 12.2.1 `bot:validate`-Checkpoint im 2h-Rhythmus mit stabilen Runtime-Parametern ausfuehren
- [/] 12.2.2 `avgStepsPerEpisode` und `averageBotSurvival` je Checkpoint gegen BT11-Finalwerte protokollieren
- [x] 12.2.3 Runner-Stabilisierung via `BOT_RUNNER_SERVER_MODE=preview` fuer Checkpoint-Validierung aktivieren (abgeschlossen: 2026-03-25; evidence: `BOT_RUNNER_SERVER_MODE=preview BOT_RUNNER_PREVIEW_BUILD=true BOT_RUNNER_SCENARIO_COUNT=2 BOT_RUNNER_ROUNDS=3 BOT_RUNNER_TOTAL_TIMEOUT=900000 BOT_RUNNER_BOOT_TIMEOUT=240000 npm run bot:validate` -> `output/training/BT12_SURV_20260325T030951-botvalidate-cp03-preview.log`, `tmp/bot-validation-report.json`)

### Checkpoint-Log BT12 (laufend)

| Datum | Typ | SeriesStamp | `avgStepsPerEpisode` | `averageBotSurvival` | `invalidActionRate` | Delta vs BT11-Final | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-24 | Plan erstellt | `pending` | `-` | `-` | `-` | Referenz BT11-Final (`117.525` / `37.376986`) | `docs/bot-training/Bot_Survival_Training_Plan_10h_BT12.md` |
| 2026-03-24 | Laufstart + Warm-up | `BT12_20260324T152103` | `124.137500` | `-` | `0.000000` | Steps `+5.626%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_20260324T152103-10h.log`, `data/training/runs/BT12_20260324T152103-r01/run.json`, `data/training/runs/BT12_20260324T152103-r01/gate.json` |
| 2026-03-24 | Checkpoint Validate fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp01.log` (`phase=app:game-instance`) |
| 2026-03-24 | Checkpoint Validate Retry fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp01-retry.log` (`BOT_RUNNER_FORCE_KILL_PORT=false`, `phase=app:game-instance`) |
| 2026-03-25 | Checkpoint Validate Port-Shift fehlgeschlagen | `BT12_20260324T152103` | `-` | `-` | `-` | `n/a` | `output/training/BT12_20260324T152103-botvalidate-cp02-port4275.log` (`BOT_RUNNER_PORT=4275`, `phase=app:game-instance`) |
| 2026-03-25 | Survival-First-Restart Laufstart | `BT12_SURV_20260325T030951` | `pending` | `pending` | `pending` | neues 10h-Fenster gestartet | `output/training/BT12_SURV_20260325T030951-10h.log`, PID `5856` |
| 2026-03-25 | Survival-First-Restart Warm-up | `BT12_SURV_20260325T030951` | `135.368750` | `pending` | `0.000000` | Steps `+15.183%`, Survival `pending` (vs BT11-Final) | `data/training/runs/BT12_SURV_20260325T030951-r08/run.json`, `data/training/runs/latest.json` |
| 2026-03-25 | C1 Validate fehlgeschlagen | `BT12_SURV_20260325T030951` | `135.368750` | `-` | `0.000000` | Steps `+15.183%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp01.log` (`BOT_RUNNER_FORCE_KILL_PORT=false`, `phase=app:game-instance`) |
| 2026-03-25 | C1 Validate Retry fehlgeschlagen | `BT12_SURV_20260325T030951` | `135.368750` | `-` | `0.000000` | Steps `+15.183%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp01-retry.log` (`BOT_RUNNER_PORT=4275`, `BOT_RUNNER_BOOT_TIMEOUT=300000`, `phase=app:game-instance`) |
| 2026-03-25 | C2 Validate fehlgeschlagen | `BT12_SURV_20260325T030951` | `135.368750` | `-` | `0.000000` | Steps `+15.183%`, Survival `n/a` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp02.log` (`BOT_RUNNER_BOOT_TIMEOUT=240000`, `phase=app:game-instance`) |
| 2026-03-25 | C3 Validate erfolgreich (preview mode) | `BT12_SURV_20260325T030951` | `135.368750` | `38.770150` | `0.000000` | Steps `+15.183%`, Survival `+3.727%` (vs BT11-Final) | `output/training/BT12_SURV_20260325T030951-botvalidate-cp03-preview.log`, `tmp/bot-validation-report.json`, `tmp/Testergebnisse_Phase4b_2026-03-25.md`; Hinweis: forced-round-rate `83.3%` |
| 2026-03-27 | Abschlussvalidate erfolgreich, Gate weiter rot | `BT12b_SURVIVAL_20260327T035615-r491` | `124.137500` | `40.037833` | `0.000000` | Steps `+5.626%`, Survival `+7.119%` (vs BT11-Final) | `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/run.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/bot-validation-report.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/eval.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/gate.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-27.md`; Hinweis: `bot:validate` PASS nach Portal-Visual-Fix, aber `training:gate` FAIL auf `forcedRoundRate=1.0` und `timeoutRoundRate=1.0` |
| 2026-03-27 | Runner-Fix validiert, Gate weiter rot | `BT12b_SURVIVAL_20260327T035615-r491` | `124.137500` | `6.132433` | `1.000000` | Steps `+5.626%`, Survival `-83.593%` (vs BT11-Final) | `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/bot-validation-report.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/eval.json`, `data/training/runs/BT12b_SURVIVAL_20260327T035615-r491/gate.json`, `docs/tests/Testergebnisse_Phase4b_2026-03-27.md`; Hinweis: `bot:validate` jetzt ohne Forced-/Timeout-Rounds (`0/0`), aber `training:gate` FAIL auf `averageBotSurvival=6.132433 < 19.145075` |

### 12.99 Abschluss-Gate

- [ ] 12.99.1 Finales `run -> eval -> gate` plus `bot:validate` mit gueltigem Report abschliessen
- [ ] 12.99.2 Finale KPI-Deltas, Artefaktpfade und Lock-Release dokumentieren

### Risiko-Register BT12

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Lauf stoppt vor 10h durch Stage-Failure | hoch | Bot-Codex | `stop-on-fail=false`, Logmonitoring und Resume ueber latest checkpoint | `loop.json` mit vorzeitigem stopReason |
| KPI-Regression in Fight oder Classic unentdeckt | hoch | Bot-Codex | Matrix-Run (`classic-*`,`hunt-*`) + 2h Checkpoints | Delta kippt in Teilmodus trotz gruenem Gate |
| `bot:validate` Laufzeit > global timeout | mittel | Bot-Codex | scenarioLimit `2`, `BOT_RUNNER_TOTAL_TIMEOUT=600000` fuer Abschlusslauf | Abbruch bei `total-run timeout` |
| `bot:validate` kann `GAME_INSTANCE` waehrend aktivem Loop nicht initialisieren | hoch | Bot-Codex | Checkpoint-Validate nach Loop-Ende oder auf separatem Port (`BOT_RUNNER_PORT`) ausfuehren | Timeout in `phase=app:game-instance` trotz laufendem Dev-Server |
| Abschluss-Gate faellt nach Runner-Stabilisierung auf Survival-KPI | hoch | Bot-Codex | V1/V2-Survival unter natuerlichem Round-End analysieren und Policy/Training gegen fruehes Bot-Sterben nachziehen | `averageBotSurvival < 19.145075` |

---

## Block BT15: Zukunfts-Roadmap Survival (Q2)

Plan-Datei: `docs/bot-training/Bot_Trainings_Roadmap.md`

<!-- LOCK: Bot-TrainOps seit 2026-03-22 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT15-Phasen inkl. 15.99.* sind abgeschlossen.
- [ ] DoD.2 C1-C6 Zeitfenster, KPI-Zielkorridor und Entscheidungsregeln sind final dokumentiert.
- [ ] DoD.3 Woechentliche Re-Planung ist an BT10-Checkpoint-Log und Weekly Review gekoppelt.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 15.1 Baseline und Zielkorridor

- [x] 15.1.1 Baseline-Snapshot aus Trainingsartefakten in Roadmap dokumentieren (abgeschlossen: 2026-03-22; evidence: update roadmap baseline -> docs/bot-training/Bot_Trainings_Roadmap.md)
- [x] 15.1.2 KPI-Zielkorridor und Trainingszyklen C1-C6 festlegen (abgeschlossen: 2026-03-22; evidence: define cycles/targets -> docs/bot-training/Bot_Trainings_Roadmap.md)

### 15.2 Operative Verzahnung BT10-BT40

- [x] 15.2.1 Promotion-/Rollback-Regeln fuer zyklische Trainingsfenster definieren (abgeschlossen: 2026-03-22; evidence: add promotion rollback rules -> docs/bot-training/Bot_Trainings_Roadmap.md)
- [/] 15.2.2 Woechentliche Re-Planung in BT10-Checkpoint-Log und Weekly Review verankern

### 15.99 Abschluss-Gate

- [ ] 15.99.1 Ersten kompletten Zyklus (C1) mit KPI-Delta dokumentieren
- [ ] 15.99.2 KW13-Roadmap-Review abschliessen und Lock auf `frei` setzen

### Risiko-Register BT15

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Roadmap driftet von realen KPI-Trends weg | mittel | Train-Ops | weekly KPI checkpoint + zyklusweise Re-Baselining | Zielkorridor wird 2 Zyklen in Folge verfehlt |
| Ueberoptimistische Zielwerte ohne Gate-Stabilitaet | hoch | Train-Ops/RL | harte Promotion-Regeln + rollback Pflicht | kurzfristige KPI-Spitze ohne Reproduzierbarkeit |
| Plan bleibt statisch trotz neuer Artefakte | mittel | Train-Ops | BT10 Checkpoint-Log als Pflichtinput fuer BT15 updates | keine Roadmap-Aktualisierung nach Langlauf |

---

## Block BT20: Survival-Policy und Reward-Shaping

Plan-Datei: `docs/bot-training/Bot_Survival_Training_Plan_BT20.md`

<!-- LOCK: Bot-Codex seit 2026-03-27 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT20-Phasen inkl. 20.99.* sind abgeschlossen.
- [ ] DoD.2 A/B-Lauf gegen BT10-Baseline zeigt positives Survival-Delta.
- [ ] DoD.3 Training-Gates und betroffene Tests sind PASS.
- [ ] DoD.4 Evidence, Risikoabgleich und Doku-Gates sind abgeschlossen.

### 20.1 Safety-Layer vor Action-Ausgabe

- [x] 20.1.1 Collision-Risk-Guards in Action-Entscheidung einbauen (Evasion hat Vorrang) (abgeschlossen: 2026-03-31; evidence: `node --test tests/trainer-v36-action-safety.test.mjs` -> PASS)
- [x] 20.1.2 Risky-Action-Sperren bei hoher Bedrohung und niedriger Health einfuehren (abgeschlossen: 2026-03-31; evidence: `node --test tests/trainer-v36-action-safety.test.mjs` -> PASS)

### 20.2 Reward-Shaping auf Ueberleben fokussieren

- [x] 20.2.1 Schrittweises Survival-Reward und klare Death-Penalty kalibrieren (abgeschlossen: 2026-03-31; evidence: `node --test tests/training-reward-survival.test.mjs` -> PASS)
- [x] 20.2.2 Risk-Proximity-Penalties (Wall/Trail/Opponent) einfuehren und testen (abgeschlossen: 2026-03-31; evidence: `node --test tests/training-reward-survival.test.mjs` -> PASS)

### Checkpoint-Log BT20 (laufend)

| Datum | Typ | SeriesStamp | Resume-Quelle | Zielbild | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-03-27 | Plan erstellt | `pending` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | Survival-First Resume-Fenster mit 4-Mode-Matrix vorbereiten | `docs/bot-training/Bot_Survival_Training_Plan_BT20.md` |
| 2026-03-28 | 10h-Laufstart | `BT20_SURV_20260328T000841` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | 10h-Operatorlauf aktiv; Resume ueber Startup-Checkpoint bestaetigt (`checkpointLoads=1`, `optimizerSteps=1588329`) | `output/training/BT20_SURV_20260328T000841-10h.log`, `data/training/runs/BT20_SURV_20260328T000841-r01/run.json`, `data/training/runs/BT20_SURV_20260328T000841-r01/trainer.json`, `data/training/runs/latest.json` |
| 2026-03-31 | Safety/Reward rollout | `BT20_code_20260331` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | Trainer-Action-Guards, fallback-korrigierte Observation-Heuristik und Survival-First Reward-Shaping sind vor dem naechsten A/B-Lauf aktiv | `trainer/session/ActionSanitizer.mjs`, `trainer/session/TrainerSession.mjs`, `src/state/training/RewardCalculator.js`, `src/entities/ai/training/TrainingAutomationRunner.js`, `tests/trainer-v36-action-safety.test.mjs`, `tests/training-reward-survival.test.mjs` |
| 2026-03-31 | 10h-Restart aktiv | `BT20_SURV_20260331T043252` | `data/training/models/BT11_FIGHT_20260324T014853-r4042/checkpoint.json` | 4-Mode-10h-Lauf mit externem Startup-Resume-Server aktiv; fruehe Runs `r01/r02` schreiben Artefakte und Gates gruen | `output/training/BT20_SURV_20260331T043252-10h.log`, `output/training/BT20_SURV_20260331T043252-trainer-server.log`, `data/training/runs/BT20_SURV_20260331T043252-r01/run.json`, `data/training/runs/BT20_SURV_20260331T043252-r02/gate.json`, `data/training/runs/latest.json` |

### 20.99 Abschluss-Gate

- [ ] 20.99.1 A/B-Lauf gegen BT10-Baseline mit identischen Seeds/Modes durchfuehren
- [ ] 20.99.2 Verbesserung nur bei positivem Survival-Delta und stabilen Gates uebernehmen

### Risiko-Register BT20

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reward-Hacking statt Survival | hoch | RL | harte Survival-KPIs + adversarial seeds | hohe Reward-Werte bei kurzer Lebenszeit |
| Overfitting auf einzelne Seeds | mittel | RL | seed/mode matrix im Gate fixieren | starke KPI-Schwankung |
| Safety-Layer blockiert lernbare Aktionen | mittel | RL | thresholds iterativ + A/B checks | Policy wird zu konservativ |

---

## Block BT30: Curriculum, Replay-Priorisierung und Hyperparameter

Plan-Datei: `docs/bot-training/Bot_Trainingsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 20.99 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT30-Phasen inkl. 30.99.* sind abgeschlossen.
- [ ] DoD.2 Gewinner-Setting ist reproduzierbar ueber Vergleichslaeufe.
- [ ] DoD.3 Standard-Training-Skripte nutzen Gewinner-Setting.
- [ ] DoD.4 Evidence + Doku-Gates sind abgeschlossen.

### 30.1 Curriculum-Stufen

- [ ] 30.1.1 Trainingsstufen (einfach -> mittel -> voll) als konfigurierte Sequenz definieren
- [ ] 30.1.2 Stage-spezifische Promotion-Regeln anhand Survival-KPIs implementieren

### 30.2 Replay und Hyperparameter

- [ ] 30.2.1 Priorisierte Samples fuer near-death/death-leading Situationen einfuehren
- [ ] 30.2.2 Survival-orientierte Hyperparameter-Tuning-Laeufe (gamma/epsilon/step-limits) automatisieren

### 30.99 Abschluss-Gate

- [ ] 30.99.1 Gewinner-Setting per reproduzierbarem Vergleichslauf bestimmen
- [ ] 30.99.2 Gewinner-Setting in Standard-Training-Skripten verankern und dokumentieren

### Risiko-Register BT30

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Curriculum-Promotion zu aggressiv | mittel | RL | Mindestdauer je Stage + rollback criteria | unstabile KPI-Verlaeufe |
| Replay-Priorisierung erzeugt Bias | mittel | RL | gemischte sampling quotas | Performance in einfachen Szenen bricht ein |
| Hyperparameter nicht reproduzierbar | hoch | Train-Ops | fixed seeds + run manifests + lockstep eval | Gewinnerlauf nicht reproduzierbar |

---

## Block BT40: Eval-/Gate-Haertung und Regression-Schutz

Plan-Datei: `docs/bot-training/Bot_Trainingsplan.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 30.99 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle BT40-Phasen inkl. 40.99.* sind abgeschlossen.
- [ ] DoD.2 Survival-Metriken sind als harte Gates verankert.
- [ ] DoD.3 Trainingsnahe Regressionstests und Operator-Runbook sind aktualisiert.
- [ ] DoD.4 `plan:check`, `docs:sync`, `docs:check`, `build` sind PASS.

### 40.1 Survival-Metriken als First-Class-Gates

- [ ] 40.1.1 `averageBotSurvival` in Eval/Gate standardmaessig erzwingen (kein `null` fuer Abschlusslaeufe)
- [ ] 40.1.2 Gate-Fehlerbilder und Restore-Pfade fuer Latest/Checkpoint robustifizieren

### 40.2 Test- und Operator-Haertung

- [ ] 40.2.1 Trainingsnahe Regressionstests fuer Survival-Deltas und Guardrails erweitern
- [ ] 40.2.2 Operator-Runbook fuer Start/Resume/Stop/Recovery standardisieren

### 40.99 Abschluss-Gate

- [ ] 40.99.1 `training-run/eval/gate`, `bot:validate`, trainingsnahe Tests und Build sind gruen
- [ ] 40.99.2 Plan-Doku, Lock-Bereinigung und Handoff an `docs/Umsetzungsplan.md` (nur Referenz) abgeschlossen

### Risiko-Register BT40

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| False-positive gates bei sporadischen KPI-Ausreissern | mittel | QA/RL | rolling window + min-run-count | gate flip-flops |
| Restore-Pfad bricht bei latest pointer | hoch | Trainer | checkpoint fallback + smoke resume tests | training cannot resume |
| Regressionstests zu langsam fuer Ops | mittel | QA | fast subset + nightly full suite | Ops delays |

---

## Block BT73: Deep-Survival-, Intent- und Resume-Haertung fuer Runtime, Training und Operatorpfade

Plan-Datei: `docs/plaene/alt/Feature_Bot_Tiefenverbesserung_Survival_Entscheidung_Operator_V73.md`

<!-- LOCK: frei -->
<!-- DEPENDS-ON: 40.99 -->

Scope:

- Runtime-Bot ueber Safety-, Intent-, Recovery- und Weltmodell-Semantik tiefer auf Survival-First ausrichten, ohne den Runtime-V1-Bridge-Vertrag still zu brechen.
- Eval-, Gate-, Resume- und Operatorpfade so haerten, dass Survival-Fortschritt reproduzierbar ueber feste Vergleichsmatrizen statt ueber Einzelruns beurteilt wird.
- Gameplay-Semantik aus V69 und V72 fuer Items, Shield, Portale und Gates als First-Class-Signal in Runtime, Training, QA und Release-Pfade uebernehmen.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 73.1 bis 73.7 und 73.99 sind abgeschlossen.
- [ ] DoD.2 Runtime-Bot nutzt explizite Safety-, Intent- und Recovery-Logik statt nur reaktive Einzelheuristiken; Classic/Hunt teilen einen klar dokumentierten Kern.
- [ ] DoD.3 Training und Reward-Shaping verbessern Survival auf einer festen Seed-/Mode-Matrix reproduzierbar und ohne Forced-/Timeout-Runden oder Reward-Hacking.
- [ ] DoD.4 Eval-/Validation-Reports liefern Survival-Metriken, Todesursachen, Szenarioklassen, Resume-Gesundheit und Decision-Trace-Evidence pro Kandidatenlauf.
- [ ] DoD.5 Resume-, Preview-Validate- und Publish-Pfade laufen ohne Sonderworkaround stabil; Artefakte und Run-Manifeste sind vollstaendig und reproduzierbar.
- [ ] DoD.6 Trainingsnahe Tests, `bot:validate`, `training:eval`, `training:gate`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.

Leitplanke 2026-04-04 (V84-Folgeverbrauch, Quelle: `docs/referenz/ai_architecture_context.md`, Abschnitte `4.6.1` und `4.6.2`): Preview-, Resume-, Eval- und Kandidatenlaeufe sollen denselben `MatchKernelTrainingAdapter` plus normalisierte `run_profile`-, `seed_envelope`-, `input_frame`- und `snapshot_envelope`-Vertraege nutzen. Neue Trainings- oder Validate-Harnesses fuehren keinen separaten Matchstart an `MatchSessionFactory` oder Renderer vorbei ein.

### 73.1 Ground Truth, Failure-Taxonomie und Vergleichsbasis

- [ ] 73.1.1 `bot:validate`, Eval und Recorder um Failure-Codes, Todesursachen, Exit-Qualitaet, Resume-Status und Szenarioklassen erweitern, damit Regressionen nicht mehr nur als Gesamtzahl sichtbar sind.
- [ ] 73.1.2 Decision-Trace-Artefakte fuer Hochrisiko-Momente einfuehren (letzte Sensoren, Intent, Action-Veto, Reward-Zerlegung), damit schlechte Bot-Entscheidungen reproduzierbar analysiert werden koennen.
- [ ] 73.1.3 Eine feste Vergleichsmatrix aus Maps, Seeds, Modi und Baseline-Stamps definieren, damit BT10/BT11/BT12/BT20 und Folgefenster mit denselben Bedingungen verglichen werden.

### 73.2 Sensorik und internes Weltmodell vertiefen

- [ ] 73.2.1 Threat-Horizon-, Dead-End-, Freiraum-, Gegnerdruck- und Exit-Signale in `BotSensingOps`/`BotThreatOps` zentralisieren, damit der Bot nicht erst am Kollisionspunkt reagiert.
- [ ] 73.2.2 Ein kleines internes Gedaechtnis fuer letzte Gefahr, letzte Recovery-Aktion, Portal-/Gate-Nutzung und Fehlschlaege einfuehren, ohne den Runtime-V1-Contract zu brechen.
- [ ] 73.2.3 Items, Portale, Gates, Shield und Modus-Sonderregeln als explizite Beobachtungs- und Policy-Semantik verdrahten, damit V69/V72-Aenderungen nicht als Seiteneffekt in die KI tropfen.

### 73.3 Entscheidungsarchitektur in Safety-, Intent- und Recovery-Layer aufteilen

- [ ] 73.3.1 Einen klaren Safety-Veto-Layer vor der finalen Action-Ausgabe verankern, der Kollision, Low-HP-Risiko, Sackgassen und riskante Item-/Portal-Aktionen deterministisch blocken kann.
- [ ] 73.3.2 Einen Intent-Layer fuer `survive`, `reposition`, `engage`, `disengage`, `recover`, `use-item`, `take-portal`, `take-gate` einfuehren, damit Entscheidungen nicht nur aus losen Prioritaetslisten entstehen.
- [ ] 73.3.3 Recovery-/Stuck-Verhalten als expliziten Zustandsautomaten mit Eintritts- und Exit-Kriterien modellieren, statt Steckenbleiben nur post hoc zu zaehlen.

### 73.4 Reward-Shaping, Curriculum und Replay auf Survival-First ausrichten

- [ ] 73.4.1 Reward-Zerlegung in Survival, sichere Flaechenkontrolle, gelungene Gefahren-Exits und schadensbezogene Rewards nur bei netto ueberlebensfoerderlichem Verhalten aufspalten.
- [ ] 73.4.2 Curriculum-Stufen von einfach zu voller 4-Mode-Matrix mit Promotion-/Rollback-Regeln an echte Survival- und Stability-KPIs koppeln statt nur an Steps oder Reward-Summen.
- [ ] 73.4.3 Priorisierte Replay-/Scenario-Samples fuer near-death, death-leading, low-HP-combat, Portal-/Gate-Entscheidungen und Item-Fehlgebrauch einfuehren.

### 73.5 Eval-, Gate- und Operator-Pfade haerten

- [ ] 73.5.1 `bot:validate` und `training:eval` um harte Guardrails fuer `averageBotSurvival != null`, Forced-/Timeout-Rates, Death-Cause-Verteilung und per-Szenario-Failures erweitern.
- [ ] 73.5.2 `training:gate` auf Vergleich gegen den letzten stabilen Referenzlauf plus Rolling-Window-Regeln ausrichten, damit einmalige Glueckslaeufe nicht promoted werden.
- [ ] 73.5.3 Einen einheitlichen Validate-Pfad fuer Preview, Publish und Operatorlauf bauen, damit Abschluss-Evidence nicht mehr von instabilen Dev-Server- oder Port-Konstellationen abhaengt.

### 73.6 Resume-, Bridge- und Reproduzierbarkeitsluecken schliessen

- [ ] 73.6.1 Den `trainer-checkpoint-load`-/`trainer-checkpoint-load-latest`-Antwortpfad zwischen `training-run`, `WebSocketTrainerBridge` und `TrainerServer` instrumentieren, testen und reparieren.
- [ ] 73.6.2 Run-Manifeste fuer Resume-Quelle, Modell-/Config-Hash, Gate-Schwellen, Validate-Argumente und Szenario-Matrix standardisieren, damit spaetere KPI-Vergleiche belastbar bleiben.
- [ ] 73.6.3 Eine deterministische A/B-Lane fuer Baseline vs. Kandidat mit festen Seeds, identischem Modus-Mix und publishbarer Evidence etablieren.

### 73.7 Rollout, Fallback und Doku-Sync

- [ ] 73.7.1 Die tieferen KI-Aenderungen hinter klaren Tuning-/Strategy-Schaltern ausrollen, damit `rule-based`, `auto`, Bridge- und Fallback-Pfade kontrolliert verglichen und im Notfall sofort zurueckgenommen werden koennen.
- [ ] 73.7.2 Architektur-, Trainings-, Release- und QA-Dokumentation auf denselben Intent-, Failure- und Gate-Vertrag aktualisieren, damit Runtime, Training und Abnahme denselben Wissensstand teilen.

### 73.99 Integrations- und Abschluss-Gate

- [ ] 73.99.1 Feste Vergleichslaeufe gegen die Baseline sind gruen: kein Resume-Workaround mehr, keine Forced-/Timeout-Runden, `averageBotSurvival` mindestens auf BT11-Stabilniveau und Trend in Richtung Roadmap-Ziel.
- [ ] 73.99.2 Trainingsnahe Tests, `bot:validate`, `training:eval`, `training:gate`, `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind abgeschlossen; verbleibende Gameplay-/Bridge-Restpunkte sind dokumentiert, bevor `73.99` schliesst.

### Risiko-Register BT73

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Mehr Sensorik und Intent-Logik verlangsamt die Runtime-KI spuerbar | hoch | Runtime AI | Hotpaths in `*Ops.js` halten, Feature-Bundles messen und schwere Debug-Evidence auf Eval/Training begrenzen | Bot-Framezeit oder Tick-Latenz steigt deutlich |
| Ein zu harter Safety-Layer macht die Policy passiv und blockiert Lernen | hoch | RL | Safety zuerst nur fuer klar katastrophale Aktionen als Veto nutzen und ueber A/B-Lane kalibrieren | Survival verbessert sich nicht, obwohl Fehler sinken |
| Reward-Shaping optimiert auf Proxy-Werte statt auf echtes Ueberleben | hoch | RL | Rewards immer gegen `averageBotSurvival`, Death-Causes und feste Seed-/Mode-Matrix spiegeln | Hoher Reward bei schlechter Survival-Metrik |
| Resume-/Bridge-Fixes destabilisieren den Trainingsbetrieb kurzfristig | hoch | Trainer | Smoke-Tests fuer `checkpoint-load`, `latest`, Preview-Validate und Publish-Lane vor Langlaeufen verpflichtend machen | Training kann nicht deterministisch fortgesetzt werden |
| V72-Veraenderungen an Item-/Portal-/Gate-Vertraegen brechen Bot-Heuristiken | mittel | Gameplay + AI | Gemeinsame Capability-/Semantik-Quelle definieren und Cross-Plan-Abhaengigkeiten vor Merge pruefen | Bots reagieren falsch auf neue Items oder Portale |
| Mehr Failure-Codes und Decision-Trace-Artefakte ueberladen Reports und Operatorpfade | mittel | QA/Ops | Kompakte Summary plus gezielte Drilldown-Artefakte statt unstrukturierter Log-Flut | Reports wachsen, aber Entscheidungen werden nicht klarer |

---

## Block BT80C: Algorithmus-Ausbau, High-Util-Training und Champion-Rollout

Plan-Datei: `docs/plaene/neu/BT80C_Validierungs_und_Promotionshaertung_2026-04-03.md`

<!-- LOCK: Bot-Codex seit 2026-04-03 -->
<!-- DEPENDS-ON: BT80B.99 -->

Scope:

- BT80B-Haertung in Algorithmus-, Promotion-, Gate- und Hardwareprofilen fortziehen, ohne Temperatur-/Thermal-Guardrails weich zu machen.
- BT11 bleibt eingefrorener Champion; BT20 bleibt Challenger-/Referenzlauf.
- Validation-Harness und hardware-passende Kandidatenleiter vor neuen High-Util- oder Rollout-Schritten schliessen.
- Benchmark-Evidence bleibt nur innerhalb desselben Gameplay-/Observation-/Action-/Reward-/Validation-Semantikfensters gueltig.
- Repo-technische Haertung vorziehen, aber keine produktionsnahen Langlaeufe oder stillen Champion-Wechsel ohne frische Operator-Evidence anstossen.

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 80.7 bis 80.99 sind abgeschlossen.
- [ ] DoD.2 Champion-/Challenger-/Ablation-Rollen sind hart verdrahtet; BT11 bleibt Champion und BT20 bleibt Referenz.
- [ ] DoD.3 Algorithmus-, Hardware-, Semantik- und Rollout-Vertraege sind als reproduzierbare Repo-Konfiguration dokumentiert.
- [ ] DoD.4 Validation-Harness, Kandidatenleiter und Operator-Runbooks sind fuer BT80C dokumentiert und belastbar.
- [ ] DoD.5 Trainingsnahe Tests sowie `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind gruen.

### 80.7 Lernalgorithmus, Ablationen und Champion-Challenger-Regeln

- [x] 80.7.1 Algorithmusprofile (`champion-stable`, `challenger-balanced`, `challenger-high-util`, `ablation-no-per`) definieren und bis in Trainer-/Replay-/Reward-/Exploration-Defaults verdrahten (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/trainer-v36-algorithm-profile.test.mjs` -> PASS)
- [x] 80.7.2 Challenger-/Ablation-/Reference-only-Rollen im Benchmark-Manifest und in der manuellen Promotion-Policy verankern, inklusive BT20-Blockade gegen Champion-Promotion (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-benchmark-artifacts.test.mjs` -> PASS)
- [ ] 80.7.3 Promotions-Evidence auf drei vollstaendige Kandidatenlaeufe derselben Lane und desselben Semantikfensters schaerfen; Median-Delta statt Einzelrun als Entscheidungsbasis dokumentieren

### 80.8 Hardware-, Util- und Langlaufprofile

- [x] 80.8.1 High-Util-Profile `overnight-high-util` und `marathon` mit harten Thermal-Ceilings statt reiner Beobachtung konfigurieren (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-benchmark-artifacts.test.mjs` -> PASS)
- [x] 80.8.2 Hardware-Telemetrie fuer extern gelieferte Temperaturdaten auswertbar machen, ohne produktionsnahe Langlaeufe fuer diese Repo-Haertung zu starten (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-benchmark-artifacts.test.mjs` -> PASS)
- [ ] 80.8.3 Kandidatenleiter `candidate-smoke -> candidate-benchmark -> operator-high-util` hardware-passend definieren und Operator-Runbooks fuer Start/Resume/Pause/Stop/Recovery daran ausrichten

### 80.9 Rollout-, Promotion-, Fallback- und Gate-Haertung

- [x] 80.9.1 `training-gate` um explizite Promotion-Entscheidung gegen den eingefrorenen BT11-Champion erweitern; synthetische und BT20-Referenzlaeufe bleiben geblockt (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-gate.test.mjs` -> PASS)
- [x] 80.9.2 `training-e2e` Dry-Run-Fallback so haerten, dass `write-latest=false` Validation-/Gate-Pfade sauber skippt statt false-positive Rot zu erzeugen (abgeschlossen: 2026-04-02; evidence: commit `37bfeb3`, `node --test tests/training-e2e.test.mjs` -> PASS)
Hinweis 2026-04-04 (V84-Folgeverbrauch): Die stabile Kandidaten-Validation fuer `80.9.3` soll denselben headless-faehigen Kernelpfad wie Replay und Training konsumieren (`MatchKernelTrainingAdapter` plus normalisierte Seed/Input/Snapshot-Huellen), nicht einen davon getrennten Preview-Sonderpfad.
- [ ] 80.9.3 `bot:validate` als harte Vorbedingung fuer BT80C-Kandidatenevidence stabilisieren; drei reproduzierbare Validation-Paesse auf fixer Matrix verlangen. Stand 2026-04-03: Der operative Runtime-Bruch im normalen Matchstart-/Session-Scope ist behoben; `preview` erreicht wieder `PLAYING` mit echten Match-Refs/Spielern. Die verbleibende Arbeit war zunaechst im Trainingsscope: Runner-/`training-e2e`-Haertung akzeptiert jetzt explizite BT-Validation-Budgets ohne Preview-Prebuild-Overhead, aber `V1` der festen Matrix terminiert selbst mit `preview-build=false` und `BOT_RUNNER_MATCH_TIMEOUT=150000` nicht natuerlich (`PLAYING`, alle 3 Spieler `alive`, `roundsRecorded=0`). Zusatzdiagnose 2026-04-03: Lokale Preview-Proben auf BT-nahe `classic-3d`-Varianten (`standard`, `maze`, `complex`, Portale 0-6, 2-3 Bots) bleiben ebenfalls nach 40-45s in `PLAYING` und liefern weiterhin `roundsRecorded=0`. Damit ist der Restblocker im BT-Scope sauber eingegrenzt, ein sauberer Fix deutet aber wieder auf normalen Runtime-/Session-Scope fuer deterministische Seed-/Startbedingungen oder bewusst geaenderte Gameplay-Terminalsemantik. Vor solchen Eingriffen ist User-Freigabe noetig; Intake-Entwurf: `docs/plaene/neu/BT80C_Classic3D_Validation_Natural_End_Overlap_2026-04-03.md`.
- [ ] 80.9.4 Benchmark-Reports um eindeutige Urteils- und Ursachenklassen (`promote/hold/rollback/diagnose`; `harness/runtime/algorithm/throughput/artifact`) schaerfen
- [ ] 80.9.5 Benchmark-Invalidierung bei Gameplay-/Observation-/Action-/Reward-/Validation-Semantikdrift explizit dokumentieren und im Prozess verankern

### 80.99 Abschluss-Gate

- [ ] 80.99.1 Kein Champion-Wechsel und kein High-Util-Operatorlauf ohne gruene Validation-Lane und drei vollstaendige Kandidatenlaeufe mit neuer Benchmark-Evidence; BT11 bleibt bis zu einer echten manuellen Promotion-Entscheidung Champion.
- [ ] 80.99.2 Abschluss-Checks, finale Doku-Synchronisierung, Runbooks und ehrliche Restpunkt-Dokumentation sind abgeschlossen.

### Checkpoint-Log BT80C

| Datum | Typ | Stamp | Zielbild | Evidence |
| --- | --- | --- | --- | --- |
| 2026-04-02 | Repo-Haertung | `BT80C_repo_20260402` | Algorithmusprofile, PER-Aktivierung, Thermal-Ceilings und manuelle Promotion-Policy sind ohne Langlaufstart im Repo verdrahtet | commit `37bfeb3`, `tests/trainer-v36-algorithm-profile.test.mjs`, `tests/training-benchmark-artifacts.test.mjs`, `tests/training-gate.test.mjs`, `tests/training-e2e.test.mjs` |
| 2026-04-03 | Plan-Nachschaerfung | `BT80C_plan_20260403` | Validation-Harness, Kandidatenleiter, Semantik-Freeze und Drei-Run-Promotionsregel sind vor weiteren BT80C-Operatorlaeufen priorisiert | `docs/plaene/neu/BT80C_Validierungs_und_Promotionshaertung_2026-04-03.md`, `docs/bot-training/Bot_Trainingsplan.md`, `docs/bot-training/Bot_Trainings_Roadmap.md` |
| 2026-04-03 | 80.9.3 Scope-Analyse | `BT80C_80_9_3_scope_20260403` | Validation-Harness laesst sich im Trainingsscope nicht endgueltig reparieren, weil `startMatch()` im normalen Runtime-Startpfad auf `Missing interactive match runtime` faellt; BT80C braucht dafuer erst einen separaten Spielscope-Block | `docs/plaene/neu/BT80C_Runtime_Startpfad_Validation_Ueberlauf_2026-04-03.md`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |
| 2026-04-03 | Runtime-Fix Rueckfluss | `BT80C_runtime_fix_20260403` | Der normale Matchstart-/Session-Pfad erreicht in `preview` wieder `PLAYING`; BT80C 80.9.3 ist damit zurueck im Trainingsscope und blockiert jetzt an natuerlichem Rundenabschluss statt an fehlender Runtime | `tmp/perf_phase28_5_lifecycle_trend.json`, `tmp/bt80c-repro-report.json`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |
| 2026-04-03 | Runner-/Timeout-Haertung | `BT80C_80_9_3_timeout_hardening_20260403` | `bot-validation-runner` akzeptiert jetzt CLI-Budgets; `training-e2e` kann BT-Validation-Profile samt laengerem Stage-Budget weiterreichen; `quick-benchmark` nutzt dafuer `preview-build=false`. V1 bleibt dennoch selbst bei `150000ms` Aktivbudget in `PLAYING` und haelt 80.9.3 weiter im BT-Scope offen. | `scripts/bot-validation-runner.mjs`, `scripts/training-e2e.mjs`, `src/state/training/TrainingBenchmarkProfiles.js`, `tmp/bt80c-debug-report-90s-nobuild.json`, `tmp/bt80c-debug-report-150s-nobuild.json`, `tmp/bt80c-cli-smoke.json`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |
| 2026-04-03 | Classic-3D Restdiagnose | `BT80C_80_9_3_classic3d_probe_20260403` | Nicht nur V1 `standard`, sondern auch BT-nahe `classic-3d`-Varianten (`maze`, `complex`, Portale 0-6, 2-3 Bots) bleiben im Validation-Pfad nach 40-45s in `PLAYING` bei `roundsRecorded=0`; fuer eine feste Lane fehlt damit vermutlich ein deterministischer Seed-/Starthebel ausserhalb des reinen BT-Harness. | `docs/plaene/neu/BT80C_Classic3D_Validation_Natural_End_Overlap_2026-04-03.md`, `docs/Fehlerberichte/2026-04-02_bt80c-candidate-run-validation-blockers.md` |

### Risiko-Register BT80C

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Prioritized Replay oder neue Challenger-Defaults destabilisieren Resume-Ketten | hoch | Trainer | Checkpoint-Contract unveraendert halten, PER nur ueber Profile aktivieren und per Unit-Test absichern | Resume oder Replay-Stats kippen nach Profilwechsel |
| Thermal-Ceilings bleiben folgenlos, wenn keine Temperaturquelle angeschlossen ist | mittel | Train-Ops | Externe Temperaturquelle ueber Telemetrie einspeisen; bis dahin Warning sichtbar halten und keine Marathon-Promotion freigeben | High-Util-Lauf ohne Temperaturwert |
| Manual-Promotion wird im Alltag als automatischer Rollout missverstanden | hoch | QA/Ops | Gate-Report explizit auf `manual-promotion-required` bzw. `hold-champion` pinnen | Gruener Gate-Lauf wird als automatischer Champion-Wechsel interpretiert |
| Validation-Harness bleibt wegen nicht terminierender Runden in der festen Matrix blockiert und blockiert vollstaendige BT80C-Evidence | hoch | QA/Ops | Runner-/E2E-Budgets reproduzierbar halten, Preview-Prebuild aus der Lane entfernen und den verbleibenden Matrix-/Round-End-Rest explizit als BT-Scope weiterbearbeiten | `bot:validate` bleibt trotz `PLAYING` bei allen Spielern `alive`, `roundsRecorded=0`, `forced-round` oder `timeout-round` |
| Stille Gameplay-/Observation-/Action-/Reward-Aenderungen machen Champion- und Kandidatenvergleiche ungueltig | hoch | Planung + Runtime | Semantik-Freeze dokumentieren; bei Drift neuen Benchmark-Freeze verlangen | alter Champion schlaegt/neuer Kandidat verliert nur wegen geaenderter Semantik |

---

## Geplante Folgeleiter: BT90 PPO-Zweitpfad

Diese Leiter integriert den Draft aus `docs/plaene/neu/BT90_GoldStandard/**` in kleine aktive BT-Bloecke.
Wichtig: Der Draft-Ordner bleibt Referenzmaterial; sobald einer dieser Bloecke geclaimt wird, laufen Lock, Evidence und Restpunktpflege ausschliesslich in diesem Master weiter.

| id | titel | status | prio | depends_on | current_phase | quelle |
| --- | --- | --- | --- | --- | --- | --- |
| BT90 | Python-Minimalbootstrap und Contract-Wahrheit | completed | P1 | V77.99,V91.99,V92.99 | 90.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` |
| BT91 | Python-Sidecar und 1-Worker-Headless-Lane | completed | P1 | BT90.99 | 91.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md` |
| BT92 | Single-Env-Adapter und JS-authoritative Semantik | completed | P1 | BT91.99 | 92.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md` |
| BT93A | Mehr-Env-/Throughput-Harness ausserhalb der Runtime | completed | P2 | BT92.99 | 93A.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md` |
| BT93B | Minimaler PPO-Baseline-Scaffold | completed | P2 | BT93A.99 | 93B.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md` |
| BT93C | Echter PPO-Learner und konservative Baseline | completed | P2 | BT93B.99 + Audit-Haertung 2026-04-24 | 93C.99 abgeschlossen | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md` |
| BT94A | Candidate Freeze und Ablationen | planned | P2 | BT93C.99 | gesperrt vor 94A.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md` |
| BT94B | Externe A/B-Evidence und Urteilsdisziplin | planned | P2 | BT94A.99 | 94B.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md` |
| BT95 | Integrations-Handoff und Rollout-Intake-Vorbereitung | planned | P3 | BT94B `promote` | 95.1 | `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md` |

## Block BT90: Python-Minimalbootstrap und Contract-Wahrheit

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Kleinsten reproduzierbaren Python-Bootstrap fuer den PPO-Zweitpfad festziehen.
- JS-authoritative Contract-Wahrheitsartefakte und Pflichtfelder fuer den `v1`-Pfad dokumentieren.
- Erlaubte PPO-Bauorte fuer den Startpfad auf `python/**` und `data/training/ppo/**` begrenzen.
- Read-only Runtime-, Matchstart- und AI-Hub-Grenzen fuer den Startpfad fest verankern.
- Contract- oder Runtime-Drift vor dem naechsten Claim explizit als Re-Audit-Blocker behandeln.

Ausdruecklich ausserhalb von BT90:

- kein Sidecar-Handshake
- keine 1-Worker-Lane
- kein Single-Env
- kein VecEnv
- keine PPO-Baseline

Authority-Snapshot:

- Referenz fuer `BT90` bis `BT92`: `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`
- Der abgeschlossene `V101`-Ratchet bleibt ein kontrolliertes Drift-Risiko statt harter Vorblocker: wenn `TrainingContractV1.js`, `TrainerPayloadAdapter.js`, `ObservationSchemaV2.js`, `BotActionContract.js`, `TrainingDomain.js`, `RuntimeNearObservationAdapter.js`, `HybridDecisionArchitecture.js` oder `EpisodeController.js` seit dem Snapshot driften, ist vor dem naechsten PPO-Claim ein Re-Audit Pflicht.

Pre-Claim-Freeze-Check 2026-04-22:

- Maschinenlesbarer Drift-Check: `python python/scripts/bt90_freeze_check.py` schreibt das lokale Artefakt `data/training/ppo/freeze_check.json` und vergleicht Authority-Viereck plus Adjacent-Dateien gegen den Snapshot-Commit `017e8edeb548cb64a164d8dc72d1d1cb3055cc93`.
- Nur Exit-Code `0` plus `freezeOk=true` zaehlen als gruene Freeze-Bestaetigung; Exit-Code `1` oder `reAuditRequired=true` blockieren den naechsten `BT90`- bis `BT92`-Claim bis zum Re-Audit.
- `V101` bleibt nur dann ein kontrolliertes Drift-Risiko, wenn dieser Check fuer die claim-relevanten Dateien gruen bleibt; nach V101-Abschluss muss der konkrete Folgecheck in `93C.6` dokumentiert werden.
- `BT90`-Closure-Evidence fuer Freeze-, Contract- und Layer-Aussagen muss auf `python/scripts/bt90_freeze_check.py`, `data/training/ppo/freeze_check.json`, den Snapshot und konkrete Source-Queries zeigen; `git status` oder mutable README-Texte allein zaehlen dafuer nicht.

Erlaubte PPO-Bauorte:

- `python/**`
- `data/training/ppo/**`
- Boundary- und Sidecar-Orchestrierung unter Root-Skripten bleibt bis `BT91` ausserhalb dieses Blocks.

Read-only Runtime-Grenzen:

- `src/state/HeadlessMatchKernelRuntime.js`, `src/core/MatchKernelTrainingAdapter.js`, `src/entities/ai/training/TrainingTransportFacade.js`, `src/entities/ai/training/WebSocketTrainerBridge.js`
- `src/entities/ai/ObservationBridgePolicy.js`, `src/core/RuntimeConfig.js`, `src/entities/ai/BotPolicyRegistry.js`, `src/entities/ai/BotPolicyTypes.js`
- `src/entities/ai/inference/LocalDqnInference.js`, `src/state/training/RewardCalculator.js`, `src/entities/ai/hybrid/HybridDecisionArchitecture.js`, `src/state/MatchSessionFactory.js`
- Wenn BT90 Schreibzugriffe auf diese Surfaces, neue Message-Typen oder neue Runtime-Schalter braucht, ist das kein Restpunkt, sondern ein Blocker fuer Re-Audit und Re-Schnitt.

### Definition of Done (DoD)

- [x] DoD.1 Python-Version, venv-Pfad und CPU-first Install-Minimum sind reproduzierbar dokumentiert. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path python/README.md -Pattern 'Python: `3\\.10\\+`|venv-Pfad: `python/\\.venv`|python -m venv python/\\.venv|python/requirements\\.txt'` -> Minimalbootstrap pinnt Version, venv und Install-Reihenfolge)
- [x] DoD.2 JS-Wahrheitsartefakte und Pflichtfelder fuer `TrainingContractV1`/`TrainerPayloadAdapter` sind fuer den PPO-Scope festgezogen. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Authority-Viereck|Pflichtfelder fuer BT90-BT92|TrainingContractV1.js|TrainerPayloadAdapter.js|ObservationSchemaV2.js|BotActionContract.js'` -> Snapshot pinnt Authority-Viereck + Pflichtfelder; `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|TrainingContractV1.js|TrainerPayloadAdapter.js|ObservationSchemaV2.js|BotActionContract.js'` -> Freeze-Artefakt referenziert dieselben Authority-Dateien)
- [x] DoD.3 Erlaubte PPO-Bauorte und read-only Runtime-Surfaces sind explizit dokumentiert. (abgeschlossen: 2026-04-22; evidence: `rg --files python data/training/ppo` -> PPO-Bauort ist konkret angelegt; `Select-String -Path docs/referenz/ai_architecture_context.md -Pattern 'HeadlessMatchKernelRuntime|MatchKernelTrainingAdapter|TrainingTransportFacade|WebSocketTrainerBridge|ObservationBridgePolicy|RuntimeConfig|BotPolicyRegistry|BotPolicyTypes|LocalDqnInference|RewardCalculator|HybridDecisionArchitecture|MatchSessionFactory'` -> Layer-Referenz pinnt die read-only Surfaces)
- [x] DoD.4 Contract-/Runtime-Drift ist als Blocker-Regel festgezogen; Sidecar-, Worker-, Env- und PPO-Baseline-Scope bleiben explizit ausserhalb von BT90. (abgeschlossen: 2026-04-22; evidence: `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json` (Exit-Code `1`); `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|driftCount|reAuditRequired|TrainingDomain.js|RuntimeNearObservationAdapter.js|HybridDecisionArchitecture.js'` -> Freeze-Artefakt erzwingt Re-Audit statt stiller Drift-Anpassung)
- [x] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-22; evidence: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)

### 90.1 Python-Minimalbootstrap

- [x] 90.1.1 Python-Version, venv-Pfad und Install-Reihenfolge fuer den Minimalstack dokumentieren. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path python/README.md -Pattern 'Python: `3\\.10\\+`|venv-Pfad: `python/\\.venv`|python -m venv python/\\.venv|python/requirements\\.txt'` -> Minimalbootstrap pinnt Version, venv und Install-Reihenfolge)
- [x] 90.1.2 Nur fuer Contract-Smokes noetige Dependencies pinnen; schwere PPO-Libs nicht vorschnell in den Startblock ziehen. (abgeschlossen: 2026-04-22; evidence: `Get-Content python/requirements.txt` -> BT90-Minimalstack ist konkret gepinnt; `rg -n 'stable-baselines3|torch|tensorboard' python/requirements.txt` -> keine Treffer fuer schwere PPO-Libs)
- [x] 90.1.3 Artefaktpfade unter `python/**` und `data/training/ppo/**` fuer den Startblock festlegen; Root-Boundary-Skripte bleiben bis BT91 ausserhalb. (abgeschlossen: 2026-04-22; evidence: `rg --files python data/training/ppo` -> reservierte Python-/Artefaktpfade sind konkret angelegt; `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern 'Boundary- und Sidecar-Orchestrierung unter Root-Skripten bleibt bis `BT91` ausserhalb dieses Blocks.'` -> Root-Boundary-Skripte bleiben ausserhalb von BT90)

### 90.2 Contract- und Layer-Wahrheit

- [x] 90.2.1 `tests/training-environment.contract.test.mjs`, `scripts/training-smoke.mjs` und `scripts/headless-match-kernel-smoke.mjs` als JS-authoritative Wahrheitsbasis auswerten. (abgeschlossen: 2026-04-22; evidence: `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Stabilisierende Evidenz fuer den Snapshot|tests/training-environment.contract.test.mjs|scripts/training-smoke.mjs|scripts/headless-match-kernel-smoke.mjs'` -> Snapshot pinnt die JS-authoritative Wahrheitsbasis)
- [x] 90.2.2 Pflichtfelder fuer `TrainingContractV1` und `TrainerPayloadAdapter` dokumentieren (`observationSchemaVersion`, `observationLength`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision` soweit transportiert). (abgeschlossen: 2026-04-22; evidence: `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Pflichtfelder fuer BT90-BT92|observationSchemaVersion|observationLength|rewardBreakdown|terminalReason|truncatedReason|hybridDecision'` -> Snapshot pinnt Pflichtfelder fuer BT90-BT92; `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|TrainingContractV1.js|TrainerPayloadAdapter.js'` -> Freeze-Artefakt verankert die zugehoerigen Authority-Dateien gegen den Snapshot-Commit)
- [x] 90.2.3 Read-only-Surfaces und erlaubte Bauorte fuer den PPO-Zweitpfad explizit abgrenzen. (abgeschlossen: 2026-04-22; evidence: `rg --files python data/training/ppo` -> reservierte PPO-Bauorte sind konkret angelegt; `Select-String -Path docs/referenz/ai_architecture_context.md -Pattern 'HeadlessMatchKernelRuntime|MatchKernelTrainingAdapter|TrainingTransportFacade|WebSocketTrainerBridge|ObservationBridgePolicy|RuntimeConfig|BotPolicyRegistry|BotPolicyTypes|LocalDqnInference|RewardCalculator|HybridDecisionArchitecture|MatchSessionFactory'` -> Layer-Referenz pinnt die read-only Runtime-Surfaces)
- [x] 90.2.4 Runtime- oder Contract-Drift als Blocker markieren; Sidecar-, Worker-, Single-Env-, VecEnv- und PPO-Baseline-Scope explizit ausserhalb von BT90 halten. (abgeschlossen: 2026-04-22; evidence: `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json` (Exit-Code `1`); `Select-String -Path data/training/ppo/freeze_check.json -Pattern 'snapshotCommit|driftCount|reAuditRequired|TrainingDomain.js|RuntimeNearObservationAdapter.js|HybridDecisionArchitecture.js'` -> Freeze-Artefakt erzwingt Re-Audit und kapselt Drift nicht still)

### 90.99 Abschluss-Gate

- [x] 90.99.1 Alle Phasen 90.1 bis 90.2 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-22; evidence: BT90.1-BT90.2 Evidence + `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)
- [x] 90.99.2 Minimal-Bootstrap, Contract-Wahrheit, Bauort-/Runtime-Grenzen und Drift-Blocker sind belastbar an BT91 uebergeben. (abgeschlossen: 2026-04-22; evidence: `python python/scripts/bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json` (Exit-Code `1`); `Select-String -Path docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md -Pattern 'Maschinenlesbarer Freeze-Check|Harte Blocker-Signale'` -> Handover ist an Snapshot + Freeze-Gate statt an README-/`git status`-Aussagen gekoppelt)

BT90-Abschlussstand 2026-04-22:

- Closure-Checks sind gruen: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- BT90-Handover-Evidence ist auf Snapshot + Freeze-Artefakt umgestellt: `data/training/ppo/freeze_check.json` meldet aktuell `driftCount=3` und `reAuditRequired=true` fuer `TrainingDomain.js`, `RuntimeNearObservationAdapter.js` und `HybridDecisionArchitecture.js`; vor dem naechsten `BT90`- bis `BT92`-Claim ist daher Re-Audit Pflicht.
- BT90-Lock ist freigegeben; fuer neue `BT90`- bis `BT92`-Claims zaehlt jetzt der Freeze-/Artefaktpfad statt README-/`git status`-Evidence.

### Risiko-Register BT90

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Schwere PPO-/Torch-Abhaengigkeiten werden zu frueh in den Bootstrap gezogen | hoch | Governance | BT90 nur mit Minimalstack schliessen; volle PPO-Libs erst in Folgeblocks erzwingen | Diskussion dreht sich vor dem Contract-Smoke um CUDA/SB3/Torch |
| Contract-Wahrheit driftet zwischen Testartefakten, Payload und Dokumentation | hoch | Integration | echte JS-Artefakte als primaere Quelle festschreiben; Mismatch als Blocker fuehren | Pflichtfelder oder Versionsangaben widersprechen sich |
| PPO-Pfad greift frueh in produktive Runtime-Surfaces ein | hoch | Architektur | read-only-Liste und Layer-Leitplanken vor Claim festhalten | Wunsch nach Runtime-Schaltern, Bot-Typen oder Matchstart-Abkuerzungen |
| Verdeckte Scope-Ausweitung zieht Sidecar-, Worker- oder Env-Arbeit wieder in BT90 | hoch | Planung | Ausschlussliste im Block fixieren; BT91 und BT92 getrennt claimbar halten | BT90-Diskussion fordert `trainer-ready`, 100 Steps, Single-Env oder PPO-Baseline |
| Repo-Drift oder spaetere Ignore-Aenderungen verstecken versionierte PPO-Manifeste wieder | mittel | Repo-Governance | `.gitignore`-Ausnahme fuer `data/training/ppo/**` beibehalten und PPO-Evidence nur unter diesem Unterpfad versionieren | neuer PPO-Claim legt versionierbare Artefakte ausserhalb von `data/training/ppo/**` ab |

---

## Block BT91: Python-Sidecar und deterministische 1-Worker-Headless-Lane

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT100_Python_Bootstrap_PoC.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Python-Sidecar ueber den bestehenden Contract `v1` bzw. Bridge-V1-Vertrag anschliessen.
- Deterministische 1-Worker-Headless-Lane mit mindestens 100 Steps beweisen.
- Kleine Boot-/Reset-/Step-Baseline nur fuer diese Lane als Handover fuer BT92 dokumentieren.

Quellzuschnitt:

- `BT91` uebernimmt aus `BT100` ausschliesslich `100.3` bis `100.5`.
- `BT92` behaelt `BT101.1` bis `BT101.3`; Mehr-Env-/VecEnv-Folgepfad aus `BT101.4` bis `BT101.6` und PPO-Arbeit aus `BT102` oeffnen erst als `BT93A` bis `BT93C`.

Authority-Snapshot:

- `BT91` arbeitet weiter gegen `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`.
- Wenn `TrainingContractV1.js`, `TrainerPayloadAdapter.js`, `ObservationSchemaV2.js`, `BotActionContract.js` oder die markierten Adjacent-Dateien relevant driften, ist vor dem naechsten `BT91`-Claim ein Re-Audit Pflicht.

Explizit ausserhalb von BT91:

- 2-Worker- oder 4-Worker-Arbeit
- Mehr-Env- oder VecEnv-Themen
- PPO-Baseline oder Throughput-/Skalierungsversprechen

### Definition of Done (DoD)

- [x] DoD.1 Der Python-Sidecar sendet `trainer-ready` stabil und liest `bot-action-request`, `training-reset`, `training-step` und `trainer-stats-request` ohne neue Message-Typen. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`readyPayload.type=trainer-ready`, `messageCounts.bot-action-request=100`, `training-reset=1`, `training-step=100`, `trainer-stats-request=1`))
- [x] DoD.2 Eine deterministische 1-Worker-Lane liefert mindestens 100 Steps ueber den bestehenden Headless-/Transportpfad. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/lane_baseline.json` (`workerCount=1`, `stepsCompleted=100`, `deterministic=true`))
- [x] DoD.3 Boot-, Reset- und mittlere Step-Latenz sind fuer diese eine Lane als Artefakt dokumentiert. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/lane_baseline.json` (`boot=279.554ms`, `resetAck=13.679ms`, `trainingStepAck.average=14.255ms`))
- [x] DoD.4 Keine produktive Runtime-, Matchstart- oder AI-Hub-Datei wurde angepasst. (abgeschlossen: 2026-04-22; evidence: BT91-Diff bleibt in `python/**`, `data/training/ppo/**`, `scripts/training-headless-bridge-smoke.mjs` und `docs/bot-training/Bot_Trainingsplan.md` -> boundary-only BT91-Bauorte)
- [x] DoD.5 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-22; evidence: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)

### 91.1 Sidecar-Handshake und Contract-Smoke

- [x] 91.1.1 Python-Sidecar sendet `trainer-ready` reproduzierbar ueber den bestehenden Transportrahmen. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`readyPayload.type=trainer-ready`, `protocolVersion=bt91-bridge-v1`))
- [x] 91.1.2 Sidecar liest `bot-action-request`, `training-reset`, `training-step` und `trainer-stats-request` ohne neue Envelope- oder Message-Typen. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`messageCounts.bot-action-request=100`, `training-reset=1`, `training-step=100`, `trainer-stats-request=1`))
- [x] 91.1.3 Payload-Validierung erfolgt gegen `TrainingContractV1` und reale JS-Artefakte, nicht gegen eine freie Python-Spezifikation. (abgeschlossen: 2026-04-22; evidence: `python\\.venv\\Scripts\\python.exe -m pytest python\\tests\\test_contract_v1.py -q` -> `3 passed in 0.38s`; `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json` (`validationFailures=0`))

### 91.2 1-Worker-Lane und Baseline

- [x] 91.2.1 Boundary-Harness oder gleichwertiger PoC-Pfad startet genau einen Worker ausserhalb des produktiven Runtime-Pfads. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `scripts/training-headless-bridge-smoke.mjs`, `data/training/ppo/lane_baseline.json` (`workerCount=1`))
- [x] 91.2.2 Die Lane liefert mindestens 100 deterministische Steps ueber `HeadlessMatchKernelRuntime`, `MatchKernelTrainingAdapter` und `TrainingTransportFacade`. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/contract_smoke.json`, `data/training/ppo/lane_baseline.json` (`headlessRuntimeContractVersion=match-kernel-headless-runtime.v1`, `trainingAdapterContractVersion=match-kernel-training-adapter.v1`, `stepsCompleted=100`))
- [x] 91.2.3 Boot-, Reset- und Step-Latenz werden fuer diese eine Lane dokumentiert; 2- und 4-Worker, Mehr-Env-/VecEnv-Themen und PPO-Baseline bleiben bewusst ausserhalb von BT91. (abgeschlossen: 2026-04-22; evidence: `node scripts\\training-headless-bridge-smoke.mjs` -> `data/training/ppo/lane_baseline.json` (`boot=279.554ms`, `resetAck=13.679ms`, `trainingStepAck.average=14.255ms`); Boundary-Notes pinnen `workerCount=1` und halten 2-/4-Worker, Mehr-Env, VecEnv und PPO-Baseline explizit ausserhalb)

### 91.99 Abschluss-Gate

- [x] 91.99.1 Alle Phasen 91.1 bis 91.2 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-22; evidence: BT91.1-BT91.2 Evidence + `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS; `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)
- [x] 91.99.2 Sidecar-Handshake, Contract-Smoke und 1-Worker-Lane sind belastbar an BT92 uebergeben. (abgeschlossen: 2026-04-22; evidence: `data/training/ppo/contract_smoke.json`, `data/training/ppo/lane_baseline.json`, `python/README.md` -> BT92-Handover mit `workerCount=1`, `stepsCompleted=100` und dokumentierten Latenzen)

BT91-Abschlussstand 2026-04-22:

- Closure-Checks sind gruen: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Lokale BT91-Artefakte liegen im aktuellen Worktree unter `data/training/ppo/contract_smoke.json` und `data/training/ppo/lane_baseline.json`; `git status` fuehrt sie derzeit noch untracked; der Sidecar validiert gegen den eingefrorenen JS-authoritative `v1`-Pfad ohne neue Message-Typen
- Der Boundary-Harness bleibt bewusst ausserhalb produktiver Runtime-Surfaces; 2-/4-Worker, Mehr-Env und VecEnv bleiben fuer `BT93A` offen, PPO-Scaffold und Baseline erst fuer `BT93B`/`BT93C`

BTF-09-Nachschreibung 2026-04-23 (Failure-Klasse `contract_smoke.json`):

- `contract_smoke.json` weist `failures=4` und `lastFailure=socket-closed` aus; der Plan hatte diese Werte beim BT91-Abschluss nicht explizit eingeordnet.
- Fachliche Einordnung: Klasse **shutdown-teardown / akzeptiert**. Die 4 `socket-closed`-Events entstehen beim sauberen Shutdown des Headless-Harness nach Episode-Limit (`truncated=true` bei Step 100). Der Bridge-Transportzaehler registriert den unilateralen Socket-Close als `failure`, weil noch wenige ACK-Slots im Drain-Zustand sind.
- Beleg fuer keine mid-run Instabilitaet: `requestsSent (202) == responsesReceived (202)`; `retries=0`; `timeouts=0`; `fallbacks=0`; `backpressureDrops=0`; `ackEvictions=0`; `validationFailures=0`; `stepsCompleted=100`; `finalStep.delivered=true`.
- Monitoring-Regel fuer BT93A: `failures`-Zaehler pro Worker separat erfassen; akzeptierte Grenzwerte: `failures < 2*workerCount*5 AND retries=0 AND timeouts=0 AND requestsSent=responsesReceived`. Wenn ein Folgelauf `retries > 0` oder `timeouts > 0` zeigt, ist ein Transport-Re-Audit Pflicht.
- Vollstaendige Failure-Klassen-Analyse: `data/training/ppo/bt91_failure_class_btf09.json`.

### Risiko-Register BT91

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Der Sidecar missversteht den Bridge-V1-Payload | hoch | Integration | Validierung gegen reale Transportartefakte und Pflichtfelder aus BT90 | `missing-action`, Feldmismatch oder unerwartete Envelopes |
| Schon die 1-Worker-Lane ist bei Boot/Reset/Step instabil | hoch | Train-Ops | strikt nur eine Lane, feste Seeds und kleine 100-Step-Basis | PoC haengt, driftet oder bleibt unter 100 Steps |
| Root-Harness und Boundary-Skripte wachsen in produktive Orchestrierung hinein | mittel | Governance | nur nichtproduktive Boundary-Skripte ausserhalb der Runtime zulassen | neue Root-Surfaces oder Runtime-Schalter werden noetig |

---

## Block BT92: Single-Env-Adapter und JS-authoritative Semantik

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Observation-/Action-Authority gegen die echten runtime-near Artefakte absichern.
- Genau ein headless `gymnasium.Env` fuer `reset()`, `step()` und `close()` ueber den bestehenden Pfad bauen.
- Reward-, `done`-, `truncated`- und Info-Semantik aus JS authoritative uebernehmen.
- `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength` im Single-Env-Pfad sichtbar machen.
- Die BT92-Action-Surface bleibt die rohe JS-authoritative Bool-/Index-Semantik; die feste `257`er-Indexbreite in `CurviosEnv` ist Boundary-Kompatibilitaet und noch keine PPO-Policy-Surface.

Authority-Snapshot:

- BT92 arbeitet gegen denselben Freeze aus `docs/plaene/neu/BT90_GoldStandard/BT90_Contract_Authority_Snapshot_2026-04-22.md`.
- Nach relevanten `V101`- oder Repo-Aenderungen an Authority- oder Adjacent-Dateien ist der claim-relevante Authority-Abgleich vor weiterem PPO-Vergleich neu zu bestaetigen; ohne frischen Abgleich gilt das als Blocker, nicht als kleiner Restpunkt.

Explizit ausserhalb von BT92:

- Mehr-Env
- VecEnv
- PPO-Baseline
- Parallelisierungs- oder Throughput-Versprechen

### Definition of Done (DoD)

- [x] DoD.1 Observation- und Action-Authority sind gegen `TrainerPayloadAdapter`, `TrainingContractV1`, `ObservationSchemaV2` und `BotActionContract` explizit validiert. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`authority`, `scope`), Freeze-Abgleich ohne BT92-relevanten Drift)
- [x] DoD.2 Ein Single-Env-Headless-Pfad laeuft stabil fuer `reset()`, `step()` und `close()`. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe -m pytest python/tests` -> `6 passed`; `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json`)
- [x] DoD.3 `reward`, `done`, `truncated`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength` werden JS-authoritative und sichtbar durchgereicht. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`visibleEnvFields`, `smoke.steps[*]`))
- [x] DoD.4 Mehr-Env-, VecEnv-, PPO-Baseline- und Parallelisierungs-Themen bleiben explizit ausserhalb von BT92.99. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`scope.multiEnv=false`, `vecEnv=false`, `ppoBaseline=false`))
- [x] DoD.5 Keine produktive Runtime-, Matchstart- oder AI-Hub-Datei wurde angepasst. (abgeschlossen: 2026-04-23; evidence: BT92-Arbeit bleibt in `python/**`, `data/training/ppo/**`, `scripts/training-single-env-bridge.mjs` und `docs/bot-training/Bot_Trainingsplan.md`; produktive Runtime-Surfaces bleiben read-only)
- [x] DoD.6 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-23; evidence: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)

### 92.1 Observation-/Action-Authority

- [x] 92.1.1 Reale Payload-Felder aus `TrainerPayloadAdapter` und `TrainingContractV1` als Pflichtliste fuer den Single-Env-Pfad erfassen. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`authority.trainerTransitionTopLevelFields`, `authority.trainerTransitionInfoFields`))
- [x] 92.1.2 `observationSchemaVersion` und `observationLength` fuer den aktuellen V2-Pfad festziehen; Drift als Blocker markieren statt still zu kapseln. (abgeschlossen: 2026-04-23; evidence: Freeze-Abgleich gegen `TrainingContractV1.js`, `TrainerPayloadAdapter.js`, `ObservationSchemaV2.js`, `BotActionContract.js`, `TrainingDomain.js`, `RuntimeNearObservationAdapter.js`, `HybridDecisionArchitecture.js`, `EpisodeController.js` -> kein BT92-relevanter Drift; `data/training/ppo/single_env_smoke.json` zeigt `v2-runtime-near` und `64`)
- [x] 92.1.3 Action-Mapping gegen `BotActionContract.js` absichern, inklusive `useItem`, Clamping und Invalid-Handling. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe -m pytest python/tests` -> `6 passed`; `data/training/ppo/single_env_smoke.json` zeigt invalides `shootItem`/Index-Payload neutralisiert zu `shootItem=false`, `shootItemIndex=-1`, `useItem=-1`)

### 92.2 Single-Env-Lifecycle und JS-Semantik

- [x] 92.2.1 `CurviosEnv` oder gleichwertiges Env fuer genau einen Lifecycle anlegen und `reset()`, `step()` sowie `close()` ueber den bestehenden Headless-Pfad verdrahten. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe -m pytest python/tests/test_curvios_env.py` -> `2 passed`; `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json`)
- [x] 92.2.2 `reward`, `done`, `truncated`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength` im Env-/Info-Pfad sichtbar machen oder Restluecken explizit benennen. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`visibleEnvFields`, `smoke.reset`, `smoke.steps[*]`))
- [x] 92.2.3 `check_env(...)` oder gleichwertige Compliance plus echter Reset-/Step-Smoke laufen auf einem instanziierten Single-Env; Parallelisierung bleibt dabei bewusst ausserhalb. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt92_single_env_smoke.py` -> `data/training/ppo/single_env_smoke.json` (`checkEnv.passed=true`, `finalTruncatedReason=max-steps`))

### 92.99 Abschluss-Gate

- [x] 92.99.1 Alle Phasen 92.1 bis 92.2 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-23; evidence: BT92.1-BT92.2 Evidence + `data/training/ppo/single_env_smoke.json`)
- [x] 92.99.2 Observation-/Action-Authority, Single-Env-Lifecycle und JS-authoritative Semantik sind belastbar an `BT93A` uebergeben; PPO-Scaffold, konservative Baseline und Parallelisierung bleiben bewusst offen fuer `BT93B`/`BT93C`. (abgeschlossen: 2026-04-23; evidence: `data/training/ppo/single_env_smoke.json`, `python/README.md`, `python/envs/README.md` -> Handover bleibt auf den kleinsten Folgepfad `BT93A -> BT93B -> BT93C` begrenzt)

BT92-Abschlussstand 2026-04-23:

- Closure-Checks sind gruen: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS
- Das BT92-Artefakt `data/training/ppo/single_env_smoke.json` liegt aktuell nur als lokale Worktree-Datei vor; `git status` fuehrt es derzeit noch untracked; der Single-Env bleibt bei genau einem Headless-/Bridge-v1-Lifecycle mit sichtbaren JS-authoritativen Semantikfeldern
- BTF-07-Festlegung: spaetere PPO-Claims trainieren nicht direkt auf der rohen `257`er-Indexbreite. `BT93B` muss einen `Split-Head` fuer Bool-/Intent-Felder plus `shootItemIndex`/`useItem` pinnen; eine `Action-Mask` aus `inventoryLength` bleibt optionales Hilfssignal, der Sanitizer nur Boundary-Guardrail.
- Mehr-Env, VecEnv, PPO-Scaffold, konservative Baseline und Parallelisierung bleiben unveraendert offen fuer `BT93A` bis `BT93C`

### Risiko-Register BT92

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Observation-, Schema- und Action-Authority driftet zwischen Payload, Schema und Sanitizer | hoch | Integration | Autoritaetsdreieck aus `TrainerPayloadAdapter`, `TrainingContractV1`, `ObservationSchemaV2` und `BotActionContract` hart pinnen | Shape-Mismatch, falsche `useItem`-Semantik oder unbekannte Length |
| Python interpretiert Reward- oder Episode-Semantik neu statt sie nur zu adaptieren | hoch | Governance | JS als einzige fachliche Quelle festschreiben; fehlende Felder sichtbar machen | Reward-Neuberechnung oder Python-seitige `done`-/`truncated`-Logik |
| Mehr-Env-/VecEnv-, PPO- oder Parallelisierungsdruck zieht wieder in den Minimalblock hinein | mittel | Planung | `BT93A` als separaten Harness-Block sichtbar halten und `BT93B`/`BT93C` erst danach oeffnen; keine Throughput-Ziele in BT92 versprechen | Closure-Diskussion fordert schon Parallelisierung, PPO-Baseline oder Throughput-Ziele |

---

## Block BT93A: Mehr-Env-/Throughput-Harness ausserhalb der Runtime

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT101_Custom_Gymnasium_Environment.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- `2-Env` ist die kleinste claimbare Mehr-Env-Lane; `4-Env` bleibt ausdruecklicher Downgrade-Kandidat statt stiller Zielwert.
- Der Block liefert nur Harness-, Throughput-, Timeout- und Failure-Evidence ausserhalb der produktiven Runtime.
- Kein `python/train.py`, kein `python/eval.py`, kein Champion-/Baseline-Urteil in demselben Claim.

Bekannte Harness-Duplikation (BTF-11, dokumentiert 2026-04-23):

- `HeadlessLaneStepRunner` existiert byte-identisch in `scripts/training-headless-bridge-smoke.mjs` (L151) und `scripts/training-single-env-bridge.mjs` (L134); einzige Abweichungen: `episodeId`-Prefix und Reset-Signatur.
- `DeterministicTrainingStepRunner` (`src/entities/ai/training/DeterministicTrainingStepRunner.js`) ist die kanonische Abstraktion, ist aber kein Drop-in-Ersatz: die API erwartet fertige Observation-Arrays statt des internen Session-Aufbaus.
- Entscheidung: Die Duplikation bleibt als stabile Boundary-Ausnahme bis `BT93A`; Konsolidierung (Extraktion einer gemeinsamen Datei oder API-Anpassung) wird als `BT93A.refactor-harness` geoeffnet und erst dann angegangen, wenn der BT93A-Harness konkret wird.

Claim-Grenze:

- `BT93A` ist erst claimbar, wenn `BT92.99` gruen ist, `python python/scripts/bt90_freeze_check.py` mit `freezeOk=true` endet, der Follow-up-Tracker `BTF-01` bis `BTF-08` gruen fuehrt und der Throughput-Anker aus `data/training/ppo/throughput_analysis_btf08.json` als Startbasis vorliegt.
- Die Claim-Freigabe oeffnet nur Harness-/Lane-Arbeit; PPO-Scaffold und echte Baseline bleiben ausserhalb.

Throughput-Anker (BTF-08, abgeleitet aus `data/training/ppo/lane_baseline.json` 2026-04-22):

- 1-Worker-Baseline: `action.average=14.9ms`, `trainingStepAckAvg=14.3ms`, Roundtrip ~`29ms` → max. ~`34 Steps/s` theoretisch, realistisch ~`28 Steps/s` unter Windows.
- 2-Worker-Projektion: `30-55 Steps/s` je nach Subproc-Overhead – NUR ein Projektion; echte Zahl kommt aus dem Harness-Artefakt `data/training/ppo/lane_baseline_2env.json`.
- 4-Worker-Projektion: `40-90 Steps/s` – nur freigegeben wenn 2-Env-Harness >= 45 Steps/s UND failure_rate <= 0.02.
- Smoke-Budget `2-Env`: 100 Steps/Env; Harness-Budget: 500 Steps/Env max. 10 Minuten Wall-Clock.
- Downgrade-Trigger: failure_rate > 0.05 OR Step-Rate unter 1-Worker-Baseline OR Worker-Churn.
- BT93C-Referenzlauf-Budget: erst ableiten wenn BT93A-Harness-Artefakt vorliegt; Draft-Zahlen (z.B. 300k Steps, 4 Envs) zaehlen nicht.
- Vollstaendige Downgrade-Regeln und Budget-Derivation: `data/training/ppo/throughput_analysis_btf08.json`.

### Definition of Done (DoD)

- [x] DoD.1 Mindestens eine artefaktbasierte `2-Env`-Lane ist ausserhalb der produktiven Runtime dokumentiert. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json`, `data/training/ppo/bt93a_handover_2env.json` (`validatedEnvCount=2`, `stepsPerSecond=58.740111449952536`, `failureRate=0.0`, `memoryStable=true`))
- [x] DoD.2 Wall-Clock-Throughput, Reset-/Timeout-Rate, Restart-Verhalten und Failure-Klassen sind fuer `2-Env` reproduzierbar festgehalten. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`restartBehavior.fallbackLaneSpec.laneType=sequential-2env-fallback`); `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json` (`wallClockSeconds=17.024142026901245`, `resetRatePerEnv=1.0`, `timeoutRatePerRequest=0.0`, `failureClasses={}`))
- [x] DoD.3 `4-Env` ist nur bei tragender Evidence freigegeben (>= 45 Steps/s bei 2-Env UND failure_rate <= 0.02), sonst explizit als Downgrade ausgeschlossen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/bt93a_handover_2env.json` (`stepsPerSecond=58.740111449952536`, `failureRate=0.0`, `fourEnvStatus=eligible-from-2env-thresholds-not-yet-measured`, `openHarnessRisks[0].currentState=thresholds-met-but-direct-4env-evidence-missing`))
- [x] DoD.4 `BT93A` oeffnet weder `python/train.py`/`python/eval.py` noch eine echte PPO-Baseline. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`scope.ppoBaseline=false`, `scopeGuardrails.phaseBoundary=BT93A documents harness, timeout, throughput and failure evidence only.`))
- [x] DoD.5 Der Handover-Artefakt pinnt die gemessene Step-Rate, Env-Anzahl und Downgrade-Entscheid artefaktbasiert als Pflichteingang fuer `BT93B`. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/bt93a_handover_2env.json` (`defaultStartEnvCount=2`, `maxValidatedEnvCount=2`, `currentDowngradeDecision=stay-on-validated-2env-lane`))
- [x] DoD.6 Die in BTF-11 identifizierte Code-Duplikation ist aufgeloest und die Trainingslogik konsolidiert. (abgeschlossen: 2026-04-24; evidence: `git show --stat --oneline 9653ef5` -> commit `9653ef5`; `node --check scripts/training-headless-lane-runner.mjs`, `node --check scripts/training-single-env-bridge.mjs`, `node --check scripts/training-headless-bridge-smoke.mjs` -> Shared `HeadlessBoundaryController` parsebar)
- [x] DoD.7 Die PPO-Batch-Size Mathematik ist zwingend aus dem gemessenen Throughput herzuleiten, um realistische Update-Frequenzen nachzuweisen [siehe PPO-ADR-001]. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/bt93a_handover_2env.json` (`rolloutBudgetDerivation.examples` fuer `15s`, `30s`, `60s` aus `measuredLane.stepsPerSecond`))
- [x] DoD.8 Die Ueberwachung auf Memory-Leaks waehrend der Smoke-Runs ist als hartes Kriterium integriert [siehe PPO-ADR-003]. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json` (`memory.leakCheck.memoryStable=true`, `memory.pythonProcess.rssMB.deltaMB=4.613`, `memory.tracemalloc.currentMB.deltaMB=1.114`, `memory.controllerProcesses.cleanupSettled=true`))
- [x] DoD.9 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-24; evidence: `npm.cmd run gates:pre-commit` -> PASS (`plan:check`, `docs:sync`, `docs:check`); `npm.cmd run build` -> PASS)

### 93A.1 Harness-Scope und Lane-Start

- [x] 93A.1.1 Start erst nach gruener BT92-Single-Env-Lage, gruener Freeze-Bestaetigung, BTF-08-gruen und explizitem Split-Handover; der Block bleibt ausserhalb jeder PPO-Baseline-Arbeit. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_claim_manifest.py` -> `data/training/ppo/bt93a_claim_manifest.json` (`ok=true`, `nextSubPhase=93A.1.2`))
- [x] 93A.1.2 `2-Env` ist die kleinste Mehr-Env-Lane; Prozesse, Ports, Timeouts, Restart-Verhalten und Boundary-Grenzen werden artefaktbasiert dokumentiert, mit dem 1-Worker-Throughput-Anker aus `data/training/ppo/throughput_analysis_btf08.json` als Vergleichsbasis. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`workerCount=2`, `controllerTimeoutSeconds=30.0`))
- [x] 93A.1.3 `4-Env` wird nur als optionaler Folgefall mit ehrlichem Downgrade geoeffnet; formale Imports, Draft-Zahlen oder Wunschzahlen zaehlen nicht als Lane-Nachweis. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`fourEnvPolicy.defaultStatus=locked-until-measured-2env-evidence`, `nextPhase=93A.1.4`))
- [x] 93A.1.4 Mathematische Herleitung der machbaren PPO-Batch-Size aus dem gemessenen Throughput dokumentieren [siehe PPO-ADR-001]. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`batchMath.examples` fuer `15s`, `30s`, `60s`; `nextPhase=93A.2`))

### 93A.2 Throughput-, Timeout- und Failure-Artefakte

- [x] 93A.2.1 Mehr-Env-/VecEnv-Smokes liefern reproduzierbare Daten zu Env-Anzahl, Wall-Clock-Throughput, Reset-/Timeout-Rate und Failure-Klassen; Ergebnis unter `data/training/ppo/lane_baseline_2env.json` (oder gleichwertigem Artefakt). (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json` (`stepsPerSecond=60.24846827863641`, `resetRatePerEnv=1.0`, `timeoutRatePerRequest=0.0`, `truncatedReasons.max-steps=2`))
- [x] 93A.2.2 Python-seitiges Memory-Usage-Tracking implementieren und auf Memory-Leaks bei laengeren Smoke-Runs ueberpruefen [siehe PPO-ADR-003]. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json` (`memory.leakCheck.memoryStable=true`, `memory.pythonProcess.rssMB.deltaMB=4.785`, `memory.tracemalloc.currentMB.deltaMB=1.13`, `memory.controllerProcesses.cleanupSettled=true`))
- [x] 93A.2.3 Der Handover an den PPO-Scaffold pinnt gemessene Step-Rate, zulassige Env-Anzahl und harte Downgrade-Regeln aus dem Harness-Artefakt statt aus textuellen Annahmen. (abgeschlossen: 2026-04-23; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --handover-only` -> `data/training/ppo/bt93a_handover_2env.json` (`defaultStartEnvCount=2`, `measuredLane.stepsPerSecond=59.347422348627816`, `scaffoldContract.fourEnvStatus=eligible-from-2env-thresholds-not-yet-measured`))
- [x] 93A.2.4 Offene Harness-Risiken bleiben sichtbar; fehlende `4-Env`-Tragfaehigkeit gilt als dokumentierter Restpunkt statt als stiller Erfolg; sequenzielle Fallback-Lane als Alternative pinnen wenn Subproc instabil. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py --plan-only` -> `data/training/ppo/bt93a_lane_plan.json` (`openHarnessRisks=3`, `restartBehavior.fallbackLaneSpec.laneType=sequential-2env-fallback`); `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/bt93a_handover_2env.json` (`openHarnessRisks[0].currentState=thresholds-met-but-direct-4env-evidence-missing`, `openHarnessRisks[1].status=guarded-by-pinned-fallback`))

### 93A.3 Harness-Konsolidierung (BTF-11)

 - [x] 93A.3.1 Die in BTF-11 als Boundary-Ausnahme dokumentierte Duplikation des `HeadlessLaneStepRunner` zwischen `smoke.mjs` und `single-env-bridge.mjs` aufloesen. (abgeschlossen: 2026-04-24; evidence: `git show --stat --oneline 9653ef5` -> commit `9653ef5`)
- [x] 93A.3.2 Gemeinsame Trainingslogik konsolidieren, sobald der `2-Env` Harness in 93A.2 konkret steht. (abgeschlossen: 2026-04-24; evidence: `node --check scripts/training-headless-lane-runner.mjs`, `node --check scripts/training-single-env-bridge.mjs`, `node --check scripts/training-headless-bridge-smoke.mjs` -> Shared `HeadlessBoundaryController` parsebar; `smoke` und `single-env-bridge` nutzen dieselbe Boundary-Trainingslogik)

### 93A.99 Abschluss-Gate

- [x] 93A.99.1 Alle Phasen 93A.1 bis 93A.3 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-24; evidence: `npm.cmd run plan:check` -> PASS; `Get-Content -Path data\training\ppo\bt93a_handover_2env.json` -> `ok=true`, `measuredLane.stepsPerSecond=58.740111449952536`, `openHarnessRisks=3`)
- [x] 93A.99.2 Es existiert mindestens eine stabile `2-Env`-Lane mit gemessenem Throughput-Artefakt; `4-Env` ist nur bei tragender Evidenz freigegeben (Schwelle: >= 45 Steps/s, failure_rate <= 0.02), sonst explizit als Downgrade ausgeschlossen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93a_2env_smoke.py` -> `data/training/ppo/lane_baseline_2env.json`, `data/training/ppo/bt93a_handover_2env.json` (`validatedEnvCount=2`, `stepsPerSecond=58.740111449952536`, `failureRate=0.0`, `fourEnvStatus=eligible-from-2env-thresholds-not-yet-measured`))

### Risiko-Register BT93A

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Windows-/Subproc- oder Worker-Churn destabilisiert Mehr-Env-Laeufe | hoch | Train-Ops | erst `2-Env` auf 500-Step-Basis; sequenzielle Fallback-Lane dokumentieren; 4-Env erst ab 45 Steps/s-Schwelle | Worker starten oder beenden nicht deterministisch |
| Headless-Throughput reicht noch nicht fuer claimbare Folgeschritte | hoch | Performance | Downgrade-Regeln aus `throughput_analysis_btf08.json` verbindlich; kein BT93B ohne artefaktbasiertes Handover | 2-Env Step-Rate liegt unter 1-Worker-Baseline (~28 Steps/s) |
| Boundary-Harness driftet gegen den JS-Trainingspfad | mittel | Planung | Handover auf kleinste Boundary-Grenze beschraenken und Restpunkte explizit halten | Harness kapselt immer mehr Episode-/Reward-/Policy-Logik lokal |

---

## Block BT93B: Minimaler PPO-Baseline-Scaffold

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- Der Block liefert nur das minimale PPO-Grundgeruest: `python/train.py`, `python/eval.py`, Config-/Callback-Struktur, Run-Manifest sowie Smoke-/Resume-Kette.
- Budgets, Env-Anzahl und Eval-Takte werden strikt aus `BT93A`-Artefakten abgeleitet.
- Die PPO-Action-Surface wird dort explizit als `Split-Head` ueber der BT92-Boundary gepinnt: Bool-/Intent-Felder getrennt von `shootItemIndex` und `useItem`; keine Policy lernt direkt auf der rohen `257`er-Indexbreite aus `CurviosEnv`.
- Kein voller Referenzlauf, kein DQN-Urteil und kein BT94A-Handover in demselben Claim.

Claim-Grenze:

- `BT93B` ist erst claimbar, wenn `BT93A.99` gruen ist und der Handover eine kleinste tragende Lane plus Startbudget pinnt.
- Ein gruener Scaffold ist noch keine echte PPO-Baseline und oeffnet `BT94A` nicht.
- Eine `Action-Mask` aus aktuellem `inventoryLength` ist nur optionales Zusatzsignal; Sanitizer-Clamping/Neutralisierung darf hoechstens als gemessener Fallback bleiben und nicht als tolerierte Hauptsemantik.

### Definition of Done (DoD)

- [x] DoD.1 `python/train.py`, `python/eval.py`, Config-/Callback-Pfade und Manifest-Struktur laufen fuer einen minimalen Smoke-Run. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/train.py --profile bt93b --run-kind fresh-smoke` -> `data/training/ppo/bt93b/runs/20260424T002459Z-fresh-smoke/training_report.json` (`ok=true`, `totalStepsCompleted=768`); `python\.venv\Scripts\python.exe python/scripts/bt93b_verify_artifact_consistency.py` -> `data/training/ppo/bt93b/artifact_consistency_report.json` (`ok=true`))
- [x] DoD.2 Checkpoint-, Eval- und Manifest-Artefakte liegen fuer den Scaffold reproduzierbar unter `data/training/ppo/`. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_verify_artifact_consistency.py` -> `data/training/ppo/bt93b/artifact_consistency_report.json` (`stableManifestMatch=true`, `budgetMatch=true`, `eventStreamsClosed=true`))
- [x] DoD.3 Resume- und Persistenzkette funktionieren fuer den Scaffold, ohne schon eine grosse Baseline zu behaupten. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_verify_artifact_consistency.py` -> `data/training/ppo/bt93b/artifact_consistency_report.json` (`resumeConsumesFreshCheckpoint=true`, `freshNormalizationJsonPickleMatch=true`, `resumeNormalizationJsonPickleMatch=true`))
- [x] DoD.4 Der Block ist explizit als Scaffold gelabelt und trifft kein Champion-, Promotion- oder BT94A-Urteil. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_verify_artifact_consistency.py` -> `data/training/ppo/bt93b/artifact_consistency_report.json` (`scaffoldOnly=true`, `promotionAllowed=false`, `bt94aGate=closed`, `noPromotionClaim=true`))
- [x] DoD.5 Die explizite Integration einer State-Normalization-Pipeline (z.B. `VecNormalize`) und die Definition der Actor/Critic-Heads ist als harte Pflichtvoraussetzung vor dem ersten Baseline-Scaffold eingebaut [siehe PPO-ADR-002]. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_prepare_scaffold.py` -> `python/configs/ppo_baseline.yaml`, `data/training/ppo/run_manifest.bt93b.template.json`, `data/training/ppo/bt93b_scaffold_plan.json` (`normalizationId=bt93b-vecnormalize-v1`, `headSpecId=bt93b-actor-critic-v1`))
- [x] DoD.6 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-24; evidence: `npm.cmd run gates:pre-commit` -> PASS (`plan:check`, `docs:sync`, `docs:check`); `npm.cmd run build` -> PASS)

### 93B.1 Baseline-Config und Run-Manifest

- [x] 93B.1.1 Konservative PPO-Config und Manifest-Struktur definieren (Seeds, Matrix, Env-Anzahl). (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_prepare_scaffold.py` -> `python/configs/ppo_baseline.yaml`, `data/training/ppo/run_manifest.bt93b.template.json`, `data/training/ppo/bt93b_scaffold_plan.json` (`envCount=2`, `selectedNstepsPerEnv=384`, `selectedBatchSize=128`, `matrixRunCount=3`, `fourEnvForScaffold=locked`))
- [x] 93B.1.2 Run-Manifest und Action-Adapter (`Split-Head`) fuer den Scaffold explizit festziehen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_prepare_scaffold.py` -> `python/configs/ppo_baseline.yaml`, `data/training/ppo/run_manifest.bt93b.template.json`, `data/training/ppo/bt93b_scaffold_plan.json` (`actionAdapterId=bt93b-split-head-v1`, `nextPhase=93B.1.3`); `python\.venv\Scripts\python.exe -c "import json, sys; sys.path.insert(0, 'python'); from bridge.split_head_action import build_manifest_action_surface; print(json.dumps(build_manifest_action_surface(), indent=2))"` -> `adapterId=bt93b-split-head-v1`, `indexHeadStrategy=per-field-slot-head-with--1-as-no-op`, `optionalMaskSource=player.inventoryLength`)
- [x] 93B.1.3 Explizite Integration einer State-Normalization-Pipeline (z.B. `VecNormalize`) und Definition der Actor/Critic-Heads [siehe PPO-ADR-002]. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_prepare_scaffold.py` -> `python/configs/ppo_baseline.yaml`, `data/training/ppo/run_manifest.bt93b.template.json`, `data/training/ppo/bt93b_scaffold_plan.json` (`normalizationId=bt93b-vecnormalize-v1`, `headSpecId=bt93b-actor-critic-v1`, `nextPhase=93B.2.1`); `python\.venv\Scripts\python.exe -c "import json, sys; sys.path.insert(0, 'python'); from scaffold.ppo_policy_specs import build_normalization_spec, build_actor_critic_head_spec; print(json.dumps({'normalization': build_normalization_spec(), 'actorCriticHeads': build_actor_critic_head_spec()}, indent=2))"` -> `normalizeObservation=true`, `normalizeReward=false`, `sharedEncoder.hiddenUnits=[128,128]`, `policyHeads[1].optionalMaskSource=player.inventoryLength`)

### 93B.2 Kalibrierter Smoke-Run auf realem Budget

- [x] 93B.2.1 Ersten Lauf ausfuehren mit dem Startbudget aus der gemessenen BT93A-Lane-Evidence. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/train.py --profile bt93b --run-kind fresh-smoke` -> `data/training/ppo/bt93b/runs/20260424T002459Z-fresh-smoke/training_report.json` (`totalStepsCompleted=768`, `stepsPerSecond=57.94994814686932`, `failureRate=0.0`), commit `9064119`)
- [x] 93B.2.2 Crash-Pfade, Hardware-Grenzen und Logging auf dem minimalen Scaffold pruefen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/train.py --profile bt93b --run-kind fresh-smoke` -> `data/training/ppo/bt93b/runs/20260424T002459Z-fresh-smoke/crash_paths.json`, `data/training/ppo/bt93b/runs/20260424T002459Z-fresh-smoke/hardware_limits.json`, `data/training/ppo/bt93b/runs/20260424T002459Z-fresh-smoke/events.jsonl` (`timeoutCount=0`, `fallbackRequired=false`), commit `9064119`)
- [x] 93B.2.3 Produktive Runtime-Surfaces bleiben unangetastet. (abgeschlossen: 2026-04-24; evidence: `git diff --name-only 9064119^ 9064119` -> nur `python/**` und `data/training/ppo/bt93b/**`; `data/training/ppo/bt93b/runs/20260424T002459Z-fresh-smoke/training_report.json` (`runtimeSurfacesTouched=[]`, `productiveRuntimeChanged=false`), commit `9064119`)

### 93B.3 Checkpoint-, Resume- und Normalize-Persistenz

- [x] 93B.3.1 Resume-Kette sicherstellen und Stats-/Checkpoint-Dateien pruefen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/train.py --profile bt93b --run-kind resume-smoke` -> `data/training/ppo/bt93b/runs/20260424T003303Z-resume-smoke/training_report.json` (`resume.validated=true`, `normalizationJsonPickleMatch=true`, `totalStepsCompleted=768`, `failureRate=0.0`), commit `e80d4a9`)
- [x] 93B.3.2 Artefaktkonsistenz zwischen neuem und fortgesetztem Lauf absichern. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_verify_artifact_consistency.py` -> `data/training/ppo/bt93b/artifact_consistency_report.json` (`ok=true`, `stableManifestMatch=true`, `resumeConsumesFreshCheckpoint=true`, `freshNormalizationJsonPickleMatch=true`, `resumeNormalizationJsonPickleMatch=true`), commit `aee6508`)

### 93B.99 Abschluss-Gate

- [x] 93B.99.1 Alle Phasen 93B.1 bis 93B.3 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-24; evidence: `Select-String -Path docs/bot-training/Bot_Trainingsplan.md -Pattern '93B\.(1|2|3)\.'` -> alle 8 Teilphasen `[x]` mit Evidence; `npm.cmd run plan:check` -> PASS)
- [x] 93B.99.2 Der PPO-Scaffold ist reproduzierbar, aber noch nicht als echte konservative Baseline freigegeben. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python/scripts/bt93b_verify_artifact_consistency.py` -> `data/training/ppo/bt93b/artifact_consistency_report.json` (`ok=true`, `stableManifestMatch=true`, `resumeConsumesFreshCheckpoint=true`, `scaffoldOnly=true`, `promotionAllowed=false`, `bt94aGate=closed`); `npm.cmd run build` -> PASS)

### Risiko-Register BT93B

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Der Scaffold driftet sofort in eine grosse Baseline-Arbeit | hoch | Governance | Scope hart auf Grundgeruest, Smoke und Resume begrenzen | DoD fordert schon Referenzlauf, DQN-Urteil oder BT94A-Handover |
| Resume-/Checkpoint-Pfad wirkt gruen, ist aber methodisch noch nicht belastbar | hoch | Integration | minimalen Persistenzpfad nachweisen, grossen Referenzlauf bewusst nach `BT93C` verschieben | Smoke-Run schreibt Artefakte, aber Resume oder Eval bleiben inkonsistent |
| Env-Anzahl oder Budgets werden doch wieder aus Draft-Annahmen statt aus `BT93A` gezogen | mittel | Planung | jedes Budget an den Handover aus `BT93A` binden | `4-Env`, `300000` oder aehnliche Zahlen tauchen ohne Lane-Artefakt wieder auf |

---

## Block BT93C: Echter PPO-Learner und konservative Baseline

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT102_PPO_Baseline_Training.md`, `docs/plaene/neu/BT90_GoldStandard/IMPLEMENTATION_README.md`

<!-- LOCK: frei -->

Scope:

- `BT93C` liefert erst nach gruener Harness- und Scaffold-Lage den ersten echten PPO-Learner und danach eine konservative PPO-Baseline.
- `BT93B` war bewusst nur Scaffold: `python/train.py` schrieb Smoke-/Resume-Artefakte, aber kein echtes PPO-Optimizer-Update. Das ist kein Trainingsfortschritt und darf nicht als Baseline gewertet werden.
- Der Block bindet Throughput-/Downgrade-Urteile aus `BT93A`, die Scaffold-/Resume-Kette aus `BT93B`, einen echten PPO-Stack und eine methodisch eingefrorene DQN-Vergleichsmatrix zusammen.
- Freeze, Ablationen, externe A/B-Evidence und Promotion bleiben bewusst ausserhalb.
- Der Start dieses Blocks ist eine Sanierungs- und Readiness-Phase; echte Trainingslaeufe beginnen erst nach `93C.0` bis `93C.2`.
- `BT93C` wird nicht als ein grosser Trainingsblock geclaimt, sondern als Mikro-Leiter mit Stop-Punkten nach jeder Problemklasse.

Claim-Grenze:

- `BT93C` ist nur fuer `93C.0` claimbar, solange der Plan-Freshness-Abgleich noch Widersprueche fuehrt oder die feste Seed-/Mode-/Champion-/Holdout-Matrix fuer den Vorvergleich fehlt.
- Ohne echten PPO-Learner (`model.learn(...)` oder gleichwertige PPO-Optimizer-Updates, echter Modellcheckpoint, Optimizer-/Normalize-Persistenz) bleibt `BT93C` vor jeder Baseline-Aussage geschlossen.
- Ein Lauf mit `scaffoldOnly=true`, `promotionAllowed=false` oder Checkpoint-Notiz `no PPO optimizer update` zaehlt nur als Scaffold-Evidence, nie als Baseline- oder Lern-Evidence.
- Pro Claim werden maximal zwei direkt benachbarte Subphasen bearbeitet; `93C.5` darf erst nach gruener `93C.3` und `93C.4` starten.
- Das Audit-Sanierungsregister F.01 bis F.37 ist Pflicht-Preflight fuer die naechsten Claims: offene Befunde muessen entweder im jeweiligen Gate geschlossen oder als harter Restblocker in den Handover uebernommen werden.

Mikro-Claim-Leiter:

| Claim | Scope | Stop-Regel |
| --- | --- | --- |
| `93C-Audit` | `93C.0` | Stop bei rotem Freeze, unversionierter Evidence oder fehlendem Startmanifest |
| `93C-Env` | `93C.1` bis `93C.2` | Stop bei ungepinntem Stack, Clean-Env-Fehler oder nicht trainierbarer Action-Surface |
| `93C-Learner` | `93C.3` | Stop, wenn kein echter PPO-Update oder keine State-Persistenz beweisbar ist |
| `93C-Diagnose` | `93C.4` | Stop bei KL-/Entropy-/Value-Collapse, Reward-Hacking oder verdeckten Veto-/Sanitizer-Raten |
| `93C-Pilot` | `93C.5` | Stop mit `diagnose: throughput insufficient` oder `pilot unsafe`; kein Baseline-Sprung |
| `93C-Vergleich` | `93C.6` | Stop, wenn DQN/PPO-Matrix, Holdout oder Semantikfenster nicht apples-to-apples sind |
| `93C-Handover` | `93C.7` | Stop als `BT94A-ready` nur bei echtem Modellpaket; sonst `diagnose` |

Harte Stopper vor den naechsten Gates:

| Ziel-Gate | Stopper, die vorher weg muessen |
| --- | --- |
| vor `93C.1` | Stale `untracked`-/README-/Plan-Hinweise, `tmp`-/Self-Count-Evidence, Baseline-Mehrdeutigkeit und Risk-Register-Drift muessen sichtbar saniert oder als blockierend markiert sein. |
| vor `93C.2` | PPO-Stack muss reproduzierbar installierbar sein; ohne Clean-Env, `pip check` und Imports wird keine Action-Surface finalisiert. |
| vor `93C.3` | Action-Surface, Mask-/Veto-/Invalid-Telemetrie und Sanitizer-Grenzen muessen trainierbar bewiesen sein. |
| vor `93C.5` | Echter Learner, echte Eval, Modell-/Optimizer-/Normalize-State, Lernmetriken, Death-/Terminal-/Safety-Diagnostik und Failure-Klassen muessen vorliegen. |
| vor `BT94A` | `BT93C.99` muss echte Baseline, Holdout, Repro, DQN-Vorvergleich und Modellpaket liefern; Diagnose-/Scaffold-/Pilot-only reicht nicht. |
| vor `BT94B` | `BT94A.99` muss genau einen Freeze-Kandidaten liefern; Statistikregeln, Mindestdelta, Seeds und Holdout muessen vor externen Runs fixiert sein. |
| vor `BT95` | `BT94B=promote`, gruene PPO-Validate-Evidence, externe Evidence und User-Entscheid muessen vorliegen; sonst entsteht nur ein No-Intake-Record. |

### Harte PPO-Befunde, die der Pfad abarbeiten muss

| Befund | Konsequenz im Plan |
| --- | --- |
| Der PPO-Pfad war kuerzer als DQN, weil reale Learner-, Eval-, Freeze- und Rollout-Gates fehlten, nicht weil PPO fachlich einfacher ist. | BT93C bis BT95 erhalten eigene Learner-, Baseline-, Ablations-, A/B- und Handoff-Gates. |
| BT93B liefert Scaffold-/Contract-Evidence, aber kein PPO-Training. | Scaffold-Artefakte duerfen keine Baseline, keinen Lernfortschritt und keine BT94A-Freigabe begruenden. |
| Ein professioneller PPO-Stack braucht reproduzierbare Dependencies. | Requirements/Lock, Clean-Env-Smoke, `pip check` und Import-/Train-Smoke werden Vorbedingungen. |
| SB3-Kompatibilitaet des Env-/Action-Vertrags ist nicht automatisch gegeben. | Action-Surface, Flatten-/`MultiDiscrete`-/Masking-/Custom-Policy-Entscheid werden vor dem Learner-Smoke festgezogen. |
| Sanitizer, Masking und Safety-Vetos koennen schlechte Policies verstecken. | Sanitizer-, Mask-, Veto- und Invalid-Action-Raten werden Gate-Metriken statt Debug-Nebendaten. |
| PPO kann Reward-Hacking, Episode-Shortening und Value-Collapse produzieren. | RewardBreakdown, Death-/Terminal-Klassen, Survival, KL, Entropy, Clip-Fraction, Value-Loss und Grad-Norm werden gemeinsam bewertet. |
| Normalize-/VecNormalize-State kann Train, Eval und Resume invalidieren. | Normalize-State wird zusammen mit Modell, Optimizer, Config und Hashes gespeichert und in Eval/Resume geladen. |
| Ohne Resume- und Repro-Evidence ist ein PPO-Checkpoint operativ wertlos. | BT93C verlangt Resume-Test, Repro-Lauf, Git-SHA, Modellhash, Confighash und Artefaktmanifest. |
| 4-Env- oder hohe Timesteps-Ziele sind ohne Throughput-Evidence Wunschdenken. | Env-Ladder `1 -> 2 -> optional 4` bleibt an gemessene Step-Rate, Stabilitaet und Downgrade-Regeln gebunden. |
| Ein DQN-Vergleich ist nur mit gleicher Matrix belastbar. | DQN-Champion, Semantikfenster, Seeds, Modi, Maps, Holdout und Invalidierungsregeln werden vor dem Vergleich eingefroren. |
| Eine Baseline ist keine Promotion. | BT93C endet nur mit Baseline-/Vorvergleichs-Handover; Promotion bleibt BT94B vorbehalten. |
| Ablationen ohne Hypothesenmatrix erzeugen Forschung statt Entscheidung. | BT94A begrenzt auf 5 bis 7 Laeufe, eine Hypothese je Lauf, feste Parameterbereiche und Early-Stop-Regeln. |
| Drei A/B-Laeufe allein sind statistisch duenn. | BT94B ergaenzt Episodenzahl, Median-Delta, Streuung, Holdout, Non-Inferiority und Stability-Gates. |
| Positive PPO-Evidence ersetzt keine PPO-Validate-Lane. | `BT94B.3` muss PPO-spezifisch validieren; BT80C `80.9.3` bleibt nur Alt-/Produktionskontext. |
| PPO-Integration braucht Export, Runtime-Flag, Rollback und Modellregistry. | BT95 dokumentiert diese Voraussetzungen doc-only und verhindert jede vorweggenommene Runtime-Umschaltung. |
| Inferenz-Latenz ist nicht durch Training-Step-Latenz bewiesen. | PPO-Forward-Pass, Export/Load, Warmup, Timeout und JS-Tick-Budget werden erst im separaten Rollout-Intake beweisbar. |
| BT73-Intent-/Recovery-Haertung ist offen. | PPO-Vergleiche muessen offenlegen, dass der DQN-Produktpfad bei Intent/Recovery noch Restschuld traegt; keine Gleichwertigkeitsbehauptung ohne diese Telemetrie. |
| Alte Evidence enthielt Worktree-/`tmp/`-/Self-Count-Signale. | `93C.0` muss versionierte Artefakte und echte Commands statt Plan-Selbstzaehlung als Startbasis festziehen. |

### Definition of Done (DoD)

- [x] DoD.1 Plan-Wahrheit ist vor Start bereinigt: BT93A/BT93B-Status, `freezeOk=true`, Lock-Header, `[x]`-Evidence, versionierte PPO-Artefakte und offene Restblocker widersprechen sich nicht. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_audit_readiness.py` -> `data/training/ppo/bt93c/audit_readiness_report.json` (`ok=true`, `resultClass=go`))
- [x] DoD.2 Ein sauber gepinnter PPO-Dependency-Stack ist auf einem Clean-Env-Smoke reproduzierbar (`stable-baselines3`/`torch`/`gymnasium`/`numpy` plus optionales Monitoring); lokale venv-Zufaelle zaehlen nicht. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_dependency_gate.py --run-clean-env` -> `data/training/ppo/bt93c/dependency_lock_report.json` (`ok=true`, `stable-baselines3=2.3.2`, `torch=2.3.1`), `data/training/ppo/bt93c/clean_env_smoke_report.json` (`ok=true`, `pipCheck.ok=true`, `minimalPpoTrainStart.ok=true`))
- [x] DoD.3 Die SB3-kompatible Env-/Action-Surface ist technisch bewiesen: `spaces.Dict` wird nicht still als finales PPO-Interface vorausgesetzt; Flatten-/`MultiDiscrete`-/Masking- oder Custom-Policy-Entscheid ist implementiert und mit Sanitizer-/Mask-Raten messbar. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_action_surface_smoke.py` -> `data/training/ppo/bt93c/action_surface_smoke.json` (`sb3CompatibleActionSpace=true`, `trainIterationCompleted=true`, `evalIterationCompleted=true`, `maskRate`/`vetoRate` sichtbar))
- [x] DoD.4 Ein echter PPO-Learner fuehrt Optimizer-Updates aus, speichert ein echtes Modellpaket und kann mit Modell-, Optimizer- und Normalize-State fortgesetzt werden. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind resume-smoke --phase-id 93C.3.2` -> `data/training/ppo/bt93c/runs/20260424T163911Z-resume-smoke/artifact_manifest.json` (`truePpoModelPackage=true`, `scaffoldOnly=false`, `optimizerUpdatesAfter=2`, `optimizer.hasOptimizerState=true`))
- [x] DoD.5 Lernmetriken (`policy_loss`, `value_loss`, `entropy`, `approx_kl`, `clip_fraction`, `explained_variance`, `grad_norm`) und Verhaltensmetriken (`sanitizerRate`, `vetoRate`, `invalidActionRate`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `deathCause`, Crash-/Timeout-/Forced-/Runtime-Fehlerklassen) liegen pro Lauf vor. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/handover_report.json` (`doDCoverage.DoD.5=true`, `sourceArtifacts.diagnosticsReport` gesetzt))
- [x] DoD.6 Eine konservative PPO-Baseline laeuft auf einer festen Train-/Eval-/Holdout-Seed-/Mode-/Champion-Matrix reproduzierbar; Baseline-ID und Survival-Bezugswert sind eindeutig gepinnt. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`comparisonMatrix.matrixId=bt93c-dqn-ppo-precomparison-v1`, `ppoCandidate.baselineId=bt93c-ppo-baseline-publish-v1`, `metrics.ppoHoldout.averageBotSurvival=16.0`))
- [x] DoD.7 Throughput-, Stability- und Downgrade-Entscheide fuer `1 -> 2 -> optional 4` Envs sind aus `BT93A`-/`BT93B`-/`BT93C`-Artefakten dokumentiert; `4-Env` bleibt ohne direkte Evidence gesperrt. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/handover_report.json` (`doDCoverage.DoD.7=true`, `guardrails.fourEnvAllowed=false`))
- [x] DoD.8 Vergleichsregel gegen den eingefrorenen DQN-Champion und das aktuelle Semantikfenster ist festgezogen; Ergebnis ist explizit `Vorvergleich, keine Promotion`. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`resultClass=ppo-regression`, `isPromotionEvidence=false`, `isRolloutSignal=false`, `v101FollowUp.resultClass=no-ppo-contract-drift`))
- [x] DoD.9 Ergebnis, Restpunkte und Baseline-Paket sind als Handover fuer `BT94A` dokumentiert. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/handover_report.json` (`resultClass=diagnose`, `bt94aHandover.gate=closed-diagnose-ppo-regression`, `modelPackage.modelSha256` gesetzt))
- [x] DoD.10 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS. (abgeschlossen: 2026-04-24; evidence: `npm.cmd run plan:check` -> PASS; `npm.cmd run docs:sync` -> PASS (`updated=0`, `missing=0`, `onboarding=0`, `legacy=0`, `mojibake=3`); `npm.cmd run docs:check` -> PASS; `npm.cmd run build` -> PASS)
- [x] DoD.11 Jeder Mikro-Claim endet mit einer klaren Klasse: `go`, `hold`, `diagnose`, `throughput insufficient`, `freeze red` oder `validation blocked`. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`resultClass=ppo-regression`, `guardrails.bt94aGate=closed-until-93C.7`))
- [x] DoD.12 Alle Befunde aus dem Audit-Sanierungsregister F.01 bis F.37 sind entweder durch Evidence geschlossen oder im Abschlussreport als explizite Restblocker mit Folgegate gefuehrt. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/evidence_quality_matrix.json` (`summary.closed=21`, `summary.bt94a-blocker=5`, `summary.follow-gated=11`))

### 93C.0 Plan-Freshness und Gate-Sanierung

- [x] 93C.0.1 Status-/Freshness-Widersprueche im PPO-Pfad bereinigen (`BT93A` abgeschlossen statt active, BTF-Status, versionierte Artefakte, aktueller Freeze-Stand). (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_audit_readiness.py` -> `data/training/ppo/bt93c/audit_readiness_report.json` (`statusConsistency.bt93aClosed=true`, `statusConsistency.bt93bClosed=true`, `bt80cValidationRestblockerVisible=true`, `resultClass=go`))
- [x] 93C.0.2 Gate-Disziplin pruefen: keine `[x]`-Aussage bleibt stehen, wenn sie nur Scaffold-, README- oder veraltete Drift-Evidence traegt. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_audit_readiness.py` -> `data/training/ppo/bt93c/audit_readiness_report.json` (`missingEvidenceCompletedItems=[]`, `bt93bScaffoldOnly=true`, `bt93bNoPromotionClaim=true`, `bt93bBt94aGate=closed`))
- [x] 93C.0.3 `bt90_freeze_check.py` neu ausfuehren und nur `freezeOk=true` als Learner-Startsignal akzeptieren; bei `reAuditRequired=true` bleibt `93C.1` blockiert. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt90_freeze_check.py` -> `data/training/ppo/freeze_check.json` (`freezeOk=true`, `reAuditRequired=false`, `driftCount=0`))
- [x] 93C.0.4 Evidence-Hygiene abschliessen: Lock-Tabelle gegen Header abgleichen, untracked PPO-Artefakte versionieren oder als lokal markieren, `tmp/`-Only-Evidence ersetzen, Self-Count-Gates nicht als alleinige Closure-Evidence verwenden. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_audit_readiness.py` -> `data/training/ppo/bt93c/audit_readiness_report.json` (`lockConsistency.matches.BT93C=true`, `untrackedPpoArtifactsBeforeWrite=[]`, `tmpOnlyCompletedEvidence=[]`, `selfCountGateEvidence=[]`, `mojibakeLines=[]`))
- [x] 93C.0.5 Startmanifest fuer den ersten echten Trainingslauf schreiben: DQN-Champion, Semantikfenster, Seed-/Mode-/Map-/Holdout-Matrix, Timesteps-Budget, Env-Anzahl, Abbruchregeln und erlaubte Artefaktpfade. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_audit_readiness.py` -> `data/training/ppo/bt93c/start_manifest.json` (`dqnChampion.championBlock=BT11`, `matrixId=bt93c-learner-smoke-start-v1`, `envCount=2`, `learnerSmokeRolloutStepsTotal=768`))

### 93C.1 Audit-Delta, PPO-Dependency- und Clean-Env-Gate

- [x] 93C.1.1 Audit-Delta aus F.09 bis F.11, F.16, F.21 und F.23 sanieren: stale `untracked`-/README-/Plan-Hinweise, `tmp`-Only-Spuren, Self-Count-Gates, Scaffold-/Baseline-Begriffe und Risk-Register-Drift duerfen den naechsten Claim nicht mehr verfaelschen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_audit_delta.py` -> `data/training/ppo/bt93c/audit_delta_report.json` (`resultClass=go`, `untrackedPpoArtifacts=[]`, `tmpOnlyEvidence=[]`, `selfCountEvidence=[]`, `riskDrift.ok=true`))
- [x] 93C.1.2 PPO-Requirements oder Lockfile fuer `stable-baselines3`, `torch`, `gymnasium`, `numpy` und Monitoring-Abhaengigkeiten pinnen; BT90-Minimalstack bleibt davon getrennt. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_dependency_gate.py --run-clean-env` -> `python/requirements-ppo.txt`, `data/training/ppo/bt93c/dependency_lock_report.json` (`ok=true`, `bt90MinimalStackSeparated=true`, `directPins.stable-baselines3=2.3.2`, `directPins.torch=2.3.1`))
- [x] 93C.1.3 Clean-Env-Smoke dokumentieren: frische Installation, `pip check`, Import-Smoke und minimaler PPO-Trainingsstart ohne Zugriff auf produktive Runtime-Surfaces. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_dependency_gate.py --run-clean-env` -> `data/training/ppo/bt93c/clean_env_smoke_report.json` (`ok=true`, `pipCheck.ok=true`, `importSmoke.ok=true`, `minimalPpoTrainStart.ok=true`, `runtimeSurfacesTouched=[]`))
- [x] 93C.1.4 Baseline-Quelle fixieren: eine Baseline-ID mit `avgStepsPerEpisode`, `averageBotSurvival`, Command, Datum, Seeds, Modi, Maps, Semantikfenster und Artefaktpfaden; alte nicht-PPO-Reports bleiben explizit ausgeschlossen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_audit_delta.py` -> `data/training/ppo/bt93c/baseline_source_manifest.json` (`baselineId=bt93c-dqn-reference-bt11-final-20260324-v1`, `ppoBaselineEligible=false`, `oldNonPpoReportsExcludedAsPpoQuality=true`, `requiredBefore93C5.baselineId=bt93c-ppo-baseline-publish-v1`))

### 93C.2 SB3-kompatibler Env-/Action-Wrapper

- [x] 93C.2.1 Finale PPO-Action-Surface implementieren oder festziehen: Flatten-/`MultiDiscrete`-/Masking-/Custom-Policy-Entscheid mit echter Trainingskompatibilitaet statt nur Manifest-Split-Head. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_action_surface_smoke.py` -> `data/training/ppo/bt93c/action_surface_smoke.json` (`surface.gymSpace=MultiDiscrete`, `sb3CompatibleActionSpace=true`, `rawBoundarySurfaceTraining=false`))
- [x] 93C.2.2 Sanitizer-, Mask-, Veto- und Invalid-Action-Raten als harte Telemetrie im Env-/Eval-Pfad messen; Sanitizer-Clamping darf keine schlechte Policy verstecken. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_action_surface_smoke.py` -> `data/training/ppo/bt93c/action_surface_smoke.json` (`train.telemetry.maskRate=1.0`, `train.telemetry.vetoRate=0.35294117647058826`, `eval.telemetry.invalidActionRate=0.0`))
- [x] 93C.2.3 Raw-Action-, Inventory-/Intent-Mask- und No-Op-/Fallback-Semantik dokumentieren; keine rohe Action-Surface darf still von JS-Sanitizern in eine scheinbar gueltige Policy umgebogen werden. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_action_surface_smoke.py` -> `data/training/ppo/bt93c/action_surface_smoke.json` (`surface.indexEncoding.maskSource=info.match.inventoryLength`, `surface.indexEncoding.token0=no-op / -1`, `rawBoundarySurfaceTraining=false`))
- [x] 93C.2.4 Action-Surface-Smoke muss eine kleine Trainingsiteration und eine Eval-Iteration ueber denselben Wrapper laufen lassen; reine Manifest-Pruefung reicht nicht. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_action_surface_smoke.py` -> `data/training/ppo/bt93c/action_surface_smoke.json` (`trainIterationCompleted=true`, `evalIterationCompleted=true`, `sameWrapperForTrainAndEval=true`))

### 93C.3 Echter PPO-Learner-Smoke

- [x] 93C.3.1 `python/train.py` oder gleichwertiger Orchestrator fuehrt echte PPO-Optimizer-Updates aus und schreibt Modell-, Optimizer-, Normalize-, Config- und Manifest-Artefakte. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind learner-smoke --phase-id 93C.3.1` -> `data/training/ppo/bt93c/runs/20260424T163858Z-learner-smoke/training_report.json` (`truePpoOptimizerUpdate=true`, `optimizerUpdatesAfter=1`, `truePpoModelPackage=true`, `modelSha256=eedfe8cc8f7f7c10d8e3603371f3e8237147d0fc816be1bd0ae4bd7ea81137a2`))
- [x] 93C.3.2 Resume konsumiert einen echten PPO-Checkpoint und setzt Training inklusive Normalize-/Optimizer-State fort; JSON-Scaffold-Checkpoints allein reichen nicht. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind resume-smoke --phase-id 93C.3.2` -> `data/training/ppo/bt93c/runs/20260424T163911Z-resume-smoke/training_report.json` (`resumedFrom.runId=20260424T163858Z-learner-smoke`, `optimizerUpdatesAfter=2`, `optimizer.hasOptimizerState=true`, `vecnormalizeSha256=c531df3793e13ff456025d63bfc3077bd986d7fa5ea5fef2b1c7c4f783da43ea`))
- [x] 93C.3.3 Minimaler PPO-Forward-Pass (`batch=1`) und Modell-Reload werden im Python-Pfad gemessen; das Ergebnis zaehlt nur als Trainings-/Export-Vorbereitung, nicht als JS-Tick-Latenzbeweis. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind eval-smoke --phase-id 93C.3.4` -> `data/training/ppo/bt93c/runs/20260424T163928Z-eval-smoke/eval_report.json` (`modelReload.hashMatchesManifest=true`, `forwardPass.batchSize=1`, `forwardPass.wallClockMs=3.1079`, `countsAsJsTickLatency=false`))
- [x] 93C.3.4 `python/eval.py` oder gleichwertiger Eval-Orchestrator laedt ein echtes PPO-Modellpaket; Scaffold-Eval zaehlt nicht. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind eval-smoke --phase-id 93C.3.4` -> `data/training/ppo/bt93c/runs/20260424T163928Z-eval-smoke/eval_report.json` (`loadedRealPpoModel=true`, `sourcePackage.runId=20260424T163911Z-resume-smoke`, `eval.telemetry` fuer 2 Envs sichtbar))
- [x] 93C.3.5 Artefaktmanifest koppelt Modellhash, Confighash, Git-SHA, Dependency-Lock, Normalize-State, Optimizer-State, Semantikfenster und Trainingscommand. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind resume-smoke --phase-id 93C.3.2` -> `data/training/ppo/bt93c/runs/20260424T163911Z-resume-smoke/artifact_manifest.json` (`modelSha256=4f058af8d82c0508b777dcb2c28d2c2c62eb7142d7dd53101294fff4a3b1e8ee`, `configSha256=3682b13c210ba632c8cfa870dc756be76428125f08558c8dbbed3a43a4de15fd`, `gitSha=7f8eeb08868831f1e2032ad9166089f2ea1b8a38`, `semanticWindow.modeId=runtime-near-headless-v1`, `trainingCommand` gesetzt))

### 93C.4 Lern-, Reward- und Safety-Diagnostik

- [x] 93C.4.1 PPO-Lernmetriken (`policy_loss`, `value_loss`, `entropy`, `approx_kl`, `clip_fraction`, `explained_variance`, `grad_norm`) im Report erfassen und Collapse-/Instabilitaets-Schwellen dokumentieren. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind diagnostics-smoke --phase-id 93C.4.1` -> `data/training/ppo/bt93c/runs/20260424T170052Z-diagnostics-smoke/training_report.json` (`ppoLearningMetrics.metrics.policy_loss`, `value_loss`, `entropy`, `approx_kl`, `clip_fraction`, `explained_variance`, `grad_norm`, `collapseThresholds`))
- [x] 93C.4.2 Reward-Hacking-, Episode-Shortening- und Safety-Overrule-Risiken ueber `rewardBreakdown`, Death-/Terminal-Klassen, Veto-Rate und Survival-KPIs sichtbar machen. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind diagnostics-eval --phase-id 93C.4.2` -> `data/training/ppo/bt93c/runs/20260424T170102Z-diagnostics-eval/eval_report.json` (`diagnostics.rewardSafetyDiagnostics`, `survivalKpis`, `actionTelemetry.vetoRate=0.375`, `truncatedReasonCounts.max-steps=2`))
- [x] 93C.4.3 Policy-Qualitaet nicht nur ueber Survival lesen: Intent-/Recovery-Luecken aus `BT73`, historische BT80C-Validate-Restschuld und JS-Integration-Luecken als explizite Restschuld im Report fuehren; fuer PPO-Promotion ist spaeter eine eigene PPO-Validate-Lane noetig. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_diagnostics_report.py` -> `data/training/ppo/bt93c/diagnostics_report.json` (`policyQualityRestDebt.bt73IntentRecovery.status=open-restschuld-visible`, `bt80cProductionValidation.status=blocked-by-BT80C-80.9.3`, `jsInferenceIntegration.runtimeSwitchAllowed=false`))
- [x] 93C.4.4 Runtime-/Failure-Semantik auf PPO-Reports abbilden: `runtimeErrorCount`, Crash, Timeout, Forced-Round, Socket-Close, Teardown-Failure, `max-steps`, natuerliche Terminal- und Death-Cause-Klassen getrennt ausweisen. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_diagnostics_report.py` -> `data/training/ppo/bt93c/diagnostics_report.json` (`failureSemantics.runtimeErrorCount=0`, `crash=0`, `timeout=0`, `forcedRound=0`, `socketClose=0`, `teardownFailure=0`, `maxSteps=2`, `deathCauseCounts={}`))
- [x] 93C.4.5 Durchsatz-, Boot- und Step-Latenz nur als Budget-/Stabilitaetsdaten markieren; kein Report darf daraus Lernfortschritt ableiten. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_diagnostics_report.py` -> `data/training/ppo/bt93c/diagnostics_report.json` (`latencyAndThroughputBudget.classification=budget-and-stability-only`, `countsAsLearningProgress=false`, `gateInterpretation.learningProgressFromThroughputAllowed=false`))

### 93C.5 Konservative Baseline-Ladder

- [x] 93C.5.1 `learner-smoke -> pilot -> baseline` als feste Leiter definieren; Timesteps, Eval-Takte und Env-Anzahl werden aus gemessener Throughput-Evidence abgeleitet. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_pilot_report.py --write-ladder` -> `data/training/ppo/bt93c/pilot_ladder_manifest.json` (`pilotTimesteps=64`, `envCount=2`, `fourEnvStatus=locked`, `baseline=locked-until-pilot-go`))
- [x] 93C.5.2 Kleinen Pilot ausfuehren oder ehrlich mit `diagnose: throughput insufficient` bzw. `pilot unsafe` stoppen; Pilot ist noch keine Baseline. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind pilot-train --phase-id 93C.5.2 --config python\configs\ppo_bt93c_pilot.json --checkpoint data\training\ppo\bt93c\runs\20260424T170052Z-diagnostics-smoke\artifact_manifest.json` + `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind pilot-eval --phase-id 93C.5.2 --config python\configs\ppo_bt93c_pilot.json` + `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_pilot_report.py --write-ladder --write-report` -> `data/training/ppo/bt93c/pilot_report.json` (`resultClass=pilot go`, `pilotTrain=20260424T171554Z-pilot-train`, `pilotEval=20260424T171608Z-pilot-eval`, `baselineRunsStarted=false`))
- [x] 93C.5.3 Konservativen Baseline-Lauf nur nach gruenem Pilot ausfuehren; keine Draft-Zahlen wie `300000` oder `4-Env` ohne tragende Evidence. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind baseline-train --phase-id 93C.5.3 --config python\configs\ppo_bt93c_baseline.json --checkpoint data\training\ppo\bt93c\runs\20260424T171554Z-pilot-train\artifact_manifest.json` + `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind baseline-eval --phase-id 93C.5.3 --config python\configs\ppo_bt93c_baseline.json` + `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_baseline_report.py --write-report` -> `data/training/ppo/bt93c/baseline_report.json` (`resultClass=baseline go`, `baselineTrain=20260424T180033Z-baseline-train`, `baselineEval=20260424T180054Z-baseline-eval`, `baselineTimesteps=128`, `envCount=2`))
- [x] 93C.5.4 Baseline-Report muss `avgStepsPerEpisode`, `averageBotSurvival`-Bezugswert, Runtime-/Failure-Klassen, Sanitizer-/Veto-/Invalid-Raten und Holdout-Vorbereitung enthalten; ohne diese Felder bleibt das Ergebnis `diagnose`. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_baseline_report.py --write-report` -> `data/training/ppo/bt93c/baseline_report.json` (`ppoBaselineMetrics.avgStepsPerEpisode=16.0`, `ppoBaselineMetrics.averageBotSurvival=16.0`, `dqnReferenceOnly.averageBotSurvival=37.376986`, `runtimeErrorCount=0`, `invalidActionRate=0.0`, `sanitizerRate=0.0`, `vetoRate=0.84375`, `holdoutStatus=reserved-for-93C.6`))
- [x] 93C.5.5 `4-Env` darf nur nach direkter 4-Env-Evidence in die Baseline-Lane; 2-Env-Eligibility ist kein Freifahrtschein. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_baseline_report.py --write-report` -> `data/training/ppo/bt93c/baseline_report.json` (`guardrails.fourEnvAllowed=false`, `statusChecks.fourEnvLocked=true`, `statusChecks.twoEnvOnly=true`, `draft300000Allowed=false`, `promotionAllowed=false`))

### 93C.6 DQN-Vorvergleich und Holdout

- [x] 93C.6.1 V101-Folgecheck ausfuehren und danach DQN-Champion, Semantikfenster, Train-/Eval-/Holdout-Seeds, Modi, Maps und Invalidierungsregeln einfrieren. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt90_freeze_check.py` + `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/freeze_check.json` (`freezeOk=true`, `driftCount=0`) und `data/training/ppo/bt93c/precomparison_report.json` (`v101FollowUp.resultClass=no-ppo-contract-drift`, `comparisonMatrix.matrixId=bt93c-dqn-ppo-precomparison-v1`))
- [x] 93C.6.2 PPO-Baseline gegen DQN auf derselben Matrix auswerten; Holdout-Ergebnis, interne Eval-Survival-Metrik und fehlende PPO-Validate-Evidence separat ausweisen. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind holdout-eval --phase-id 93C.6.2 --config python\configs\ppo_bt93c_baseline.json --checkpoint data\training\ppo\bt93c\runs\20260424T180033Z-baseline-train\artifact_manifest.json` + `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`metrics.ppoInternalEval.averageBotSurvival=16.0`, `metrics.ppoHoldout.averageBotSurvival=16.0`, `evidenceInterpretation.ppoValidateStatus=ppo-validate-missing`))
- [x] 93C.6.3 Vergleichsurteil als `ppo-promising`, `ppo-hold`, `ppo-diagnose` oder `ppo-regression` klassifizieren; keine Klasse oeffnet direkt einen Rollout. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`resultClass=ppo-regression`, `metrics.deltasAgainstDqn.averageBotSurvivalPct=-57.19291`, `guardrails.rolloutAllowed=false`))
- [x] 93C.6.4 DQN-Vergleich darf nur gegen einen benannten Champion mit Artefakt-/Commit-/Semantikfenster erfolgen; historisch stabile, aber semantisch veraltete Champions werden als Risiko markiert. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`comparisonMatrix.dqnChampion.baselineId=bt93c-dqn-reference-bt11-final-20260324-v1`, `strictApplesToApples.ok=false`, `metrics.dqnChampion.averageBotSurvival=37.376986`))
- [x] 93C.6.5 PPO-Validate-Anforderung fuer `BT94B.3` vorbereiten: Runner-/Command-Idee, Report-Schema, Zielpfade, Metrikquellen und Fehlerklassen als Handover notieren; noch keine Promotion. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`ppoValidateHandover.targetBlock=BT94B.3`, `commandIdea` gesetzt, `reportSchemaMustInclude` gesetzt, `versionedTargetPaths` gesetzt))

### 93C.7 Reproduzierbarkeit und BT94A-Handover

- [x] 93C.7.1 Mindestens einen Repro-Lauf mit gleicher Config und dokumentierter KPI-Toleranz festhalten. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind baseline-repro-eval --phase-id 93C.7.1 --config python\configs\ppo_bt93c_baseline.json --checkpoint data\training\ppo\bt93c\runs\20260424T180033Z-baseline-train\artifact_manifest.json` -> `data/training/ppo/bt93c/runs/20260424T185232Z-baseline-repro-eval/eval_report.json` und `data/training/ppo/bt93c/handover_report.json` (`reproducibility.ok=true`, KPI-Deltas innerhalb `0.000001`))
- [x] 93C.7.2 Abschlussreport mit Modellhash, Confighash, Git-SHA, Artefaktpfaden, V101-Folgecheck, bekannten Restluecken und BT94A-Handover schreiben. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/handover_report.json` (`resultClass=diagnose`, `modelPackage.modelSha256=61252df703ce1a74cc38a9645e9566319f16426681692639f08743f05b0424e1`, `v101FollowUp.resultClass=no-ppo-contract-drift`))
- [x] 93C.7.3 Evidence-Qualitaetsmatrix schreiben: alle F.01-F.37-Befunde, `tmp`-/Self-Count-/stale-doc-Lage, Risk-Register-Abgleich und verbleibende Stopper fuer BT94A. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/evidence_quality_matrix.json` (`summary.closed=21`, `summary.bt94a-blocker=5`, `bt94aStoppers=[F.05,F.19,F.27,F.30,F.31]`))
- [x] 93C.7.4 Falls V101 Authority-, Schema- oder Typdrift fuer PPO ausloest, Drift entweder beheben lassen oder BT94A mit `diagnose` geschlossen halten. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/handover_report.json` (`v101FollowUp.resultClass=no-ppo-contract-drift`, `bt94aHandover.gate=closed-diagnose-ppo-regression`))

### 93C.99 Abschluss-Gate

- [x] 93C.99.1 Alle Phasen 93C.0 bis 93C.7 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-24; evidence: BT93C.0-BT93C.7 Plan-Evidence + `npm.cmd run plan:check` -> PASS)
- [x] 93C.99.2 Es existiert ein echtes PPO-Modellpaket mit Lern-, Eval-, Resume-, Repro- und Holdout-Evidence; Scaffold-Artefakte allein blockieren Closure. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/handover_report.json` (`modelPackage.truePpoModelPackage=true`, `modelPackage.scaffoldOnly=false`, `reproducibility.ok=true`))
- [x] 93C.99.3 Die Ablations-/BT94A-Startlage ist ehrlich klassifiziert; `4-Env` ist nur bei direkter tragender Evidence freigegeben. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/handover_report.json` (`resultClass=diagnose`, `bt94aHandover.gate=closed-diagnose-ppo-regression`, `guardrails.fourEnvAllowed=false`))
- [x] 93C.99.4 V101-Folgecheck und PPO-Validate-Handover sind dokumentiert; offene Punkte sind fuer BT94A/BT94B blockierend oder explizit folgegated. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93c_precomparison_report.py --write-report` + `python\.venv\Scripts\python.exe python\scripts\bt93c_handover_report.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json` (`v101FollowUp.resultClass=no-ppo-contract-drift`, `ppoValidateHandover.targetBlock=BT94B.3`) und `data/training/ppo/bt93c/handover_report.json` (`remainingGates.bt94a=[F.05,F.19,F.27,F.30,F.31]`, `remainingGates.bt94bPpoValidate` gesetzt))

### Risiko-Register BT93C

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| PPO-Scaffold wird faelschlich als PPO-Training gelesen | hoch | Governance/RL | harte Learner-Gates, `no PPO optimizer update` blockiert Baseline-Aussagen | BT93C will Baseline aus Scaffold-Checkpoint ableiten |
| SB3/PPO-Stack ist nicht sauber installierbar oder nicht gepinnt | hoch | RL/Ops | eigener PPO-Requirements-/Lock-Pfad plus Clean-Env-Smoke | Import-/Install-/`pip check`-Fehler oder lokale venv-Sonderlage |
| `spaces.Dict`-/Split-Head-Plan ist nicht wirklich PPO-trainierbar | hoch | RL | SB3-kompatiblen Wrapper oder Custom-Policy vor Baseline erzwingen | Learner kann Action-Space nicht trainieren oder lernt nur Sanitizer-Fallbacks |
| Sanitizer, Masking oder Safety-Veto verstecken schlechte Policy | hoch | RL/QA | Sanitizer-/Mask-/Veto-Raten als Gate-Metriken fuehren | Survival steigt, aber Policy erzeugt weiter invalide oder vetoed Actions |
| Reward-Hacking oder Episode-Shortening | hoch | RL | RewardBreakdown, Death-Causes, Survival und Terminal-Klassen gemeinsam gate'n | Reward steigt, Survival/Holdout faellt |
| Hyperparameter-Collapse bei PPO | hoch | RL | KL-/Entropy-/Clip-/Grad-Norm-Schwellen und Abbruchregeln dokumentieren | Entropy kollabiert, KL explodiert oder Value-Loss dominiert |
| Normalize-Stats driften zwischen Train, Eval und Resume | hoch | Integration | Normalize-State mit Modell und Checkpoint hashen und in Eval laden | Eval nutzt andere Stats als Training |
| PPO-vs-DQN bleibt methodisch nicht apples-to-apples | hoch | QA/Ops | Champion, Matrix, Semantikfenster und Reports vorab einfrieren | Sieg/Niederlage erklaert sich nur aus anderem Scope oder anderer Semantik |
| Headless-Throughput reicht selbst nach Harness/Scaffold nicht fuer eine ehrliche Baseline | hoch | Performance | konservatives Budget, klare Downgrades und ehrliche Restpunkte statt Wunschannahmen | Laeufe liefern kaum nutzbare Timesteps oder kippen unter Last |
| Overfitting auf Seeds, Maps oder Modi | hoch | QA/RL | Holdout-Seeds und Mode-/Map-Stratifizierung vor Baseline einfrieren | Eval gewinnt, Holdout verliert |
| Eine gruene Baseline wird als Promotion oder BT94A-Freigabe missverstanden | mittel | Governance | Reports explizit als Baseline-Handover labeln | DQN-Vergleich wird intern schon als Rollout-Signal gelesen |
| Ein Claim wird zu gross und ueberspringt Readiness-Gates | hoch | Governance/RL | Mikro-Claim-Leiter einhalten; maximal zwei benachbarte Subphasen pro Claim | Arbeit will Freeze, Learner und Baseline in einem Zug erledigen |
| Python-Forward-Pass wird als JS-Runtime-Latenz missverstanden | hoch | Integration/Performance | 93C misst nur Trainings-/Export-Vorbereitung; JS-Tick-Budget bleibt Rollout-Intake | PPO-Modell laedt in Python, aber Runtime kann es nicht sicher ausfuehren |
| V101-Ratchet invalidiert PPO-Contracts oder Semantik | hoch | Architektur/RL | V101-Folgecheck vor DQN/PPO-Vergleich erzwingen | Observation-, Reward-, Safety- oder RuntimeConfig-Vertrag driftet nach 93C.5 |
| Fehlende PPO-Validate-Lane wird mit BT80C verwechselt | hoch | Governance/QA | BT80C nur als Alt-Kontext fuehren; `BT94B.3` als eigene PPO-Validate-Lane bauen | A/B-Evidence will `promote`, obwohl PPO nie validate-spezifisch gelaufen ist |

---

## Block BT93D: PPO-Diagnose-Reparatur und BT94A-Startfreigabe

Quelle:

- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- `python/scripts/bt94a_gate_check.py`
- Audit-Sanierungsregister F.05, F.19, F.27, F.30, F.31

<!-- LOCK: frei -->

Scope:

- Zwischenphase zwischen `BT93C.99` und `BT94A.1`, damit `/fix-planung` die rote BT94A-Startlage operativ abarbeiten kann.
- Ziel ist nicht Freeze, nicht Promotion und nicht Rollout, sondern ein gruener BT94A-Start-Gate oder ein sauberer `diagnose-blocked`-Abschluss mit konkretem Folgebedarf.
- Erlaubt sind PPO-Diagnose-, Reparatur-, Repro-, Eval- und Vorvergleichslaeufe im Sidecar-Pfad `python/**` und `data/training/ppo/**`.
- Verboten bleiben BT94A-Kandidatenlaeufe, Freeze-Kandidat-Erzeugung, BT94B-Handover, `promote`, `rollout-ready`, JS-Inference, Runtime-Strategieflag, Matchstart- oder AI-Hub-Umschaltung.
- Produktive Runtime-, Matchstart- und AI-Hub-Surfaces bleiben read-only gemaess Layer-Leitplanken: `ObservationBridgePolicy`, `RuntimeConfig`, `BotPolicyRegistry`, `BotPolicyTypes`, `LocalDqnInference`, `HybridDecisionArchitecture`, `RewardCalculator`, `MatchSessionFactory`.
- `candidateFreezeAllowed=false` im Gate-Checker ist vor BT94A.3 korrekt und kein Fehler; BT94A-Start verlangt `claimable=true`, `candidateRunsAllowed=true` und `matrixDefinitionAllowed=true`, aber noch keinen Freeze.

BT94A-Startfreigabe: alle Muss-Werte vor `94A.1`:

| Voraussetzung | Pflichtwert fuer Fortfahren | Referenz |
| --- | --- | --- |
| BT94A-Gate-Report | `resultClass=claimable`, `claimable=true` | `data/training/ppo/bt94a/no_start_gate.json`, `python/scripts/bt94a_gate_check.py` |
| Kandidatenlauf-Freigabe | `candidateRunsAllowed=true` nur fuer BT94A nach BT93D; in BT93D selbst keine BT94A-Kandidaten | `no_start_gate.json`, BT94A Claim-Grenze |
| Matrix-Definitionsfreigabe | `matrixDefinitionAllowed=true` | `no_start_gate.json`, `94A.1.1` bis `94A.1.5` |
| Freeze-Freigabe | vor BT94A.3 weiterhin `candidateFreezeAllowed=false`; Freeze erst nach BT94A-Kandidaten- und Holdout-Evidence | `bt94a_gate_check.py`, `94A.3.2` |
| Handover-Ergebnis | `BT93C`/BT93D-Handover darf nicht `diagnose` sein | `handover_report.json`, Claim-Check `bt93c_result_allows_bt94a` |
| Handover-Gate | `bt94aHandover.ready=true` | `handover_report.json`, Claim-Check `handover_gate_ready` |
| Vorvergleich | `precomparison_report.json.resultClass != ppo-regression` | Claim-Check `precomparison_not_regression` |
| Audit-Blocker | `summary.bt94a-blocker=0` | `evidence_quality_matrix.json`, Claim-Check `no_open_bt94a_audit_blockers` |
| F.05 Survival-First | PPO-Survival ist gegen dieselbe Matrix belegt; alte/non-PPO `bot:validate`-Reports zaehlen nicht | Audit F.05, `93C.6/94B.2`, `precomparison_report.json` |
| F.19 Terminal-/Death-Diagnostik | natuerliche Terminal-/Death-Cases und Survival-Verteilung sind belastbar; nicht nur `max-steps` | Audit F.19, `93C.4.2`, `93C.4.4`, `94B.2/94B.3` |
| F.27 DQN/PPO-Vergleich | BT93C-PPO ist nicht mehr als klare Regression gegen DQN klassifiziert oder die Klassifizierung ist mit neuer Evidence downgraded | Audit F.27, `93C.6`, `93C.7`, `94A.1` |
| F.30 Mask-/Clamp-Last | Reports trennen `policy-mask` von Post-Decode-Clamp/Veto; hohe Veto-/Masklast darf keinen Kandidaten kaschieren | Audit F.30, `93C.6.2`, `94A.1.3`, `94B.2.3` |
| F.31 Natural-Terminal-Matrix | Death-/Terminal-Matrix und Survival-Verteilung sind vor BT94A-Freeze-Pfad sichtbar und nicht leer | Audit F.31, `93C.6.2`, `94B.2`, `94B.3` |
| Baseline-ID | eine versionierte PPO-Baseline-ID mit Command, Datum, Seeds, Modi, Maps, Semantikfenster und Artefakten | `baseline_report.json`, `baseline_source_manifest.json`, `93C.5.4` |
| DQN-Champion | benannter DQN-Anker mit Baseline-ID, Metriken, Semantikfenster und Drift-Hinweis | `precomparison_report.json`, `93C.6.1`, `93C.6.4` |
| Holdout | Holdout-Seeds sind verbraucht, reportet und nicht nachoptimiert | `precomparison_report.json`, Audit F.29, `93C.6.2` |
| Semantikfenster | DQN/PPO-Semantikfenster ist benannt; Drift ist No-Op oder Blocker | `precomparison_report.json`, `handover_report.json`, Audit F.34 |
| Dependency-Lock | PPO-Stack bleibt reproduzierbar gepinnt und Clean-Env-Smoke bleibt gueltig | `python/requirements-ppo.txt`, `clean_env_smoke_report.json`, Audit F.02/F.25 |
| Modellpaket | echtes PPO-Modell mit Model-, Config-, Optimizer- und VecNormalize-Hash; kein Scaffold | `artifact_manifest.json`, `handover_report.json`, Audit F.01/F.04/F.17/F.33 |
| Evidence-Qualitaet | keine `tmp/**`-Only-, Self-Count-, stale-doc-, Scaffold-, Pilot-only- oder mutable `latest_*`-Evidence als Startsignal | `evidence_quality_matrix.json`, Audit F.10/F.11/F.16/F.21/F.22/F.23/F.33 |
| 4-Env | bleibt gesperrt, solange keine direkte 4-Env-Evidence vorliegt | Audit F.07, `baseline_report.json`, `93C.5.5` |
| PPO-Validate | fuer BT94A-Start nur als Restschuld sichtbar; vor `promote` in `BT94B.3` hard required | Audit F.06/F.14/F.28/F.37, `94B.3` |
| Rollout-Grenze | kein Rollout-, JS-Inference-, Registry-, Rollback-, Latenz- oder Strategieflag-Signal | `BT95`, Audit F.15, BT95 Rollout-Intake-Pflichtpaket |
| Governance-Gates | `npm.cmd run plan:check`, `npm.cmd run docs:sync`, `npm.cmd run docs:check`, `npm.cmd run build` fuer Abschluss-Gate | DoD/Governance |

Claim-Grenze fuer BT93D:

- `BT93C.99` ist abgeschlossen und `data/training/ppo/bt94a/no_start_gate.json` existiert mit `claimable=false`.
- BT93D darf nur die oben genannten Startvoraussetzungen reparieren, neu messen oder als blockierend downgaten.
- Wenn die Reparatur wiederholt scheitert, muss vor Stopp ein Fehlerbericht unter `docs/Fehlerberichte/` entstehen.
- BT93D schliesst entweder mit `BT94A-ready` (`claimable=true`) oder `diagnose-blocked` (`claimable=false` plus naechster Reparatur-/Replan-Bedarf).

### Definition of Done (DoD)

- [x] DoD.1 Alle vier Claim-Checks aus `bt94a_gate_check.py` sind gruen oder ein `diagnose-blocked`-Abschluss dokumentiert jeden roten Check mit Fehlerbericht/Folgegate. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` + `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt94a/no_start_gate.json` (`claimable=false`, vier Claim-Checks rot) und `data/training/ppo/bt93d/start_gate_package.json` (`resultClass=diagnose-blocked`, `diagnoseBlocked.nextReplanOrRepairStep` gesetzt))
- [x] DoD.2 F.05, F.19, F.27, F.30 und F.31 sind mit versionierter Evidence geschlossen oder explizit als weiter blockierend downgated; kein Punkt bleibt implizit offen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-upstream-reports` -> `data/training/ppo/bt93c/evidence_quality_matrix.json` und `data/training/ppo/bt93d/start_gate_package.json` (`trackedFindings.F.05/F.19/F.27/F.30/F.31=still-blocking`))
- [x] DoD.3 Ein erneuter PPO/DQN-Vorvergleich auf fester Matrix schreibt `avgStepsPerEpisode`, `averageBotSurvival`, Holdout, Median/Streuung, Failure-Klassen, Terminal-/Death-Klassen und Mask-/Veto-/Invalid-Raten. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt93d/start_gate_package.json` (`sourceArtifacts.bt93dSurvivalRegression`, `bt93dTerminalPolicyDiagnostics`, `bt93dMinimumStartStatistics` closure-capable))
- [x] DoD.4 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` sind aktualisiert und referenzieren unveraenderliche Run-IDs, Hashes und Artefaktpfade. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-upstream-reports` + `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data/training/ppo/bt93c/precomparison_report.json`, `data/training/ppo/bt93c/handover_report.json`, `data/training/ppo/bt93c/evidence_quality_matrix.json`, `data/training/ppo/bt94a/no_start_gate.json` (Run-IDs und SHA256-Quellen aktualisiert))
- [x] DoD.5 BT94A bleibt gesperrt, falls `resultClass=diagnose`, `precomparison=ppo-regression`, offene BT94A-Blocker oder unklare Reward-/Safety-/Terminal-Semantik bestehen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data/training/ppo/bt94a/no_start_gate.json` (`resultClass=blocked-no-start`, `claimable=false`, `bt93cState.bt94aBlockerCount=5`))
- [x] DoD.6 Keine produktive Runtime-, Matchstart-, AI-Hub-, JS-Inference-, Registry-, Rollback- oder Strategieflag-Datei wurde fuer PPO aktiviert oder vorbereitet. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt93d/start_gate_package.json` (`guardrails.productiveRuntimeChanged=false`, `runtimeSurfacesTouched=[]`))
- [x] DoD.7 `4-Env` bleibt ohne direkte Evidence gesperrt; 2-Env-Erfolg ist kein Freifahrtschein. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt93d/start_gate_package.json` (`artifactRefresh.minimumStatisticsMatrixId=bt93d-survival-repair-minimum-v1`, BT94A bleibt geschlossen))
- [x] DoD.8 PPO-Validate wird als `BT94B.3`-Restschuld sichtbar weitergefuehrt und nicht durch BT80C oder interne Eval-Metriken ersetzt. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-upstream-reports` -> `data/training/ppo/bt93c/precomparison_report.json` (`ppoValidateStatus=ppo-validate-missing`, `isPromotionEvidence=false`))
- [x] DoD.9 `npm.cmd run plan:check`, `npm.cmd run docs:sync`, `npm.cmd run docs:check` und `npm.cmd run build` sind PASS. (abgeschlossen: 2026-04-24; evidence: `npm.cmd run gates:pre-commit` + `npm.cmd run build` -> PASS)

### 93D.1 Gate-Wahrheit und Reparaturmanifest

- [x] 93D.1.1 `bt94a_gate_check.py --write-report` erneut ausfuehren und die vier Claim-Checks (`bt93c_result_allows_bt94a`, `handover_gate_ready`, `precomparison_not_regression`, `no_open_bt94a_audit_blockers`) als Startmatrix pinnen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` + `python\.venv\Scripts\python.exe python\scripts\bt93d_repair_manifest.py --write-report` -> `data/training/ppo/bt94a/no_start_gate.json` (`claimable=false`, `resultClass=blocked-no-start`) und `data/training/ppo/bt93d/start_matrix.json` (vier Claim-Checks gepinnt, alle `ok=false`))
- [x] 93D.1.2 Reparaturmanifest schreiben: alle Muss-Werte aus der Startfreigabe-Tabelle, aktuelle Artefakte, erwartete Zielwerte, verbotene Arbeiten und erlaubte Sidecar-Pfade. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_repair_manifest.py --write-report` -> `data/training/ppo/bt93d/repair_manifest.json` (`resultClass=gate-truth-pinned`, `mandatoryStartValues` gesetzt, `forbiddenWork` und `allowedSidecarPaths` gesetzt))
- [x] 93D.1.3 Evidence-Quellen fixieren: `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json`, `baseline_report.json`, `artifact_manifest.json`, `clean_env_smoke_report.json`; `tmp/**`, alte non-PPO-Reports und `latest_*` nur als Zusatzspur markieren. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_repair_manifest.py --write-report` -> `data/training/ppo/bt93d/repair_manifest.json` (`evidenceSources.closureCapable` enthaelt BT94A-/BT93D-/BT93C-Artefakte, `supplementalOnly` markiert `tmp/**`, `data/bot_validation_report.json`, `latest_*.json` und BT93B))
- [x] 93D.1.4 V101-/Semantik-/Dependency-Freshness pruefen: Semantikfenster, DQN-Champion, PPO-Baseline-ID, Holdout, Dependency-Lock, Modellhash, VecNormalize-Hash und Optimizer-Hash muessen unveraendert oder neu versioniert sein. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_repair_manifest.py --write-report` -> `data/training/ppo/bt93d/repair_manifest.json` (`freshness.v101.ok=true`, `dependencyLock.ok=true`, `modelPackage.ok=true`, `ppoBaseline.ok=true`, `semanticWindow.modeId=runtime-near-headless-v1`))

### 93D.2 Survival-Regression schliessen (F.05/F.27)

- [x] 93D.2.1 DQN/PPO-Vergleich auf derselben Matrix reproduzieren und Survival-/Steps-Deltas gegen den DQN-Anker offenlegen; alte `data/bot_validation_report.json`-Werte bleiben ausgeschlossen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_survival_regression_report.py --write-report` -> `data/training/ppo/bt93d/survival_regression_report.json` (`resultClass=survival-regression-reproduced`, `avgStepsPerEpisodePct=-86.385875`, `averageBotSurvivalPct=-57.19291`, `oldReportsExcluded` gesetzt))
- [x] 93D.2.2 Einen kleinen BT93D-Reparatur-/Diagnose-Learnerlauf ausfuehren oder ehrlich blockieren; der Lauf darf nicht als BT94A-Kandidat, Freeze oder Promotion gelabelt werden. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_survival_regression_report.py --write-report` -> `data/training/ppo/bt93d/survival_regression_report.json` (`repairLearnerRun.status=blocked`, `candidateRun=false`, `freezeCandidate=false`, `promotionClaim=false`))
- [x] 93D.2.3 Neue Eval-/Holdout-Reports muessen mindestens `precomparison != ppo-regression`, `handover result != diagnose` und eine belastbare Begruendung fuer `bt94aHandover.ready=true` liefern; andernfalls bleibt BT94A geschlossen. (abgeschlossen: 2026-04-24; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind baseline-repro-eval --phase-id 93D.2.3 --config python\configs\ppo_bt93c_baseline.json --artifact-root data\training\ppo\bt93d --checkpoint data\training\ppo\bt93c\runs\20260424T180033Z-baseline-train\artifact_manifest.json --eval-steps 16` + `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind holdout-eval --phase-id 93D.2.3 --config python\configs\ppo_bt93c_baseline.json --artifact-root data\training\ppo\bt93d --checkpoint data\training\ppo\bt93c\runs\20260424T180033Z-baseline-train\artifact_manifest.json --eval-steps 16` -> `data/training/ppo/bt93d/runs/20260424T202525Z-baseline-repro-eval/eval_report.json`, `data/training/ppo/bt93d/runs/20260424T202552Z-holdout-eval/eval_report.json`, `data/training/ppo/bt93d/survival_regression_report.json` (`bt94aStartAllowedAfter93D2=false`))
- [x] 93D.2.4 Mindeststatistik fuer den naechsten Start fixieren: Episodenzahl, Seeds, Modi, Maps, Holdout-Anteil, Median/Streuung, Non-Inferiority- oder Zielschwelle und Abbruchkriterien; +30% bleibt Promotionsziel fuer BT94B, nicht stilles BT94A-Startkriterium. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_survival_regression_report.py --write-report` -> `data/training/ppo/bt93d/minimum_start_statistics.json` (`matrixId=bt93d-survival-repair-minimum-v1`, `evalCompletedEpisodes=6`, `holdoutCompletedEpisodes=4`, `promotionPlus30PctRemainsBt94BOnly=true`))

### 93D.3 Terminal-, Death- und Policy-Mask-Diagnostik schliessen (F.19/F.30/F.31)

- [x] 93D.3.1 Natuerliche Terminal-, Death-Cause-, `max-steps`-, Crash-, Timeout-, Forced-Round-, Socket- und Teardown-Klassen in Train/Eval/Holdout getrennt erfassen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_terminal_policy_diagnostics.py --write-report` -> `data/training/ppo/bt93d/terminal_policy_diagnostics.json` (`lanes.train/eval/holdout.terminalDeathFailureMatrix` getrennt, `eval.maxStepsOnly=true`, `holdout.maxStepsOnly=true`, `train.observabilityStatus=missing-in-training-report`))
- [x] 93D.3.2 Survival-Verteilung und Death-/Terminal-Matrix so berichten, dass leere Death-Cause-Klassen oder reine `max-steps`-Runs BT94A weiter blockieren. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_terminal_policy_diagnostics.py --write-report` -> `data/training/ppo/bt93d/terminal_policy_diagnostics.json` (`bt94aImpact.findingStatus.F.19=still-blocking`, `F.31=still-blocking`, `eval/holdout.completedEpisodeStats.median=16.0`))
- [x] 93D.3.3 Policy-Level-Maskierung, Post-Decode-Clamp, Sanitizer, Safety-Veto, Invalid-Action und No-Op/Fallback getrennt messen; hohe Veto-/Masklast muss Freeze-Faehigkeit blockieren oder begruendet downgraded werden. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_terminal_policy_diagnostics.py --write-report` -> `data/training/ppo/bt93d/terminal_policy_diagnostics.json` (`policyMaskContract.policyLevelMasking.present=false`, `postDecodeClampTelemetry.present=true`, `train.postDecodeClampRate=1.0`, `eval.vetoRate=0.875`, `bt94aImpact.findingStatus.F.30=still-blocking`))
- [x] 93D.3.4 RewardBreakdown, Safety-Overrules und Episode-Shortening gemeinsam auswerten; Reward-Anstieg bei schlechterer Survival bleibt Blocker. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_terminal_policy_diagnostics.py --write-report` -> `data/training/ppo/bt93d/terminal_policy_diagnostics.json` (`resultClass=diagnose-blocked`, `eval/holdout.positiveRewardWhileSurvivalRegresses=true`, `bt94aImpact.blockedFindings` enthaelt `reward-safety-episode-shortening`))

### 93D.4 Startfreigabe-Paket fuer BT94A

- [x] 93D.4.1 `precomparison_report.json`, `handover_report.json` und `evidence_quality_matrix.json` aus den neuen Artefakten neu schreiben; F.05/F.19/F.27/F.30/F.31 muessen `closed` oder explizit `still-blocking` sein. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-upstream-reports` -> `data/training/ppo/bt93c/precomparison_report.json`, `data/training/ppo/bt93c/handover_report.json`, `data/training/ppo/bt93c/evidence_quality_matrix.json` (`bt93dRefresh.trackedFindings.F.05/F.19/F.27/F.30/F.31=still-blocking`, `summary.bt94a-blocker=5`))
- [x] 93D.4.2 `bt94a_gate_check.py --write-report` erneut ausfuehren; fuer BT94A-Start muessen `resultClass=claimable`, `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true` und `summary.bt94a-blocker=0` gelten. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data/training/ppo/bt94a/no_start_gate.json` (`resultClass=blocked-no-start`, `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `bt93cState.bt94aBlockerCount=5`))
- [x] 93D.4.3 Falls der Gate-Check rot bleibt, `diagnose-blocked` mit Fehlerbericht, roten Checks, betroffenen Artefakten und naechstem Replan-/Reparaturschritt dokumentieren; keine BT94A-Checkbox schliessen. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt93d/start_gate_package.json` (`resultClass=diagnose-blocked`, `diagnoseBlocked.redChecks=4`, `diagnoseBlocked.noBt94aCheckboxClosed=true`))
- [x] 93D.4.4 Falls der Gate-Check gruen ist, BT94A-Startstatus aktualisieren: `94A.1` darf erst danach Matrix/Regeln definieren; Freeze bleibt bis `94A.3` verboten. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt93d/start_gate_package.json` (`bt94aStartStatus.status=BT94A remains closed before 94A.1`, `candidateFreezeAllowed=false`, `phaseCoverage.93D.4.4=true`))

### 93D.99 Abschluss-Gate

- [x] 93D.99.1 Alle Phasen 93D.1 bis 93D.4 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-24; evidence: Plan-Evidence 93D.1-93D.4 + `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt93d/start_gate_package.json` (`phaseCoverage.93D.4.1/93D.4.2/93D.4.3/93D.4.4=true`))
- [x] 93D.99.2 BT94A ist nur dann startfaehig, wenn `no_start_gate.json` `claimable=true` schreibt und kein BT94A-Blocker offen ist; sonst endet BT93D als `diagnose-blocked`. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` + `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt94a/no_start_gate.json` (`claimable=false`, `bt93cState.bt94aBlockerCount=5`) und `data/training/ppo/bt93d/start_gate_package.json` (`resultClass=diagnose-blocked`))
- [x] 93D.99.3 Kein Ergebnis heisst `promote`, `rollout-ready`, `freeze-candidate` oder `BT94B-ready`; diese Begriffe bleiben BT94A/BT94B/BT95 vorbehalten. (abgeschlossen: 2026-04-24; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93d_start_gate_package.py --write-package` -> `data/training/ppo/bt93d/start_gate_package.json` (`candidateRun=false`, `freezeCandidate=false`, `promotionAllowed=false`, `rolloutSignal=false`))
- [x] 93D.99.4 `plan:check` und Doku-/Build-Gates sind Governance-Evidence, aber kein Survival- oder Promotionsbeweis. (abgeschlossen: 2026-04-24; evidence: `npm.cmd run gates:pre-commit` + `npm.cmd run build` -> PASS; fachliches Urteil bleibt `data/training/ppo/bt93d/start_gate_package.json` (`resultClass=diagnose-blocked`))

### Risiko-Register BT93D

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| BT94A wird durch manuelles Umdeuten statt Evidence entsperrt | kritisch | Governance/RL | `bt94a_gate_check.py` bleibt harte Startquelle | `claimable=false` wird ignoriert |
| Reparaturlauf wird als Kandidat oder Freeze missverstanden | kritisch | Governance/RL | Run-Kinds als `bt93d-diagnose`/`bt93d-repair` labeln; kein `candidate`/`freeze` | Artefakte landen unter `data/training/ppo/candidates/**` |
| Survival verbessert nur durch andere Matrix oder Semantik | hoch | QA/RL | feste Matrix, Semantikfenster und DQN-Anker erzwingen | Seeds, Modi, Maps oder Reward-Semantik driften |
| Hohe Veto-/Masklast kaschiert schlechte Policy | hoch | RL/QA | Policy-Mask vs Post-Decode-Clamp getrennt berichten | `vetoRate`/`maskRate` bleibt hoch, Survival sieht besser aus |
| Terminal-/Death-Matrix bleibt leer | hoch | QA/RL | Natural-Terminal-/Death-Klassen als Startblocker fuehren | Eval endet weiter nur ueber `max-steps` |
| PPO-Validate wird vorgezogen oder mit BT80C ersetzt | hoch | QA/Ops | BT93D fuehrt nur Handover-Restschuld; `BT94B.3` bleibt eigener Bauort | jemand nutzt Legacy-Validate als PPO-Promotion |
| Runtime-Grenzen werden in der Reparaturphase angerissen | kritisch | Architektur | produktive Surfaces read-only, nur Python/Data-Sidecar | Runtime-Flag, JS-Inference oder Matchstart wird vorbereitet |

---

## Block BT93E: Vollstaendige BT94A-Startbefund-Reparatur

Quelle:

- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93d/start_gate_package.json`
- `data/training/ppo/bt93d/terminal_policy_diagnostics.json`
- `data/training/ppo/bt93d/survival_regression_report.json`
- `data/training/ppo/bt93c/precomparison_report.json`
- `data/training/ppo/bt93c/handover_report.json`
- `data/training/ppo/bt93c/evidence_quality_matrix.json`
- Audit-Sanierungsregister F.01-F.37

<!-- LOCK: frei -->

Scope:

- Zweite Zwischenphase vor `BT94A.1`, weil `BT93D.99` korrekt mit `diagnose-blocked` endete und alle roten Befunde sichtbar in einen umsetzbaren Reparaturplan ueberfuehrt werden muessen.
- Ziel ist ein harter, artefaktbasierter `BT94A-ready`-Status oder ein neuer, engerer `diagnose-blocked`-Befund mit Fehlerbericht/Folgegate. Kein manuelles Umdeuten von `claimable=false`.
- Erlaubt sind Sidecar-Reparaturen, Diagnose-, Learner-, Eval-, Holdout-, Report- und Gate-Checker-Arbeiten in `python/**`, `data/training/ppo/**`, `tests/training-*.mjs` und diesem Plan.
- Verboten bleiben BT94A-Kandidatenlaeufe, Freeze-Kandidat-Erzeugung, BT94B-Handover, `promote`, `rollout-ready`, JS-Inference, Runtime-Strategieflag, Modellregistry, Rollback, Latenzbudget-Claim und produktive Matchstart-/AI-Hub-Umschaltung.
- Produktive Runtime-Surfaces bleiben read-only: `ObservationBridgePolicy`, `RuntimeConfig`, `BotPolicyRegistry`, `BotPolicyTypes`, `LocalDqnInference`, `HybridDecisionArchitecture`, `RewardCalculator`, `MatchSessionFactory`.
- `candidateFreezeAllowed=false` bleibt bis `94A.3` korrekt. BT93E darf nur `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression` und `summary.bt94a-blocker=0` vorbereiten.

Claim-Grenze fuer BT93E:

- `BT93D.99` ist abgeschlossen und `data/training/ppo/bt93d/start_gate_package.json` meldet `resultClass=diagnose-blocked`.
- `data/training/ppo/bt94a/no_start_gate.json` meldet `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false` und offene Blocker.
- BT93E arbeitet alle bekannten Befunde vor BT94 ab; wenn ein Befund nicht in BT93E geschlossen werden darf, muss er als nicht-startblockierend oder als harter Folgeblocker mit konkretem Folgegate dokumentiert sein.

Vollstaendiges Befundsinventar fuer BT93E:

| ID | Befund / Voraussetzung | Pflicht vor BT94A.1 | Referenz |
| --- | --- | --- | --- |
| G.01 | BT94A-Gate-Report ist rot | `resultClass=claimable`, `claimable=true` | `no_start_gate.json`, `bt94a_gate_check.py` |
| G.02 | Kandidatenlauf-Freigabe ist rot | `candidateRunsAllowed=true`; erst in BT94A nutzbar | `no_start_gate.json` |
| G.03 | Matrix-Definitionsfreigabe ist rot | `matrixDefinitionAllowed=true` | `no_start_gate.json`, `94A.1.*` |
| G.04 | Freeze-Freigabe darf noch rot bleiben | `candidateFreezeAllowed=false` bleibt korrekt bis `94A.3` | `bt94a_gate_check.py`, `94A.3.2` |
| G.05 | Handover-Ergebnis ist `diagnose` | Handover-Ergebnis ist nicht `diagnose` oder harter Folgeblocker | `handover_report.json` |
| G.06 | Handover-Gate ist geschlossen | `bt94aHandover.ready=true` | `handover_report.json` |
| G.07 | Vorvergleich ist `ppo-regression` | `precomparison_report.json.resultClass != ppo-regression` | `precomparison_report.json` |
| G.08 | Audit-Blocker offen | `summary.bt94a-blocker=0` | `evidence_quality_matrix.json` |
| C.01 | `bt93c_result_allows_bt94a` rot | Claim-Check gruen | `no_start_gate.json.claimChecks` |
| C.02 | `handover_gate_ready` rot | Claim-Check gruen | `no_start_gate.json.claimChecks` |
| C.03 | `precomparison_not_regression` rot | Claim-Check gruen | `no_start_gate.json.claimChecks` |
| C.04 | `no_open_bt94a_audit_blockers` rot | Claim-Check gruen | `no_start_gate.json.claimChecks` |
| F.01 | Echter PPO-Learner darf nicht wieder Scaffold-only werden | echtes Modellpaket und Optimizer-Update revalidieren | Audit F.01, `handover_report.json` |
| F.02 | Dependency-Pins / Clean-Env duerfen nicht ambient sein | Lockfile, `pip check`, Import-Smoke weiter gueltig | Audit F.02, `clean_env_smoke_report.json` |
| F.03 | Action-Surface muss SB3-trainierbar sein | Train-/Eval-Pfad nutzt echte Action-Surface | Audit F.03, `action_surface_smoke.json` |
| F.04 | Normalize-/Optimizer-State und Heads muessen echt bleiben | Load/Resume/Hash revalidiert | Audit F.04, `artifact_manifest.json` |
| F.05 | Survival-First ist nicht belegt; PPO regressiert | PPO-Survival/Steps gegen dieselbe Matrix nicht regressiv oder begruendet downgated | Audit F.05, `survival_regression_report.json` |
| F.06 | PPO-Validate fehlt | als BT94B.3-Restschuld sichtbar, kein Promote-Bypass | Audit F.06, `94B.3` |
| F.07 | Direkte `4-Env`-Evidence fehlt | `4-Env` bleibt gesperrt oder direkte Evidence liegt vor | Audit F.07 |
| F.08 | Throughput ist kein Lernbeweis | Reports labeln Throughput nur als Lane-/Budget-Evidence | Audit F.08 |
| F.09 | Freeze-Signal muss frisch sein | Freeze-/Freshness-Artefakt weiter gueltig oder neu erzeugt | Audit F.09 |
| F.10 | Stale Docs / untracked Hinweise | keine stale/untracked Startsignale | Audit F.10 |
| F.11 | `tmp/**` ist nicht closure-faehig | versionierte Evidence fuer alle Startaussagen | Audit F.11 |
| F.12 | DQN-Champion, Semantikfenster, Holdout muessen fest sein | Champion/Matrix/Holdout unveraendert oder neu versioniert | Audit F.12 |
| F.13 | Drei Runs allein sind schwach | Mindestepisoden, Streuung, Median, Holdout, Non-Inferiority fixiert | Audit F.13 |
| F.14 | Legacy `bot:validate` ist keine PPO-Validate | PPO-Validate bleibt eigene Lane | Audit F.14, `94B.3` |
| F.15 | Runtime-Handoff fehlt | bleibt Nicht-Ziel bis BT95/separater Rollout | Audit F.15 |
| F.16 | Baseline-Begriff mehrdeutig | `scaffold`, `pilot`, `baseline`, `candidate` getrennt | Audit F.16 |
| F.17 | Eval darf kein Scaffold-Eval sein | Eval laedt echtes Modellpaket | Audit F.17 |
| F.18 | Runtime-/Failure-Klassen muessen gemappt sein | `runtimeErrorCount`, Crash/Timeout/Forced/Teardown sichtbar | Audit F.18 |
| F.19 | Terminal-/Death-Diagnostik ist unzureichend | natuerliche Terminal-/Death-Cases und Survival-Verteilung belastbar | Audit F.19, `terminal_policy_diagnostics.json` |
| F.20 | Sanitizer-/Mask-/Veto-Raten fehlen als Gate-Metriken | Raten in Train/Eval/Holdout geschlossen reportet | Audit F.20 |
| F.21 | Risk-Register-Drift | Draft-/Aktivplan-Risiken abgeglichen | Audit F.21 |
| F.22 | `plan:check` ist kein PPO-Beweis | Governance-Evidence getrennt von Lauf-Evidence | Audit F.22 |
| F.23 | Self-Count-Evidence ist schwach | konkrete Artefakte statt Plan-Grep/Selbstzaehlung | Audit F.23 |
| F.24 | Shutdown-/Teardown-Failures sind kein Langzeitbeweis | Failure-Klassen weiterfuehren, nicht als Qualitaetsbeweis lesen | Audit F.24 |
| F.25 | Ambient venv-Abhaengigkeiten | reproduzierbarer Stack ohne lokale Zufallsdeps | Audit F.25 |
| F.26 | Baseline-Mehrdeutigkeit | genau eine Baseline-ID mit Metrikquelle | Audit F.26 |
| F.27 | DQN/PPO-Vergleich bleibt `ppo-regression` | Regression geschlossen, downgraded oder Folgeblocker | Audit F.27, `precomparison_report.json` |
| F.28 | interne Eval-Survival ist keine PPO-Validate | Metrikquelle getrennt; kein Validate-/Promotion-Claim | Audit F.28 |
| F.29 | Holdout wurde reserviert/benutzt, nicht nachoptimieren | Holdout-Verbrauch und Nicht-Nachoptimierung reportet | Audit F.29 |
| F.30 | Policy-Level-Mask fehlt; Clamp/Veto kaschiert Policy | Policy-Mask vs Post-Decode-Clamp getrennt; hohe Last blockiert | Audit F.30 |
| F.31 | Natural-Terminal-Matrix ist schwach | Death-/Terminal-Matrix nicht leer und nicht nur `max-steps` | Audit F.31 |
| F.32 | kleine Timesteps/Eval-Steps haben wenig Aussagekraft | Mindeststatistik vor Start fixiert und eingehalten | Audit F.32 |
| F.33 | mutable `latest_*` ist keine Freeze-Evidence | immutable Run-IDs, Hashes, Manifeste | Audit F.33 |
| F.34 | V101 kann Contract-Drift erzeugt haben | V101-Folgecheck No-Op oder Blocker | Audit F.34 |
| F.35 | gruenes Governance-Gate ist kein PPO-Beweis | semantische Run-/Validate-Evidence getrennt | Audit F.35 |
| F.36 | kurze Smokes sind kein Langzeitstabilitaetsbeweis | Stability-Klassen fortfuehren, keine Ueberinterpretation | Audit F.36 |
| F.37 | PPO-Validate-Bauort fehlt | Runner/Schema/Zielpfade in BT94B.3 hard gate, vor BT94 sichtbar | Audit F.37 |
| R.01 | Reward steigt bei schlechterer Survival | Reward-/Safety-/Episode-Shortening-Blocker geschlossen oder Folgegate | `start_gate_package.json`, `terminal_policy_diagnostics.json` |

### Definition of Done (DoD)

- [x] DoD.1 Alle Eintraege aus G.01-G.08, C.01-C.04, F.01-F.37 und R.01 sind in einem versionierten BT93E-Befundregister mit Status `closed`, `not-start-blocking-carried`, `still-blocking` oder `invalidated-by-new-evidence` dokumentiert. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\finding_register.json` (`total=50`, `closed=21`, `not-start-blocking-carried=12`, `still-blocking=17`))
- [x] DoD.2 F.05/F.19/F.27/F.30/F.31 und R.01 sind entweder mit neuer versionierter Evidence geschlossen oder bleiben als konkrete Folgeblocker sichtbar; kein impliziter Start von BT94A. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\handover_package.json` (`resultClass=diagnose-blocked`, `diagnoseBlocked.remainingBt94aGates` enthaelt `F.05/F.19/F.27/F.30/F.31/R.01`, `noBt94aCheckboxClosed=true`))
- [x] DoD.3 PPO/DQN-Vorvergleich, Holdout, Survival-/Steps-Deltas, Median/Streuung, Failure-Klassen, Terminal-/Death-Klassen und Mask-/Veto-/Invalid-Raten werden aus einer festen Matrix neu geschrieben oder als nicht belastbar blockierend markiert. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\survival_repair_report.json`, `terminal_reward_failure_report.json`, `action_surface_hardening_report.json` -> feste Matrix, `resultClass=diagnose-blocked`)
- [x] DoD.4 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json`, `no_start_gate.json` und ein neues BT93E-Handoverpaket referenzieren immutable Run-IDs, Modell-/Config-/Optimizer-/VecNormalize-Hashes und Artefaktpfade. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\handover_package.json` (`sourceArtifacts`, `bt94aStartStatus`, Modellhashes via `no_start_gate.json`))
- [x] DoD.5 BT94A bleibt geschlossen, solange `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression` und `summary.bt94a-blocker=0` nicht gleichzeitig erfuellt sind. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt94a\no_start_gate.json` (`claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `bt93cState.bt94aBlockerCount=5`))
- [x] DoD.6 Keine produktive Runtime-, Matchstart-, AI-Hub-, JS-Inference-, Registry-, Rollback-, Latenzbudget- oder Strategieflag-Datei wurde fuer PPO aktiviert oder vorbereitet. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\handover_package.json` (`guardrails.productiveRuntimeChanged=false`, `runtimeSurfacesTouched=[]`, `candidateRun=false`, `freezeCandidate=false`, `rolloutSignal=false`))
- [x] DoD.7 PPO-Validate, Rollout, Registry, JS-Inference, Latenzbudget und Rollback bleiben als BT94B/BT95/separater Rollout-Folgepfad sichtbar und werden nicht in BT93E vorgezogen. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\handover_package.json` (`bt94aReady.ppoValidateRestDebt`, `bt94aReady.rolloutRestDebt`, `guardrails.forbiddenWork`))
- [x] DoD.8 `npm.cmd run plan:check`, `npm.cmd run docs:sync`, `npm.cmd run docs:check` und `npm.cmd run build` sind PASS. (abgeschlossen: 2026-04-25; evidence: `npm.cmd run gates:pre-commit` -> PASS; `npm.cmd run build` -> PASS)

### 93E.1 Befundregister und Startgate-Wahrheit

- [x] 93E.1.1 Ein BT93E-Befundregister fuer G.01-G.08, C.01-C.04, F.01-F.37 und R.01 schreiben; jedes Element hat Referenzartefakt, Status, Owner-Layer, Startwirkung und naechstes Gate. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_start_truth.py --write-reports` -> `data/training/ppo/bt93e/finding_register.json` (`total=50`, `still-blocking=17`, `not-start-blocking-carried=12`, `closed=21`))
- [x] 93E.1.2 `bt94a_gate_check.py --write-report` erneut ausfuehren und die roten Claim-Checks, `claimable`, `candidateRunsAllowed`, `matrixDefinitionAllowed`, `candidateFreezeAllowed` und `summary.bt94a-blocker` als unverfaelschte Startmatrix pinnen. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` + `python\.venv\Scripts\python.exe python\scripts\bt93e_start_truth.py --write-reports` -> `data/training/ppo/bt94a/no_start_gate.json` und `data/training/ppo/bt93e/start_matrix.json` (`claimable=false`, `redClaimChecks=4`, `bt94aBlockerCount=5`))
- [x] 93E.1.3 Alle Carry-forward-Voraussetzungen pruefen: Baseline-ID, DQN-Champion, Holdout, Semantikfenster, Dependency-Lock, Modellpaket, Evidence-Qualitaet, `4-Env`, PPO-Validate-Restschuld und Rollout-Grenze. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_start_truth.py --write-reports` -> `data/training/ppo/bt93e/carry_forward_prerequisites.json` (`baseline/dependencyLock/dqnChampion/modelPackage/semanticWindow/v101=true`, `allRequiredStartValuesGreen=false`))
- [x] 93E.1.4 Wenn ein Befund nicht in BT93E reparierbar ist, einen Fehlerbericht/Folgegate-Pfad mit konkretem Blocker, Reproduktion, betroffenen Artefakten und verbotenem Workaround dokumentieren. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_start_truth.py --write-reports` -> `data/training/ppo/bt93e/followup_gate_report.json` (`openBt93eRepairScope=17`, `carriedOutsideBt93e=12`))

### 93E.2 Survival-, DQN- und Holdout-Reparatur (F.05/F.27/F.29/F.32)

- [x] 93E.2.1 Einen kleinen, explizit gelabelten BT93E-Reparatur-/Diagnose-Learner oder eine begruendete No-Run-Entscheidung ausfuehren; kein Kandidat, kein Freeze, kein Promote. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93c --run-kind diagnostics-smoke --phase-id 93E.2.1 --config python\configs\ppo_bt93c_baseline.json --artifact-root data\training\ppo\bt93e --checkpoint data\training\ppo\bt93c\runs\20260424T180033Z-baseline-train\artifact_manifest.json --total-timesteps 8` + `python\.venv\Scripts\python.exe python\scripts\bt93e_survival_repair_report.py --write-report` -> `data/training/ppo/bt93e/survival_repair_report.json` (`repairLearnerRun.status=executed-diagnostic-smoke`, `candidateRun=false`, `freezeCandidate=false`, `promotionClaim=false`))
- [x] 93E.2.2 PPO/DQN-Vorvergleich auf derselben Matrix neu schreiben: `avgStepsPerEpisode`, `averageBotSurvival`, Holdout, Median, Streuung, Seeds, Modi, Maps, Semantikfenster und DQN-Anker. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind baseline-repro-eval --phase-id 93E.2.2 --config python\configs\ppo_bt93c_baseline.json --artifact-root data\training\ppo\bt93e --checkpoint data\training\ppo\bt93e\runs\20260424T221741Z-diagnostics-smoke\artifact_manifest.json --eval-steps 16` + `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93c --run-kind holdout-eval --phase-id 93E.2.4 --config python\configs\ppo_bt93c_baseline.json --artifact-root data\training\ppo\bt93e --checkpoint data\training\ppo\bt93e\runs\20260424T221741Z-diagnostics-smoke\artifact_manifest.json --eval-steps 16` + `python\.venv\Scripts\python.exe python\scripts\bt93e_survival_repair_report.py --write-report` -> `data/training/ppo/bt93e/survival_repair_report.json` (`resultClass=diagnose-blocked`, `comparison.deltasAgainstDqn.resultClass=ppo-regression`, `evalCompletedEpisodes=2`, `holdoutCompletedEpisodes=2`))
- [x] 93E.2.3 Ergebnisregeln hart anwenden: `ppo-regression` bleibt Startblocker; ein Downgrade braucht neue Evidence, nicht Plantext. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_survival_repair_report.py --write-report` -> `data/training/ppo/bt93e/survival_repair_report.json` (`resultRules.ppoRegressionRemainsStartBlocker=true`, `resultRules.downgradeRequiresNewEvidence=true`, `resultRules.bt94aClaimableAfter93E2=false`))
- [x] 93E.2.4 Holdout-Verbrauch und Nicht-Nachoptimierung belegen; `latest_*`, `tmp/**`, alte non-PPO-Reports und Scaffold-/Pilot-only-Artefakte bleiben ausgeschlossen. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_survival_repair_report.py --write-report` -> `data/training/ppo/bt93e/survival_repair_report.json` (`holdoutNonOptimization.ok=true`, `postHoldoutOptimizerRuns=[]`, `mutableLatestPointersExcludedAsClosureEvidence=true`, `oldNonPpoReportsExcluded=['data/bot_validation_report.json']`))

### 93E.3 Terminal-, Death-, Reward- und Failure-Diagnostik (F.18/F.19/F.24/F.31/R.01)

- [x] 93E.3.1 Natuerliche Terminal-, Death-Cause-, `max-steps`-, Crash-, Timeout-, Forced-Round-, Socket- und Teardown-Klassen in Train/Eval/Holdout getrennt und versioniert reporten. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_terminal_reward_failure_report.py --write-report --update-start-matrix` -> `data\training\ppo\bt93e\terminal_reward_failure_report.json` (`phaseCoverage.93E.3.1=true`, Train/Eval/Holdout `terminalDeathFailureMatrix` versioniert, commit `b17a551`))
- [x] 93E.3.2 Survival-Verteilung so ausweisen, dass reine `max-steps`-Runs, leere Death-Cause-Klassen oder zu kleine Episodenzahlen Startblocker bleiben. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_terminal_reward_failure_report.py --write-report --update-start-matrix` -> `data\training\ppo\bt93e\terminal_reward_failure_report.json` (`phaseCoverage.93E.3.2=true`, `F.19=still-blocking`, `F.31=still-blocking`, `blockedFindings=['F.19','F.31','R.01']`, commit `b17a551`))
- [x] 93E.3.3 RewardBreakdown, Safety-Overrules, Episode-Shortening und Survival gemeinsam auswerten; Reward-Anstieg bei schlechterer Survival blockiert BT94A oder bekommt ein explizites Folgegate. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_terminal_reward_failure_report.py --write-report --update-start-matrix` -> `data\training\ppo\bt93e\terminal_reward_failure_report.json` (`phaseCoverage.93E.3.3=true`, `R.01=still-blocking`, `positiveRewardWhileSurvivalRegresses=true`, commit `b17a551`))
- [x] 93E.3.4 `runtimeErrorCount`, Crash/Timeout/Forced-Round und Teardown-Klassen in die Startmatrix aufnehmen, ohne daraus Langzeitstabilitaet oder PPO-Validate-Evidence abzuleiten. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_terminal_reward_failure_report.py --write-report --update-start-matrix` -> `data\training\ppo\bt93e\start_matrix.json` (`terminalRewardFailureMatrix.countsAsLongRunStabilityEvidence=false`, `countsAsPpoValidateEvidence=false`, commit `b17a551`))

### 93E.4 Policy-Mask-, Clamp-, Veto- und Action-Surface-Haertung (F.03/F.20/F.30)

- [x] 93E.4.1 Policy-Level-Maskierung, Post-Decode-Clamp, Sanitizer, Safety-Veto, Invalid-Action und No-Op/Fallback getrennt messen und im Train-/Eval-/Holdout-Pfad gleich benennen. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_action_surface_hardening_report.py --write-report --update-start-matrix` -> `data\training\ppo\bt93e\action_surface_hardening_report.json` (`phaseCoverage.93E.4.1=true`, Train/Eval/Holdout `schemaNames` getrennt, commit `87d8a5b`))
- [x] 93E.4.2 Hohe Clamp-/Veto-/Masklast als Freeze-/Startblocker behandeln oder mit neuer Evidence sauber downgaten; Sanitizer duerfen Policy-Fehler nicht verdecken. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_action_surface_hardening_report.py --write-report --update-start-matrix` -> `data\training\ppo\bt93e\action_surface_hardening_report.json` (`F.30=still-blocking`, `claimableAfter93E4=false`, `highLoadWithoutPolicyMaskBlocksBt94a=true`, commit `87d8a5b`))
- [x] 93E.4.3 Action-Surface-Smoke neu ausfuehren oder gezielt erweitern, damit SB3-Trainierbarkeit, Mask-Quelle, Index-Encoding und Fallback-Semantik belegt sind. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93c_action_surface_smoke.py --output data\training\ppo\bt93e\action_surface_smoke_93e4.json --block-id BT93E --phase-id 93E.4.3 --include-fallback-probes` -> `data\training\ppo\bt93e\action_surface_smoke_93e4.json` (`sb3CompatibleActionSpace=true`, `forcedNoopFallbackTelemetryVisible=true`, `forcedInvalidFallbackTelemetryVisible=true`, commit `87d8a5b`))
- [x] 93E.4.4 Reports aktualisieren, sodass `policy-mask` und `post-decode-clamp` nicht mehr vermischt werden. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_action_surface_hardening_report.py --write-report --update-start-matrix` -> `data\training\ppo\bt93e\start_matrix.json` (`actionSurfaceHardeningMatrix.phaseId=93E.4.4`, `policyMaskAndPostDecodeClampMustNotBeMixed=true`, commit `87d8a5b`))

### 93E.5 Gate-Refresh, Handover und Folgegrenzen

- [x] 93E.5.1 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93E-Artefakten neu schreiben. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_gate_refresh_handover.py --write-upstream-reports` + `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data\training\ppo\bt93c\precomparison_report.json`, `data\training\ppo\bt93c\handover_report.json`, `data\training\ppo\bt93c\evidence_quality_matrix.json`, `data\training\ppo\bt94a\no_start_gate.json` (`generatedBy=python/scripts/bt93e_gate_refresh_handover.py`, Gate `generatedBy=python/scripts/bt94a_gate_check.py`, commit `651641b`))
- [x] 93E.5.2 `bt94a_gate_check.py --write-report` erneut ausfuehren; BT94A darf nur bei `resultClass=claimable`, `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true` und `summary.bt94a-blocker=0` starten. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data\training\ppo\bt94a\no_start_gate.json` (`resultClass=blocked-no-start`, `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`, `bt93cState.bt94aBlockerCount=5`, commit `651641b`))
- [x] 93E.5.3 Falls der Gate-Check rot bleibt, BT93E endet mit `diagnose-blocked` plus Fehlerbericht/Folgegate; keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze und kein BT94B-Handover. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_gate_refresh_handover.py --write-package --write-error-report --update-start-matrix` -> `data\training\ppo\bt93e\handover_package.json` (`resultClass=diagnose-blocked`, `phaseCoverage.93E.5.3=true`, `diagnoseBlocked.noBt94aCheckboxClosed=true`), `docs\Fehlerberichte\2026-04-25_bt93e-gate-refresh-diagnose-blocked.md`, commit `651641b`)
- [x] 93E.5.4 Falls der Gate-Check gruen ist, BT93E endet mit `BT94A-ready`; `candidateFreezeAllowed=false` bleibt bis `94A.3` korrekt, und PPO-Validate/Rollout-Restschuld bleibt fuer BT94B/BT95 sichtbar. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93e_gate_refresh_handover.py --write-package --write-error-report --update-start-matrix` -> `data\training\ppo\bt93e\handover_package.json` (`resultClass=diagnose-blocked`, `phaseCoverage.93E.5.4=false`, `bt94aReady.active=false`, `bt94aReady.candidateFreezeAllowed=false`, PPO-Validate/Rollout-Restschuld bleibt Folgepfad, commit `651641b`))

### 93E.99 Abschluss-Gate

- [x] 93E.99.1 Alle Phasen 93E.1 bis 93E.5 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-25; evidence: `Select-String -Path docs\bot-training\Bot_Trainingsplan.md -Pattern '^- \[x\] 93E\.' | Where-Object { $_.Line -notmatch '93E\.99' }` -> 20 abgeschlossene 93E.1-93E.5-Phaseneintraege)
- [x] 93E.99.2 Das vollstaendige Befundregister deckt G.01-G.08, C.01-C.04, F.01-F.37 und R.01 ab; kein Befund ist ohne Status oder Folgegate. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\finding_register.json` (`total=50`, `bt94aBlockerCount=5`, alle Eintraege mit `status`/`nextGate`))
- [x] 93E.99.3 BT94A ist nur startfaehig, wenn `no_start_gate.json` `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true` und `summary.bt94a-blocker=0` schreibt; sonst bleibt Ergebnis `diagnose-blocked`. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\handover_package.json` (`resultClass=diagnose-blocked`), `data\training\ppo\bt94a\no_start_gate.json` (`claimable=false`, `bt93cState.bt94aBlockerCount=5`))
- [x] 93E.99.4 Kein Ergebnis heisst `promote`, `rollout-ready`, `freeze-candidate` oder `BT94B-ready`; diese Begriffe bleiben BT94A/BT94B/BT95 vorbehalten. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93e\handover_package.json` (`promotionAllowed=false`, `rolloutSignal=false`, `freezeCandidate=false`, `resultClass=diagnose-blocked`))
- [x] 93E.99.5 `plan:check` und Doku-/Build-Gates sind Governance-Evidence, aber kein Survival-, Validate- oder Promotionsbeweis. (abgeschlossen: 2026-04-25; evidence: `npm.cmd run gates:pre-commit` -> PASS; `npm.cmd run build` -> PASS; fachliches Urteil bleibt `data\training\ppo\bt93e\handover_package.json` (`resultClass=diagnose-blocked`))

### Risiko-Register BT93E

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Vollstaendigkeit wird behauptet, aber einzelne Audit-Befunde fehlen | kritisch | Governance | G.01-G.08, C.01-C.04, F.01-F.37 und R.01 als harte Registerpflicht | Befundregister hat Luecken oder unklare Stati |
| `claimable=false` wird durch Plantext umgangen | kritisch | Governance/RL | `bt94a_gate_check.py` bleibt einzige Startquelle | BT94A wird trotz rotem Gate geclaimt |
| Reparatur laeuft faktisch als Kandidaten-Ablation | kritisch | RL/Governance | Run-Kinds `bt93e-repair`/`bt93e-diagnose`; kein `candidate`, kein `freeze` | Artefakt landet unter `candidates/**` |
| Survival verbessert nur durch andere Matrix | hoch | QA/RL | Seeds, Modi, Maps, Semantikfenster und DQN-Anker pinnen | Vergleichsparameter driften |
| Reward-Hacking ersetzt echte Survival-Verbesserung | hoch | RL/QA | RewardBreakdown, Safety, Episode-Shortening und Survival gemeinsam gaten | Reward steigt, Survival faellt |
| Clamp-/Veto-Last kaschiert schlechte Policy | hoch | RL/QA | Policy-Mask vs Post-Decode-Clamp getrennt messen | Veto-/Clamp-Rate bleibt hoch |
| PPO-Validate oder Runtime-Rollout werden vorgezogen | kritisch | Architektur/Ops | BT93E bleibt Sidecar; Validate erst BT94B.3, Rollout erst BT95/separater Block | JS-Inference, Registry, Rollback oder Strategieflag wird vorbereitet |

---

## Block BT93F: Gezielte BT94A-Startreparatur

Quelle:

- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93e/handover_package.json`
- `data/training/ppo/bt93e/finding_register.json`
- `data/training/ppo/bt93e/survival_repair_report.json`
- `data/training/ppo/bt93e/terminal_reward_failure_report.json`
- `data/training/ppo/bt93e/action_surface_hardening_report.json`
- `docs/Fehlerberichte/2026-04-25_bt93e-gate-refresh-diagnose-blocked.md`

<!-- LOCK: frei -->

Scope:

- User-Replan nach `BT93E.99=diagnose-blocked`; dieser Block ist die einzige erlaubte Zwischenarbeit vor `BT94A.1`.
- Ziel ist nicht ein Kandidat, sondern ein kleiner, harter Reparaturpfad fuer die roten Startbefunde `F.05`, `F.19`, `F.27`, `F.30`, `F.31` und `R.01`.
- Ergebnis ist entweder `BT94A-ready` durch neue versionierte Evidence oder ein engeres `diagnose-blocked` mit eindeutigem Folgegate.
- BT93F arbeitet in kleinen Subphasen. Pro Subphase darf nur ein zusammenhaengendes Problem geloest werden; keine gemischten Grosslaeufe, keine Matrix-Erweiterung nebenbei.
- Erlaubt sind Sidecar-Aenderungen an PPO-Training, PPO-Eval, PPO-Reports, PPO-Konfigurationen, PPO-spezifischen Tests/Smokes und Artefakten unter `data/training/ppo/bt93f/**`.
- Verboten bleiben BT94A-Kandidatenlaeufe, Freeze-Kandidat-Erzeugung, BT94B-Handover, `promote`, `rollout-ready`, JS-Inference, Runtime-Strategieflag, Modellregistry, Rollback, Latenzbudget-Claim und produktive Matchstart-/AI-Hub-Umschaltung.
- Produktive Runtime-Surfaces bleiben read-only: `ObservationBridgePolicy`, `RuntimeConfig`, `BotPolicyRegistry`, `BotPolicyTypes`, `LocalDqnInference`, `HybridDecisionArchitecture`, `RewardCalculator`, `MatchSessionFactory`.

Startproblem 2026-04-25:

- `BT94A` ist formal blockiert: `resultClass=blocked-no-start`, `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`.
- Vier Claim-Checks sind rot: `bt93c_result_allows_bt94a`, `handover_gate_ready`, `precomparison_not_regression`, `no_open_bt94a_audit_blockers`.
- PPO ist fachlich nicht startreif: `averageBotSurvival=-57.19291%` gegen DQN, `avgStepsPerEpisode=-86.385875%`, Holdout-Survival ebenfalls `-57.19291%`.
- Eval/Holdout haben nur zwei abgeschlossene Episoden, enden `max-steps`-dominiert, enthalten keine natuerlichen Terminal-/Death-Cause-Klassen und sind damit statistisch und semantisch zu schwach.
- Policy-Level-Maskierung fehlt; Inventory- und Item-Aktionen werden aktuell nach dem Decode geklemmt oder per Safety-Veto neutralisiert. `postDecodeClampRate=1.0`, Veto-Rate bis `1.0`.
- Reward-/Safety-Signal ist nicht vertrauenswuerdig genug, weil positive Survival-Rewards mit kuerzerer Ueberlebensdauer und DQN-Regression koexistieren.

Claim-Grenze fuer BT93F:

- `BT93E.99` ist abgeschlossen und `data/training/ppo/bt93e/handover_package.json` meldet `resultClass=diagnose-blocked`.
- `data/training/ppo/bt94a/no_start_gate.json` meldet `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false` und offene Blocker `F.05/F.19/F.27/F.30/F.31`.
- BT93F darf nur die Startreparatur vorbereiten und beweisen. Wenn ein Befund in BT93F nicht geschlossen werden kann, muss er als harter Folgeblocker mit Reproduktion, Artefakten und verbotenem Workaround dokumentiert sein.

Startkriterien fuer `BT94A.1` nach BT93F:

- `bt94a_gate_check.py --write-report` schreibt `resultClass=claimable`, `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`.
- `candidateFreezeAllowed=false` bleibt korrekt, weil Freeze erst in `94A.3` erlaubt ist.
- `bt94aHandover.ready=true`, `handoverResultClass != diagnose`, `precomparison_report.json.resultClass != ppo-regression`.
- `summary.bt94a-blocker=0` bzw. `bt93cState.bt94aBlockerCount=0`.
- `F.05`, `F.19`, `F.27`, `F.30`, `F.31` und `R.01` sind geschlossen oder mit neuer Evidence sauber als nicht-startblockierend downgated.
- Eval/Holdout nutzen dieselbe Matrix-ID, dieselben Maps, dasselbe Semantikfenster, denselben DQN-Anker und immutable Run-IDs; `latest_*`-Pointer zaehlen nicht als Closure-Evidence.
- Mindeststatistik ist erfuellt: Eval mindestens 6 abgeschlossene Episoden, Holdout mindestens 4 abgeschlossene Episoden, inklusive Median, Streuung, Survival-/Steps-Deltas und Holdout-Ergebnis.
- Terminal-/Death-/Failure-Matrix ist sichtbar und nicht leer: natuerliche Terminal- oder Death-Cause-Klassen muessen belegt sein oder ein Folgegate muss erklaeren, warum ein No-Start bestehen bleibt.
- Policy-Level-Mask und Post-Decode-Clamp sind getrennt; hohe Clamp-/Veto-Last darf BT94A nicht verdeckt oeffnen.
- `runtimeErrorCount=0`, Crash/Timeout/Forced-Round/Teardown-Klassen sind ausgewiesen; diese Evidence bleibt interne Startdiagnose und keine PPO-Validate- oder Rollout-Evidence.

### Definition of Done (DoD)

- [x] DoD.1 BT93F erzeugt ein versioniertes Startreparatur-Paket unter `data/training/ppo/bt93f/**` mit Hypothesen, Matrix, Run-IDs, Artefaktpfaden, Modell-/Config-/Optimizer-/VecNormalize-Hashes und verbotenen Workarounds. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_start_repair_contract.py --write` -> `data\training\ppo\bt93f\start_repair_package.json` (`resultClass=start-repair-contract`, `startCriteria.modelPackageHashes` gesetzt, `scopeControl.forbiddenWorkarounds` gesetzt))
- [x] DoD.2 `F.05` und `F.27` sind durch neue Same-Matrix-Eval-/Holdout-Evidence nicht mehr `ppo-regression`, oder BT93F endet ehrlich mit `diagnose-blocked`. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_gate_refresh_handover.py --write-package --write-followup-report --write-error-report` -> `data\training\ppo\bt93f\handover_package.json` (`resultClass=diagnose-blocked`, `diagnoseBlocked.remainingBt94aGates` enthaelt `F.05/F.27`, commit `11d00a6`))
- [x] DoD.3 `F.19` und `F.31` sind durch belastbare Terminal-/Death-/Failure-Evidence geschlossen oder bleiben als enger Folgeblocker sichtbar. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93f\followup_gate_report.json` (`resultClass=diagnose-blocked`, `remainingBt94aGates` enthaelt `F.19/F.31`), `data\training\ppo\bt93f\handover_package.json` (`terminalRewardFailureResultClass=diagnose-blocked`, commit `11d00a6`))
- [x] DoD.4 `F.30` ist durch echte Policy-Level-Maskierung oder ein gleichwertiges trainierbares Masking-Konzept geschlossen oder bleibt als harter Folgeblocker sichtbar; Post-Decode-Clamp/Veto kaschieren keine Policy-Fehler. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93f\action_surface_repair_report.json` (`policyLevelMaskDecision.decision=follow-blocker`, `findingDisposition.F.30=still-blocking`), `data\training\ppo\bt93f\handover_package.json` (`diagnoseBlocked.remainingBt94aGates` enthaelt `F.30`, `bt94aStartStatus.claimable=false`, commit `11d00a6`))
- [x] DoD.5 `R.01` ist durch Reward-/Safety-/Episode-Shortening-Diagnostik geschlossen; positiver Reward bei schlechter Survival bleibt No-Start. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93f\handover_package.json` (`diagnoseBlocked.remainingBt94aGates` enthaelt `R.01`, `bt94aStartStatus.claimable=false`, commit `11d00a6`))
- [x] DoD.6 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json`, `no_start_gate.json` und ein neues BT93F-Handoverpaket werden aus BT93F-Artefakten neu geschrieben. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_gate_refresh_handover.py --write-upstream-reports` + `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` + `python\.venv\Scripts\python.exe python\scripts\bt93f_gate_refresh_handover.py --write-package --write-followup-report --write-error-report` -> `data\training\ppo\bt93c\precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json`, `data\training\ppo\bt94a\no_start_gate.json`, `data\training\ppo\bt93f\handover_package.json` (commit `11d00a6`))
- [x] DoD.7 BT93F laesst `candidateFreezeAllowed=false`, fuehrt keinen BT94A-Kandidatenlauf aus und erzeugt keinen Freeze-, Promote-, BT94B- oder Rollout-Claim. (abgeschlossen: 2026-04-25; evidence: `data\training\ppo\bt93f\handover_package.json` (`bt94aStartStatus.candidateFreezeAllowed=false`, `guardrails.candidateRun=false`, `freezeCandidate=false`, `promotionAllowed=false`, `rolloutSignal=false`, commit `11d00a6`))
- [x] DoD.8 `npm.cmd run plan:check`, `npm.cmd run docs:sync`, `npm.cmd run docs:check` und `npm.cmd run build` sind PASS. (abgeschlossen: 2026-04-25; evidence: `npm.cmd run gates:pre-commit` -> PASS; `npm.cmd run build` -> PASS)

### 93F.1 Startreparatur-Kontrakt und Hypothesen

- [x] 93F.1.1 Ein BT93F-Startpaket schreiben: aktuelle rote Claim-Checks, Blocker `F.05/F.19/F.27/F.30/F.31/R.01`, betroffene Artefakte, Owner-Layer, erlaubte Dateien und verbotene Workarounds. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_start_repair_contract.py --write` -> `data\training\ppo\bt93f\start_repair_package.json` (`currentNoStartState.redClaimChecks=4`, `blockerRegister` enthaelt `F.05/F.19/F.27/F.30/F.31/R.01`, `sourceArtifacts` gehasht))
- [x] 93F.1.2 Reparaturhypothesen trennen: Survival/Reward, Terminal-/Death-Emission, Policy-Level-Mask, Eval-/Holdout-Statistik und Gate-Refresh duerfen nicht in einem unkontrollierten Grosslauf vermischt werden. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_start_repair_contract.py --write` -> `data\training\ppo\bt93f\start_repair_package.json` (`separatedRepairHypotheses` enthaelt `H1-survival-reward`, `H2-terminal-death-emission`, `H3-policy-level-mask`, `H4-eval-holdout-statistics`, `H5-gate-refresh`))
- [x] 93F.1.3 Startkriterien maschinenlesbar fixieren: Mindestepisoden, DQN-Anker, Matrix-ID, Seeds, Maps, Semantikfenster, Non-Regression-Regel, Clamp-/Veto-Schwellen und Closure-faehige Zielpfade. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_start_repair_contract.py --write` -> `data\training\ppo\bt93f\start_repair_package.json` (`minimumCompletedEpisodes.eval=6`, `minimumCompletedEpisodes.holdout=4`, `dqnAnchor.baselineId=bt93c-dqn-reference-bt11-final-20260324-v1`, `matrix.matrixId=bt93c-dqn-ppo-precomparison-v1`, `actionTelemetryThresholds` gesetzt))
- [x] 93F.1.4 Einen No-Go-Report aktualisieren: kein BT94A-Claim, solange `no_start_gate.json` rot bleibt; kein alter `data/bot_validation_report.json`, kein `tmp/**`, kein `latest_*` und kein Plan-Grep zaehlt als Evidence. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_start_repair_contract.py --write` -> `data\training\ppo\bt93f\no_go_report.json` (`resultClass=no-go-active`, `prohibitedEvidenceSources` enthaelt `data/bot_validation_report.json`, `tmp/**`, `latest_*`, Plan-Grep/Self-Count))

### 93F.2 Terminal-, Death- und Reward-Emission reparieren

- [x] 93F.2.1 Train-, Eval- und Holdout-Reports so angleichen, dass `runtimeErrorCount`, Crash, Timeout, Forced-Round, Socket, Teardown, `maxSteps`, `naturalTerminal`, `terminalReasonCounts` und `deathCauseCounts` in allen relevanten Lanes sichtbar sind. (abgeschlossen: 2026-04-25; evidence: `python python\scripts\bt93f_terminal_reward_failure_report.py --write-report --write-probes` -> `data\training\ppo\bt93f\terminal_reward_failure_report.json` (`phaseCoverage.93F.2.1=true`, `laneSchemaContract.bt93fNormalizedMatrixHasAllFields=true`, `trainEvalHoldoutAreNamedConsistently=true`, commit `232fa85`))
- [x] 93F.2.2 Kontrollierte Terminal-/Death-Probes bauen oder erweitern, die mindestens eine natuerliche Terminal- oder Death-Cause-Klasse versioniert ausloesen, ohne daraus Qualitaets- oder Promotions-Evidence abzuleiten. (abgeschlossen: 2026-04-25; evidence: `python python\scripts\bt93f_terminal_reward_failure_report.py --write-report --write-probes` -> `data\training\ppo\bt93f\controlled_terminal_death_probes.json` (`bt93f-probe-player-dead`, `bt93f-probe-match-ended`, `countsAsPromotionEvidence=false`, commit `232fa85`))
- [x] 93F.2.3 RewardBreakdown, Safety-Overrules, Episode-Shortening und Survival gemeinsam reporten; positive Reward-Signale bei kuerzerer Survival muessen `R.01` blockierend markieren. (abgeschlossen: 2026-04-25; evidence: `python python\scripts\bt93f_terminal_reward_failure_report.py --write-report --write-probes` -> `data\training\ppo\bt93f\terminal_reward_failure_report.json` (`phaseCoverage.93F.2.3=true`, `findingDisposition.R.01=still-blocking`, `r01BlocksStart=true`, commit `232fa85`))
- [x] 93F.2.4 Eval-/Holdout-Reports duerfen nicht mehr `max-steps-only` mit leerer Death-Matrix als startfaehig interpretieren; zu kleine Episodenzahlen bleiben No-Start. (abgeschlossen: 2026-04-25; evidence: `python python\scripts\bt93f_terminal_reward_failure_report.py --write-report --write-probes` -> `data\training\ppo\bt93f\terminal_reward_failure_report.json` (`phaseCoverage.93F.2.4=true`, `blockedFindings=['F.19','F.31','R.01']`, `resultClass=diagnose-blocked`, commit `232fa85`))

### 93F.3 Policy-Level-Mask und Action-Surface reparieren

- [x] 93F.3.1 Entscheiden und implementieren, wie Policy-Level-Maskierung im SB3-Pfad trainierbar wird: bevorzugt echtes Masking vor Policy-Sampling; falls technisch nicht moeglich, enger Folgeblocker statt Startfreigabe. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93f_action_surface_repair_report.py --write-smoke --write-report` -> `data\training\ppo\bt93f\action_surface_repair_report.json` (`policyLevelMaskDecision.decision=follow-blocker`, `maskSpecified=true`, `stack.sb3ContribImportable=false`, commit `62f247c`))
- [x] 93F.3.2 Mask-Quelle festlegen und reporten: Inventory-Laenge und erlaubte Index-Aktionen muessen aus dem JS-autoritativen Transition-Payload kommen und in Train/Eval/Holdout gleich benannt sein. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93f_action_surface_repair_report.py --write-smoke --write-report` -> `data\training\ppo\bt93f\action_surface_repair_report.json` (`maskSourceContract.source=info.match.inventoryLength from the JS-authoritative transition payload`, `sameNameInTrainEvalHoldout=true`, commit `62f247c`))
- [x] 93F.3.3 Post-Decode-Clamp, Safety-Veto, Sanitizer, Invalid-Action und No-Op/Fallback getrennt messen; `policy-mask` darf nicht mit `post-decode-clamp` vermischt werden. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93f_action_surface_repair_report.py --write-smoke --write-report` -> `data\training\ppo\bt93f\action_surface_repair_report.json` (`telemetrySeparation.policyMaskAndPostDecodeClampMustNotBeMixed=true`, `findingDisposition.F.30=still-blocking`, commit `62f247c`))
- [x] 93F.3.4 Action-Surface-Smoke erweitern: SB3-Trainierbarkeit, Mask-Quelle, Index-Encoding, Forced-Invalid, Forced-Noop, Forced-Veto und Fallback-Semantik muessen versioniert belegt sein. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\scripts\bt93f_action_surface_repair_report.py --write-smoke --write-report` -> `data\training\ppo\bt93f\action_surface_smoke_93f3.json` (`sb3CompatibleActionSpace=true`, `policyMaskSourceFromJsTransitionPayload=true`, `forcedInvalidFallbackTelemetryVisible=true`, `forcedNoopFallbackTelemetryVisible=true`, `forcedVetoTelemetryVisible=true`, commit `62f247c`))

### 93F.4 Kleine Reparatur-Learner- und Same-Matrix-Eval-Lane

- [x] 93F.4.1 Erst nach `93F.2` und `93F.3` einen kleinen, explizit gelabelten Reparatur-Learner ausfuehren; Run-Kind bleibt `repair-diagnostic`, nicht `candidate`, nicht `freeze`, nicht `promote`. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\train.py --profile bt93f --run-kind repair-diagnostic --phase-id 93F.4.1 --config python\configs\ppo_bt93f_repair_diagnostic.json --artifact-root data\training\ppo\bt93f --checkpoint data\training\ppo\bt93c\runs\20260424T180033Z-baseline-train\artifact_manifest.json` -> `data\training\ppo\bt93f\runs\20260425T082419Z-repair-diagnostic\training_report.json` (`runKind=repair-diagnostic`, `truePpoOptimizerUpdate=true`, `candidateRun=false`, commit `95a5a7b`))
- [x] 93F.4.2 Eval und Holdout auf derselben Matrix neu laufen lassen: gleiche Maps, Semantikfenster, DQN-Anker, Baseline-ID, erlaubte Seeds und immutable Run-IDs; keine Matrix- oder Reward-Drift waehrend der Auswertung. (abgeschlossen: 2026-04-25; evidence: `tmp\bt93c-clean-env-20260424T155919Z\Scripts\python.exe python\eval.py --profile bt93f --run-kind baseline-repro-eval/holdout-eval --phase-id 93F.4.2 --config python\configs\ppo_bt93f_repair_diagnostic.json --artifact-root data\training\ppo\bt93f --checkpoint data\training\ppo\bt93f\runs\20260425T082419Z-repair-diagnostic\artifact_manifest.json` -> `data\training\ppo\bt93f\repair_diagnostic_report.json` (`comparison.matrix.ok=true`, `evalRunId=20260425T082445Z-baseline-repro-eval`, `holdoutRunId=20260425T082506Z-holdout-eval`, commit `95a5a7b`))
- [x] 93F.4.3 Mindeststatistik erreichen oder ehrlich blockieren: Eval mindestens 6 abgeschlossene Episoden, Holdout mindestens 4, inklusive Median, Streuung, Survival-/Steps-Deltas, Runtime-/Failure-Klassen und Action-Telemetrie. (abgeschlossen: 2026-04-25; evidence: `python python\scripts\bt93f_repair_diagnostic_report.py --write-report` -> `data\training\ppo\bt93f\repair_diagnostic_report.json` (`minimumStatisticsObserved.evalCompletedEpisodes=6`, `holdoutCompletedEpisodes=6`, `deltasAgainstDqn.resultClass=ppo-regression`, commit `95a5a7b`))
- [x] 93F.4.4 Ergebnisregeln hart anwenden: `ppo-regression`, Reward-Hacking, leere Terminal-/Death-Matrix, hohe Clamp-/Veto-Last oder `runtimeErrorCount>0` halten BT94A geschlossen. (abgeschlossen: 2026-04-25; evidence: `python python\scripts\bt93f_repair_diagnostic_report.py --write-report` -> `data\training\ppo\bt93f\repair_diagnostic_report.json` (`resultClass=diagnose-blocked`, `bt94aImpact.blockedFindings=[F.05,F.19,F.27,F.30,F.31,R.01]`, `phaseCoverage.93F.4.4=true`, commit `95a5a7b`))

### 93F.5 Gate-Refresh und Handover-Entscheidung

- [x] 93F.5.1 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93F-Artefakten neu schreiben. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_gate_refresh_handover.py --write-upstream-reports` + `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data\training\ppo\bt93c\precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json`, `data\training\ppo\bt94a\no_start_gate.json` (`generatedBy=python/scripts/bt93f_gate_refresh_handover.py`, Gate `generatedBy=python/scripts/bt94a_gate_check.py`, commit `11d00a6`))
- [x] 93F.5.2 `bt94a_gate_check.py --write-report` erneut ausfuehren und das Ergebnis unverfaelscht pinnen: Claim nur bei `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression`, `bt94aBlockerCount=0`. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data\training\ppo\bt94a\no_start_gate.json` (`resultClass=blocked-no-start`, `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `candidateFreezeAllowed=false`, `bt93cState.bt94aBlockerCount=5`, commit `11d00a6`))
- [x] 93F.5.3 Wenn der Gate-Check rot bleibt, endet BT93F mit `diagnose-blocked` plus Fehlerbericht/Folgegate; keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze und kein BT94B-Handover. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_gate_refresh_handover.py --write-package --write-followup-report --write-error-report` -> `data\training\ppo\bt93f\handover_package.json` (`resultClass=diagnose-blocked`, `phaseCoverage.93F.5.3=true`, `diagnoseBlocked.noBt94aCheckboxClosed=true`), `data\training\ppo\bt93f\followup_gate_report.json`, `docs\Fehlerberichte\2026-04-25_bt93f-gate-refresh-diagnose-blocked.md`, commit `11d00a6`)
- [x] 93F.5.4 Wenn der Gate-Check gruen ist, endet BT93F mit `BT94A-ready`; `candidateFreezeAllowed=false` bleibt bis `94A.3`, PPO-Validate bleibt `BT94B.3`, Rollout bleibt BT95/separater Block. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93f_gate_refresh_handover.py --write-package --write-followup-report --write-error-report` -> `data\training\ppo\bt93f\handover_package.json` (`resultClass=diagnose-blocked`, `phaseCoverage.93F.5.4=false`, `bt94aReady.active=false`, `bt94aReady.candidateFreezeAllowed=false`, PPO-Validate/Rollout-Restschuld bleibt Folgepfad, commit `11d00a6`))

### 93F.99 Abschluss-Gate

- [x] 93F.99.1 Alle Phasen 93F.1 bis 93F.5 sind mit Evidence dokumentiert. (abgeschlossen: 2026-04-25; evidence: `Select-String -Path docs\bot-training\Bot_Trainingsplan.md -Pattern '^- \[x\] 93F\.[1-5]\.'` -> 20 abgeschlossene 93F.1-93F.5-Phaseneintraege mit Artefakt-Evidence)
- [x] 93F.99.2 Das BT93F-Handoverpaket enthaelt ein eindeutiges Ergebnis: `BT94A-ready` oder `diagnose-blocked`. (abgeschlossen: 2026-04-25; evidence: `Get-Content data\training\ppo\bt93f\handover_package.json | ConvertFrom-Json` -> `resultClass=diagnose-blocked`, `diagnoseBlocked.active=true`, `bt94aReady.active=false`)
- [x] 93F.99.3 BT94A ist nur startfaehig, wenn `no_start_gate.json` `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression` und `bt94aBlockerCount=0` schreibt. (abgeschlossen: 2026-04-25; evidence: `Get-Content data\training\ppo\bt94a\no_start_gate.json | ConvertFrom-Json` -> `resultClass=blocked-no-start`, `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `bt93cState.precomparisonResultClass=ppo-regression`, `bt93cState.bt94aBlockerCount=5`)
- [x] 93F.99.4 Kein Ergebnis heisst `promote`, `rollout-ready`, `freeze-candidate` oder `BT94B-ready`; diese Begriffe bleiben BT94A/BT94B/BT95 vorbehalten. (abgeschlossen: 2026-04-25; evidence: `Get-Content data\training\ppo\bt93f\handover_package.json | ConvertFrom-Json` -> `resultClass=diagnose-blocked`, `guardrails.candidateRun=false`, `freezeCandidate=false`, `promotionAllowed=false`, `rolloutSignal=false`)
- [x] 93F.99.5 `plan:check` und Doku-/Build-Gates sind Governance-Evidence, aber kein Survival-, Validate- oder Promotionsbeweis. (abgeschlossen: 2026-04-25; evidence: `npm.cmd run gates:pre-commit` -> PASS; `npm.cmd run build` -> PASS; fachliches Urteil bleibt `data\training\ppo\bt93f\handover_package.json` (`resultClass=diagnose-blocked`))

### Risiko-Register BT93F

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Reparatur wird als Kandidatenlauf missverstanden | kritisch | Governance/RL | Run-Kind `repair-diagnostic`, kein `candidate`, kein Freeze, keine `candidates/**`-Artefakte | Artefakte oder Reports sprechen von Kandidat/Freeze |
| Zu viele Ursachen werden in einem Lauf vermischt | hoch | RL/QA | 93F.2, 93F.3 und 93F.4 strikt sequenzieren; pro Subphase ein Problem | Survival veraendert sich, aber Ursache ist unklar |
| Policy-Fehler bleiben durch Clamp/Veto verdeckt | kritisch | RL | Policy-Level-Mask vor Sampling oder harter Folgeblocker | `postDecodeClampRate`/Veto bleibt hoch |
| Terminal-/Death-Matrix bleibt leer | hoch | QA/Ops | Kontrollierte Probes und Lane-Reports erzwingen | Reports sind weiter `max-steps-only` |
| Reward-Hacking verbessert Reportwerte ohne echtes Ueberleben | kritisch | RL/QA | RewardBreakdown, Survival, Episode-Laenge und Safety zusammen gaten | Reward steigt, Survival/Steps bleiben regressiv |
| Matrix driftet gegenueber DQN-Anker | hoch | QA | Matrix-ID, Seeds, Maps, Semantikfenster und DQN-Anker pinnen | Vergleich wirkt besser, aber Parameter haben gewechselt |
| Kleine Statistik wird als Startbeweis ueberinterpretiert | hoch | QA | Mindestepisoden und Streuung als harte Startkriterien | Eval/Holdout hat weniger Episoden als gefordert |
| PPO-Validate oder Runtime-Rollout werden vorgezogen | kritisch | Architektur/Ops | BT93F bleibt Sidecar; Validate erst BT94B.3, Rollout erst BT95/separater Block | JS-Inference, Registry, Rollback oder Strategieflag wird vorbereitet |

---

## Block BT93G: Masked Comparable Repair Lane

Quelle:

- User-Replan 2026-04-25 nach BT93F: BT94A bleibt blockiert, weil Root-Causes statt Plan-Hygiene offen sind.
- `data/training/ppo/bt94a/no_start_gate.json`
- `data/training/ppo/bt93f/repair_diagnostic_report.json`
- `data/training/ppo/bt93f/handover_package.json`
- `data/training/ppo/bt93f/followup_gate_report.json`
- `data/training/ppo/bt93f/action_surface_repair_report.json`
- `data/training/ppo/bt93f/terminal_reward_failure_report.json`
- `python/configs/ppo_bt93f_repair_diagnostic.json`
- `scripts/training-headless-lane-runner.mjs`, `python/envs/ppo_action_surface.py`, `src/state/training/EpisodeController.js`, `src/state/training/RewardCalculator.js`

<!-- LOCK: Bot-Codex seit 2026-04-25 -->

Scope:

- BT93G ist der enge Folgeblock nach `BT93F.99=diagnose-blocked`; er darf BT94A nicht claimen, sondern muss die fachlichen Startblocker reparieren oder erneut ehrlich blockieren.
- Ziel ist eine maskierte, vergleichbare Reparatur-Lane: vergleichbarer Horizont, echtes Policy-Level-Masking vor Sampling, echte Terminal-/Death-/Reward-Semantik und danach eine gestufte PPO-Repair-Trainingsleiter mit vergleichbarem Eval-/Holdout-Nachweis.
- BT93G ersetzt keinen BT94A-Kandidatenlauf. Run-Kinds bleiben `repair`, `diagnostic`, `comparable-repair-eval` oder gleichwertig; verboten sind `candidate`, `freeze`, `promote`, `rollout-ready` und `BT94B-ready`.
- BT93G arbeitet in getrennten Subphasen. Keine neue Learner-/Eval-Lane darf starten, bevor Matrix-Sanity, Natural-Terminal-Wiring, Pre-Sampling-Mask und Reward-Gate-Regeln sichtbar sind.
- Ein reiner Smoke- oder 64/128-Timestep-Lauf reicht fuer BT94A nicht. Nach den Root-Fixes muss mindestens ein echtes laengeres PPO-Repair-Training auf der vergleichbaren Matrix laufen oder BT93G endet `diagnose-blocked`.
- Ein bis zu 4h langer Extended-Repair-Train ist in BT93G erlaubt, aber nur bedingt sinnvoll: vorher muessen Matrix, Terminal-/Death-Wiring, Pre-Sampling-Mask, Reward-Gates, Checkpointing und Early-Stop-Regeln gruen sein. Ohne diese Voraussetzungen ist ein 4h-Lauf verboten und waere nur teure Diagnose-Wiederholung.
- Erlaubt sind Sidecar-/Trainingsaenderungen an PPO-Training, PPO-Eval, PPO-Reports, PPO-Konfigurationen, `python/envs/ppo_action_surface.py`, `scripts/training-headless-lane-runner.mjs`, trainingsnahen Semantiktests und Artefakten unter `data/training/ppo/bt93g/**`.
- Aenderungen an `src/state/training/EpisodeController.js` und `src/state/training/RewardCalculator.js` sind nur erlaubt, wenn sie Trainingssemantik, Terminal-/Truncation-Vertrag oder Reward-Diagnostik transparent machen; keine produktive Matchstart-, AI-Hub-, Bot-Policy-, Registry-, Rollback- oder Runtime-Umschaltung.
- `candidateFreezeAllowed=false` bleibt bis `94A.3` korrekt. Selbst ein gruener BT93G-Abschluss oeffnet nur `94A.1`, keinen Freeze.

Verifizierter No-Start 2026-04-25:

| Gate-Feld | Soll fuer BT94A | Ist nach BT93F | Konsequenz |
| --- | --- | --- | --- |
| `resultClass` | `claimable` | `blocked-no-start` | BT94A bleibt zu |
| `claimable` | `true` | `false` | kein Claim |
| `candidateRunsAllowed` | `true` | `false` | keine Kandidatenlaeufe |
| `matrixDefinitionAllowed` | `true` | `false` | keine BT94A-Ablationsmatrix |
| `candidateFreezeAllowed` | erst `94A.3` | `false` | korrekt rot |
| `bt94aHandover.ready` | `true` | `closed-diagnose-blocked-by-bt93f` | Handover geschlossen |
| `precomparison` | nicht `ppo-regression` | `ppo-regression` | fachliche Regression |
| `bt94aBlockerCount` | `0` | `5` | harte Audit-Blocker offen |

Rote Claim-Checks:

| Check | Soll | Ist |
| --- | --- | --- |
| `bt93c_result_allows_bt94a` | nicht `diagnose` | `diagnose` |
| `handover_gate_ready` | `ready=true` | `closed-diagnose-blocked-by-bt93f` |
| `precomparison_not_regression` | nicht `ppo-regression` | `ppo-regression` |
| `no_open_bt94a_audit_blockers` | `0` | `5` |

BT93F-KPI-Lage:

| Metrik | DQN-Anker | PPO BT93F | Delta |
| --- | ---: | ---: | ---: |
| `averageBotSurvival` | `37.376986` | `16.0` | `-57.19291%` |
| `avgStepsPerEpisode` | `117.525` | `16.0` | `-86.385875%` |
| Holdout Survival | `37.376986` | `16.0` | `-57.19291%` |

Root-Causes, die BT93G beheben muss:

| Root-Cause | Aktueller Beweis | BT93G-Ziel |
| --- | --- | --- |
| Vergleichshorizont ist strukturell falsch | `python/configs/ppo_bt93f_repair_diagnostic.json` setzt `maxStepsPerEpisode=16`; gegen DQN `avgStepsPerEpisode=117.525` ist Non-Regression mathematisch unerreichbar | Reparatur-/Eval-Matrix mit `maxStepsPerEpisode >= 128`, bevorzugt `180+`, oder harte Gate-Logik, die 16-Step-Diagnostik nicht gegen DQN-117-Step-Metriken als Qualitaetsvergleich klassifiziert |
| Pre-Sampling-Mask fehlt | `policyLevelMask` ist spezifiziert, aber in SB3 `2.3.2` nicht vor Sampling konsumiert; `sb3-contrib` ist nicht gepinnt; Clamp/Veto verdecken Policy-Fehler | Entweder kleineres maskierbares semantisches Action-Vocabulary oder gepinnter `sb3-contrib`-/`MaskablePPO`-Pfad mit `policyLevelMask.preSamplingApplied=true` |
| Terminal-/Death-Semantik kommt nicht aus Runtime-State in den Episode-Step | `scripts/training-headless-lane-runner.mjs` ruft `EpisodeController.step({})`; Eval/Holdout enden max-steps-dominiert und Death-Matrix bleibt leer | `player.alive=false`, Kernel-Lifecycle `round_end`/`match_end` und Timeout/Cap werden als `done`, `terminalReason`, `truncated`, `truncatedReason` in den Episode-Contract zurueckgefuehrt |
| Reward bleibt positiv trotz Survival-Regression | Survival-Reward pro Step kann bei 16-Step-Cap positiv bleiben, obwohl PPO gegen DQN massiv verliert | Reward-/Gate-Semantik blockiert oder bestraft positive Rewards bei Episode-Shortening, hoher Clamp-/Veto-Last, `max-steps-only` und DQN-Regression |
| PPO ist praktisch untertrainiert | BT93C/BT93F nutzten nur Smoke-/Diagnosebudgets (`64` bis `128` Timesteps) und kurze Caps; das beweist Stack-Funktion, aber keine Policy-Qualitaet | Nach Root-Fixes eine Trainingsleiter erzwingen: Smoke -> Short comparable repair -> Extended repair train; jeder Schritt mit Lernmetriken, Eval, Abbruchkriterien und immutable Artefakten |

Claim-Grenze fuer BT93G:

- `BT93F.99` ist abgeschlossen und `data/training/ppo/bt93f/handover_package.json` meldet `resultClass=diagnose-blocked`.
- `data/training/ppo/bt94a/no_start_gate.json` meldet `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `precomparison=ppo-regression` und offene Blocker `F.05/F.19/F.27/F.30/F.31/R.01`.
- BT93G darf nur Root-Cause-Reparatur, Diagnose, vergleichbare Reparatur-Evaluation und Gate-Refresh leisten. Jeder nicht geschlossene Befund braucht Reproduktion, Artefaktpfad und Folgegate.

Ausfuehrungsentscheid fuer `/fix-planung`:

| Ziel | Entscheidung | Begruendung |
| --- | --- | --- |
| BT93G.1 starten | GO | Die Startlage ist eindeutig rot, die Root-Causes sind identifiziert, der neue Block ist eng genug geschnitten und hat keine Candidate-/Freeze-Rechte. |
| BT93G.2 bis BT93G.4 umsetzen | GO nach `93G.1` | Diese Phasen reparieren die fachlichen Startblocker und duerfen vor jedem Training laufen. |
| Short comparable repair train | GO nach `93G.1` bis `93G.4` | Nur sinnvoll, wenn Matrix, Terminal-/Death-Wiring, Pre-Sampling-Mask und Reward-Gates gruen sind. |
| Extended repair train bis 4h | bedingtes GO | Nur mit maschinenlesbarem Budget, Checkpoints, Lerntrend-/Safety-/Reward-Early-Stop und `maxStepsPerEpisode >= 128`/bevorzugt `180+`. |
| BT94A claimen | NO-GO | Erst erlaubt, wenn `BT93G.99=BT94A-ready` und `no_start_gate.json` voll gruen ist. |
| BT94A-Kandidatenlauf/Freeze/BT94B-Handover | NO-GO | Bleibt bis nach gruener BT93G-Startfreigabe und BT94A-Phasen verboten. |

Voraussetzungen vor laengerem Training:

| Voraussetzung | Pflicht vor 4h-Run | Blocker bei Fehlen |
| --- | --- | --- |
| Vergleichbare Matrix | `maxStepsPerEpisode >= 128`, bevorzugt `180+`, feste Seeds/Maps/Modi/Semantikfenster, DQN-Anker und Holdout-Regel | Ja |
| Pre-Sampling-Mask | `policyLevelMask.preSamplingApplied=true`, keine Clamp-/Veto-Umetikettierung | Ja |
| Terminal-/Death-Wiring | echte `done`/`truncated`/Reasons aus Player-/Kernel-State, nicht `EpisodeController.step({})` | Ja |
| Reward-Gate | positive Rewards bei Regression, `max-steps-only`, leerer Death-Matrix oder hoher Clamp-/Veto-Last blockieren | Ja |
| Training-Budget | `totalTimesteps`, Wallclock-Limit bis max. 4h, Checkpoint-Frequenz, Eval-Intervall und Timeout maschinenlesbar | Ja |
| Early-Stop | Stop bei Collapse, `runtimeErrorCount>0`, steigender Clamp-/Veto-Last, Reward-Hacking, Terminal-Matrix leer oder keiner Lerntrend | Ja |
| Artefakte | Modell, Optimizer, VecNormalize, Config, Hashes, Lernmetriken, Eval-/Holdout-Reports versioniert unter `data/training/ppo/bt93g/**` | Ja |

Startkriterien fuer `BT94A.1` nach BT93G:

- `bt94a_gate_check.py --write-report` schreibt `resultClass=claimable`, `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression` und `bt94aBlockerCount=0`.
- `candidateFreezeAllowed=false` bleibt bis `94A.3` unveraendert.
- `F.05`, `F.19`, `F.27`, `F.30`, `F.31` und `R.01` sind geschlossen oder mit neuer Evidence sauber als nicht-startblockierend downgated.
- Die neue Vergleichsmatrix ist DQN/PPO-kompatibel: gleiche Matrix-ID, Maps, Modi, Semantikfenster, Baseline-ID, DQN-Anker, Seeds, Holdout-Regeln, immutable Run-IDs und `maxStepsPerEpisode >= 128` bzw. begruendeter `180+`-Zielwert.
- Eval umfasst mindestens 6 abgeschlossene Episoden, Holdout mindestens 4; Median, Streuung, Survival-/Steps-Deltas, RewardBreakdown, Terminal-/Death-/Failure-Klassen, Runtime-Fehler und Action-Telemetrie sind im selben Paket sichtbar.
- `policyLevelMask.preSamplingApplied=true`; `postDecodeClampRate < 0.5` und `safetyVetoRate < 0.25` sind Mindestschwellen, Zielwert nahe `0`. Clamp/Veto darf nicht als Masking umgelabelt werden.
- Natural-Terminal-/Death-Matrix ist nicht leer oder BT93G endet `diagnose-blocked`; `max-steps-only` ist kein BT94A-Startsignal.
- Positiver Reward bei schlechterer Survival/Steps, hoher Clamp-/Veto-Last oder kuenstlicher Episode-Verkuerzung blockiert den Start.
- Ein neuer PPO-Modellstand muss nach den Root-Fixes trainiert sein. Ein nur geladenes BT93C/BT93F-Modell oder ein Minimal-Smoke darf `F.05`/`F.27` nicht schliessen.
- Evidence bleibt interne Startdiagnose; PPO-Validate, Runtime-Rollout, JS-Inference, Registry, Latenzbudget und Rollback bleiben `BT94B.3`, BT95 oder separatem Rollout-Block vorbehalten.

Vollstaendiges Befundregister fuer BT93G-Intake:

| ID | Status nach BT93F/User-Review | BT93G-Behandlung |
| --- | --- | --- |
| G.01 | still-blocking | BT94A-Gate-Report bleibt rot; in `93G.1` erneut pinnen |
| G.02 | still-blocking | Candidate-Run-Allowance bleibt rot; kein Kandidatenlauf in BT93G |
| G.03 | still-blocking | Matrix-Definition fuer BT94A bleibt rot; BT93G definiert nur Reparatur-/Diagnosematrix |
| G.04 | carried | Freeze-Allowance bleibt bis `94A.3` rot |
| G.05 | still-blocking | Handover-Result bleibt `diagnose`; Gate-Refresh in `93G.6` |
| G.06 | still-blocking | Handover-Gate bleibt geschlossen; nur BT93G-ready kann es oeffnen |
| G.07 | still-blocking | Precomparison bleibt `ppo-regression`; vergleichbare Matrix in `93G.1`/`93G.5` |
| G.08 | still-blocking | Audit-Blocker offen; alle F/R-Blocker muessen Status bekommen |
| C.01 | still-blocking | `bt93c_result_allows_bt94a` rot; in `93G.6` neu bewerten |
| C.02 | still-blocking | `handover_gate_ready` rot; in `93G.6` neu bewerten |
| C.03 | still-blocking | `precomparison_not_regression` rot; in `93G.5`/`93G.6` neu bewerten |
| C.04 | still-blocking | `no_open_bt94a_audit_blockers` rot; Register in `93G.1`/`93G.6` schliessen |
| F.01 | closed | Echter PPO-Learner vorhanden; als Quelle fortfuehren |
| F.02 | closed | Dependency Pins/Clean Env vorhanden; bei MaskablePPO-Pin neu pruefen |
| F.03 | closed | Action-Surface SB3-train/eval-kompatibel; durch Masking-Aenderung nicht regressieren |
| F.04 | closed | Model/Optimizer/VecNormalize/Heads real gespeichert; Hashes in BT93G weiterfuehren |
| F.05 | still-blocking / BT94A-blocker | Survival-First nicht belegt; vergleichbare Eval/Holdout in `93G.5` |
| F.06 | follow-gated | PPO-Validate bleibt `BT94B.3`; nicht in BT93G vorziehen |
| F.07 | follow-gated | Direkte 4-Env-Evidence bleibt Folgefrage; BT93G braucht nur comparable repair evidence |
| F.08 | closed | Throughput ist kein Lernbeweis; weiterhin nicht als Survival-Evidence verwenden |
| F.09 | closed | Freeze-Check bleibt gruen; Freshness bei Gate-Refresh kontrollieren |
| F.10 | closed | Stale Docs/untracked Hinweise bleiben bereinigt |
| F.11 | closed | `tmp/**` bleibt nicht closure-faehig |
| F.12 | closed | DQN Champion/Semantik/Holdout fixiert; Matrix-Sanity in `93G.1` nutzt diesen Anker |
| F.13 | follow-gated | Drei Runs allein statistisch schwach; BT94B-Regel bleibt bestehen |
| F.14 | follow-gated | Legacy `bot:validate` ist kein PPO-Validate |
| F.15 | follow-gated | Runtime-Handoff bleibt BT95/separat |
| F.16 | closed | Baseline-Begriff bleibt getrennt |
| F.17 | closed | Eval laedt echtes PPO-Modell; in BT93G nicht auf Scaffold zurueckfallen |
| F.18 | follow-gated | Runtime-/Failure-Klassen intern sichtbar; PPO-Validate-Mapping spaeter |
| F.19 | still-blocking / BT94A-blocker | Terminal-/Death-Diagnostik unzureichend; Natural-Terminal-Wiring in `93G.2` |
| F.20 | closed | Sanitizer/Mask/Veto-Raten werden gemessen; Schwellen in `93G.3` anwenden |
| F.21 | closed | Risk-Drift getragen; keine neue Drift ohne Gate |
| F.22 | closed | Plancheck bleibt kein PPO-Beweis |
| F.23 | closed | Self-count Evidence ersetzt; nicht wieder einfuehren |
| F.24 | follow-gated | Short smokes kein Langzeitbeweis; BT93G bleibt Reparatur, nicht Langzeitstabilitaet |
| F.25 | closed | Clean Env reproduziert Stack; bei Dependency-Aenderung neu belegen |
| F.26 | closed | Baseline-ID/Metrikquelle fixiert |
| F.27 | still-blocking / BT94A-blocker | DQN/PPO-Vergleich bleibt `ppo-regression`; comparable matrix/eval in `93G.5` |
| F.28 | follow-gated | Interne Eval-Survival ist kein PPO-Validate |
| F.29 | closed | Holdout verbraucht, keine Nachoptimierung; BT93G muss neue Holdout-Regel pinnen |
| F.30 | still-blocking / BT94A-blocker | Policy-Level-Mask fehlt; Pre-Sampling-Mask in `93G.3` |
| F.31 | still-blocking / BT94A-blocker | Natural-Terminal-/Death-Matrix schwach; `93G.2` und `93G.5` |
| F.32 | follow-gated | Kleine Runs haben schwache Aussagekraft; Mindestepisoden in `93G.5` |
| F.33 | closed | Immutable Run-IDs/Hashes statt `latest` |
| F.34 | closed | V101 erzeugt keinen PPO-Contract-Drift; bei Contract-Aenderung neu pruefen |
| F.35 | closed | Governance-Gates getrennt von PPO-Semantik |
| F.36 | follow-gated | Laengere Runs muessen Failure-Klassen fortfuehren |
| F.37 | follow-gated | PPO-Validate-Bauort bleibt `BT94B.3` |
| R.01 | still-blocking / BT94A-blocker | Reward steigt, Survival faellt; Reward-/Gate-Semantik in `93G.4` |

### Definition of Done (DoD)

- [ ] DoD.1 BT93G erzeugt ein versioniertes Start- und Root-Cause-Paket unter `data/training/ppo/bt93g/**` mit No-Start-Snapshot, Befundregister, erlaubten Dateien, verbotenen Workarounds und Artefakt-Hashes.
- [ ] DoD.2 Die Reparaturmatrix ist DQN/PPO-vergleichbar oder explizit als nicht vergleichbare Diagnose klassifiziert; kein 16-Step-Cap darf als Non-Regression gegen DQN-117-Step-Metriken gewertet werden.
- [ ] DoD.3 Natural-Terminal-/Death-/Truncation-Semantik ist aus Player-/Kernel-State in `EpisodeController.step(...)` zurueckgefuehrt und in Train/Eval/Holdout sichtbar.
- [ ] DoD.4 Policy-Level-Maskierung wird vor dem Sampling konsumiert oder BT93G endet mit hartem Folgeblocker; Post-Decode-Clamp/Veto zaehlen nicht als Masking.
- [ ] DoD.5 Reward-/Safety-/Episode-Shortening-Regeln blockieren positive Reward-Aussagen bei Survival-/Steps-Regression, hoher Clamp-/Veto-Last, `max-steps-only` oder leerer Death-Matrix.
- [ ] DoD.6 Erst nach DoD.2 bis DoD.5 laeuft eine gestufte PPO-Repair-Trainingsleiter auf der vergleichbaren Matrix; Minimal-Smoke allein reicht nicht. Ein Extended-Repair-Train bis maximal 4h ist erlaubt, wenn Budget, Checkpoints und Early-Stop-Regeln vor Laufstart versioniert sind. Eval mindestens 6 Episoden, Holdout mindestens 4, immutable Run-IDs, keine Nachoptimierung auf Holdout.
- [ ] DoD.7 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json`, `no_start_gate.json` und ein BT93G-Handoverpaket werden aus BT93G-Artefakten neu geschrieben.
- [ ] DoD.8 BT93G endet entweder `BT94A-ready` mit gruenem Gate oder `diagnose-blocked` mit Fehlerbericht/Folgegate; kein Kandidatenlauf, kein Freeze, kein Promote, kein BT94B-Handover.
- [ ] DoD.9 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind am Abschluss-Gate PASS.

### 93G.1 Startsanity und vergleichbare Matrix

- [x] 93G.1.1 `no_start_gate.json`, `repair_diagnostic_report.json`, `handover_package.json`, `followup_gate_report.json`, Action-/Terminal-/Reward-Reports und Config als BT93G-Starttruth unter `data/training/ppo/bt93g/start_truth.json` pinnen. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93g_start_sanity.py --write` -> `data\training\ppo\bt93g\start_truth.json` (`resultClass=start-sanity-pinned`, `bt94aStatus.claimable=false`, `priorMatrixClassification.bt93gClassification=diagnose-not-comparable`))
- [x] 93G.1.2 Eine Reparatur-/Eval-Matrix definieren, die nicht strukturell gegen den DQN-Anker verlieren muss: `maxStepsPerEpisode >= 128`, bevorzugt `180+`, oder explizite Klassifikation als reine Diagnose ohne DQN-Non-Regression. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93g_start_sanity.py --write` -> `data\training\ppo\bt93g\repair_matrix.json` (`matrixId=bt93g-comparable-repair-matrix-v1`, `maxStepsPerEpisode=180`, `evalEpisodesMin=6`, `holdoutEpisodesMin=4`))
- [x] 93G.1.3 Gate-/Report-Logik so schaerfen, dass ein 16-Step-Diagnoselauf nicht mehr als `ppo-regression`-Qualitaetsvergleich gegen DQN `avgStepsPerEpisode=117.525` missverstanden wird, sondern als `diagnose-not-comparable` oder hart blockierend. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93g_start_sanity.py --write` -> `data\training\ppo\bt93g\start_contract.json` (`gateLogic.maxStepsBelow128.classification=diagnose-not-comparable`, `dqnNonRegressionAllowed=false`))
- [x] 93G.1.4 Startvertrag schreiben: feste Seeds, Maps, Modi, Semantikfenster, DQN-Anker, Baseline-ID, Holdout-Regel, Mindestepisoden, Matrix-ID, erlaubte Run-Kinds, verbotene Evidence-Quellen und Closure-Pfade. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93g_start_sanity.py --write` -> `data\training\ppo\bt93g\start_contract.json` (`contractId=bt93g-start-contract-v1`, `forbiddenRunKinds` enthaelt `candidate`, `freeze`, `promote`, `BT94B-ready`))

### 93G.2 Natural-Terminal-, Death- und Truncation-Wiring

- [x] 93G.2.1 In `scripts/training-headless-lane-runner.mjs` Terminal-/Truncation-Zustand aus Player-/Kernel-State ableiten: `player.alive=false -> player-dead`, Kernel `round_end`/`match_end -> match-ended`, Cap/Timeout nur als Truncation. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93g_terminal_wiring_report.py --write` -> `data\training\ppo\bt93g\terminal_wiring_probe_report.json` (`phaseCoverage.93G.2.1=true`, Probes `bt93g-probe-player-dead`, `bt93g-probe-round-ended`, `bt93g-probe-match-ended`))
- [x] 93G.2.2 `EpisodeController.step({ done, terminalReason, truncated, truncatedReason })` mit echten Werten aufrufen; `EpisodeController.step({})` darf in der reparierten Lane nicht mehr der Default fuer Eval/Holdout sein. (abgeschlossen: 2026-04-25; evidence: `node --test tests/training-environment.contract.test.mjs` -> PASS 6 (`Headless lane derives episode terminal semantics from player and kernel state`))
- [x] 93G.2.3 Kontrollierte Probes fuer `player-dead`, `match-ended` und `max-steps` bauen/aktualisieren; Probes belegen Semantik, zaehlen aber nicht als Survival-Qualitaet oder Promotion. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93g_terminal_wiring_report.py --write` -> `data\training\ppo\bt93g\terminal_wiring_probe_report.json` (`phaseCoverage.93G.2.3=true`, `countsAsQualityEvidence=false`, `countsAsPromotionEvidence=false`))
- [x] 93G.2.4 Train-, Eval- und Holdout-Reports muessen `terminalReasonCounts`, `truncatedReasonCounts`, `deathCauseCounts`, `naturalTerminal`, `maxSteps`, Crash/Timeout/Forced-Round und `runtimeErrorCount` einheitlich schreiben. (abgeschlossen: 2026-04-25; evidence: `python\.venv\Scripts\python.exe python\scripts\bt93g_terminal_wiring_report.py --write` -> `data\training\ppo\bt93g\terminal_wiring_probe_report.json` (`phaseCoverage.93G.2.4=true`, `reportingContract.requiredFields` enthaelt Terminal-/Truncation-/Death-/Runtime-Felder))

### 93G.3 Pre-Sampling Policy-Level-Mask

- [ ] 93G.3.1 Technischen Pfad entscheiden und pinnen: kleineres maskierbares semantisches Action-Vocabulary oder `sb3-contrib`/`MaskablePPO` mit reproduzierbarem Dependency-Lock und Clean-Env-Smoke.
- [ ] 93G.3.2 Mask-Quelle aus dem JS-autoritativen Transition-Payload (`info.match.inventoryLength` oder gleichwertig) vor Policy-Sampling konsumieren; `policyLevelMask.preSamplingApplied=true` muss im Report stehen.
- [ ] 93G.3.3 Post-Decode-Clamp, Safety-Veto, Sanitizer, Invalid-Action und No-Op/Fallback weiter getrennt reporten; kein Relabeling von Clamp/Veto als Policy-Mask.
- [ ] 93G.3.4 Schwellen als Startgate anwenden: `postDecodeClampRate < 0.5`, `safetyVetoRate < 0.25`, Ziel nahe `0`; Ueberschreitung bleibt BT94A-Blocker.

### 93G.4 Reward- und Diagnose-Semantik

- [ ] 93G.4.1 RewardBreakdown, Survival/Steps, Episode-Shortening, Safety-Overrules, Clamp-/Veto-Last und Terminal-/Death-Matrix gemeinsam bewerten.
- [ ] 93G.4.2 Positive Reward-Aussagen bei DQN-Regression, kuenstlichem Cap, `max-steps-only`, leerer Death-Matrix oder hoher Clamp-/Veto-Last muessen `R.01` blockierend halten.
- [ ] 93G.4.3 Reward-/Gate-Reports muessen sichtbar unterscheiden: echte Survival-Verbesserung, kuenstlich verlaengerte Max-Step-Episode, Timeout/Truncation und natuerliches Terminal.
- [ ] 93G.4.4 Safety-Veto, Clamp und Episode-Shortening werden negativ oder blockierend in die Diagnose aufgenommen; kein Reward-Mean allein oeffnet BT94A.

### 93G.5 Vergleichbarer Repair-Learner, Eval und Holdout

- [ ] 93G.5.1 Erst nach `93G.1` bis `93G.4` eine Trainingsleiter starten: technischer Smoke nur zur Laufpruefung, danach ein Short comparable repair train und mindestens ein Extended repair train auf derselben Matrix; Run-Kind bleibt `comparable-repair`, nicht `candidate`, nicht `freeze`, nicht `promote`.
- [ ] 93G.5.2 Das Extended-Repair-Budget vor Laufstart maschinenlesbar festlegen: `maxStepsPerEpisode >= 128`/bevorzugt `180+`, `nStepsPerEnv`, `batchSize`, `nEpochs`, `totalTimesteps`, Wallclock-Limit bis maximal 4h, Timeout-Budget, Checkpoint-Frequenz, Eval-Intervall, Early-Stop-Regeln und Abbruch bei Collapse/Safety-/Reward-Regression.
- [ ] 93G.5.3 Der Extended-Repair-Lauf muss ein neues PPO-Modellpaket schreiben: Modell, Optimizer-State, VecNormalize, Config, Modell-/Config-/Optimizer-/Normalize-Hashes, Lernmetriken (`approx_kl`, Entropy, Clip-Fraction, Value-Loss, Grad-Norm/Explained-Variance soweit verfuegbar) und Action-/Reward-/Terminal-Telemetrie.
- [ ] 93G.5.4 Eval und Holdout auf derselben festen Matrix ausfuehren: gleiche Seeds/Maps/Modi/Semantik, immutable Run-IDs, Modell-/Config-/Optimizer-/VecNormalize-Hashes und keine Matrix- oder Reward-Drift.
- [ ] 93G.5.5 Mindeststatistik erreichen oder ehrlich blockieren: Eval mindestens 6 abgeschlossene Episoden, Holdout mindestens 4, inklusive Median, Streuung, Survival-/Steps-Deltas, Natural-Terminal-/Death-Matrix, RewardBreakdown und Action-Telemetrie.
- [ ] 93G.5.6 Ergebnisregeln hart anwenden: `ppo-regression`, fehlender Lerntrend im Extended-Repair-Lauf, Reward-Hacking, leere Terminal-/Death-Matrix, fehlendes Pre-Sampling-Masking, hohe Clamp-/Veto-Last oder `runtimeErrorCount>0` halten BT94A geschlossen.

### 93G.6 Gate-Refresh und Handover-Entscheidung

- [ ] 93G.6.1 `precomparison_report.json`, `handover_report.json`, `evidence_quality_matrix.json` und `no_start_gate.json` aus BT93G-Artefakten neu schreiben; `latest_*` bleibt nur Zusatzspur.
- [ ] 93G.6.2 `bt94a_gate_check.py --write-report` erneut ausfuehren und unverfaelscht pinnen: Claim nur bei `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression`, `bt94aBlockerCount=0`.
- [ ] 93G.6.3 Wenn das Gate rot bleibt, BT93G mit `diagnose-blocked` plus Fehlerbericht/Folgegate schliessen; keine `94A.*`-Checkbox, kein Kandidatenlauf, kein Freeze, kein BT94B-Handover.
- [ ] 93G.6.4 Wenn das Gate gruen ist, BT93G als `BT94A-ready` schliessen; `candidateFreezeAllowed=false` bleibt bis `94A.3`, PPO-Validate bleibt `BT94B.3`, Rollout bleibt BT95/separater Block.

### 93G.99 Abschluss-Gate

- [ ] 93G.99.1 Alle Phasen `93G.1` bis `93G.6` sind mit Evidence dokumentiert; jedes `[x]` enthaelt Datum, Command und Artefakt/Resultat.
- [ ] 93G.99.2 Alle Befunde G.01-G.08, C.01-C.04, F.01-F.37 und R.01 haben einen aktuellen Status und ein Folgegate; offene F.05/F.19/F.27/F.30/F.31/R.01 blockieren BT94A.
- [ ] 93G.99.3 BT94A ist nur startfaehig, wenn `no_start_gate.json` `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression` und `bt94aBlockerCount=0` schreibt.
- [ ] 93G.99.4 Kein Ergebnis heisst `promote`, `rollout-ready`, `freeze-candidate` oder `BT94B-ready`; diese Begriffe bleiben BT94A/BT94B/BT95 vorbehalten.
- [ ] 93G.99.5 `plan:check` und Doku-/Build-Gates sind Governance-Evidence, aber kein Survival-, Validate- oder Promotionsbeweis.

### Risiko-Register BT93G

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| 16-Step-Diagnose wird erneut gegen DQN-117-Step-Metriken als Qualitaetsvergleich gewertet | kritisch | QA/Governance | Matrix-Sanity-Gate und `diagnose-not-comparable`-Klassifikation | `maxStepsPerEpisode < 128` und trotzdem Non-Regression-Claim |
| Masking wird nur umbenannt, aber nicht vor Sampling angewendet | kritisch | RL | MaskablePPO/semantisches Vocabulary plus Telemetrie `preSamplingApplied=true` | Clamp-/Veto-Rate sinkt nicht oder Mask-Consumer fehlt |
| Terminal-/Death-Wiring bleibt probe-only | hoch | QA/Ops | Probes plus echte Eval-/Holdout-Matrix verlangen | Probes gruen, aber Eval/Holdout weiter `max-steps-only` |
| Reward-Hacking oeffnet Gate trotz Survival-Regression | kritisch | RL/QA | Reward, Survival, Episode-Length und Safety gemeinsam blockierend werten | Reward steigt, Steps/Survival fallen |
| Reparatur wird zu gross und vermischt Ursachen | hoch | Governance/RL | 93G.1 bis 93G.4 sequenziell, Learner erst in 93G.5 | Mask, Reward, Matrix und Terminal werden in einem Lauf geaendert |
| Holdout wird nachoptimiert | hoch | QA | Holdout-Regel und immutable Run-IDs pinnen | Nach Holdout wird derselbe Kandidat weiter getunt |
| 4h-Lauf verbrennt Zeit ohne Lernsignal | hoch | RL/QA | Langer Lauf erst nach Root-Fixes; Checkpoints, Zwischen-Eval und Early-Stop erzwingen | Kein Lerntrend, leere Terminal-Matrix, hohe Clamp-/Veto-Last oder Reward-Hacking nach Zwischencheck |
| PPO-Validate oder Runtime-Rollout werden vorgezogen | kritisch | Architektur/Ops | BT93G bleibt Startreparatur; Validate erst BT94B.3, Rollout erst BT95/separater Block | JS-Inference, Registry, Rollback oder Strategieflag wird vorbereitet |

---

## Block BT94A: Candidate Freeze und Ablationen

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT103_Hyperparameter_Curriculum_Candidate_Freeze.md`

<!-- LOCK: frei -->

Scope:

- Kleine Ablationsmatrix, Curriculum-Hardening und Candidate Freeze auf Basis eines echten `BT93C`-PPO-Modellpakets.
- Freeze und Evidence-Sammeln bleiben bewusst vor externer A/B-Urteilsfindung getrennt.
- Jede Ablation prueft genau eine Hypothese; offene Learner-, Action-, Reward- oder Holdout-Restpunkte aus `BT93C` blockieren den Start.
- Ablationen laufen in kleinen Batches: maximal zwei neue Kandidatenlaeufe pro Claim, danach Entscheidung `continue`, `hold` oder `diagnose`.

Claim-Grenze vor BT94A:

- `BT94A` ist nur claimbar, wenn `BT93G.99` `BT94A-ready` liefert und `data/training/ppo/bt94a/no_start_gate.json` nach erneutem Gate-Check `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `bt94aHandover.ready=true`, `precomparison != ppo-regression` und `summary.bt94a-blocker=0` bzw. `bt93cState.bt94aBlockerCount=0` schreibt.
- `BT93D.99=diagnose-blocked`, `BT93E.99=diagnose-blocked` und `BT93F.99=diagnose-blocked` sind keine Startsignale mehr, sondern der Grund fuer den vorgeschalteten Reparaturblock `BT93G`.
- `BT94A` ist nur claimbar, wenn `BT93C` ein echtes Baseline-Paket unter `data/training/ppo/**`, ein echtes PPO-Modell, Normalize-/Optimizer-State, Lernmetriken und eine feste Vergleichs-/Holdout-Matrix geliefert hat.
- Wenn `BT93C` mit `diagnose`, `throughput insufficient`, Action-Surface-Blocker oder Reward-/Safety-Unklarheit endet, bleibt `BT94A` geschlossen.
- Wenn der BT93C-/BT93D-/BT93E-/BT93F-/BT93G-Vorvergleich BT73-Intent-/Recovery-Restschuld, fehlende PPO-Validate-Lane, V101-Drift oder JS-Integration-Luecken ausweist, muss BT94A diese Punkte im Freeze-Report sichtbar weiterfuehren.
- Wenn `BT93G.99` offene Audit-Befunde ohne Folgegate enthaelt, startet BT94A nicht; offene Restschuld muss blockierend oder nicht-blockierend begruendet sein.

Startstatus 2026-04-25:

- `BT94A` bleibt vor `94A.1` geschlossen. (evidence: `python\.venv\Scripts\python.exe python\scripts\bt94a_gate_check.py --write-report` -> `data/training/ppo/bt94a/no_start_gate.json` (`resultClass=blocked-no-start`, `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `precomparison=ppo-regression`, `bt94aBlockerCount=5`, Blocker `F.05/F.19/F.27/F.30/F.31`))
- Naechster erlaubter Trainingsclaim vor BT94A ist `BT93G.1`; keine `94A.*`-Checkbox wird geschlossen, solange die Claim-Grenze rot ist; keine Kandidatenlaeufe, kein Freeze-Kandidat und kein BT94B-Handover.

### Definition of Done (DoD)

- [ ] DoD.1 Eine kleine Ablations- und Curriculum-Matrix ist gegen dieselbe echte PPO-Baseline reproduzierbar ausgewertet.
- [ ] DoD.2 Jede Ablation hat genau eine Hypothese, feste Parameterbereiche, Early-Stop-Regeln und dieselbe Train-/Eval-/Holdout-Matrix.
- [ ] DoD.3 Reward-, Safety-, Sanitizer-, Mask-, Veto- und Holdout-Telemetrie bleiben in jedem Kandidatenlauf vergleichbar.
- [ ] DoD.4 Genau ein Freeze-Kandidat unter `data/training/ppo/candidates/**` ist mit Modell, Normalize-/Optimizer-State, Manifest, Reports, Modellhash, Confighash, Lane-Budget und Vergleichsmatrix dokumentiert.
- [ ] DoD.5 Wenn kein klarer Sieger existiert, endet BT94A mit `hold` und oeffnet BT94B nicht.
- [ ] DoD.6 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.
- [ ] DoD.7 Der Freeze-Report benennt explizit alle offenen Restschulden aus BT73, PPO-Validate, V101-Folgecheck, JS-Inference, Latenzbudget, Registry und Rollback.
- [ ] DoD.8 Der Freeze-Report bestaetigt, dass kein Scaffold-, Pilot-only-, `tmp`-Only-, Self-Count- oder stale-doc-Befund als Kandidaten-Evidence verwendet wurde.

### 94A.1 Ablationsmatrix und Entscheidungsregeln

- [ ] 94A.1.1 5 bis 7 gezielte Laeufe mit klarer Champion-/Challenger-Logik gegen BT93C-Baseline definieren.
- [ ] 94A.1.2 Parameterbereiche fuer `learning_rate`, `n_steps`, `batch_size`, `n_epochs`, `gamma`, `gae_lambda`, `clip_range`, `ent_coef`, `vf_coef`, `max_grad_norm`, `net_arch` und Masking-/Normalization-Modus festlegen.
- [ ] 94A.1.3 Abbruchkriterien dokumentieren (BT93C driftet, KL/Entropy/Grad-Norm kippt, Sanitizer-/Veto-Rate steigt, Reward steigt bei schlechterer Survival).
- [ ] 94A.1.4 Batch-Regel festlegen: maximal zwei Kandidatenlaeufe pro Claim, keine Matrix-Erweiterung waehrend laufender Auswertung.
- [ ] 94A.1.5 Vor dem ersten Kandidatenlauf pruefen, ob Baseline-ID, DQN-Champion, Holdout, Semantikfenster, Dependency-Lock, Modellhash und V101-Folgecheck unveraendert bzw. abgeschlossen sind.

### 94A.2 Curriculum-, Reward- und Telemetry-Paritaet

- [ ] 94A.2.1 Relevante Felder (Observation Schema, Reward Breakdown, Hybrid Decision, terminal/truncated/death classes, Sanitizer-/Mask-/Veto-Raten) abgleichen.
- [ ] 94A.2.2 Bekannte semantische Luecken oder Unterschiede zur DQN-Referenz und zum BT93C-Holdout offenlegen.
- [ ] 94A.2.3 BT73-Intent-/Recovery-Restschuld, fehlende PPO-Validate-Lane und V101-Folgecheck im Freeze-Kontext ausdruecklich markieren.

### 94A.3 Kandidatenlaeufe und Freeze

- [ ] 94A.3.1 Priorisierte Ablationen ausfuehren und Sieger gegen BT93C anhand Eval, Holdout, Lernmetriken und Safety-/Reward-Diagnostik ermitteln.
- [ ] 94A.3.2 Genau einen belastbaren Kandidaten als Artefaktpaket (Modell, Normalize-/Optimizer-State, Manifest, Report, Lane-Budget, Hashes) unter `data/training/ppo/candidates/` einfrieren.
- [ ] 94A.3.3 Kandidat verliert sofort Freeze-Faehigkeit, wenn Eval nur Scaffold laedt, Holdout regressiert, `runtimeErrorCount`/Failure-Klassen steigen oder Sanitizer-/Veto-Raten Policy-Fehler verdecken.

### 94A.4 Reproduzierbarkeit und BT94B-Handover

- [ ] 94A.4.1 Pruefen, ob Freeze-Paket und Vergleichsmatrix sauber fuer die externe A/B-Evidence aufbereitet sind.
- [ ] 94A.4.2 Abschlussreport schreiben; bei fehlendem Sieger, unechter Modell-Evidence oder Holdout-Regression endet BT94A ehrlich mit `hold` statt stiller Weitergabe.
- [ ] 94A.4.3 Handover fuer `BT94B.3` enthaelt PPO-Validate-Anforderungen: Kandidat, Modellhash, Normalize-State, Config, Matrix-ID, Runner-/Command-Entwurf und Zielpfade.

### 94A.99 Abschluss-Gate

- [ ] 94A.99.1 Alle Phasen 94A.1 bis 94A.4 sind mit Evidence dokumentiert.
- [ ] 94A.99.2 Ein echter Freeze-Kandidat liegt vor, oder BT94A stoppt die Kette explizit; BT94B darf nur bei Freeze-Kandidat starten.
- [ ] 94A.99.3 Alle weitergereichten Audit-Restpunkte haben ein Folgegate in BT94B, BT95 oder dem separaten Rollout-Intake; keine Restschuld wird still ignoriert.

### Risiko-Register BT94A

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Semantikdrift invalidiert Vergleich und Freeze | hoch | Planung + Runtime | Benchmark-Invalidierung explizit im Block fuehren | Gameplay-, Observation-, Action- oder Reward-Vertrag aendert sich |
| Ablationen optimieren Proxy-Metriken statt Survival | hoch | RL/QA | Eval, Holdout, RewardBreakdown und Survival gemeinsam werten | Reward oder Steps steigen, Survival faellt |
| Zu breite Matrix erzeugt Forschungsdrift | hoch | Governance | 5 bis 7 Laeufe, eine Hypothese je Lauf, harte Abbruchkriterien | neue Parameterideen werden waehrend laufender Ablation ergaenzt |
| Kein echter Freeze trotz vielen Laeufen | hoch | Governance | `hold` als gueltiges Blockende, BT94B bleibt geschlossen | Ergebnisse sind gemischt oder nicht reproduzierbar |
| Kandidat verliert auf Holdout | hoch | QA/RL | Holdout als Freeze-Kriterium fuehren | Eval gewinnt, Holdout oder DQN-Matrix regressiert |
| Zu grosse Ablationsclaims verwischen Ursachen | hoch | Governance/RL | maximal zwei Kandidatenlaeufe pro Claim, danach harte Auswertung | mehrere Parameter und Seeds werden in einem Claim gemischt |
| PPO-Validate wird erst nach Freeze bemerkt | hoch | QA/Ops | Validate-Anforderungen schon im Freeze-Handover benennen | Kandidat ist eingefroren, aber kein Runner/Schema kann ihn validieren |

---

## Block BT94B: Externe A/B-Evidence und Urteilsdisziplin

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT104_AB_Validation_Promotion.md`

<!-- LOCK: frei -->

Scope:

- Externe A/B-Evidence gegen den eingefrorenen DQN-Champion mit klarer Urteilssystematik.
- Promotion-Entscheidung nur ueber Lane-, Median- und Semantikfenster-Regeln vorbereiten.
- `promote` braucht mindestens drei gueltige Paesse plus definierte Episodenzahl, Median-Delta, Streuung, Holdout-Lage und keine schlechtere Stability-/Invalid-Action-Lage; drei Runs allein reichen nicht als starkes Urteil.
- Ohne gruene PPO-Validate-Lane aus `94B.3` ist das beste moegliche Ergebnis ein externer Kandidat, kein operatives Rollout-Signal.
- `averageBotSurvival +30%`, `avgStepsPerEpisode +30%` bzw. Non-Inferiority-Regeln und `runtimeErrorCount=0` muessen vor Ausfuehrung als Urteilskriterien fixiert sein; nachtraegliches Umdeuten ist unzulaessig.

Claim-Grenze vor BT94B:

- `BT94B` ist nur claimbar, wenn `BT94A` einen echten Freeze-Kandidaten, Modell-/Normalize-/Optimizer-Artefakte, Hashes und die Baseline-/Holdout-Lane geliefert hat.
- Wenn `BT94A` mit `hold` endet oder Kandidatenwahl/Matrix noch offen ist, bleibt `BT94B` geschlossen.

### Definition of Done (DoD)

- [ ] DoD.1 Externe A/B-Evidence gegen den eingefrorenen DQN-Champion liefert ein klares Urteil (`promote`, `hold`, `rollback` oder `diagnose`).
- [ ] DoD.2 Mindestens drei vollstaendige Kandidatenlaeufe derselben Lane und desselben Semantikfensters bilden die Mindestbasis statt eines Einzelruns; Episodenzahl, Streuung und Holdout entscheiden mit.
- [ ] DoD.3 Jeder gueltige Pass definiert Episodenzahl, Seeds, Modi, Maps, Holdout-Anteil, Invalidierungsregeln und Artefakt-/Modellhashes.
- [ ] DoD.4 `promote` ist nur zulaessig, wenn PPO den Median von `averageBotSurvival` gegen die gepinnte Baseline mindestens um das definierte Ziel verbessert, `avgStepsPerEpisode` mindestens die definierte Ziel-/Non-Inferiority-Regel erfuellt, Holdout nicht regressiert und `runtimeErrorCount=0`, `invalidActionRate`, Sanitizer-/Veto-Rate, Crash-/Timeout-/Forced-Round-Klassen nicht schlechter sind.
- [ ] DoD.5 Ohne gruene PPO-Validate-Evidence aus `94B.3` darf `promote` hoechstens als externer Kandidat markiert werden; ein Rollout-Intake bleibt blockiert.
- [ ] DoD.6 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.

### 94B.1 Vergleichsartefakte einfrieren

- [ ] 94B.1.1 DQN-Champion, PPO-Freeze-Kandidat und das Vergleichsmanifest fixieren.
- [ ] 94B.1.2 Urteilskriterien, Episodenzahl, Mindestdelta, Non-Inferiority-Schwelle, Holdout-Regel und Primaer-/Sekundaermetriken unveraenderlich festschreiben.
- [ ] 94B.1.3 Semantikfenster und bekannte Restschuld markieren: BT73-Intent-/Recovery, PPO-Validate-Bau, V101-Folgecheck, JS-Inference, Latenzbudget, Rollback und Registry.

### 94B.2 Externe A/B-Lane ausfuehren

- [ ] 94B.2.1 Mindestens 3 vollstaendige Kandidatenlaeufe auf derselben festen Matrix auswerten (medianbasiert, mit Episodenzahl, Streuung und Holdout).
- [ ] 94B.2.2 Invalidierte Paesse separat dokumentieren und nicht still in den Median mischen; Ersatzlauf nur mit derselben Matrix.
- [ ] 94B.2.3 Jeder Pass schreibt ein Urteilspaket mit Survival-Deltas, Steps-Deltas, `runtimeErrorCount`, Failure-Klassen, Sanitizer-/Veto-/Invalid-Raten, Modellhash und Matrix-ID.

### 94B.3 PPO-spezifische Validate-Lane

- [ ] 94B.3.1 PPO-Validate-Bauort und Command festlegen: Kandidat/Modellhash, Normalize-State, Config, Matrix-ID, Seeds, Modi, Maps und Semantikfenster muessen aus dem BT94A-Freeze-Paket kommen.
- [ ] 94B.3.2 PPO-Validate-Report-Schema und versionierte Zielpfade definieren; `tmp/**` zaehlt nur als Zusatzspur, nicht als Closure-Evidence.
- [ ] 94B.3.3 Mindestens eine PPO-spezifische Validate-Gegenprobe gegen den Freeze-Kandidaten laufen lassen oder ehrlich `ppo-validate-missing`/`ppo-validate-blocked` dokumentieren.
- [ ] 94B.3.4 `averageBotSurvival`, `runtimeErrorCount`, Crash/Timeout/Forced-Round, Natural-Terminal-/Death-Klassen, Sanitizer-/Veto-/Invalid-Raten und Modell-/Confighashes im PPO-Validate-Report ausweisen.
- [ ] 94B.3.5 BT80C `80.9.3` darf als historischer Kontext referenziert werden, ersetzt aber keine PPO-Validate-Evidence und blockiert nicht stellvertretend den PPO-Bau.

### 94B.4 Promotions-Evidence-Paket und Handover

- [ ] 94B.4.1 Endurteil in die Klassen `promote`, `hold`, `rollback` oder `diagnose` einordnen.
- [ ] 94B.4.2 Ergebnis ist verdict-sensitiv: nur `promote` mit gruener PPO-Validate-Evidence oeffnet BT95 als echten Handoff; sonst bleibt es `hold`/`diagnose`/`external-candidate` mit Restblocker.

### 94B.99 Abschluss-Gate

- [ ] 94B.99.1 Alle Phasen 94B.1 bis 94B.4 sind mit Evidence dokumentiert.
- [ ] 94B.99.2 Ein klares externes Urteil liegt vor, basierend auf gueltigen Runs, Median-/Holdout-Regeln, Stability-Metriken und PPO-Validate-Evidence; `promote` ohne PPO-Validate oeffnet keinen Rollout-Intake.
- [ ] 94B.99.3 `plan:check` oder andere Doku-Gates zaehlen nur als Governance-Evidence; das externe Urteil beruht auf Laufartefakten.

### Risiko-Register BT94B

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Einzelrun-Glueck wird als Promotion fehlgelesen | hoch | QA/Ops | Drei-Run-Regel, Median-Delta und feste Lane verlangen | Kandidat gewinnt nur einmal oder nur knapp |
| Drei Runs sind statistisch zu duenn fuer ein starkes Urteil | hoch | QA/RL | Episodenzahl, Streuung, Holdout und Mindestdelta ergaenzen | Median ist positiv, aber Varianz hoch |
| Holdout widerspricht Eval-Matrix | hoch | QA/RL | Holdout als Promotionskriterium fuehren | PPO gewinnt Eval, verliert Holdout |
| Stability regressiert trotz Survival-Gewinn | hoch | QA/Ops | Invalid-, Sanitizer-, Veto-, Crash-, Timeout- und Forced-Round-Klassen als harte Sekundaermetriken | `averageBotSurvival` steigt, Instabilitaet auch |
| Fehlende PPO-Validate-Lane wird im PPO-Hype uebersehen | hoch | Governance | `94B.3` als harte Validate-Lane fuehren; kein Rollout-Intake ohne gruene PPO-Validate-Evidence | positive PPO-Evidence wird als fast fertiger Rollout gelesen |
| BT80C-Altblocker wird faelschlich als PPO-Blocker weitergeschleppt | mittel | Planung/QA | BT80C nur als Kontext dokumentieren; PPO baut eigene Validate-Evidence | A/B-Urteil bleibt wegen fremder Alt-Lane stehen, obwohl PPO-Validate separat gebaut werden muss |

---

## Block BT95: Integrations-Handoff und Rollout-Intake-Vorbereitung

Quelle: `docs/plaene/neu/BT90_GoldStandard/bloecke/BT105_Integrations_Handoff_DQN_Sunset.md`

<!-- LOCK: frei -->

Scope:

- Externe PPO-Evidence nur bei `BT94B=promote` plus gruener PPO-Validate-Evidence in ein layer-sicheres Integrationspaket fuer einen spaeteren Rollout-Intake uebersetzen.
- Keine automatische DQN-Ablosung; produktive Umschaltung bleibt separater, user-entschiedener Folgepfad.
- Restblocker zu PPO-Validate, Inference-/Export-Pfad, Modellregistry, Feature-Flag, Rollback, Latenzbudget und Runtime-Guardrails explizit dokumentieren.
- BT95 implementiert diese Runtime-Komponenten nicht; es erstellt nur die Intake-Checkliste fuer den separaten operativen Rollout-Block.
- Selbst bei positiver PPO-Evidence bleibt `rollout-ready` verboten, solange JS-Inference, Export-/Load-Vertrag, Registry, Latenzbudget, Rollback und PPO-Validate nicht in einem separaten operativen Rollout-Block bewiesen sind.

Blocktyp:

- BT95 ist ein Handoff-/Intake-Vorbereitungsblock, kein normaler Implementierungsblock.

Claim- und No-Go-Regel:

- `BT95` wird nur als echter Handoff-Block relevant, wenn `BT94B` mit `promote` endet; ohne dieses Urteil dokumentiert der Block hoechstens, warum kein aktiver Rollout-Intake geoeffnet wird.
- Wenn `BT94B=promote` ohne gruene PPO-Validate-Evidence endet, dokumentiert `BT95` nur einen blockierten Handoff; ein Rollout-Intake bleibt geschlossen.
- Auch bei `promote` bleibt `BT95` Doc-, Guardrail- und Entscheidungsarbeit; produktive Runtime-, Matchstart- oder AI-Hub-Dateien werden hier nicht vorbereitet oder umgeschaltet.
- BT80C `80.9.3` bleibt nur als historischer Alt-/Produktionskontext sichtbar; fuer PPO-Handoff zaehlt ausschliesslich die eigene PPO-Validate-Lane aus `94B.3`.

Rollout-Intake-Pflichtpaket:

| Komponente | Pflichtnachweis vor operativer PPO-Aktivierung |
| --- | --- |
| Export-/Load-Vertrag | Modellformat, Normalize-State, Actor/Critic-Head-Spec, Config und Hashes lassen sich deterministisch laden. |
| JS-Inference-Adapter | Runtime kann PPO-Aktion ohne Python-Trainingsharness konsumieren; keine neue Matchstart-Abkuerzung. |
| Latenzbudget | Forward-Pass, Warmup, Timeout, Fallback und Max-Tick-Budget sind gemessen und gate-faehig. |
| Strategieflag | Umschaltung laeuft ueber `BOT_STRATEGY=dqn|ppo` oder gleichwertige kontrollierte Konfiguration. |
| Modellregistry | Registry-ID koppelt Modellhash, Confighash, Normalize-State, Semantikfenster, DQN-Champion und Rollback-Ziel. |
| Rollback | Rueckfall auf DQN-Champion ist getestet bei Ladefehler, Latenzueberschreitung, Holdout-Regression und PPO-Validate-Regression. |
| PPO-Validate | Eigene PPO-Lane aus `94B.3` laedt den Freeze-Kandidaten deterministisch und liefert gueltige Survival-/Failure-/Runtime-Metriken statt Legacy- oder `tmp`-Only-Signale. |

### Definition of Done (DoD)

- [ ] DoD.1 Integrations-Handoff, Rollback-Leiter und Guardrails fuer einen spaeteren Rollout-Intake sind als doc-only Paket dokumentiert.
- [ ] DoD.2 Produktive Runtime-, Matchstart- und AI-Hub-Surfaces bleiben bis zu einem separaten Rollout-Block read-only.
- [ ] DoD.3 Ein positiver PPO-Kandidat wird nicht als automatische DQN-Ablosung dargestellt; manuelle Entscheidung und Rollback bleiben Pflicht.
- [ ] DoD.4 Offene Restblocker aus PPO-Validate, V101-Folgecheck, Export/Load, Registry, Rollback und Latenzbudget sind sichtbar dokumentiert.
- [ ] DoD.5 Ein aktiver Rollout-Intake oeffnet nicht ohne `BT94B=promote`, gruene PPO-Validate-Evidence und expliziten User-Entscheid.
- [ ] DoD.6 Zukuenftige Rollout-Voraussetzungen sind vollstaendig benannt: Runtime-Strategieflag (`BOT_STRATEGY=dqn|ppo` oder gleichwertig), Inference-/Export-Pfad, Latenzbudget, Rollback-Test, Modellregistry/Versionierung, DQN-Champion-Retention und DQN-Sunset-Kriterien.
- [ ] DoD.7 `npm run plan:check`, `npm run docs:sync`, `npm run docs:check` und `npm run build` sind PASS.
- [ ] DoD.8 BT95 endet entweder als `handoff-blocked`, `no-intake-record` oder doc-only `rollout-intake-ready`; operative Aktivierung bleibt ausserhalb dieses Plans.

### 95.1 Spaeteren Integrationsscope zuschneiden

- [ ] 95.1.1 Moegliche Touchpoints (`ObservationBridgePolicy.js`, `RuntimeConfig.js`, Inference-Adapter, Export-/Load-Pfad, Modellregistry, Strategieflag, Validation-Runner) fuer einen spaeteren Rollout-Intake benennen.
- [ ] 95.1.2 No-Touch-Ausnahmen explizit als Grenze festhalten. Ohne Runtime-Eingriff in BT95!
- [ ] 95.1.3 Export-/Load-Vertrag fuer PPO-Artefakte als Intake-Pflicht dokumentieren: Modell, Normalize-State, Actor/Critic-Heads, Config, Hashes und Semantikfenster.

### 95.2 Rollout-, Rollback- und Sunset-Regeln

- [ ] 95.2.1 Rollout-Reihenfolge, `BOT_STRATEGY=dqn|ppo`-Strategieflag, DQN-Champion-Retention und DQN-Sunset-Kriterien dokumentieren.
- [ ] 95.2.2 Rollback-Pfade bei Instabilitaet, Modellladefehlern, Latenzueberschreitung, Holdout-Regression und PPO-Validate-Regression definieren und Architektur-Docs synchronisieren.
- [ ] 95.2.3 PPO-Latenzbudget als separaten Runtime-Test definieren: Forward-Pass, Warmup, Timeout, Fallback und Max-Tick-Budget; Trainings-Step-Latenz zaehlt nicht.
- [ ] 95.2.4 Modellregistry-Regel definieren: Registry-ID koppelt Modellhash, Confighash, Normalize-State, Semantikfenster, DQN-Champion-Retention und Rollback-Ziel.

### 95.3 Folgebacklog separieren

- [ ] 95.3.1 Self-Play, frozen Opponent-Pools, Gegner-Pool-Versionierung und weitere Folgeforschung explizit in den Backlog ausgliedern.
- [ ] 95.3.2 Kernpfad von Forschungsnebenpfaden freihalten.

### 95.4 Intake-Handoff vorbereiten

- [ ] 95.4.1 BT90- bis BT94B-Ergebnisse fuer den moeglichen Intake-Block vorbereiten; bei fehlendem `BT94B=promote` bleibt das Ergebnis ein No-Intake-Record.
- [ ] 95.4.2 Offene PPO-Validate-Luecken, fehlenden Rollback-Test, fehlendes Latenzbudget und den finalen User-Entscheid als harte Restblocker fuer den Start des operativen Rollout-Blocks ausweisen.
- [ ] 95.4.3 Bei `BT94B=promote` ohne PPO-Validate, JS-Inference, Registry oder Rollback entsteht nur `external-candidate`, kein `rollout-ready`.
- [ ] 95.4.4 Alle Audit-Restpunkte aus F.01-F.37, die nicht vor BT95 geschlossen wurden, muessen entweder blockierend fuer den Rollout-Intake sein oder mit eigenem Folgeblock dokumentiert werden.

### 95.99 Abschluss-Gate

- [ ] 95.99.1 Alle Phasen 95.1 bis 95.4 sind mit Evidence dokumentiert.
- [ ] 95.99.2 Das Ergebnis ist ein doc-only Handoff oder ein dokumentierter No-Intake-Record fuer einen spaeteren Rollout-Intake, keine vorbereitete oder vorweggenommene Umschaltung.
- [ ] 95.99.3 Runtime-, Matchstart- und AI-Hub-Dateien bleiben unveraendert; jede operative PPO-Aktivierung braucht einen separaten Rollout-Block.
- [ ] 95.99.4 Kein Ergebnis darf `rollout-ready` heissen, wenn PPO-Validate, JS-Inference, Registry, Rollback, Latenzbudget oder User-Entscheid fehlen.

### Risiko-Register BT95

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Gruene PPO-Evidence wird als automatische DQN-Ablosung missverstanden | hoch | Governance | manual decision, Rollback-Leiter und separaten Rollout-Intake hart festschreiben | positive A/B-Evidence wird intern schon als Rollout gelesen |
| PPO-Validate-Lane ist noch nicht gruener Bestandteil der Gesamtlage | hoch | QA/Ops | `94B.3` als eigene PPO-Validate-Voraussetzung dokumentieren | Handoff will auf fehlende oder fremde Validate-Evidence aufsetzen |
| Layer-Grenzen werden im letzten Handoff verwischt | hoch | Architektur | read-only-Surfaces und Guardrails aus `ai_architecture_context.md` unveraendert weiterfuehren | Handoff fordert doch Runtime-Schalter, neue Bot-Typen oder Matchstart-Abkuerzungen |
| Inference-/Export-Pfad ist fuer PPO nicht bewiesen | hoch | Integration/RL | Export-, Load- und Inference-Vertrag als Rollout-Vorbedingung dokumentieren | PPO-Modell existiert, aber Runtime kann es nicht deterministisch laden |
| Rollback ist ungetestet | hoch | QA/Ops | Rollback-Test und DQN-Champion-Retention vor operativem Rollout verlangen | PPO wird aktiviert, aber Rueckfall auf DQN ist nicht belegt |
| Modellregistry oder Versionierung passt nicht zu Artefakten | hoch | Integration | Modellhash, Confighash, Normalize-State, Registry-ID und Semantikfenster koppeln | falsches Modell oder falsche Normalize-Stats werden geladen |
| Latenzbudget fuer PPO-Inference ist unbekannt | hoch | Performance | Max-Latency, Timeout- und Fallback-Regeln als Intake-Pflicht fuehren | PPO-Inference blockiert Tick-/Match-Lifecycle |
| Feature-Flag/Strategieflag fehlt | hoch | Architektur/Ops | `BOT_STRATEGY=dqn|ppo` oder gleichwertigen Schalter als separaten Rollout-Scope verlangen | Umschaltung wuerde Code-Aenderung statt kontrollierter Konfiguration brauchen |

---

## Naechste Trainingshandlung

| Reihenfolge | Aktion | Voraussetzung | Ergebnis |
| --- | --- | --- | --- |
| 1 | `93C-Audit-Delta` abgeschlossen: F.09-F.11, F.16, F.21, F.23 und F.26 in `93C.1.1`/`93C.1.4` saniert; keine Trainingslaeufe. | `93C.0` endet `go`, aber Audit-Delta aus harter Pruefung ist offen. | Stale Docs, `tmp`-/Self-Count-Evidence, Baseline-Mehrdeutigkeit und Risk-Drift sind bereinigt oder blockierend markiert. |
| 2 | `93C-Env` abgeschlossen: `93C.1` und `93C.2`, keine Baseline. | Audit-Delta schliesst ohne Blocker. | Gepinnter PPO-Stack, Clean-Env-Smoke, SB3-trainierbare Action-Surface und Sanitizer-/Mask-/Veto-Telemetrie. |
| 3 | `93C-Learner` abgeschlossen: `93C.3`, nur Minimal-Smoke. | `93C-Env` endet `go`. | Echter PPO-Optimizer-Update, echtes Eval, Modellpaket, Normalize-/Optimizer-State, Actor/Critic-Heads, Resume und Python-Forward-Pass. |
| 4 | `93C-Diagnose` claimen: `93C.4`, keine Pilot-Erweiterung. | `93C-Learner` schreibt echte Artefakte. | KL/Entropy/Clip/Value/Grad-Norm, Reward-/Death-/Terminal-/Safety-/Failure-Matrix und BT73/PPO-Validate/JS-Restschuld im Report. |
| 5 | `93C-Pilot` claimen: `93C.5.1` bis `93C.5.2`, kleinster Lauf. | `93C-Diagnose` endet ohne Collapse, Reward-Hacking, Failure-Regression oder Safety-Regression. | `pilot go`, `pilot unsafe` oder `diagnose: throughput insufficient`; noch keine Baseline. |
| 6 | Erst bei `pilot go`: `93C.5.3` bis `93C.6` fuer konservative Baseline und DQN-Vorvergleich claimen. | Pilot gruen, Baseline-ID fixiert, feste Matrix, direkte Env-Evidence. | PPO/DQN-Vorvergleich mit Holdout; Ergebnis `ppo-promising`, `ppo-hold`, `ppo-diagnose` oder `ppo-regression`. |
| 7 | Nur bei echtem Modellpaket, Evidence-Qualitaetsmatrix und belastbarem Vorvergleich: `93C.7` Handover. | Baseline und Vergleich sind reproduzierbar; F.01-F.37 sind geschlossen oder sauber folgegated. | `BT94A-ready` oder ehrliches `diagnose`; kein Rollout-Signal. |
| 8 | `BT94A-No-Start` dokumentiert: Gate-Checker gegen BT93C-Handover ausfuehren, keine Ablationen. | `93C.7`/`93C.99` enden `diagnose` mit `ppo-regression` und offenen BT94A-Blockern. | `data/training/ppo/bt94a/no_start_gate.json` (`claimable=false`); kein freier BT93+ Trainingsclaim ohne Replan oder erneute Diagnose. |
| 9 | `BT93D-Reparatur` abgeschlossen: `93D.1` bis `93D.4`, keine BT94A-Kandidaten und kein Freeze. | `BT94A-No-Start` liegt vor; `no_start_gate.json` meldet `claimable=false`; User-Replan hat BT93D als Zwischenphase freigegeben. | F.05/F.19/F.27/F.30/F.31 bleiben `still-blocking`; `BT93D.99=diagnose-blocked`. |
| 10 | `BT93E-Vollreparatur` abgeschlossen: `93E.1` bis `93E.5`, alle G.01-G.08, C.01-C.04, F.01-F.37 und R.01 abgearbeitet. | `BT93D.99=diagnose-blocked`; `start_gate_package.json` und `no_start_gate.json` nennen rote Claim-Checks und offene Blocker. | Vollstaendiges Befundregister, neue Reparatur-/Eval-/Holdout-/Terminal-/Policy-Evidence; Ergebnis bleibt `diagnose-blocked` mit Blockern `F.05/F.19/F.27/F.30/F.31/R.01`. |
| 11 | `BT93F-Startreparatur` abgeschlossen: `93F.1` bis `93F.99` enden `diagnose-blocked`; kein BT94A-Claim. | `BT93E.99=diagnose-blocked`; `no_start_gate.json` meldet `claimable=false`, `candidateRunsAllowed=false`, `matrixDefinitionAllowed=false`, `precomparison=ppo-regression`, `bt94aBlockerCount=5`. | `data/training/ppo/bt93f/handover_package.json` und `data/training/ppo/bt94a/no_start_gate.json` pinnen `BT94A remains closed before 94A.1`; naechster Trainingsclaim braucht User-Replan oder engere Folge-Reparatur. |
| 12 | Mit `/fix-planung` `BT93G-Masked-Comparable-Repair` claimen: `93G.1` bis `93G.6`, keine BT94A-Kandidaten und kein Freeze. | `BT93F.99=diagnose-blocked`; `no_start_gate.json` meldet weiter rot; Root-Causes sind Vergleichshorizont, fehlendes Pre-Sampling-Masking, Terminal-/Death-/Reward-Semantik und untertrainierter PPO. | Vergleichbare Reparaturmatrix, Natural-Terminal-Wiring, echtes Policy-Level-Masking, Reward-Regressionsschutz, gestufter Extended-Repair-Train bis max. 4h nur bei gruenen Voraussetzungen und danach Eval/Holdout; Ergebnis `BT94A-ready` oder `diagnose-blocked`. |
| 13 | Erst bei `BT93G.99=BT94A-ready`: `94A.1` claimen. | `no_start_gate.json` meldet `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `summary.bt94a-blocker=0` bzw. `bt94aBlockerCount=0`, `bt94aHandover.ready=true`, `precomparison != ppo-regression`. | Ablationsmatrix und Entscheidungsregeln fuer BT94A; weiterhin kein Freeze vor `94A.3`. |

No-Go vor Bot-Training:

- Kein `baseline`-, `pilot`- oder Langlauf, solange frisches `freezeOk=true`, Clean-Env, Action-Surface, Startmanifest, Baseline-ID und Audit-Delta nicht belegt sind.
- Kein `4-Env`, solange keine direkte 4-Env-Evidence vorliegt.
- Keine Rollout- oder JS-Runtime-Integration vor BT95 plus separatem Rollout-Block.
- Kein `promote`, solange die PPO-Validate-Lane aus `94B.3` nicht gruen ist; BT80C `80.9.3` ersetzt diese Evidence nicht.
- Kein BT94A-Start, solange BT93G.99 nicht `BT94A-ready` ist und `data/training/ppo/bt94a/no_start_gate.json` nicht `claimable=true`, `candidateRunsAllowed=true`, `matrixDefinitionAllowed=true`, `summary.bt94a-blocker=0` bzw. `bt94aBlockerCount=0`, `bt94aHandover.ready=true` und `precomparison != ppo-regression` schreibt.
- Kein BT94A-Kandidatenlauf, kein Freeze-Kandidat und kein BT94B-Handover innerhalb BT93D, BT93E, BT93F oder BT93G.
- Kein alter `data/bot_validation_report.json`, kein `plan:check`, kein Throughput-Report und kein Scaffold-Artefakt darf als PPO-Survival-Beweis verwendet werden.

## Backlog (priorisiert)

| ID | Titel | Impact | Aufwand | Prioritaet | Naechster Schritt | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BT50 | Opponent-Class Profiles fuer Survival-Spezialisierung | mittel | mittel | P2 | Profil-Entwurf + KPI-Hypothese | Offen |
| BT60 | Langlauf-Curriculum ueber 24h mit Auto-Promotion | hoch | gross | P2 | Infra-Kosten und Zeitfenster pruefen | Offen |
| BT70 | Offline-Policy-Benchmarking mit festen Seeds | mittel | klein | P1 | Benchmark harness standardisieren | Offen |

## Archivindex

| Block/Plan | Grund | Archiv-Pfad |
| --- | --- | --- |
| - | noch keine abgeschlossenen BT-Rootplaene archiviert | `docs/archive/plans/completed/` |

## Weekly Review (KW 12/2026)

Stand: 2026-03-22

- Abgeschlossen diese Woche: BT10.1.1 Stabilitaetsparameter gehaertet.
- In Arbeit: BT10.1.2 Operatorlauf-Monitoring.
- Naechste 3 Ziele:
  1. BT10.2.1 periodische `bot:validate` Reports sichern.
  2. BT10.2.2 KPI-Deltas pro Checkpoint dokumentieren.
  3. BT15.2.2 woechentliche Roadmap-Replanung gegen Checkpoint-Log verankern.
- Groesstes Risiko: Laufartefakte unvollstaendig bei langen Resume-Ketten.
- Entscheidungsbedarf: feste 2h-Validierungszeitfenster und Owner festlegen.

## Dokumentations-Hook

Vor Task-Abschluss immer:

- `npm run plan:check`
- `npm run docs:sync`
- `npm run docs:check`

