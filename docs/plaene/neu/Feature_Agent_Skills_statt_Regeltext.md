---
title: Agent-Skills statt Regeltext fuer Spezialroutinen
status: draft
planned_block_id: TBD
priority: P2
owner: frei
intake_rule: not-yet-in-master
depends_on:
  - V116.99
soft_depends_on:
  - V123.1
blocked_by: []
affected_area: agent-governance-context-reduction
scope_files:
  - AGENTS.md
  - .agents/rules/planning_and_governance.md
  - .agents/rules/token_efficiency_and_tools.md
  - .agents/workflows/plan.md
  - .agents/workflows/code.md
  - .agents/workflows/quick.md
  - docs/referenz/ai_project_onboarding.md
  - docs/plaene/neu/Feature_Agent_Skills_statt_Regeltext.md
verification:
  - npm run check:agent-context
  - npm run plan:check
  - npm run gates:pre-commit
updated_at: 2026-05-17
---

# Feature: Agent-Skills statt Regeltext fuer Spezialroutinen

Status: Draft, noch nicht in `docs/Umsetzungsplan.md` aufnehmen.

## Kurzfassung

Rules und Workflows bleiben kurz und sicherheitsrelevant. Wiederkehrendes Spezialwissen wandert schrittweise in Skills oder portable Referenzdocs, damit Agents nur den Kontext laden, den sie fuer den konkreten Auftrag brauchen.

Der Umbau soll nicht waehrend `V116.5` als Meta-Schleife passieren. Sinnvoll ist zuerst ein kleiner Pilot nach `V116.99` oder als Teil von `V123`, weil dort AI-optimierter Plan-Index und Source-of-Truth-Migration ohnehin Thema sind.

## Ziel

- Harte Governance bleibt in `AGENTS.md`, `.agents/rules/` und `.agents/workflows/`.
- Spezialroutinen werden nur bei passendem Auftrag geladen.
- Standardkontext fuer Agents sinkt, ohne Safety-Regeln unsichtbar zu machen.
- Der No-op-first-Grundsatz bleibt erhalten: bestehende Regeln werden nicht umformuliert, wenn ein Skill oder eine Referenz nur Detailwissen ergaenzt.

## Nicht-Ziele

- Keine Safety-Regeln in Skills verstecken.
- Keine Abschwaechung von Git-, Lock-, D3/D4-, Test-Ownership-, Dead-Code- oder Source-of-truth-Regeln.
- Kein breiter Governance-Rewrite direkt aus `V116.5` heraus.
- Keine automatische Aufnahme in `docs/Umsetzungsplan.md`; Intake bleibt User-owned.

## Grundschnitt

| Kategorie | Zielort | Beispiele |
| --- | --- | --- |
| hard policy | `.agents/rules/` | D3/D4-Gates, Git-Safety, Lock-/Commit-Policy, Test-Ownership |
| workflow step | `.agents/workflows/` | Code-Scope erfassen, Gates waehlen, Commit-Scope pruefen |
| specialist routine | Skill | Graph-Navigation, Plan-Kontext-Report, Playwright-Smokes, Refactor-Inventar |
| reference detail | `docs/referenz/` | portable Fallback-Doku fuer Agents ohne Skill-Unterstuetzung |

## Phasen

### 1. Inventar

- Rules und Workflows abschnittsweise klassifizieren:
  - `hard policy`
  - `workflow step`
  - `specialist routine`
  - `reference detail`
- Kandidatenliste erstellen, mindestens:
  - Graph-Navigation fuer Scope-, Dependency- und Surface-Fragen
  - Plan-Kontext-Report interpretieren
  - Workspace-Cleanup vorbereiten und auswerten
  - Refactor-Kandidaten inventarisieren
  - Browser-/Playwright-Smokes fuer Game-UI und Runtime
- Ergebnis als kompakte Tabelle dokumentieren; keine Rule-Kuerzung in dieser Phase.

### 2. Pilot

- Einen risikoarmen Skill waehlen, bevorzugt Graph-Navigation oder Plan-Kontext-Report.
- Skill mit klaren Triggern schreiben:
  - wann laden
  - welche Repo-Skripte nutzen
  - welche Dateien nicht vorsorglich lesen
  - wann auf Referenzdocs zurueckfallen
- Keine harten Policies aus Rules entfernen.

### 3. Validierung

- Den Pilot mit typischen Aufgaben pruefen:
  - Planstatus lesen
  - Scope-Kollisionen bewerten
  - Refactor-Kandidat einschaetzen
- Bewertung:
  - Spart der Skill Kontext?
  - Bleiben Safety-Hinweise sichtbar?
  - Wird der Skill verlaesslich getriggert?
  - Bleibt `AGENTS.md` erster Einstieg?

### 4. Entschlackung

- Erst nach erfolgreichem Pilot redundante Detailpassagen aus Rules oder Workflows kuerzen.
- Vor jeder Kuerzung klassifizieren:
  - `no-op`: Regeltext bleibt
  - `read-only evidence`: bestehender Text reicht
  - `optional`: nur mit expliziter Entscheidung
  - `edit required`: tatsaechlich kuerzen oder verweisen
- Harte Regeln bleiben im Repo sichtbar; Skills duerfen nur praktische Routinen tragen.

### 5. Abschluss

- Kurze Uebersicht hinterlassen:
  - welche Skills existieren
  - welche Governance bewusst im Repo bleibt
  - welche Referenzdocs als Fallback dienen
- Gates:
  - `npm run check:agent-context`
  - `npm run plan:check`
  - `npm run gates:pre-commit`

## Aufwand

- Pilot: 1 bis 2 Stunden.
- Erster sauberer Umbau mit 2 bis 3 Skills: etwa 0.5 bis 1 Tag.
- Breite Migration: erst nach Pilot bewerten.

## Risiken

| Risiko | Schwere | Gegenmassnahme |
| --- | --- | --- |
| Safety wird unsichtbar, weil Regeln in Skills wandern. | hoch | Hard policies bleiben in `.agents/rules/` und `.agents/workflows/`. |
| Skills werden nicht getriggert. | mittel | Portable Fallbacks in `docs/referenz/` behalten. |
| Der Umbau erzeugt neue Meta-Schleifen. | mittel | Erst Pilot, dann No-op-first-Kuerzung; keine breite Migration in V116. |
| Mehrere Quellen widersprechen sich. | mittel | `AGENTS.md` und Rules bleiben Source of Truth; Skills sind Routinen, keine Governance. |

## Intake-Hinweis

Dieser Draft ist absichtlich nur gespeichert. Eine Aufnahme in `docs/Umsetzungsplan.md` oder `docs/plaene/aktiv/` braucht eine spaetere explizite User-Entscheidung.
