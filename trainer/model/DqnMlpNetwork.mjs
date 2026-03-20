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

function resolveHiddenLayers(options) {
    if (Array.isArray(options.hiddenLayers) && options.hiddenLayers.length > 0) {
        return options.hiddenLayers.map(size => clampInt(size, 64, 1, 4096));
    }
    const single = clampInt(options.hiddenSize, 64, 1, 4096);
    return [single];
}

export class DqnMlpNetwork {
    constructor(options = {}) {
        this.inputSize = clampInt(options.inputSize, 40, 1, 10_000);
        this.outputSize = clampInt(options.outputSize, 8, 1, 1024);
        this.hiddenLayers = resolveHiddenLayers(options);
        this._rng = options.rng instanceof SeededRng
            ? options.rng
            : new SeededRng(options.seed || 1);

        // Legacy accessor: first hidden layer size
        this.hiddenSize = this.hiddenLayers[0];

        // Build layer descriptors: [input→h0, h0→h1, ..., hN→output]
        const sizes = [this.inputSize, ...this.hiddenLayers, this.outputSize];
        this.layers = [];
        for (let l = 0; l < sizes.length - 1; l++) {
            const inSize = sizes[l];
            const outSize = sizes[l + 1];
            this.layers.push({
                inputSize: inSize,
                outputSize: outSize,
                weights: new Float64Array(inSize * outSize),
                bias: new Float64Array(outSize),
            });
        }

        // Legacy accessors for v34 compatibility (2-layer networks only)
        this.weightsInputHidden = this.layers[0].weights;
        this.biasHidden = this.layers[0].bias;
        if (this.layers.length === 2) {
            this.weightsHiddenOutput = this.layers[1].weights;
            this.biasOutput = this.layers[1].bias;
        } else {
            // For multi-layer: point to last layer for basic compatibility
            this.weightsHiddenOutput = this.layers[this.layers.length - 1].weights;
            this.biasOutput = this.layers[this.layers.length - 1].bias;
        }

        this._initializeWeights();
    }

    _initializeWeights() {
        for (let l = 0; l < this.layers.length; l++) {
            const layer = this.layers[l];
            const scale = Math.sqrt(6 / (layer.inputSize + layer.outputSize));
            for (let i = 0; i < layer.weights.length; i++) {
                layer.weights[i] = this._rng.nextRange(-scale, scale);
            }
            layer.bias.fill(0);
        }
    }

