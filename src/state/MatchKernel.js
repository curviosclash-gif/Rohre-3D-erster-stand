// ============================================
// MatchKernel.js - headless-bootable simulation kernel (V84)
// ============================================
//
// Contract (session-kernel-lifecycle.v1):
// - Inputs: MatchKernelRunProfile, simPorts (entityManager, arena, powerupManager, particles)
// - Inputs per tick: MatchKernelTickEnvelope, inputAdapter (getPlayerInput/wasPressed interface)
// - Outputs: MatchKernelTickResult (tickIndex, lifecycle, surface)
// - Invariants:
//   - No DOM, window, document, Three.js or Electron dependencies.
//   - inputAdapter must implement getPlayerInput(playerIndex, options) and wasPressed(key).
//   - In interactive surface: pass game.input directly as inputAdapter.
//   - In headless surface: use createHeadlessInputAdapter(inputFrame) from this module.

import {
    MATCH_KERNEL_SURFACES,
    MATCH_KERNEL_TICK_DRIVERS,
} from '../shared/contracts/MatchKernelRuntimeContract.js';

export const MATCH_KERNEL_LIFECYCLE_CONTRACT_VERSION = 'match-kernel-lifecycle.v1';

const VALID_BOOT_LIFECYCLES = new Set(['idle']);
const VALID_TICK_LIFECYCLES = new Set(['running']);

function resolveSimPorts(ports) {
    if (!ports || typeof ports !== 'object') return {};
    return {
        entityManager: ports.entityManager || null,
        powerupManager: ports.powerupManager || null,
        particles: ports.particles || null,
        arena: ports.arena || null,
    };
}

function normalizeRoundIndex(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
}

/**
 * createHeadlessInputAdapter – wraps a MatchKernelInputFrame for use as an
 * EntityManager-compatible inputAdapter in headless surface runs.
 *
 * @param {import('../shared/contracts/MatchKernelRuntimeContract.js').MatchKernelInputFrame} inputFrame
 */
export function createHeadlessInputAdapter(inputFrame) {
    const players = Array.isArray(inputFrame?.players) ? inputFrame.players : [];
    return {
        getPlayerInput(playerIndex, _options = {}) {
            const player = players[playerIndex];
            if (!player) return null;
            const actions = player.actions && typeof player.actions === 'object'
                ? player.actions
                : {};
            const inputState = { ...actions };
            inputState.wasPressed = (key) => actions[key] === true;
            inputState.isDown = (key) => actions[key] === true;
            return inputState;
        },
        // headless: no global key events
        wasPressed: () => false,
        isDown: () => false,
    };
}

/**
 * MatchKernel – thin headless-bootable simulation orchestrator.
 *
 * Lifecycle: idle -> running -> round_end | match_end -> disposed
 *
 * The kernel drives entityManager, powerupManager, particles and arena through
 * a normalised tick envelope and an inputAdapter. It does NOT reference DOM,
 * window, document, Three.js or any platform-specific object.
 */
export class MatchKernel {
    constructor({ profile = null, simPorts = {} } = {}) {
        this._profile = profile;
        this._simPorts = resolveSimPorts(simPorts);
        this._lifecycle = 'idle';
        this._tickIndex = 0;
        this._roundIndex = 0;
    }

    get lifecycle() { return this._lifecycle; }
    get tickIndex() { return this._tickIndex; }
    get roundIndex() { return this._roundIndex; }
    get profile() { return this._profile; }
    get surface() { return this._profile?.surface ?? MATCH_KERNEL_SURFACES.INTERACTIVE; }

    /**
     * boot – transition from idle to running.
     * @param {{ roundIndex?: number }} options
     */
    boot({ roundIndex = 0 } = {}) {
        if (!VALID_BOOT_LIFECYCLES.has(this._lifecycle)) {
            throw new Error(
                `MatchKernel.boot: invalid lifecycle "${this._lifecycle}"; expected one of [${[...VALID_BOOT_LIFECYCLES].join(', ')}]`
            );
        }
        this._lifecycle = 'running';
        this._tickIndex = 0;
        this._roundIndex = normalizeRoundIndex(roundIndex);
    }

