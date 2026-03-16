// ============================================
// ProfileUiController.js - profile management UI controller
// ============================================

import { deriveProfileControlSelectState } from './ProfileControlStateOps.js';
import { deriveProfileActionUiState } from './ProfileUiStateOps.js';

export class ProfileUiController {
    /**
     * @param {{
     *   profileManager: object,
     *   settingsManager: object,
     *   getUi: () => object,
     *   getUiManager: () => object|null,
     *   getSettings: () => object,
     *   setSettings: (s: object) => void,
     *   showStatusToast: (msg: string, ms: number, tone: string) => void,
     *   onSettingsChanged: () => void,
     *   markSettingsDirty: (dirty: boolean) => void,
     *   profileDataOps: object,
     *   profileUiStateOps: object,
     *   profileControlStateOps: object,
     * }} deps
     */
    constructor(deps) {
        this._profileManager = deps.profileManager;
        this._settingsManager = deps.settingsManager;
        this._getUi = deps.getUi;
        this._getUiManager = deps.getUiManager;
        this._getSettings = deps.getSettings;
        this._setSettings = deps.setSettings;
        this._showStatusToast = deps.showStatusToast;
        this._onSettingsChanged = deps.onSettingsChanged;
        this._markSettingsDirty = deps.markSettingsDirty;
        this._profileControlStateOps = deps.profileControlStateOps;
        this._profileUiStateOps = deps.profileUiStateOps;

        this.settingsProfiles = this._profileManager.getProfiles();
        this.activeProfileName = this._profileManager.getActiveProfileName();
        this.selectedProfileName = this.activeProfileName;
        this.loadedProfileName = '';
    }

    syncProfileControls() {
        const ui = this._getUi();
        if (!ui.profileSelect) return;

        const controlState = deriveProfileControlSelectState(
            this.settingsProfiles,
            {
                activeProfileName: this.selectedProfileName || this.activeProfileName,
                selectValue: ui.profileSelect.value,
                isProfileNameInputFocused: ui.profileNameInput
                    ? document.activeElement?.isSameNode(ui.profileNameInput)
                    : false,
            },
            this._profileControlStateOps
        );
        ui.profileSelect.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = controlState.placeholderOption.value;
        placeholder.textContent = controlState.placeholderOption.text;
        ui.profileSelect.appendChild(placeholder);

        for (const optionData of controlState.profileOptions) {
            const opt = document.createElement('option');
            opt.value = optionData.value;
            opt.textContent = optionData.text;
            ui.profileSelect.appendChild(opt);
        }

        const validSelected = controlState.resolvedActiveProfileName;
        this.selectedProfileName = validSelected;
        this.activeProfileName = validSelected;
        ui.profileSelect.value = validSelected;

        if (ui.profileNameInput && controlState.shouldMirrorProfileNameInput) {
            ui.profileNameInput.value = validSelected;
        }
        this.syncProfileActionState();
    }

    syncProfileActionState() {
        const ui = this._getUi();
        const effectiveLoadedProfileName = this._profileManager.findProfileByName(this.loadedProfileName || '')?.name || '';
        const actionState = deriveProfileActionUiState(
            this.settingsProfiles,
            {
                selectedProfileName: ui.profileSelect?.value || this.activeProfileName || '',
                typedName: ui.profileNameInput?.value || '',
                activeProfileName: effectiveLoadedProfileName,
                transferInputValue: ui.profileTransferInput?.value || '',
            },
            this._profileUiStateOps
        );

        if (ui.profileLoadButton) {
            ui.profileLoadButton.disabled = !actionState.canLoadProfile;
        }
        if (ui.profileDeleteButton) {
            ui.profileDeleteButton.disabled = !actionState.canDeleteProfile;
        }
        if (ui.profileDuplicateButton) {
            ui.profileDuplicateButton.disabled = !actionState.canDuplicateProfile;
        }
        if (ui.profileDefaultButton) {
            ui.profileDefaultButton.disabled = !actionState.canSetDefaultProfile;
            ui.profileDefaultButton.textContent = actionState.defaultButtonLabel;
        }
        if (ui.profileExportButton) {
            ui.profileExportButton.disabled = !actionState.canExportProfile;
        }
        if (ui.profileImportButton) {
            ui.profileImportButton.disabled = !actionState.canImportProfile;
        }
        if (ui.profileSaveButton) {
            ui.profileSaveButton.disabled = !actionState.canSaveProfile;
            ui.profileSaveButton.textContent = actionState.saveButtonLabel;
        }
        this._getUiManager()?.updateContext();
    }

    setProfileTransferStatus(message, tone = 'info') {
        const ui = this._getUi();
        if (!ui.profileTransferStatus) return;
        ui.profileTransferStatus.textContent = String(message || '');
        ui.profileTransferStatus.setAttribute('data-tone', tone);
    }

