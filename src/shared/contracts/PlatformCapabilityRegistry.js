/* eslint-disable max-lines -- capability resolver stays centralized to avoid contract drift */
/**
 * PlatformCapabilityRegistry — resolver layer for platform capabilities.
 *
 * This file owns the resolution logic: runtime-kind detection, surface-policy
 * resolution, capability access queries, and lobby provider lookup.
 *
 * Pure static data (constants and the PLATFORM_CAPABILITY_REGISTRY object) live
 * in PlatformCapabilityData.js. New work that only needs constants should import
 * directly from there. New work that needs resolution functions uses this file.
 *
 * All exports from PlatformCapabilityData are re-exported here so existing
 * import sites do not need to change.
 *
 * curviosApp/__CURVIOS_APP__ reads in resolvePlatformRuntimeKind() are marked
 * migration-debt per V91 guard-matrix (surface: curviosApp, sunsetPhase: 91.3).
 */
export {
    PLATFORM_CAPABILITY_REGISTRY_CONTRACT_VERSION,
    PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
    PLATFORM_PRODUCT_SURFACE_IDS,
    PLATFORM_RUNTIME_KINDS,
    PLATFORM_PROVIDER_KINDS,
    PLATFORM_TOOLING_IDS,
    PLATFORM_SURFACE_POLICY_MODES,
    PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES,
    PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS,
    PLATFORM_SURFACE_MULTIPLAYER_ROLES,
    PLATFORM_SURFACE_SESSION_TYPES,
    PLATFORM_SURFACE_MENU_MODE_PATHS,
    PLATFORM_SURFACE_QUICK_START_ACTION_IDS,
    PLATFORM_CAPABILITY_REGISTRY,
} from './PlatformCapabilityData.js';

import {
    PLATFORM_PRODUCT_SURFACE_IDS,
    PLATFORM_RUNTIME_KINDS,
    PLATFORM_PROVIDER_KINDS,
    PLATFORM_SURFACE_POLICY_MODES,
    PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES,
    PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS,
    PLATFORM_SURFACE_MULTIPLAYER_ROLES,
    PLATFORM_SURFACE_MENU_MODE_PATHS,
    PLATFORM_SURFACE_QUICK_START_ACTION_IDS,
    PLATFORM_SURFACE_SESSION_TYPES,
    PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
    PLATFORM_CAPABILITY_REGISTRY,
    PLATFORM_TOOLING_IDS,
} from './PlatformCapabilityData.js';
import { MULTIPLAYER_TRANSPORTS } from './RuntimeSessionContract.js';
import { normalizeString } from './ContractNormalizeUtils.js';
import { mergeBrowserDemoSurfacePolicyWithOverride } from './BrowserDemoSurfacePolicyOverrideContract.js';

/** @type {Set<string>} */
const VALID_PRODUCT_SURFACE_IDS = new Set(Object.values(PLATFORM_PRODUCT_SURFACE_IDS));
/** @type {Set<string>} */
const VALID_RUNTIME_KINDS = new Set(Object.values(PLATFORM_RUNTIME_KINDS));
/** @type {Set<string>} */
const VALID_LOBBY_TRANSPORTS = new Set(Object.values(MULTIPLAYER_TRANSPORTS));
/** @type {Set<string>} */
const VALID_SURFACE_SESSION_TYPES = new Set(Object.values(PLATFORM_SURFACE_SESSION_TYPES));
/** @type {Set<string>} */
const VALID_SURFACE_MENU_MODE_PATHS = new Set(Object.values(PLATFORM_SURFACE_MENU_MODE_PATHS));
/** @type {Set<string>} */
const VALID_SURFACE_QUICK_START_ACTION_IDS = new Set(Object.values(PLATFORM_SURFACE_QUICK_START_ACTION_IDS));
const BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS = Object.freeze({
    APPLIED: 'applied',
    SKIPPED: 'skipped',
    FALLBACK: 'fallback',
    REJECT: 'reject',
});
const BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES = Object.freeze({
    NOT_APPLICABLE: 'BROWSER_DEMO_OVERRIDE_NOT_APPLICABLE',
    SOURCE_UNAVAILABLE: 'BROWSER_DEMO_OVERRIDE_SOURCE_UNAVAILABLE',
    DRAFT_MISSING: 'BROWSER_DEMO_OVERRIDE_DRAFT_MISSING',
    DRAFT_INVALID: 'BROWSER_DEMO_OVERRIDE_DRAFT_INVALID',
    SNAPSHOT_INVALID: 'BROWSER_DEMO_OVERRIDE_SNAPSHOT_INVALID',
    READ_FAILED: 'BROWSER_DEMO_OVERRIDE_READ_FAILED',
    APPLIED: 'BROWSER_DEMO_OVERRIDE_APPLIED',
    FALLBACK_VERSION_UNKNOWN: 'BROWSER_DEMO_OVERRIDE_FALLBACK_VERSION_UNKNOWN',
    REJECTED: 'BROWSER_DEMO_OVERRIDE_REJECTED',
    VALIDATION_FAILED: 'BROWSER_DEMO_OVERRIDE_VALIDATION_FAILED',
});
/** @type {Set<string>} */
const VALID_BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS = new Set(
    Object.values(BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS)
);
const BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS = Object.freeze({
    PROVIDED: 'provided',
    SKIPPED: 'skipped',
    REJECT: 'reject',
});
/**
 * @typedef {typeof BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS[keyof typeof BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS]} BrowserDemoOverrideDraftResolutionStatus
 */
