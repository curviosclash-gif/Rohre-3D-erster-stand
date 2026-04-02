import { sanitizeTrainerAction } from '../session/ActionSanitizer.mjs';
import { HYBRID_INTENT_TYPES } from '../../src/entities/ai/hybrid/HybridDecisionArchitecture.js';

function createTemplateAction(overrides = {}) {
    return {
        yawLeft: false,
        yawRight: false,
        pitchUp: false,
        pitchDown: false,
        rollLeft: false,
        rollRight: false,
        boost: false,
        shootMG: false,
        shootItem: false,
        shootItemIndex: -1,
        useItem: -1,
        dropItem: false,
        nextItem: false,
        ...overrides,
    };
}

function createTemplate(intent, action) {
    return Object.freeze({
        intent,
        action: createTemplateAction(action),
    });
}

function actionDistance(leftAction, rightAction) {
    const left = leftAction || {};
    const right = rightAction || {};
    const booleanKeys = [
        'yawLeft',
        'yawRight',
        'pitchUp',
        'pitchDown',
        'rollLeft',
        'rollRight',
        'boost',
        'shootMG',
        'shootItem',
        'dropItem',
        'nextItem',
    ];

    let distance = 0;
    for (const key of booleanKeys) {
        const leftValue = left[key] === true;
        const rightValue = right[key] === true;
        if (leftValue !== rightValue) {
            distance += 1;
        }
    }

    const leftShootIndex = Number.isInteger(left.shootItemIndex) ? left.shootItemIndex : -1;
    const rightShootIndex = Number.isInteger(right.shootItemIndex) ? right.shootItemIndex : -1;
    distance += Math.abs(leftShootIndex - rightShootIndex) * 0.25;

    const leftUseItem = Number.isInteger(left.useItem) ? left.useItem : -1;
    const rightUseItem = Number.isInteger(right.useItem) ? right.useItem : -1;
    distance += Math.abs(leftUseItem - rightUseItem) * 0.25;

    return distance;
}

export class ActionVocabulary {
    constructor(options = {}) {
        this.maxItemIndex = Number.isInteger(options.maxItemIndex)
            ? Math.max(0, options.maxItemIndex)
            : 2;
        this.planarMode = options.planarMode === true;
        this._templates = this._buildTemplates();
    }

    _buildTemplates() {
        const templates = [
            createTemplate(HYBRID_INTENT_TYPES.STABILIZE, {}),
            createTemplate(HYBRID_INTENT_TYPES.EVADE, { yawLeft: true }),
            createTemplate(HYBRID_INTENT_TYPES.EVADE, { yawRight: true }),
            createTemplate(HYBRID_INTENT_TYPES.CHASE, { yawLeft: true, boost: true }),
            createTemplate(HYBRID_INTENT_TYPES.CHASE, { yawRight: true, boost: true }),
            createTemplate(HYBRID_INTENT_TYPES.CHASE, { boost: true }),
            createTemplate(HYBRID_INTENT_TYPES.COMBAT, { shootMG: true }),
            createTemplate(HYBRID_INTENT_TYPES.COMBAT, { yawLeft: true, shootMG: true }),
            createTemplate(HYBRID_INTENT_TYPES.COMBAT, { yawRight: true, shootMG: true }),
        ];
        if (!this.planarMode) {
            templates.push(createTemplate(HYBRID_INTENT_TYPES.EVADE, { pitchUp: true }));
            templates.push(createTemplate(HYBRID_INTENT_TYPES.EVADE, { pitchDown: true }));
            templates.push(createTemplate(HYBRID_INTENT_TYPES.CHASE, { pitchUp: true, boost: true }));
            templates.push(createTemplate(HYBRID_INTENT_TYPES.CHASE, { pitchDown: true, boost: true }));
        }
        for (let i = 0; i <= this.maxItemIndex; i++) {
            templates.push(createTemplate(HYBRID_INTENT_TYPES.COMBAT, { shootItem: true, shootItemIndex: i }));
        }
        for (let i = 0; i <= this.maxItemIndex; i++) {
            templates.push(createTemplate(HYBRID_INTENT_TYPES.ITEM_USE, { useItem: i }));
        }
        templates.push(createTemplate(HYBRID_INTENT_TYPES.ITEM_USE, { nextItem: true }));
        templates.push(createTemplate(HYBRID_INTENT_TYPES.ITEM_USE, { dropItem: true }));
        return templates;
    }

    get size() {
        return this._templates.length;
    }

    decodeWithMetadata(index, context = {}) {
        const normalizedIndex = Number.isInteger(index)
            ? Math.max(0, Math.min(this._templates.length - 1, index))
            : 0;
        const template = this._templates[normalizedIndex] || this._templates[0];
        const action = sanitizeTrainerAction(template.action, {
            maxItemIndex: this.maxItemIndex,
            planarMode: context.planarMode,
            domainId: context.domainId,
        });
        return {
            action,
            metadata: {
                intent: template.intent,
                templateIndex: normalizedIndex,
            },
        };
    }

    decode(index, context = {}) {
        return this.decodeWithMetadata(index, context).action;
    }

    encode(action, context = {}) {
        const target = sanitizeTrainerAction(action, {
            maxItemIndex: this.maxItemIndex,
            planarMode: context.planarMode,
            domainId: context.domainId,
        });

        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let i = 0; i < this._templates.length; i++) {
            const candidate = this.decodeWithMetadata(i, context).action;
            const distance = actionDistance(target, candidate);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }
        return bestIndex;
    }
}
