---
id: V145
title: Fallow Code-Intelligence-Pilot fuer AI-Diffs und Repo-Qualitaetsradar
status: draft
decision_class: D3
priority: P2
owner: frei
workstream: repo-governance
affected_area: repo-code-intelligence-ai-audit-tooling
depends_on:
  - V125.99
  - V126.99
  - V138.99
soft_depends_on:
  - V90.99
  - V141.3
  - V142.3
  - V143.1
blocked_by: []
proposed_plan_file: docs/plaene/aktiv/V145.md
scope_files:
  - docs/plaene/neu/Feature_Fallow_Code_Intelligence_Pilot_V145.md
  - package.json
  - package-lock.json
  - .fallowrc.jsonc
  - knip.json
  - tests/fallow-config.contract.test.mjs
  - docs/referenz/ai_project_onboarding.md
  - .agents/workflows/cleanup.md
  - .github/workflows/ci.yml
  - .husky/pre-commit
  - scripts/agent-preflight.mjs
scope_overlap_allowed_with:
  - V141
  - V142
  - V143
scope_reference_files:
  - AGENTS.md
  - .agents/rules/planning_and_governance.md
  - .agents/rules/code_quality_and_debugging.md
  - .agents/rules/token_efficiency_and_tools.md
  - .agents/workflows/plan.md
  - .agents/workflows/cleanup.md
  - docs/plaene/aktiv/V90.md
  - docs/plaene/aktiv/V125.md
  - docs/plaene/aktiv/V126.md
  - docs/plaene/aktiv/V138.md
  - docs/plaene/aktiv/V141.md
  - docs/plaene/aktiv/V142.md
  - scripts/check-ai-diff-audit.mjs
verification:
  - npm run fallow:config
  - npm run fallow:audit -- --base HEAD~5
  - npm run fallow:dead-code
  - npm run fallow:dupes
  - npm run fallow:health
  - node --test tests/fallow-config.contract.test.mjs
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
updated_at: 2026-06-07
external_sources:
  - https://fallow.tools
  - https://docs.fallow.tools
  - https://github.com/fallow-rs/fallow
---

# Fallow Code-Intelligence-Pilot fuer AI-Diffs und Repo-Qualitaetsradar

## Kurzfassung

Fallow ist ein MIT-lizenziertes Code-Intelligence-Tool fuer JavaScript und
TypeScript. Es kombiniert Dead-Code-, Dependency-, Zyklus-, Duplikations-,
Komplexitaets-, Hotspot- und Changed-only-Audit-Signale. Die CLI stellt
zusaetzlich LSP-, MCP-, Git-Hook- und Agent-Hook-Pfade bereit.

Fuer Curvios ist der groesste Nutzwert nicht ein weiterer pauschaler
Pre-Commit-Blocker, sondern ein kalibriertes Radar:

- `fallow audit --gate new-only` kann neue AI-/PR-Regressionshinweise von
  geerbtem Altbestand trennen.
- `fallow dupes` findet konkrete Querschnittsduplikate, die bereits zu
  geplanten Architektur- oder Tooling-Bloecken passen.
- `fallow health --hotspots` verbindet Komplexitaet mit Git-Churn und
  bestaetigt bekannte Risikoflaechen.
- `fallow dead-code` kann Cleanup-Kandidaten liefern, darf aber wegen
  dynamischer Einstiege, Contract-first-Pfade und Test-/Tooling-Consumer
  niemals alleinige Loesch-Evidence sein.

Der Pilot behaelt `knip.json`, bestehende Architecture-/AI-Diff-Gates und
Repo-Governance unveraendert. Erst nach einer False-Positive- und
Laufzeit-Kalibrierung wird entschieden, ob Fallow advisory in CI oder in einen
Agenten-Workflow aufgenommen wird.

## Einordnungsentscheidung

### Empfohlene Variante: eigener Folgeblock V145

