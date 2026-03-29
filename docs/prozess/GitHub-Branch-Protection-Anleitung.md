# GitHub Branch Protection Anleitung

Stand: 2026-03-22

Ziel: `main` absichern, ohne den lokalen Main-First-Workflow zu brechen.

## Profil A (empfohlen fuer dieses Repo): Direct Push auf `main` mit harten Checks

Dieses Profil passt zur aktuellen lokalen Absicherung (`guard:main`, Husky-Hooks, Snapshot-Tags).

1. GitHub Repo oeffnen -> `Settings` -> `Branches`.
2. Rule fuer `main` anlegen (`Branch name pattern: main`).
3. Aktivieren:
   - `Require status checks to pass before merging`
   - `Require branches to be up to date before merging` (optional, aber empfohlen)
   - `Do not allow bypassing the above settings`
4. Unter required checks mindestens den CI-Job `build-and-test` auswaehlen.
5. Optional: `Restrict who can push to matching branches` aktivieren und nur Owner/Bot-Accounts erlauben.
6. Speichern.

## Profil B (optional): PR-Pflicht statt Direct Push

Nur nutzen, wenn Team-Review zwingend ueber Pull Requests laufen soll.

1. In derselben Rule zusaetzlich aktivieren:
   - `Require a pull request before merging`
   - `Require approvals` (mindestens 1)
2. Lokal bleibt `guard:main` aktiv; gearbeitet wird dann auf Feature-Branches mit expliziter Freigabe.

## Wichtige Hinweise zur lokalen Absicherung

- Hooks blockieren Commits/Pushes ausserhalb von `main` (`npm run guard:main`).
- Vor Push auf `main` wird ein lokales Recovery-Tag erzeugt (`npm run snapshot:tag`).
- `.husky/.bypass` ist absichtlich nicht mehr versioniert und bleibt lokal.
- Fuer seltene Ausnahmen ausserhalb `main` nur explizit und temporar: `ALLOW_NON_MAIN=1 <command>`.
