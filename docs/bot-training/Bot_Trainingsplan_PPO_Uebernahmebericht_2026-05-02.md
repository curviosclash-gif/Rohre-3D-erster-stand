# PPO-only Bot_Trainingsplan - Uebernahmebericht

Stand: 2026-05-02

## Ergebnis

- Aktiver Plan: `docs/bot-training/Bot_Trainingsplan.md`
- Archivierter Altplan: `docs/archive/plans/superseded/Bot_Trainingsplan_vor_PPO_only_2026-05-02.md`
- Quelle: vorheriger Stand von `docs/bot-training/Bot_Trainingsplan.md`, jetzt im Archiv abgelegt
- Aktiver Trainingsplan wurde durch die PPO-only-Variante ersetzt.
- Kein Intake wurde erstellt.
- Methode: deletive Kopie; behaltene Zeilen bleiben wortgleich und in Original-Reihenfolge.

## Harte Kritik und Verbesserung aller Befunde

| Befund | Harte Kritik | Verbesserung im Kandidaten |
| --- | --- | --- |
| Alte Operator-/Survival-Bloecke BT10, BT11, BT12, BT15, BT20, BT30, BT40 | Diese Bloecke verwischen den aktuellen PPO-Pfad mit historischer Trainingsarbeit und halten alte Locks/Backlogs sichtbar. | Bloecke, Dependencies, Locks und alte Ownership-Zeilen entfernt; PPO bleibt als einziger aktiver Pfad. |
| BT73 und BT80C im aktiven Blockbereich | BT73/BT80C sind fuer PPO nur Kontext/Alt-Lane; als aktive Planbloecke stoeren sie die Claim-Logik. | Aktive BT73-/BT80C-Blocktexte entfernt; notwendige Kontextwarnungen zu BT80C/PPO-Validate bleiben erhalten. |
| DQN pauschal entfernen waere fachlich falsch | Der PPO-Pfad braucht DQN-/Comparator-Bezuege als harte Starttruth-, Baseline-, Ersatzvergleichs-, Rollback- und No-Go-Gates. | DQN-Nennungen bleiben nur dort, wo sie PPO blockieren, vergleichen oder absichern. Historische DQN-Reports werden weiter als unzureichend markiert. |
| Dependency-/Lock-Tabellen waren gemischt | Alte BT10-BT80C-Zeilen erzeugen den Eindruck, dass nicht-PPO-Arbeit noch Bestandteil des Hauptplans ist. | Tabellen auf PPO-relevante Zeilen gekuerzt. |
| Datei-Ownership war zu breit | Alte Runner-/Trainer-/Bot-Validate-Surfaces ohne PPO-Bezug vergroessern den scheinbaren Scope. | PPO-Sidecar-, Python-, Daten- und read-only Runtime-Surfaces bleiben erhalten. |
| Nicht-PPO-Backlog BT50-BT70 | Das Backlog lenkt vom aktuellen PPO-Reparaturpfad ab und ist nicht uebernahmefaehig fuer einen PPO-only Master. | Backlog entfernt. |
| Weekly Review KW12/2026 | Review referenziert BT10/BT15 und ist als aktiver PPO-Master-Anhang veraltet. | Review entfernt. |
| Roadmap-Abhaengigkeit | Die Roadmap enthaelt noch historische DQN-/BT80C-Kontexte. Das ist kein Kandidatenbruch, aber ein Folge-Risiko. | Kandidat laesst die Roadmap unveraendert; bei offizieller Uebernahme sollte ein separater Roadmap-Sync nur fuer Langhorizont folgen. |
| Guard-Zustand | `guard:main` blockiert auf Branch `bot-training`; eine offizielle Aktivierung auf `main` waere so nicht sauber belegbar. | Kandidat bleibt inaktiv. Vor Uebernahme: auf `main` bzw. erlaubtem Branch erneut `guard:main` laufen lassen. |

## Entfernte Bereiche

