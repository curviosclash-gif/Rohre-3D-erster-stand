import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { isRocketTierType } from './RocketPickupSystem.js';
import { RuleBasedBotPolicy } from '../entities/ai/RuleBasedBotPolicy.js';
import { BOT_POLICY_TYPES } from '../entities/ai/BotPolicyTypes.js';
import { resolveHuntTargetOwnerPlayer } from './HuntTargetingOps.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

import { clamp } from '../utils/MathOps.js';
export { clamp };

export function resolveHealthRatio(player) {
    if (!player) return 1;
    const hp = Math.max(0, Number(player.hp) || 0);
    const maxHp = Math.max(1, Number(player.maxHp) || 1);
    return clamp(hp / maxHp, 0, 1);
}

export function resolveShieldRatio(player) {
    if (!player) return 0;
    const shield = Math.max(0, Number(player.shieldHP) || 0);
    const maxShield = Math.max(1, Number(player.maxShieldHp) || 1);
    return clamp(shield / maxShield, 0, 1);
}

export function getNearestEnemy(player, allPlayers, outVec) {
    let nearest = null;
    let nearestDistSq = Infinity;
    for (const other of allPlayers || []) {
        if (!other || other === player || !other.alive) continue;
        outVec.subVectors(other.position, player.position);
        const distSq = outVec.lengthSq();
        if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearest = other;
        }
    }
    return { enemy: nearest, distSq: nearestDistSq };
}

export function findStrongestRocketIndex(inventory = []) {
    let strongestIndex = -1;
    let strongestRank = -1;
    for (let i = 0; i < inventory.length; i++) {
        const type = inventory[i];
        if (!isRocketTierType(type)) continue;
        const rank = type === 'ROCKET_MEGA' ? 4 : (type === 'ROCKET_HEAVY' ? 3 : (type === 'ROCKET_MEDIUM' ? 2 : 1));
        if (rank > strongestRank) {
            strongestRank = rank;
            strongestIndex = i;
        }
    }
    return strongestIndex;
}

function resolveSensorSnapshot(policy) {
    if (typeof policy?._fallbackPolicy?.getSensorSnapshot === 'function') {
        return policy._fallbackPolicy.getSensorSnapshot();
    }
    return null;
}

function resolveSensorYawPitch(snapshot) {
    const yaw = Number.isFinite(snapshot?.targetYaw) ? snapshot.targetYaw : 0;
    const pitch = Number.isFinite(snapshot?.targetPitch) ? snapshot.targetPitch : 0;
    return { yaw, pitch };
}

function clearSteeringInput(input) {
    input.yawLeft = false;
    input.yawRight = false;
    input.pitchUp = false;
    input.pitchDown = false;
}

function applySteeringTowardPosition(policy, input, player, targetPosition) {
    if (!targetPosition || !player?.position) return;
    policy._tmpGate.subVectors(targetPosition, player.position);
    if (policy._tmpGate.lengthSq() <= 0.000001) return;
    policy._tmpGate.normalize();
    player.getDirection(policy._tmpForward).normalize();
    policy._tmpRight.crossVectors(WORLD_UP, policy._tmpForward);
    if (policy._tmpRight.lengthSq() <= 0.000001) {
        policy._tmpRight.set(1, 0, 0);
    } else {
        policy._tmpRight.normalize();
    }
    policy._tmpUp.crossVectors(policy._tmpForward, policy._tmpRight).normalize();

    const yawTowardTarget = policy._tmpRight.dot(policy._tmpGate);
    if (Math.abs(yawTowardTarget) > 0.03) {
        input.yawLeft = yawTowardTarget > 0;
        input.yawRight = yawTowardTarget < 0;
    }

    if (!CONFIG.GAMEPLAY.PLANAR_MODE) {
        const pitchTowardTarget = policy._tmpUp.dot(policy._tmpGate);
        if (Math.abs(pitchTowardTarget) > 0.07) {
            input.pitchUp = pitchTowardTarget < 0;
            input.pitchDown = pitchTowardTarget > 0;
        }
    }
}

function applyRetreatSteeringFallback(policy, input, player, enemy) {
    applySteeringTowardPosition(policy, input, player, enemy?.position || null);
}

