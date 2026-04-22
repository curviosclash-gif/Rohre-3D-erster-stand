# Offene Risiken - BT90 Session-Tracking

Stand: 2026-04-22

Dieses Dokument sammelt session-uebergreifende Risiken fuer den BT90-PPO-Zweitpfad.
Es ist ein Intake-Risiko-Register und ersetzt nicht das operative Tracking im aktiven Bot-Trainingsplan.

## Aktive offene Risiken

| ID | Quelle | Risiko | Warum offen | Ziel-Block | Loesungsansatz | Prioritaet | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S001 | BT102 | PyTorch/CUDA-Stack passt nicht stabil zu der Zielhardware | Der volle PPO-Stack ist noch nicht auf dem echten Trainingsrechner verifiziert und ist bewusst nicht Closure-Kriterium von BT100 | BT102.1 | `torch`/CUDA erst fuer PPO-Baseline hart verifizieren; BT100 CPU-first und minimal halten | HOCH | OFFEN |
| S004 | BT100 | Der volle PPO-Stack wird wieder zu frueh in den Bootstrap-Scope gezogen | BT100 soll nur Minimal-Bootstrap, Contract-Smoke und 1-Worker-Lane schliessen | BT100.1 | Requirements minimal halten, schwere PPO-Libs nur bei echter Notwendigkeit zulassen | HOCH | OFFEN |
| S005 | BT101 | Mehrere Headless-Envs koennen unter Windows/`SubprocVecEnv` oder WS-Worker-Churn instabil werden | Der Parallelitaetspfad ist noch nicht praktisch bewiesen | BT101.4 / BT101.5 | erst 1 Env, dann 2, dann 4; Worker-Wrapper mit Restart/Timeout nur ausserhalb der Runtime | HOCH | OFFEN |
| S006 | BT101 | Produktive Veto-/Safety-Semantik und runtime-near Info-Felder sind im PPO-Training nur teilweise sichtbar | Die vorhandenen Felder muessen im Headless-Transition-Pfad sauber geloggt und im Env sichtbar gemacht werden | BT101.3 / BT102.4 | `hybridDecision`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `observationSchemaVersion` und `observationLength` explizit im Python-Logging auswerten | MITTEL | OFFEN |
| S015 | BT101 | Observation-/Action-Authority driftet zwischen `TrainerPayloadAdapter`, `TrainingContractV1`, `ObservationSchemaV2` und `BotActionContract` | Der BT101-Pfad ist noch nicht end-to-end gegen die echten runtime-near Artefakte verifiziert | BT101.1 | Mismatch als Blocker behandeln; `useItem`-Semantik, Schema-Version und Length explizit festziehen | HOCH | OFFEN |
| S008 | BT102 | Headless-Throughput reicht nicht fuer sinnvolle PPO-Referenzlaeufe | BT100-Hardwareprofil und BT101-Parallelitaet sind noch offen | BT102.5 | Throughput-Budget ehrlich kalibrieren, `n_steps`, `total_timesteps` und Env-Anzahl anpassen | HOCH | OFFEN |
| S009 | BT102 / BT104 | PPO-vs-DQN bleibt methodisch nur teilweise apples-to-apples | DQN laeuft produktiv, PPO zunaechst extern headless | BT102.4 / BT104.2 | DQN-Champion, Seeds, Matrix und Reports hart einfrieren; BT102 nur als Vorvergleich labeln | HOCH | OFFEN |
| S010 | BT102 | Telemetrie-Felder fuer Reward-, Veto- und Curriculum-Analyse sind im Laufzeitcode nicht voll verifiziert | Die Blockplanung referenziert Felder, deren End-to-End-Pfad noch praktisch geprueft werden muss | BT102.4 | Payload-/`info`-Schluessel explizit gegen echten Transport pruefen und fehlende Felder dokumentieren | MITTEL | OFFEN |
| S011 | BT104 / BT105 | `BT80C 80.9.3` bleibt offen und blockiert spaetere Integrations-Freigabe | Externe Evidence ist moeglich, produktionsnahe Validation fuer DQN-Sunset aber noch nicht | BT104.3 / BT105 | BT104 darf Zusatzsignal offen lassen; BT105 muss die Restblockade explizit als Integrationsvoraussetzung fuehren | HOCH | OFFEN |
| S012 | BT100-BT105 | Der Plan driftet wieder in Runtime-/Electron-Integration statt beim Sidecar-Pfad zu bleiben | Alte Entwuerfe und Dateinamen ziehen in diese Richtung | BT100-BT105 | no-touch-Liste hart im Master und in allen Block-/Prompt-Dateien halten; Electron nur optionaler Smoke | HOCH | OFFEN |
| S013 | BT105 | PPO wird nach gruener Evidence vorschnell als automatische DQN-Abloesung interpretiert | Der gewuenschte Zielzustand ist komplette Ablosung, aber Integrationsrisiko bleibt separat | BT105 | separaten Integrationsblock, Rollback-Leiter und User-Entscheid als Pflicht festschreiben | HOCH | OFFEN |
| S014 | BT90-Governance | Der gesamte BT90-Ordner wird direkt umgesetzt, statt den aktiven Start blockweise in `docs/bot-training/Bot_Trainingsplan.md` zu intaken | Ein paralleler Dokumentations- und Wahrheitsraum wuerde aktive Phase, Lock und Evidence an BT-Governance vorbeischieben | Migration | zuerst nur BT100 plus BT101-Single-Env in einen neuen aktiven BT-Block uebernehmen; BT102-BT105 als rolling drafts behalten | HOCH | OFFEN |

## Archiv / entfallene Risiken

| ID | Quelle | Risiko | Status | Grund |
| --- | --- | --- | --- | --- |
| S003 | Alt-BT100 | Electron-/EPERM-Startprobleme als Primaerpfad | ENTFAELLT | BT90 ist jetzt headless-first; Electron ist hoechstens optionaler Smoke |
| S007 | Alt-BT101 | Curriculum-Stage-Resolution: Python-seitig vs. JS-seitig | GELOEST | JS bleibt im Zweitpfad authoritative fuer Reward-/Curriculum-Semantik |

## Regeln

1. Jeder Vertiefungs-Prompt fuer BT90 muss dieses Dokument lesen.
2. Neue offene Risiken werden am Session-Ende hier ergaenzt.
3. Wenn ein Risiko entfaellt oder geloest ist, wandert es in den Archiv-Abschnitt.
4. IDs bleiben stabil und werden nicht neu vergeben.
5. `OFFEN`, `GELOEST` und `ENTFAELLT` sind die einzigen gueltigen Statuswerte.
