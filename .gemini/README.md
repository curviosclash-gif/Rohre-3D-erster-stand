# Gemini-Konfiguration

Dieses Verzeichnis enthaelt repo-lokale Gemini-Agenten- und Skill-Definitionen. Es ist kein Ablageort fuer Session-Memory, Chat-Logs oder globale Gemini-Artefakte.

## Leseweg

1. `AGENTS.md`
2. passende Rule in `.agents/rules/`
3. passender Workflow in `.agents/workflows/`
4. passende Gemini-Agenten-/Skill-Datei unter `.gemini/`

Bei Konflikt gewinnt die Repo-Governance aus `AGENTS.md`, `.agents/rules/` und `.agents/workflows/`.

## Grenzen

- Keine Dateien aus `C:\Users\gunda\.gemini\tmp\` oder `C:\Users\gunda\.gemini\antigravity\brain\` ins Repo kopieren.
- Keine Chat-Logs, Tool-Outputs, Cloud-Konfigurationen oder privaten Memory-Dateien committen.
- Neue Plan-Entwuerfe gehoeren nach `docs/plaene/neu/`; Master-Index- und Aktivblock-Aufnahme bleiben User-owned.
- Audit- und Review-Aufgaben berichten Findings, statt ohne expliziten Auftrag Produktlogik zu aendern.

