// ============================================
// MenuPresetStateSync.js - sync helper for preset-related UI state
// ============================================

export function syncMenuPresetState({ ui, settings, settingsManager }) {
    if (!ui || !settings) return;
    const activePresetId = String(settings?.matchSettings?.activePresetId || '');
    const activePresetKind = String(settings?.matchSettings?.activePresetKind || '');

    if (ui.presetSelect) {
        const presets = settingsManager?.listMenuPresets?.() || [];
        const previousValue = String(ui.presetSelect.value || '');
        ui.presetSelect.innerHTML = '';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Preset waehlen';
        ui.presetSelect.appendChild(placeholderOption);

        presets.forEach((preset) => {
            const option = document.createElement('option');
            const presetId = String(preset?.id || '').trim();
            const presetKind = String(preset?.metadata?.kind || '').trim();
            option.value = presetId;
            option.textContent = presetKind === 'fixed'
                ? `${preset.name} (verbindlich)`
                : `${preset.name} (frei)`;
            ui.presetSelect.appendChild(option);
        });

        const preferredValue = activePresetId || previousValue;
        if (preferredValue) {
            const hasOption = Array.from(ui.presetSelect.options).some((option) => option.value === preferredValue);
            ui.presetSelect.value = hasOption ? preferredValue : '';
        }
    }

    if (Array.isArray(ui.quickstartPresetButtons)) {
        ui.quickstartPresetButtons.forEach((button) => {
            const buttonPresetId = String(button?.dataset?.presetId || '').trim();
            const isActive = !!buttonPresetId && buttonPresetId === activePresetId;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    if (ui.presetStatus) {
        if (!activePresetId) {
            ui.presetStatus.textContent = 'Preset: individuell';
        } else {
            const presetKindLabel = activePresetKind === 'fixed' ? 'verbindlich' : 'frei';
            ui.presetStatus.textContent = `Preset: ${activePresetId} (${presetKindLabel})`;
        }
    }
}
