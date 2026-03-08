export function setupMenuProfileBindings(ctx) {
    const ui = ctx.ui;
    const emit = ctx.emit;
    const eventTypes = ctx.eventTypes;
    const bind = ctx.bind;

    if (ui.profileSaveButton) {
        bind(ui.profileSaveButton, 'click', () => {
            emit(eventTypes.SAVE_PROFILE, {
                name: ui.profileNameInput?.value || '',
            });
        });
    }
    if (ui.profileLoadButton) {
        bind(ui.profileLoadButton, 'click', () => {
            emit(eventTypes.LOAD_PROFILE, {
                name: ui.profileSelect?.value || '',
            });
        });
    }
    if (ui.profileDeleteButton) {
        bind(ui.profileDeleteButton, 'click', () => {
            emit(eventTypes.DELETE_PROFILE, {
                name: ui.profileSelect?.value || '',
            });
        });
    }
}
