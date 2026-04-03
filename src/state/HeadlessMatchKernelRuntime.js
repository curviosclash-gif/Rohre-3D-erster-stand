import {
    createHeadlessMatchKernelRunProfile,
    createMatchKernelTickEnvelope,
} from '../shared/contracts/MatchKernelRuntimeContract.js';
import {
    createHeadlessInputAdapter,
    createHeadlessMatchKernel,
} from './MatchKernel.js';
import {
    createMatchSession,
    disposeMatchSessionSystems,
} from './MatchSessionFactory.js';

export const MATCH_KERNEL_HEADLESS_RUNTIME_CONTRACT_VERSION = 'match-kernel-headless-runtime.v1';

class HeadlessMatchRenderer {
    constructor() {
        this.cameras = [];
        this.cameraModes = [];
        this._sceneObjects = new Set();
    }

    addToScene(object) {
        if (object) {
            this._sceneObjects.add(object);
        }
        return object || null;
    }

    removeFromScene(object) {
        if (object) {
            this._sceneObjects.delete(object);
        }
        return object || null;
    }

    clearMatchScene() {
        this._sceneObjects.clear();
        this.cameras.length = 0;
        this.cameraModes.length = 0;
    }

    createCamera(index = 0) {
        const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
        const camera = { index: safeIndex };
        this.cameras[safeIndex] = camera;
        if (!Number.isFinite(Number(this.cameraModes[safeIndex]))) {
            this.cameraModes[safeIndex] = 0;
        }
        return camera;
    }

    cycleCamera(index = 0) {
        const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
        const nextMode = ((Number(this.cameraModes[safeIndex]) || 0) + 1) % 2;
        this.cameraModes[safeIndex] = nextMode;
        return nextMode;
    }

    getCameraMode(index = 0) {
        const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
        return Number(this.cameraModes[safeIndex]) || 0;
    }

    updateCamera() {
        return null;
    }

    triggerCameraShake() {
        return null;
    }

    render() {
        return null;
    }

    dispose() {
        this.clearMatchScene();
    }
}

function isPromiseLike(value) {
    return !!value && typeof value.then === 'function';
}

function resolveHeadlessSimPorts(session = null) {
    return {
        entityManager: session?.entityManager || null,
        powerupManager: session?.powerupManager || null,
        particles: session?.particles || null,
        arena: session?.arena || null,
    };
}

function createHeadlessRuntimeHandle(session, renderer, kernel) {
    return {
        contractVersion: MATCH_KERNEL_HEADLESS_RUNTIME_CONTRACT_VERSION,
        renderer,
        session,
        kernel,
        step(inputFrame = null, tickOptions = {}) {
            const tickEnvelope = createMatchKernelTickEnvelope({
                ...(tickOptions && typeof tickOptions === 'object' ? tickOptions : {}),
                tickIndex: kernel.tickIndex,
                fixedStepSeconds: tickOptions?.fixedStepSeconds,
                frameId: tickOptions?.frameId,
                wallClockMs: tickOptions?.wallClockMs,
                highResTimestampMs: tickOptions?.highResTimestampMs,
            });
            return kernel.tick(tickEnvelope, createHeadlessInputAdapter(inputFrame || { players: [] }));
        },
        updateSimPorts(nextSession = session) {
            kernel.updateSimPorts(resolveHeadlessSimPorts(nextSession));
        },
        signalRoundEnd(options = {}) {
            kernel.signalRoundEnd(options);
            return kernel.lifecycle;
        },
        signalMatchEnd() {
            kernel.signalMatchEnd();
            return kernel.lifecycle;
        },
        restartRound() {
            const entityManager = session?.entityManager || null;
            const powerupManager = session?.powerupManager || null;
            for (const player of entityManager?.players || []) {
                player?.trail?.clear?.();
            }
            powerupManager?.clear?.();
            entityManager?.spawnAll?.();
            kernel.signalRoundRestart();
            return true;
        },
        dispose(options = {}) {
            try {
                disposeMatchSessionSystems(renderer, session, {
                    clearScene: options?.clearScene !== false,
                });
            } finally {
                kernel.dispose();
                renderer?.dispose?.();
            }
            return true;
        },
    };
}

export function createHeadlessMatchRenderer() {
    return new HeadlessMatchRenderer();
}

export function createHeadlessMatchKernelRuntime({
    renderer = createHeadlessMatchRenderer(),
    audio = null,
    recorder = null,
    runtimeProfiler = null,
    settings,
    runtimeConfig = null,
    baseConfig = null,
    requestedMapKey,
    currentSession = null,
    profile = null,
    roundIndex = 0,
} = {}) {
    const session = createMatchSession({
        renderer,
        audio,
        recorder,
        runtimeProfiler,
        settings,
        runtimeConfig,
        baseConfig,
        requestedMapKey,
        currentSession,
    });

    const finalizeRuntime = (resolvedSession) => {
        const kernel = createHeadlessMatchKernel({
            profile: createHeadlessMatchKernelRunProfile({
                ...(profile && typeof profile === 'object' ? profile : {}),
                matchId: resolvedSession?.effectiveMapKey || requestedMapKey || null,
                modeId: resolvedSession?.entityManager?.activeGameMode || null,
            }),
            simPorts: resolveHeadlessSimPorts(resolvedSession),
        });
        kernel.boot({ roundIndex });
        return createHeadlessRuntimeHandle(resolvedSession, renderer, kernel);
    };

    if (isPromiseLike(session)) {
        return Promise.resolve(session).then(finalizeRuntime).catch((error) => {
            renderer?.dispose?.();
            throw error;
        });
    }

    return finalizeRuntime(session);
}