| Original-Zeilen | Grund |
| --- | --- |
| 338-348 | Alte Nicht-PPO-Abhaengigkeiten BT10-BT80C |
| 397-402 | Alte Nicht-PPO-Datei-Ownership BT10-BT80C/BT73 |
| 409-409 | Alte allgemeine Laufartefakt-Ownership fuer BT10 |
| 415-423 | Alte Nicht-PPO-Locks BT10-BT80C |
| 475-950 | Alte aktive Bloecke BT10, BT11, BT12, BT15, BT20, BT30, BT40, BT73, BT80C |
| 5778-5784 | Nicht-PPO-Backlog BT50-BT70 |
| 5792-5803 | Veraltetes Weekly Review fuer BT10/BT15 |

Entfernte Ueberschriften:

- 475: `## Block BT10: 12h Survival Operatorlauf`
- 481: `### Definition of Done (DoD)`
- 488: `### 10.1 Laufstabilitaet und Betrieb`
- 493: `### 10.2 Zwischenvalidierung waehrend Lauf`
- 498: `### Checkpoint-Log BT10 (laufend)`
- 505: `### 10.99 Abschluss-Gate`
- 510: `### Risiko-Register BT10`
- 520: `## Block BT11: 10h Survival Folgefenster`
- 526: `### Definition of Done (DoD)`
- 533: `### 11.1 Plan und Laufstart`
- 540: `### 11.2 Laufmonitoring im 2h-Takt`
- 545: `### Checkpoint-Log BT11 (laufend)`
- 558: `### 11.99 Abschluss-Gate`
- 563: `### Risiko-Register BT11`
- 574: `## Block BT12: 10h Bot Folgefenster (Classic + Fight Matrix)`
- 580: `### Definition of Done (DoD)`
- 587: `### 12.1 Plan und Laufstart`
- 593: `### 12.2 Laufmonitoring im 2h-Takt`
- 599: `### Checkpoint-Log BT12 (laufend)`
- 617: `### 12.99 Abschluss-Gate`
- 622: `### Risiko-Register BT12`
- 634: `## Block BT15: Zukunfts-Roadmap Survival (Q2)`
- 640: `### Definition of Done (DoD)`
- 647: `### 15.1 Baseline und Zielkorridor`
- 652: `### 15.2 Operative Verzahnung BT10-BT40`
- 657: `### 15.99 Abschluss-Gate`
- 662: `### Risiko-Register BT15`
- 672: `## Block BT20: Survival-Policy und Reward-Shaping`
- 678: `### Definition of Done (DoD)`
- 685: `### 20.1 Safety-Layer vor Action-Ausgabe`
- 690: `### 20.2 Reward-Shaping auf Ueberleben fokussieren`
- 695: `### Checkpoint-Log BT20 (laufend)`
- 704: `### 20.99 Abschluss-Gate`
- 709: `### Risiko-Register BT20`
- 719: `## Block BT30: Curriculum, Replay-Priorisierung und Hyperparameter`
- 726: `### Definition of Done (DoD)`
- 733: `### 30.1 Curriculum-Stufen`
- 738: `### 30.2 Replay und Hyperparameter`
- 743: `### 30.99 Abschluss-Gate`
- 748: `### Risiko-Register BT30`
- 758: `## Block BT40: Eval-/Gate-Haertung und Regression-Schutz`
- 765: `### Definition of Done (DoD)`
- 772: `### 40.1 Survival-Metriken als First-Class-Gates`
- 777: `### 40.2 Test- und Operator-Haertung`
- 782: `### 40.99 Abschluss-Gate`
- 787: `### Risiko-Register BT40`
- 797: `## Block BT73: Deep-Survival-, Intent- und Resume-Haertung fuer Runtime, Training und Operatorpfade`
- 810: `### Definition of Done (DoD)`
- 821: `### 73.1 Ground Truth, Failure-Taxonomie und Vergleichsbasis`
- 827: `### 73.2 Sensorik und internes Weltmodell vertiefen`
- 833: `### 73.3 Entscheidungsarchitektur in Safety-, Intent- und Recovery-Layer aufteilen`
- 839: `### 73.4 Reward-Shaping, Curriculum und Replay auf Survival-First ausrichten`
- 845: `### 73.5 Eval-, Gate- und Operator-Pfade haerten`
- 851: `### 73.6 Resume-, Bridge- und Reproduzierbarkeitsluecken schliessen`
- 857: `### 73.7 Rollout, Fallback und Doku-Sync`
- 862: `### 73.99 Integrations- und Abschluss-Gate`
- 867: `### Risiko-Register BT73`
- 880: `## Block BT80C: Algorithmus-Ausbau, High-Util-Training und Champion-Rollout`
- 895: `### Definition of Done (DoD)`
- 903: `### 80.7 Lernalgorithmus, Ablationen und Champion-Challenger-Regeln`
- 909: `### 80.8 Hardware-, Util- und Langlaufprofile`
- 915: `### 80.9 Rollout-, Promotion-, Fallback- und Gate-Haertung`
- 924: `### 80.99 Abschluss-Gate`
- 929: `### Checkpoint-Log BT80C`
- 940: `### Risiko-Register BT80C`
- 5778: `## Backlog (priorisiert)`
- 5792: `## Weekly Review (KW 12/2026)`

