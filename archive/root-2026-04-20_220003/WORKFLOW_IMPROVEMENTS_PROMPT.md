# Workflow-Improvements für Konflikt-Reduktion bei Paararbeit

## Ziel
Implementiere ein **Conflict-Prevention-System** für Paararbeit im Projekt, das automatisch verhindert, dass zwei Personen gleichzeitig an denselben Block-Phasen oder scope_files arbeiten.

Zielreduktion: **Merge-Konflikte um 70%+**

---

## Kontext & Problem-Statement

### Aktuelle Situation
- Das Projekt nutzt ein Block/Phase-System (V64.8.1, V64.8.2, etc.)
- Jeder Block hat definierte `scope_files` 
- Es gibt ein Lock-Status-System im Umsetzungsplan
- **Problem:** Umsetzungsplan.md ist ein einzelnes File → Edit-Konflikte wenn zwei Personen Locks eintragen
- **Problem:** Keine Pre-Commit-Validierung, ob Person X an Phase Y.Z arbeiten darf
- **Problem:** Keine Früh-Warnung, wenn jemand scope_files verletzt

### Warum das wichtig ist
- Paararbeit auf `main` (keine Feature-Branches)
- Jede Phase muss sequenziell abgearbeitet werden
- Parallele Phasen im selben Block = garantierter Merge-Konflikt

---

## Implementierungs-Roadmap

### Phase 1: Distributed Lock-Files (P1 - MUST HAVE)
**Ziel:** Lock-Status aus zentralem Umsetzungsplan auslagern

**Dateien zu erstellen:**
```
docs/lock-status/
  ├── README.md                    (Erklärung des Systems)
  ├── _locks-registry.json         (Auto-generiert, master-index)
  ├── examples/
  │   └── lock-alice.example.json
  │   └── lock-bob.example.json
  └── .gitkeep
```

**Neuer Lock-File-Format (JSON):**
```json
{
  "person": "alice",
  "timestamp": "2026-04-16T10:30:00Z",
  "locks": [
    {
      "block_id": "V64",
      "phase": "64.8.2",
      "scope_files": [
        "src/core/runtime/MenuRuntimeMultiplayerService.js",
        "src/core/runtime/RuntimeSessionLifecycleService.js"
      ],
      "start_date": "2026-04-16",
      "target_completion": "2026-04-20",
      "status": "in-progress",
      "notes": "Menue-Lobby-Pfad auf echte Transporte"
    }
  ],
  "current_phase_evidence": {
    "phase_id": "64.8.2",
    "completed_items": ["64.8.2.1", "64.8.2.2"],
    "last_commit": "abc1234"
  }
}
```

**Zu tun:**
1. Erstelle `docs/lock-status/README.md` mit:
   - Erklärung des Lock-File-Systems
   - Wie man Locks setzt/aktualisiert/released
   - NPM-Commands die verfügbar sind
   - Beispiele für beide Personen

2. Erstelle `docs/lock-status/_locks-registry.json` (Template):
   ```json
   {
     "generated_at": "auto",
     "locks": [],
     "metadata": {
       "format_version": "1.0",
       "expected_lock_files": ["alice.json", "bob.json"]
     }
   }
   ```

3. Erstelle `docs/lock-status/.gitkeep` (damit Directory tracked wird)

4. Migriere aktuelle Locks aus `docs/Umsetzungsplan.md`:
   - Lese die "Lock-Status"-Tabelle aus dem Umsetzungsplan
   - Konvertiere zu JSON-Format
   - Erstelle `docs/lock-status/alice.json` (für zukünftige Nutzung)

5. **Aktualisiere `docs/Umsetzungsplan.md`:**
   - Entferne "Lock-Status" Tabelle vollständig
   - Ersetze mit Hinweis:
     ```markdown
     ## Lock-Status
     
     Aktive Locks werden in `docs/lock-status/` verwaltet (pro Person eine JSON-Datei).
     Siehe `docs/lock-status/README.md` für Anleitung.
     
     Live-Status: `npm run lock:status` (verfügbar nach Phase 2)
     ```

---

### Phase 2: Scope-Validator (P1 - MUST HAVE)
**Ziel:** Validiere, dass committe Code nur in den erlaubten scope_files des Blocks ist

**Dateien zu erstellen/ändern:**
```
.agents/scripts/
  ├── scope-validator.js       (Neue Datei - core validator)
  ├── phase-validator.js       (Neue Datei - phase-ownership check)
  └── lock-registry-merger.js  (Neue Datei - _locks-registry.json Auto-Merge)

.husky/
  └── pre-commit              (ÄNDERN - Hook um Validator aufrufen)

package.json                   (ÄNDERN - npm scripts hinzufügen)
```

