# Feature: Settings Studio Erklaerbarkeit, Migrationspfad und Betriebs-Haertung (Vorschlag V97)

Stand: 2026-04-18
Status: Entwurf
Owner: frei
Risiko: mittel
plan_file: `docs/plaene/aktiv/V97.md`

## Ziel

Das vorhandene Settings Studio aus `V95` gezielt auf Produktreife nachschaerfen:

- Einstellungen sollen besser verstaendlich werden, ohne die Formularansicht mit Dauerklaertext zu ueberladen.
- Direkte Speicherung soll durch Save-Vorschau, bessere Rueckmeldungen und klarere Fehlerdiagnostik vertrauenswuerdiger werden.
- Persistenz soll durch explizite Schema-Migration, Backup-Retention und strukturierte Diagnosemarker zukunftssicherer werden.
- Accessibility, Tastaturbedienung und automatische Regressionstests sollen den produktiven Desktop-Pfad absichern.

Leitlinie gemaess Nutzerfeedback:

- Hauptformular bleibt kompakt.
- Hilfe wird progressiv eingeblendet, primaer ueber ein kleines `Info`-Element pro Feld und ein gemeinsames Detail-Panel oder einen Detail-Bereich.
- Erklaerungen fokussieren auf `Was macht das?`, `Wie wirkt es sich aus?`, `Typische Werte`, `Warnhinweise`.

## Desktop-first Scope und Demo-Grenze

- Zieloberflaeche bleibt die separate Electron-Desktop-App unter `electron/settings-studio/`.
- Browser-Demo erhaelt keine produktive Schreib-, Preview- oder Restore-Oberflaeche fuer Menu-Default-Overrides.
- Shared-Contracts duerfen erweitert werden, aber nur so, dass die Desktop-Oberflaeche primaerer Verbraucher bleibt.

## Nicht-Ziel

- Kein komplettes visuelles Redesign des Settings Studio fernab der bestehenden Layout-Struktur.
- Kein permanenter Erklaertext unter jedem Feld; die Form soll bewusst kompakt bleiben.
- Kein unkontrolliertes Live-Apply waehrend laufender Matches als neuer Primarpfad.
- Kein paralleles zweites Settings-Tool neben Settings Studio und bestehendem Developer-Tuning.
- Kein direkter Eingriff in produktive Browser-/Online-Surfaces ausser dort, wo Shared-Contracts denselben Pfad erfordern.

## Betroffene Dateien und Bereiche (geplant)

- `package.json`
- `.github/workflows/ci.yml`
- `electron/settings-studio/ipc/settings-studio-ipc.cjs`
- `electron/settings-studio/services/SettingsBackupService.cjs`
- `electron/settings-studio/services/SettingsOverrideFileService.cjs`
- `electron/settings-studio/services/SettingsSchemaService.cjs`
- `electron/settings-studio/ui/settings-studio.html`
- `electron/settings-studio/ui/settings-studio-app.js`
- `electron/settings-studio/ui/settings-studio-form-renderer.js`
- `electron/settings-studio/ui/settings-studio-i18n.js`
- `electron/settings-studio/ui/settings-studio.css`
- `src/core/settings/SettingsDefaultsFacade.js`
- `src/core/settings/SettingsOverrideContract.js`
- `src/core/settings/SettingsOverrideMergeOps.js`
- `tests/runtime-settings-live-apply.contract.test.mjs`
- `tests/persistence-version-migration.contract.test.mjs`
- `tests/settings-studio-override.contract.test.mjs`
- `tests/settings-studio.desktop.spec.js`

## Definition of Done

