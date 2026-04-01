import assert from 'node:assert/strict';
import test from 'node:test';

import { validatePlanContent } from '../scripts/validate-umsetzungsplan.mjs';

const VALID_BLOCK = `---
id: V71
title: Repo-Aufraeumen Runtime-sicher
status: blocked
priority: P1
owner: frei
depends_on:
  - V43-Strukturvertrag
blocked_by:
  - Warmup-Blocker
scope_files:
  - tmp/
verification:
  - npm run plan:check
updated_at: 2026-04-01
---

# V71 Repo-Aufraeumen Runtime-sicher

## Ziel
Cleanup sicher schneiden.

## Nicht-Ziel
- Kein Blindflug.

## Definition of Done
- [ ] DoD.1 Scope steht.
- [ ] DoD.2 Risiken stehen.
- [ ] DoD.3 Gates stehen.
- [ ] DoD.4 Ownership steht.

## Risiken
- R1 | mittel | Beispiel.

## Phasen

### 71.1 Analyse
status: done
goal: Inventar
output: Scope

- [x] 71.1.1 Inventar erstellen (abgeschlossen: 2026-04-01; evidence: commit abc123)
- [x] 71.1.2 Risiken sammeln (abgeschlossen: 2026-04-01; evidence: commit abc123)

### 71.99 Abschluss-Gate
status: blocked
goal: Gate
output: Reststatus

- [ ] 71.99.1 Gates fahren
- [ ] 71.99.2 Restblocker dokumentieren
`;

test('validatePlanContent accepts a structurally valid master index with linked active block', async () => {
    const content = `
## Aktive Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V71 | Repo-Aufraeumen Runtime-sicher | blocked | P1 | frei | V43-Strukturvertrag | 71.99 | \`docs/plaene/aktiv/V71.md\` |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V71 | V43-Strukturvertrag | hard | ja | Beispiel |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V71 | - | frei | Restgate |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-04-01 | Bot-A | Shared | \`docs/Umsetzungsplan.md\` | Beispiel | Beispiel | offen |
`.trim();

    const violations = await validatePlanContent('docs/Umsetzungsplan.md', content, {
        fileExistsImpl: async () => true,
        readFileImpl: async (relPath) => {
            assert.equal(relPath, 'docs/plaene/aktiv/V71.md');
            return VALID_BLOCK;
        },
    });

    assert.deepEqual(violations, []);
});

test('validatePlanContent flags missing plan_file and invalid current_phase in master index', async () => {
    const content = `
## Aktive Bloecke

| id | titel | status | prio | owner | depends_on | current_phase | plan_file |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V71 | Repo-Aufraeumen Runtime-sicher | blocked | P1 | frei | V43-Strukturvertrag | 72.1 |  |

## Abhaengigkeiten

| Block | Depends-On | Typ | Erfuellt | Hinweis |
| --- | --- | --- | --- | --- |
| V71 | V43-Strukturvertrag | hard | ja | Beispiel |

## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V71 | - | frei | Restgate |

## Conflict-Log

| Datum | Agent | Fremder Block/Stream | Datei | Grund | Loesung | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-04-01 | Bot-A | Shared | \`docs/Umsetzungsplan.md\` | Beispiel | Beispiel | offen |
`.trim();

    const violations = await validatePlanContent('docs/Umsetzungsplan.md', content, {
        fileExistsImpl: async () => false,
    });
    const messages = violations.map((violation) => violation.message);

    assert(messages.some((message) => message.includes('current_phase "72.1" passt nicht zu V71')));
    assert(messages.some((message) => message.includes('plan_file verweist auf fehlende Datei')));
});

test('validatePlanContent flags missing Nicht-Ziel, missing 99 gate and missing status in active block', async () => {
    const content = `---
id: V72
title: Beispielblock
status: planned
priority: P1
owner: frei
depends_on:
  - V69.99
blocked_by: []
scope_files:
  - src/example.js
verification:
  - npm run plan:check
updated_at: 2026-04-01
---

# V72 Beispielblock

## Ziel
Beispiel.

## Definition of Done
- [ ] DoD.1 A
- [ ] DoD.2 B
- [ ] DoD.3 C
- [ ] DoD.4 D

## Risiken
- R1 | mittel | Beispiel.

## Phasen

### 72.1 Analyse
goal: Analyse
output: Scope

- [ ] 72.1.1 Punkt A
- [ ] 72.1.2 Punkt B
`;

    const violations = await validatePlanContent('docs/plaene/aktiv/V72.md', content);
    const messages = violations.map((violation) => violation.message);

    assert(messages.some((message) => message.includes('Section "## Nicht-Ziel" fehlt')));
    assert(messages.some((message) => message.includes('hat kein Abschluss-Gate 72.99')));
    assert(messages.some((message) => message.includes('hat keine status:-Zeile')));
});
