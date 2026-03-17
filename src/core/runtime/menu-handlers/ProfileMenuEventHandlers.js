import { MENU_CONTROLLER_EVENT_TYPES } from '../../../shared/contracts/MenuControllerContract.js';

export function registerProfileMenuEventHandlers(facade, registry) {
    registry.set(MENU_CONTROLLER_EVENT_TYPES.START_KEY_CAPTURE, (event) => facade.startKeyCapture(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.PROFILE_UI_STATE_SYNC, (event) => facade.syncProfileUiState(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.SAVE_PROFILE, (event) => facade.saveProfile(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.LOAD_PROFILE, (event) => facade.loadProfile(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.DELETE_PROFILE, (event) => facade.deleteProfile(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.DUPLICATE_PROFILE, (event) => facade.duplicateProfile(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.EXPORT_PROFILE, (event) => facade.exportProfile(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.IMPORT_PROFILE, (event) => facade.importProfile(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.SET_DEFAULT_PROFILE, (event) => facade.setDefaultProfile(event));
    registry.set(MENU_CONTROLLER_EVENT_TYPES.RESET_KEYS, () => facade.resetKeys());
    registry.set(MENU_CONTROLLER_EVENT_TYPES.SAVE_KEYS, () => facade.saveKeys());
    registry.set(MENU_CONTROLLER_EVENT_TYPES.SHOW_STATUS_TOAST, (event) => facade.showStatusToast(event));
}
