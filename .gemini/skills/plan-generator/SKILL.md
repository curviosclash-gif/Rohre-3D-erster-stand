---
description: Generiert standardkonforme Intake-Entwürfe (VXX.md) für den Umsetzungsplan und verlinkt sie automatisch in den Master-Dokumenten. Verhindert menschliche Fehler beim Setup.
---

# Intent
Der `plan-generator` Skill hilft dem Agenten, das starre und fehleranfällige Setup eines neuen Umsetzungsplan-Blocks zu automatisieren. Wenn der User einen neuen Block (z.B. `V116`) anfordert, stellt dieser Skill sicher, dass die `docs/plaene/aktiv/VXX.md` Datei das korrekte Format hat, im `docs/Umsetzungsplan.md` referenziert wird und im `CHANGELOG.md` auftaucht.

# Trigger
Dieser Skill sollte genutzt werden, wenn der User den Agenten bittet: "Erstelle einen neuen Plan", "Mach einen Intake für V116" oder "Füge Block V120 zum Umsetzungsplan hinzu".

# Workflow
1. **Validierung:** Prüfe im `docs/Umsetzungsplan.md`, ob die angeforderte V-Nummer bereits existiert. Wenn ja, brich ab oder frage nach einer anderen Nummer.
2. **Template-Generierung:** Erstelle die Datei `docs/plaene/aktiv/VXX.md` nach folgendem YAML-Frontmatter und Markdown-Muster:
```yaml
---
id: VXX
title: [Titel hier einfügen]
status: planned
priority: P2
owner: frei
depends_on: []
blocked_by: []
affected_area: [Bereich hier einfügen]
scope_files: []
---

## Ziel
[Kurzes Ziel]

## Phasen
- [ ] XX.1 ...
```
3. **Master-Update:** Füge eine neue Zeile für den Block in der Tabelle "Aktive und geplante Bloecke" im `docs/Umsetzungsplan.md` hinzu.
4. **Lock-Status Update:** Trage in der "Lock-Status" Tabelle im `docs/Umsetzungsplan.md` den Block mit dem Status `frei` und Start-Datum `-` ein.
5. **Changelog-Eintrag:** Trage im `docs/plaene/CHANGELOG.md` unter dem heutigen Datum ein, dass der Entwurf für `VXX` in den Master-Index übernommen wurde.

# Finalization
Führe nach den Änderungen `npm run plan:check` im Projekt aus, um zu überprüfen, dass die Frontmatter-Strukturen und Links valide sind. Falls der Check fehlschlägt, korrigiere den Fehler selbstständig.