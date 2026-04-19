import {
    MENU_DEFAULT_EDITOR_SCHEMA_VERSION,
    createMenuDefaultsEditorConfigSnapshot,
} from '../../composition/core-ui/CoreSettingsPorts.js';
import { SETTINGS_LIMITS } from '../../shared/contracts/SettingsRuntimeContract.js';
import {
    collectPrimitiveLeafPaths,
    deepCloneJson,
    deepMergeKnownShape,
    isPlainObject,
    readPathValue,
    writePathValue,
} from './SettingsOverrideMergeOps.js';

export const SETTINGS_OVERRIDE_SCHEMA_VERSION = 'menu-defaults-override.v1';
export const SETTINGS_STUDIO_SCHEMA_CONTRACT_VERSION = 'settings-studio-schema.v1';

const DEFAULT_LANGUAGE = 'de';
const SUPPORTED_LANGUAGES = new Set(['de', 'en']);

const SECTION_DEFINITIONS = Object.freeze([
    { key: 'baseSettings', category: 'base' },
    { key: 'localSettings', category: 'local' },
    { key: 'level3Reset', category: 'level3' },
    { key: 'configShare', category: 'configShare' },
    { key: 'fixedPresets', category: 'presets' },
]);

const DEFAULT_FIELD_LIMITS = Object.freeze({
    'baseSettings.numBots': Object.freeze({ ...SETTINGS_LIMITS.session.numBots, step: 1 }),
    'baseSettings.winsNeeded': Object.freeze({ ...SETTINGS_LIMITS.session.winsNeeded, step: 1 }),
    'baseSettings.gameplay.speed': Object.freeze({ min: 0, max: 50, step: 0.1 }),
    'baseSettings.gameplay.turnSensitivity': Object.freeze({ ...SETTINGS_LIMITS.gameplay.turnSensitivity, step: 0.1 }),
    'baseSettings.gameplay.planeScale': Object.freeze({ ...SETTINGS_LIMITS.gameplay.planeScale, step: 0.05 }),
    'baseSettings.gameplay.trailWidth': Object.freeze({ ...SETTINGS_LIMITS.gameplay.trailWidth, step: 0.05 }),
    'baseSettings.gameplay.gapSize': Object.freeze({ ...SETTINGS_LIMITS.gameplay.gapSize, step: 0.01 }),
    'baseSettings.gameplay.gapFrequency': Object.freeze({ ...SETTINGS_LIMITS.gameplay.gapFrequency, step: 0.01 }),
    'baseSettings.gameplay.itemAmount': Object.freeze({ ...SETTINGS_LIMITS.gameplay.itemAmount, step: 1 }),
    'baseSettings.gameplay.fireRate': Object.freeze({ ...SETTINGS_LIMITS.gameplay.fireRate, step: 0.01 }),
    'baseSettings.gameplay.lockOnAngle': Object.freeze({ ...SETTINGS_LIMITS.gameplay.lockOnAngle, step: 1 }),
    'baseSettings.gameplay.mgTrailAimRadius': Object.freeze({ ...SETTINGS_LIMITS.gameplay.mgTrailAimRadius, step: 0.01 }),
    'baseSettings.gameplay.fightPlayerHp': Object.freeze({ ...SETTINGS_LIMITS.gameplay.fightPlayerHp, step: 1 }),
    'baseSettings.gameplay.fightMgDamage': Object.freeze({ ...SETTINGS_LIMITS.gameplay.fightMgDamage, step: 0.25 }),
    'baseSettings.gameplay.portalCount': Object.freeze({ ...SETTINGS_LIMITS.gameplay.portalCount, step: 1 }),
    'baseSettings.gameplay.planarLevelCount': Object.freeze({ ...SETTINGS_LIMITS.gameplay.planarLevelCount, step: 1 }),
    'baseSettings.botBridge.timeoutMs': Object.freeze({ ...SETTINGS_LIMITS.botBridge.timeoutMs, step: 1 }),
    'baseSettings.botBridge.maxRetries': Object.freeze({ ...SETTINGS_LIMITS.botBridge.maxRetries, step: 1 }),
    'baseSettings.botBridge.retryDelayMs': Object.freeze({ ...SETTINGS_LIMITS.botBridge.retryDelayMs, step: 1 }),
    'configShare.numBots': Object.freeze({ ...SETTINGS_LIMITS.session.numBots, step: 1 }),
    'configShare.winsNeeded': Object.freeze({ ...SETTINGS_LIMITS.session.winsNeeded, step: 1 }),
    'configShare.gameplay.speed': Object.freeze({ min: 0, max: 50, step: 0.1 }),
    'configShare.gameplay.turnSensitivity': Object.freeze({ ...SETTINGS_LIMITS.gameplay.turnSensitivity, step: 0.1 }),
    'configShare.gameplay.planeScale': Object.freeze({ ...SETTINGS_LIMITS.gameplay.planeScale, step: 0.05 }),
    'configShare.gameplay.trailWidth': Object.freeze({ ...SETTINGS_LIMITS.gameplay.trailWidth, step: 0.05 }),
    'configShare.gameplay.gapSize': Object.freeze({ ...SETTINGS_LIMITS.gameplay.gapSize, step: 0.01 }),
    'configShare.gameplay.gapFrequency': Object.freeze({ ...SETTINGS_LIMITS.gameplay.gapFrequency, step: 0.01 }),
    'configShare.gameplay.itemAmount': Object.freeze({ ...SETTINGS_LIMITS.gameplay.itemAmount, step: 1 }),
    'configShare.gameplay.fireRate': Object.freeze({ ...SETTINGS_LIMITS.gameplay.fireRate, step: 0.01 }),
    'configShare.gameplay.lockOnAngle': Object.freeze({ ...SETTINGS_LIMITS.gameplay.lockOnAngle, step: 1 }),
    'configShare.gameplay.mgTrailAimRadius': Object.freeze({ ...SETTINGS_LIMITS.gameplay.mgTrailAimRadius, step: 0.01 }),
    'configShare.gameplay.fightPlayerHp': Object.freeze({ ...SETTINGS_LIMITS.gameplay.fightPlayerHp, step: 1 }),
    'configShare.gameplay.fightMgDamage': Object.freeze({ ...SETTINGS_LIMITS.gameplay.fightMgDamage, step: 0.25 }),
    'configShare.gameplay.portalCount': Object.freeze({ ...SETTINGS_LIMITS.gameplay.portalCount, step: 1 }),
    'configShare.gameplay.planarLevelCount': Object.freeze({ ...SETTINGS_LIMITS.gameplay.planarLevelCount, step: 1 }),
});

