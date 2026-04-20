const DICTIONARY = Object.freeze({
    de: Object.freeze({
        title: 'CurviosClash Settings Studio',
        buttonReload: 'Neu laden',
        buttonValidate: 'Validieren',
        buttonSave: 'Speichern',
        buttonResetSection: 'Bereich zuruecksetzen',
        buttonResetAll: 'Alles zuruecksetzen',
        buttonResetField: 'Reset',
        buttonInfo: 'ⓘ',
        statusReady: 'Bereit',
        statusLoading: 'Lade Daten...',
        statusValid: 'Validierung erfolgreich',
        statusInvalid: 'Validierung fehlgeschlagen',
        statusSaved: 'Gespeichert und Backup erstellt',
        statusError: 'Fehler',
        languageLabel: 'Sprache',
        changeBadge: (n) => `${n} Aenderung${n === 1 ? '' : 'en'}`,
        sectionBaseSettings: 'Spiel-Standardwerte',
        sectionLocalSettings: 'Lokale Anpassungen',
        sectionFixedPresets: 'Preset-Konfigurationen',
        sectionConfigShare: 'Config-Share-Werte',
        sectionLevel3Reset: 'Level-3-Zuruecksetzen',
        sectionLimits: 'Grenzen (min/max/step)',
        sectionBackups: 'Backups & Restore',
        buttonRestore: 'Wiederherstellen',
        restoreConfirm: 'Backup wirklich wiederherstellen? Aktuelle Daten werden vorher gesichert.',
        unsavedChangesWarning: 'Es gibt ungespeicherte Aenderungen. Seite wirklich verlassen?',
        noBackups: 'Keine Backups vorhanden.',
        noFields: 'Keine Felder verfuegbar.',
        noPresets: 'Keine Presets vorhanden.',
        sectionHintBaseSettings: 'Diese Werte sind die eigentlichen Spiel-Defaults beim Start eines Matches.',
        sectionHintConfigShare: 'Dieser Bereich steuert Config-Share-Daten und nicht die aktiven Spiel-Defaults.',
        sectionHintLimits: 'Dieser Bereich aendert nur min/max/step im Studio. Er aendert nicht den Spielwert selbst.',
        categoryGameplay: 'Gameplay',
        categoryBotBridge: 'Bot Bridge',
        categoryHunt: 'Hunt',
        categoryRecording: 'Aufnahme',
        categoryCameraPerspective: 'Kamera',
        categoryPresets: 'Presets',
        categoryBase: 'Basis',
        categoryLocal: 'Lokal',
        categoryLevel3: 'Level3',
        categoryConfigShare: 'Config Share',
        limitsColField: 'Feld',
        limitsColDefault: 'Standard',
        limitsColMin: 'min',
        limitsColMax: 'max',
        limitsColStep: 'step',
        infoPanelTitle: 'Feldinformation',
        infoPanelClose: 'Schliessen',
        infoPanelHelp: 'Was macht das?',
        infoPanelImpact: 'Auswirkung',
        infoPanelExample: 'Typischer Wert',
        infoPanelUnit: 'Einheit',
        infoPanelDefault: 'Standard-Wert',
        infoPanelNoInfo: 'Keine Zusatzinformation verfuegbar.',
        savePreviewTitle: 'Aenderungen pruefen vor dem Speichern',
        savePreviewConfirm: 'Jetzt speichern',
        savePreviewCancel: 'Abbrechen',
        savePreviewNoChanges: 'Keine Aenderungen gegenueber dem gespeicherten Stand.',
        savePreviewFieldOld: 'Alt',
        savePreviewFieldNew: 'Neu',
        savePreviewBackupNote: 'Vor dem Speichern wird automatisch ein Backup angelegt.',
        savePreviewRiskWarning: 'Achtung: Dieses Feld hat hohes Risiko. Bitte sorgfaeltig pruefen.',
        riskHigh: 'Hoch',
        riskMedium: 'Mittel',
        riskLow: 'Niedrig',
        diagMigrationUpgrade: 'Override-Datei wurde auf aktuelle Schema-Version migriert.',
        diagMigrationFallback: 'Unbekannte Schema-Version – Standard-Werte werden verwendet.',
        diagMigrationReject: 'Override-Datei ist beschaedigt und wurde verworfen.',
        backupRetentionNote: (max) => `Es werden maximal ${max} Backups aufbewahrt.`,
        errorSCHEMA_VERSION_MISMATCH: 'Schema-Version stimmt nicht ueberein.',
        errorLIMIT_MIN_INVALID: 'Minimum-Grenze ist ungueltig.',
        errorLIMIT_MAX_INVALID: 'Maximum-Grenze ist ungueltig.',
        errorLIMIT_STEP_INVALID: 'Step-Grenze ist ungueltig.',
        errorLIMIT_STEP_NON_POSITIVE: 'Step muss groesser als 0 sein.',
        errorLIMIT_RANGE_INVALID: 'Minimum darf nicht groesser als Maximum sein.',
        errorLIMIT_FIELD_UNKNOWN: 'Unbekanntes Feld fuer Limit-Override.',
        errorFIELD_NUMBER_INVALID: 'Ungueltige Zahl.',
        errorFIELD_NUMBER_BELOW_MIN: (min) => `Wert liegt unter dem Minimum (${min}).`,
        errorFIELD_NUMBER_ABOVE_MAX: (max) => `Wert liegt ueber dem Maximum (${max}).`,
        errorFIELD_NUMBER_STEP_MISALIGN: 'Wert liegt nicht auf dem Step-Raster.',
        errorFIELD_INTEGER_REQUIRED: 'Ganze Zahl erforderlich.',
        errorFIELD_BOOLEAN_INVALID: 'Boolean-Wert erwartet.',
        errorFIELD_STRING_INVALID: 'Text-Wert erwartet.',
        errorFIELD_PRESETS_INVALID: 'fixedPresets muss ein Array sein.',
    }),
    en: Object.freeze({
        title: 'CurviosClash Settings Studio',
        buttonReload: 'Reload',
        buttonValidate: 'Validate',
        buttonSave: 'Save',
        buttonResetSection: 'Reset section',
        buttonResetAll: 'Reset all',
        buttonResetField: 'Reset',
        buttonInfo: 'ⓘ',
        statusReady: 'Ready',
        statusLoading: 'Loading data...',
        statusValid: 'Validation passed',
        statusInvalid: 'Validation failed',
        statusSaved: 'Saved and backup created',
        statusError: 'Error',
        languageLabel: 'Language',
        changeBadge: (n) => `${n} change${n === 1 ? '' : 's'}`,
        sectionBaseSettings: 'Game Defaults',
        sectionLocalSettings: 'Local Adjustments',
        sectionFixedPresets: 'Preset Configurations',
        sectionConfigShare: 'Config Share Values',
        sectionLevel3Reset: 'Level 3 Reset Values',
        sectionLimits: 'Limits (min/max/step)',
        sectionBackups: 'Backups & Restore',
        buttonRestore: 'Restore',
        restoreConfirm: 'Restore this backup? Current data will be backed up first.',
        unsavedChangesWarning: 'There are unsaved changes. Leave page?',
        noBackups: 'No backups available.',
        noFields: 'No fields available.',
        noPresets: 'No presets available.',
        sectionHintBaseSettings: 'These values are the actual gameplay defaults used when a match starts.',
        sectionHintConfigShare: 'This section controls config-share data, not the active gameplay defaults.',
        sectionHintLimits: 'This section changes min/max/step in the studio only. It does not change the gameplay value itself.',
        categoryGameplay: 'Gameplay',
        categoryBotBridge: 'Bot Bridge',
        categoryHunt: 'Hunt',
        categoryRecording: 'Recording',
        categoryCameraPerspective: 'Camera',
        categoryPresets: 'Presets',
        categoryBase: 'Base',
        categoryLocal: 'Local',
        categoryLevel3: 'Level3',
        categoryConfigShare: 'Config Share',
        limitsColField: 'Field',
        limitsColDefault: 'Default',
        limitsColMin: 'min',
        limitsColMax: 'max',
        limitsColStep: 'step',
        infoPanelTitle: 'Field Info',
        infoPanelClose: 'Close',
        infoPanelHelp: 'What does this do?',
        infoPanelImpact: 'Effect',
        infoPanelExample: 'Typical value',
        infoPanelUnit: 'Unit',
        infoPanelDefault: 'Default value',
        infoPanelNoInfo: 'No additional information available.',
        savePreviewTitle: 'Review changes before saving',
        savePreviewConfirm: 'Save now',
        savePreviewCancel: 'Cancel',
        savePreviewNoChanges: 'No changes compared to the saved state.',
        savePreviewFieldOld: 'Old',
        savePreviewFieldNew: 'New',
        savePreviewBackupNote: 'A backup will be created automatically before saving.',
        savePreviewRiskWarning: 'Warning: This field has high risk. Please review carefully.',
        riskHigh: 'High',
        riskMedium: 'Medium',
        riskLow: 'Low',
        diagMigrationUpgrade: 'Override file was migrated to the current schema version.',
        diagMigrationFallback: 'Unknown schema version – default values are used.',
        diagMigrationReject: 'Override file is corrupt and was discarded.',
        backupRetentionNote: (max) => `A maximum of ${max} backups are retained.`,
        errorSCHEMA_VERSION_MISMATCH: 'Schema version mismatch.',
        errorLIMIT_MIN_INVALID: 'Invalid minimum limit.',
        errorLIMIT_MAX_INVALID: 'Invalid maximum limit.',
        errorLIMIT_STEP_INVALID: 'Invalid step limit.',
        errorLIMIT_STEP_NON_POSITIVE: 'Step must be greater than 0.',
        errorLIMIT_RANGE_INVALID: 'Minimum must not exceed maximum.',
        errorLIMIT_FIELD_UNKNOWN: 'Unknown field for limit override.',
        errorFIELD_NUMBER_INVALID: 'Invalid number.',
        errorFIELD_NUMBER_BELOW_MIN: (min) => `Value is below minimum (${min}).`,
        errorFIELD_NUMBER_ABOVE_MAX: (max) => `Value exceeds maximum (${max}).`,
        errorFIELD_NUMBER_STEP_MISALIGN: 'Value does not align with step grid.',
        errorFIELD_INTEGER_REQUIRED: 'Integer required.',
        errorFIELD_BOOLEAN_INVALID: 'Boolean value expected.',
        errorFIELD_STRING_INVALID: 'String value expected.',
        errorFIELD_PRESETS_INVALID: 'fixedPresets must be an array.',
    }),
});

