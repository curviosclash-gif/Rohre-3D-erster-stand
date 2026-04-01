# Planentwurf Umsetzungsplan KI-Lesbarkeit

Stand: 2026-04-01
Status: Entwurf
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

1. `docs/Umsetzungsplan.md` wird zum kompakten Master-Index.
2. Jeder aktive Block bekommt eine eigene kanonische Blockdatei mit festem Schema.

Empfohlene kuenftige Rollen:

- `docs/Umsetzungsplan.md`
  - nur Uebersicht
  - nur aktive Bloecke
  - nur wenige, feste Spalten
- `docs/plaene/aktiv/VXX.md`
  - eine Datei pro aktivem Block
  - volle Details, DoD, Risiken, Phasen, Verification
- `docs/plaene/neu/*.md`
  - Intake- und Aenderungsentwuerfe
- `docs/plaene/alt/*.md`
  - archivierte oder ersetzte Blockstaende

Hinweis:
Dieses Zielbild aendert bewusst die heutige Regel "Masterplan ist die einzige aktive Quelle". Wenn diese Umstellung gewuenscht ist, muss die Governance spaeter passend nachgezogen werden.

## Gestaltungsprinzipien

- Eine Datei beantwortet eine Frage.
- Ein Block lebt in genau einer kanonischen Detaildatei.
- Ein Fakt steht genau einmal.
- Ein Feld hat genau einen Namen.
- Ein Status verwendet genau einen normierten Wert.
- Eine Phase hat genau eine ID und genau einen Ort.
- Prosa ist erlaubt fuer Kontext, aber nicht fuer Steuerdaten.

## Soll-Struktur fuer den Master-Index

`docs/Umsetzungsplan.md` soll nur diese Bereiche enthalten:

1. Kurze Einleitung mit Stand und Regel-Link
2. Tabelle `Aktive Bloecke`
3. Optional kurze Tabelle `Blockierte Bloecke`
4. Links auf Meta-Dateien

Nicht mehr im Master:

- volle DoD-Listen
- volle Phasenlisten
- volle Risiko-Register
- lange Parallelisierungsprosa
- ausfuehrliche Ownership-Tabellen
- ausfuehrliche Conflict-Logs

Empfohlene Spalten fuer `Aktive Bloecke`:

| id | titel | status | prio | owner | depends_on | current_phase | next_step | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V77 | Desktop Vollversion Browser Demo Grenzen | planned | P2 | frei | V74.99 | 77.1 | Produktrollen und Demo-Allowlist festziehen | `docs/plaene/aktiv/V77.md` |

Normregeln fuer den Master:

- genau eine Zeile pro aktivem Block
- keine freien Statussaetze in der Tabelle
- `depends_on` nur als IDs, nicht als Fliesstext
- `current_phase` immer als Phasen-ID
- `plan_file` immer Pflicht
- keine Detailerklaerung laenger als eine Zeile

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
scope_files:
  - src/ui/menu/**
  - src/core/runtime/**
verification:
  - npm run plan:check
  - npm run docs:sync
  - npm run docs:check
updated_at: 2026-04-01
---

# V77 Desktop Vollversion Browser Demo Grenzen

## Ziel
Ein Satz.

## Nicht-Ziel
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
- Metadaten immer oben sammeln.
- IDs nie umbenennen, sobald sie im Master stehen.
- `depends_on`, `owner`, `status`, `priority` nur mit normierten Werten fuellen.
- Keine fachkritischen Regeln in langen Saetzen verstecken, wenn sie als Liste oder Feld ausdrueckbar sind.
- Keine doppelte Pflege von Risiken, Ownership oder Verification in mehreren Dateien.
- Checkboxen nur fuer echte Arbeitsschritte verwenden, nicht fuer Ueberschriften.
- Jeder abgeschlossene Punkt behaelt das bestehende Evidence-Format.

## Normierte Werte

Empfohlene Statuswerte:

- `planned`
- `active`
- `blocked`
- `done`

Empfohlene Prioritaetswerte:

- `P1`
- `P2`
- `P3`

Empfohlene Owner-Werte:

- `frei`
- `Bot-Codex`
- `User`
- Name des zustandigen Streams/Bots

## Meta-Dateien auslagern

Die heute grossen Sammelbereiche sollen in eigene Dateien wandern:

- `docs/prozess/plan-locks.md`
- `docs/prozess/plan-ownership.md`
- `docs/prozess/plan-conflicts.md`
- `docs/prozess/plan-dependencies.md`

Der Master verlinkt diese Dateien nur noch.

## Evidence-Format beibehalten

Das bestehende Format bleibt gut und maschinenlesbar genug:

- `(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

Optional spaeter noch strenger:

```md
- [x] 77.1.1 ... (abgeschlossen: 2026-04-01; evidence: npm run plan:check -> commit abc123)
```

## Migrationspfad

### Phase 1 Minimaler Gewinn ohne Governance-Bruch

- `docs/Umsetzungsplan.md` stark kuerzen
- nur aktive Bloecke als Tabelle behalten
- pro Block auf existierende Detaildatei verlinken
- Lock-, Ownership- und Conflict-Bereiche in eigene Meta-Dateien ziehen

### Phase 2 Kanonische Blockdateien einfuehren

- pro aktivem Block eine feste Detaildatei mit Normschema anlegen
- DoD, Risiken, Phasen und Verification nur noch dort pflegen
- Master wird reiner Index

### Phase 3 Governance und Skripte nachziehen

- `plan_governance.md` auf das neue Zwei-Ebenen-Modell anpassen
- `scripts/validate-umsetzungsplan.mjs` auf Master-Index plus Blockdateien erweitern
- Workflows auf neue Pfade und Rollen umstellen

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
- Empfehlung: zuerst als Pilot mit einem Block testen, idealerweise `V77` oder `V72`
- Manuelle Uebernahme erforderlich
