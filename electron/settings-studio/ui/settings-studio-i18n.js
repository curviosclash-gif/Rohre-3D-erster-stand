const DICTIONARY = Object.freeze({
    de: Object.freeze({
        title: 'CurviosClash Settings Studio',
        subtitle: 'Phase 95.2 Shell aktiv: Laden, validieren, speichern, Backups',
        buttonReload: 'Neu laden',
        buttonValidate: 'Validieren',
        buttonSave: 'Speichern',
        statusReady: 'Bereit',
        statusLoading: 'Lade Daten...',
        statusValid: 'Validierung erfolgreich',
        statusInvalid: 'Validierung fehlgeschlagen',
        statusSaved: 'Gespeichert und Backup erstellt',
        statusError: 'Fehler',
        languageLabel: 'Sprache',
        sectionDraft: 'Draft Uebersicht',
        sectionLimits: 'Limit-Uebersicht',
        sectionValidation: 'Validierung',
    }),
    en: Object.freeze({
        title: 'CurviosClash Settings Studio',
        subtitle: 'Phase 95.2 shell active: load, validate, save, backups',
        buttonReload: 'Reload',
        buttonValidate: 'Validate',
        buttonSave: 'Save',
        statusReady: 'Ready',
        statusLoading: 'Loading data...',
        statusValid: 'Validation passed',
        statusInvalid: 'Validation failed',
        statusSaved: 'Saved and backup created',
        statusError: 'Error',
        languageLabel: 'Language',
        sectionDraft: 'Draft Summary',
        sectionLimits: 'Limits Summary',
        sectionValidation: 'Validation',
    }),
});

export function normalizeLanguage(language) {
    const normalized = String(language || 'de').trim().toLowerCase();
    return normalized === 'en' ? 'en' : 'de';
}

export function createTranslator(language) {
    const activeLanguage = normalizeLanguage(language);
    const table = DICTIONARY[activeLanguage];
    return (key) => table[key] || DICTIONARY.de[key] || key;
}
