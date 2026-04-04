import * as THREE from 'three';
import { GAME_STATE_IDS } from '../contracts/GameStateIds.js';
import { resolveGameplayConfig } from '../contracts/GameplayConfigContract.js';
import { createMatchRuntimeProjection } from '../contracts/MatchRuntimeProjectionContract.js';

const TMP_AIM_DIRECTION = new THREE.Vector3();

function toVector3Projection(value = null) {
    return {
        x: Number(value?.x) || 0,
        y: Number(value?.y) || 0,
        z: Number(value?.z) || 0,
    };
}

function toQuaternionProjection(value = null) {
    return {
        x: Number(value?.x) || 0,
        y: Number(value?.y) || 0,
        z: Number(value?.z) || 0,
        w: Number(value?.w) || 1,
    };
}

function resolveSessionPlayers(facade) {
    return facade?.session?.getPlayers?.() || [];
}

function resolveLocalPlayerIndex(facade, sessionPlayers = resolveSessionPlayers(facade)) {
    const localPlayerId = facade?.session?.localPlayerId;
    if (localPlayerId) {
        const localIndex = sessionPlayers.findIndex((player) => player.id === localPlayerId);
        if (localIndex >= 0) {
            return localIndex;
        }
    }
    return 0;
}

function buildSessionPlayersProjection(facade, sessionPlayers = resolveSessionPlayers(facade)) {
    const localPlayerId = facade?.session?.localPlayerId || '';
    return sessionPlayers.map((player, index) => ({
        playerIndex: Number.isInteger(player?.index) ? player.index : index,
        playerId: String(player?.id || ''),
        pingMs: Number.isFinite(Number(player?.ping)) ? Math.max(0, Math.round(Number(player.ping))) : -1,
        isLocal: !!localPlayerId && player?.id === localPlayerId,
    }));
}

function buildPlayerHudProjection({ runtimeState, game, player }) {
    if (!player) return null;
    const gameplayConfig = resolveGameplayConfig({
        config: runtimeState?.config || game?.config || null,
        entityRuntimeConfig: player?.entityRuntimeConfig || null,
    });
    const playerConfig = gameplayConfig?.PLAYER || {};
    const cameraModeId = gameplayConfig?.CAMERA?.MODES?.[player?.cameraMode] || 'THIRD_PERSON';
    const aimDirection = typeof player?.getAimDirection === 'function'
        ? player.getAimDirection(TMP_AIM_DIRECTION)
        : null;
    const boostCapacity = Math.max(0.001, Number(playerConfig.BOOST_DURATION) || 1);
    const boostCharge = Math.max(0, Math.min(boostCapacity, Number(player?.boostCharge) || 0));
    return {
        playerIndex: Number.isInteger(player?.index) ? player.index : 0,
        isBot: player?.isBot === true,
        alive: player?.alive !== false,
        score: Math.max(0, Math.round(Number(player?.score) || 0)),
        speed: Number(player?.speed) || 0,
        boostCharge,
        boostCapacity,
        boostRecharging: !player?.manualBoostActive && boostCharge < (boostCapacity - 0.001),
        hp: Math.max(0, Number(player?.hp) || 0),
        maxHp: Math.max(1, Number(player?.maxHp) || 1),
        shieldHP: Math.max(0, Number(player?.shieldHP) || 0),
        maxShieldHp: Math.max(1, Number(player?.maxShieldHp) || 1),
        position: toVector3Projection(player?.position),
        quaternion: toQuaternionProjection(player?.quaternion),
        aimDirection: toVector3Projection(aimDirection),
        inventory: Array.isArray(player?.inventory) ? [...player.inventory] : [],
        selectedItemIndex: Number(player?.selectedItemIndex) || 0,
        itemUseCooldownRemaining: Math.max(0, Number(player?.itemUseCooldownRemaining) || 0),
        shootCooldown: Math.max(0, Number(player?.shootCooldown) || 0),
        planarMode: gameplayConfig?.GAMEPLAY?.PLANAR_MODE === true,
        cameraModeId: String(cameraModeId || 'THIRD_PERSON'),
    };
}

function buildLockTargetProjection(entityManager, playerIndex) {
    if (!entityManager?.getLockOnTarget) {
        return null;
    }
    const target = entityManager.getLockOnTarget(playerIndex);
    if (!target) {
        return null;
    }
    return {
        playerIndex,
        targetPlayerIndex: Number.isInteger(target?.index) ? target.index : -1,
        alive: target?.alive !== false,
        position: toVector3Projection(target?.position),
    };
}

export function buildMatchRuntimeProjection({ game, runtimeState, facade, sessionRuntime }) {
    const entityManager = runtimeState?.entityManager || game?.entityManager || null;
    const sessionPlayers = resolveSessionPlayers(facade);
    const localPlayerIndex = resolveLocalPlayerIndex(facade, sessionPlayers);
    const players = Array.isArray(entityManager?.players)
        ? entityManager.players
            .map((player) => buildPlayerHudProjection({ runtimeState, game, player }))
            .filter(Boolean)
        : [];
    const lockTargets = players
        .map((player) => buildLockTargetProjection(entityManager, player?.playerIndex))
        .filter(Boolean);
    const huntState = game?.huntState && typeof game.huntState === 'object'
        ? game.huntState
        : {};
    const modeId = String(runtimeState?.activeGameMode || entityManager?.activeGameMode || game?.activeGameMode || '');
    const gameStateId = String(sessionRuntime?.lifecycle?.gameStateId || game?.state || '');
    const parcoursHudState = entityManager?.getParcoursHudState?.(localPlayerIndex) || null;

    return createMatchRuntimeProjection({
        updatedAt: Date.now(),
        gameStateId,
        modeId,
        isNetworkSession: facade?.isNetworkSession?.() === true,
        localPlayerIndex,
        localHumanCount: Math.max(1, Number(runtimeState?.numHumans || game?.numHumans) || 1),
        players,
        sessionPlayers: buildSessionPlayersProjection(facade, sessionPlayers),
        lockTargets,
        parcours: parcoursHudState,
        hunt: {
            active: modeId === 'HUNT' && gameStateId !== GAME_STATE_IDS.MENU,
            killFeed: Array.isArray(huntState.killFeed) ? huntState.killFeed : [],
            overheatByPlayer: huntState.overheatByPlayer || {},
            damageIndicatorsByPlayer: huntState.damageIndicatorsByPlayer || {},
            damageIndicator: huntState.damageIndicator || null,
            scoreboardSummary: entityManager?.getHuntScoreboardSummary?.(4) || '',
        },
        arcade: facade?.arcadeRunRuntime?.getHudState?.() || null,
    });
}