V145 ist ein eigenstaendiger P2-Pilot nach V125/V126/V138.

Begruendung:

- V138 ist abgeschlossen und prueft objektive staged Diff-Risiken,
  Commit-Envelopes und Gate-Bypass-Muster. Fallow bewertet dagegen
  Codegraph, Komplexitaet, Dupes und Erreichbarkeit. Eine Erweiterung von V138
  wuerde dessen bewusst kleinen deterministischen Scope aufweichen.
- V141 automatisiert Finding-, Plan- und Doku-Drift. Fallow analysiert
  produktiven JS-/TS-Code und ist keine Finding- oder Doku-Source-of-Truth.
- V142 automatisiert Knowledge-Graph-Drift. Fallow darf den Curvios-Graph
  ergaenzen, ersetzt aber weder Graph-Generator noch Graph-Gates.
- V126 enthaelt einen historischen Handoff fuer einen damaligen
  `V127 Repo-weite Tooling-Gates`-Folgeblock. Die ID V127 ist inzwischen
  kanonisch mit Repo-/Plan-Map belegt. V145 vermeidet diese Identitaets- und
  Scope-Kollision.

### Verworfene Varianten

| Variante | Entscheidung | Grund |
| --- | --- | --- |
| V138 nachtraeglich erweitern | nein | Block ist abgeschlossen; Fallow ist breiter und nicht rein deterministischer Diff-Klassifikator. |
| In V141 aufnehmen | nein | Doku-/Finding-Drift und Code-Intelligence haben andere Datenquellen, Laufzeiten und Fail-Politiken. |
| In V142 aufnehmen | nein | Graph-Sync-Schutz darf nicht mit externem Codequalitaets-Tool gekoppelt werden. |
| Knip sofort ersetzen | nein | `fallow migrate` uebersetzt nicht alle Knip-Felder; sieben Felder wurden im Dry-run ausgelassen. |
| Sofortiger Codex-/Git-Hook | nein | Fallow wuerde `AGENTS.md` oder den bestehenden Husky-Hook veraendern; das ist D3 und erzeugt Doppelgates. |

## Untersuchte Baseline

### Tool und Migration

- Gepruefte Version am 2026-06-06: `fallow@2.89.0`.
- Paketmetadaten: MIT, Node `>=16`, CLI-Binaries `fallow`, `fallow-lsp`,
  `fallow-mcp`.
- `fallow migrate --from knip.json --dry-run --jsonc` uebernahm Entry-Points,
  Ignore-Patterns, Dependency-Ausnahmen und zentrale Regeln.
- Nicht migriert wurden unter anderem `knip.project`, `ignoreBinaries`,
  `ignoreUnresolved` sowie mehrere Knip-Regelklassen. Knip und Fallow sind
  daher im Pilot keine austauschbaren Implementierungen.

### Curvios-Pilotkonfiguration

Der read-only Spike verwendete eine temporaere Konfiguration unter
`tmp/fallow-curvios-pilot.json`.

Globale Ausschluesse:

- `tmp/**`, `.codex_tmp/**`, `dist/**`, `dist-app/**`
- `docs/**`, `archive/**`
- Playwright-/Test-Resultate
- Training-, Log-, Output- und Video-Artefakte
- Android-Build-Verzeichnisse

Dupe-/Health-Ausschluesse:

- `tests/**`
- bekannte generierte Map-/Vehicle-Dateien

Diese Trennung ist notwendig: Der ungefilterte `fallow list`-Lauf entdeckte
auch archivierte JavaScript-Dateien unter `docs/archive/**` und weitere
nicht-produktive Artefakte.

### Messwerte

