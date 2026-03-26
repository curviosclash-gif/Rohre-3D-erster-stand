import assert from 'node:assert/strict';
import test from 'node:test';

import { validatePlanContent } from '../scripts/validate-umsetzungsplan.mjs';

const fileExistsImpl = async () => true;

test('validatePlanContent accepts a structurally valid master-plan block', async () => {
    const content = `
## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| Bot-A | V1 | 2026-03-26 | active | - |

## Block V1: Beispielblock

Plan-Datei: \`docs/Umsetzungsplan.md\`

<!-- LOCK: Bot-A seit 2026-03-26 -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 1.1 bis 1.2 und 1.99 sind abgeschlossen.

### 1.1 Analyse

- [x] 1.1.1 Scope bestaetigen (abgeschlossen: 2026-03-26; evidence: commit abc1234)
- [x] 1.1.2 Risiko sammeln (abgeschlossen: 2026-03-26; evidence: commit abc1234)

### 1.2 Umsetzung

- [ ] 1.2.1 Aenderung umsetzen
- [ ] 1.2.2 Verifikation vorbereiten

### Phase 1.99: Abschluss-Gate

- [ ] 1.99.1 Plan-Check ausfuehren
- [ ] 1.99.2 Lock freigeben

### Risiko-Register V1

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Beispiel | niedrig | QA | Check | Trigger |
`.trim();

    const violations = await validatePlanContent('docs/Umsetzungsplan.md', content, { fileExistsImpl });

    assert.deepEqual(violations, []);
});

test('validatePlanContent flags missing .99 gate, missing risk register and stale DoD references', async () => {
    const content = `
## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V58 | - | frei | - |

## Block V58: Architektur-Bereinigung

Plan-Datei: \`docs/Umsetzungsplan.md\`

<!-- LOCK: frei -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 58.1 bis 58.4 sind abgeschlossen.

### 58.1 Budget-Fixes

- [x] 58.1.1 Kante A entschraerfen (abgeschlossen: 2026-03-26; evidence: commit 1111111)
- [x] 58.1.2 Kante B entschraerfen (abgeschlossen: 2026-03-26; evidence: commit 1111111)

### 58.2 Decomposition

- [ ] 58.2.1 Modul teilen
- [ ] 58.2.2 Exportpfad pruefen
`.trim();

    const violations = await validatePlanContent('docs/Umsetzungsplan.md', content, { fileExistsImpl });
    const messages = violations.map((violation) => violation.message);

    assert(messages.some((message) => message.includes('kein Abschluss-Gate 58.99')));
    assert(messages.some((message) => message.includes('endet mit 58.2 statt 58.99')));
    assert(messages.some((message) => message.includes('kein "Risiko-Register V58"')));
    assert(messages.some((message) => message.includes('DoD.1 referenziert fehlende Phasen') && message.includes('58.3') && message.includes('58.4')));
});

test('validatePlanContent flags duplicate lock rows and active/free mismatches', async () => {
    const content = `
## Lock-Status

| Agent | Block / Stream | Start-Datum | Status | Ziel-Abschluss |
| --- | --- | --- | --- | --- |
| - | V59 | - | frei | - |
| Bot-B | V59 | 2026-03-26 | active | - |

## Block V59: Netzwerk-Haertung

Plan-Datei: \`docs/Umsetzungsplan.md\`

<!-- LOCK: frei -->

### Definition of Done (DoD)

- [ ] DoD.1 Alle Phasen 59.1 und 59.99 sind abgeschlossen.

### 59.1 Adapter

- [ ] 59.1.1 Adapter A bereinigen
- [ ] 59.1.2 Adapter B bereinigen

### Phase 59.99: Abschluss-Gate

- [ ] 59.99.1 Gate A
- [ ] 59.99.2 Gate B

### Risiko-Register V59

| Risiko | Severity | Owner | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Beispiel | mittel | Core | Check | Trigger |
`.trim();

    const violations = await validatePlanContent('docs/Umsetzungsplan.md', content, { fileExistsImpl });
    const messages = violations.map((violation) => violation.message);

    assert(messages.some((message) => message.includes('mehrere Lock-Status-Zeilen (2)')));
    assert(messages.some((message) => message.includes('widerspricht LOCK-Header "frei"')));
});