function createError(path, code, message) {
    return Object.freeze({ path, code, message });
}

function toFiniteNumber(value, fallback = null) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
}

function inferFieldType(value) {
    if (Array.isArray(value)) return 'json';
    const type = typeof value;
    if (type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';
    if (type === 'string') return 'string';
    return 'json';
}

function resolveFieldCategory(path, fallbackCategory) {
    const normalized = String(path || '').trim();
    if (!normalized) return fallbackCategory;
    if (normalized.includes('.gameplay.')) return 'gameplay';
    if (normalized.includes('.botBridge.')) return 'botBridge';
    if (normalized.includes('.hunt.')) return 'hunt';
    if (normalized.includes('.recording.')) return 'recording';
    if (normalized.includes('.cameraPerspective.')) return 'cameraPerspective';
    if (normalized.startsWith('fixedPresets')) return 'presets';
    return fallbackCategory;
}

function deriveSeedDefaultValue(path, draft) {
    const existingValue = readPathValue(draft, path);
    if (existingValue !== undefined) return existingValue;
    if (path.startsWith('configShare.gameplay.')) {
        const mirrorPath = path.replace(/^configShare\./, 'baseSettings.');
        const mirroredValue = readPathValue(draft, mirrorPath);
        if (mirroredValue !== undefined) return mirroredValue;
    }
    return 0;
}

function normalizeLanguage(language) {
    const normalized = String(language || DEFAULT_LANGUAGE).trim().toLowerCase();
    return SUPPORTED_LANGUAGES.has(normalized) ? normalized : DEFAULT_LANGUAGE;
}

export function createSettingsOverrideDraft() {
    const defaults = createMenuDefaultsEditorConfigSnapshot();
    return {
        schemaVersion: SETTINGS_OVERRIDE_SCHEMA_VERSION,
        sourceSchemaVersion: MENU_DEFAULT_EDITOR_SCHEMA_VERSION,
        language: DEFAULT_LANGUAGE,
        limitOverrides: {},
        baseSettings: deepCloneJson(defaults.baseSettings),
        localSettings: deepCloneJson(defaults.localSettings),
        level3Reset: deepCloneJson(defaults.level3Reset),
        configShare: deepCloneJson(defaults.configShare),
        fixedPresets: deepCloneJson(defaults.fixedPresets),
    };
}

export function createSettingsOverrideFieldRegistry() {
    const draft = createSettingsOverrideDraft();
    const entries = [];
    const pathSet = new Set();

    for (const section of SECTION_DEFINITIONS) {
        const sectionValue = draft[section.key];
        const paths = collectPrimitiveLeafPaths(sectionValue, section.key);
        for (const path of paths) {
            if (!path || pathSet.has(path)) continue;
            pathSet.add(path);
            const value = readPathValue(draft, path);
            const type = inferFieldType(value);
            const limits = type === 'number' && DEFAULT_FIELD_LIMITS[path]
                ? deepCloneJson(DEFAULT_FIELD_LIMITS[path])
                : null;
            entries.push({
                path,
                section: section.key,
                category: resolveFieldCategory(path, section.category),
                type,
                labelKey: `settings.field.${path}`,
                defaultValue: deepCloneJson(value),
                limits,
            });
        }
    }

    for (const path of Object.keys(DEFAULT_FIELD_LIMITS)) {
        if (pathSet.has(path)) continue;
        pathSet.add(path);
        entries.push({
            path,
            section: path.split('.')[0],
            category: resolveFieldCategory(path, 'gameplay'),
            type: 'number',
            labelKey: `settings.field.${path}`,
            defaultValue: deriveSeedDefaultValue(path, draft),
            limits: deepCloneJson(DEFAULT_FIELD_LIMITS[path]),
        });
    }

    return Object.freeze(entries.sort((left, right) => left.path.localeCompare(right.path)));
}

const FIELD_REGISTRY = createSettingsOverrideFieldRegistry();
const FIELD_REGISTRY_BY_PATH = new Map(FIELD_REGISTRY.map((entry) => [entry.path, entry]));

function createLimitRule(rule, fallbackLimits = null) {
    const fallback = isPlainObject(fallbackLimits) ? fallbackLimits : {};
    const source = isPlainObject(rule) ? rule : {};
    const min = toFiniteNumber(source.min, toFiniteNumber(fallback.min, null));
    const max = toFiniteNumber(source.max, toFiniteNumber(fallback.max, null));
    const step = toFiniteNumber(source.step, toFiniteNumber(fallback.step, null));
    const integer = source.integer === true || fallback.integer === true;
    return {
        min,
        max,
        step,
        integer,
    };
}

function validateLimitRule(path, limits, errors) {
    if (!Number.isFinite(limits.min)) {
        errors.push(createError(path, 'LIMIT_MIN_INVALID', `Limit min ist ungueltig fuer ${path}.`));
    }
    if (!Number.isFinite(limits.max)) {
        errors.push(createError(path, 'LIMIT_MAX_INVALID', `Limit max ist ungueltig fuer ${path}.`));
    }
    if (!Number.isFinite(limits.step)) {
        errors.push(createError(path, 'LIMIT_STEP_INVALID', `Limit step ist ungueltig fuer ${path}.`));
    }
    if (Number.isFinite(limits.step) && limits.step <= 0) {
        errors.push(createError(path, 'LIMIT_STEP_NON_POSITIVE', `Limit step muss groesser als 0 sein fuer ${path}.`));
    }
    if (Number.isFinite(limits.min)
        && Number.isFinite(limits.max)
        && limits.min > limits.max) {
        errors.push(createError(path, 'LIMIT_RANGE_INVALID', `Limit min darf nicht groesser als max sein fuer ${path}.`));
    }
}

function normalizeLimitOverrides(rawLimitOverrides, errors) {
    const overrides = {};
    const source = isPlainObject(rawLimitOverrides) ? rawLimitOverrides : {};

    for (const [path, rawRule] of Object.entries(source)) {
        const field = FIELD_REGISTRY_BY_PATH.get(path);
        if (!field || field.type !== 'number') {
            errors.push(createError(path, 'LIMIT_FIELD_UNKNOWN', `Limit-Override verweist auf unbekanntes Feld: ${path}.`));
            continue;
        }

        const limits = createLimitRule(rawRule, field.limits || null);
        validateLimitRule(path, limits, errors);
        overrides[path] = limits;
    }

    return overrides;
}

function resolveEffectiveLimits(field, limitOverrides) {
    if (!field || field.type !== 'number') return null;
    const fallback = field.limits || null;
    const override = limitOverrides[field.path] || null;
    if (!fallback && !override) return null;
    return createLimitRule(override, fallback);
}

function mergeDraftCandidate(candidate) {
    const baseDraft = createSettingsOverrideDraft();
    const source = isPlainObject(candidate) ? candidate : {};
    const merged = deepCloneJson(baseDraft);

    merged.schemaVersion = typeof source.schemaVersion === 'string'
        ? source.schemaVersion.trim() || baseDraft.schemaVersion
        : baseDraft.schemaVersion;
    merged.sourceSchemaVersion = typeof source.sourceSchemaVersion === 'string'
        ? source.sourceSchemaVersion.trim() || baseDraft.sourceSchemaVersion
        : baseDraft.sourceSchemaVersion;
    merged.language = normalizeLanguage(source.language || baseDraft.language);

    for (const section of SECTION_DEFINITIONS) {
        const key = section.key;
        if (key === 'fixedPresets') {
            merged.fixedPresets = Array.isArray(source.fixedPresets)
                ? deepCloneJson(source.fixedPresets)
                : deepCloneJson(baseDraft.fixedPresets);
            continue;
        }
        merged[key] = deepMergeKnownShape(baseDraft[key], source[key]);
    }

    return merged;
}

export function createSettingsStudioSchemaDescriptor() {
    const fieldRegistry = createSettingsOverrideFieldRegistry();
    return {
        contractVersion: SETTINGS_STUDIO_SCHEMA_CONTRACT_VERSION,
        schemaVersion: SETTINGS_OVERRIDE_SCHEMA_VERSION,
        sections: deepCloneJson(SECTION_DEFINITIONS),
        fields: deepCloneJson(fieldRegistry),
        supportedLanguages: ['de', 'en'],
    };
}

export function validateSettingsOverrideDraft(candidateDraft) {
    const errors = [];
    const warnings = [];
    const normalizedDraft = mergeDraftCandidate(candidateDraft);

    if (normalizedDraft.schemaVersion !== SETTINGS_OVERRIDE_SCHEMA_VERSION) {
        errors.push(createError(
            'schemaVersion',
            'SCHEMA_VERSION_MISMATCH',
            `schemaVersion muss ${SETTINGS_OVERRIDE_SCHEMA_VERSION} sein.`
        ));
    }

    normalizedDraft.limitOverrides = normalizeLimitOverrides(candidateDraft?.limitOverrides, errors);

    for (const field of FIELD_REGISTRY) {
        const value = readPathValue(normalizedDraft, field.path);
        if (value === undefined) {
            continue;
        }

        if (field.type === 'number') {
            const asNumber = toFiniteNumber(value, null);
            if (!Number.isFinite(asNumber)) {
                errors.push(createError(field.path, 'FIELD_NUMBER_INVALID', `Zahl erwartet fuer ${field.path}.`));
                continue;
            }

            const limits = resolveEffectiveLimits(field, normalizedDraft.limitOverrides);
            if (!limits) continue;

            const hasExplicitLimitOverride = Object.prototype.hasOwnProperty.call(
                normalizedDraft.limitOverrides,
                field.path
            );
            if (!hasExplicitLimitOverride) {
                validateLimitRule(field.path, limits, errors);
            }
            if (Number.isFinite(limits.min) && asNumber < limits.min) {
                errors.push(createError(
                    field.path,
                    'FIELD_NUMBER_BELOW_MIN',
                    `${field.path} liegt unter min (${asNumber} < ${limits.min}).`
                ));
            }
            if (Number.isFinite(limits.max) && asNumber > limits.max) {
                errors.push(createError(
                    field.path,
                    'FIELD_NUMBER_ABOVE_MAX',
                    `${field.path} liegt ueber max (${asNumber} > ${limits.max}).`
                ));
            }

            if (Number.isFinite(limits.step)
                && Number.isFinite(limits.min)
                && limits.step > 0) {
                const rawSteps = (asNumber - limits.min) / limits.step;
                const nearest = Math.round(rawSteps);
                const delta = Math.abs(rawSteps - nearest);
                if (delta > 1e-6) {
                    warnings.push(createError(
                        field.path,
                        'FIELD_NUMBER_STEP_MISALIGN',
                        `${field.path} liegt nicht auf dem erwarteten step-Raster.`
                    ));
                }
            }

            if (limits.integer === true && !Number.isInteger(asNumber)) {
                errors.push(createError(
                    field.path,
                    'FIELD_INTEGER_REQUIRED',
                    `${field.path} erwartet eine ganze Zahl.`
                ));
            }
            continue;
        }

        if (field.type === 'boolean' && typeof value !== 'boolean') {
            errors.push(createError(field.path, 'FIELD_BOOLEAN_INVALID', `Boolean erwartet fuer ${field.path}.`));
            continue;
        }

        if (field.type === 'string' && typeof value !== 'string') {
            errors.push(createError(field.path, 'FIELD_STRING_INVALID', `String erwartet fuer ${field.path}.`));
        }
    }

    if (!Array.isArray(normalizedDraft.fixedPresets)) {
        errors.push(createError('fixedPresets', 'FIELD_PRESETS_INVALID', 'fixedPresets muss ein Array sein.'));
        normalizedDraft.fixedPresets = deepCloneJson(createSettingsOverrideDraft().fixedPresets);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        normalizedDraft,
    };
}

export function applyLimitOverrideToDraft(draft, path, rule) {
    const source = isPlainObject(draft) ? deepCloneJson(draft) : createSettingsOverrideDraft();
    if (!isPlainObject(source.limitOverrides)) {
        source.limitOverrides = {};
    }

    const field = FIELD_REGISTRY_BY_PATH.get(path);
    if (!field || field.type !== 'number') {
        return {
            draft: source,
            result: {
                valid: false,
                errors: [createError(path, 'LIMIT_FIELD_UNKNOWN', `Limit-Override verweist auf unbekanntes Feld: ${path}.`)],
                warnings: [],
                normalizedDraft: source,
            },
        };
    }

    source.limitOverrides[path] = createLimitRule(rule, field.limits || null);
    return {
        draft: source,
        result: validateSettingsOverrideDraft(source),
    };
}

export function setDraftValueByPath(draft, path, value) {
    const source = isPlainObject(draft) ? deepCloneJson(draft) : createSettingsOverrideDraft();
    writePathValue(source, path, value);
    return validateSettingsOverrideDraft(source);
}
