import { EDITOR_API_ROUTES } from '../../shared/contracts/EditorPathContract.js';
import { resolveArtifactVersionState } from '../../shared/contracts/ArtifactVersionMigrationContract.js';
import { PLATFORM_CAPABILITY_IDS } from '../../shared/contracts/PlatformCapabilityContract.js';
import { resolveSurfaceCapabilityAccess } from '../../shared/contracts/PlatformCapabilityRegistry.js';
import {
    PLATFORM_SURFACE_FEATURE_CLASSIFICATIONS,
    PLATFORM_SURFACE_FEATURE_IDS,
    resolveSurfaceFeatureClassification,
} from '../../shared/contracts/PlatformSurfacePolicyOps.js';
import { createBrowserSaveAdapter } from '../../platform/browser/BrowserPlatformAdapters.js';
import { createElectronPreloadSaveAdapter } from '../../platform/electron/ElectronPlatformBridge.js';

const DESKTOP_SAVE_VERSION_FIELDS = Object.freeze(['contractVersion']);
const DESKTOP_SAVE_SUPPORTED_VERSIONS = Object.freeze(['preload.save.v1']);
const DESKTOP_SAVE_CURRENT_VERSION = 'preload.save.v1';

function dedupeWarnings(warnings) {
    const unique = [];
    const seen = new Set();
    for (const warning of Array.isArray(warnings) ? warnings : []) {
        const normalized = typeof warning === 'string' ? warning.trim() : '';
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        unique.push(normalized);
    }
    return unique;
}

function createDownloadStatus({
    requested,
    transport,
    status,
    fallbackReason = null,
    apiStatus = null,
    message = '',
    warnings = [],
    surfaceClassification = '',
}) {
    return {
        requested: requested === true,
        transport: String(transport || ''),
        status: String(status || ''),
        fallbackReason: fallbackReason ? String(fallbackReason) : null,
        apiStatus: Number.isFinite(Number(apiStatus)) ? Number(apiStatus) : null,
        message: String(message || '').trim(),
        warnings: dedupeWarnings(warnings),
        surfaceClassification: String(surfaceClassification || '').trim(),
    };
}

function resolveDesktopSaveContractState(adapter) {
    return resolveArtifactVersionState(adapter && typeof adapter === 'object' ? adapter : {}, {
        artifactType: 'desktop-save-adapter',
        versionFields: DESKTOP_SAVE_VERSION_FIELDS,
        supportedVersions: DESKTOP_SAVE_SUPPORTED_VERSIONS,
        currentVersion: DESKTOP_SAVE_CURRENT_VERSION,
        allowMissingVersion: true,
    });
}

function isSupportedDesktopSaveAdapterContract(adapter) {
    const versionState = resolveDesktopSaveContractState(adapter);
    const hasExplicitContractVersion = !!adapter
        && typeof adapter === 'object'
        && Object.prototype.hasOwnProperty.call(adapter, 'contractVersion');
    if (!hasExplicitContractVersion) {
        return true;
    }
    return !versionState.shouldReject && versionState.resolvedVersion !== null;
}

/**
 * Triggers a browser anchor-click download for the given Blob.
 * @param {{ blob: Blob, fileName: string, globalScope?: typeof globalThis }} params
 */
export function defaultDownload({ blob, fileName, globalScope = globalThis }) {
    const doc = globalScope?.document ?? null;
    const urlApi = globalScope?.URL ?? globalThis.URL;
    if (!doc || !blob || !fileName || typeof urlApi?.createObjectURL !== 'function') return;
    const anchor = doc.createElement?.('a');
    if (!anchor || typeof anchor.click !== 'function') return;
    const body = doc.body;
    if (!body || typeof body.appendChild !== 'function') return;
    const url = urlApi.createObjectURL(blob);
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    globalScope?.setTimeout?.(() => {
        if (typeof urlApi?.revokeObjectURL === 'function') {
            urlApi.revokeObjectURL(url);
        }
    }, 0);
}

/**
 * Prepends the directory name to the file name when present.
 * @param {string} downloadDirectoryName
 * @param {string} fileName
 * @returns {string}
 */