**scope-validator.js - Implementierung:**

```javascript
// .agents/scripts/scope-validator.js

/**
 * Validiert, dass committe Dateien nur in erlaubten scope_files des aktiven Blocks sind
 * 
 * Nutze:
 *   node .agents/scripts/scope-validator.js --phase=V64.8.2 --person=alice [--strict]
 * 
 * Exit-Codes:
 *   0 = OK
 *   1 = Hard Fail (scope verletzt)
 *   2 = Warn (soft conflict, informativ)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// TODO: Implementierung
// 1. Parse --phase und --person flags
// 2. Lese VXX.md Datei (aus phase extrahiert)
// 3. Extrahiere scope_files aus Frontmatter
// 4. Lese git diff --cached --name-only
// 5. Prüfe: Alle geänderten Dateien in scope_files?
// 6. Falls --strict: Prüfe auch dass person in lock-file eingetragen ist
// 7. Output: ✓ oder ✗ mit Details
```

**phase-validator.js - Implementierung:**

```javascript
// .agents/scripts/phase-validator.js

/**
 * Validiert Phase-Sequenzierung
 * 
 * Nutze:
 *   node .agents/scripts/phase-validator.js --phase=V64.8.2 [--allow-rerun]
 * 
 * Checks:
 * - Ist Vorphase (64.8.1) bereits merged und abgeschlossen?
 * - Gibt es uncommitted changes in Vorphase scope?
 * - Alle Gates (plan:check, docs:check) grün?
 */

// TODO: Implementierung
// 1. Lese VXX.md, extrahiere phase-list
// 2. Prüfe git log nach letztem Merge der Vorphase
// 3. Prüfe git diff --name-only ob Vorphase-Dateien modifiziert
// 4. Rufe npm run gates:pre-commit auf (oder subset)
```

**lock-registry-merger.js - Implementierung:**

```javascript
// .agents/scripts/lock-registry-merger.js

/**
 * Mergt alle lock-*.json Dateien in _locks-registry.json (Auto-generated)
 * 
 * Läuft als:
 *   - Pre-commit Hook (automatic)
 *   - Manuell: node .agents/scripts/lock-registry-merger.js --validate
 * 
 * Validiert: Keine Überschneidungen, alle personen-files gültig
 */

// TODO: Implementierung
// 1. Lese alle docs/lock-status/*.json (außer _locks-registry.json)
// 2. Merge in _locks-registry.json
// 3. Validiere:
//    - Keine zwei Personen haben Lock auf gleiche scope_files
//    - Phase-Sequenzierung nicht verletzt
//    - Timestamps logisch (start_date < now)
// 4. Output: Validierungsbericht
// 5. Falls invalid: exit 1, show conflict
```

**package.json - Neue Scripts:**

```json
{
  "scripts": {
    "scope:check": "node .agents/scripts/scope-validator.js",
    "phase:validate": "node .agents/scripts/phase-validator.js",
    "lock:status": "node .agents/scripts/lock-registry-merger.js --status",
    "lock:validate": "node .agents/scripts/lock-registry-merger.js --validate",
    "scope:validate": "npm run scope:check && npm run lock:validate && npm run phase:validate"
  }
}
```

**.husky/pre-commit - Änderung:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Windows ACL-Healing
npm run git:acl:heal

# NEU: Scope & Lock Validation
echo "Validiere Phase-Scope und Lock-Status..."
if ! npm run scope:validate 2>&1 | tee /tmp/scope-check.log; then
  echo "❌ Scope-Validierung fehlgeschlagen"
  echo "Hilfe: scope_files oder Lock-Status prüfen"
  exit 1
fi

# Bestehende Gates
npm run gates:pre-commit
```

---

### Phase 3: Lock-Management-CLI (P2 - NICE TO HAVE)
**Ziel:** Einfache Commands zum Claim/Release/Update von Locks

**Dateien zu erstellen:**
```
.agents/scripts/
  ├── lock-claim.js       (lock:claim V64 alice)
  ├── lock-release.js     (lock:release V64 alice)
  └── lock-advance.js     (lock:advance V64.8.1 -> V64.8.2)