| Signal | Ergebnis | Bewertung |
| --- | --- | --- |
| Projekt-Discovery | 968 Dateien, 144 Entry-Points, 3 Workspaces | Gute breite Erkennung, aber ohne Curvios-Ignore zu laut. |
| Dead Code, Production-Profil | 84 Dateien, 459 Exporte, 1 unused Dependency, 1 unlisted Dependency, 2 Export-Duplikate, 2 Zyklen | Hoher Kalibrierungsbedarf; kein Loeschbeweis. |
| Dupes | 1.981 Zeilen in 59 Dateien, 1,1 Prozent | Repo-weit niedrig; Top-Gruppen sind als Architekturhinweise brauchbar. |
| Health | Score 70/B, Maintainability 84,1, avg cyclomatic 4,1, p90 9 | Solide Basis mit klaren Hotspots, kein Grund fuer pauschales Fail-Gate. |
| Changed-only Audit, kalt | 29 Dateien gegen `HEAD~5`, keine neuen Issues, 2 inherited; ca. 56 Sekunden | Zu teuer fuer jeden Pre-Commit. |
| Changed-only Audit, warm | gleicher Scope; keine neuen Issues; ca. 9,4 Sekunden | Als expliziter lokaler/Agenten-Check brauchbar. |

### Relevante Treffer

Duplikationshinweise:

- `tools/plan-map/viewer.js` gegen `tools/repo-map/viewer.js`
- `electron/map-tools/server.cjs` gegen `electron/static-server.cjs`
- `src/state/RoundEndCoordinator.js` gegen
  `src/ui/MatchFlowRoundEndCoordinator.js`
- `src/mobile-arcade/MobileArcadeApp.js` gegen
  `src/mobile-classic/MobileClassicApp.js`
- wiederholte Training-Argument-/Config-Bloecke in `scripts/**` und
  `trainer/**`

Hotspots:

- `src/core/GameRuntimeFacade.js`
- `src/core/main.js`
- `src/entities/EntityManager.js`
- `src/ui/UIManager.js`
- `src/ui/UIStartSyncController.js`
- `src/ui/menu/MenuGameplayBindings.js`

Diese Treffer korrespondieren mit vorhandenen Architektur-, Mobile- und
Repo-Tooling-Bloecken. Fallow erzeugt damit keine neue Refactor-Autoritaet,
liefert aber zusaetzliche Priorisierungs-Evidence.

### False-Positive- und Interpretationsrisiken

- Production-Modus kann Electron-/Map-Tools-Dateien als unbenutzt melden,
  obwohl sie ueber Tests, HTML, Launcher oder dynamische Pfade erreichbar sind.
- Contract-first-Dateien besitzen absichtlich Exporte fuer geplante oder
  testseitige Consumer. Ein unbenutzter Export kann `plan-drift` statt Totcode
  bedeuten.
- `@capacitor/android` ist als CLI-/Build-Dependency nicht zwingend durch einen
  Quellimport sichtbar.
- `minimatch` wurde als unlisted Dependency erkannt und wird tatsaechlich in
  `.agents/scripts/scope-validator.js` importiert. Das ist ein plausibler
  Dependency-Hygiene-Befund, aber noch keine Freigabe fuer einen Package-Edit.
- Fallow meldete zwei echte Importzyklen um
  `AppInitializerLifecycle`, `AppInitializerTestHooks` und `TestApiBridge`.
  Auch diese brauchen Code-/Runtime-Evidence vor einer Aenderung.

## Ziel

- Fallow reproduzierbar als gepinnte Dev-Dependency integrieren.
- Eine Curvios-spezifische `.fallowrc.jsonc` mit getrennten Runtime-, Tooling-,
  Test-, Generated- und Archivregeln schaffen.
- Drei klar getrennte Nutzungsprofile anbieten:
  - Changed-only Audit fuer neue Diffs.
  - Advisory Repo-Radar fuer Dead Code, Dupes und Health.
  - Gezielt tracebare Einzelbefunde fuer Cleanup-/Refactor-Planung.
