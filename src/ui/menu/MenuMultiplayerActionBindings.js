export function bindMenuMultiplayerActionButtons({
    ui,
    bind,
    emit,
    eventTypes,
    featureFlags,
}) {
    if (ui.multiplayerHostButton) {
        bind(ui.multiplayerHostButton, 'click', () => {
            const canHost = featureFlags?.canHost === true;
            if (!canHost) return;
            emit(eventTypes.MULTIPLAYER_HOST, {
                lobbyCode: String(ui.multiplayerLobbyCodeInput?.value || '').trim(),
            });
        });
    }

    if (ui.multiplayerJoinButton) {
        bind(ui.multiplayerJoinButton, 'click', () => {
            emit(eventTypes.MULTIPLAYER_JOIN, {
                lobbyCode: String(ui.multiplayerLobbyCodeInput?.value || '').trim(),
            });
        });
    }

    if (ui.multiplayerLeaveLobbyButton) {
        bind(ui.multiplayerLeaveLobbyButton, 'click', () => {
            emit(eventTypes.LEAVE_LOBBY);
        });
    }

    if (ui.multiplayerReadyButton) {
        bind(ui.multiplayerReadyButton, 'click', () => {
            emit(eventTypes.TOGGLE_READY);
        });
    }

    if (ui.multiplayerStartMatchButton) {
        bind(ui.multiplayerStartMatchButton, 'click', () => {
            const canHost = featureFlags?.canHost === true;
            if (!canHost) return;
            emit(eventTypes.START_MATCH_MULTIPLAYER);
        });
    }
}
