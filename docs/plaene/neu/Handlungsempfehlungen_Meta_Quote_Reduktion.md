# Handlungsempfehlungen: Meta-Quote senken, Produktfokus erhoehen

Status: Entwurf (Intake user-owned)
Datum: 2026-06-10
Quelle: Tiefenanalyse der Git-Historie 2026-05-20 bis 2026-06-10 (203 Commits); ergaenzt um Repo-Tiefenanalyse 2026-06-10 (Architektur, Tests, Plan-Stand, Hygiene)

## 1. Befund (Kurzfassung)

Die Analyse der letzten 3 Wochen ergab:

| Metrik | Wert |
| --- | --- |
| Commits gesamt | 203 |
| Reine `docs:`-Commits | 119 (59 %) |
| Commits am Spiel (`src/`) | ~20 (10 %) |
| Meta-Anteil (Governance, Locks, Plan-Tooling, Doku) | ~70-76 % |
| Lock-Churn | 82 Commits an `_locks-registry.json`, 81 an `codex.json` - alle von einer Person |
| Fix-auf-Feature-Quote | ~51 % (24 fix auf 47 feat), konzentriert auf Governance-Sprints |

Qualitaetsbild: Die produktnahen Workstreams (Graph-RAG V120/V121/V139, Mobile/Tilt/V140) waren substanziell, gut getestet und stabil. Die Nacharbeit und der einzige echte Fehlgriff (V133 Glossary: Feature 02:36, "done" 02:37, Komplett-Revert nach 10 h) kamen fast vollstaendig aus den Governance-Sprints. Das Problem ist nicht die Arbeitsqualitaet, sondern wohin die Arbeit fliesst.

## 2. Bereits umgesetzte Massnahmen (2026-06-10)

1. **Lock-System auf opt-in gestellt** (Empfehlung 1)
   - `.husky/pre-commit`: Lock-Validierung laeuft nur noch, wenn `docs/lock-status/`-Dateien selbst staged sind.
   - `.agents/rules/git_and_commits.md`: Single-Agent-Default ohne Claiming/Locking; Lock-Tooling nur fuer expliziten Team-Betrieb.
   - `.agents/workflows/fix-planung.md` und `bot-training-plan.md`: Claim-/Release-Schritte auf opt-in umgestellt.
   - `.agents/workflows/teamwork-coordination.md`: als opt-in-only markiert.
   - Erwarteter Effekt: 3-5 Commits weniger Churn pro Block; `git log` zeigt wieder fachliche Arbeit.
2. **Plan-Autopilot auf Report-only eingefroren** (Empfehlung 2)
   - npm-Script `autopilot:run` entfernt; `autopilot:plan` (Dry-Run/Report) bleibt.
   - Bindende Regel in `.agents/rules/planning_and_governance.md` (Abschnitt "Plan-Autopilot (V145): Report-only"); Reaktivierung ist D3 mit User-Gate.
   - Code und Tests bleiben erhalten.
3. **V138/V141 Durchsetzungsstatus geklaert** (Empfehlung 3)
   - Korrektur zum Analysebericht: V138 (Diff-Audit) ist bereits blockierend im `agent:commit`-Preflight verdrahtet und damit fuer alle Agent-Commits durchgesetzt; das ist jetzt explizit in `.agents/rules/git_and_commits.md` dokumentiert.
   - V141 (Drift-Checks `drift:check` = `findings:check` + `plan:changelog:check` + `test-mapping:check`) laeuft bereits bei jedem Push (pre-push -> `docs:check`), aber hart codiert warn-only. Verschaerfungspfad: siehe 3.2.

## 3. Offene Handlungsempfehlungen (user-owned Intake)

### 3.1 Sofortmassnahme: 47 ungepushte Commits sichern

