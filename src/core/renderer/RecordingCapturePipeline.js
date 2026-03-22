import * as THREE from 'three';
import { CONFIG } from '../Config.js';
import { CameraRigSystem } from './CameraRigSystem.js';
import { RecordingOrbitCameraDirector, SLOT_STYLE } from './camera/RecordingOrbitCameraDirector.js';
import {
    createDefaultRecordingCaptureSettings,
    normalizeRecordingCaptureSettings,
    RECORDING_CAPTURE_PROFILE,
    RECORDING_HUD_MODE,
} from '../../shared/contracts/RecordingCaptureContract.js';

const SHORTS_OUTPUT_ASPECT = Object.freeze({
    width: 9,
    height: 16,
});

function toPositiveEven(value, fallback) {
    const numeric = Number(value);
    const safe = Number.isFinite(numeric) && numeric >= 2 ? Math.floor(numeric) : fallback;
    return Math.max(2, safe - (safe % 2));
}

function toRatio(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function createCanvasClone(sourceCanvas, width, height) {
    let canvasClone = null;
    if (sourceCanvas && typeof sourceCanvas.cloneNode === 'function') {
        canvasClone = sourceCanvas.cloneNode(false);
    } else if (typeof OffscreenCanvas === 'function') {
        canvasClone = new OffscreenCanvas(Math.max(2, Math.floor(width)), Math.max(2, Math.floor(height)));
    }
    if (!canvasClone) return null;
    canvasClone.width = Math.max(2, Math.floor(width));
    canvasClone.height = Math.max(2, Math.floor(height));
    return canvasClone;
}

export class RecordingCapturePipeline {
    constructor({
        sourceCanvas,
        sourceRenderer,
        scene,
    }) {
        this.sourceCanvas = sourceCanvas || null;
        this.sourceRenderer = sourceRenderer || null;
        this.scene = scene || null;

        this._active = false;
        this._settings = createDefaultRecordingCaptureSettings();
        this._captureCanvas = null;
        this._captureCtx = null;
        this._shortsCanvas = null;
        this._shortsRenderer = null;
        this._shortsCameraRig = new CameraRigSystem({ cinematicEnabled: true });
        this._orbitDirector = new RecordingOrbitCameraDirector();
        this._tmpPosition = new THREE.Vector3();
        this._tmpQuaternion = new THREE.Quaternion();
        this._tmpDirection = new THREE.Vector3();
        this._tmpColor = new THREE.Color();
        this._lastMeta = null;
    }

    setActive(active) {
        const next = !!active;
        if (next === this._active) return;
        this._active = next;
        this._orbitDirector.reset();
        this._shortsCameraRig.resetCameras();
    }

    setSettings(settings = null) {
        this._settings = normalizeRecordingCaptureSettings(settings, this._settings);
        return { ...this._settings };
    }

    getSettings() {
        return { ...this._settings };
    }

    getLastMeta() {
        if (!this._lastMeta) return null;
        return JSON.parse(JSON.stringify(this._lastMeta));
    }

    _resolveRecordingPlayers(entityManager) {
        const players = Array.isArray(entityManager?.players)
            ? entityManager.players.filter((player) => player && player.isBot !== true)
            : [];
        players.sort((left, right) => (left.index || 0) - (right.index || 0));
        return players;
    }

    _ensureCaptureCanvas(width, height) {
        const safeWidth = toPositiveEven(width, 2);
        const safeHeight = toPositiveEven(height, 2);
        if (!this._captureCanvas) {
            this._captureCanvas = createCanvasClone(this.sourceCanvas, safeWidth, safeHeight);
            this._captureCtx = this._captureCanvas?.getContext?.('2d', { alpha: false }) || null;
        }
        if (!this._captureCanvas || !this._captureCtx) {
            return null;
        }
        if (this._captureCanvas.width !== safeWidth || this._captureCanvas.height !== safeHeight) {
            this._captureCanvas.width = safeWidth;
            this._captureCanvas.height = safeHeight;
        }
        return this._captureCanvas;
    }

    _ensureShortsRenderer(width, height) {
        const safeWidth = toPositiveEven(width, 2);
        const safeHeight = toPositiveEven(height, 2);
        if (!this._shortsCanvas) {
            this._shortsCanvas = createCanvasClone(this.sourceCanvas, safeWidth, safeHeight);
        }
        if (!this._shortsCanvas) return null;

        if (!this._shortsRenderer) {
            this._shortsRenderer = new THREE.WebGLRenderer({
                canvas: this._shortsCanvas,
                antialias: false,
                alpha: false,
                // Required for reliable WebGL -> 2D canvas capture on some runtimes.
                // Without preserving the buffer, drawImage() may intermittently read black frames.
                preserveDrawingBuffer: true,
            });
            this._shortsRenderer.setPixelRatio(1);
            this._shortsRenderer.shadowMap.enabled = true;
            this._shortsRenderer.shadowMap.type = THREE.BasicShadowMap;
            this._shortsRenderer.toneMapping = THREE.ACESFilmicToneMapping;
            this._shortsRenderer.toneMappingExposure = this.sourceRenderer?.toneMappingExposure || 1.2;
            this._shortsRenderer.setClearColor(CONFIG.COLORS.BACKGROUND);
        }

        this._shortsRenderer.shadowMap.enabled = this.sourceRenderer?.shadowMap?.enabled === true;
        this._shortsRenderer.shadowMap.type = this.sourceRenderer?.shadowMap?.type || THREE.BasicShadowMap;
        this._shortsRenderer.toneMapping = this.sourceRenderer?.toneMapping ?? THREE.ACESFilmicToneMapping;
        this._shortsRenderer.toneMappingExposure = this.sourceRenderer?.toneMappingExposure || 1.2;
        this._shortsRenderer.setClearColor(CONFIG.COLORS.BACKGROUND);
        this._shortsRenderer.setSize(safeWidth, safeHeight, false);
        return this._shortsRenderer;
    }

    _resolveShortsCaptureSize() {
        const baseHeight = toPositiveEven(this.sourceCanvas?.height, 2);
        const targetHeight = toPositiveEven(baseHeight * 2, 4);
        const targetWidth = toPositiveEven(
            (targetHeight * SHORTS_OUTPUT_ASPECT.width) / SHORTS_OUTPUT_ASPECT.height,
            2
        );
        return { width: targetWidth, height: targetHeight };
    }

    _ensureShortsCameraCount(count, aspect) {
        const safeCount = Math.max(1, Math.trunc(count));
        const safeAspect = toRatio(aspect, 1);
        while (this._shortsCameraRig.cameras.length < safeCount) {
            this._shortsCameraRig.createCamera(safeAspect);
        }
        for (let i = 0; i < safeCount; i += 1) {
            const camera = this._shortsCameraRig.cameras[i];
            if (!camera) continue;
            camera.aspect = safeAspect;
            camera.updateProjectionMatrix();
            this._shortsCameraRig.cameraModes[i] = 0;
        }
        this._shortsCameraRig.setCinematicEnabled(true);
    }

    _updateShortsCamera({ slotIndex, player, otherPlayer, renderAlpha, renderDelta, arena }) {
        if (!player) return false;
        this._shortsCameraRig.cameraModes[slotIndex] = 0;
        player.resolveRenderTransform(renderAlpha, this._tmpPosition, this._tmpQuaternion);
        this._tmpDirection.set(0, 0, -1).applyQuaternion(this._tmpQuaternion);
        this._shortsCameraRig.updateCamera(
            slotIndex,
            this._tmpPosition,
            this._tmpDirection,
            renderDelta,
            this._tmpQuaternion,
            false,
            player.isBoosting === true,
            arena,
            null
        );

        // Resolve other player's position for duel-focus detection.
        let otherPos = null;
        if (otherPlayer && typeof otherPlayer.resolveRenderTransform === 'function') {
            const tmpOther = this._tmpOtherPosition || (this._tmpOtherPosition = new THREE.Vector3());
            const tmpOtherQ = this._tmpOtherQuaternion || (this._tmpOtherQuaternion = new THREE.Quaternion());
            otherPlayer.resolveRenderTransform(renderAlpha, tmpOther, tmpOtherQ);
            otherPos = tmpOther;
        }

        const camera = this._shortsCameraRig.cameras[slotIndex];
        const baseFov = camera ? camera.fov : CONFIG.CAMERA.FOV;
        this._orbitDirector.apply({
            playerIndex: slotIndex,
            camera,
            fallbackTarget: this._shortsCameraRig.cameraTargets[slotIndex],
            playerPosition: this._tmpPosition,
            playerDirection: this._tmpDirection,
            dt: renderDelta,
            arena,
            slotStyle: slotIndex === 0 ? SLOT_STYLE.CINEMATIC : SLOT_STYLE.ACTION,
            playerState: {
                hp: Number(player.hp) || 0,
                maxHp: Number(player.maxHp) || 1,
                score: Number(player.score) || 0,
                speed: Number(player.speed) || 0,
                isBoosting: player.isBoosting === true,
            },
            otherPlayerPosition: otherPos,
            baseFov,
        });
        return true;
    }

    _drawHudSegment(ctx, segment, player, labelText = '') {
        if (!ctx || !segment || !player) return;
        const x = Math.floor(segment.x);
        const y = Math.floor(segment.y);
        const width = Math.floor(segment.width);
        const height = Math.floor(segment.height);
        const padding = Math.max(8, Math.floor(height * 0.035));
        const panelWidth = Math.min(Math.floor(width * 0.42), 270);
        const panelHeight = Math.min(Math.floor(height * 0.34), 170);

        ctx.save();
        ctx.fillStyle = 'rgba(5, 9, 18, 0.58)';
        ctx.fillRect(x + padding, y + padding, panelWidth, panelHeight);
        ctx.strokeStyle = 'rgba(111, 208, 255, 0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + padding, y + padding, panelWidth, panelHeight);

        const titleColor = this._tmpColor.setHex(Number(player?.color) || 0xffffff).getStyle();
        ctx.fillStyle = titleColor;
        ctx.font = `${Math.max(14, Math.floor(height * 0.054))}px "Segoe UI", sans-serif`;
        ctx.fillText(
            labelText || `P${(Number(player?.index) || 0) + 1}`,
            x + padding + 10,
            y + padding + Math.max(20, Math.floor(height * 0.09))
        );

        ctx.fillStyle = '#e8f5ff';
        ctx.font = `${Math.max(12, Math.floor(height * 0.04))}px "Segoe UI", sans-serif`;
        const speedValue = Math.max(0, Math.round(Number(player?.speed) || 0));
        const scoreValue = Math.max(0, Math.round(Number(player?.score) || 0));
        ctx.fillText(`SPD ${speedValue}`, x + padding + 10, y + padding + 56);
        ctx.fillText(`SCORE ${scoreValue}`, x + padding + 10, y + padding + 80);

        const hpCurrent = Math.max(0, Number(player?.hp) || 0);
        const hpMax = Math.max(0.01, Number(player?.maxHp) || 1);
        const hpRatio = Math.max(0, Math.min(1, hpCurrent / hpMax));
        const boostCurrent = Math.max(0, Number(player?.boostCharge) || Number(player?.boostTimer) || 0);
        const boostMax = Math.max(0.01, Number(CONFIG?.PLAYER?.BOOST_DURATION) || 1);
        const boostRatio = Math.max(0, Math.min(1, boostCurrent / boostMax));

        const barWidth = panelWidth - 20;
        const hpBarY = y + padding + panelHeight - 52;
        const boostBarY = y + padding + panelHeight - 24;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(x + padding + 10, hpBarY, barWidth, 12);
        ctx.fillRect(x + padding + 10, boostBarY, barWidth, 12);
        ctx.fillStyle = '#5ef58c';
        ctx.fillRect(x + padding + 10, hpBarY, Math.floor(barWidth * hpRatio), 12);
        ctx.fillStyle = '#6ec6ff';
        ctx.fillRect(x + padding + 10, boostBarY, Math.floor(barWidth * boostRatio), 12);
        ctx.fillStyle = '#e8f5ff';
        ctx.font = `${Math.max(10, Math.floor(height * 0.032))}px "Segoe UI", sans-serif`;
        ctx.fillText('HP', x + padding + 10, hpBarY - 4);
        ctx.fillText('BOOST', x + padding + 10, boostBarY - 4);
        ctx.restore();
    }

    _drawLetterboxOverlay({ ctx, width, height, segments }) {
        if (!ctx || !Array.isArray(segments)) return;
        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i];
            if (!segment) continue;
            const progress = this._orbitDirector.getLetterboxProgress(segment.slotIndex ?? i);
            if (progress <= 0.001) continue;

            const barHeight = Math.floor(segment.height * 0.07 * progress);
            if (barHeight <= 0) continue;
            const sx = Math.floor(segment.x);
            const sy = Math.floor(segment.y);
            const sw = Math.floor(segment.width);
            const sh = Math.floor(segment.height);

            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${(0.85 * progress).toFixed(3)})`;
            ctx.fillRect(sx, sy, sw, barHeight);
            ctx.fillRect(sx, sy + sh - barHeight, sw, barHeight);
            ctx.restore();
        }
    }

    _drawHudOverlay({ ctx, width, height, segments }) {
        if (!ctx || !Array.isArray(segments) || segments.length === 0) return;
        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i];
            this._drawHudSegment(ctx, segment, segment?.player, segment?.label);
        }
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, Math.max(0, width - 2), Math.max(0, height - 2));
        ctx.restore();
    }

    _storeMeta(baseMeta, segments) {
        this._lastMeta = {
            ...baseMeta,
            segments: (segments || []).map((segment) => ({
                label: segment.label,
                playerIndex: Number(segment?.player?.index ?? segment?.playerIndex ?? -1),
                x: Math.floor(segment.x),
                y: Math.floor(segment.y),
                width: Math.floor(segment.width),
                height: Math.floor(segment.height),
            })),
        };
    }

    _prepareStandardSurface({ entityManager, splitScreen }) {
        const targetCanvas = this._ensureCaptureCanvas(this.sourceCanvas?.width, this.sourceCanvas?.height);
        const ctx = this._captureCtx;
        if (!targetCanvas || !ctx || !this.sourceCanvas) return;

        const width = targetCanvas.width;
        const height = targetCanvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.sourceCanvas, 0, 0, width, height);

        const players = this._resolveRecordingPlayers(entityManager);
        if (players.length === 0) {
            this._storeMeta({
                profile: RECORDING_CAPTURE_PROFILE.STANDARD,
                hudMode: this._settings.hudMode,
                overlay: this._settings.hudMode === RECORDING_HUD_MODE.WITH_HUD ? 'hud' : 'clean',
                layout: 'single',
                width,
                height,
            }, []);
            return;
        }

        const player1 = players.find((entry) => entry.index === 0) || players[0];
        const player2 = players.find((entry) => entry.index === 1) || players[1] || null;
        const segments = [];
        if (splitScreen && player2) {
            const halfWidth = Math.floor(width * 0.5);
            segments.push({ x: 0, y: 0, width: halfWidth, height, player: player1, label: 'P1' });
            segments.push({ x: halfWidth, y: 0, width: width - halfWidth, height, player: player2, label: 'P2' });
        } else {
            segments.push({ x: 0, y: 0, width, height, player: player1, label: 'P1' });
        }

        if (this._settings.hudMode === RECORDING_HUD_MODE.WITH_HUD) {
            this._drawHudOverlay({ ctx, width, height, segments });
        }

        this._storeMeta({
            profile: RECORDING_CAPTURE_PROFILE.STANDARD,
            hudMode: this._settings.hudMode,
            overlay: this._settings.hudMode === RECORDING_HUD_MODE.WITH_HUD ? 'hud' : 'clean',
            layout: splitScreen && player2 ? 'split_horizontal' : 'single',
            width,
            height,
        }, segments);
    }

    _renderShortsToCapture({ sizes, topCamera, bottomCamera }) {
        const shortsRenderer = this._ensureShortsRenderer(sizes.width, sizes.height);
        const captureCanvas = this._ensureCaptureCanvas(sizes.width, sizes.height);
        const captureCtx = this._captureCtx;
        if (!shortsRenderer || !captureCanvas || !captureCtx || !this.scene) return false;

        const halfHeight = Math.floor(sizes.height / 2);
        shortsRenderer.setScissorTest(true);
        shortsRenderer.setViewport(0, halfHeight, sizes.width, halfHeight);
        shortsRenderer.setScissor(0, halfHeight, sizes.width, halfHeight);
        shortsRenderer.render(this.scene, topCamera);
        shortsRenderer.setViewport(0, 0, sizes.width, halfHeight);
        shortsRenderer.setScissor(0, 0, sizes.width, halfHeight);
        shortsRenderer.render(this.scene, bottomCamera);
        shortsRenderer.setScissorTest(false);
        shortsRenderer.getContext()?.flush?.();

        captureCtx.clearRect(0, 0, sizes.width, sizes.height);
        captureCtx.drawImage(this._shortsCanvas, 0, 0, sizes.width, sizes.height);
        return true;
    }

    _prepareShortsSurface({ entityManager, renderAlpha, renderDelta }) {
        const sizes = this._resolveShortsCaptureSize();
        const halfHeight = Math.floor(sizes.height / 2);
        const viewAspect = toRatio(sizes.width / Math.max(1, halfHeight), 1);
        const players = this._resolveRecordingPlayers(entityManager);

        if (players.length === 0) {
            // No human players — render scene with a static fallback camera
            // so the capture canvas is not left black.
            this._ensureShortsCameraCount(1, viewAspect);
            const fallbackCamera = this._shortsCameraRig.cameras[0];
            if (fallbackCamera) {
                this._renderShortsToCapture({ sizes, topCamera: fallbackCamera, bottomCamera: fallbackCamera });
            }
            this._storeMeta({
                profile: RECORDING_CAPTURE_PROFILE.YOUTUBE_SHORT,
                hudMode: this._settings.hudMode,
                overlay: this._settings.hudMode === RECORDING_HUD_MODE.WITH_HUD ? 'hud' : 'clean',
                layout: 'shorts_vertical_split',
                width: sizes.width,
                height: sizes.height,
            }, []);
            return;
        }

        const player1 = players.find((entry) => entry.index === 0) || players[0];
        const player2 = players.find((entry) => entry.index === 1) || players[1] || player1;
        this._ensureShortsCameraCount(2, viewAspect);
        this._updateShortsCamera({
            slotIndex: 0,
            player: player1,
            otherPlayer: player2 !== player1 ? player2 : null,
            renderAlpha,
            renderDelta,
            arena: entityManager?.arena || null,
        });
        this._updateShortsCamera({
            slotIndex: 1,
            player: player2,
            otherPlayer: player2 !== player1 ? player1 : null,
            renderAlpha,
            renderDelta,
            arena: entityManager?.arena || null,
        });

        const cameras = this._shortsCameraRig.cameras;
        const topCamera = cameras[0] || cameras[1];
        const bottomCamera = cameras[1] || cameras[0];
        if (!topCamera || !bottomCamera) return;

        if (!this._renderShortsToCapture({ sizes, topCamera, bottomCamera })) return;

        const segments = [
            { x: 0, y: 0, width: sizes.width, height: halfHeight, player: player1, label: 'P1 oben', slotIndex: 0 },
            { x: 0, y: halfHeight, width: sizes.width, height: halfHeight, player: player2, label: 'P2 unten', slotIndex: 1 },
        ];
        if (this._settings.hudMode === RECORDING_HUD_MODE.WITH_HUD) {
            this._drawHudOverlay({
                ctx: this._captureCtx,
                width: sizes.width,
                height: sizes.height,
                segments,
            });
        }
        // Letterbox bars are drawn on every shot transition, regardless of HUD mode.
        this._drawLetterboxOverlay({
            ctx: this._captureCtx,
            width: sizes.width,
            height: sizes.height,
            segments,
        });

        this._storeMeta({
            profile: RECORDING_CAPTURE_PROFILE.YOUTUBE_SHORT,
            hudMode: this._settings.hudMode,
            overlay: this._settings.hudMode === RECORDING_HUD_MODE.WITH_HUD ? 'hud' : 'clean',
            layout: 'shorts_vertical_split',
            width: sizes.width,
            height: sizes.height,
        }, [
            { ...segments[0], label: 'top' },
            { ...segments[1], label: 'bottom' },
        ]);
    }

    getCaptureCanvas() {
        if (this._settings.profile === RECORDING_CAPTURE_PROFILE.YOUTUBE_SHORT) {
            const sizes = this._resolveShortsCaptureSize();
            return this._ensureCaptureCanvas(sizes.width, sizes.height) || this.sourceCanvas;
        }
        // Always use a dedicated 2D capture canvas during recording so that
        // content is preserved regardless of the WebGL preserveDrawingBuffer flag.
        return this._ensureCaptureCanvas(this.sourceCanvas?.width, this.sourceCanvas?.height) || this.sourceCanvas;
    }

    prepareFrame({
        recordingActive = false,
        entityManager = null,
        renderAlpha = 1,
        renderDelta = 1 / 60,
        splitScreen = false,
    } = {}) {
        if (!recordingActive) return;
        if (!this._active) {
            this.setActive(true);
        }
        if (this._settings.profile === RECORDING_CAPTURE_PROFILE.YOUTUBE_SHORT) {
            this._prepareShortsSurface({ entityManager, renderAlpha, renderDelta });
            return;
        }
        // Always copy the WebGL source canvas to a preserved 2D capture canvas.
        // Without this, preserveDrawingBuffer:false on the main renderer can
        // cause black frames on some browsers/drivers (notably Windows + ANGLE).
        this._prepareStandardSurface({ entityManager, splitScreen });
    }

    dispose() {
        if (this._shortsRenderer) {
            this._shortsRenderer.dispose();
        }
        this._shortsRenderer = null;
        this._shortsCanvas = null;
        this._captureCanvas = null;
        this._captureCtx = null;
        this._shortsCameraRig.resetCameras();
        this._orbitDirector.reset();
        this._lastMeta = null;
    }
}