- [ ] DoD.1 Feld-Schema und Schema-Descriptor liefern erklaerende Metadaten fuer den relevanten Settings-Scope (`title`, `help`, `impact`, `example`, `riskLevel` oder aequivalente Keys) ohne die Hauptform aufzublaehen.
- [ ] DoD.2 Pro Feld ist eine kompakte Info-Interaktion verfuegbar; Erklaerungen erscheinen in einem gemeinsamen Detail-Panel oder Detail-Bereich statt als Dauertext unter jedem Input.
- [ ] DoD.3 Save-Vorschau zeigt vor persistenter Speicherung eine nachvollziehbare Aenderungsuebersicht (betroffene Bereiche, Feldwerte alt/neu, Warnhinweise bei extremen Werten).
- [ ] DoD.4 Override-Dateien besitzen einen expliziten Upgrade-/Reject-Pfad fuer kuenftige `menu-defaults-override`-Versionen; Legacy- oder Zukunftsfaelle liefern klare Diagnosecodes.
- [ ] DoD.5 Backup-Retention ist verbindlich geregelt und technisch umgesetzt, sodass `userData` nicht ungebremst waechst und Restore-faehige Snapshots erhalten bleiben.
- [ ] DoD.6 Load-, Save-, Restore- und Override-Skip-Pfade erzeugen strukturierte Diagnoseinformationen fuer UI und Logs.
- [ ] DoD.7 Keyboard-Navigation, Fokus-Reihenfolge, Dialog-/Panel-Fokusmanagement und Screenreader-Basisattribute sind fuer den Kernfluss belastbar.
- [ ] DoD.8 Automatische Regressionstests decken mindestens `laden -> aendern -> Vorschau -> speichern -> neu laden/anwenden` sowie Migration-, Retention- und Restore-Faelle ab und laufen im CI-Pfad mit.
- [ ] DoD.9 Desktop-only Surface-Policy bleibt erhalten; Browser-Demo bekommt keinen produktiven Schreibpfad.

## Intake-Hinweis fuer den User

- Ziel-Masterplan: `docs/Umsetzungsplan.md`
- vorgeschlagene Block-ID: `V97`
- vorgeschlagene kanonische Blockdatei: `docs/plaene/aktiv/V97.md`
- hard dependencies:
  - `V95.99` (Settings Studio Basispfad muss abgeschlossen vorliegen)
  - `V77.99` (Desktop-vs-Demo-Surface-Policy bleibt bindend)
  - `V92.99` (Ownership-/Facade-Ratchet fuer neue Config-, Diagnose- und Migrationspfade)
- soft dependencies:
  - `V81.99` (Developer-Tooling-Synergien fuer Diagnose-/Tuning-Abgrenzung)
  - `V64.99` (Desktop-Lifecycle-Polish kann Fokus-/Dialogverhalten spaeter vereinfachen)
- Hinweis: Manuelle Uebernahme in den Master-Index erforderlich.

## Evidence-Format fuer Abschluss-Haken

Jeder spaetere `[x]`-Eintrag nutzt:

`(abgeschlossen: YYYY-MM-DD; evidence: <command> -> <result file|commit>)`

## Phasenplan

### 97.1 Explainability-Contract und Feldmetadaten

status: open
goal: Erklaerbarkeit zentral im Schema statt verteilt in UI-Sonderfaellen abbilden
output: Feld-Registry und Schema-Descriptor mit Help-/Impact-Metadaten

- [ ] 97.1.1 Feld-Registry in `SettingsOverrideContract` um erklaerende Metadaten erweitern (`infoKey`, `impactKey`, `example`, `riskLevel`, optionale `unit`/`audience`) und Default-/Fallback-Regeln fuer fehlende Texte festlegen.
- [ ] 97.1.2 Bereichs- und Kategorienamen aus Nutzersicht nachschaerfen, ohne die bestehende technische Struktur aufzubrechen; Fokus auf lesbare Begriffe statt interner Pfadlogik.
- [ ] 97.1.3 Schema-Descriptor so erweitern, dass UI, Save-Vorschau und Diagnostik dieselbe Metadatenquelle nutzen und keine doppelten Textquellen entstehen.

### 97.2 Kompakte Erklaer-UX mit Info-Button