    /**
     * tick – advance the simulation by one fixed step.
     *
     * @param {object} tickEnvelope  createMatchKernelTickEnvelope result
     * @param {object} inputAdapter  game.input (interactive) or createHeadlessInputAdapter result
     * @returns {{ contractVersion, tickIndex, lifecycle, surface, fixedStepSeconds } | null}
     */
    tick(tickEnvelope, inputAdapter) {
        if (!VALID_TICK_LIFECYCLES.has(this._lifecycle)) return null;

        const dt = (tickEnvelope && Number.isFinite(tickEnvelope.fixedStepSeconds))
            ? tickEnvelope.fixedStepSeconds
            : 1 / 60;
        const frameId = (tickEnvelope && Number.isFinite(tickEnvelope.frameId))
            ? tickEnvelope.frameId
            : this._tickIndex;

        const { entityManager, powerupManager, particles, arena } = this._simPorts;

        if (entityManager) entityManager.update(dt, inputAdapter, frameId);
        if (powerupManager) powerupManager.update(dt);
        if (particles) particles.update(dt);
        if (arena) arena.update(dt);

        this._tickIndex++;

        return {
            contractVersion: MATCH_KERNEL_LIFECYCLE_CONTRACT_VERSION,
            tickIndex: this._tickIndex,
            lifecycle: this._lifecycle,
            surface: this.surface,
            fixedStepSeconds: dt,
        };
    }

    /**
     * signalRoundEnd – mark this kernel as having reached round-end state.
     * The caller (PlayingStateSystem / headless runner) is responsible for
     * deciding when to call this based on RoundStateController output.
     */
    signalRoundEnd() {
        if (this._lifecycle === 'running') {
            this._lifecycle = 'round_end';
        }
    }

    /**
     * signalMatchEnd – mark this kernel as having reached match-end state.
     */
    signalMatchEnd() {
        if (this._lifecycle === 'running' || this._lifecycle === 'round_end') {
            this._lifecycle = 'match_end';
        }
    }

    /**
     * signalRoundRestart – transition back to running for the next round.
     * Resets tickIndex; roundIndex increments.
     */
    signalRoundRestart() {
        if (this._lifecycle === 'round_end') {
            this._lifecycle = 'running';
            this._roundIndex++;
            this._tickIndex = 0;
        }
    }

    /**
     * updateSimPorts – replace live simulation port refs (e.g. after a round restart).
     */
    updateSimPorts(simPorts) {
        this._simPorts = resolveSimPorts(simPorts);
    }

    /**
     * dispose – release refs and move to disposed state.
     */
    dispose() {
        this._lifecycle = 'disposed';
        this._simPorts = {};
        this._profile = null;
    }
}

export function createMatchKernel({ profile = null, simPorts = {} } = {}) {
    return new MatchKernel({ profile, simPorts });
}

/**
 * createInteractiveMatchKernel – convenience factory for the interactive surface.
 * Accepts a game or simPorts object for the session.
 */
export function createInteractiveMatchKernel({ profile = null, simPorts = {} } = {}) {
    const interactiveProfile = {
        ...(profile && typeof profile === 'object' ? profile : {}),
        surface: MATCH_KERNEL_SURFACES.INTERACTIVE,
        tickDriver: MATCH_KERNEL_TICK_DRIVERS.RAF,
    };
    return createMatchKernel({ profile: interactiveProfile, simPorts });
}

/**
 * createHeadlessMatchKernel – convenience factory for the headless surface.
 */
export function createHeadlessMatchKernel({ profile = null, simPorts = {} } = {}) {
    const headlessProfile = {
        ...(profile && typeof profile === 'object' ? profile : {}),
        surface: MATCH_KERNEL_SURFACES.HEADLESS,
        tickDriver: MATCH_KERNEL_TICK_DRIVERS.MANUAL,
    };
    return createMatchKernel({ profile: headlessProfile, simPorts });
}