Stand 2026-06-10 liegt `main` 47 Commits vor `origin/main`. Es gibt kein Team zu koordinieren - das ist kein Review-Thema, sondern ein fehlendes Backup. Ein Plattendefekt kostet aktuell rund drei Wochen Arbeit (V140, V141, V145 komplett).

- [ ] `git push` ausfuehren - vor allen anderen Punkten in diesem Dokument.
- [ ] Optional: Gewohnheit "Push am Ende jedes Arbeitstags" festhalten; kein Tooling dafuer bauen.

### 3.2 Drift-Checks scharf schalten (Voraussetzung: Altlasten klaeren)

Die Drift-Checks koennen erst blockierend werden, wenn die stehenden Warnungen entschieden sind, sonst blockiert jeder Push:

- [ ] Findings P14, P45, P46, P47, P48 entscheiden (offen, obwohl Owner-Bloecke V102/V104/V105 done sind): schliessen, neu zuordnen oder als bewusst-offen mit Begruendung markieren (`docs/prozess/finding-decisions.json`).
- [ ] Master-Plan-Mismatches V109, V114, V134 aufloesen (`plan:changelog:check` WARN `master-plan-status-mismatch`).
- [ ] `npm run findings:index:build` laufen lassen (Index ist stale).
- [ ] Danach: `pilot=warn-only` in `scripts/check-open-findings.mjs` und `scripts/check-plan-changelog-drift.mjs` auf enforcing umstellen (Exit 1 bei WARN), damit der pre-push echte Zaehne hat.

### 3.3 Archivierungs- und Aufraeum-Rueckstand

- [ ] V76, V140, V141 aus den aktiven Tabellen archivieren (`docs/plaene/aktiv/` -> `docs/plaene/alt/`, Index nachziehen).
- [ ] `docs/plaene/neu/Feature_Mobile_God_File_Sunset_V140.md` entscheiden: archivieren oder loeschen (referenziert den bereits geschlossenen V140).
- [ ] `data/contracts/browser-demo-surface-policy.export.v1.json`: Aenderung verwerfen oder Export-Pattern in `.gitignore` aufnehmen (Settings-Studio-Artefakt mit Temp-Pfaden).
- [ ] `.agents/workflows/repo-fix.md` und `repro-analyse.md` (untracked, Contracts valide): committen oder verwerfen; bei Commit auch in der Workflow-Tabelle von `AGENTS.md` registrieren.
- [ ] Parallele Agent-Schichten konsolidieren: Im Repo liegen Spuren von mindestens drei AI-Agent-Systemen (`.claude/`, `.codex_tmp/`, `.gemini/`, `.fallow/`), teils mit eigener Governance (z. B. `check-gemini-governance.mjs`). Entscheiden, welches Setup der Standard ist, und die uebrigen Schichten archivieren oder explizit als inaktiv markieren - jede zusaetzliche Schicht erzeugt eigenen Pflege- und Drift-Aufwand.
- [ ] Kosmetik: ~68 `tmp-vite-*.log`-Dateien liegen physisch im Root (gitignored, aber unaufgeraeumt). Log-Ziel der Vite-Wrapper in ein Unterverzeichnis (z. B. `tmp/`) verlegen und Altbestand loeschen.

### 3.4 Technische Schulden: Ratchet von Dokumentation auf Tilgung umstellen

Das Ratchet-System dokumentiert Schulden praezise, tilgt sie aber kaum. Die Budgets wurden den Dateien angepasst, nicht umgekehrt:

| Schuld | Stand 2026-06-10 |
| --- | --- |
| `src/core/arcade/ArcadeRunRuntime.js` | 1492 Zeilen, ueber jedem Budget |
| `src/core/MediaRecorderSystem.js` | 1320 Zeilen, Budget exakt auf 1225 gelegt |
| Geduldete ESLint-Warnungen | 29 (`--max-warnings`) |
| Geduldete Boundary-Verletzungen | 19 Import-Kanten (UI->State, Application->Core/UI) in `ArchitectureConfig.mjs` |

