---
description: Generiert standardkonforme Intake-Entwuerfe fuer den Umsetzungsplan, ohne Master-Dokumente direkt zu aendern. Verhindert menschliche Fehler beim Setup und respektiert die User-owned Intake-Governance.
---

# Intent
Der `plan-generator` Skill hilft dem Agenten, das starre und fehleranfaellige Setup eines neuen Umsetzungsplan-Intake-Entwurfs zu automatisieren. Wenn der User einen neuen Block (z.B. `V116`) anfordert, erstellt dieser Skill einen uebernahmefaehigen Draft unter `docs/plaene/neu/`. Die Uebernahme in `docs/Umsetzungsplan.md`, `docs/plaene/aktiv/VXX.md` oder `docs/bot-training/Bot_Trainingsplan.md` bleibt User-owned.

# Trigger
Dieser Skill sollte genutzt werden, wenn der User den Agenten bittet: "Erstelle einen neuen Plan", "Mach einen Intake fuer V116" oder "Bereite Block V120 fuer den Umsetzungsplan vor".

# Workflow
1. **Validierung:** Pruefe im Ziel-Master (`docs/Umsetzungsplan.md` oder bei Bot-Training `docs/bot-training/Bot_Trainingsplan.md`) und in `docs/plaene/aktiv/`, ob die angeforderte V-/BT-Nummer bereits existiert. Wenn ja, brich ab oder frage nach einer anderen Nummer.
2. **Template-Generierung:** Erstelle eine Intake-Datei unter `docs/plaene/neu/Feature_[Name].md`. Wenn der Draft fuer eine konkrete aktive Block-ID gedacht ist, nenne das Ziel explizit als `plan_file: docs/plaene/aktiv/VXX.md`, aber erstelle diese aktive Datei nicht selbst. Nutze folgendes YAML-Frontmatter und Markdown-Muster:
```yaml
---
id: VXX
title: [Titel hier einfuegen]
status: intake
priority: P2
owner: frei
depends_on: []
blocked_by: []
affected_area: [Bereich hier einfuegen]
plan_file: docs/plaene/aktiv/VXX.md
scope_files: []
---

## Ziel
[Kurzes Ziel]

## Intake-Hinweis
- Ziel-Masterplan: docs/Umsetzungsplan.md
- Vorgeschlagene Block-ID: VXX
- Dependencies: hard/soft klassifizieren
- Manuelle Uebernahme erforderlich

## Phasen
- [ ] XX.1 ...
```
3. **Kein Master-Update:** Aendere `docs/Umsetzungsplan.md`, `docs/bot-training/Bot_Trainingsplan.md` und `docs/plaene/aktiv/VXX.md` nicht. Der Agent darf im Draft beschreiben, welche Master-Zeile spaeter manuell noetig waere.
4. **Lock-Status:** Veraendere keine Lock-Tabellen direkt. Beschreibe im Intake-Hinweis nur den empfohlenen Owner/Lock-Status.
5. **Changelog-Eintrag:** Trage in `docs/plaene/CHANGELOG.md` nur ein, dass ein Intake-Entwurf erstellt wurde und manuelle Uebernahme erforderlich bleibt. Behaupte keine Master-Aufnahme.

# Finalization
Fuehre nach den Aenderungen `npm run plan:check` aus. `npm run graph:check` ist erst erforderlich, nachdem der User den Draft in den aktiven Master uebernommen hat.
