# Handlungsempfehlungen: Meta-Quote senken, Produktfokus erhoehen

Status: Entwurf (Intake user-owned)
Datum: 2026-06-10
Quelle: Tiefenanalyse der Git-Historie 2026-05-20 bis 2026-06-10 (203 Commits)

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
   - V141 (Drift-Checks `drift:check` = `findings:check` + `plan:changelog:check` + `test-mapping:check`) laeuft bereits bei jedem Push (pre-push -> `docs:check`), aber hart codiert warn-only. Verschaerfungspfad: siehe 3.1.

## 3. Offene Handlungsempfehlungen (user-owned Intake)

### 3.1 Drift-Checks scharf schalten (Voraussetzung: Altlasten klaeren)

Die Drift-Checks koennen erst blockierend werden, wenn die stehenden Warnungen entschieden sind, sonst blockiert jeder Push:

- [ ] Findings P14, P45, P46, P47, P48 entscheiden (offen, obwohl Owner-Bloecke V102/V104/V105 done sind): schliessen, neu zuordnen oder als bewusst-offen mit Begruendung markieren (`docs/prozess/finding-decisions.json`).
- [ ] Master-Plan-Mismatches V109, V114, V134 aufloesen (`plan:changelog:check` WARN `master-plan-status-mismatch`).
- [ ] `npm run findings:index:build` laufen lassen (Index ist stale).
- [ ] Danach: `pilot=warn-only` in `scripts/check-open-findings.mjs` und `scripts/check-plan-changelog-drift.mjs` auf enforcing umstellen (Exit 1 bei WARN), damit der pre-push echte Zaehne hat.

### 3.2 Archivierungs- und Aufraeum-Rueckstand

- [ ] V76, V140, V141 aus den aktiven Tabellen archivieren (`docs/plaene/aktiv/` -> `docs/plaene/alt/`, Index nachziehen).
- [ ] `docs/plaene/neu/Feature_Mobile_God_File_Sunset_V140.md` entscheiden: archivieren oder loeschen (referenziert den bereits geschlossenen V140).
- [ ] `data/contracts/browser-demo-surface-policy.export.v1.json`: Aenderung verwerfen oder Export-Pattern in `.gitignore` aufnehmen (Settings-Studio-Artefakt mit Temp-Pfaden).
- [ ] `.agents/workflows/repo-fix.md` und `repro-analyse.md` (untracked, Contracts valide): committen oder verwerfen.

### 3.3 Produktfokus-Regeln fuer neue Bloecke

- [ ] Vor jedem neuen Block-Intake die Frage beantworten: "Verbessert das das Spiel, oder verwaltet es die Verwaltung?" Antwort kurz im Intake-Entwurf festhalten.
- [ ] Neue Meta-Bloecke (weitere Validatoren, Dashboards, Drift-Guards, Plan-Tooling) zurueckstellen, bis vorhandenes Tooling nachweislich genutzt wird. Konkret: kein neues Governance-Tooling, solange `autopilot:plan`, Plan-Dashboard und Graph-RAG-Viewer keine dokumentierte regelmaessige Nutzung haben.
- [ ] Block-Closing braucht Abstand: kein "done"-Claim im selben Atemzug wie der Feature-Commit (Lehre aus V133 Glossary: done nach 1 Minute, Revert nach 10 Stunden). Minimal: einmal Verifikation gegen DoD in einem separaten Schritt.

### 3.4 Zielbild und Messung

- Ziel-Quote fuer die naechsten 3 Wochen: **mindestens 50 % der Commits mit Produktwirkung** (src/, android-classic/, electron/, zugehoerige Tests) statt 10 %.
- Kandidaten mit direktem Produktnutzen aus den offenen Plaenen priorisieren (Gameplay, Mobile-UX, Performance) statt weiterer Governance-Slices.
- Messung: einfacher Rueckblick am Ende der Periode (`git log --since=... --name-only` grob klassifizieren); kein neues Tooling dafuer bauen.

## 4. Nicht-Ziele

- Kein Loeschen des Lock-Tooling-Codes (bleibt als opt-in fuer echten Team-Betrieb).
- Kein Loeschen von Plan-Autopilot-Code oder -Tests (Report-Modus bleibt nutzbar).
- Keine Schwaechung der fachlichen Gates (plan:check, Architecture-Guard, Contract-Tests bleiben unveraendert).
