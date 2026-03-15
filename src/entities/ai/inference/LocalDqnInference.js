// ============================================
// LocalDqnInference.js - browser-side DQN forward pass (no WebSocket needed)
// ============================================
//
// Loads a DQN checkpoint and runs inference locally in the game loop.
// Network: 2-layer MLP with ReLU activation (input → hidden → output).
// Eliminates the ~80ms WebSocket round-trip latency.
// ============================================

function toFinite(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function argMax(values) {
    if (!values || values.length === 0) return 0;
    let bestIndex = 0;
    let bestValue = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] > bestValue) {
            bestValue = values[i];
            bestIndex = i;
        }
    }
    return bestIndex;
}

export class LocalDqnInference {
    constructor() {
        this._loaded = false;
        this._inputSize = 0;
        this._hiddenSize = 0;
        this._outputSize = 0;
        this._weightsInputHidden = null;
        this._biasHidden = null;
        this._weightsHiddenOutput = null;
        this._biasOutput = null;
        this._checkpointMeta = null;
    }

    get loaded() {
        return this._loaded;
    }

    get inputSize() {
        return this._inputSize;
    }

    get outputSize() {
        return this._outputSize;
    }

    get checkpointMeta() {
        return this._checkpointMeta;
    }

    loadCheckpoint(checkpoint) {
        if (!checkpoint || typeof checkpoint !== 'object') {
            return { ok: false, error: 'checkpoint-missing' };
        }
        if (checkpoint.contractVersion !== 'v34-dqn-checkpoint-v1') {
            return { ok: false, error: 'contract-version-mismatch' };
        }
        const networkState = checkpoint.online;
        if (!networkState || typeof networkState !== 'object') {
            return { ok: false, error: 'online-network-missing' };
        }
        const inputSize = Number(networkState.inputSize) || 0;
        const hiddenSize = Number(networkState.hiddenSize) || 0;
        const outputSize = Number(networkState.outputSize) || 0;
        if (inputSize < 1 || hiddenSize < 1 || outputSize < 1) {
            return { ok: false, error: 'invalid-network-dimensions' };
        }
        if (!Array.isArray(networkState.weightsInputHidden)
            || networkState.weightsInputHidden.length !== inputSize * hiddenSize) {
            return { ok: false, error: 'weightsInputHidden-shape-mismatch' };
        }
        if (!Array.isArray(networkState.biasHidden)
            || networkState.biasHidden.length !== hiddenSize) {
            return { ok: false, error: 'biasHidden-shape-mismatch' };
        }
        if (!Array.isArray(networkState.weightsHiddenOutput)
            || networkState.weightsHiddenOutput.length !== hiddenSize * outputSize) {
            return { ok: false, error: 'weightsHiddenOutput-shape-mismatch' };
        }
        if (!Array.isArray(networkState.biasOutput)
            || networkState.biasOutput.length !== outputSize) {
            return { ok: false, error: 'biasOutput-shape-mismatch' };
        }

        this._inputSize = inputSize;
        this._hiddenSize = hiddenSize;
        this._outputSize = outputSize;
        this._weightsInputHidden = new Float64Array(networkState.weightsInputHidden.map(v => toFinite(v)));
        this._biasHidden = new Float64Array(networkState.biasHidden.map(v => toFinite(v)));
        this._weightsHiddenOutput = new Float64Array(networkState.weightsHiddenOutput.map(v => toFinite(v)));
        this._biasOutput = new Float64Array(networkState.biasOutput.map(v => toFinite(v)));
        this._checkpointMeta = {
            envSteps: Number(checkpoint.envSteps) || 0,
            optimizerSteps: Number(checkpoint.optimizerSteps) || 0,
            maxItemIndex: Number(checkpoint.maxItemIndex) || 0,
            planarMode: checkpoint.planarMode === true,
            actionCount: Number(checkpoint.actionCount) || outputSize,
        };
        this._loaded = true;
        return { ok: true, error: null };
    }

    predict(observation) {
        if (!this._loaded) return null;
        const input = Array.isArray(observation) ? observation : [];
        const hiddenSize = this._hiddenSize;
        const inputSize = this._inputSize;
        const outputSize = this._outputSize;

        // Hidden layer: z = W_ih * x + b_h, a = ReLU(z)
        const aHidden = new Float64Array(hiddenSize);
        for (let h = 0; h < hiddenSize; h++) {
            let sum = this._biasHidden[h];
            for (let i = 0; i < inputSize; i++) {
                sum += toFinite(input[i]) * this._weightsInputHidden[i * hiddenSize + h];
            }
            aHidden[h] = sum > 0 ? sum : 0; // ReLU
        }

        // Output layer: o = W_ho * a + b_o
        const output = new Float64Array(outputSize);
        for (let o = 0; o < outputSize; o++) {
            let sum = this._biasOutput[o];
            for (let h = 0; h < hiddenSize; h++) {
                sum += aHidden[h] * this._weightsHiddenOutput[h * outputSize + o];
            }
            output[o] = sum;
        }

        return Array.from(output);
    }

    selectBestAction(observation) {
        const qValues = this.predict(observation);
        if (!qValues) return { actionIndex: 0, qValue: 0 };
        const actionIndex = argMax(qValues);
        return {
            actionIndex,
            qValue: toFinite(qValues[actionIndex]),
        };
    }
}
