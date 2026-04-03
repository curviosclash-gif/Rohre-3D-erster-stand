import { MATCH_LIFECYCLE_EVENT_TYPES } from '../../shared/contracts/MatchLifecycleContract.js';
import { RECORDING_CAPTURE_PROFILE } from '../../shared/contracts/RecordingCaptureContract.js';
import { RECORDER_ENGINE } from '../recording/MediaRecorderSupport.js';

function getRoundRecorder(game) {
    return game?.recorder || null;
}

async function startCinematicRecording({ game, getRuntimeHandle, showStatusToast, recorder }) {
    const renderer = getRuntimeHandle('renderer');
    recorder?.setRecordingCaptureSettings?.({ profile: RECORDING_CAPTURE_PROFILE.CINEMATIC_MP4 });
    renderer?.setRecordingCaptureSettings?.({ profile: RECORDING_CAPTURE_PROFILE.CINEMATIC_MP4 });
    if (typeof game?.render === 'function') game.render();
    const result = await recorder.startRecording({ type: 'cinematic_manual_start' });
    if (result?.started) {
        const engine = result?.recorderEngine || 'unknown';
        const format = engine === RECORDER_ENGINE.NATIVE_WEBCODECS ? 'MP4' : 'WebM';
        showStatusToast(`Cinematic-Aufnahme: gestartet als ${format} (F9 zum Stoppen)`, 1800, 'success');
    } else {
        showStatusToast('Cinematic-Aufnahme konnte nicht gestartet werden', 1800, 'error');
    }
    return result;
}

export function toggleCinematicRecordingFromHotkey({ game, getRuntimeHandle, showStatusToast }) {
    const recorder = getRuntimeHandle('mediaRecorderSystem');
    if (!recorder || typeof recorder.notifyLifecycleEvent !== 'function') return undefined;
    const support = recorder.getSupportState?.() || null;
    if (support && support.canRecord === false) {
        showStatusToast('Videoaufnahme nicht verfuegbar', 1600, 'error');
        return false;
    }
    const supportsDirectRecording = typeof recorder.startRecording === 'function'
        && typeof recorder.stopRecording === 'function';
    if (!supportsDirectRecording) {
        recorder.notifyLifecycleEvent(MATCH_LIFECYCLE_EVENT_TYPES.RECORDING_REQUESTED, { command: 'toggle' });
        return true;
    }
    const wasRecording = !!recorder.isRecording?.();
    const isCinematicRecording = wasRecording
        && recorder.getRecordingCaptureSettings?.()?.profile === RECORDING_CAPTURE_PROFILE.CINEMATIC_MP4;
    if (isCinematicRecording) {
        showStatusToast('Cinematic-Aufnahme: wird gespeichert...', 1200, 'info');
        recorder.stopRecording({ type: 'cinematic_manual_stop' }).then((result) => {
            if (result?.stopped) {
                const sizeMB = ((result.sizeBytes || 0) / (1024 * 1024)).toFixed(1);
                const ext = (result.mimeType || '').includes('mp4') ? 'MP4' : 'WebM';
                showStatusToast(`Cinematic ${ext} gespeichert (${sizeMB} MB)`, 2500, 'success');
            } else {
                showStatusToast('Cinematic-Aufnahme: Speichern fehlgeschlagen', 2000, 'error');
            }
        }).catch(() => showStatusToast('Cinematic-Aufnahme: Fehler beim Stoppen', 2000, 'error'));
        return true;
    }
    if (wasRecording) {
        recorder.stopRecording({ type: 'cinematic_switch_stop' }).catch(() => {}).then(() => {
            startCinematicRecording({ game, getRuntimeHandle, showStatusToast, recorder });
        });
        return true;
    }
    startCinematicRecording({ game, getRuntimeHandle, showStatusToast, recorder });
    return true;
}

export function finalizeRoundRecording(game, winner, players, options = undefined) {
    return getRoundRecorder(game)?.finalizeRound?.(winner, players, options);
}

export function dumpRoundRecording(game) {
    return getRoundRecorder(game)?.dump?.();
}

export function getLastRoundRecordingMetrics(game) {
    return getRoundRecorder(game)?.getLastRoundMetrics?.() || null;
}

export function getAggregateRecordingMetrics(game) {
    return getRoundRecorder(game)?.getAggregateMetrics?.() || null;
}

export function getLastRoundGhostClip(game, players, options = undefined) {
    return getRoundRecorder(game)?.getLastRoundGhostClip?.(players, options) || null;
}