```

**lock-claim.js - Spezifikation:**

```javascript
/**
 * Claim einen Block für eine Person
 * 
 * Nutze:
 *   npm run lock:claim V64 alice --phase=64.8.1 --target="2026-04-20"
 * 
 * Was es tut:
 * 1. Lese V64.md, extrahiere Phase 64.8.1
 * 2. Extrahiere scope_files aus diese Phase
 * 3. Erstelle docs/lock-status/alice.json mit Lock-Eintrag
 * 4. Validiere: Keine hard-dependency Verletzungen? ✓
 * 5. Merke phase_owner in VXX.md Frontmatter? (optional)
 * 6. Git-Hinweis: "Lock claimed für V64.8.1 by alice"
 * 
 * Exit-Codes:
 *   0 = OK, Lock created
 *   1 = Hard dependency nicht erfüllt (blocker!)
 *   2 = Lock schon von jemand anderem gehalten (conflict!)
 */

// TODO: Implementierung
```

---

### Phase 4: Neue Workflow-Datei (P2 - NICE TO HAVE)
**Datei zu erstellen:**
```
.agents/workflows/teamwork-coordination.md
```

**Inhalt:**
```markdown
---
description: Koordinations-Workflow für Paararbeit ohne Merge-Konflikte
---

## Workflow für zwei Personen (Alice & Bob)

### Vor Blockstart

1. Alice liest Umsetzungsplan + V64.md
2. Alice validiert dependencies: `npm run phase:validate V64.1`
3. Alice claimed Phase:
   ```bash
   npm run lock:claim V64 alice --phase=64.8.1 --target="2026-04-20"
   ```
4. Commit nur Umsetzungsplan-Änderungen (separat):
   ```bash
   git add docs/Umsetzungsplan.md
   git commit -m "docs(V64): alice started 64.8.1"
   ```
5. Bob wartet, oder claimed einen ANDEREN Block:
   ```bash
   npm run lock:claim V82 bob --phase=82.1 --target="2026-04-22"
   ```

### Während Phase

- Alice arbeitet nur in scope_files von 64.8.1
- Vor jedem Commit:
  ```bash
  npm run scope:validate
  # ✓ Alle geändert Dateien in scope_files? JA
  # ✓ Person hat Lock? JA
  # ✓ Vorphase abgeschlossen? JA
  ```
- Git-Workflow:
  ```bash
  npm run git:acl:heal  # Windows
  git add [scoped-files]
  git diff --name-only   # Double-check
  git commit -m "feat(V64 64.8.1): konkrete änderung - grund"
  ```

### Phase abgeschlossen

1. Alice merged Phase:
   ```bash
   npm run gates:pre-commit  # Alle Checks grün?
   npm run phase:validate V64.8.2  # Darf nächste Phase starten?
   npm run lock:advance V64.8.1 V64.8.2
   ```
2. Bob kann jetzt parallel mit Phase 82.2 starten

### Konflikt-Erkennung

- Bob schreibt in scope_files von 64.8.1 (das Alice hat):
  ```bash
  npm run scope:validate
  # ❌ Hard Fail:
  # ERROR: src/core/runtime/MenuRuntimeMultiplayerService.js
  #   ist in scope_files von Phase 64.8.1
  #   Lock gehalten von: alice (seit 2026-04-16)
  #   Deine Phase: 82.1
  #   Aktion: Andere Datei bearbeiten ODER mit alice abstimmen
  ```

## Automatische Konflikt-Prävention

### Pre-Commit-Hook
- Läuft automatisch vor jedem Commit
- Prüft Scope-Verletzungen
- Prüft Lock-Überschneidungen
- Gibt klare Fehlermeldung wenn Konflikt erkannt

### Registry-Auto-Update
- Mergt alle lock-*.json Dateien in _locks-registry.json
- Läuft als Hook vor jedem Push
- Detektiert Konflikt-Zustände

## Bei Konflikten

1. Konflikt wird early erkannt (pre-commit)
2. Git-Commit wird VERHINDERT
3. Hinweis zeigt: Wer hat den Lock?
4. **Aktion:** Mit Lockhalter abstimmen:
   - A) Lockhalter gibt Lock frei nach Phase-Abschluss
   - B) Ihr negotiiert Scope-Neudefinition
   - C) Einer nimmt anderen Block statt

## FAQ

**F: Was wenn ich meine Phase nicht zeitig fertig werde?**
A: Nutze `npm run lock:extend V64.8.1 --until="2026-04-25"`
   (Optional: benachrichtige andere Personen)

**F: Darf ich einen anderen Block anfangen während ich 64.8.1 mache?**
A: Nein. Pre-Commit wird dich warnen. Schließe 64.8.1 zuerst.