- [ ] Pro abgeschlossenem Produktblock mindestens eine kleine Ratchet-Senkung mitnehmen (eine Boundary-Kante aufloesen oder ein Budget um einen festen Betrag senken), statt neue Ausnahmen zu legalisieren.
- [ ] Keine Budget-Erhoehung und keine neue erlaubte Import-Kante ohne expliziten User-Entscheid mit Begruendung im Block.
- [ ] V118 (Runtime-/UI-Entflechtung) und der ArcadeRunRuntime-Refactor sind die Bloecke, die diese Zahlen real senken - sie gehoeren deshalb in die Produkt-Priorisierung (3.5), nicht in die Warteschlange hinter weiteren Governance-Slices.

### 3.5 Produktfokus-Regeln fuer neue Bloecke

- [ ] Vor jedem neuen Block-Intake die Frage beantworten: "Verbessert das das Spiel, oder verwaltet es die Verwaltung?" Antwort kurz im Intake-Entwurf festhalten.
- [ ] Neue Meta-Bloecke (weitere Validatoren, Dashboards, Drift-Guards, Plan-Tooling) zurueckstellen, bis vorhandenes Tooling nachweislich genutzt wird. Konkret: kein neues Governance-Tooling, solange `autopilot:plan`, Plan-Dashboard und Graph-RAG-Viewer keine dokumentierte regelmaessige Nutzung haben.
- [ ] Governance-Moratorium konkret: V142 (Graph-Drift-Guard), V143 (Agent-Skills) und V144 (Plan-JSON-Source-of-Truth) einfrieren, bis mindestens zwei Produktbloecke (Kandidaten: V131, V106, V113, V118) abgeschlossen sind. Beobachtung aus der Historie: V141 automatisiert Drift im Plansystem, V145 automatisiert das Abarbeiten des Plansystems, V142-V144 planen weitere Automatisierung des Plansystems - dieser Kreislauf produziert keinen Spieler-Mehrwert und verdraengt die produktnahen Bloecke, die seit Wochen auf "planned" stehen.
- [ ] Block-Closing braucht Abstand: kein "done"-Claim im selben Atemzug wie der Feature-Commit (Lehre aus V133 Glossary: done nach 1 Minute, Revert nach 10 Stunden). Minimal: einmal Verifikation gegen DoD in einem separaten Schritt.

### 3.6 Zielbild und Messung

- Ziel-Quote fuer die naechsten 3 Wochen: **mindestens 50 % der Commits mit Produktwirkung** (src/, android-classic/, electron/, zugehoerige Tests) statt 10 %.
- Kandidaten mit direktem Produktnutzen aus den offenen Plaenen priorisieren (Gameplay, Mobile-UX, Performance) statt weiterer Governance-Slices.
- Messung: einfacher Rueckblick am Ende der Periode (`git log --since=... --name-only` grob klassifizieren); kein neues Tooling dafuer bauen.
- Release-Pfad wiederherstellen: Das Projekt steht auf Version 0.9.0, die stale Release-Roadmap wurde am 2026-06-09 geloescht statt aktualisiert. Die Leitfrage fuer jeden neuen Block-Intake lautet: "Was muss passieren, damit jemand das Spiel spielt?" Daraus den naechsten Block ableiten, nicht aus der Plan-Pipeline. Minimal: einen kurzen Release-Zielzustand (3-5 Punkte) als user-owned Notiz im Master oder als Intake-Entwurf festhalten.

## 4. Nicht-Ziele

- Kein Loeschen des Lock-Tooling-Codes (bleibt als opt-in fuer echten Team-Betrieb).
- Kein Loeschen von Plan-Autopilot-Code oder -Tests (Report-Modus bleibt nutzbar).
- Keine Schwaechung der fachlichen Gates (plan:check, Architecture-Guard, Contract-Tests bleiben unveraendert).