function applyRetreatSteeringFromSensors(input, snapshot) {
    const steering = resolveSensorYawPitch(snapshot);
    if (Math.abs(steering.yaw) > 0.01) {
        input.yawLeft = steering.yaw > 0;
        input.yawRight = steering.yaw < 0;
    }
    if (!CONFIG.GAMEPLAY.PLANAR_MODE && Math.abs(steering.pitch) > 0.01) {
        input.pitchUp = steering.pitch < 0;
        input.pitchDown = steering.pitch > 0;
    }
}

function resolvePlayerCooldownKey(player) {
    if (typeof player?.id === 'string' && player.id.trim()) return player.id;
    if (Number.isFinite(player?.id)) return player.id;
    if (typeof player?.entityId === 'string' && player.entityId.trim()) return player.entityId;
    if (Number.isFinite(player?.entityId)) return player.entityId;
    if (Number.isFinite(player?.index)) return player.index;
    return null;
}

function findNearestReadySpecialGate(policy, player, specialGates, maxDistanceSq = Infinity) {
    if (!player?.position || !Array.isArray(specialGates) || specialGates.length === 0) return null;
    const cooldownKey = resolvePlayerCooldownKey(player);
    let nearestGate = null;
    let nearestDistSq = Infinity;
    for (const gate of specialGates) {
        if (!gate?.pos) continue;
        const cooldownRemaining = gate.cooldowns instanceof Map && cooldownKey != null
            ? Number(gate.cooldowns.get(cooldownKey) || 0)
            : 0;
        if (cooldownRemaining > 0.001) continue;
        policy._tmpGate.subVectors(gate.pos, player.position);
        const distSq = policy._tmpGate.lengthSq();
        if (!Number.isFinite(distSq) || distSq > maxDistanceSq || distSq >= nearestDistSq) continue;
        nearestGate = gate;
        nearestDistSq = distSq;
    }
    return nearestGate ? { gate: nearestGate, distSq: nearestDistSq } : null;
}

function invokeFallbackPolicyUpdate(policy, dt, player, runtimeContext) {
    const fallback = policy?._fallbackPolicy;
    const update = fallback?.update;
    if (typeof update !== 'function') return {};

    if (fallback?.usesRuntimeContext === true || update.length <= 3) {
        return update.call(fallback, dt, player, runtimeContext);
    }
    return update.call(
        fallback,
        dt,
        player,
        runtimeContext?.arena,
        runtimeContext?.players,
        runtimeContext?.projectiles
    );
}

export class HuntBotPolicy {
    constructor(options = {}) {
        this.type = BOT_POLICY_TYPES.HUNT;
        this.usesRuntimeContext = true;
        this.sensePhase = 0;
        this._fallbackPolicy = new RuleBasedBotPolicy(options);
        this._tmpToEnemy = new THREE.Vector3();
        this._tmpForward = new THREE.Vector3();
        this._tmpRight = new THREE.Vector3();
        this._tmpUp = new THREE.Vector3();
        this._tmpGate = new THREE.Vector3();
    }