- Knip waehrend des Piloten behalten und Unterschiede dokumentieren.
- Fallow-Ergebnisse in die vorhandene Dead-Code-Governance einordnen:
  Finding -> Consumer-/Graph-/Code-Abgleich -> Kandidatenklasse -> User-Gate.
- Erst nach gemessener Rausch- und Laufzeit-Evidence ueber CI, Agent-Preflight,
  LSP oder MCP entscheiden.

## Nicht-Ziel

- Kein automatisches `fallow fix`.
- Keine automatische Loeschung oder Refactor-Erzeugung.
- Kein Ersatz fuer `architecture:guard`, `check:architecture:staged`,
  `check:ai-diff-audit`, `graph:check`, `gates:pre-commit` oder Tests.
- Kein Entfernen von `knip.json` im Pilot.
- Kein harter Full-repo-Dead-Code- oder Health-Gate.
- Keine direkte Fallow-Aenderung an `AGENTS.md`.
- Keine automatische Installation von Fallow-Git-/Codex-Hooks.
- Kein MCP- oder LSP-Pflichtsetup fuer alle Entwickler.
- Keine Nutzung der optional bezahlten Runtime-Intelligence im ersten Block.
- Keine produktiven Runtime-, UI-, Gameplay-, Physik-, Multiplayer-,
  Recording- oder Bot-Training-Aenderungen.

## Scope-Klassifikation

| Pfad/Oberflaeche | Klasse | Regel |
| --- | --- | --- |
| dieser Intake-Draft | edit required | Einzige aktuelle Repo-Aenderung; keine Master-Autoritaet. |
| `package.json`, `package-lock.json` | edit required nach Intake | Exakte Fallow-Version und explizite Scripts; mit V141/V142 serialisieren. |
| `.fallowrc.jsonc` | edit required nach Intake | Kuratierte Config, keine blind migrierte Knip-Kopie. |
| `tests/fallow-config.contract.test.mjs` | edit required nach Intake | Config-/Script-/Ignore-Vertrag, keine Fallow-Engine-Reimplementierung. |
| `knip.json` | read-only evidence | Im Pilot behalten; nur Paritaetsquelle. |
| `docs/referenz/ai_project_onboarding.md` | optional | Lokale Kommandos dokumentieren, falls Onboarding wirklich betroffen ist. |
| `.agents/workflows/cleanup.md` | optional, D3 | Erst nach Pilot-Evidence Fallow als zusaetzliches Hinweiswerkzeug aufnehmen. |
| `.github/workflows/ci.yml` | optional, D3 | Warnender Changed-only Job nach Kalibrierung; V142-Scope beachten. |
| `.husky/pre-commit` | no-op im Pilot | Kalter Lauf zu teuer; bestehende Hook-Kette nicht verdoppeln. |
| `scripts/agent-preflight.mjs` | no-op im Pilot | V138 bleibt blockierender Agent-Gate-Pfad; Fallow zunaechst explizit. |
| `AGENTS.md` | no-op | `fallow hooks --target agent --agent codex` nicht ausfuehren. |
| Produktcode-Findings | read-only evidence | Findings nur klassifizieren und an passende Bloecke uebergeben. |

## Architecture Acceptance

| Bereich | Entscheidung |
| --- | --- |
| Betroffene Schichten | Root-Tooling, optionale CI-/Agenten-Verifikation; kein Produktpfad. |
| Erlaubte Zielpfade | `.fallowrc.jsonc`, Root-NPM-Scripts, kleiner Config-Contracttest, optionale Referenzdoku. |
| Verbotene Legacy-Surfaces | Kein neuer globaler Bypass, kein Auto-Fix, kein paralleler Git-Hook, keine Schatten-Governance. |
| Neue Dependency-Kanten | `package scripts -> fallow CLI`; optional spaeter `CI -> npm run fallow:audit`. |
| Contract-/Snapshot-Erweiterung | Test prueft Version/Scriptnamen, Pflicht-Ignores, warn-before-fail und Verbot direkter Hooks/Fixes. |
| Guard-Signal | `fallow:config`, `fallow:audit`, advisory `dead-code`, `dupes`, `health`; bestehende Repo-Gates bleiben fuehrend. |
| Ratchet-Auswirkung | Additiv. Kein bestehendes Architecture-, Graph-, Plan-, Docs- oder AI-Diff-Gate wird abgeschwaecht. |

