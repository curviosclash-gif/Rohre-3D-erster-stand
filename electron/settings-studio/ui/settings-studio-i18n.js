const DICTIONARY = Object.freeze({
    de: Object.freeze({
        title: 'CurviosClash Settings Studio',
        buttonReload: 'Neu laden',
        buttonValidate: 'Validieren',
        buttonSave: 'Speichern',
        buttonResetSection: 'Bereich zuruecksetzen',
        buttonResetAll: 'Alles zuruecksetzen',
        buttonResetField: 'Reset',
        statusReady: 'Bereit',
        statusLoading: 'Lade Daten...',
        statusValid: 'Validierung erfolgreich',
        statusInvalid: 'Validierung fehlgeschlagen',
        statusSaved: 'Gespeichert und Backup erstellt',
        statusError: 'Fehler',
        languageLabel: 'Sprache',
        changeBadge: (n) => `${n} Aenderung${n === 1 ? '' : 'en'}`,
        sectionBaseSettings: 'Basis-Einstellungen',
        sectionLocalSettings: 'Lokale Einstellungen',
        sectionFixedPresets: 'Feste Presets',
        sectionConfigShare: 'Config Share',
        sectionLevel3Reset: 'Level3 Reset',
        sectionLimits: 'Grenzen (min/max/step)',
        sectionBackups: 'Backups & Restore',
        buttonRestore: 'Wiederherstellen',
        restoreConfirm: 'Backup wirklich wiederherstellen? Aktuelle Daten werden vorher gesichert.',
        noBackups: 'Keine Backups vorhanden.',
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
    }),
    en: Object.freeze({
        title: 'CurviosClash Settings Studio',
        buttonReload: 'Reload',
        buttonValidate: 'Validate',
        buttonSave: 'Save',
        buttonResetSection: 'Reset section',
        buttonResetAll: 'Reset all',
        buttonResetField: 'Reset',
        statusReady: 'Ready',
        statusLoading: 'Loading data...',
        statusValid: 'Validation passed',
        statusInvalid: 'Validation failed',
        statusSaved: 'Saved and backup created',
        statusError: 'Error',
        languageLabel: 'Language',
        changeBadge: (n) => `${n} change${n === 1 ? '' : 's'}`,
        sectionBaseSettings: 'Base Settings',
        sectionLocalSettings: 'Local Settings',
        sectionFixedPresets: 'Fixed Presets',
        sectionConfigShare: 'Config Share',
        sectionLevel3Reset: 'Level3 Reset',
        sectionLimits: 'Limits (min/max/step)',
        sectionBackups: 'Backups & Restore',
        buttonRestore: 'Restore',
        restoreConfirm: 'Restore this backup? Current data will be backed up first.',
        noBackups: 'No backups available.',
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
