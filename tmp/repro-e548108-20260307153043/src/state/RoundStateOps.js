// ============================================
// RoundStateOps.js - pure round/match end decision helpers
// ============================================

function ensureArray(players) {
    return Array.isArray(players) ? players : [];
}

function normalizeCount(value) {
    return Math.max(0, parseInt(value, 10) || 0);
}

function normalizeRequiredWins(winsNeeded) {
    return Math.max(1, parseInt(winsNeeded, 10) || 1);
}

function getResultPlayerName(player) {
    if (!player) {
        return '';
    }
    return player.isBot ? `Bot ${player.index + 1}` : `Spieler ${player.index + 1}`;
}

export function deriveRoundEndOutcome(players, inputs = {}) {
    const safePlayers = ensureArray(players);
    const winner = inputs.winner || null;
    const humanPlayerCount = normalizeCount(inputs.humanPlayerCount);
    const totalBots = normalizeCount(inputs.totalBots);
    const requiredWins = normalizeRequiredWins(inputs.winsNeeded);
    const canWinMatch = humanPlayerCount > 1 || totalBots > 0;
    const matchWinner = canWinMatch ? (safePlayers.find((player) => player && player.score >= requiredWins) || null) : null;

    if (matchWinner) {
        const name = getResultPlayerName(matchWinner);
        return {
            state: 'MATCH_END',
            canWinMatch,
            requiredWins,
            matchWinner,
            messageText: `Sieg: ${name} (Score: ${matchWinner.score})`,
            messageSub: 'ENTER fuer neues Match oder ESC fuer Menue',
        };
    }

    if (winner) {
        const name = getResultPlayerName(winner);
        return {
            state: 'ROUND_END',
            canWinMatch,
            requiredWins,
            matchWinner: null,
            messageText: `${name} gewinnt die Runde`,
            messageSub: 'Naechste Runde in 3...',
        };
    }

    return {
        state: 'ROUND_END',
        canWinMatch,
        requiredWins,
        matchWinner: null,
        messageText: 'Unentschieden',
        messageSub: 'Naechste Runde in 3...',
    };
}
