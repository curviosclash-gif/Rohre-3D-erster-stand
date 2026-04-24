# Fehlerbericht: V101 Plan-Commit blockiert durch `.git` ACL-Deny (`index.lock`)

Datum: 2026-04-24  
Status: offen  
Block: V101 (`101.99` abgeschlossen, Commit blockiert)

## Kontext

Nach Abschluss von `V101` wurden die Plan-Dateien aktualisiert:

- `docs/plaene/aktiv/V101.md` (neu)
- `docs/Umsetzungsplan.md`
- `docs/plaene/CHANGELOG.md`

Der anschliessende scoped Commit konnte nicht erstellt werden, weil `git add` kein `.git/index.lock` anlegen darf.

## Fehlerbild

Fehlermeldung bei jedem Staging-Versuch:

`fatal: Unable to create 'C:/Users/gunda/Desktop/CurviosCLash/.git/index.lock': Permission denied`

ACL-Inspektion zeigt weiterhin explizite Deny-Eintraege auf `.git`:

- `S-1-5-21-81707007-567096520-2204353533-1984080185:(DENY)(W,D,Rc,DC)`

## Reproduktion

1. `git add -- docs/Umsetzungsplan.md docs/plaene/CHANGELOG.md docs/plaene/aktiv/V101.md`
2. Ergebnis: `index.lock` Permission-Denied.

## Betroffene Dateien / Bereiche

- `.git` (ACL/Lock-Erstellung)
- geplante Commit-Dateien:
  - `docs/Umsetzungsplan.md`
  - `docs/plaene/CHANGELOG.md`
  - `docs/plaene/aktiv/V101.md`

## Bisherige Versuche

1. `npm run guard:main` (inkl. `git:acl:heal`)
2. `npm run git:acl:heal`
3. `icacls .git /reset /T /C`
4. `icacls .git /remove:d *S-1-5-21-81707007-567096520-2204353533-1984080185 /T /C`
5. PowerShell ACL-Entfernung via `Get-Acl`/`Set-Acl` (Set-Acl mit `UnauthorizedAccessException`)

Keiner der Versuche entfernte den Deny-Eintrag; Staging bleibt blockiert.

## Auswirkung

- V101 ist inhaltlich und per Gates abgeschlossen, kann aber aktuell nicht als scoped Commit gesichert werden.
- Weitere Commit-Schritte im Repo sind wahrscheinlich ebenfalls betroffen.

## Naechster Schritt

- ACL auf `.git` ausserhalb der aktuellen Agent-Rechte bereinigen (Deny-ACE entfernen), danach:
  1. `git add -- docs/Umsetzungsplan.md docs/plaene/CHANGELOG.md docs/plaene/aktiv/V101.md`
  2. `git commit -m "docs: close V101 in master plan and changelog"`
