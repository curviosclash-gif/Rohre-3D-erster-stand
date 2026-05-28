#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { assertGraphRagRuntimeOutputPath } from './graph-rag-index.mjs';

const ROOT = process.cwd();
const CONTRACT_PATH = 'data/contracts/knowledge-graph/local-llm-selection.v1.json';
const SELECTION_CONTRACT = 'knowledge-graph.local-llm-selection.v1';
const SMOKE_CONTRACT = 'knowledge-graph.local-llm-smoke.v1';
const SCHEMA_VERSION = 1;
const REQUIRED_ROLES = Object.freeze([
    'fast-rerank',
    'summary',
    'fact-extract',
    'fallback-rulebased',
]);
const REQUIRED_FALLBACKS = Object.freeze([
    'runtime-unavailable',
    'model-missing',
    'timeout',
    'invalid-json',
]);

function normalizeRepoPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

function toAbsolute(root, relativePath) {
    return path.join(root, normalizeRepoPath(relativePath));
}

function normalizeBaseUrl(value) {
    const trimmed = String(value || '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `http://${trimmed}`;
}

function assertLocalBaseUrlAllowed(baseUrl, options = {}) {
    const normalized = normalizeBaseUrl(baseUrl);
    let parsed;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new Error(`blocked-non-local-base-url: invalid URL for ${options.runtimeId || 'runtime'}`);
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const allowed = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (!allowed) {
        throw new Error(`blocked-non-local-base-url: ${normalized} for ${options.runtimeId || 'runtime'}`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`blocked-non-local-base-url: unsupported protocol ${parsed.protocol}`);
    }
    return normalized;
}

function buildUrl(baseUrl, urlPath) {
    return `${normalizeBaseUrl(baseUrl)}${String(urlPath || '').startsWith('/') ? '' : '/'}${urlPath}`;
}

function valueAtPath(object, dottedPath) {
    return String(dottedPath || '')
        .split('.')
        .filter(Boolean)
        .reduce((current, key) => {
            if (current == null) return undefined;
            if (/^\d+$/.test(key) && Array.isArray(current)) return current[Number(key)];
            return current[key];
        }, object);
}

function asPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

async function readJson(root, relativePath) {
    const raw = await fs.readFile(toAbsolute(root, relativePath), 'utf8');
    return JSON.parse(raw);
}

async function writeJson(root, relativePath, artifact) {
    const normalizedPath = assertGraphRagRuntimeOutputPath(relativePath);
    const absolutePath = toAbsolute(root, normalizedPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return normalizedPath;
}

function validateLocalLlmSelectionContract(contract) {
    if (!contract || typeof contract !== 'object') {
        throw new Error('local LLM selection contract must be an object');
    }
    if (contract.contract !== SELECTION_CONTRACT) {
        throw new Error(`Unsupported local LLM selection contract: ${contract.contract || '<empty>'}`);
    }
    if (Number(contract.schema_version) !== SCHEMA_VERSION) {
        throw new Error(`Unsupported local LLM selection schema_version: ${contract.schema_version}`);
    }
    if (!Array.isArray(contract.runtime_priority) || contract.runtime_priority.length < 2) {
        throw new Error('local LLM selection requires runtime_priority');
    }
    if (!Array.isArray(contract.runtimes) || contract.runtimes.length === 0) {
        throw new Error('local LLM selection requires runtimes');
    }

    const runtimeIds = new Set();
    for (const runtime of contract.runtimes) {
        const id = String(runtime?.id || '').trim();
        if (!id) throw new Error('runtime requires id');
        if (runtimeIds.has(id)) throw new Error(`duplicate runtime id: ${id}`);
        runtimeIds.add(id);
        if (runtime.kind === 'http' && (!runtime.base_url?.default || !runtime.healthcheck?.path || !runtime.smoke?.path)) {
            throw new Error(`runtime ${id} requires base_url, healthcheck and smoke paths`);
        }
    }
    for (const id of contract.runtime_priority) {
        if (!runtimeIds.has(id)) throw new Error(`runtime_priority references unknown runtime: ${id}`);
    }
    if (!runtimeIds.has('rulebased')) {
        throw new Error('local LLM selection requires rulebased fallback runtime');
    }

    const roleIds = new Set((contract.model_roles || []).map((role) => role.id));
    for (const requiredRole of REQUIRED_ROLES) {
        if (!roleIds.has(requiredRole)) throw new Error(`missing model role: ${requiredRole}`);
    }
    const fallbacks = new Set(contract.fallback_criteria || []);
    for (const criterion of REQUIRED_FALLBACKS) {
        if (!fallbacks.has(criterion)) throw new Error(`missing fallback criterion: ${criterion}`);
    }
    if (!contract.smoke_fixture?.id || !contract.smoke_fixture?.prompt) {
        throw new Error('local LLM selection requires smoke_fixture id and prompt');
    }
    if (!contract.installation_guidance?.every((entry) => entry.user_action_only === true)) {
        throw new Error('installation guidance must be user_action_only');
    }
    return contract;
}

async function loadLocalLlmSelectionContract(options = {}) {
    const root = options.root || ROOT;
    const contractPath = options.contractPath || CONTRACT_PATH;
    return validateLocalLlmSelectionContract(await readJson(root, contractPath));
}

function runtimeById(contract) {
    return new Map((contract.runtimes || []).map((runtime) => [runtime.id, runtime]));
}

function getRuntimeCandidates(contract, runtimeId) {
    const runtimes = runtimeById(contract);
    if (runtimeId) {
        const runtime = runtimes.get(runtimeId);
        if (!runtime) throw new Error(`Unknown local LLM runtime: ${runtimeId}`);
        return [runtime];
    }
    return contract.runtime_priority
        .map((id) => runtimes.get(id))
        .filter((runtime) => runtime && runtime.kind === 'http')
        .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));
}

