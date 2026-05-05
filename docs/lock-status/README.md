# Lock-Status System

Dieses Verzeichnis verwaltet Locks fuer aktive Phasen im Distributed-Lock-File-System.
Jede Person haelt eine eigene JSON-Datei (`alice.json`, `bob.json` usw.).

## Operativer Wahrheitsraum

- Operative Claims/Releases laufen ausschliesslich ueber `docs/lock-status/*.json`.
- `docs/Umsetzungsplan.md` bleibt ein kompakter Index und ist nicht der Live-Lock-Kanal.
- `_locks-registry.json` ist ein generierter Merge und wird nicht manuell editiert.

## Ziel

Reduktion von Merge-Konflikten bei Teamarbeit durch:
- Klare Zuweisung von Scope-Dateien pro Phase und Person
- Automatische Konflikterkennung vor Commits (`scope:validate`)
- Maschinenlesbare Lock-Registry fuer Validatoren

## Dateistruktur

```
docs/lock-status/
  README.md
  _locks-registry.json
  alice.json
  bob.json
  examples/
    lock-alice.example.json
    lock-bob.example.json
```

## Lock setzen (Claim)

```bash
npm run lock:claim V64 alice -- --phase=64.8.1 --target="2026-04-20"
npm run lock:validate
```

Alternativ manuell `docs/lock-status/alice.json` editieren und danach:

```bash
npm run lock:validate
```

## Lock aktualisieren (Advance)

Nach Abschluss einer Phase zur naechsten wechseln:

```bash
npm run lock:advance V64.8.1 V64.8.2 alice
npm run lock:validate
```

Setzt `64.8.1` auf `completed` und fuegt `64.8.2` als neuen Lock hinzu.
`scope_files` werden automatisch aus der `VXX.md`-Frontmatter extrahiert.

## Lock freigeben (Release)

```bash
npm run lock:release V64 alice
npm run lock:validate
```

## Status anzeigen

```bash
npm run lock:status
```

Zeigt alle aktiven Locks aller Personen in tabellarischer Form.

## Validierung

```bash
npm run lock:validate
```

Prueft alle Lock-Files auf Ueberschneidungen (gleiche `scope_files` von verschiedenen Personen).

```bash
npm run scope:validate
```

Prueft staged files gegen aktive Scope-Locks.

## NPM-Commands Uebersicht

| Command | Beschreibung |
| --- | --- |
| `npm run lock:status` | Zeigt aktuellen Status aller Locks |
| `npm run lock:claim` | Neuen Lock beanspruchen |
| `npm run lock:release` | Lock freigeben |
| `npm run lock:advance` | Lock auf naechste Phase weiterrollen |
| `npm run lock:validate` | Prueft auf Lock-Konflikte |
| `npm run scope:check` | Prueft staged files gegen `scope_files` |
| `npm run scope:validate` | Kombiniert `scope:check` + `lock:validate` |
| `npm run phase:validate` | Prueft Phase-Sequenz und Dependencies |

## Commit-Hinweis

- Lock-only Claim-/Release-Commits sind nicht verpflichtend.
- Falls das Team explizite Synchronisierung braucht, duerfen Lock-Aenderungen separat committed werden.
- Default: Lock-Aenderungen mit der naechsten fachlichen Lieferung bundlen.

## Regeln

1. Jede Person hat genau eine Lock-File.
2. Mehrere Locks (verschiedene Blocks) sind erlaubt.
3. `scope_files` duerfen sich nicht zwischen verschiedenen Personen mit `in-progress`-Status ueberschneiden.
4. Nach manuellem Edit immer `npm run lock:validate` ausfuehren.
5. `scope:validate` vor Commit bleibt empfohlen.