status: open
goal: Hilfe gezielt verfuegbar machen, ohne die Formularansicht zu ueberladen
output: Info-Interaktion pro Feld plus gemeinsamer Detailbereich

- [ ] 97.2.1 Pro Feld ein kleines `Info`-Element oder aequivalente Interaktion einfuehren, die per Maus und Tastatur erreichbar ist und den aktuellen Fokuskontext oeffnet.
- [ ] 97.2.2 Gemeinsames Info-Panel oder Detail-Bereich in `settings-studio.html`/`settings-studio-app.js` integrieren, das fuer das ausgewaehlte Feld `Wirkung`, `typische Werte`, `Warnungen` und Default-Kontext zeigt.
- [ ] 97.2.3 Layout, Spacing und Statusdarstellung so nachziehen, dass die Hauptform weiterhin kompakt bleibt und das Info-System auch bei langen Sektionen nicht unuebersichtlich wird.

### 97.3 Save-Vorschau und Vertrauenssignale

status: open
goal: Direkte Persistenz vor dem Save nachvollziehbar machen
output: Aenderungsvorschau mit Diff-Zusammenfassung und Guardrails

- [ ] 97.3.1 Vor `save` einen Vorschau-Schritt oder bestaetigenden Review-Dialog einziehen, der geaenderte Felder gruppiert nach Bereichen mit Alt-/Neu-Werten zusammenfasst.
- [ ] 97.3.2 Extreme Werte, limitnahe Aenderungen und risikoreiche Felder in der Vorschau sichtbar markieren, damit Save nicht als Blackbox wirkt.
- [ ] 97.3.3 Backup- und Speicherziel in der Vorschau transparent machen (`override file`, neues Backup, ggf. prune-Hinweis), ohne den Kernflow zu verkomplizieren.

### 97.4 Schema-Migration und Diagnosemarker

status: open
goal: Zukuenftige Override-Versionen sauber behandeln statt nur hart abzuweisen
output: Versionierter Upgrade-/Reject-Pfad mit klaren Reason-Codes

- [ ] 97.4.1 Migrationsops fuer `menu-defaults-override` einfuehren, die mindestens `current`, `upgrade`, `fallback`, `reject` explizit klassifizieren und auf die bestehende Contract-Validierung aufsetzen.
- [ ] 97.4.2 Load-/Restore-Pfade so erweitern, dass Migrationsentscheidungen, Skip-Gruende und Validierungsursachen strukturiert an UI und Logs gemeldet werden.
- [ ] 97.4.3 `SettingsDefaultsFacade`-Diagnosemarker auf konsistente Reason-Codes und reproduzierbare Fehlerbilder festziehen, damit verworfene Overrides spaeter leichter analysierbar sind.

### 97.5 Backup-Retention und Restore-Haertung

status: open
goal: Backup-Sicherheit bewahren, aber unkontrolliertes Wachstum verhindern
output: Rotationsregeln und sichere Restore-Hygiene

- [ ] 97.5.1 Verbindliche Retention-Policy definieren (z. B. Maximalanzahl, Altersgrenze, Schutz der juengsten Restore-relevanten Snapshots) und in `SettingsBackupService` umsetzen.
- [ ] 97.5.2 Backup-Listing und Restore so erweitern, dass Retention-Status, geprunte Dateien und verbleibende Restore-Punkte nachvollziehbar bleiben.
- [ ] 97.5.3 Fehlerfaelle bei Backup-Erstellung, Restore und Prune mit klarer Eskalation behandeln, damit Save/Restore nicht still scheitert.

### 97.6 Accessibility, Tastaturfluss und Fokusmanagement

status: open
goal: Formular, Info-Panel und Save-Vorschau auch ohne Maus sicher bedienbar machen
output: Belastbarer Keyboard- und Focus-Flow

