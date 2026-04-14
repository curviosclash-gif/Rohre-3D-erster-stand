# Fehlerbericht: Commit-Blocker durch `.git/index.lock` ACL-Deny

## Aufgabe/Kontext

- Task: Laufende V91-Subphasenarbeit committen (`main`, scoped staging, kein destruktives Git).
- Ziel: zusammenhaengende Aenderungen nach erfolgreichen Gates sichern.
- Datum: 2026-04-14 (Europe/Berlin)

## Fehlerbild

- `git add ...` bricht reproduzierbar mit folgendem Fehler ab:
  - `fatal: Unable to create '.../.git/index.lock': Permission denied`
- Dadurch sind Staging und Commit in dieser Session blockiert.

## Reproduktion

1. `git add docs/plaene/aktiv/V64.md`
2. Ergebnis: `Unable to create .../.git/index.lock: Permission denied`
3. Gleiches Verhalten bei umfangreicherem `git add`-Scope.

## Betroffene Dateien/Komponenten

- `.git/index.lock` (Lock-Datei fuer Git-Index)
- `.git`-Ordner-ACL (explizite `Deny`-Eintraege fuer Write/Delete sichtbar)

## Bereits getestete Ansaetze

- `npm run guard:main` mehrfach ausgefuehrt (`git:acl:heal` meldet jeweils entfernte Deny-Regeln).
- ACL-Inspektion per `Get-Acl .git`/`icacls .git` wiederholt.
- Direkter `git add`-Retry nach jedem Heal-Lauf.
- Ergebnis: Lock-Datei bleibt weiterhin nicht erstellbar.

## Aktueller Stand

- Status: Commit in dieser Session blockiert.
- Wirkung: Aenderungen liegen lokal im Worktree vor, koennen aber nicht gestaged/committed werden.

## Naechster Schritt

- `.git`-ACL so bereinigen, dass `index.lock` wieder erzeugbar ist; danach staged Commit-Flow erneut starten.

## Verifikation-Nachtrag 2026-04-14 (Folgelauf)

- Reproduktion erneut bestaetigt: `git add -- docs/plaene/aktiv/V71.md` endet weiterhin mit `Unable to create .../.git/index.lock: Permission denied`.
- `npm run git:acl:heal` laeuft in dieser Session, meldet aber `skip (not inside a git worktree)` und behebt den Lock-Fehler dadurch nicht.
- Wirkung bleibt unveraendert: Staging/Commit weiterhin blockiert, obwohl Plan- und Doku-Gates gruensicher laufen.