function resolveRuntimeSettings(runtime, options = {}) {
    const env = options.env || process.env;
    const baseUrl = normalizeBaseUrl(
        options.baseUrl
        || env[runtime.base_url?.env]
        || runtime.base_url?.default
    );
    const requestedModel = String(options.model || env[runtime.model_env] || '').trim();
    return { baseUrl, requestedModel };
}

function extractModelNames(runtime, payload) {
    if (runtime.adapter === 'ollama') {
        return (payload.models || [])
            .map((model) => model.name || model.model)
            .filter(Boolean);
    }
    if (runtime.adapter === 'openai-compatible') {
        return (payload.data || [])
            .map((model) => model.id || model.name)
            .filter(Boolean);
    }
    return [];
}

function chooseModel(runtime, availableModels, requestedModel) {
    const available = new Set(availableModels);
    if (requestedModel) {
        return available.has(requestedModel)
            ? { ok: true, model: requestedModel, selectedVia: 'requested' }
            : { ok: false, model: requestedModel, reason: 'model-missing' };
    }

    for (const preferred of runtime.preferred_models || []) {
        if (available.has(preferred)) {
            return { ok: true, model: preferred, selectedVia: 'preferred' };
        }
    }
    if (availableModels.length > 0) {
        return { ok: true, model: availableModels[0], selectedVia: 'available' };
    }
    return {
        ok: false,
        model: (runtime.preferred_models || [])[0] || '',
        reason: 'model-missing',
    };
}

function timeoutError(message = 'timeout') {
    const error = new Error(message);
    error.code = 'timeout';
    return error;
}

async function fetchJson(url, options = {}) {
    const timeoutMs = asPositiveNumber(options.timeoutMs, 1000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'content-type': 'application/json',
                ...(options.headers || {}),
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
        }
        return text ? JSON.parse(text) : {};
    } catch (error) {
        if (error?.name === 'AbortError') throw timeoutError(`Timed out after ${timeoutMs}ms`);
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function parseJsonObject(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) throw new Error('empty model output');
    try {
        return JSON.parse(trimmed);
    } catch {
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return JSON.parse(trimmed.slice(start, end + 1));
        }
        throw new Error('model output is not parseable JSON');
    }
}

function validateSmokeOutput(parsed, fixture) {
    const missingFields = (fixture.expected_fields || [])
        .filter((field) => parsed[field] === undefined);
    if (missingFields.length > 0) {
        throw new Error(`model output missing fields: ${missingFields.join(', ')}`);
    }
    if (parsed.fixture_id !== fixture.id) {
        throw new Error(`unexpected fixture_id: ${parsed.fixture_id || '<empty>'}`);
    }
    if (String(parsed.verdict || '').toLowerCase() !== String(fixture.expected_verdict || 'pass').toLowerCase()) {
        throw new Error(`unexpected verdict: ${parsed.verdict || '<empty>'}`);
    }
    return parsed;
}

function smokeRequestForRuntime(runtime, model, fixture) {
    if (runtime.adapter === 'ollama') {
        return {
            path: runtime.smoke.path,
            body: {
                model,
                prompt: fixture.prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0,
                    num_predict: Number(fixture.max_output_tokens || 96),
                },
            },
        };
    }
    if (runtime.adapter === 'openai-compatible') {
        return {
            path: runtime.smoke.path,
            body: {
                model,
                messages: [
                    {
                        role: 'user',
                        content: fixture.prompt,
                    },
                ],
                temperature: 0,
                max_tokens: Number(fixture.max_output_tokens || 96),
            },
        };
    }
    throw new Error(`Unsupported runtime adapter: ${runtime.adapter}`);
}