export function buildDownloadFileName(downloadDirectoryName, fileName) {
    const baseName = String(fileName || '').trim();
    if (!baseName) return baseName;
    if (!downloadDirectoryName) return baseName;
    return `${downloadDirectoryName}/${baseName}`;
}

/**
 * Attempts to save the blob: tries the editor API first, falls back to a browser download.
 * @param {{
 *   blob: Blob,
 *   fileName: string,
 *   mimeType: string,
 *   autoDownload: boolean,
 *   downloadHandler: function,
 *   logger: object
 * }} params
 * @returns {Promise<{requested: boolean, transport: string, status: string, fallbackReason: string|null, apiStatus: number|null}>}
 */
export async function attemptAutoDownload({ blob, fileName, mimeType, autoDownload, downloadHandler, logger }) {
    const videoFeatureClassification = resolveSurfaceFeatureClassification(
        PLATFORM_SURFACE_FEATURE_IDS.VIDEO_EXPORT,
        { runtimeGlobal: globalThis }
    );
    if (!autoDownload || !blob || blob.size <= 0) {
        return createDownloadStatus({
            requested: false,
            transport: 'disabled',
            status: 'not_requested',
            message: 'Recording-Export wurde nicht angefordert.',
            surfaceClassification: videoFeatureClassification.classification,
        });
    }
    const safeFileName = String(fileName || '').trim();
    const browserFileName = safeFileName.split('/').filter(Boolean).pop() || safeFileName;
    const saveSurfaceCapability = resolveSurfaceCapabilityAccess(PLATFORM_CAPABILITY_IDS.SAVE, {
        runtimeGlobal: globalThis,
    });
    const fileIoFeatureClassification = resolveSurfaceFeatureClassification(
        PLATFORM_SURFACE_FEATURE_IDS.FILE_IO,
        { runtimeGlobal: globalThis }
    );
    const desktopSaveAdapter = createElectronPreloadSaveAdapter(globalThis);
    const desktopSaveAdapterVersionSupported = isSupportedDesktopSaveAdapterContract(desktopSaveAdapter);
    const browserSaveAdapter = createBrowserSaveAdapter({
        saveVideo: saveSurfaceCapability.available === true
            ? (payload, downloadFileName, resolvedMimeType) => {
                const blobPayload = payload instanceof Blob
                    ? payload
                    : new Blob([payload], { type: resolvedMimeType || mimeType || 'application/octet-stream' });
                downloadHandler({ blob: blobPayload, fileName: downloadFileName, mimeType: resolvedMimeType || mimeType });
                return {
                    saved: true,
                    transport: 'download',
                };
            }
            : null,
    });
    const statusWarnings = [];
    if (videoFeatureClassification.classification === PLATFORM_SURFACE_FEATURE_CLASSIFICATIONS.FUTURE_OPT_IN) {
        statusWarnings.push('Video-Export ist fuer diese Surface als future opt-in klassifiziert; Browser-Fallback bleibt ein degradiertes Zusatzangebot.');
    }
    if (fileIoFeatureClassification.classification === PLATFORM_SURFACE_FEATURE_CLASSIFICATIONS.DESKTOP_ONLY && !desktopSaveAdapter.isAvailable()) {
        statusWarnings.push('Dateioperationen bleiben desktop-only; ohne Desktop-Speicheradapter wird ein degradiertes Fallback genutzt.');
    }
    const downloadViaBrowser = async (reason, error = null) => {
        if (saveSurfaceCapability.available !== true) {
            return false;
        }
        if (error) {
            logger?.warn?.(`[DownloadService] recording export fallback (${reason})`, error);
        }
        const result = await browserSaveAdapter.saveVideo(blob, browserFileName, mimeType);
        if (result?.saved === true) {
            return true;
        }
        logger?.warn?.('[DownloadService] recording export browser download failed', result?.error || null);
        return false;
    };
    if (desktopSaveAdapter.isAvailable() && !desktopSaveAdapterVersionSupported) {
        logger?.warn?.('[DownloadService] recording export desktop save skipped due to unsupported adapter contractVersion', desktopSaveAdapter?.contractVersion || null);
        statusWarnings.push('Desktop-Speicheradapter ist veraltet oder inkompatibel; Browser-/API-Fallback wird verwendet.');
    }
    if (
        desktopSaveAdapterVersionSupported
        && desktopSaveAdapter.isAvailable()
        && typeof desktopSaveAdapter.saveVideo === 'function'
        && typeof blob.arrayBuffer === 'function'
    ) {
        try {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const appResult = await desktopSaveAdapter.saveVideo(bytes, browserFileName, mimeType);
            if (appResult?.saved === true) {
                logger?.info?.('[DownloadService] recording export saved via electron app', browserFileName);
                return createDownloadStatus({
                    requested: true,
                    transport: 'app',
                    status: 'saved_via_app',
                    message: 'Recording wurde direkt ueber die Desktop-App gespeichert.',
                    warnings: statusWarnings,
                    surfaceClassification: videoFeatureClassification.classification,
                });
            }
        } catch (error) {
            logger?.warn?.('[DownloadService] recording export app save failed', error);
            statusWarnings.push('Desktop-App konnte die Aufnahme nicht direkt speichern; Dateipfad-Fallback wird versucht.');
        }
    }
    if (typeof fetch !== 'function') {
        const downloaded = await downloadViaBrowser('fetch-unavailable');
        return createDownloadStatus({
            requested: true,
            transport: downloaded ? 'download' : 'download-failed',
            status: downloaded ? 'saved_via_download' : 'download_failed',
            fallbackReason: 'fetch-unavailable',
            message: downloaded
                ? 'Recording wurde als Browser-Download gespeichert, weil keine Disk-API verfuegbar ist.'
                : 'Recording konnte ohne Disk-API auch nicht als Browser-Download gespeichert werden.',
            warnings: [...statusWarnings, 'Disk-API ist in dieser Umgebung nicht verfuegbar.'],
            surfaceClassification: videoFeatureClassification.classification,
        });
    }
    try {
        const response = await fetch(EDITOR_API_ROUTES.SAVE_VIDEO_DISK, {
            method: 'POST',
            headers: { 'x-file-name': safeFileName },
            body: blob,
        });
        if (response?.ok) {
            logger?.info?.('[DownloadService] recording export saved via api', safeFileName);
            return createDownloadStatus({
                requested: true,
                transport: 'api',
                status: 'saved_via_api',
                apiStatus: Number(response.status) || 200,
                message: 'Recording wurde ueber die lokale Disk-API gespeichert.',
                warnings: statusWarnings,
                surfaceClassification: videoFeatureClassification.classification,
            });
        }
        const apiStatus = Number(response?.status) || 0;
        const apiError = new Error(`http_${apiStatus || 'unknown'}`);
        const downloaded = await downloadViaBrowser('api-failed', apiError);
        return createDownloadStatus({
            requested: true,
            transport: downloaded ? 'api-fallback-download' : 'api-fallback-download-failed',
            status: downloaded ? 'saved_via_download_fallback' : 'download_fallback_failed',
            fallbackReason: 'api-failed',
            apiStatus: apiStatus || null,
            message: downloaded
                ? 'Recording wurde als Browser-Download gespeichert, weil die Disk-API fehlgeschlagen ist.'
                : 'Recording konnte nach fehlgeschlagener Disk-API auch nicht als Browser-Download gespeichert werden.',
            warnings: [...statusWarnings, `Disk-API-Fehler: HTTP ${apiStatus || 'unknown'}.`],
            surfaceClassification: videoFeatureClassification.classification,
        });
    } catch (error) {
        const downloaded = await downloadViaBrowser('api-throw', error);
        return createDownloadStatus({
            requested: true,
            transport: downloaded ? 'download' : 'download-failed',
            status: downloaded ? 'saved_via_download' : 'download_failed',
            fallbackReason: 'api-throw',
            message: downloaded
                ? 'Recording wurde als Browser-Download gespeichert, weil die Disk-API nicht erreichbar war.'
                : 'Recording konnte weder ueber die Disk-API noch als Browser-Download gespeichert werden.',
            warnings: [...statusWarnings, 'Disk-API war nicht erreichbar.'],
            surfaceClassification: videoFeatureClassification.classification,
        });
    }
}
