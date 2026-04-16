# Lock-Status System

Dieses Verzeichnis verwaltet Locks fuer aktive Phasen im Distributed-Lock-File-System.
Jede Person haelt eine eigene JSON-Datei (`alice.json`, `bob.json` usw.).

## Ziel

Reduktion von Merge-Konflikten um 70%+ bei Paararbeit durch:
- Klare Zuweisung von Scope-Dateien pro Phase und Person
- Automatische Konflikterkennung vor jedem Commit (pre-commit Hook)
- Maschinenlesbare Lock-Registry fuer CI und Validatoren

## Dateistruktur

```
docs/lock-status/
  README.md                   <- Diese Datei
  _locks-registry.json        <- Automatisch generierter Merge aller Lock-Files
  alice.json                  <- Lock-File fuer Alice (per Person, git-tracked)
  bob.json                    <- Lock-File fuer Bob (per Person, git-tracked)
  examples/
    lock-alice.example.json   <- Beispiel-Format fuer Alice
    lock-bob.example.json     <- Beispiel-Format fuer Bob
```

## Lock setzen (Claim)

```bash
npm run lock:claim V64 alice -- --phase=64.8.1 --target="2026-04-20"
```

Oder manuell `docs/lock-status/alice.json` editieren und dann:

```bash
npm run lock:validate
```

## Lock aktualisieren (Advance)

Nach Abschluss einer Phase zur naechsten wechseln:

```bash
npm run lock:advance V64.8.1 V64.8.2 alice
```

Setzt 64.8.1 auf `completed` und fuegt 64.8.2 als neuen Lock hinzu.
scope_files werden automatisch aus der VXX.md-Frontmatter extrahiert.

## Lock freigeben (Release)

```bash
npm run lock:release V64 alice
```

Entfernt alle aktiven Locks fuer alice in V64.

## Status anzeigen

```bash
npm run lock:status
```

Zeigt alle aktiven Locks aller Personen in tabellarischer Form.

## Validierung

```bash
npm run lock:validate
```

Prueft alle Lock-Files auf Ueberschneidungen (gleiche scope_files von verschiedenen Personen).

```bash
npm run scope:validate
```

Prueft ob alle staged files im Scope der eigenen aktiven Phase liegen.

## NPM-Commands Uebersicht

| Command | Beschreibung |
| --- | --- |
| `npm run lock:status` | Zeigt aktuellen Status aller Locks |
| `npm run lock:claim` | Neuen Lock beanspruchen |
| `npm run lock:release` | Lock freigeben |
| `npm run lock:advance` | Lock auf naechste Phase weiterrollen |
| `npm run lock:validate` | Prueft auf Lock-Konflikte |
| `npm run scope:check` | Prueft staged files gegen scope_files |
| `npm run scope:validate` | Kombiniert scope:check + lock:validate |
| `npm run phase:validate` | Prueft Phase-Sequenz und Dependencies |

## Lock-File Format

```json
{
  "person": "alice",
  "timestamp": "2026-04-16T10:30:00Z",
  "locks": [
    {
      "block_id": "V64",
      "phase": "64.8.2",
      "scope_files": [
        "src/core/runtime/MenuRuntimeMultiplayerService.js"
      ],
      "start_date": "2026-04-16",
      "target_completion": "2026-04-20",
      "status": "in-progress",
      "notes": "Menue-Lobby-Pfad auf echte Transporte"
    }
  ],
  "current_phase_evidence": {
    "phase_id": "64.8.2",
    "completed_items": [],
    "last_commit": ""
  }
}
```

## Regeln

1. Jede Person hat genau eine Lock-File.
2. Mehrere Locks (verschiedene Blocks) sind erlaubt.
3. `scope_files` duerfen sich NICHT zwischen verschiedenen Personen mit `in-progress`-Status ueberschneiden.
4. Lock-Files sind git-tracked und werden zusammen mit dem Lock-Commit gepusht.
5. `_locks-registry.json` wird automatisch generiert - nie manuell editieren.
6. Nach manuellem Edit immer `npm run lock:validate` ausfuehren.