**F: Was wenn Phase 64.8.1 zu großzügig scoped ist (mehrere Personen braucht)?**
A: Das ist ein Planung-Issue. Neue Subphase definieren:
   - 64.8.1.1 (alice)
   - 64.8.1.2 (bob)
   Plan im VXX.md updaten, dann lock:claim die Subphase.
```

---

## Testing & Validierung

### Unit-Tests (zu schreiben)
```
tests/unit/lock-system/
  ├── scope-validator.test.js
  ├── phase-validator.test.js
  ├── lock-registry-merger.test.js
  └── fixtures/
      ├── v64.example.md
      ├── alice-lock.example.json
      └── conflict-scenario.json
```

### Integrations-Tests (zu schreiben)
```
tests/integration/
  ├── conflict-detection.test.js
    # Szenario 1: Alice committet in 64.8.1, Bob versucht in 64.8.1
    #   → Pre-Commit Hook sollte Bob's Commit stoppen
    
    # Szenario 2: Alice 64.8.1 fertig, Bob startet 64.8.2
    #   → lock:advance sollte OK geben
    
    # Szenario 3: Parallele Blocks (V64 + V82)
    #   → Beide sollten OK sein (unterschiedliche scope_files)
```

### Smoke-Tests (manuell vor Release)
1. Test mit echtem Block (z.B. V64):
   ```bash
   npm run lock:claim V64 alice --phase=64.8.1
   # output: Lock created in docs/lock-status/alice.json ✓
   
   npm run lock:status
   # output: Shows alice's active lock ✓
   
   # Verändere Datei OUTSIDE scope_files
   echo "test" > src/random-unrelated-file.js
   npm run scope:validate
   # output: ❌ Hard Fail - File not in scope ✓
   
   # Restore
   git checkout src/random-unrelated-file.js
   ```

---

## Governance & Rules

**Respektiere diese bestehenden Rules:**
- `.agents/rules/git_and_commits.md` (Git Safety)
- `.agents/rules/planning_and_governance.md` (Phase Gates)
- Niemals `git stash` verwenden
- Umsetzungsplan als separater Commit (nicht mit Code-Änderungen)

**Neue Rules die entstehen:**
- Neuer Eintrag in `.agents/rules/git_and_commits.md` hinzufügen:
  ```markdown
  ## Scope & Phase Validation (neu)
  
  - Vor jedem Commit: `npm run scope:validate`
  - Scope-Violations sind Hard-Fails (pre-commit Hook blockiert)
  - Lock-Status wird in `docs/lock-status/` verwaltet (distributed, pro Person)
  - Phase-Sequenzierung wird von `phase:validate` erzwungen
  ```

---

## Out of Scope (NICHT implementieren)

- ❌ Automatisches Merging von Branches
- ❌ Komplexes Conflict-Resolution (nur Prevention)
- ❌ GUI/Web-Interface für Lock-Management (nur CLI)
- ❌ Changes an bestehenden Workflows (.agents/workflows/*.md) außer teamwork-coordination.md
- ❌ Refactoring bestehender Code-Base
- ❌ Breaking Changes zu Test-System oder Gates

---

## Implementierungs-Reihenfolge

**MUSS in dieser Reihenfolge sein:**

1. **Phase 1.1:** Distributed Lock-Files erstellen
   - `docs/lock-status/README.md`
   - `docs/lock-status/_locks-registry.json`
   - `docs/lock-status/.gitkeep`
   
2. **Phase 1.2:** Umsetzungsplan.md aktualisieren
   - Lock-Status Tabelle entfernen
   - Hinweis auf docs/lock-status/ hinzufügen

3. **Phase 2.1:** scope-validator.js implementieren
   - Core-Logik zuerst
   - Tests danach
   
4. **Phase 2.2:** phase-validator.js implementieren
   - Abhängig von scope-validator
   
5. **Phase 2.3:** lock-registry-merger.js implementieren
   - Abhängig von beiden oben
   
6. **Phase 2.4:** Pre-Commit Hook updaten
   - Ruft neue Validators auf
   
7. **Phase 2.5:** package.json scripts hinzufügen

8. **Phase 3.x:** Lock-CLIs implementieren (wenn Zeit)
   - lock-claim.js
   - lock-release.js
   - lock-advance.js

9. **Phase 4.x:** teamwork-coordination.md schreiben

---

## Commit-Strategie

Jede Phase = eigener Commit (gemäß `.agents/rules/git_and_commits.md`):

```bash
# Phase 1
git add docs/lock-status/
git commit -m "feat(V93 XX.X): distributed lock-file system for conflict prevention"

