# Feature: Governance-, Workflow- und Masterplan-Entschlackung fuer AI-gestuetzte Repo-Arbeit (V109)

Stand: 2026-05-02
Status: Entwurf
Owner: Codex
Risiko: mittel
plan_file: `docs/plaene/aktiv/V109.md`

## Ziel

Die Repo-Governance soll so gestrafft werden, dass AI-gestuetzte Arbeit weniger Verwaltungsrauschen, weniger Mikro-Commits und weniger Plan-/Lock-Overhead erzeugt, ohne Safety, Scope-Klarheit oder Desktop-first-Produktfokus zu verlieren.

- Rules und Workflows sollen wieder fachliche Lieferung statt formale Mikro-Schritte priorisieren.
- Der Masterplan `docs/Umsetzungsplan.md` soll real ein kompakter Index werden statt gleichzeitig Index, Audit-Sammelstelle, Priorisierungsessay und Findings-Datenbank zu sein.
- Locking, Planpflege und Evidence sollen auf einen kanonischen, kostenguensigen Pfad reduziert werden.
- Kleine gezielte Verifikationssignale fuer riskante Codeaenderungen sollen vor `*.99` wieder erlaubt sein, damit Probleme nicht erst am Abschluss-Gate sichtbar werden.
- AI soll kuenftig fuer Produktwert, Stabilitaet und echte Komplexitaetsreduktion beschleunigen, nicht fuer Meta-Produktion.

## Desktop-first Scope

- Ziel bleibt indirekt produktbezogen: Desktop-Hotfixes, Runtime-Hardening und Produktfeatures sollen durch weniger Governance-Reibung schneller lieferbar werden.
- Browser-/Demo-Paritaet ist kein Treiber dieses Blocks.
- Prozessaenderungen muessen explizit den Desktop-Hauptpfad entlasten, nicht nur Dokumentation schoener machen.

## Nicht-Ziel

- Kein kompletter Neuaufbau des gesamten Planungssystems.
- Kein Ersatz fuer Scope-, Dependency- oder Lock-Safety.
- Kein Aufweichen von Dead-Code-, Legacy- oder Layer-Governance.
- Kein Bot-Training-spezifischer Sonderprozess ausser dort, wo gemeinsame Repo-Regeln sinnvoll vereinheitlicht werden.

## Betroffene Dateien und Bereiche

- `.agents/rules/planning_and_governance.md`
- `.agents/rules/git_and_commits.md`
- `.agents/rules/token_efficiency_and_tools.md`
- `.agents/workflows/code.md`
- `.agents/workflows/bugfix.md`
- `.agents/workflows/quick.md`
- `.agents/workflows/plan.md`
- `.agents/workflows/fix-planung.md`
- `.agents/workflows/status.md`
- `.agents/workflows/aktualitaet-sync.md`
- `.agents/workflows/teamwork-coordination.md`
- `docs/Umsetzungsplan.md`
- `docs/plaene/CHANGELOG.md`
- `docs/lock-status/README.md`
- `docs/prozess/Dokumentationsstatus.md`
- optional neuer Auslagerungspfad fuer offene Review-/Audit-Findings, z. B. `docs/prozess/Open_Findings.md`

## Definition of Done

- [ ] DoD.1 Die Commit-Policy erzwingt keine kuenstlichen Mikro-Commits mehr pro Subphase; fachlich zusammengehoerige Lieferung (`code + test + minimale scope-doku`) ist in einem scoped Commit erlaubt.
- [ ] DoD.2 `docs/Umsetzungsplan.md` ist tatsaechlich ein kompakter Master-Index; grosse Findings-, Audit- und Priorisierungslisten sind in kanonische Nebenablaegen ausgelagert.
- [ ] DoD.3 Locking hat genau einen operativen Wahrheitsraum; Claim-/Release-Rauschen ueber Masterplan- oder Lock-only-Commits wird entfernt oder klar auf seltene Sonderfaelle begrenzt.
- [ ] DoD.4 `docs:sync` und `docs:check` laufen nicht mehr pauschal fuer jeden normalen Codepfad, sondern nur noch fuer Docs-/Governance-/Graph-Scope oder definierte Gates.
- [ ] DoD.5 Kleine risikoadjustierte Verifikationssignale vor `*.99` sind erlaubt und in den Workflows sauber beschrieben, ohne die User-owned-Testregel aufzugeben.
- [ ] DoD.6 Die Regeln bleiben desktop-first, scope-sicher und dead-code-sicher; Entschlackung fuehrt nicht zu neuen Blindspots bei Legacy-, Layer- oder Replace-first-Entscheidungen.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V109`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V109.md`
- hard dependencies: `V99.99`
- soft dependencies: `V94.99` (Graph-Query-Leseweg bleibt erhalten)
- Hinweis: `Manuelle Uebernahme erforderlich`