## Vorgeschlagene Scripts

Die exakten Namen werden in 145.1 finalisiert. Zielbild:

```json
{
  "fallow:config": "fallow config",
  "fallow:audit": "fallow audit --gate new-only --format compact",
  "fallow:dead-code": "fallow --production dead-code --top 30",
  "fallow:dupes": "fallow --production dupes --top 20",
  "fallow:health": "fallow --production health --hotspots --targets --report-only --top 20"
}
```

Regeln:

- Kein Fallow-Script wird in `prebuild` aufgenommen.
- Kein Full-repo-Script ist im Pilot blockierend.
- Der Caller setzt fuer Audit einen expliziten Base-Ref oder dokumentiert die
  Auto-Detection.
- CI braucht ausreichende Git-Historie; bei GitHub Actions muss
  `fetch-depth` oder ein Event-SHA-Pfad bewusst festgelegt werden.

## AI-Ausfuehrungsmatrix

| Phase | Modus | Erlaubt ohne Rueckfrage | Stop-/Rueckfragepflicht |
| --- | --- | --- | --- |
| 145.1 Paket, Config und lokale Scripts | `[REVIEW]` | Read-only CLI-/Schema-Checks | `package.json`, Lockfile und neue Config nach Intake |
| 145.2 False-Positive- und Paritaetskalibrierung | `[AUTO]` | Reports, Trace, Knip-/Fallow-Vergleich ohne produktive Edits | Suppressions in Produktcode oder Dependency-Aenderungen |
| 145.3 Workflow-Handoff | `[REVIEW]` | Vorschlag fuer Cleanup-/Onboarding-Nutzung | Rule-/Workflow-/Agent-Preflight-Aenderung |
| 145.4 Advisory CI | `[USER-GATE]` | Dry-run, Laufzeitmessung, YAML-Patchvorschlag | CI-/Hook-Edit oder neuer Blocker |
| 145.5 Gate-/Tool-Surface-Entscheidung | `[USER-GATE]` | Vergleich von CLI, LSP, MCP und Agent-Hook | AGENTS-, Codex-, MCP-, Git-Hook- oder hard-fail Integration |
| 145.99 Abschluss | `[USER-GATE]` | Abschlussmatrix und Evidence-Vorschlag | Master-/Aktivplan-/Changelog-Finalisierung |

## Definition of Done

- [ ] DoD.1 Fallow ist mit einer explizit gepinnten Version als
  Dev-Dependency installiert; Upgrade-Drift wird nicht still uebernommen.
- [ ] DoD.2 `.fallowrc.jsonc` trennt produktiven Code, Tooling, Tests,
  Generated-Code, Archive und Build-/Runtime-Artefakte nachvollziehbar.
- [ ] DoD.3 Changed-only Audit, Dead-Code-Radar, Dupe-Radar und Health-Radar
  sind getrennte Scripts mit klarer Fail-/Advisory-Semantik.
- [ ] DoD.4 `knip.json` bleibt waehrend des Piloten erhalten; Paritaet und
  nicht migrierbare Felder sind dokumentiert.
- [ ] DoD.5 Mindestens je drei Dead-Code-, Dupe- und Health-Findings sind als
  `useful`, `false-positive`, `plan-drift` oder `needs-consumer-proof`
  klassifiziert.
- [ ] DoD.6 Kein Fallow-Finding autorisiert allein eine Loeschung. Fuer
  Removes gelten weiter Nachfolger-, Consumer-, Test- und User-Gate-Regeln.
