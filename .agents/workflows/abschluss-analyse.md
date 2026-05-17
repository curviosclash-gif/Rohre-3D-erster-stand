---
description: Pruefe den zuletzt abgeschlossenen Plan gruendlich gegen Ziele, Evidence und Git-Historie.
---
// turbo

Zweck: Den letzten fachlich abgeschlossenen Planblock auf Vollstaendigkeit pruefen, ohne Abschlussclaims automatisch zu korrigieren. Der Workflow erzeugt einen belastbaren Analysebericht mit konkreten Verbesserungsvorschlaegen und einer moeglichst tiefen Codepruefung der planrelevanten Aenderungen.

Policy-Verweise: `.agents/rules/planning_and_governance.md`, `.agents/rules/git_and_commits.md`, `.agents/rules/token_efficiency_and_tools.md`.

## 0. Entscheidungsrahmen

- Default ist `D0` read-only. Ein lokaler Report unter `tmp/` ist `D1`.
- Aenderungen an `docs/Umsetzungsplan.md`, `docs/plaene/aktiv/VXX.md`, `docs/plaene/CHANGELOG.md`, `.agents/rules/` oder `.agents/workflows/` sind `D3` und brauchen ein User-Gate.
- Keine Checkboxen, Statusfelder, Abschlussnotizen oder Evidence-Claims nachtraeglich setzen, solange die Analyse nur Pruefung angefordert hat.
- Wenn ein Findings-Fix vorgeschlagen wird, erst am Ende als Option klassifizieren: `no-op`, `read-only evidence`, `optional`, `edit required`.
- Fremde uncommittete Aenderungen nur als Worktree-Risiko nennen; nicht stashen, nicht revertieren, nicht in die Analyse hineincommitten.

## 1. Kandidat bestimmen

Quellen mindestens zweifach abgleichen:

- `docs/Umsetzungsplan.md`: Tabellen `Abgeschlossene Bloecke`, `Aktive und geplante Bloecke`, Lock-Status und Abhaengigkeiten.
- `docs/plaene/CHANGELOG.md`: juengste Abschluss- oder Stand-Snapshots mit `VXX`, `*.99`, Datum und Evidence.
- `git log -n 30 --oneline --decorate --date=short`: juengste Commits mit Plan-/Abschlussbezug.
- Optional bei Unsicherheit: `npm run plan:context:check` oder `node scripts/plan-context-report.mjs --check`.

Bestimme den Kandidaten mit begruendeter Confidence:

- `high`: Master, Changelog und Git-Historie zeigen denselben zuletzt abgeschlossenen Block.
- `medium`: zwei Quellen stimmen ueberein, eine Quelle ist unklar oder aelter.
- `low`: Quellen widersprechen sich; dann nur Findings reporten und vor weiteren Schritten nachfragen.

Wenn mehrere Bloecke am selben Datum geschlossen wurden, den juengsten Commit mit Plan-/Scope-Bezug als Tiebreaker nutzen und den verworfenen Kandidaten als offene Annahme nennen.

## 2. Planziele extrahieren

Aus `docs/plaene/aktiv/VXX.md` nur die relevanten Abschnitte lesen:

- Frontmatter: `status`, `current_phase`, `depends_on`, `scope_files`, `scope_overlap_allowed_with`.
- Zielbild, DoD, Nicht-Ziele, Risiken und Abschlussphase `*.99`.
- Alle Phasen, die fuer `*.99` oder offene Risiken referenziert werden.
- Abschluss-Evidence, Gate-Kommandos, Test-/Build-Verweise und Changelog-Referenzen.

Erzeuge intern eine Zielmatrix:

| Ziel/DoD | Erwartete Evidence | Plan-Claim | Git-/Test-Evidence | Bewertung |
| --- | --- | --- | --- | --- |

Bewertungen: `covered`, `partly-covered`, `claim-only`, `missing`, `contradicted`, `out-of-scope`.

## 3. Git-Historie abgleichen

Den Plan nicht nur nach Text, sondern nach realen Aenderungen pruefen:

- `git log --oneline --decorate --date=short -- docs/plaene/aktiv/VXX.md docs/Umsetzungsplan.md docs/plaene/CHANGELOG.md`
- `git log --oneline --decorate --date=short --grep="VXX\\|XX\\."`
- Fuer `scope_files`: `git log --oneline --decorate --date=short -- <scope_files>`
- Fuer relevante Commits: `git show --stat --summary <commit>` und bei Bedarf `git show --name-only <commit>`.
- Bei grossen oder runtime-nahen Scopes: `node scripts/query-knowledge-graph.mjs impact-for-file <scope_file> --json` fuer die wichtigsten Dateien.

