import {
    deriveMatchStartUiState,
    deriveReturnToMenuUiState,
    deriveRoundStartUiState,
} from '../ui/MatchUiStateOps.js';

function createHuntStateReset() {
    return {
        killFeed: [],
        damageIndicator: null,
        overheatByPlayer: {},
    };
}

export function deriveMatchStartTransition({ numHumans } = {}) {
    return {
        state: null,
        roundPause: null,
        hudTimer: null,
        uiState: deriveMatchStartUiState({ numHumans }),
        huntStatePatch: null,
    };
}

export function deriveRoundStartTransition() {
    return {
        state: 'PLAYING',
        roundPause: 0,
        hudTimer: 0,
        uiState: deriveRoundStartUiState(),
        huntStatePatch: createHuntStateReset(),
    };
}

export function deriveReturnToMenuTransition() {
    return {
        state: 'MENU',
        roundPause: null,
        hudTimer: null,
        uiState: deriveReturnToMenuUiState(),
        huntStatePatch: createHuntStateReset(),
    };
}