- [ ] DoD.7 Kalter und warmer Changed-only Lauf sind gemessen; ein
  Pre-Commit-/Preflight-Einsatz bleibt bei unklarem Budget deaktiviert.
- [ ] DoD.8 `tests/fallow-config.contract.test.mjs` schuetzt Pflicht-Ignores,
  Scriptsemantik, Knip-Koexistenz und das Verbot automatischer Hooks/Fixes.
- [ ] DoD.9 Optionaler CI-Rollout startet advisory/new-only und wird nicht mit
  historischen Full-repo-Findings blockierend.
- [ ] DoD.10 MCP, LSP, Codex-Agent-Hook und bezahlte Runtime-Intelligence sind
  explizit entschieden oder deferred.
- [ ] DoD.99 Bestehende Plan-, Docs-, Graph-, Architecture- und
  AI-Diff-Gates sind gruen; Not-checked und Restrisiken sind benannt.

## Phasen

### 145.1 Reproduzierbarer lokaler Pilot

status: open
goal: Fallow ohne Hook-/CI-Nebenwirkungen reproduzierbar integrieren

- [ ] 145.1.1 `fallow@2.89.0` oder die bei Intake erneut verifizierte Version
  exakt als Dev-Dependency pinnen.
- [ ] 145.1.2 `.fallowrc.jsonc` aus Knip-Migration und Curvios-Pilot-Ignores
  erstellen; `fallow config` muss die erwartete Datei laden.
- [ ] 145.1.3 Lokale Scripts fuer Config, Changed-only Audit, Dead Code,
  Dupes und Health anlegen.
- [ ] 145.1.4 Sicherstellen, dass weder `prepare`, `prebuild`,
  `.husky/pre-commit` noch `agent:preflight` Fallow automatisch aufrufen.
- [ ] 145.1.5 `.fallow/`-Cacheverhalten pruefen; keine Cache-/Snapshot-Flut
  tracken.

### 145.2 Entry-, Ignore- und Paritaetskalibrierung

status: open
goal: Nutzbare Findings von Curvios-spezifischem Rauschen trennen

- [ ] 145.2.1 Runtime-, Electron-, Editor-, Tool-, Prototype-, Training- und
  Test-Einstiege inventarisieren.
- [ ] 145.2.2 Production- und Tooling-Profil getrennt pruefen; HTML-/Launcher-,
  CLI- und dynamische Einstiege nicht pauschal als Totcode behandeln.
- [ ] 145.2.3 Knip/Fallow-Matrix fuer Files, Exports, Dependencies,
  Unresolved-Imports und Binaries dokumentieren.
- [ ] 145.2.4 Mindestens die Pilotfaelle `@capacitor/android`, `minimatch`,
  AppInitializer-Zyklen, Hangar-Contracts und Electron-Map-Tools
  nachvollziehen.
- [ ] 145.2.5 Keine Inline-Suppression in Produktcode ohne konkreten
  False-Positive-Beleg und Review.

### 145.3 Finding-Handoff an bestehende Governance

status: open
goal: Fallow als Evidence-Quelle, nicht als neue Entscheidungshoheit verankern

- [ ] 145.3.1 Dead-Code-Findings auf die bestehenden Klassen
  `duplicate-backed`, `legacy-with-replacement`, `contract-first/plan-drift`
  und `unverified-altpath` abbilden.
- [ ] 145.3.2 Dupe-/Health-Findings passenden aktiven oder kuenftigen
  Architektur-/Tooling-Bloecken zuordnen, ohne deren Scope zu erweitern.
- [ ] 145.3.3 Entscheiden, ob `.agents/workflows/cleanup.md` Fallow nach Knip
  als zusaetzliches Hinweiswerkzeug nennen soll.
- [ ] 145.3.4 Onboarding nur ergaenzen, wenn die lokalen Commands stabil und
  plattformuebergreifend reproduzierbar sind.

### 145.4 Advisory CI-Pilot