Prueffragen:

- Gibt es Commits, die jedes zentrale Ziel plausibel beruehren?
- Stimmen geaenderte Dateien mit `scope_files` und DoD ueberein?
- Gibt es Plan-Claims ohne zuordenbaren Commit, Testreport oder Changelog-Beleg?
- Gibt es Commits im Scope, die im Planabschluss nicht erwaehnt werden?
- Wurden Risiken, Nicht-Ziele oder Legacy-/Fallback-Pfade im Abschluss sauber abgegrenzt?
- Wurden `*.99`-Gates erst nach den vorausgehenden Phasen geschlossen?

## 4. Vollstaendigkeitspruefung

Gruendlich pruefen, aber Ergebnisse kompakt halten:

- Statuskonsistenz: Master, Blockfile, Lock-Status, Changelog und Dependencies.
- Phasenkonsistenz: alle Muss-Phasen vor `*.99` abgeschlossen; keine uebersprungenen `open`-Subphasen.
- DoD-Abdeckung: jedes Ziel hat produktive Evidence, Test-/Gate-Evidence oder klaren dokumentierten Nicht-Scope.
- Evidence-Qualitaet: Commands mit Ergebnis, Commit-/Datei-Bezug, keine reinen Absichtssaetze.
- Runtime-/Produktwirkung: Desktop-App priorisiert; Demo-only Abweichungen klar markiert.
- Test-Ownership: keine nicht gelaufenen Tests als PASS zaehlen; deferred Tests mit Grund und Risiko benennen.
- Dead-Code-/Legacy-Regeln: kein Sunset-Claim ohne Nachfolger- und Konsumentenbeleg.
- Folgeblock-Risiko: offene Findings muessen entweder als Follow-up, Intake, Risiko oder bewusster Nicht-Scope sichtbar sein.

## 5. Codepruefung

Die Codepruefung ist Pflicht, sobald der abgeschlossene Plan `src/`, `tests/`, `scripts/`, `electron/`, `editor/`, `data/` oder runtime-nahe Konfiguration beruehrt. Sie bleibt planbezogen, soll aber so tief wie praktikabel sein.

### 5.1 Code-Scope bilden

- Aus `scope_files`, relevanten Commits und Graph-Impact eine Code-Dateiliste bilden.
- Fuer jeden relevanten Commit mindestens `git show --stat --summary <commit>` und `git show --name-only <commit>` lesen.
- Fuer zentrale oder riskante Commits die Diffs lesen: `git show --find-renames --find-copies --stat --patch <commit> -- <relevante_pfade>`.
- Wenn ein Commit sehr gross ist, nach Verantwortung schneiden: Runtime, UI, Tests, Scripts, Daten/Contracts, Electron, Editor.
- Nicht nur Dateien mit Planbezug pruefen: auch direkt mitgeaenderte Tests, Contracts, Fixtures, JSON-Daten und Scripts lesen.
- Bei unklarer Wirkung `node scripts/query-knowledge-graph.mjs impact-for-file <path> --json`, `event-flow`, `critical-path-health` oder `coverage-report` nutzen.

### 5.2 Review-Fragen

Code wie in einem Review gegen den Plan lesen:

- Erfuellt der produktive Pfad wirklich das DoD oder nur ein Test-/Adapter-/Doku-Pfad?
- Gibt es neue Bypaesse, globale Zugriffe, Fallbacks, Legacy-Shims oder parallele Alternativpfade?
- Sind State-, Lifecycle-, Async-, Dispose-, Event- und Fehlerpfade stabil?
- Sind Inputs, Grenzen, Security-/Path-/HTML-/IPC-/Network-Risiken und Datenmigrationen abgesichert?
- Sind Contracts, Versionen, Schema-/Descriptor-/Preset-Felder und Migrationspfade konsistent?
- Sind Tests nah genug am produktiven Pfad, oder pruefen sie nur isolierte Helfer?
- Gibt es fehlende negative Tests, Regression-Tests oder Ratchets fuer das konkret behobene Risiko?
- Ist Desktop-App-Verhalten primaer abgesichert und Demo-/Browser-Verhalten korrekt abgegrenzt?
- Entstehen Performance-, Speicher-, Rebuild-, Listener-, Timer- oder Resource-Leak-Risiken?
- Sind Fehlerbehandlung, Logging und Diagnostics hilfreich, ohne sensible Daten oder Rauschen zu erzeugen?
- Gibt es Code, der den Plan zwar schliesst, aber Folgeblock-Arbeit erschwert oder verdeckte technische Schuld erzeugt?

