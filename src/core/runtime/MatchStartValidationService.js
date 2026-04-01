// ============================================
// MatchStartValidationService.js - validates menu state before match start
// ============================================
import { isMapEligibleForModePath } from '../../shared/contracts/MapModeContract.js';
import { resolveRuntimeSessionContract } from '../../shared/contracts/RuntimeSessionContract.js';

export function resolveMatchStartValidationIssue({
    settings = {},
    ui = null,
    multiplayerSessionState = null,
    maps = {},
    huntModeType = 'HUNT',
    classicModeType = 'CLASSIC',
} = {}) {
    const sessionContract = resolveRuntimeSessionContract(settings?.localSettings);
    const sessionType = sessionContract.sessionType;
    const mapKey = String(settings?.mapKey || '').trim();
    const mapExists = mapKey === 'custom' || !!maps?.[mapKey];
    if (!mapExists) {
        return {
            message: 'Start nicht moeglich: Bitte eine gueltige Map waehlen.',
            fieldKey: 'map',
            fieldMessage: 'Map-Auswahl fehlt oder ist ungueltig.',
        };
    }

    const vehicleP1 = String(settings?.vehicles?.PLAYER_1 || '').trim();
    if (!vehicleP1) {
        return {
            message: 'Start nicht moeglich: Flugzeug P1 fehlt.',
            fieldKey: 'vehicleP1',
            fieldMessage: 'Flugzeug P1 auswaehlen.',
        };
    }

    if (sessionType === 'splitscreen') {
        const vehicleP2 = String(settings?.vehicles?.PLAYER_2 || '').trim();
        if (!vehicleP2) {
            return {
                message: 'Start nicht moeglich: Splitscreen benoetigt Flugzeug P2.',
                fieldKey: 'vehicleP2',
                fieldMessage: 'Flugzeug P2 auswaehlen.',
            };
        }
    }

    if (sessionContract.sessionType === 'multiplayer') {
        const sessionState = multiplayerSessionState && typeof multiplayerSessionState === 'object'
            ? multiplayerSessionState
            : null;
        const lobbyCode = String(sessionState?.lobbyCode || ui?.multiplayerLobbyCodeInput?.value || '').trim();
        if (!lobbyCode || sessionState?.joined !== true) {
            return {
                message: 'Start nicht moeglich: Bitte eine echte Lobby hosten oder ihr beitreten.',
                fieldKey: 'multiplayer',
                fieldMessage: 'Host oder Join ausfuehren, damit eine Lobby verbunden ist.',
            };
        }
        if (sessionState?.isHost !== true) {
            return {
                message: 'Start nicht moeglich: Nur der Host darf das Match starten.',
                fieldKey: 'multiplayer',
                fieldMessage: 'Auf den Host warten oder selbst hosten.',
            };
        }
        if ((sessionState?.memberCount || 0) < 2) {
            return {
                message: 'Start nicht moeglich: Multiplayer benoetigt mindestens zwei Teilnehmer.',
                fieldKey: 'multiplayer',
                fieldMessage: 'Einen zweiten Spieler joinen lassen.',
            };
        }
        if (sessionState?.allReady !== true) {
            return {
                message: 'Start nicht moeglich: Alle Lobby-Teilnehmer muessen Ready sein.',
                fieldKey: 'multiplayer',
                fieldMessage: 'Ready auf allen verbundenen Clients setzen.',
            };
        }
    }

    const modePath = String(settings?.localSettings?.modePath || 'normal').toLowerCase();
    if (mapExists && !isMapEligibleForModePath(maps?.[mapKey], modePath)) {
        if (modePath === 'arcade') {
            return {
                message: 'Start nicht moeglich: Arcade erlaubt nur Parcours-Maps.',
                fieldKey: 'map',
                fieldMessage: 'Bitte eine Parcours-Map auswaehlen.',
            };
        }
        return {
            message: 'Start nicht moeglich: Parcours-Maps sind nur im Arcade-Modus verfuegbar.',
            fieldKey: 'map',
            fieldMessage: 'Modus auf Arcade wechseln oder eine Standard-Map waehlen.',
        };
    }

    const gameMode = String(settings?.gameMode || 'CLASSIC').toUpperCase();
    if (modePath === 'fight' && gameMode !== huntModeType) {
        return {
            message: 'Start nicht moeglich: Fight muss intern auf HUNT laufen.',
            fieldKey: 'match',
            fieldMessage: 'Fight-Konflikt: Modus auf HUNT synchronisieren.',
        };
    }
    if ((modePath === 'normal' || modePath === 'arcade') && gameMode !== classicModeType) {
        return {
            message: 'Start nicht moeglich: Normal/Arcade muessen intern auf CLASSIC laufen.',
            fieldKey: 'match',
            fieldMessage: 'Modus-Konflikt: Normal/Arcade auf CLASSIC synchronisieren.',
        };
    }

    const themeMode = String(settings?.localSettings?.themeMode || 'dunkel').toLowerCase();
    if (themeMode !== 'hell' && themeMode !== 'dunkel') {
        return {
            message: 'Start nicht moeglich: Theme-Modus ungueltig.',
            fieldKey: 'theme',
            fieldMessage: 'Theme auf Hell oder Dunkel setzen.',
        };
    }

    return null;
}
