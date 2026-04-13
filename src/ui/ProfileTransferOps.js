import { resolveArtifactVersionState } from '../shared/contracts/ArtifactVersionMigrationContract.js';

function requireCallback(fn, name) {
    if (typeof fn !== 'function') {
        throw new TypeError(`${name} callback is required`);
    }
    return fn;
}

function cloneSettingsPayload(settings) {
    return JSON.parse(JSON.stringify(settings || {}));
}

export const PROFILE_EXPORT_CONTRACT_VERSION = 'profile-export.v1';
const PROFILE_IMPORT_VERSION_FIELDS = Object.freeze(['contractVersion']);
const PROFILE_IMPORT_SUPPORTED_VERSIONS = Object.freeze([PROFILE_EXPORT_CONTRACT_VERSION]);

export function exportProfileAsJson(profile) {
    if (!profile || typeof profile !== 'object') {
        throw new TypeError('profile is required');
    }

    return JSON.stringify({
        contractVersion: PROFILE_EXPORT_CONTRACT_VERSION,
        exportedAt: Date.now(),
        profile: {
            name: String(profile.name || '').trim(),
            updatedAt: Number(profile.updatedAt || Date.now()),
            isDefault: Boolean(profile.isDefault),
            settings: cloneSettingsPayload(profile.settings),
        },
    }, null, 2);
}

export function parseProfileImport(inputValue, options = {}) {
    const normalizeProfileName = requireCallback(options.normalizeProfileName, 'normalizeProfileName');
    const rawInput = String(inputValue || '').trim();
    if (!rawInput) {
        return { success: false, error: 'Kein Profil-Import vorhanden' };
    }

    let parsed;
    try {
        parsed = JSON.parse(rawInput);
    } catch {
        return { success: false, error: 'Profil-Import ist kein gueltiges JSON' };
    }

    const versionState = resolveArtifactVersionState(parsed, {
        artifactType: 'profile-import',
        versionFields: PROFILE_IMPORT_VERSION_FIELDS,
        supportedVersions: PROFILE_IMPORT_SUPPORTED_VERSIONS,
        currentVersion: PROFILE_EXPORT_CONTRACT_VERSION,
        allowMissingVersion: true,
    });
    const hasExplicitContractVersion = !!parsed
        && typeof parsed === 'object'
        && Object.prototype.hasOwnProperty.call(parsed, 'contractVersion');
    if (hasExplicitContractVersion && versionState.resolvedVersion === null) {
        return {
            success: false,
            error: 'Profil-Import verwendet ungueltige contractVersion "unbekannt"',
        };
    }
    if (versionState.shouldReject) {
        const receivedVersion = versionState.resolvedVersion === null
            ? 'unbekannt'
            : String(versionState.resolvedVersion);
        return {
            success: false,
            error: `Profil-Import verwendet ungueltige contractVersion "${receivedVersion}"`,
        };
    }
    if (
        versionState.hasVersionField
        && (!parsed?.profile || typeof parsed.profile !== 'object' || Array.isArray(parsed.profile))
    ) {
        return {
            success: false,
            error: 'Profil-Import-Huelle ist unvollstaendig (profile fehlt)',
        };
    }

    const candidate = parsed?.profile && typeof parsed.profile === 'object'
        ? parsed.profile
        : parsed;
    const name = normalizeProfileName(candidate?.name || '');
    if (!name) {
        return { success: false, error: 'Profilname fehlt im Import' };
    }

    return {
        success: true,
        profile: {
            name,
            updatedAt: Number(candidate?.updatedAt || Date.now()),
            isDefault: Boolean(candidate?.isDefault),
            settings: cloneSettingsPayload(candidate?.settings),
        },
    };
}
