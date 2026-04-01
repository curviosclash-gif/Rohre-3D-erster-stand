# Planentwurf Umsetzungsplan KI-Lesbarkeit

Stand: 2026-04-01
Status: Entwurf (ueberarbeitet)
Owner: Codex

## Ziel

Der aktive Umsetzungsplan soll fuer KI schneller, billiger und robuster lesbar werden. Ziel ist nicht "mehr Dokumentation", sondern weniger Suchaufwand, weniger Redundanz und eine stabilere Maschinenstruktur.

## Problem im Ist-Zustand

- `docs/Umsetzungsplan.md` mischt Governance, Ownership, Locks, Konflikte, Priorisierung und volle Blockdetails in einer einzigen grossen Datei.
- Dieselbe Information taucht mehrfach auf, zum Beispiel als Tabelle, Fliesstext und Blockbeschreibung.
- Wichtige Fakten sind oft in Prosa versteckt statt in festen Feldern.
- Fuer einen einzelnen Block muss eine KI heute oft ueber viele irrelevante Zeilen springen.
- Aktive und historische Informationen liegen dicht beieinander; das erhoeht Fehlgriffe und Token-Kosten.

## Zielbild

Die Struktur wird in zwei Ebenen geteilt:

1. `docs/Umsetzungsplan.md` wird zum kompakten Master-Index (Uebersicht, Abhaengigkeiten, Lock-Status).
2. Jeder aktive Block bekommt eine eigene kanonische Blockdatei mit festem Schema (Details, DoD, Phasen).

Kuenftige Rollen:

- `docs/Umsetzungsplan.md` — Master-Index: eine Zeile pro Block, Abhaengigkeitstabelle, Lock-Status, Conflict-Log
- `docs/plaene/aktiv/VXX.md` — kanonische Blockdatei: volle Details, DoD, Risiken, Phasen, Verification
- `docs/plaene/neu/*.md` — Intake- und Aenderungsentwuerfe
- `docs/plaene/alt/*.md` — archivierte oder ersetzte Blockstaende

Governance-Anpassung (Pflicht in Phase 1):
Die heutige Regel "Dieser Plan ist die einzige aktive Quelle fuer offene Arbeit" im Master muss sofort umformuliert werden zu: "Dieser Index ist die Uebersicht; die kanonische Quelle fuer Blockdetails ist die jeweilige Datei unter `docs/plaene/aktiv/`." Ohne diese Anpassung entsteht ein Widerspruch zwischen Master und Blockdateien.

## Gestaltungsprinzipien

- Eine Datei beantwortet eine Frage.
- Ein Block lebt in genau einer kanonischen Detaildatei.
- Ein Fakt steht genau einmal.
- Ein Feld hat genau einen Namen.
- Ein Status verwendet genau einen normierten Wert.
- Eine Phase hat genau eine ID und genau einen Ort.
- Prosa ist erlaubt fuer Kontext, aber nicht fuer Steuerdaten.

## Claude-Einbindung

- `CLAUDE.md` bleibt eine Hinweis- und Workflow-Datei fuer Claude-basierte Arbeit.
- `CLAUDE.md` verweist weiterhin explizit auf `AGENTS.md` und `.agents/rules/*` als bindende Governance.
- Wenn der Aufgaben-Workflow auf das Zwei-Ebenen-Modell umgestellt wird, darf `CLAUDE.md` nur den Leseweg spiegeln:
  1. `docs/Umsetzungsplan.md` fuer Uebersicht, Locks und Abhaengigkeiten
  2. `docs/plaene/aktiv/VXX.md` fuer kanonische Blockdetails
- `CLAUDE.md` darf dabei keine konkurrierende Aussage enthalten wie "nur der Master ist die aktive Quelle", sobald Blockdetails offiziell ausgelagert wurden.

## Soll-Struktur fuer den Master-Index

`docs/Umsetzungsplan.md` soll nur diese Bereiche enthalten:

1. Kurze Einleitung mit Stand und Regel-Link
2. Tabelle `Aktive Bloecke`
3. Optional kurze Tabelle `Blockierte Bloecke`
4. Optional: Links auf ausgelagerte Meta-Dateien, falls ein Meta-Bereich spaeter zu gross wird

Nicht mehr im Master:

- volle DoD-Listen (wandern in Blockdatei)
- volle Phasenlisten (wandern in Blockdatei)
- volle Risiko-Register (wandern in Blockdatei)
- lange Parallelisierungsprosa (wird durch Abhaengigkeitstabelle ersetzt)
- ausfuehrliche Datei-Ownership-Tabelle (wandert in Blockdatei `scope_files`)