status: open
goal: Neue Regressionen sichtbar machen, ohne Altbestand zum Merge-Blocker zu machen

- [ ] 145.4.1 GitHub-Actions-Base-Ref und Checkout-Historie fuer PR und
  `main`-Push festlegen.
- [ ] 145.4.2 Changed-only Audit zuerst advisory ausfuehren und Ausgabe als
  Log, Markdown oder SARIF bereitstellen.
- [ ] 145.4.3 Laufzeit, Cache-Verhalten und False Positives ueber mehrere
  echte Diffs erfassen.
- [ ] 145.4.4 V142-CI-Scope serialisieren; keine parallelen Edits an
  `.github/workflows/ci.yml`.
- [ ] 145.4.5 Erst nach separatem User-Gate entscheiden, ob `new-only`
  blockierend werden darf.

### 145.5 LSP-, MCP-, Agent- und Hook-Entscheidung

status: open
goal: Optionale Oberflaechen bewusst gegen bestehende Curvios-Pfade abgrenzen

- [ ] 145.5.1 VS-Code-LSP als rein lokale Developer-Option bewerten.
- [ ] 145.5.2 `fallow-mcp` nur gegen V122/V143 und bestehende Tool-/Skill-
  Governance bewerten; keine automatische Registrierung.
- [ ] 145.5.3 `fallow hooks install --target agent --agent codex` ablehnen
  oder separat D3-gated freigeben; kein stiller `AGENTS.md`-Block.
- [ ] 145.5.4 Bestehenden Husky-Hook nicht doppeln; kaltes Zeitbudget und
  V142-Ownership beachten.
- [ ] 145.5.5 Optional bezahlte Runtime-Intelligence als separaten
  Produkt-/Datenschutz-/Kostenentscheid behandeln.

### 145.99 Abschluss-Gate

status: open
goal: Pilot mit klarer Behalte-, Ausbau- oder Rueckbauentscheidung abschliessen

- [ ] 145.99.1 `npm run fallow:config` und alle lokalen Fallow-Scripts liefern
  reproduzierbare, klassifizierte Ergebnisse.
- [ ] 145.99.2 `node --test tests/fallow-config.contract.test.mjs` ist gruen.
- [ ] 145.99.3 `npm run architecture:guard` bleibt gruen oder meldet einen
  klar fremden Blocker; keine produktiven Dateien wurden geaendert.
- [ ] 145.99.4 `npm run plan:check`, `npm run docs:sync`,
  `npm run docs:check` und `npm run gates:pre-commit` sind gruen.
- [ ] 145.99.5 Abschlussentscheidung lautet explizit:
  `keep-local-advisory`, `promote-changed-only-ci`, `defer` oder `remove`.
- [ ] 145.99.6 Not-checked nennt mindestens: keine automatische Loeschung,
  keine Vollsuite, keine Runtime-Intelligence und keine unfreigegebene
  Hook-/Agent-/MCP-Integration.

## Risiken

| Risiko | Stufe | Gegenmassnahme |
| --- | --- | --- |
| False Positives fuehren zu falschen Removes | hoch | Fallow nur als Hinweis; Consumer-/Graph-/Code-/Test-Beleg und User-Gate bleiben Pflicht. |
| Dynamische Electron-/HTML-/CLI-Einstiege fehlen | hoch | Entry-Inventar und getrennte Production-/Tooling-Profile. |
| Contract-first-Code wird als Totcode missverstanden | hoch | `contract-first/plan-drift` explizit klassifizieren; keine Auto-Fixes. |
| Knip und Fallow erzeugen doppelte Arbeit | mittel | Zeitlich begrenzte Paritaetsphase und klare Behalteentscheidung in 145.99. |
| Pre-Commit wird langsam | hoch | Kein Hook im Pilot; kalt ca. 56 s, warm ca. 9,4 s als aktuelle Evidence. |
| Fallow-Version aendert Findings | mittel | Exakte Version und Lockfile; Upgrade nur als eigener Tooling-Slice. |
| CI-Audit findet Base-Ref nicht | mittel | Checkout-Historie/Event-SHA explizit konfigurieren und testen. |
| V141/V142 kollidieren auf Package/CI | mittel | Scope serialisieren; CI erst in 145.4. |
| Agent-Hook erzeugt Schatten-Governance | hoch | Kein automatischer AGENTS-Edit; V143/V117 bleiben fuehrend. |
| Security-/Supply-Chain-Risiko der Dependency | niedrig/mittel | MIT-/Repo-/Version-Pruefung, Lockfile, `npm audit`, keine Runtime-Dependency. |
| Paid Runtime-Features erzeugen Daten-/Kostenfragen | mittel | Vollstaendig ausserhalb des ersten Blocks; separate Entscheidung. |

