import { sanitizeTrainerAction } from '../session/ActionSanitizer.mjs';

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
            createTemplateAction(),
            createTemplateAction({ yawLeft: true }),
            createTemplateAction({ yawRight: true }),
            createTemplateAction({ yawLeft: true, boost: true }),
            createTemplateAction({ yawRight: true, boost: true }),
            createTemplateAction({ boost: true }),
            createTemplateAction({ shootMG: true }),
            createTemplateAction({ yawLeft: true, shootMG: true }),
            createTemplateAction({ yawRight: true, shootMG: true }),
        ];
        if (!this.planarMode) {
            templates.push(createTemplateAction({ pitchUp: true }));
            templates.push(createTemplateAction({ pitchDown: true }));
            templates.push(createTemplateAction({ pitchUp: true, boost: true }));
            templates.push(createTemplateAction({ pitchDown: true, boost: true }));
        }
        for (let i = 0; i <= this.maxItemIndex; i++) {
            templates.push(createTemplateAction({ shootItem: true, shootItemIndex: i }));
        }
        for (let i = 0; i <= this.maxItemIndex; i++) {
            templates.push(createTemplateAction({ useItem: i }));
        }
        templates.push(createTemplateAction({ nextItem: true }));
        templates.push(createTemplateAction({ dropItem: true }));
        return templates;
    }

    get size() {
        return this._templates.length;
    }

    decode(index, context = {}) {
        const normalizedIndex = Number.isInteger(index)
            ? Math.max(0, Math.min(this._templates.length - 1, index))
            : 0;
        const template = this._templates[normalizedIndex];
        return sanitizeTrainerAction(template, {
            maxItemIndex: this.maxItemIndex,
            planarMode: context.planarMode,
            domainId: context.domainId,
        });
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
            const candidate = this.decode(i, context);
            const distance = actionDistance(target, candidate);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }
        return bestIndex;
    }
}
