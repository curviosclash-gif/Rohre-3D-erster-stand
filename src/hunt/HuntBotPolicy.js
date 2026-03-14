import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { isRocketTierType } from './RocketPickupSystem.js';
import { RuleBasedBotPolicy } from '../entities/ai/RuleBasedBotPolicy.js';
import { BOT_POLICY_TYPES } from '../entities/ai/BotPolicyTypes.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function resolveHealthRatio(player) {
    if (!player) return 1;
    const hp = Math.max(0, Number(player.hp) || 0);
    const maxHp = Math.max(1, Number(player.maxHp) || 1);
    return clamp(hp / maxHp, 0, 1);
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
        const rank = type === 'ROCKET_STRONG' ? 3 : (type === 'ROCKET_MEDIUM' ? 2 : 1);
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

function applyRetreatSteeringFallback(policy, input, player, enemy) {
    policy._tmpToEnemy.subVectors(enemy.position, player.position).normalize();
    player.getDirection(policy._tmpForward).normalize();
    policy._tmpRight.crossVectors(WORLD_UP, policy._tmpForward);
    if (policy._tmpRight.lengthSq() <= 0.000001) {
        policy._tmpRight.set(1, 0, 0);
    } else {
        policy._tmpRight.normalize();
    }
    policy._tmpUp.crossVectors(policy._tmpForward, policy._tmpRight).normalize();

    const yawTowardEnemy = policy._tmpRight.dot(policy._tmpToEnemy);
    if (Math.abs(yawTowardEnemy) > 0.03) {
        input.yawLeft = yawTowardEnemy > 0;
        input.yawRight = yawTowardEnemy < 0;
    }

    if (!CONFIG.GAMEPLAY.PLANAR_MODE) {
        const pitchTowardEnemy = policy._tmpUp.dot(policy._tmpToEnemy);
        if (Math.abs(pitchTowardEnemy) > 0.07) {
            input.pitchUp = pitchTowardEnemy < 0;
            input.pitchDown = pitchTowardEnemy > 0;
        }
    }
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

export class HuntBotPolicy {
    constructor(options = {}) {
        this.type = BOT_POLICY_TYPES.HUNT;
        this.sensePhase = 0;
        this._fallbackPolicy = new RuleBasedBotPolicy(options);
        this._tmpToEnemy = new THREE.Vector3();
        this._tmpForward = new THREE.Vector3();
        this._tmpRight = new THREE.Vector3();
        this._tmpUp = new THREE.Vector3();
    }

    update(dt, player, arena, allPlayers, projectiles) {
        const input = this._fallbackPolicy.update(dt, player, arena, allPlayers, projectiles);
        if (!player || !player.alive) return input;

        const snapshot = resolveSensorSnapshot(this);
        const nearest = getNearestEnemy(player, allPlayers, this._tmpToEnemy);
        const enemy = snapshot?.targetPlayer && snapshot.targetPlayer.alive ? snapshot.targetPlayer : nearest.enemy;
        const distSq = Number.isFinite(snapshot?.targetDistanceSq) ? snapshot.targetDistanceSq : nearest.distSq;
        const targetInFront = snapshot ? !!snapshot.targetInFront : true;
        const pressure = Number.isFinite(snapshot?.pressure) ? snapshot.pressure : 0;
        const projectileThreat = !!snapshot?.projectileThreat;

        const healthRatio = resolveHealthRatio(player);
        const enemyHealthRatio = resolveHealthRatio(enemy);
        const aggression = clamp(0.55 + (healthRatio - enemyHealthRatio) * 0.8, 0.15, 1.0);
        const mgRange = Math.max(12, Number(CONFIG?.HUNT?.MG?.RANGE || 95));
        const mgRangeSq = mgRange * mgRange;
        input.shootMG = false;

        if (enemy && distSq <= mgRangeSq && healthRatio > 0.15 && aggression >= 0.45 && targetInFront) {
            input.shootMG = true;
        }

        const rocketIndex = findStrongestRocketIndex(player.inventory);
        if (rocketIndex >= 0 && enemy) {
            const shouldUseRocket =
                healthRatio < 0.55
                || enemyHealthRatio > 0.45
                || distSq > 20 * 20
                || pressure > 0.58
                || projectileThreat;
            if (shouldUseRocket) {
                input.shootItem = true;
                input.shootItemIndex = rocketIndex;
            }
        }

        if (healthRatio <= 0.33 && enemy) {
            const hasSensorSteering = snapshot && (Math.abs(snapshot.targetYaw || 0) > 0.01 || Math.abs(snapshot.targetPitch || 0) > 0.01);
            if (hasSensorSteering) {
                applyRetreatSteeringFromSensors(input, snapshot);
            } else {
                applyRetreatSteeringFallback(this, input, player, enemy);
            }
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
