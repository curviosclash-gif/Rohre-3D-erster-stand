import {
    deriveMatchStartUiState,
    derivePauseUiState,
    deriveResumeUiState,
    deriveReturnToMenuUiState,
    deriveRoundStartUiState,
} from '../ui/MatchUiStateOps.js';

function createHuntStateReset() {
    return {
        killFeed: [],
        damageIndicator: null,
        damageIndicatorsByPlayer: {},
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

export function derivePauseTransition() {
    return {
        state: 'PAUSED',
        roundPause: null,
        hudTimer: null,
        uiState: derivePauseUiState(),
        huntStatePatch: null,
    };
}

export function deriveResumeTransition() {
    return {
        state: 'PLAYING',
        roundPause: null,
        hudTimer: null,
        uiState: deriveResumeUiState(),
        huntStatePatch: null,
    };
}

