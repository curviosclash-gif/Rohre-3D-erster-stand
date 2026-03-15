import { SeededRng } from './SeededRng.mjs';

function toFinite(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function clampInt(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const integer = Math.trunc(numeric);
    return Math.max(min, Math.min(max, integer));
}

function clampFloat(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
}

function argMax(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    let bestIndex = 0;
    let bestValue = values[0];
    for (let i = 1; i < values.length; i++) {
        if (values[i] > bestValue) {
            bestIndex = i;
            bestValue = values[i];
        }
    }
    return bestIndex;
}

export class DqnMlpNetwork {
    constructor(options = {}) {
        this.inputSize = clampInt(options.inputSize, 40, 1, 10_000);
        this.hiddenSize = clampInt(options.hiddenSize, 64, 1, 4096);
        this.outputSize = clampInt(options.outputSize, 8, 1, 1024);
        this._rng = options.rng instanceof SeededRng
            ? options.rng
            : new SeededRng(options.seed || 1);

        this.weightsInputHidden = new Float64Array(this.inputSize * this.hiddenSize);
        this.biasHidden = new Float64Array(this.hiddenSize);
        this.weightsHiddenOutput = new Float64Array(this.hiddenSize * this.outputSize);
        this.biasOutput = new Float64Array(this.outputSize);

        this._initializeWeights();
    }

    _initializeWeights() {
        const scaleInput = Math.sqrt(6 / (this.inputSize + this.hiddenSize));
        for (let i = 0; i < this.weightsInputHidden.length; i++) {
            this.weightsInputHidden[i] = this._rng.nextRange(-scaleInput, scaleInput);
        }
        const scaleOutput = Math.sqrt(6 / (this.hiddenSize + this.outputSize));
        for (let i = 0; i < this.weightsHiddenOutput.length; i++) {
            this.weightsHiddenOutput[i] = this._rng.nextRange(-scaleOutput, scaleOutput);
        }
        this.biasHidden.fill(0);
        this.biasOutput.fill(0);
    }

    copyFrom(other) {
        if (!(other instanceof DqnMlpNetwork)) return false;
        if (
            other.inputSize !== this.inputSize
            || other.hiddenSize !== this.hiddenSize
            || other.outputSize !== this.outputSize
        ) {
            return false;
        }
        this.weightsInputHidden.set(other.weightsInputHidden);
        this.biasHidden.set(other.biasHidden);
        this.weightsHiddenOutput.set(other.weightsHiddenOutput);
        this.biasOutput.set(other.biasOutput);
        return true;
    }

    _readInput(input, index) {
        if (Array.isArray(input)) {
            return toFinite(input[index], 0);
        }
        if (input instanceof Float64Array || input instanceof Float32Array) {
            return toFinite(input[index], 0);
        }
        return 0;
    }

    _forwardWithCache(input) {
        const zHidden = new Float64Array(this.hiddenSize);
        const aHidden = new Float64Array(this.hiddenSize);
        const output = new Float64Array(this.outputSize);

        for (let hiddenIndex = 0; hiddenIndex < this.hiddenSize; hiddenIndex++) {
            let sum = this.biasHidden[hiddenIndex];
            for (let inputIndex = 0; inputIndex < this.inputSize; inputIndex++) {
                const weightIndex = inputIndex * this.hiddenSize + hiddenIndex;
                sum += this._readInput(input, inputIndex) * this.weightsInputHidden[weightIndex];
            }
            zHidden[hiddenIndex] = sum;
            aHidden[hiddenIndex] = sum > 0 ? sum : 0;
        }

        for (let outputIndex = 0; outputIndex < this.outputSize; outputIndex++) {
            let sum = this.biasOutput[outputIndex];
            for (let hiddenIndex = 0; hiddenIndex < this.hiddenSize; hiddenIndex++) {
                const weightIndex = hiddenIndex * this.outputSize + outputIndex;
                sum += aHidden[hiddenIndex] * this.weightsHiddenOutput[weightIndex];
            }
            output[outputIndex] = sum;
        }

        return {
            zHidden,
            aHidden,
            output,
        };
    }

    predict(input) {
        const { output } = this._forwardWithCache(input);
        return Array.from(output);
    }

    trainBatch(samples, options = {}) {
        if (!Array.isArray(samples) || samples.length === 0) {
            return {
                meanLoss: null,
                trained: false,
                tdErrors: [],
            };
        }
        const gamma = clampFloat(options.gamma, 0.99, 0, 1);
        const learningRate = clampFloat(options.learningRate, 0.00075, 0.0000001, 1);
        const targetNetwork = options.targetNetwork instanceof DqnMlpNetwork
            ? options.targetNetwork
            : this;

        const gradWInputHidden = new Float64Array(this.weightsInputHidden.length);
        const gradBHidden = new Float64Array(this.biasHidden.length);
        const gradWHiddenOutput = new Float64Array(this.weightsHiddenOutput.length);
        const gradBOutput = new Float64Array(this.biasOutput.length);

        let totalLoss = 0;
        let trainedCount = 0;
        const tdErrors = [];

        for (const sample of samples) {
            if (!sample || typeof sample !== 'object') {
                tdErrors.push(0);
                continue;
            }
            const actionIndex = clampInt(
                sample.actionIndex,
                0,
                0,
                this.outputSize - 1
            );
            const reward = toFinite(sample.reward, 0);
            const done = sample.done === true;
            const isWeight = toFinite(sample._isWeight, 1);

            const online = this._forwardWithCache(sample.state);
            const currentQ = online.output[actionIndex];
            const targetQValues = targetNetwork.predict(sample.nextState);
            const nextBestQ = targetQValues[argMax(targetQValues)];
            const target = reward + (done ? 0 : gamma * nextBestQ);
            const delta = currentQ - target;
            const weightedDelta = delta * isWeight;
            totalLoss += 0.5 * delta * delta * isWeight;
            trainedCount += 1;
            tdErrors.push(delta);

            gradBOutput[actionIndex] += weightedDelta;
            for (let hiddenIndex = 0; hiddenIndex < this.hiddenSize; hiddenIndex++) {
                const outputWeightIndex = hiddenIndex * this.outputSize + actionIndex;
                gradWHiddenOutput[outputWeightIndex] += online.aHidden[hiddenIndex] * weightedDelta;

                const gradHiddenPreActivation = this.weightsHiddenOutput[outputWeightIndex] * weightedDelta;
                if (online.zHidden[hiddenIndex] <= 0) {
                    continue;
                }
                gradBHidden[hiddenIndex] += gradHiddenPreActivation;
                for (let inputIndex = 0; inputIndex < this.inputSize; inputIndex++) {
                    const inputWeightIndex = inputIndex * this.hiddenSize + hiddenIndex;
                    const inputValue = this._readInput(sample.state, inputIndex);
                    gradWInputHidden[inputWeightIndex] += inputValue * gradHiddenPreActivation;
                }
            }
        }

        if (trainedCount === 0) {
            return {
                meanLoss: null,
                trained: false,
                tdErrors,
            };
        }

        const normalizedLr = learningRate / trainedCount;
        for (let i = 0; i < this.weightsInputHidden.length; i++) {
            this.weightsInputHidden[i] -= normalizedLr * gradWInputHidden[i];
        }
        for (let i = 0; i < this.biasHidden.length; i++) {
            this.biasHidden[i] -= normalizedLr * gradBHidden[i];
        }
        for (let i = 0; i < this.weightsHiddenOutput.length; i++) {
            this.weightsHiddenOutput[i] -= normalizedLr * gradWHiddenOutput[i];
        }
        for (let i = 0; i < this.biasOutput.length; i++) {
            this.biasOutput[i] -= normalizedLr * gradBOutput[i];
        }

        return {
            meanLoss: totalLoss / trainedCount,
            trained: true,
            tdErrors,
        };
    }

    exportState() {
        return {
            inputSize: this.inputSize,
            hiddenSize: this.hiddenSize,
            outputSize: this.outputSize,
            weightsInputHidden: Array.from(this.weightsInputHidden),
            biasHidden: Array.from(this.biasHidden),
            weightsHiddenOutput: Array.from(this.weightsHiddenOutput),
            biasOutput: Array.from(this.biasOutput),
        };
    }

    importState(state) {
        if (!state || typeof state !== 'object') return false;
        if (
            clampInt(state.inputSize, 0, 0, Number.MAX_SAFE_INTEGER) !== this.inputSize
            || clampInt(state.hiddenSize, 0, 0, Number.MAX_SAFE_INTEGER) !== this.hiddenSize
            || clampInt(state.outputSize, 0, 0, Number.MAX_SAFE_INTEGER) !== this.outputSize
        ) {
            return false;
        }
        if (!Array.isArray(state.weightsInputHidden) || state.weightsInputHidden.length !== this.weightsInputHidden.length) {
            return false;
        }
        if (!Array.isArray(state.biasHidden) || state.biasHidden.length !== this.biasHidden.length) {
            return false;
        }
        if (!Array.isArray(state.weightsHiddenOutput) || state.weightsHiddenOutput.length !== this.weightsHiddenOutput.length) {
            return false;
        }
        if (!Array.isArray(state.biasOutput) || state.biasOutput.length !== this.biasOutput.length) {
            return false;
        }
        for (let i = 0; i < this.weightsInputHidden.length; i++) {
            this.weightsInputHidden[i] = toFinite(state.weightsInputHidden[i], 0);
        }
        for (let i = 0; i < this.biasHidden.length; i++) {
            this.biasHidden[i] = toFinite(state.biasHidden[i], 0);
        }
        for (let i = 0; i < this.weightsHiddenOutput.length; i++) {
            this.weightsHiddenOutput[i] = toFinite(state.weightsHiddenOutput[i], 0);
        }
        for (let i = 0; i < this.biasOutput.length; i++) {
            this.biasOutput[i] = toFinite(state.biasOutput[i], 0);
        }
        return true;
    }
}
