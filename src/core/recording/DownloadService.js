import { EDITOR_API_ROUTES } from '../../shared/contracts/EditorPathContract.js';
import { createBrowserSaveAdapter } from '../../platform/browser/BrowserPlatformAdapters.js';
import { createElectronPreloadSaveAdapter } from '../../platform/electron/ElectronPlatformBridge.js';

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
    if (!autoDownload || !blob || blob.size <= 0) {
        return {
            requested: false,
            transport: 'disabled',
            status: 'not_requested',
            fallbackReason: null,
            apiStatus: null,
        };
    }
    const safeFileName = String(fileName || '').trim();
    const browserFileName = safeFileName.split('/').filter(Boolean).pop() || safeFileName;
    const desktopSaveAdapter = createElectronPreloadSaveAdapter(globalThis);
    const browserSaveAdapter = createBrowserSaveAdapter({
        saveVideo: (payload, downloadFileName, resolvedMimeType) => {
            const blobPayload = payload instanceof Blob
                ? payload
                : new Blob([payload], { type: resolvedMimeType || mimeType || 'application/octet-stream' });
            downloadHandler({ blob: blobPayload, fileName: downloadFileName, mimeType: resolvedMimeType || mimeType });
            return {
                saved: true,
                transport: 'download',
            };
        },
    });
    const downloadViaBrowser = async (reason, error = null) => {
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
    if (desktopSaveAdapter.isAvailable() && typeof desktopSaveAdapter.saveVideo === 'function' && typeof blob.arrayBuffer === 'function') {
        try {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const appResult = await desktopSaveAdapter.saveVideo(bytes, browserFileName, mimeType);
            if (appResult?.saved === true) {
                logger?.info?.('[DownloadService] recording export saved via electron app', browserFileName);
                return {
                    requested: true,
                    transport: 'app',
                    status: 'saved_via_app',
                    fallbackReason: null,
                    apiStatus: null,
                };
            }
        } catch (error) {
            logger?.warn?.('[DownloadService] recording export app save failed', error);
        }
    }
    if (typeof fetch !== 'function') {
        const downloaded = await downloadViaBrowser('fetch-unavailable');
        return {
            requested: true,
            transport: downloaded ? 'download' : 'download-failed',
            status: downloaded ? 'saved_via_download' : 'download_failed',
            fallbackReason: 'fetch-unavailable',
            apiStatus: null,
        };
    }
    try {
        const response = await fetch(EDITOR_API_ROUTES.SAVE_VIDEO_DISK, {
            method: 'POST',
            headers: { 'x-file-name': safeFileName },
            body: blob,
        });
        if (response?.ok) {
            logger?.info?.('[DownloadService] recording export saved via api', safeFileName);
            return {
                requested: true,
                transport: 'api',
                status: 'saved_via_api',
                fallbackReason: null,
                apiStatus: Number(response.status) || 200,
            };
        }
        const apiStatus = Number(response?.status) || 0;
        const apiError = new Error(`http_${apiStatus || 'unknown'}`);
        const downloaded = await downloadViaBrowser('api-failed', apiError);
        return {
            requested: true,
            transport: downloaded ? 'api-fallback-download' : 'api-fallback-download-failed',
            status: downloaded ? 'saved_via_download_fallback' : 'download_fallback_failed',
            fallbackReason: 'api-failed',
            apiStatus: apiStatus || null,
        };
    } catch (error) {
        const downloaded = await downloadViaBrowser('api-throw', error);
        return {
            requested: true,
            transport: downloaded ? 'download' : 'download-failed',
            status: downloaded ? 'saved_via_download' : 'download_failed',
            fallbackReason: 'api-throw',
            apiStatus: null,
        };
    }
}