## Empfohlene Master-Einordnung

`V109` soll bewusst nicht vor den akuten Multiplayer-/Lobby-/Signaling-Problemen starten. Der Block ist als kurzer Governance-Enabler direkt nach `V99` gedacht, damit die danach folgenden technischen Bloecke weniger Meta-Rauschen und weniger Verwaltungs-Commiting erzeugen.

Empfohlene Reihenfolge im Master:

`V99 -> V109 -> V100 -> V104 -> V107 -> V102 -> V105`

Empfohlene Tabellenzeile fuer `## Aktive und geplante Bloecke` nach manueller Uebernahme:

`| V109 | Governance-, Workflow- und Masterplan-Entschlackung fuer AI-gestuetzte Repo-Arbeit | planned | P1 | frei | V99.99 | 109.1 | docs/plaene/aktiv/V109.md |`

Empfohlene Anpassung in `## Priorisierte Intake-Uebernahme (neu)`:

1. `V99` als naechsten Intake-Prioritaetsblock uebernehmen.
2. Danach `V109` als kurzen Governance-/Workflow-Enabler uebernehmen.
3. Danach `V100` (Runtime-Rebuild/Remount/StartSync) nachziehen.
4. Danach `V104` (nachhaltiger God-Object-Sunset und UI-Port-Zuschnitt) einschieben.
5. Danach `V107` (kompletter Spiel-Wissensgraph als mehrschichtiger Query-Layer) uebernehmen.
6. Danach `V102` (Security-/Runtime-/Contract-Hardening aus Deep-Code-Analyse) uebernehmen.
7. Danach `V105` (Architecture-Guard- und Typecheck-Regression-Recovery) als gruensichernden Recovery-Block nachziehen.

Guardrail fuer die Uebernahme:

- `V109` darf nicht zu einem grossen Meta- oder Tooling-Programm anwachsen.
- Ziel ist ein kurzer Block fuer vier harte Eingriffe:
  - Commit-Policy entschlacken
  - pauschale `docs:sync`-/`docs:check`-Pflichten aus normalen Codepfaden entfernen
  - `docs/Umsetzungsplan.md` auf echten Compact-Index zurueckbauen
  - Locking auf einen operativen Wahrheitsraum reduzieren

## Evidence-Format

Abgeschlossene Checkboxen im spaeteren aktiven Block immer mit:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 109.1 Regeln auf Delivery statt Mikro-Verwaltung neu ausrichten
status: open
goal: Die zentralen Repo-Rules auf echte Lieferung, Priorisierung und Diff-Disziplin ausrichten
output: Entschlackte Rule-Baseline fuer AI-gestuetzte Arbeit

- [ ] 109.1.1 `git_and_commits.md` so aendern, dass `Ein Commit pro Subphase`, `sofort committen nach jeder Teilaenderung` und `Umsetzungsplan immer als eigener Commit` nicht mehr als starre Pflicht gelten; stattdessen fachliche Liefer-Slices definieren.
- [ ] 109.1.2 `planning_and_governance.md` so aendern, dass Evidence-, Blocker- und Unterphasenregeln weniger kuenstliche Mikrostruktur erzeugen; mindestens-2-Unterphasen-Pflicht und obligatorische Fehlerberichte fuer jede Reibung werden abgeschwaecht oder entfernt.

### 109.2 Workflow-Gates risikoadjustiert entschlacken
status: open
goal: Normale Codepfade von pauschalem Governance-Overhead befreien
output: Leichtere Code-, Bugfix- und Quick-Workflows

- [ ] 109.2.1 `code.md`, `bugfix.md` und `quick.md` so schneiden, dass `docs:sync`/`docs:check` und volle Meta-Gates nur noch bei Docs-/Governance-/Graph-Scope, `*.99` oder explizitem Drift-Verdacht laufen.
- [ ] 109.2.2 Kleine gezielte Verifikationssignale vor `*.99` sauber erlauben: z. B. enges Contract-, Build- oder Runtime-Signal fuer riskante Pfade, ohne wieder volle Test-Suites zum Default zu machen.