# Phase 2.1
git add .agents/scripts/scope-validator.js package.json
git commit -m "feat(V93 XX.X): scope-validation hook for phase enforcement"

# Phase 2.2
git add .agents/scripts/phase-validator.js
git commit -m "feat(V93 XX.X): phase-sequence validation (enforce order)"

# Phase 2.3
git add .agents/scripts/lock-registry-merger.js
git commit -m "feat(V93 XX.X): auto-merge lock-registry with conflict detection"

# Phase 2.4
git add .husky/pre-commit
git commit -m "feat(V93 XX.X): integrate validators into pre-commit hook"

# Phase 3
git add .agents/scripts/lock-claim.js .agents/scripts/lock-release.js .agents/scripts/lock-advance.js
git commit -m "feat(V93 XX.X): lock-management CLI (claim/release/advance)"

# Phase 4
git add .agents/workflows/teamwork-coordination.md
git commit -m "docs(V93 XX.X): teamwork coordination workflow for pairwork"
```

---

## Success Criteria

Nach Implementierung sollte folgendes funktionieren:

### ✅ Konflikt-Prävention
- [ ] Zwei Personen können auf unterschiedliche Blocks arbeiten (null Konflikte)
- [ ] Zwei Personen können parallele Phasen im selben Block NICHT committed, Pre-Commit Hook stoppt es
- [ ] Scope-Verletzungen werden Early erkannt (pre-commit, nicht erst beim Push)

### ✅ Lock-Management
- [ ] Lock-Status ist distributed (alice.json, bob.json)
- [ ] _locks-registry.json wird automatisch merged
- [ ] Keine Conflicts in Lock-Files selbst

### ✅ Usability
- [ ] CLI-Commands sind intuitiv (npm run lock:claim ...)
- [ ] Error-Messages sind klar und actionable
- [ ] Dokumentation ist verständlich (README.md, workflow)

### ✅ Testing
- [ ] Unit-Tests für jeden Validator grün
- [ ] Integration-Tests für Conflict-Szenarien grün
- [ ] Smoke-Tests bestanden (manuelle Validierung)

---

## Hinweise für Implementierungs-Agent

1. **Lies zuerst:**
   - `docs/Umsetzungsplan.md` (Lock-Status Tabelle verstehen)
   - `.agents/rules/git_and_commits.md` (Git-Policy)
   - `docs/plaene/aktiv/V64.md` oder ähnlich (scope_files Format verstehen)

2. **Code-Stil:**
   - Nutze JavaScript/Node.js (bestehendes .agents/scripts/ Pattern)
   - Schreib defensive Code (viele Edge Cases bei File-Operationen)
   - Nutze structured console output (✓, ✗, ⚠️)

3. **Fehlerbehandlung:**
   - Lock-Konflikte sollten NICHT silent fail
   - Immer klare Exit-Codes (0/1/2)
   - Hilfreiche Error-Messages mit Kontext

4. **Performance:**
   - Lock-Registry sollte < 100ms zu lesen sein
   - Pre-Commit Hook sollte < 2 Sekunden sein (nicht User-blocking)
   - Lazy-Load große Files

5. **Risiken & Mitigations:**
   - **Risiko:** Lock-Files werden manuell editiert (falsche JSON)
     → Mitigation: Strikte Validierung, .gitignore für invalid states
   
   - **Risiko:** Race Condition bei parallelem Git-Push
     → Mitigation: git-merge-driver für _locks-registry.json oder lock-files aktualisieren nach Pull
   
   - **Risiko:** Alte Lock-Einträge bleiben stecken
     → Mitigation: Cleanup-Script (npm run lock:cleanup --older-than=7days)

6. **Bei Blockers:**
   - Falls ein bestehender Script/Test problematisch ist: Stoppe und ask User
   - Falls scope unklar wird: ask vor wild guessing
   - Falls eine bestehende Rule konfligiert: dokumentiere und ask

---

## Acceptance Criteria (für User-Review)

Vor Abschluss:

- [ ] Alle Phase 1+2 Commits grün (npm run gates:pre-commit)
- [ ] Smoke-Tests bestanden (manuelle Validierung mit zwei Personen-Szenarien)
- [ ] Dokumentation ist verständlich und vollständig
- [ ] Keine Breaking Changes zu bestehenden Workflows
- [ ] Lock-System kann mit echten Blocks getestet werden
- [ ] Pre-Commit Hook läuft zuverlässig ohne False Positives