const BROWSER_DEMO_POLICY_EXPORT_CONTRACT_VERSION = 'browser-demo-surface-policy-export.v1';
const BROWSER_DEMO_POLICY_EXPORT_ARTIFACT_URL = new URL(
    '../../../data/contracts/browser-demo-surface-policy.export.v1.json',
    import.meta.url
).href;
const BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT = 'build-artifact';
const BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE = new WeakMap();

function resolveRuntimeGlobal(runtimeGlobal = globalThis) {
    return runtimeGlobal && typeof runtimeGlobal === 'object'
        ? runtimeGlobal
        : (typeof globalThis !== 'undefined' ? globalThis : {});
}

function isPlainObject(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
function normalizeBrowserDemoOverrideDiagnosticStatus(
    value,
    fallback = BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT
) {
    const normalized = normalizeString(value, fallback).toLowerCase();
    return VALID_BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.has(normalized)
        ? normalized
        : fallback;
}

function sanitizeDiagnosticsCodeArray(values) {
    return sanitizeUniqueStringArray(values, normalizeString);
}

/**
 * @param {{
 *   status?: string,
 *   reasonCode?: string,
 *   reason?: string,
 *   source?: string,
 *   migrationCode?: string,
 *   errorCodes?: readonly string[],
 *   warningCodes?: readonly string[],
 * }} [options]
 * @returns {Readonly<{
 *   status: string,
 *   reasonCode: string,
 *   reason: string,
 *   source: string,
 *   migrationCode: string,
 *   errorCodes: readonly string[],
 *   warningCodes: readonly string[],
 * }>}
 */
function createBrowserDemoOverrideDiagnostics({
    status = BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
    reasonCode = '',
    reason = '',
    source = 'none',
    migrationCode = '',
    errorCodes = [],
    warningCodes = [],
} = {}) {
    return Object.freeze({
        status: normalizeBrowserDemoOverrideDiagnosticStatus(status),
        reasonCode: normalizeString(reasonCode, ''),
        reason: normalizeString(reason, ''),
        source: normalizeString(source, 'none'),
        migrationCode: normalizeString(migrationCode, ''),
        errorCodes: sanitizeDiagnosticsCodeArray(errorCodes),
        warningCodes: sanitizeDiagnosticsCodeArray(warningCodes),
    });
}

/**
 * @param {{
 *   status?: BrowserDemoOverrideDraftResolutionStatus | string,
 *   reasonCode?: string,
 *   reason?: string,
 *   source?: string,
 *   draft?: unknown,
 * }} [options]
 * @returns {Readonly<{
 *   status: BrowserDemoOverrideDraftResolutionStatus,
 *   reasonCode: string,
 *   reason: string,
 *   source: string,
 *   draft: object | null,
 * }>}
 */
function createBrowserDemoOverrideDraftResolution({
    status = BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS.SKIPPED,
    reasonCode = '',
    reason = '',
    source = 'none',
    draft = null,
} = {}) {
    const normalizedStatus = normalizeString(status, '').toLowerCase();
    /** @type {BrowserDemoOverrideDraftResolutionStatus} */
    const resolvedStatus = normalizedStatus === BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS.PROVIDED
        ? BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS.PROVIDED
        : (normalizedStatus === BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS.REJECT
            ? BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS.REJECT
            : BROWSER_DEMO_OVERRIDE_DRAFT_RESOLUTION_STATUS.SKIPPED);
    return Object.freeze({
        status: resolvedStatus,
        reasonCode: normalizeString(reasonCode, ''),
        reason: normalizeString(reason, ''),
        source: normalizeString(source, 'none'),
        draft: isPlainObject(draft) ? draft : null,
    });
}

function resolveBrowserDemoSurfacePolicyOverrideDraftFromBuildArtifact(runtimeGlobal) {
    if (!runtimeGlobal || typeof runtimeGlobal !== 'object') {
        return createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.SOURCE_UNAVAILABLE,
            reason: 'Build-Artefakt-Quelle fuer Browser-Demo-Override ist nicht verfuegbar.',
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
    }

    const cached = BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.get(runtimeGlobal);
    if (cached) {
        return cached;
    }

    const XMLHttpRequestCtor = runtimeGlobal.XMLHttpRequest;
    if (typeof XMLHttpRequestCtor !== 'function') {
        const unavailable = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.SOURCE_UNAVAILABLE,
            reason: 'XMLHttpRequest ist fuer den Build-Artefakt-Lesepfad nicht verfuegbar.',
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, unavailable);
        return unavailable;
    }

    let responseText = '';
    let responseStatus = 0;
    try {
        const request = new XMLHttpRequestCtor();
        request.open('GET', BROWSER_DEMO_POLICY_EXPORT_ARTIFACT_URL, false);
        request.send(null);
        responseStatus = Number(request.status || 0);
        responseText = String(request.responseText || '');
    } catch (error) {
        const readFailed = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.READ_FAILED,
            reason: error instanceof Error ? error.message : String(error || 'build_artifact_read_failed'),
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, readFailed);
        return readFailed;
    }

    const hasHttpSuccess = responseStatus >= 200 && responseStatus < 300;
    const hasFileSuccess = responseStatus === 0 && responseText.trim().length > 0;
    if (!hasHttpSuccess && !hasFileSuccess) {
        const unavailable = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.SOURCE_UNAVAILABLE,
            reason: `Build-Artefakt nicht verfuegbar (status: ${responseStatus}).`,
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, unavailable);
        return unavailable;
    }

    if (!responseText.trim()) {
        const missingDraft = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.DRAFT_MISSING,
            reason: 'Build-Artefakt fuer Browser-Demo-Override ist leer.',
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, missingDraft);
        return missingDraft;
    }

    let parsedArtifact = null;
    try {
        parsedArtifact = JSON.parse(responseText);
    } catch (error) {
        const invalidArtifact = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.SNAPSHOT_INVALID,
            reason: error instanceof Error ? error.message : String(error || 'build_artifact_parse_failed'),
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, invalidArtifact);
        return invalidArtifact;
    }

    if (!isPlainObject(parsedArtifact)) {
        const invalidArtifact = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.SNAPSHOT_INVALID,
            reason: 'Build-Artefakt fuer Browser-Demo-Override muss ein Objekt sein.',
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, invalidArtifact);
        return invalidArtifact;
    }

    const contractVersion = normalizeString(parsedArtifact.contractVersion, '');
    if (contractVersion !== BROWSER_DEMO_POLICY_EXPORT_CONTRACT_VERSION) {
        const invalidArtifact = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.SNAPSHOT_INVALID,
            reason: `Build-Artefakt contractVersion ist ungueltig: ${contractVersion || '<missing>'}.`,
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, invalidArtifact);
        return invalidArtifact;
    }

    if (!isPlainObject(parsedArtifact.draft)) {
        const missingDraft = createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.DRAFT_MISSING,
            reason: 'Build-Artefakt enthaelt keinen gueltigen Draft.',
            source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        });
        BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, missingDraft);
        return missingDraft;
    }

    const resolved = createBrowserDemoOverrideDraftResolution({
        status: 'provided',
        source: BROWSER_DEMO_OVERRIDE_SOURCE_BUILD_ARTIFACT,
        draft: parsedArtifact.draft,
    });
    BROWSER_DEMO_BUILD_ARTIFACT_RESOLUTION_CACHE.set(runtimeGlobal, resolved);
    return resolved;
}