Verbleiben im Master (kompakt genug):

- Abhaengigkeitstabelle (ersetzt Parallelisierungsprosa)
- Lock-Status-Tabelle (aktuell 7 Zeilen)
- Conflict-Log (aktuell 1-2 Eintraege, append-only; Aufraeum-Regel siehe unten)

Empfohlene Spalten fuer `Aktive Bloecke`:

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V77 | Desktop Vollversion Browser Demo Grenzen | planned | P2 | frei | V74.99 | 77.1 | `docs/plaene/aktiv/V77.md` |

Normregeln fuer den Master:

- genau eine Zeile pro aktivem Block
- keine freien Statussaetze in der Tabelle
- `depends_on` nur als IDs, nicht als Fliesstext
- `current_phase` immer als Phasen-ID
- `plan_file` immer Pflicht
- keine Detailerklaerung laenger als eine Zeile
- kein `next_step` im Master — aendert sich zu oft und fuehrt zu Doppelpflege; wer den naechsten Schritt braucht, oeffnet die Blockdatei

## Soll-Struktur fuer eine Blockdatei

Jede Blockdatei verwendet exakt dieselbe Reihenfolge.

Empfohlenes Schema:

```md
---
id: V77
title: Desktop Vollversion Browser Demo Grenzen
status: planned
priority: P2
owner: none
depends_on:
  - V74.99
blocked_by: []
blocked_until: V74.99
verification:
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
updated_at: 2026-04-01
---

# V77 Desktop Vollversion Browser Demo Grenzen

## Ziel
Ein Satz.

## Nicht-Ziel (Pflichtsektion)
- Kein Browser-Host
- Kein Editor im Demo-Pfad

## Definition of Done
- [ ] DoD.1 ...
- [ ] DoD.2 ...

## Risiken
- R1 | hoch | ...
- R2 | mittel | ...

## Betroffene Pfade
- src/ui/menu/**
- src/core/runtime/**

## Phasen

### 77.1 Produktrollen
status: open
goal: Produktrollen festziehen
output: Surface-Vertrag formuliert

- [ ] 77.1.1 ...
- [ ] 77.1.2 ...

### 77.2 Surface-Vertrag
status: open
goal: Capabilities zentralisieren
output: zentrale Policy definiert

- [ ] 77.2.1 ...
- [ ] 77.2.2 ...

### 77.99 Abschluss-Gate
status: open
goal: Integrations- und Abschluss-Gate

- [ ] 77.99.1 ...
- [ ] 77.99.2 ...
```

## Schreibregeln fuer KI-Freundlichkeit

- Immer feste Heading-Namen verwenden.
- Metadaten immer oben im YAML-Frontmatter sammeln; lange Listen (Pfade, Risiken) gehoeren in Markdown-Sektionen, nicht ins Frontmatter.
- IDs nie umbenennen, sobald sie im Master stehen.
- `depends_on`, `owner`, `status`, `priority` nur mit normierten Werten fuellen.
- `## Nicht-Ziel` ist Pflichtsektion in jeder Blockdatei — explizite Ausschluesse verhindern Scope-Creep durch KI-Agenten.
- Keine fachkritischen Regeln in langen Saetzen verstecken, wenn sie als Liste oder Feld ausdrueckbar sind.
- Keine doppelte Pflege von Risiken, Ownership oder Verification in mehreren Dateien.
- Checkboxen nur fuer echte Arbeitsschritte verwenden, nicht fuer Ueberschriften.
- Jeder abgeschlossene Punkt behaelt das bestehende Evidence-Format.

## Normierte Werte

Empfohlene Statuswerte:

- `planned` — Block ist definiert, aber noch nicht begonnen (Abhaengigkeiten koennen erfuellt oder offen sein)
- `active` — Lock ist vergeben, Arbeit laeuft aktiv
- `blocked` — Arbeit ist unterbrochen durch externe Abhaengigkeit oder Blocker
- `done` — alle Phasen inkl. `*.99`-Gate abgeschlossen

Abgrenzung: ein Block ohne Lock bleibt `planned`, auch wenn seine Abhaengigkeiten erfuellt sind. Erst mit Lock-Vergabe wechselt er auf `active`.

Empfohlene Prioritaetswerte:

- `P1`
- `P2`
- `P3`

Empfohlene Owner-Werte:

- `frei`
- `Bot-Codex`
- `User`
- Name des zustandigen Streams/Bots

## Meta-Bereiche im Master

Lock-Status, Conflict-Log und Abhaengigkeiten bleiben vorerst im Master, da sie aktuell kompakt sind (je 5-15 Zeilen). Die Datei-Ownership-Tabelle wird aufgeloest — jeder Block fuehrt seine `scope_files` in der eigenen Blockdatei.

Auslagerung in eigene Dateien (z.B. `docs/prozess/plan-locks.md`) ist erst sinnvoll, wenn eine Tabelle dauerhaft ueber 30 Zeilen waechst. Dann per Refactor auslagern und im Master nur noch verlinken.

## Evidence-Format beibehalten

Das bestehende Format bleibt gut und maschinenlesbar genug:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

Optional spaeter noch strenger:

```md
- [x] 77.1.1 ... (abgeschlossen: 2026-04-01; evidence: npm run plan:check -> commit abc123)
```

## Migrationspfad

### Phase 1 Master zum Index kuerzen und Governance anpassen

- Governance-Satz im Master sofort aendern: "einzige aktive Quelle" -> "Index; kanonische Details in Blockdateien"
- `AGENTS.md` und relevante `.agents/rules/*` auf das Zwei-Ebenen-Modell umstellen
- `CLAUDE.md` ausdruecklich mitziehen und weiter auf `AGENTS.md` sowie `.agents/rules/*` verweisen; im Aufgaben-Workflow nur den neuen Leseweg spiegeln, keine eigene Governance definieren
- Master stark kuerzen: Blockdetails raus, nur Tabelle `Aktive Bloecke` mit `plan_file`-Spalte behalten
- Abhaengigkeiten, Lock-Status und Conflict-Log bleiben im Master (kompakt genug)
- Datei-Ownership-Tabelle aufloesen (wandert in Blockdateien als `scope_files`)

### Phase 2 Kanonische Blockdateien und Skript-Update

- pro aktivem Block eine Datei unter `docs/plaene/aktiv/VXX.md` mit Normschema anlegen
- DoD, Risiken, Phasen, scope_files und Verification nur noch dort pflegen
- `scripts/validate-umsetzungsplan.mjs` auf das Zwei-Ebenen-Modell erweitern: Master-Tabelle plus Blockdateien validieren
- `npm run plan:check` muss nach Phase 2 gruen bleiben — sonst ist Phase 2 nicht abgeschlossen

### Phase 3 Workflows und Restarbeiten

- `.agents/workflows/*` auf neue Pfade und Lesereihenfolge umstellen
- `plan_governance.md` formalisiert nachziehen
- Pilotblock evaluieren und Anpassungen ins Template rueckfuehren

## Copy-Paste-Template fuer neue Bloecke

```md
---
id: VXX
title: <Kurzer Titel>
status: planned
priority: P2
owner: frei
depends_on: []
blocked_by: []
scope_files: []
verification:
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
updated_at: YYYY-MM-DD
---

# VXX <Kurzer Titel>

## Ziel
<Ein Satz mit dem Blockziel.>

## Nicht-Ziel
- <bewusster Ausschluss 1>
- <bewusster Ausschluss 2>

## Definition of Done
- [ ] DoD.1 ...
- [ ] DoD.2 ...
- [ ] DoD.3 ...
- [ ] DoD.4 ...

## Risiken
- R1 | hoch | ...
- R2 | mittel | ...

## Betroffene Pfade
- <Pfad 1>
- <Pfad 2>

## Phasen

### XX.1 <Phase>
status: open
goal: <Ziel>
output: <Artefakt oder Ergebnis>

- [ ] XX.1.1 ...
- [ ] XX.1.2 ...

### XX.2 <Phase>
status: open
goal: <Ziel>
output: <Artefakt oder Ergebnis>

- [ ] XX.2.1 ...
- [ ] XX.2.2 ...

### XX.99 Abschluss-Gate
status: open
goal: <Integrations- und Abschluss-Gate>

- [ ] XX.99.1 ...
- [ ] XX.99.2 ...
```

## Intake-Hinweis

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- Art: Struktur- und Governance-Entwurf, kein direkter Master-Umbau
- Empfehlung: zuerst als Pilot mit einem Block testen, idealerweise `V74` (aktiv, hat reale Phasen-/DoD-Daten)
- Manuelle Uebernahme erforderlich
- Naechster konkreter Schritt: Zielversion des Master-Index mit allen 7 aktiven Bloecken formulieren
