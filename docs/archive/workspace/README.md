# Workspace-Archiv

Dieser Ordner sammelt Root-Bestaende, die nicht mehr aktiv im Projektwurzelpfad liegen sollen, aber als nachvollziehbare Historie erhalten bleiben.

## Root-Historie

- `root-history/backups-legacy/`
  - ehemaliger Root-Ordner `backups/`
  - historischer Stand vom 2026-02-24
- `root-history/phase2_2026-03-02/`
  - ehemaliger Root-Ordner `phase2_2026-03-02/`
  - fruehere Integrations- und Modell-Artefakte

## Lokale Retention

- `output/`
  - Container bleibt lokal im Root.
  - `workspace-cleanup` behaelt die neuesten `2` Eintraege oder alles juenger als `14` Tage lokal.
  - Aeltere Eintraege werden nach `tmp/workspace-archive/output/` archiviert.
- `videos/`
  - Ordnername bleibt wegen Recorder-Contract unveraendert.
  - `workspace-cleanup` behaelt die neuesten `2` Clips oder alles juenger als `14` Tage lokal.
  - Aeltere Clips werden nach `tmp/workspace-archive/videos/` archiviert.
- `tmp/manual-backups/`
  - Zielpfad fuer manuelle `backup.ps1`-Sicherungen; kein neuer `backups/`-Ordner im Root.