    copyFrom(other) {
        if (!(other instanceof DqnMlpNetwork)) return false;
        if (other.layers.length !== this.layers.length) return false;
        for (let l = 0; l < this.layers.length; l++) {
            if (other.layers[l].inputSize !== this.layers[l].inputSize
                || other.layers[l].outputSize !== this.layers[l].outputSize) {
                return false;
            }
        }
        for (let l = 0; l < this.layers.length; l++) {
            this.layers[l].weights.set(other.layers[l].weights);
            this.layers[l].bias.set(other.layers[l].bias);
        }
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
        const numLayers = this.layers.length;
        const zPerLayer = new Array(numLayers);
        const aPerLayer = new Array(numLayers);

        // First layer reads from input
        const firstLayer = this.layers[0];
        const z0 = new Float64Array(firstLayer.outputSize);
        const a0 = new Float64Array(firstLayer.outputSize);
        for (let j = 0; j < firstLayer.outputSize; j++) {
            let sum = firstLayer.bias[j];
            for (let i = 0; i < firstLayer.inputSize; i++) {
                sum += this._readInput(input, i) * firstLayer.weights[i * firstLayer.outputSize + j];
            }
            z0[j] = sum;
            // ReLU for all hidden layers (not output)
            a0[j] = numLayers > 1 ? (sum > 0 ? sum : 0) : sum;
        }
        zPerLayer[0] = z0;
        aPerLayer[0] = a0;

        // Subsequent layers
        for (let l = 1; l < numLayers; l++) {
            const layer = this.layers[l];
            const prevA = aPerLayer[l - 1];
            const z = new Float64Array(layer.outputSize);
            const a = new Float64Array(layer.outputSize);
            const isLastLayer = l === numLayers - 1;
            for (let j = 0; j < layer.outputSize; j++) {
                let sum = layer.bias[j];
                for (let i = 0; i < layer.inputSize; i++) {
                    sum += prevA[i] * layer.weights[i * layer.outputSize + j];
                }
                z[j] = sum;
                // ReLU for hidden layers, linear for output layer
                a[j] = isLastLayer ? sum : (sum > 0 ? sum : 0);
            }
            zPerLayer[l] = z;
            aPerLayer[l] = a;
        }

        return {
            zPerLayer,
            aPerLayer,
            output: aPerLayer[numLayers - 1],
            // Legacy fields for v34-compat callers
            zHidden: zPerLayer[0],
            aHidden: aPerLayer[0],
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

        const numLayers = this.layers.length;

        // Allocate gradient accumulators per layer
        const gradsW = this.layers.map(layer => new Float64Array(layer.weights.length));
        const gradsB = this.layers.map(layer => new Float64Array(layer.bias.length));

        let totalLoss = 0;
        let trainedCount = 0;
        const tdErrors = [];

        for (const sample of samples) {
            if (!sample || typeof sample !== 'object') {
                tdErrors.push(0);
                continue;
            }
            const actionIndex = clampInt(sample.actionIndex, 0, 0, this.outputSize - 1);
            const reward = toFinite(sample.reward, 0);
            const done = sample.done === true;
            const isWeight = toFinite(sample._isWeight, 1);

            const fwd = this._forwardWithCache(sample.state);
            const currentQ = fwd.output[actionIndex];
            const targetQValues = targetNetwork.predict(sample.nextState);
            const nextBestQ = targetQValues[argMax(targetQValues)];
            const target = reward + (done ? 0 : gamma * nextBestQ);
            const delta = currentQ - target;
            const weightedDelta = delta * isWeight;
            totalLoss += 0.5 * delta * delta * isWeight;
            trainedCount += 1;
            tdErrors.push(delta);

            // Backpropagation through all layers
            // Start with output layer gradient
            const deltaPerLayer = new Array(numLayers);

            // Output layer: gradient only for the selected action
            const outputDelta = new Float64Array(this.layers[numLayers - 1].outputSize);
            outputDelta[actionIndex] = weightedDelta;
            deltaPerLayer[numLayers - 1] = outputDelta;

            // Backprop through layers in reverse
            for (let l = numLayers - 1; l >= 0; l--) {
                const layer = this.layers[l];
                const layerDelta = deltaPerLayer[l];

                // Accumulate gradients for this layer
                const prevActivation = l > 0 ? fwd.aPerLayer[l - 1] : null;
                for (let j = 0; j < layer.outputSize; j++) {
                    if (layerDelta[j] === 0) continue;
                    gradsB[l][j] += layerDelta[j];
                    for (let i = 0; i < layer.inputSize; i++) {
                        const inputVal = l > 0
                            ? prevActivation[i]
                            : this._readInput(sample.state, i);
                        gradsW[l][i * layer.outputSize + j] += inputVal * layerDelta[j];
                    }
                }

                // Propagate delta to previous layer (if not first layer)
                if (l > 0) {
                    const prevLayer = this.layers[l - 1];
                    const prevDelta = new Float64Array(prevLayer.outputSize);
                    for (let i = 0; i < prevLayer.outputSize; i++) {
                        // ReLU derivative: pass through only if pre-activation > 0
                        if (fwd.zPerLayer[l - 1][i] <= 0) continue;
                        let grad = 0;
                        for (let j = 0; j < layer.outputSize; j++) {
                            if (layerDelta[j] === 0) continue;
                            grad += layer.weights[i * layer.outputSize + j] * layerDelta[j];
                        }
                        prevDelta[i] = grad;
                    }
                    deltaPerLayer[l - 1] = prevDelta;
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

        // Apply gradients
        const normalizedLr = learningRate / trainedCount;
        for (let l = 0; l < numLayers; l++) {
            const layer = this.layers[l];
            for (let i = 0; i < layer.weights.length; i++) {
                layer.weights[i] -= normalizedLr * gradsW[l][i];
            }
            for (let i = 0; i < layer.bias.length; i++) {
                layer.bias[i] -= normalizedLr * gradsB[l][i];
            }
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
            hiddenLayers: [...this.hiddenLayers],
            outputSize: this.outputSize,
            // Legacy fields for v34 compat (2-layer only)
            hiddenSize: this.hiddenLayers[0],
            layers: this.layers.map(layer => ({
                inputSize: layer.inputSize,
                outputSize: layer.outputSize,
                weights: Array.from(layer.weights),
                bias: Array.from(layer.bias),
            })),
            // Legacy flat fields for v34 checkpoint readers
            weightsInputHidden: Array.from(this.layers[0].weights),
            biasHidden: Array.from(this.layers[0].bias),
            weightsHiddenOutput: Array.from(this.layers[this.layers.length - 1].weights),
            biasOutput: Array.from(this.layers[this.layers.length - 1].bias),
        };
    }

    importState(state) {
        if (!state || typeof state !== 'object') return false;

        // v35 format: layers[] array
        if (Array.isArray(state.layers) && state.layers.length === this.layers.length) {
            for (let l = 0; l < this.layers.length; l++) {
                const src = state.layers[l];
                const dst = this.layers[l];
                if (!src || typeof src !== 'object') return false;
                if (!Array.isArray(src.weights) || src.weights.length !== dst.weights.length) return false;
                if (!Array.isArray(src.bias) || src.bias.length !== dst.bias.length) return false;
            }
            for (let l = 0; l < this.layers.length; l++) {
                const src = state.layers[l];
                const dst = this.layers[l];
                for (let i = 0; i < dst.weights.length; i++) {
                    dst.weights[i] = toFinite(src.weights[i], 0);
                }
                for (let i = 0; i < dst.bias.length; i++) {
                    dst.bias[i] = toFinite(src.bias[i], 0);
                }
            }
            return true;
        }

        // v34 legacy format: flat weightsInputHidden / weightsHiddenOutput
        if (this.layers.length === 2
            && Array.isArray(state.weightsInputHidden)
            && Array.isArray(state.weightsHiddenOutput)
            && Array.isArray(state.biasHidden)
            && Array.isArray(state.biasOutput)) {
            const l0 = this.layers[0];
            const l1 = this.layers[1];
            if (state.weightsInputHidden.length !== l0.weights.length) return false;
            if (state.biasHidden.length !== l0.bias.length) return false;
            if (state.weightsHiddenOutput.length !== l1.weights.length) return false;
            if (state.biasOutput.length !== l1.bias.length) return false;
            for (let i = 0; i < l0.weights.length; i++) {
                l0.weights[i] = toFinite(state.weightsInputHidden[i], 0);
            }
            for (let i = 0; i < l0.bias.length; i++) {
                l0.bias[i] = toFinite(state.biasHidden[i], 0);
            }
            for (let i = 0; i < l1.weights.length; i++) {
                l1.weights[i] = toFinite(state.weightsHiddenOutput[i], 0);
            }
            for (let i = 0; i < l1.bias.length; i++) {
                l1.bias[i] = toFinite(state.biasOutput[i], 0);
            }
            return true;
        }

        return false;
    }
}
