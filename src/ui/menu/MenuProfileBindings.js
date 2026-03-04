export function setupMenuProfileBindings(ctx) {
    const ui = ctx.ui;
    const emit = ctx.emit;
    const eventTypes = ctx.eventTypes;

    if (ui.profileSaveButton) {
        ui.profileSaveButton.addEventListener('click', () => {
            emit(eventTypes.SAVE_PROFILE, {
                name: ui.profileNameInput?.value || '',
            });
        });
    }
    if (ui.profileLoadButton) {
        ui.profileLoadButton.addEventListener('click', () => {
            emit(eventTypes.LOAD_PROFILE, {
                name: ui.profileSelect?.value || '',
            });
        });
    }
    if (ui.profileDeleteButton) {
        ui.profileDeleteButton.addEventListener('click', () => {
            emit(eventTypes.DELETE_PROFILE, {
                name: ui.profileSelect?.value || '',
            });
        });
    }
}