## Dependencies und Handoffs

Harte Dependencies:

- `V125.99`: Architecture-Capsule und staged Guard bleiben fuehrend.
- `V126.99`: lokales Tooling-/Delivery-Hardening ist Baseline.
- `V138.99`: Agent-Preflight und deterministisches Diff-Audit bleiben
  bestehender blockierender Agentenpfad.

Weiche Koordination:

- `V90`: Dependency-/Toolchain-Upgrade- und Security-Kontext.
- `V141`: Package-Script-Scope und spaetere Finding-Handoffs.
- `V142`: CI-/Husky-Ownership.
- `V143`: Agent-Skills statt neuer Regeltexte; relevant fuer einen spaeteren
  Fallow-Skill oder MCP-Handoff.

Produktive Findings gehen nicht automatisch in V145-Codearbeit ueber:

- Mobile-App-Duplikate -> V140/V131 pruefen.
- Runtime-/UI-Hotspots -> V96/V118 oder passenden Folgeblock pruefen.
- Repo-/Plan-Map-Duplikate -> V127 pruefen.
- Graph-Tooling-Hotspots -> V124/V142 pruefen.
- Totcode-/Legacy-Kandidaten -> Cleanup-Workflow mit Ersatzbeweis und
  User-Gate.

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`.
- Vorgeschlagene Block-ID: `V145`.
- Vorgeschlagener Workstream: `repo-governance`.
- Vorgeschlagene Prioritaet: `P2`.
- Vorgeschlagenes aktives Planfile:
  `docs/plaene/aktiv/V145.md`.
- Harte Dependencies: `V125.99`, `V126.99`, `V138.99`.
- Soft-/Scope-Koordination: `V90`, `V141`, `V142`, `V143`.
- Manuelle Uebernahme erforderlich.
- Bis zur User-Intake-Entscheidung bleibt diese Datei ein nicht-kanonischer
  Draft; Master, aktive Plaene, Hooks, CI und Agent-Governance bleiben
  unveraendert.

## Evidence und Not-checked

Graph: `scope-collisions`, `impact-for-file package.json`,
`impact-for-file src/mobile-classic/MobileClassicApp.js`, `open-deps V140`;
Confidence: graph-high fuer Scope-/Blockbezug.

RAG: skipped; die Entscheidung beruht auf Video-Transcript, Fallow-CLI,
Package-Metadaten, Knip-Konfiguration, Graph, Master, aktiven Plaenen und Code.

Source-of-truth: Master + aktive VXX-Plaene + Code + CLI-Evidence.

Not-checked:

- Keine produktiven Dateien geaendert.
- Kein `npm install fallow` im Repo und keine Lockfile-Aenderung.
- Kein Knip-Vollvergleich mit persistiertem Report.
- Keine Vollsuite, kein Playwright, kein Build.
- Keine Fallow-Fixes, Suppressions, Hooks, MCP-, LSP- oder Codex-Config.
- Keine CI-Aenderung und keine harte Gate-Entscheidung.
