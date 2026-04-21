// @ts-check

import { sanitizeBotAction } from '../entities/ai/actions/BotActionContract.js';
import * as ItemSlotEncoder from '../entities/ai/observation/ItemSlotEncoder.js';
import * as ModeFeatureEncoder from '../entities/ai/observation/ModeFeatureEncoder.js';
import * as ObservationSchemaV1 from '../entities/ai/observation/ObservationSchemaV1.js';
import * as ObservationSemantics from '../entities/ai/observation/ObservationSemantics.js';
import * as ObservationSystem from '../entities/ai/observation/ObservationSystem.js';
import { BotPolicyRegistry } from '../entities/ai/BotPolicyRegistry.js';
import { BOT_POLICY_TYPES } from '../entities/ai/BotPolicyTypes.js';
import { ClassicBridgePolicy } from '../entities/ai/ClassicBridgePolicy.js';
import { HuntBridgePolicy } from '../entities/ai/HuntBridgePolicy.js';
import { ObservationBridgePolicy } from '../entities/ai/ObservationBridgePolicy.js';
import { decideItemUsage } from '../entities/ai/BotDecisionOps.js';
import { HuntBotPolicy } from '../hunt/HuntBotPolicy.js';
import { applyTrailDamageFromProjectile } from '../hunt/DestructibleTrail.js';
import { updatePlayerHealthRegen } from '../hunt/HealthSystem.js';
import { createRuntimeConfigSnapshot } from './RuntimeConfig.js';

/**
 * @typedef {Window & typeof globalThis & { CURVIOS_TEST_API?: any }} RuntimeWindow
 */

export function buildCurviosTestApi() {
    return Object.freeze({
        sanitizeBotAction,
        ItemSlotEncoder,
        ModeFeatureEncoder,
        ObservationSchemaV1,
        ObservationSemantics,
        ObservationSystem,
        BotPolicyRegistry,
        BOT_POLICY_TYPES,
        ClassicBridgePolicy,
        HuntBridgePolicy,
        ObservationBridgePolicy,
        decideItemUsage,
        HuntBotPolicy,
        applyTrailDamageFromProjectile,
        updatePlayerHealthRegen,
        createRuntimeConfigSnapshot,
    });
}

/**
 * @param {RuntimeWindow} runtimeWindow
 */
export function attachCurviosTestApi(runtimeWindow) {
    if (!runtimeWindow || typeof runtimeWindow !== 'object') return;
    if (runtimeWindow.CURVIOS_TEST_API) return;
    runtimeWindow.CURVIOS_TEST_API = buildCurviosTestApi();
}