    update(dt, player, runtimeContext = null) {
        const input = invokeFallbackPolicyUpdate(this, dt, player, runtimeContext);
        if (!player || !player.alive) return input;

        const allPlayers = Array.isArray(runtimeContext?.players) ? runtimeContext.players : [];
        const snapshot = resolveSensorSnapshot(this);
        const huntTarget = runtimeContext?.huntTarget || null;
        const nearest = getNearestEnemy(player, allPlayers, this._tmpToEnemy);
        const targetPlayer = resolveHuntTargetOwnerPlayer(huntTarget, allPlayers);
        const enemy = targetPlayer || (snapshot?.targetPlayer && snapshot.targetPlayer.alive ? snapshot.targetPlayer : nearest.enemy);
        const distSq = Number.isFinite(huntTarget?.distance)
            ? huntTarget.distance * huntTarget.distance
            : (Number.isFinite(snapshot?.targetDistanceSq) ? snapshot.targetDistanceSq : nearest.distSq);
        const targetInFront = huntTarget ? true : (snapshot ? !!snapshot.targetInFront : true);
        const pressure = Number.isFinite(snapshot?.pressure) ? snapshot.pressure : 0;
        const projectileThreat = !!snapshot?.projectileThreat;
        const hasSharedTarget = !!huntTarget;
        const specialGates = Array.isArray(runtimeContext?.arena?.specialGates) ? runtimeContext.arena.specialGates : [];

        const healthRatio = resolveHealthRatio(player);
        const shieldRatio = resolveShieldRatio(player);
        const enemyHealthRatio = resolveHealthRatio(enemy);
        const enemyShieldRatio = resolveShieldRatio(enemy);
        const vitalityRatio = clamp(healthRatio * 0.72 + shieldRatio * 0.28, 0, 1);
        const enemyVitalityRatio = clamp(enemyHealthRatio * 0.72 + enemyShieldRatio * 0.28, 0, 1);
        const aggression = clamp(0.5 + (vitalityRatio - enemyVitalityRatio) * 0.9, 0.12, 1.0);
        const survivalPressure = Math.max(
            pressure,
            projectileThreat ? 0.82 : 0,
            (1 - vitalityRatio) * 0.95
        );
        const mgRange = Math.max(12, Number(CONFIG?.HUNT?.MG?.RANGE || 95));
        const mgRangeSq = mgRange * mgRange;
        input.shootMG = false;

        if (
            (hasSharedTarget || enemy)
            && distSq <= mgRangeSq
            && (shieldRatio > 0.08 || healthRatio > 0.32)
            && aggression >= 0.4
            && targetInFront
            && survivalPressure < 0.85
        ) {
            input.shootMG = true;
        }

        const rocketIndex = findStrongestRocketIndex(player.inventory);
        if (rocketIndex >= 0 && (hasSharedTarget || enemy)) {
            const shouldUseRocket =
                enemyShieldRatio > 0.18
                || enemyHealthRatio > 0.45
                || distSq > 22 * 22
                || pressure > 0.56
                || projectileThreat
                || survivalPressure > 0.54
                || vitalityRatio < 0.52;
            if (shouldUseRocket) {
                input.shootItem = true;
                input.shootItemIndex = rocketIndex;
            }
        }

        const shouldRetreat = !!enemy && (vitalityRatio <= 0.34 || (vitalityRatio < 0.52 && survivalPressure > 0.76));
        if (shouldRetreat) {
            const gateAssistRange = Math.max(24, Number(CONFIG?.HUNT?.RETREAT_GATE_RANGE || 54));
            const readyGate = (survivalPressure > 0.8 || vitalityRatio < 0.3)
                ? findNearestReadySpecialGate(this, player, specialGates, gateAssistRange * gateAssistRange)
                : null;
            const hasSensorSteering = snapshot && (Math.abs(snapshot.targetYaw || 0) > 0.01 || Math.abs(snapshot.targetPitch || 0) > 0.01);
            clearSteeringInput(input);
            if (readyGate?.gate) {
                applySteeringTowardPosition(this, input, player, readyGate.gate.pos);
            } else if (hasSensorSteering) {
                applyRetreatSteeringFromSensors(input, snapshot);
            } else {
                applyRetreatSteeringFallback(this, input, player, enemy);
            }
            input.shootMG = false;
            input.boost = true;
            if (rocketIndex < 0) {
                input.shootItem = false;
                input.shootItemIndex = -1;
            }
        }

        return input;
    }

    setDifficulty(profileName) {
        if (typeof this._fallbackPolicy.setDifficulty === 'function') {
            this._fallbackPolicy.setDifficulty(profileName);
        }
    }

    onBounce(type, normal = null) {
        if (typeof this._fallbackPolicy.onBounce === 'function') {
            this._fallbackPolicy.onBounce(type, normal);
        }
    }

    setSensePhase(phase) {
        const normalizedPhase = Number.isFinite(Number(phase)) ? Math.max(0, Math.trunc(Number(phase))) : 0;
        this.sensePhase = normalizedPhase;
        if (typeof this._fallbackPolicy.setSensePhase === 'function') {
            this._fallbackPolicy.setSensePhase(normalizedPhase);
        }
    }

    getSensorSnapshot() {
        if (typeof this._fallbackPolicy.getSensorSnapshot === 'function') {
            return this._fallbackPolicy.getSensorSnapshot();
        }
        return null;
    }

    getSensorArray() {
        if (typeof this._fallbackPolicy.getSensorArray === 'function') {
            return this._fallbackPolicy.getSensorArray();
        }
        return null;
    }
}
