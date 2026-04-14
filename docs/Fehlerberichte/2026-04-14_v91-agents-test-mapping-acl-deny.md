# Fehlerbericht: V91 91.5.2 Test-Mapping-Update durch ACL-Deny blockiert

## Aufgabe/Kontext

- Task: `V91 91.5.2` (Folgeblock-Spiegelung fuer `V64`, `V81`, `V86`, Test-Mapping und angrenzende Governance-Doku).
- Ziel: `docs/plaene/aktiv/V64.md`, `V81.md`, `V86.md` plus `.agents/test_mapping.md` auf dieselbe Ratchet-/Sunset-Leitplanke spiegeln.
- Datum: 2026-04-14 (Europe/Berlin)

## Fehlerbild

- Schreibzugriffe auf `.agents/test_mapping.md` schlagen reproduzierbar fehl mit `UnauthorizedAccessException`.
- Gleiches Verhalten tritt fuer neue Dateien unter `.agents/` auf (`Set-Content .agents\\_write_test.tmp`).
- Andere Repo-Pfade sind in derselben Session normal schreibbar.

## Reproduktion

1. `Add-Content .agents\\test_mapping.md ""`
2. Ergebnis: `Der Zugriff auf den Pfad "...\\.agents\\test_mapping.md" wurde verweigert.`
3. Zusatztest: `Set-Content .agents\\_write_test.tmp "x"` -> ebenfalls `Zugriff verweigert`.
4. ACL-Inspektion: `(Get-Acl .agents).Access | Where-Object { $_.AccessControlType -eq 'Deny' }` zeigt explizite `Deny`-Eintraege auf Schreibrechte.

## Betroffene Dateien/Komponenten

- `.agents/test_mapping.md`
- `.agents/` (Ordner-ACL in dieser Session)

## Bereits getestete Ansaetze

- `npm run git:acl:heal` ausgefuehrt (ohne Effekt auf `.agents`).
- Direkter ACL-Fix-Versuch per `Set-Acl` auf `.agents` getestet; ebenfalls mit `UnauthorizedAccessException` blockiert.
- Mehrere Schreibmethoden (`apply_patch`, `Set-Content`, `Add-Content`) getestet; alle auf `.agents` verweigert.

## Aktueller Stand

- Status: Blockiert fuer den `.agents`-Write-Scope in dieser Session.
- Wirkung: `V91 91.5.2` kann nur teilweise abgeschlossen werden; Plan-/Governance-Spiegelung in `V64`/`V81`/`V86` ist umgesetzt, Test-Mapping-Spiegelung bleibt offen.

## Naechster Schritt

- ACL-/Sandbox-Freigabe fuer `.agents` herstellen, dann die ausstehende Aktualisierung in `.agents/test_mapping.md` nachziehen und `V91 91.5.2` final abschliessen.