- [ ] 97.6.1 Tab-Reihenfolge, Fokus-Styles, Shortcut-/Escape-Verhalten und Fokus-Rueckgabe fuer Info-Panel, Save-Vorschau und Restore-Dialog verbindlich festziehen.
- [ ] 97.6.2 Semantische Rollen, Labels, `aria-describedby`-Verknuepfungen und Status-/Fehlermeldungen fuer Screenreader-Basisabdeckung nachziehen.
- [ ] 97.6.3 Kernfluesse per Tastatur-Checkliste absichern: Navigation, Feldinfo oeffnen/schliessen, Validieren, Save-Vorschau bestaetigen, Backup-Restore.

### 97.7 Automatische Regressionstests und CI-Verankerung

status: open
goal: Die neuen Schutzmechanismen reproduzierbar und dauerhaft gruensicher machen
output: Zielgerichtete Contract-/Desktop-Tests plus CI-Hook

- [ ] 97.7.1 Node-Contracttests fuer Migration, Retention, Diagnosecodes und Save-/Restore-Randfaelle anlegen oder bestehende Settings-Tests gezielt erweitern.
- [ ] 97.7.2 Einen automatisierten Desktop- oder UI-nahen Regressionspfad fuer `laden -> aendern -> Vorschau -> speichern -> neu laden/anwenden` aufnehmen, der auf dem Settings-Studio-Flow sitzt statt nur allgemeinem Runtime-Smoke.
- [ ] 97.7.3 `package.json` und `.github/workflows/ci.yml` so erweitern, dass diese zielgerichteten Guards im regulaeren CI-Pfad mitlaufen, ohne den Browser-Demo-Pfad zur produktiven Leitflaeche zu machen.

### 97.99 Abschluss-Gate

status: open
goal: Explainability- und Hardening-Follow-up reproduzierbar abschliessen
output: Gruene UX-, Persistenz- und Guard-Gates

- [ ] 97.99.1 Build-/Start-Smoke fuer App und Settings Studio ist gruen (`npm run build:app`, `npm run app:settings:start`).
- [ ] 97.99.2 Zielgerichtete Contract-/Regressionstests fuer Migration, Retention, Diagnose und Save-Vorschau sind gruen und im CI angebunden.
- [ ] 97.99.3 Keyboard-/Accessibility-Kernfluss ist dokumentiert nachgewiesen: Feld ansteuern -> Info oeffnen -> Wert aendern -> Vorschau -> speichern -> neu laden/anwenden.
- [ ] 97.99.4 Governance-Gates sind gruen (`npm run plan:check`, `npm run docs:sync`, `npm run docs:check`).

## Risiken

- R1 | mittel | Zu viele Hilfetexte oder schlechte Panel-Platzierung machen die UI trotz guter Absicht unruhiger statt klarer.
  Mitigation: Info nur progressiv einblenden, Panel zentralisieren, keine Dauertexte als Default.
- R2 | mittel | Metadaten-Drift zwischen Feld-Registry, I18n und Save-Vorschau erzeugt widerspruechliche Erklaerungen.
  Mitigation: eine gemeinsame Metadatenquelle im Schema-Descriptor, keine UI-eigenen Schattenlisten.
- R3 | hoch | Fehlerhafte Migration oder aggressive Retention gefaehrdet bestehende Override- oder Backup-Dateien.
  Mitigation: klare Migrationsentscheidungen, pre-migration/pre-restore-Backups, konservative Prune-Regeln.
- R4 | mittel | Neue Dialoge und Panels verschlechtern Tastaturfluss und Fokusmanagement, wenn Accessibility nicht von Anfang an mitgeschnitten wird.
  Mitigation: Fokus- und A11y-Anforderungen als eigene Phase, nicht als Spaetpolitur.
- R5 | mittel | Neuer CI-Regressionstest wird flakey, wenn zu viel UI-Zustand oder Window-Lifecycle indirekt getestet wird.
  Mitigation: Contract-/Service-Tests fuer Logik, schmaler Desktop-Smoke nur fuer kritischen End-to-End-Pfad.