### 109.3 Locking und Team-Koordination auf einen Wahrheitsraum reduzieren
status: open
goal: Lock-Sicherheit behalten, aber Lock-Git-Rauschen deutlich reduzieren
output: Vereinfachtes operatives Lock-Modell

- [ ] 109.3.1 `fix-planung.md`, `teamwork-coordination.md` und `docs/lock-status/README.md` so angleichen, dass `docs/lock-status/*.json` der einzige operative Lock-Pfad bleibt; Masterplan- und Lock-only-Claim-/Release-Commits entfallen.
- [ ] 109.3.2 Scope-/Lock-Validation beibehalten, aber klar trennen zwischen Live-Status, Audit-Historie und Git-Historie; Statuswechsel duerfen nicht mehr automatisch neue Verwaltungs-Commits erzwingen.

### 109.4 Masterplan zu einem echten kompakten Index zurueckbauen
status: open
goal: `docs/Umsetzungsplan.md` von Sammeldokument zu klarer Steuerdatei zurueckfuehren
output: Schlanker Master und ausgelagerte Detailablaegen

- [ ] 109.4.1 `docs/Umsetzungsplan.md` auf aktive Bloecke, harte Dependencies, wenige Prioritaeten und Pointer reduzieren; lange Priorisierungsprosa, Review-Backlogs, Findings-Tabellen und ausgedehnte Lock-Historie auslagern.
- [ ] 109.4.2 Einen kanonischen Auslagerungspfad fuer offene Findings und Review-/Audit-Reste definieren, damit der Master auf Findings verweist statt sie voll zu enthalten.

### 109.5 AI-Arbeitsmodus explizit in Regeln und Workflows verankern
status: open
goal: AI-gestuetzte Arbeit soll durch klare Diff-, Scope- und Stop-Loss-Regeln besser kuratiert werden
output: Reale Leitplanken gegen Overproduction

- [ ] 109.5.1 In Rules oder Workflows explizite Leitplanken fuer AI-Arbeit verankern: ein Hauptpfad gleichzeitig, Diff-Budget pro Slice, keine neuen Nebenpfade ohne Begruendung, keine Generated-Artefakt-Flut ohne klaren Produkthebel.
- [ ] 109.5.2 Status-/Plan- und Refactor-Workflows so schaerfen, dass AI nicht durch Governance-Mechanik in Meta-Produktion gedrueckt wird; Produktwirkung, Stabilitaet oder echte Komplexitaetsreduktion muessen als primaerer Output benannt sein.

### 109.99 Abschluss-Gate
status: open
goal: Entschlackte Governance reproduzierbar und widerspruchsfrei abschliessen
output: Konsistente Repo-Regeln und ein schlanker Masterplan

- [ ] 109.99.1 Die angepassten Rules, Workflows und Planstrukturen sind gegenseitig konsistent; kein Workflow verlangt mehr Schritte, die eine Rule oder der Masterplan zugleich als secondary/operativ extern beschreibt.
- [ ] 109.99.2 `npm run plan:check`, `npm run docs:sync` und `npm run docs:check` sind nach der Umstellung gruen; notwendige Strukturmigrationen sind sauber dokumentiert.
- [ ] 109.99.3 Ein kurzer Referenzleitfaden fuer “normaler Codepfad”, “riskanter Bugfix”, “Planentwurf” und “Locking/Koordination” zeigt, dass die neue Governance weniger Meta-Commits und weniger Pflicht-Docs erzeugt als vorher.

## Risiken

- R1 | mittel | Zu aggressive Entschlackung kann echte Scope- oder Lock-Sicherungen versehentlich mit abbauen.
- R2 | mittel | Auslagerung aus `docs/Umsetzungsplan.md` kann kurzfristig Suchaufwand erhoehen, wenn Zielablaegen nicht klar benannt sind.
- R3 | mittel | Lockerere Commit-Regeln koennen ohne gute Diff-Disziplin in zu breite Mischcommits kippen; deshalb braucht der Block explizite Slice-Leitplanken statt nur weniger Regeln.
- R4 | niedrig | Bestehende Automations- oder Check-Skripte koennen implizit vom alten Master- oder Lock-Format ausgehen und muessen mit migriert werden.