## Erhaltungsnachweis

- Originalzeilen: 5812
- Entfernte Zeilen: 522
- Kandidatenzeilen: 5290
- Fehlende PPO-Pflichtbloecke: keine
- Versehentlich verbliebene alte Blockueberschriften: keine
- Retained-DQN-Erwaehnungen: 246; Bewertung: notwendig als PPO-Comparator-/Blocker-/Rollback-Kontext, nicht als eigener DQN-Pfad.
- Proof-Status: PASS

## Verifikation

| Check | Ergebnis |
| --- | --- |
| `git diff -- docs/bot-training/Bot_Trainingsplan.md` vor Aktivierung | leer; der alte aktive Trainingsplan war bis zur Uebernahme unveraendert |
| Archiv-Hash gegen alten Plan | PASS; Archiv entspricht exakt dem ersetzten Altplan |
| Aktiv-Hash gegen PPO-Kandidat vor Umbenennung | PASS; aktiver Plan entsprach exakt dem Kandidaten vor Archivindex-Nachtrag |
| Suche nach alten Blockueberschriften `BT10/BT11/BT12/BT15/BT20/BT30/BT40/BT73/BT80C` im aktiven Plan | keine Treffer |
| Suche nach PPO-Pflichtbloecken `BT90` bis `BT95` im aktiven Plan | alle Pflichtbloecke vorhanden |
| `npm.cmd run plan:check` | PASS; `Master plan validation passed.` |
| `npm.cmd run docs:check` | PASS; `updated=0`, `missing=0`, `legacy=0`, `mojibake=0`, danach `plan:check` PASS |
| `npm.cmd run guard:main` | BLOCKED; aktueller Branch ist `bot-training`, erforderlich ist `main` oder explizite Ausnahme |
| `ALLOW_NON_MAIN=1 npm.cmd run guard:main` | PASS fuer den explizit user-gewuenschten lokalen Commit auf `bot-training` |
| `npm.cmd run scope:validate --if-present` | PASS; keine Scope-Konflikte |
| `npm.cmd run build` | FAIL in bestehendem `src/**` Typecheck (`MediaRecorderSystem`, Recording-/Runtime-/Network-/Contracts-Dateien); keine beruehrten `src`-Dateien in diesem Plan-Scope |

## Uebernahmeurteil

Der aktive Plan ist inhaltlich und strukturell als PPO-only Haupttrainingsplan uebernommen. Die Branch-Ausnahme ist user-freigegeben, weil der lokale Commit explizit auf `bot-training` erfolgen soll. Fuer ein spaeteres Merge-/Main-Gate muss `guard:main` ohne Ausnahme auf `main` erneut laufen. Wegen bestehendem `build`-/Typecheck-Rot ist der Planinhalt GO, ein Main-/Release-Merge aber NO-GO bis diese fremden Typecheck-Fehler behoben sind.

Nicht uebernahmefaehig waere eine Variante, die alle DQN-Begriffe entfernt: Das wuerde `BT93M`/`BT93X`/`BT93P`/`BT94A`/`BT95` fachlich beschaedigen, weil der PPO-Pfad Comparator-, Ersatzvergleichs-, Rollback- und No-Go-Regeln verliert.