function resolveBrowserDemoSurfacePolicyOverrideDraft(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'browserDemoSurfacePolicyOverrideDraft')) {
        const draft = options.browserDemoSurfacePolicyOverrideDraft;
        if (!isPlainObject(draft)) {
            return createBrowserDemoOverrideDraftResolution({
                status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
                reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.DRAFT_INVALID,
                reason: 'browserDemoSurfacePolicyOverrideDraft muss ein Objekt sein.',
                source: 'options',
            });
        }
        return createBrowserDemoOverrideDraftResolution({
            status: 'provided',
            source: 'options',
            draft,
        });
    }

    const runtimeGlobal = resolveRuntimeGlobal(options.runtimeGlobal);
    const browserDemoPolicyContract = runtimeGlobal?.curviosApp?.browserDemoSurfacePolicy
        || runtimeGlobal?.curviosApp?.contracts?.browserDemoSurfacePolicy;
    if (!browserDemoPolicyContract || typeof browserDemoPolicyContract.getOverrideSnapshot !== 'function') {
        return resolveBrowserDemoSurfacePolicyOverrideDraftFromBuildArtifact(runtimeGlobal);
    }

    let snapshot = null;
    try {
        snapshot = browserDemoPolicyContract.getOverrideSnapshot();
    } catch (error) {
        return createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.READ_FAILED,
            reason: error instanceof Error ? error.message : String(error || 'override_read_failed'),
            source: 'runtime',
        });
    }

    if (!isPlainObject(snapshot)) {
        return createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.SNAPSHOT_INVALID,
            reason: 'Override-Snapshot muss ein Objekt sein.',
            source: 'runtime',
        });
    }

    const snapshotReadError = normalizeString(snapshot.readError, '');
    const snapshotParseError = normalizeString(snapshot.parseError, '');
    if (snapshotReadError || snapshotParseError) {
        return createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.READ_FAILED,
            reason: snapshotReadError || snapshotParseError,
            source: 'runtime',
        });
    }

    if (!isPlainObject(snapshot.draft)) {
        return createBrowserDemoOverrideDraftResolution({
            status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
            reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.DRAFT_MISSING,
            reason: 'Kein Browser-Demo-Override-Draft vorhanden.',
            source: 'runtime',
        });
    }

    return createBrowserDemoOverrideDraftResolution({
        status: 'provided',
        source: 'runtime',
        draft: snapshot.draft,
    });
}