function classifyAttemptError(error) {
    if (/blocked-non-local-base-url/i.test(error?.message || '')) return 'blocked-non-local-base-url';
    if (error?.code === 'timeout') return 'timeout';
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|EADDRNOTAVAIL|Failed to parse URL/i.test(error?.message || '')) {
        return 'runtime-unavailable';
    }
    return 'request-failed';
}

function makeAttempt(runtime, status, details = {}) {
    return {
        runtime: runtime.id,
        adapter: runtime.adapter,
        status,
        elapsed_ms: details.elapsedMs || 0,
        base_url: details.baseUrl || null,
        model: details.model || null,
        selected_via: details.selectedVia || null,
        reason: details.reason || status,
        checks: {
            runtimeReachable: Boolean(details.runtimeReachable),
            modelAvailable: Boolean(details.modelAvailable),
            outputParseable: Boolean(details.outputParseable),
            timeoutRespected: details.timeoutRespected !== false,
        },
        error: details.error || null,
    };
}

async function runHttpRuntimeSmoke(runtime, contract, options = {}) {
    const startedAt = Date.now();
    const fixture = contract.smoke_fixture;
    const { baseUrl, requestedModel } = resolveRuntimeSettings(runtime, options);
    const totalTimeoutMs = asPositiveNumber(
        options.timeoutMs,
        asPositiveNumber(runtime.timeouts?.total_ms, asPositiveNumber(contract.timeouts?.smoke_total_ms, 5000))
    );
    const requestTimeoutMs = Math.min(
        totalTimeoutMs,
        asPositiveNumber(runtime.timeouts?.request_ms, asPositiveNumber(contract.timeouts?.request_ms, 4000))
    );
    const deadline = startedAt + totalTimeoutMs;
    const remainingTimeout = () => {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw timeoutError(`Runtime ${runtime.id} exceeded ${totalTimeoutMs}ms smoke timeout`);
        return Math.min(requestTimeoutMs, remaining);
    };

    try {
        assertLocalBaseUrlAllowed(baseUrl, { runtimeId: runtime.id });
        const health = await fetchJson(buildUrl(baseUrl, runtime.healthcheck.path), {
            method: runtime.healthcheck.method || 'GET',
            timeoutMs: remainingTimeout(),
        });
        const availableModels = extractModelNames(runtime, health);
        const modelChoice = chooseModel(runtime, availableModels, requestedModel);
        if (!modelChoice.ok) {
            return makeAttempt(runtime, modelChoice.reason, {
                elapsedMs: Date.now() - startedAt,
                baseUrl,
                model: modelChoice.model,
                reason: `${modelChoice.reason}: ${modelChoice.model || '<none>'}`,
                runtimeReachable: true,
                modelAvailable: false,
            });
        }

        const request = smokeRequestForRuntime(runtime, modelChoice.model, fixture);
        const response = await fetchJson(buildUrl(baseUrl, request.path), {
            method: runtime.smoke.method || 'POST',
            body: request.body,
            timeoutMs: remainingTimeout(),
        });
        const outputText = valueAtPath(response, runtime.smoke.response_field);
        const parsed = validateSmokeOutput(parseJsonObject(outputText), fixture);
        return {
            ...makeAttempt(runtime, 'pass', {
                elapsedMs: Date.now() - startedAt,
                baseUrl,
                model: modelChoice.model,
                selectedVia: modelChoice.selectedVia,
                reason: 'local-runtime-smoke-pass',
                runtimeReachable: true,
                modelAvailable: true,
                outputParseable: true,
            }),
            output: parsed,
        };
    } catch (error) {
        const status = classifyAttemptError(error);
        const invalidOutput = /parseable JSON|missing fields|unexpected fixture_id|unexpected verdict|Unexpected token/i
            .test(error?.message || '');
        return makeAttempt(runtime, invalidOutput ? 'invalid-json' : status, {
            elapsedMs: Date.now() - startedAt,
            baseUrl,
            model: requestedModel || null,
            reason: invalidOutput ? 'invalid-json' : status,
            runtimeReachable: status !== 'runtime-unavailable',
            modelAvailable: false,
            outputParseable: false,
            timeoutRespected: status !== 'timeout',
            error: error?.message || String(error),
        });
    }
}

function makeRuleBasedFallback(contract, reason, attempts) {
    const fixture = contract.smoke_fixture;
    const output = {
        fixture_id: fixture.id,
        verdict: 'pass',
        reason: 'Graph-RAG remains available through deterministic graph-first retrieval without a local model.',
    };
    return {
        contract: SMOKE_CONTRACT,
        schema_version: 1,
        generated_at: new Date().toISOString(),
        status: 'pass',
        mode: 'rulebased-fallback',
        runtime: {
            id: 'rulebased',
            adapter: 'deterministic-rulebased',
            model: null,
        },
        fallbackUsed: true,
        fallbackReason: reason,
        attempts,
        checks: {
            runtimeReachable: attempts.some((attempt) => attempt.checks.runtimeReachable),
            modelAvailable: attempts.some((attempt) => attempt.checks.modelAvailable),
            outputParseable: true,
            timeoutRespected: attempts.every((attempt) => attempt.checks.timeoutRespected !== false),
            graphRagBlocked: false,
        },
        output,
    };
}