export function normalizeLanguage(language) {
    const normalized = String(language || 'de').trim().toLowerCase();
    return normalized === 'en' ? 'en' : 'de';
}

export function createTranslator(language) {
    const lang = normalizeLanguage(language);
    const table = DICTIONARY[lang];
    return (key, ...args) => {
        const entry = table[key] ?? DICTIONARY.de[key] ?? key;
        return typeof entry === 'function' ? entry(...args) : entry;
    };
}

export const SECTIONS = Object.freeze([
    { key: 'baseSettings', labelKey: 'sectionBaseSettings' },
    { key: 'localSettings', labelKey: 'sectionLocalSettings' },
    { key: 'fixedPresets', labelKey: 'sectionFixedPresets' },
    { key: 'configShare', labelKey: 'sectionConfigShare' },
    { key: 'level3Reset', labelKey: 'sectionLevel3Reset' },
    { key: 'limits', labelKey: 'sectionLimits' },
    { key: 'backups', labelKey: 'sectionBackups', noDirty: true },
]);

export function translateValidationError(error, t) {
    if (!error) return '';
    const key = `error${error.code}`;
    const entry = DICTIONARY.de[key] ?? null;
    if (entry == null) return error.message || error.code || '';
    const translated = t(key);
    if (translated === key) return error.message || error.code || '';
    if (typeof DICTIONARY.de[key] === 'function') {
        const match = (error.message || '').match(/\(([^)]+)\)/);
        const param = match ? match[1] : '';
        return t(key, param);
    }
    return translated;
}

export function fieldLabel(path) {
    const parts = String(path || '').split('.');
    const last = parts[parts.length - 1] || path;
    return last.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export function categoryLabel(category, t) {
    const key = `category${category.charAt(0).toUpperCase()}${category.slice(1)}`;
    const result = t(key);
    return result !== key ? result : category;
}