### 5.3 Code-Findings

Findings muessen konkrete Datei-/Zeilen- oder Commit-Belege haben:

- `P0`: produktiver Bug, Security-/Datenverlust-Risiko, Abschlussziel real nicht erfuellt.
- `P1`: plausibler Runtime-/Lifecycle-/Contract-Bug oder fehlender Test fuer kritischen Pfad.
- `P2`: Wartbarkeits-, Edge-Case-, Test- oder Legacy-Risiko mit begrenztem Blast-Radius.
- `P3`: Lesbarkeit, kleine Nachschaerfung oder bessere Diagnose.

Wenn keine Code-Findings gefunden werden, explizit sagen: `Keine planrelevanten Code-Findings gefunden`, plus verbleibende Test-/Review-Grenzen.

### 5.4 Test- und Gate-Abgleich

- Aus `.agents/test_mapping.md` nur die fuer die beruehrten Codepfade passenden Tests bestimmen.
- Gelaufene Tests nur als Evidence zaehlen, wenn Ergebnis und Zeitpunkt klar sind.
- Nicht gelaufene, aber naheliegende Tests als `not-checked` oder Verbesserungsvorschlag nennen.
- Keine Voll-Suite automatisch starten, ausser der User hat das explizit erlaubt oder der Abschluss-Gate es verlangt.
- Bei Testluecken unterscheiden: `missing-test`, `deferred-test`, `weak-test`, `wrong-layer-test`, `stale-test`.

Bei Widerspruechen keine Plaene aendern. Findings nach Schwere sortieren:

- `P0`: Abschlussclaim fachlich falsch oder produktiver Pfad unbewiesen.
- `P1`: DoD-/Gate-/Status-Widerspruch mit realem Plan- oder Umsetzungsrisiko.
- `P2`: Evidence unvollstaendig, aber Ziel wahrscheinlich erfuellt.
- `P3`: Dokumentationsschaerfung oder bessere Nachvollziehbarkeit.

## 6. Verbesserungsvorschlaege

Jeder Vorschlag braucht:

- Ziel: welche Luecke wird geschlossen?
- Evidence-Pfad: welche Datei, welcher Commit, welcher Command oder welcher Report kann den Vorschlag belegen?
- Eingriffsklasse: `read-only evidence`, `optional`, `edit required`.
- Decision-Klasse: meist `D2` fuer kleine Doku-Schaerfung, `D3` fuer Plan-/Governance-Status.
- Kleinstes Gate: z. B. `npm run plan:check`, `npm run docs:check`, `npm run gates:pre-commit`.
- Risiko, falls nichts getan wird.

Keine neue aktive Planarbeit erfinden. Wenn ein Follow-up noetig ist, bevorzugt einen Intake-Vorschlag unter `docs/plaene/neu/` nur nach User-Gate; im Analysebericht reicht eine konkrete Draft-Empfehlung.

## 7. Verifikation

Read-only Abschluss:

- `npm run plan:check`
- Bei Docs-/Governance-Drift-Verdacht: `npm run docs:check`
- Bei Graph-/Scope-Fragen: passende `node scripts/query-knowledge-graph.mjs ...` Query nennen oder ausfuehren.

Wenn ein Report unter `tmp/` geschrieben wurde, im Final den Pfad nennen. Wenn keine Datei geschrieben wurde, Findings direkt im Chat ausgeben.

## 8. Reportformat

Standardformat:

```text
Abschlussanalyse: VXX - <Titel>
Confidence: high|medium|low
Quellen: <Master>, <Blockfile>, <Changelog>, <Git>

Kurzfazit:
- <1-3 Saetze>

Findings:
- [P1] <Titel> - <konkreter Beleg> - <Risiko>

Zielmatrix:
- <DoD/Ziel>: <covered|partly-covered|claim-only|missing|contradicted> - <Evidence>

Git-Abgleich:
- Relevante Commits: <hashes/messages>
- Scope-Abdeckung: <kurz>
- Nicht belegte Claims: <kurz oder none>

Codepruefung:
- Gepruefte Codepfade: <src/tests/scripts/...>
- Diff-/Commit-Review: <kurz>
- Code-Findings: <P0-P3 oder none>
- Testabdeckung: <gelaufen / naheliegend nicht gelaufen / Luecken>

Verbesserungsvorschlaege:
- <Vorschlag> (Klasse: <...>, Gate: <...>, Risiko wenn offen: <...>)

Offene Annahmen:
- <nur echte Unsicherheiten>

Ausgefuehrte Checks:
- <command> -> PASS|FAIL|BLOCKED
```