function makeLocalRuntimeResult(attempt) {
    return {
        contract: SMOKE_CONTRACT,
        schema_version: 1,
        generated_at: new Date().toISOString(),
        status: 'pass',
        mode: 'local-runtime',
        runtime: {
            id: attempt.runtime,
            adapter: attempt.adapter,
            model: attempt.model,
            selected_via: attempt.selected_via,
        },
        fallbackUsed: false,
        fallbackReason: null,
        attempts: [attempt],
        checks: {
            runtimeReachable: attempt.checks.runtimeReachable,
            modelAvailable: attempt.checks.modelAvailable,
            outputParseable: attempt.checks.outputParseable,
            timeoutRespected: attempt.checks.timeoutRespected,
            graphRagBlocked: false,
        },
        output: attempt.output,
    };
}

async function runLocalLlmSmokeCheck(options = {}) {
    const root = options.root || ROOT;
    const contract = validateLocalLlmSelectionContract(options.contract || await loadLocalLlmSelectionContract({
        root,
        contractPath: options.contractPath,
    }));
    const candidates = getRuntimeCandidates(contract, options.runtimeId);
    if (candidates.length === 1 && candidates[0].kind === 'local-fallback') {
        return makeRuleBasedFallback(contract, 'explicit-rulebased-runtime', []);
    }

    const attempts = [];
    for (const runtime of candidates) {
        if (runtime.kind !== 'http') continue;
        const attempt = await runHttpRuntimeSmoke(runtime, contract, options);
        attempts.push(attempt);
        if (attempt.status === 'pass') {
            return makeLocalRuntimeResult(attempt);
        }
    }

    const reason = attempts[0]?.status || 'runtime-unavailable';
    return makeRuleBasedFallback(contract, reason, attempts);
}

function parseCliArgs(argv) {
    const options = {
        json: false,
        write: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--json') {
            options.json = true;
        } else if (arg === '--write') {
            options.write = true;
        } else if (arg === '--out') {
            options.outPath = argv[index + 1];
            options.write = true;
            index += 1;
        } else if (arg === '--contract') {
            options.contractPath = argv[index + 1];
            index += 1;
        } else if (arg === '--runtime') {
            options.runtimeId = argv[index + 1];
            index += 1;
        } else if (arg === '--base-url') {
            options.baseUrl = argv[index + 1];
            index += 1;
        } else if (arg === '--model') {
            options.model = argv[index + 1];
            index += 1;
        } else if (arg === '--timeout-ms') {
            options.timeoutMs = Number(argv[index + 1]);
            index += 1;
        } else if (arg === '--strict-runtime') {
            options.strictRuntime = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return options;
}

function usage() {
    process.stdout.write(
        'Usage:\n'
        + '  node scripts/graph-rag-local-llm-check.mjs [--json] [--runtime ollama|llama-cpp|rulebased]\n'
        + '  node scripts/graph-rag-local-llm-check.mjs --runtime ollama --model qwen2.5:7b-instruct --strict-runtime\n'
    );
}

async function runCli(argv = process.argv.slice(2)) {
    const options = parseCliArgs(argv);
    if (options.help) {
        usage();
        return;
    }
    const requestedWritePath = options.write || options.outPath
        ? assertGraphRagRuntimeOutputPath(options.outPath || 'tmp/graph-rag/local-llm-smoke.json')
        : null;
    const result = await runLocalLlmSmokeCheck(options);
    if (options.write) {
        result.writtenPath = await writeJson(ROOT, requestedWritePath, result);
    }

    if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
        process.stdout.write([
            `Graph-RAG local LLM check: ${result.status.toUpperCase()}`,
            `Mode: ${result.mode}`,
            `Runtime: ${result.runtime.id}${result.runtime.model ? ` (${result.runtime.model})` : ''}`,
            `Fallback used: ${result.fallbackUsed ? 'yes' : 'no'}`,
            `Output: ${result.writtenPath || 'stdout only'}`,
        ].join('\n') + '\n');
    }

    if (options.strictRuntime && result.fallbackUsed) {
        process.exitCode = 1;
    }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
    runCli().catch((error) => {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exitCode = 1;
    });
}

export {
    CONTRACT_PATH,
    SELECTION_CONTRACT,
    SMOKE_CONTRACT,
    assertLocalBaseUrlAllowed,
    loadLocalLlmSelectionContract,
    runLocalLlmSmokeCheck,
    validateLocalLlmSelectionContract,
};