    saveProfile(profileName) {
        const result = this._profileManager.saveProfile(profileName, this._getSettings(), this.loadedProfileName);
        if (!result.success) {
            this._showStatusToast(result.error, 2000, 'error');
            return false;
        }

        this.settingsProfiles = this._profileManager.getProfiles();
        this.activeProfileName = this._profileManager.getActiveProfileName();
        this.selectedProfileName = this.activeProfileName;
        this.loadedProfileName = result.name;

        const ui = this._getUi();
        if (ui.profileNameInput) {
            ui.profileNameInput.value = result.name;
        }

        this.syncProfileControls();

        this._showStatusToast(
            result.isUpdate ? `Profil aktualisiert: ${result.name}` : `Profil gespeichert: ${result.name}`,
            1500,
            'success'
        );
        return true;
    }

    duplicateProfile(sourceProfileName, targetProfileName = '') {
        const result = this._profileManager.duplicateProfile(sourceProfileName, targetProfileName);
        if (!result.success) {
            this._showStatusToast(result.error, 1800, 'error');
            return false;
        }

        this.settingsProfiles = this._profileManager.getProfiles();
        this.activeProfileName = this._profileManager.getActiveProfileName();
        this.selectedProfileName = this.activeProfileName;

        const ui = this._getUi();
        if (ui.profileNameInput) {
            ui.profileNameInput.value = result.name;
        }

        this.syncProfileControls();
        this._showStatusToast(`Profil dupliziert: ${result.name}`, 1500, 'success');
        return true;
    }

    loadProfile(profileName) {
        const result = this._profileManager.loadProfile(profileName);
        if (!result.success) {
            this._showStatusToast(result.error, 1500, 'error');
            return false;
        }

        this._setSettings(result.profile.settings);
        this.activeProfileName = this._profileManager.getActiveProfileName();
        this.selectedProfileName = this.activeProfileName;
        this.loadedProfileName = result.profile.name;
        this._onSettingsChanged();
        this._markSettingsDirty(false);
        this._showStatusToast(`Profil geladen: ${result.profile.name}`, 1400, 'success');
        return true;
    }

    exportProfile(profileName) {
        const result = this._profileManager.exportProfile(profileName);
        if (!result.success) {
            this.setProfileTransferStatus(result.error, 'error');
            this._showStatusToast(result.error, 1700, 'error');
            return false;
        }

        const ui = this._getUi();
        if (ui.profileTransferInput) {
            ui.profileTransferInput.value = result.serialized;
        }

        this.setProfileTransferStatus(`Profil exportiert: ${result.name}`, 'success');
        this.syncProfileActionState();
        this._showStatusToast(`Profil exportiert: ${result.name}`, 1400, 'success');
        return true;
    }

    importProfile(inputValue, requestedProfileName = '') {
        const result = this._profileManager.importProfile(inputValue, requestedProfileName);
        if (!result.success) {
            this.setProfileTransferStatus(result.error, 'error');
            this._showStatusToast(result.error, 1800, 'error');
            return false;
        }

        this.settingsProfiles = this._profileManager.getProfiles();
        this.activeProfileName = this._profileManager.getActiveProfileName();
        this.selectedProfileName = this.activeProfileName;

        const ui = this._getUi();
        if (ui.profileNameInput) {
            ui.profileNameInput.value = result.name;
        }
        if (ui.profileTransferInput) {
            ui.profileTransferInput.value = result.serialized;
        }

        this.syncProfileControls();
        this.setProfileTransferStatus(`Profil importiert: ${result.name}`, 'success');
        this._showStatusToast(`Profil importiert: ${result.name}`, 1500, 'success');
        return true;
    }

    setDefaultProfile(profileName) {
        const result = this._profileManager.setDefaultProfile(profileName);
        if (!result.success) {
            this._showStatusToast(result.error, 1700, 'error');
            return false;
        }

        this.settingsProfiles = this._profileManager.getProfiles();
        this.activeProfileName = this._profileManager.getActiveProfileName();
        this.selectedProfileName = this.activeProfileName;
        this.syncProfileControls();

        this._showStatusToast(`Standardprofil gesetzt: ${result.name}`, 1500, 'success');
        return true;
    }

    deleteProfile(profileName) {
        const result = this._profileManager.deleteProfile(profileName);
        if (!result.success) {
            this._showStatusToast(result.error, 1700, 'error');
            return false;
        }

        this.settingsProfiles = this._profileManager.getProfiles();
        this.activeProfileName = this._profileManager.getActiveProfileName();
        this.selectedProfileName = this.activeProfileName;
        if (this.loadedProfileName && this._profileManager.normalizeProfileName(this.loadedProfileName) === this._profileManager.normalizeProfileName(result.removedName)) {
            this.loadedProfileName = '';
        }
        this.syncProfileControls();

        this._showStatusToast(`Profil geloescht: ${result.removedName}`, 1400, 'success');
        return true;
    }
}