function mapBrowserDemoMergeDiagnostics(mergeDiagnostics, source = 'none') {
    const status = normalizeBrowserDemoOverrideDiagnosticStatus(
        mergeDiagnostics?.status,
        BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT
    );
    const reason = normalizeString(mergeDiagnostics?.reason, '');
    const migrationCode = normalizeString(mergeDiagnostics?.migrationCode, '');
    /** @type {string} */
    let reasonCode = BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.REJECTED;

    if (status === BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.APPLIED) {
        reasonCode = BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.APPLIED;
    } else if (status === BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.FALLBACK) {
        reasonCode = BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.FALLBACK_VERSION_UNKNOWN;
    } else if (
        status === BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.REJECT
        && reason === 'VALIDATION_FAILED'
    ) {
        reasonCode = BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.VALIDATION_FAILED;
    }

    return createBrowserDemoOverrideDiagnostics({
        status,
        reasonCode,
        reason,
        source,
        migrationCode,
        errorCodes: mergeDiagnostics?.errorCodes,
        warningCodes: mergeDiagnostics?.warningCodes,
    });
}

function resolveSurfacePolicySource(options = {}) {
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const productEntry = resolveProductEntry(productSurfaceId);
    const baseSurfacePolicy = productEntry?.surfacePolicy && typeof productEntry.surfacePolicy === 'object'
        ? productEntry.surfacePolicy
        : null;
    const baseCapabilities = productEntry?.capabilities && typeof productEntry.capabilities === 'object'
        ? productEntry.capabilities
        : {};

    if (productSurfaceId !== PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO) {
        return Object.freeze({
            productSurfaceId,
            productEntry,
            surfacePolicy: baseSurfacePolicy,
            capabilityFlags: null,
            browserDemoOverrideDiagnostics: createBrowserDemoOverrideDiagnostics({
                status: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_STATUS.SKIPPED,
                reasonCode: BROWSER_DEMO_OVERRIDE_DIAGNOSTIC_REASON_CODES.NOT_APPLICABLE,
                reason: 'Browser-Demo-Override ist nur fuer browser-demo relevant.',
                source: 'none',
            }),
        });
    }

    const overrideDraftResolution = resolveBrowserDemoSurfacePolicyOverrideDraft(options);
    if (overrideDraftResolution.status !== 'provided') {
        return Object.freeze({
            productSurfaceId,
            productEntry,
            surfacePolicy: baseSurfacePolicy,
            capabilityFlags: null,
            browserDemoOverrideDiagnostics: createBrowserDemoOverrideDiagnostics({
                status: overrideDraftResolution.status,
                reasonCode: overrideDraftResolution.reasonCode,
                reason: overrideDraftResolution.reason,
                source: overrideDraftResolution.source,
            }),
        });
    }

    const merged = mergeBrowserDemoSurfacePolicyWithOverride(
        baseSurfacePolicy,
        baseCapabilities,
        overrideDraftResolution.draft
    );
    return Object.freeze({
        productSurfaceId,
        productEntry,
        surfacePolicy: merged?.policy || baseSurfacePolicy,
        capabilityFlags: merged?.capabilityFlags || null,
        browserDemoOverrideDiagnostics: mapBrowserDemoMergeDiagnostics(
            merged?.diagnostics,
            overrideDraftResolution.source
        ),
    });
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizePlatformProductSurfaceId(
    value,
    fallback = PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO
) {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_PRODUCT_SURFACE_IDS.has(normalized) ? normalized : fallback;
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizePlatformRuntimeKind(value, fallback = PLATFORM_RUNTIME_KINDS.WEB) {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_RUNTIME_KINDS.has(normalized) ? normalized : fallback;
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizeLobbyProviderTransport(value, fallback = MULTIPLAYER_TRANSPORTS.LAN) {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_LOBBY_TRANSPORTS.has(normalized) ? normalized : fallback;
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
function normalizeSurfaceMenuModePath(value, fallback = '') {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_SURFACE_MENU_MODE_PATHS.has(normalized) ? normalized : fallback;
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
function normalizeSurfaceSessionType(value, fallback = '') { const normalized = normalizeString(value, '').toLowerCase(); return VALID_SURFACE_SESSION_TYPES.has(normalized) ? normalized : fallback; }

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
function normalizeSurfaceQuickStartActionId(value, fallback = '') {
    const normalized = normalizeString(value, '').toLowerCase();
    return VALID_SURFACE_QUICK_START_ACTION_IDS.has(normalized) ? normalized : fallback;
}

function resolveProductEntry(productSurfaceId) {
    return PLATFORM_CAPABILITY_REGISTRY.products[productSurfaceId]
        || PLATFORM_CAPABILITY_REGISTRY.products[PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO];
}

function resolveSurfaceCapabilitySpec(capabilityId, options = {}) {
    const normalizedCapabilityId = normalizeString(capabilityId, '');
    if (!normalizedCapabilityId) {
        return null;
    }
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    return resolveProductEntry(productSurfaceId)?.capabilities?.[normalizedCapabilityId] || null;
}

function resolveSurfaceDefaultAccessMode(surfacePolicy) {
    return normalizeString(
        surfacePolicy?.defaultAccessMode,
        PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY
    );
}

function resolveSurfaceDefaultProviderKind(productSurfaceId, defaultAccessMode) {
    if (defaultAccessMode !== PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL) {
        return PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
    }
    if (productSurfaceId === PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP) {
        return PLATFORM_PROVIDER_KINDS.ELECTRON_IPC;
    }
    if (productSurfaceId === PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO) {
        return PLATFORM_PROVIDER_KINDS.BROWSER_DEMO;
    }
    return PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
}

function resolveSurfaceDeveloperPolicy(surfacePolicy) {
    return surfacePolicy?.developerAccess && typeof surfacePolicy.developerAccess === 'object'
        ? surfacePolicy.developerAccess
        : null;
}

function sanitizeUniqueStringArray(values, normalizer) {
    if (!Array.isArray(values)) {
        return Object.freeze([]);
    }
    const seen = new Set();
    const sanitized = [];
    values.forEach((value) => {
        const normalized = normalizer(value, '');
        if (!normalized || seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        sanitized.push(normalized);
    });
    return Object.freeze(sanitized);
}

function resolveSurfaceAllowedModePaths(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedModePaths,
        normalizeSurfaceMenuModePath
    );
}

function resolveSurfaceAllowedSessionTypes(surfacePolicy) { return sanitizeUniqueStringArray(surfacePolicy?.allowedSessionTypes, normalizeSurfaceSessionType); }

function resolveSurfaceAllowedMultiplayerTransports(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedMultiplayerTransports,
        normalizeLobbyProviderTransport
    );
}

function resolveSurfaceTransportSubset(values, allowedTransports, fallbackToAllowed = false) {
    if (!Array.isArray(values)) {
        return fallbackToAllowed === true
            ? Object.freeze([...allowedTransports])
            : Object.freeze([]);
    }
    const allowedSet = new Set(allowedTransports);
    const sanitized = sanitizeUniqueStringArray(values, normalizeLobbyProviderTransport)
        .filter((transport) => allowedSet.has(transport));
    return Object.freeze(sanitized);
}

function resolveSurfaceDefaultMultiplayerTransport(surfacePolicy, allowedMultiplayerTransports) {
    const fallbackTransport = allowedMultiplayerTransports[0] || MULTIPLAYER_TRANSPORTS.LAN;
    return normalizeLobbyProviderTransport(surfacePolicy?.defaultMultiplayerTransport, fallbackTransport);
}

function resolveSurfaceAllowedQuickStartActionIds(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedQuickStartActionIds,
        normalizeSurfaceQuickStartActionId
    );
}

function resolveSurfaceAllowedPresetIds(surfacePolicy) {
    return sanitizeUniqueStringArray(
        surfacePolicy?.allowedPresetIds,
        normalizeString
    );
}

function resolveSurfaceCuratedMapKeysByModePath(surfacePolicy) {
    const source = surfacePolicy?.curatedMapKeysByModePath;
    if (!source || typeof source !== 'object') {
        return Object.freeze({});
    }
    const resolved = {};
    Object.entries(source).forEach(([modePath, mapKeys]) => {
        const normalizedModePath = normalizeSurfaceMenuModePath(modePath, '');
        if (!normalizedModePath) {
            return;
        }
        resolved[normalizedModePath] = sanitizeUniqueStringArray(mapKeys, normalizeString);
    });
    return Object.freeze(resolved);
}

function resolveSurfaceDefaultModePath(surfacePolicy, allowedModePaths) {
    const fallbackModePath = allowedModePaths[0] || PLATFORM_SURFACE_MENU_MODE_PATHS.NORMAL;
    return normalizeSurfaceMenuModePath(surfacePolicy?.defaultModePath, fallbackModePath)
        || fallbackModePath;
}

function resolveSurfaceCapabilityConfiguredAvailability(providerSpec, fallbackAvailable = false) {
    if (providerSpec && typeof providerSpec === 'object') {
        if (Object.prototype.hasOwnProperty.call(providerSpec, 'enabled')) {
            return providerSpec.enabled === true;
        }
        return normalizeString(providerSpec.available, PLATFORM_PROVIDER_KINDS.UNAVAILABLE)
            !== PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
    }
    if (typeof providerSpec !== 'string') {
        return fallbackAvailable === true;
    }
    return normalizeString(providerSpec, PLATFORM_PROVIDER_KINDS.UNAVAILABLE)
        !== PLATFORM_PROVIDER_KINDS.UNAVAILABLE;
}

export function resolvePlatformRuntimeKind(options = {}) {
    const explicitRuntimeKind = normalizePlatformRuntimeKind(options.runtimeKind, '');
    if (explicitRuntimeKind) {
        return explicitRuntimeKind;
    }
    // migration-debt V91 guard-matrix surface:curviosApp sunsetPhase:91.3
    // Direct curviosApp/__CURVIOS_APP__ read; allowed only in this file per guard-matrix allowedCallers.
    const runtimeGlobal = resolveRuntimeGlobal(options.runtimeGlobal);
    return runtimeGlobal?.curviosApp?.isApp === true || runtimeGlobal?.__CURVIOS_APP__ === true
        ? PLATFORM_RUNTIME_KINDS.ELECTRON
        : PLATFORM_RUNTIME_KINDS.WEB;
}

export function resolvePlatformProductSurfaceId(options = {}) {
    const explicitProductSurfaceId = normalizePlatformProductSurfaceId(options.productSurfaceId, '');
    if (explicitProductSurfaceId) {
        return explicitProductSurfaceId;
    }
    const normalizedAppMode = normalizeString(options.appMode, '').toLowerCase();
    if (normalizedAppMode === 'app') {
        return PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP;
    }
    return resolvePlatformRuntimeKind(options) === PLATFORM_RUNTIME_KINDS.ELECTRON
        ? PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP
        : PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO;
}

export function resolvePlatformEnvironment(options = {}) {
    const surfacePolicySource = resolveSurfacePolicySource(options);
    const productSurfaceId = surfacePolicySource.productSurfaceId;
    const runtimeKind = resolvePlatformRuntimeKind(options);
    const productEntry = surfacePolicySource.productEntry;
    const surfacePolicy = surfacePolicySource.surfacePolicy && typeof surfacePolicySource.surfacePolicy === 'object'
        ? surfacePolicySource.surfacePolicy
        : {
            defaultAccessMode: PLATFORM_SURFACE_POLICY_MODES.DEFAULT_DENY,
            multiplayerRole: PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY,
        };
    const allowedMultiplayerTransports = resolveSurfaceAllowedMultiplayerTransports(surfacePolicy);
    const defaultMultiplayerTransport = resolveSurfaceDefaultMultiplayerTransport(
        surfacePolicy,
        allowedMultiplayerTransports
    );
    return Object.freeze({
        contractVersion: PLATFORM_CAPABILITY_REGISTRY.contractVersion,
        surfacePolicyContractVersion: PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
        productSurfaceId,
        runtimeKind,
        defaultLobbyTransport: defaultMultiplayerTransport,
        toolingSurfaceId: productEntry.toolingSurfaceId,
        defaultAccessMode: resolveSurfaceDefaultAccessMode(surfacePolicy),
        multiplayerRole: normalizeString(
            surfacePolicy.multiplayerRole,
            PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY
        ),
        browserDemoOverrideDiagnostics: surfacePolicySource.browserDemoOverrideDiagnostics,
    });
}

export function isDesktopProductSurface(options = {}) {
    return resolvePlatformProductSurfaceId(options) === PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP;
}

export function resolveDefaultLobbyTransport(options = {}) {
    return resolvePlatformEnvironment(options).defaultLobbyTransport;
}

export function resolveSurfacePolicy(options = {}) {
    const surfacePolicySource = resolveSurfacePolicySource(options);
    const productSurfaceId = surfacePolicySource.productSurfaceId;
    const policy = surfacePolicySource.surfacePolicy && typeof surfacePolicySource.surfacePolicy === 'object'
        ? surfacePolicySource.surfacePolicy
        : null;
    const allowedSessionTypes = resolveSurfaceAllowedSessionTypes(policy);
    const allowedMultiplayerTransports = resolveSurfaceAllowedMultiplayerTransports(policy);
    const allowedModePaths = resolveSurfaceAllowedModePaths(policy);
    const allowedQuickStartActionIds = resolveSurfaceAllowedQuickStartActionIds(policy);
    const allowedPresetIds = resolveSurfaceAllowedPresetIds(policy);
    const curatedMapKeysByModePath = resolveSurfaceCuratedMapKeysByModePath(policy);
    const allowedGameModes = Array.isArray(policy?.allowedGameModes)
        ? Object.freeze([...policy.allowedGameModes])
        : Object.freeze([]);
    const defaultMultiplayerTransport = resolveSurfaceDefaultMultiplayerTransport(
        policy,
        allowedMultiplayerTransports
    );
    const hostMultiplayerTransports = resolveSurfaceTransportSubset(
        policy?.hostMultiplayerTransports,
        allowedMultiplayerTransports,
        true
    );
    const joinMultiplayerTransports = resolveSurfaceTransportSubset(
        policy?.joinMultiplayerTransports,
        allowedMultiplayerTransports,
        true
    );
    const legacyMultiplayerTransports = resolveSurfaceTransportSubset(
        policy?.legacyMultiplayerTransports,
        Object.values(MULTIPLAYER_TRANSPORTS)
    );

    return Object.freeze({
        contractVersion: PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
        productSurfaceId,
        defaultAccessMode: resolveSurfaceDefaultAccessMode(policy),
        multiplayerRole: normalizeString(
            policy?.multiplayerRole,
            PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY
        ),
        allowedSessionTypes,
        defaultMultiplayerTransport,
        allowedMultiplayerTransports,
        hostMultiplayerTransports,
        joinMultiplayerTransports,
        legacyMultiplayerTransports,
        defaultModePath: resolveSurfaceDefaultModePath(policy, allowedModePaths),
        allowedGameModes,
        allowedModePaths,
        allowedQuickStartActionIds,
        allowedPresetIds,
        curatedMapKeysByModePath,
        requiresCuratedMaps: policy?.requiresCuratedMaps === true,
        browserDemoOverrideDiagnostics: surfacePolicySource.browserDemoOverrideDiagnostics,
    });
}

export function resolveSurfaceDeveloperAccess(options = {}) {
    const surfacePolicySource = resolveSurfacePolicySource(options);
    const productSurfaceId = surfacePolicySource.productSurfaceId;
    const surfacePolicy = surfacePolicySource.surfacePolicy && typeof surfacePolicySource.surfacePolicy === 'object'
        ? surfacePolicySource.surfacePolicy
        : null;
    const developerPolicy = resolveSurfaceDeveloperPolicy(surfacePolicy);
    const available = developerPolicy?.available !== false;
    const accessMode = normalizeString(
        developerPolicy?.accessMode,
        available
            ? PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.LOCAL_UNLOCK
            : PLATFORM_SURFACE_DEVELOPER_ACCESS_MODES.BLOCKED
    );
    const defaultReason = productSurfaceId === PLATFORM_PRODUCT_SURFACE_IDS.BROWSER_DEMO
        ? PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.DEMO_LOCAL_DEVTOOLS
        : PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.LOCAL_DEVTOOLS;
    const reason = normalizeString(
        developerPolicy?.reason,
        available ? defaultReason : PLATFORM_SURFACE_DEVELOPER_ACCESS_REASONS.UNAVAILABLE
    );
    const message = normalizeString(
        developerPolicy?.message,
        available
            ? 'Developer-, Debug- und Training-Schalter bleiben lokale Diagnosepfade.'
            : 'Developer-, Debug- und Training-Schalter sind fuer diese Surface nicht verfuegbar.'
    );

    return Object.freeze({
        contractVersion: PLATFORM_SURFACE_POLICY_CONTRACT_VERSION,
        productSurfaceId,
        available,
        accessMode,
        reason,
        message,
        browserDemoOverrideDiagnostics: surfacePolicySource.browserDemoOverrideDiagnostics,
    });
}

export function resolveSurfaceCapabilityAccess(capabilityId, options = {}) {
    const normalizedCapabilityId = normalizeString(capabilityId, '');
    const hasCapabilityId = normalizedCapabilityId.length > 0;
    const surfacePolicySource = resolveSurfacePolicySource(options);
    const productSurfaceId = surfacePolicySource.productSurfaceId;
    const productEntry = surfacePolicySource.productEntry;
    const providerSpec = hasCapabilityId
        ? resolveSurfaceCapabilitySpec(normalizedCapabilityId, { productSurfaceId })
        : null;
    const surfacePolicy = surfacePolicySource.surfacePolicy && typeof surfacePolicySource.surfacePolicy === 'object'
        ? surfacePolicySource.surfacePolicy
        : null;
    const defaultAccessMode = resolveSurfaceDefaultAccessMode(surfacePolicy);
    const usesDefaultPolicy = hasCapabilityId && providerSpec === null;
    const capabilityFlags = surfacePolicySource.capabilityFlags && typeof surfacePolicySource.capabilityFlags === 'object'
        ? surfacePolicySource.capabilityFlags
        : null;
    let configuredAvailable = resolveSurfaceCapabilityConfiguredAvailability(
        providerSpec,
        usesDefaultPolicy && defaultAccessMode === PLATFORM_SURFACE_POLICY_MODES.DEFAULT_FULL
    );
    if (capabilityFlags && Object.prototype.hasOwnProperty.call(capabilityFlags, normalizedCapabilityId)) {
        configuredAvailable = configuredAvailable && capabilityFlags[normalizedCapabilityId] === true;
    }
    const providerKind = usesDefaultPolicy
        ? resolveSurfaceDefaultProviderKind(productSurfaceId, defaultAccessMode)
        : resolveCapabilityProviderKind(normalizedCapabilityId, {
            productSurfaceId,
            available: configuredAvailable,
        });

    return Object.freeze({
        capabilityId: normalizedCapabilityId,
        productSurfaceId,
        available: configuredAvailable,
        providerKind,
        defaultAccessMode,
        multiplayerRole: normalizeString(
            surfacePolicy?.multiplayerRole,
            PLATFORM_SURFACE_MULTIPLAYER_ROLES.JOIN_ONLY
        ),
        resolvedByDefaultPolicy: usesDefaultPolicy,
        browserDemoOverrideDiagnostics: surfacePolicySource.browserDemoOverrideDiagnostics,
    });
}

export function isLegacyLobbyTransport(transport) {
    const normalized = normalizeString(transport, '').toLowerCase();
    return normalized === MULTIPLAYER_TRANSPORTS.STORAGE_BRIDGE;
}

/**
 * @param {unknown} transport
 * @param {string} [fallback]
 * @returns {string}
 */
export function resolveLobbyProviderKind(
    transport,
    fallback = PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY
) {
    const normalizedTransport = normalizeLobbyProviderTransport(transport, fallback === ''
        ? ''
        : MULTIPLAYER_TRANSPORTS.LAN);
    if (!normalizedTransport) {
        return normalizeString(fallback, PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY);
    }
    return normalizeString(
        PLATFORM_CAPABILITY_REGISTRY.lobbyProviders[normalizedTransport],
        normalizeString(fallback, PLATFORM_PROVIDER_KINDS.MENU_LAN_LOBBY)
    );
}

export function resolveCapabilityProviderKind(capabilityId, options = {}) {
    const normalizedCapabilityId = normalizeString(capabilityId, '');
    const productSurfaceId = resolvePlatformProductSurfaceId(options);
    const providerSpec = resolveSurfaceCapabilitySpec(normalizedCapabilityId, { productSurfaceId });
    if (providerSpec && typeof providerSpec === 'object') {
        return options.available === false
            ? normalizeString(providerSpec.unavailable, PLATFORM_PROVIDER_KINDS.UNAVAILABLE)
            : normalizeString(providerSpec.available, PLATFORM_PROVIDER_KINDS.UNAVAILABLE);
    }
    return normalizeString(providerSpec, PLATFORM_PROVIDER_KINDS.UNAVAILABLE);
}

/**
 * @param {string} [toolingId]
 * @param {string} [fallback]
 * @returns {string}
 */
export function resolveToolingSurfaceId(
    toolingId = PLATFORM_TOOLING_IDS.DEFAULT,
    fallback = PLATFORM_PRODUCT_SURFACE_IDS.DESKTOP_APP
) {
    const normalizedToolingId = normalizeString(toolingId, PLATFORM_TOOLING_IDS.DEFAULT);
    return normalizePlatformProductSurfaceId(
        PLATFORM_CAPABILITY_REGISTRY.tooling?.[normalizedToolingId]?.surfaceId,
        fallback
    );
}
