#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { assertGraphRagRuntimeOutputPath } from './graph-rag-index.mjs';
import { runGraphRagQuery } from './graph-rag-query.mjs';
import {
    assertLocalBaseUrlAllowed,
    loadLocalLlmSelectionContract,
} from './graph-rag-local-llm-check.mjs';

const ROOT = process.cwd();
const CONTRACT_PATH = 'data/contracts/knowledge-graph/context-adapter-profiles.v1.json';
const CONTEXT_ADAPTER_PROFILE_CONTRACT = 'knowledge-graph.context-adapter-profiles.v1';
const CONTEXT_ADAPTER_RESULT_CONTRACT = 'knowledge-graph.rag-context-adapter.v1';
const SCHEMA_VERSION = 1;
const CONFIDENCE_VALUES = Object.freeze(['high', 'medium', 'low']);
const ADAPTER_OUTPUT_MODES = Object.freeze(['rulebased', 'mock', 'local-runtime']);
const CLAIM_STATUS_VALUES = Object.freeze(['source-backed', 'fixture-only', 'no-source-backed-claims']);
const REQUIRED_OPERATIONS = Object.freeze(['rerank', 'summary', 'fact-extract']);
const REQUIRED_FALLBACKS = Object.freeze(['rulebased', 'mock']);
const DEFAULT_MODE = 'rulebased';

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

function asPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function hasRequiredValues(values, required, label) {
    const set = new Set(Array.isArray(values) ? values : []);
    for (const entry of required) {
        if (!set.has(entry)) throw new Error(`${label} missing ${entry}`);
    }
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

function normalizeBaseUrl(value) {
    const trimmed = String(value || '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `http://${trimmed}`;
}

function buildUrl(baseUrl, urlPath) {
    return `${normalizeBaseUrl(baseUrl)}${String(urlPath || '').startsWith('/') ? '' : '/'}${urlPath}`;
}

function makeExcerpt(value, maxLength = 260) {
    const normalized = String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function estimateTokens(text) {
    return Math.max(1, Math.ceil(String(text || '').length / 4));
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

function validateContextAdapterProfilesContract(contract) {
    if (!contract || typeof contract !== 'object') {
        throw new Error('context adapter profiles contract must be an object');
    }
    if (contract.contract !== CONTEXT_ADAPTER_PROFILE_CONTRACT) {
        throw new Error(`Unsupported context adapter profiles contract: ${contract.contract || '<empty>'}`);
    }
    if (Number(contract.schema_version) !== SCHEMA_VERSION) {
        throw new Error(`Unsupported context adapter profiles schema_version: ${contract.schema_version}`);
    }
    if (!Array.isArray(contract.runtime_priority) || !contract.runtime_priority.includes('rulebased')) {
        throw new Error('context adapter profiles require runtime_priority with rulebased fallback');
    }
    if (!Array.isArray(contract.fallbacks) || contract.fallbacks.length < REQUIRED_FALLBACKS.length) {
        throw new Error('context adapter profiles require fallback definitions');
    }

    const fallbackIds = new Set(contract.fallbacks.map((fallback) => fallback.id));
    for (const requiredFallback of REQUIRED_FALLBACKS) {
        if (!fallbackIds.has(requiredFallback)) throw new Error(`missing fallback: ${requiredFallback}`);
    }
    if (!contract.fallbacks.every((fallback) => fallback.requires_local_ai === false)) {
        throw new Error('context adapter fallbacks must not require local AI');
    }

    if (contract.safety?.read_only !== true || contract.safety?.source_of_truth !== false) {
        throw new Error('context adapter safety requires read_only true and source_of_truth false');
    }
    if (!String(contract.safety?.writes_runtime_outputs_to || '').startsWith('tmp/graph-rag')) {
        throw new Error('context adapter runtime outputs must be limited to tmp/graph-rag');
    }
    if (contract.safety?.downloads_or_installs !== 'never') {
        throw new Error('context adapter must not download or install runtimes');
    }
    if (!contract.result_evidence || typeof contract.result_evidence !== 'object') {
        throw new Error('context adapter profiles require result_evidence');
    }
    hasRequiredValues(contract.result_evidence.required, [
        'evidenceMode',
        'quality',
        'sourceOfTruth',
        'claimStatus',
    ], 'context adapter result_evidence.required');
    hasRequiredValues(contract.result_evidence.mode_values, ADAPTER_OUTPUT_MODES, 'context adapter result_evidence.mode_values');
    hasRequiredValues(contract.result_evidence.claim_status_values, CLAIM_STATUS_VALUES, 'context adapter result_evidence.claim_status_values');

    if (!Array.isArray(contract.profiles) || contract.profiles.length === 0) {
        throw new Error('context adapter profiles require at least one profile');
    }
    const profileIds = new Set();
    for (const profile of contract.profiles) {
        const id = String(profile?.id || '').trim();
        if (!id) throw new Error('context adapter profile requires id');
        if (profileIds.has(id)) throw new Error(`duplicate context adapter profile id: ${id}`);
        profileIds.add(id);
        if (profile.read_only !== true || profile.source_of_truth !== false) {
            throw new Error(`profile ${id} must be read_only and not source_of_truth`);
        }
        if (!Array.isArray(profile.operations)) {
            throw new Error(`profile ${id} requires operations`);
        }
        const operationIds = new Set(profile.operations.map((operation) => operation.id));
        for (const requiredOperation of REQUIRED_OPERATIONS) {
            if (!operationIds.has(requiredOperation)) throw new Error(`profile ${id} missing operation: ${requiredOperation}`);
        }
        for (const operation of profile.operations) {
            if (!operation.role) throw new Error(`profile ${id} operation ${operation.id} requires role`);
            if (asPositiveNumber(operation.max_input_tokens, 0) <= 0) {
                throw new Error(`profile ${id} operation ${operation.id} requires max_input_tokens`);
            }
            if (asPositiveNumber(operation.max_output_tokens, 0) <= 0) {
                throw new Error(`profile ${id} operation ${operation.id} requires max_output_tokens`);
            }
            if (asPositiveNumber(operation.timeout_ms, 0) <= 0) {
                throw new Error(`profile ${id} operation ${operation.id} requires timeout_ms`);
            }
            const operationFallbacks = new Set(operation.fallbacks || []);
            for (const requiredFallback of REQUIRED_FALLBACKS) {
                if (!operationFallbacks.has(requiredFallback)) {
                    throw new Error(`profile ${id} operation ${operation.id} missing fallback ${requiredFallback}`);
                }
            }
        }
    }
    if (!profileIds.has(contract.default_profile)) {
        throw new Error(`default_profile references unknown profile: ${contract.default_profile || '<empty>'}`);
    }
    return contract;
}

async function loadContextAdapterProfilesContract(options = {}) {
    const root = options.root || ROOT;
    const contractPath = options.contractPath || CONTRACT_PATH;
    return validateContextAdapterProfilesContract(await readJson(root, contractPath));
}

function getProfile(contract, profileId) {
    const selectedId = profileId || contract.default_profile;
    const profile = contract.profiles.find((entry) => entry.id === selectedId);
    if (!profile) throw new Error(`Unknown context adapter profile: ${selectedId}`);
    return profile;
}

function operationById(profile, operationId) {
    const operation = profile.operations.find((entry) => entry.id === operationId);
    if (!operation) throw new Error(`Profile ${profile.id} is missing operation ${operationId}`);
    return operation;
}

function sourceWeight(sourceClass) {
    const weights = {
        'active-plans': 45,
        'master-plan': 40,
        'plan-changelog': 35,
        'reference-docs': 25,
        'workflow-rules': 20,
        'historical-plans': 10,
    };
    return weights[sourceClass] || 0;
}

function normalizeChunk(chunk) {
    const excerpt = chunk.excerpt || chunk.text || '';
    return {
        id: String(chunk.id || ''),
        path: normalizeRepoPath(chunk.path),
        lineStart: Number(chunk.lineStart || 0),
        lineEnd: Number(chunk.lineEnd || 0),
        hash: chunk.hash || null,
        sourceClass: chunk.sourceClass || null,
        estimatedTokens: asPositiveNumber(chunk.estimatedTokens, estimateTokens(excerpt)),
        retrievalScore: Number(chunk.retrievalScore || 0),
        selectedVia: chunk.selectedVia || null,
        headings: Array.isArray(chunk.headings) ? chunk.headings : [],
        excerpt: makeExcerpt(excerpt, 520),
    };
}

function prepareAdapterInput(queryResult, profile, options = {}) {
    const maxChunks = Math.max(1, Math.floor(asPositiveNumber(
        options.maxChunks,
        asPositiveNumber(profile.limits?.max_chunks, 8)
    )));
    const maxInputTokens = Math.max(1, Math.floor(asPositiveNumber(
        options.maxInputTokens,
        asPositiveNumber(profile.limits?.max_input_tokens, 8192)
    )));
    const selectedChunks = (queryResult.selectedChunks || [])
        .map(normalizeChunk)
        .filter((chunk) => chunk.id && chunk.path)
        .slice(0, maxChunks);

    const chunks = [];
    let estimatedTokens = 0;
    for (const chunk of selectedChunks) {
        const nextTotal = estimatedTokens + chunk.estimatedTokens;
        if (chunks.length > 0 && nextTotal > maxInputTokens) break;
        chunks.push(chunk);
        estimatedTokens += chunk.estimatedTokens;
        if (chunks.length >= maxChunks) break;
    }

    return {
        question: queryResult.question,
        queryContract: queryResult.contract,
        queryGeneratedAt: queryResult.generated_at || null,
        chunks,
        stats: {
            chunksAvailable: selectedChunks.length,
            chunksSelected: chunks.length,
            estimatedInputTokens: estimatedTokens,
            maxInputTokens,
            truncated: selectedChunks.length > chunks.length,
        },
    };
}

function makeRerank(input) {
    const ranked = input.chunks
        .map((chunk, index) => ({
            chunkId: chunk.id,
            path: chunk.path,
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
            score: Math.round((chunk.retrievalScore || 0) + sourceWeight(chunk.sourceClass) + Math.max(0, 20 - index)),
            reason: [
                chunk.selectedVia || 'selected-chunk',
                chunk.sourceClass ? `source:${chunk.sourceClass}` : 'source:unknown',
                chunk.headings.length ? `heading:${chunk.headings.slice(-1)[0]}` : null,
            ].filter(Boolean),
        }))
        .sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId));

    return ranked;
}

function makeSummary(input, rerank, options = {}) {
    const topChunks = rerank
        .slice(0, Math.max(1, Math.min(3, input.chunks.length)))
        .map((entry) => input.chunks.find((chunk) => chunk.id === entry.chunkId))
        .filter(Boolean);
    const first = topChunks[0];
    const summary = first
        ? makeExcerpt(`${first.path}#L${first.lineStart}-L${first.lineEnd}: ${first.excerpt}`, 420)
        : 'No source-backed chunks were available for the context adapter.';
    const maxOutputTokens = asPositiveNumber(options.maxOutputTokens, 512);
    return {
        text: makeExcerpt(summary, Math.max(80, maxOutputTokens * 4)),
        citations: topChunks.map((chunk) => ({
            chunkId: chunk.id,
            path: chunk.path,
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
        })),
        uncertainties: [
            'rulebased-summary',
            input.stats.truncated ? 'adapter-input-truncated' : null,
        ].filter(Boolean),
    };
}

function makeFacts(input, rerank, options = {}) {
    const maxFacts = Math.max(1, Math.min(5, Math.floor(asPositiveNumber(options.maxFacts, 4))));
    return rerank
        .slice(0, maxFacts)
        .map((entry, index) => {
            const chunk = input.chunks.find((candidate) => candidate.id === entry.chunkId);
            return {
                id: `fact-${index + 1}`,
                claim: makeExcerpt(chunk?.excerpt || '', 260),
                path: chunk?.path || entry.path,
                lineStart: chunk?.lineStart || entry.lineStart,
                lineEnd: chunk?.lineEnd || entry.lineEnd,
                chunkId: entry.chunkId,
                confidence: entry.score >= 260 ? 'high' : (entry.score >= 120 ? 'medium' : 'low'),
                uncertainties: ['local-ai-not-source-of-truth', 'source-backed-excerpt-only'],
            };
        });
}

function makeRuleBasedOutput(input, profile, details = {}) {
    const rerank = makeRerank(input);
    const summaryOperation = operationById(profile, 'summary');
    const factsOperation = operationById(profile, 'fact-extract');
    return {
        mode: details.mode || 'rulebased',
        runtime: {
            id: 'rulebased',
            adapter: 'deterministic-rulebased',
            model: null,
        },
        fallbackUsed: Boolean(details.fallbackUsed),
        fallbackReason: details.fallbackReason || null,
        outputs: {
            rerank,
            summary: makeSummary(input, rerank, {
                maxOutputTokens: summaryOperation.max_output_tokens,
            }),
            facts: makeFacts(input, rerank, {
                maxFacts: Math.ceil(factsOperation.max_output_tokens / 128),
            }),
        },
    };
}

function makeMockOutput(input) {
    const first = input.chunks[0] || null;
    return {
        mode: 'mock',
        runtime: {
            id: 'mock',
            adapter: 'deterministic-test-fixture',
            model: null,
        },
        fallbackUsed: false,
        fallbackReason: null,
        outputs: {
            rerank: first ? [{
                chunkId: first.id,
                path: first.path,
                lineStart: first.lineStart,
                lineEnd: first.lineEnd,
                score: 100,
                reason: ['mock-fixture'],
            }] : [],
            summary: {
                text: `Mock context summary for ${makeExcerpt(input.question || 'Graph-RAG question', 96)}`,
                citations: first ? [{
                    chunkId: first.id,
                    path: first.path,
                    lineStart: first.lineStart,
                    lineEnd: first.lineEnd,
                }] : [],
                uncertainties: [
                    'mock-mode',
                    first ? 'fixture-only' : 'no-source-backed-chunks',
                ],
            },
            facts: first ? [{
                id: 'fact-1',
                claim: makeExcerpt(first.excerpt, 180),
                path: first.path,
                lineStart: first.lineStart,
                lineEnd: first.lineEnd,
                chunkId: first.id,
                confidence: 'low',
                uncertainties: ['mock-mode', 'fixture-only', 'local-ai-not-source-of-truth'],
            }] : [],
        },
    };
}

function confidenceCountsForFacts(facts = []) {
    const counts = Object.fromEntries(CONFIDENCE_VALUES.map((confidence) => [confidence, 0]));
    for (const fact of facts) {
        if (Object.prototype.hasOwnProperty.call(counts, fact.confidence)) counts[fact.confidence] += 1;
    }
    return counts;
}

function validateAdapterOutputs(input, adapterOutput) {
    if (!adapterOutput || typeof adapterOutput !== 'object') {
        throw new Error('context adapter output must be an object');
    }
    if (!ADAPTER_OUTPUT_MODES.includes(adapterOutput.mode)) {
        throw new Error(`context adapter output has invalid mode: ${adapterOutput.mode || '<empty>'}`);
    }
    const outputs = adapterOutput.outputs;
    if (!outputs || typeof outputs !== 'object') {
        throw new Error('context adapter output requires outputs');
    }
    if (!Array.isArray(outputs.rerank)) throw new Error('context adapter output rerank must be an array');
    if (!Array.isArray(outputs.summary?.citations)) throw new Error('context adapter output summary citations must be an array');
    if (!Array.isArray(outputs.summary?.uncertainties) || outputs.summary.uncertainties.length === 0) {
        throw new Error('context adapter output summary requires uncertainties');
    }
    if (!Array.isArray(outputs.facts)) throw new Error('context adapter output facts must be an array');

    const inputChunks = new Map(input.chunks.map((chunk) => [chunk.id, chunk]));
    const assertSourceChunk = (chunkId, label) => {
        if (!inputChunks.has(chunkId)) {
            throw new Error(`context adapter ${label} references unknown source chunk: ${chunkId || '<empty>'}`);
        }
    };
    for (const entry of outputs.rerank) assertSourceChunk(entry.chunkId, 'rerank');
    for (const citation of outputs.summary.citations) assertSourceChunk(citation.chunkId, 'summary citation');
    for (const fact of outputs.facts) {
        assertSourceChunk(fact.chunkId, 'fact');
        if (!String(fact.claim || '').trim()) throw new Error('context adapter fact requires a claim');
        if (!CONFIDENCE_VALUES.includes(fact.confidence)) {
            throw new Error(`context adapter fact has invalid confidence: ${fact.confidence || '<empty>'}`);
        }
        if (!Array.isArray(fact.uncertainties) || fact.uncertainties.length === 0) {
            throw new Error('context adapter fact requires uncertainties');
        }
        if (!fact.uncertainties.includes('local-ai-not-source-of-truth')) {
            throw new Error('context adapter fact must mark local AI as non-source-of-truth');
        }
        if (adapterOutput.mode === 'mock') {
            if (fact.confidence !== 'low') throw new Error('mock context adapter facts must stay low confidence');
            if (!fact.uncertainties.includes('mock-mode')) throw new Error('mock context adapter facts must carry mock-mode uncertainty');
        }
    }

    if (input.chunks.length > 0 && adapterOutput.mode !== 'mock') {
        if (outputs.rerank.length === 0 || outputs.summary.citations.length === 0 || outputs.facts.length === 0) {
            throw new Error('context adapter output is missing source-backed adapter fields');
        }
    }
    return adapterOutput;
}

function makeAdapterEvidenceMode(input, adapterOutput, requestedMode) {
    const facts = adapterOutput.outputs.facts || [];
    const sourceChunkIds = new Set(input.chunks.map((chunk) => chunk.id));
    const sourceBackedFactCount = facts.filter((fact) => sourceChunkIds.has(fact.chunkId)).length;
    const claimStatus = facts.length === 0
        ? 'no-source-backed-claims'
        : (adapterOutput.mode === 'mock' ? 'fixture-only' : 'source-backed');
    const uncertainties = Array.from(new Set([
        'local-ai-not-source-of-truth',
        adapterOutput.mode === 'mock' ? 'mock-mode' : null,
        adapterOutput.fallbackUsed ? `fallback:${adapterOutput.fallbackReason || 'unknown'}` : null,
        claimStatus === 'no-source-backed-claims' ? 'no-source-backed-chunks' : null,
    ].filter(Boolean)));
    return {
        requestedMode,
        actualMode: adapterOutput.mode,
        runtimeId: adapterOutput.runtime?.id || null,
        runtimeAdapter: adapterOutput.runtime?.adapter || null,
        localAiUsed: adapterOutput.mode === 'local-runtime',
        deterministicFallback: adapterOutput.mode === 'rulebased',
        fixtureOnly: adapterOutput.mode === 'mock',
        sourceOfTruth: false,
        fallbackUsed: adapterOutput.fallbackUsed,
        fallbackReason: adapterOutput.fallbackReason,
        claimStatus,
        sourceBackedFactCount,
        confidenceCounts: confidenceCountsForFacts(facts),
        uncertainties,
    };
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
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
        return text ? JSON.parse(text) : {};
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`Timed out after ${timeoutMs}ms`);
            timeoutError.code = 'timeout';
            throw timeoutError;
        }
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
        if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
        throw new Error('model output is not parseable JSON');
    }
}

function classifyLocalError(error) {
    if (/blocked-non-local-base-url/i.test(error?.message || '')) return 'blocked-non-local-base-url';
    if (error?.code === 'timeout' || /timeout|timed out|AbortError/i.test(error?.message || '')) return 'timeout';
    if (/parseable JSON|Unexpected token|empty model output/i.test(error?.message || '')) return 'invalid-json';
    if (/model-missing/i.test(error?.message || '')) return 'model-missing';
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|EADDRNOTAVAIL|Failed to parse URL/i.test(error?.message || '')) return 'runtime-unavailable';
    return 'request-failed';
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
        if (available.has(requestedModel)) return { model: requestedModel, selectedVia: 'requested' };
        throw new Error(`model-missing: ${requestedModel}`);
    }
    for (const preferred of runtime.preferred_models || []) {
        if (available.has(preferred)) return { model: preferred, selectedVia: 'preferred' };
    }
    if (availableModels.length > 0) return { model: availableModels[0], selectedVia: 'available' };
    throw new Error(`model-missing: ${(runtime.preferred_models || [])[0] || '<none>'}`);
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

function runtimePrompt(input) {
    const chunks = input.chunks.map((chunk) => ({
        id: chunk.id,
        path: chunk.path,
        lineStart: chunk.lineStart,
        lineEnd: chunk.lineEnd,
        excerpt: chunk.excerpt,
    }));
    return [
        'Return only compact JSON with keys rerank, summary and facts.',
        'Use only the provided chunks. Do not invent paths, line numbers or facts.',
        'rerank must be an array of objects: { "chunkId": string, "score": number, "reason": string }.',
        'summary must be an object: { "text": string, "citations": string[], "uncertainties": string[] }.',
        'facts must be an array of objects: { "claim": string, "chunkId": string, "confidence": "high|medium|low", "uncertainties": string[] }.',
        `Question: ${input.question}`,
        `Chunks: ${JSON.stringify(chunks)}`,
    ].join('\n');
}

function runtimeRequestFor(runtime, model, prompt, maxOutputTokens) {
    if (runtime.adapter === 'ollama') {
        return {
            path: runtime.smoke?.path || '/api/generate',
            method: 'POST',
            responseField: runtime.smoke?.response_field || 'response',
            body: {
                model,
                prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0,
                    num_predict: maxOutputTokens,
                },
            },
        };
    }
    if (runtime.adapter === 'openai-compatible') {
        return {
            path: runtime.smoke?.path || '/v1/chat/completions',
            method: 'POST',
            responseField: runtime.smoke?.response_field || 'choices.0.message.content',
            body: {
                model,
                temperature: 0,
                max_tokens: maxOutputTokens,
                messages: [{ role: 'user', content: prompt }],
            },
        };
    }
    throw new Error(`Unsupported local context runtime adapter: ${runtime.adapter || '<empty>'}`);
}

function sanitizeLocalOutput(parsed, input) {
    const chunkMap = new Map(input.chunks.map((chunk) => [chunk.id, chunk]));
    const rerank = (Array.isArray(parsed.rerank) ? parsed.rerank : [])
        .map((entry) => {
            const chunk = chunkMap.get(entry.chunkId);
            if (!chunk) return null;
            return {
                chunkId: chunk.id,
                path: chunk.path,
                lineStart: chunk.lineStart,
                lineEnd: chunk.lineEnd,
                score: Math.max(0, Math.round(Number(entry.score || 0))),
                reason: [makeExcerpt(entry.reason || 'local-runtime-rerank', 120)],
            };
        })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId));

    const citedIds = Array.isArray(parsed.summary?.citations) ? parsed.summary.citations : [];
    const citations = citedIds
        .map((chunkId) => chunkMap.get(chunkId))
        .filter(Boolean)
        .map((chunk) => ({
            chunkId: chunk.id,
            path: chunk.path,
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
        }));

    const facts = (Array.isArray(parsed.facts) ? parsed.facts : [])
        .map((entry, index) => {
            const chunk = chunkMap.get(entry.chunkId);
            if (!chunk) return null;
            const confidence = ['high', 'medium', 'low'].includes(entry.confidence) ? entry.confidence : 'low';
            return {
                id: `fact-${index + 1}`,
                claim: makeExcerpt(entry.claim || chunk.excerpt, 260),
                path: chunk.path,
                lineStart: chunk.lineStart,
                lineEnd: chunk.lineEnd,
                chunkId: chunk.id,
                confidence,
                uncertainties: Array.from(new Set([
                    ...((Array.isArray(entry.uncertainties) ? entry.uncertainties : []).map(String)),
                    'local-ai-not-source-of-truth',
                ])),
            };
        })
        .filter(Boolean);

    if (rerank.length === 0 || citations.length === 0 || facts.length === 0) {
        throw new Error('model output is missing source-backed adapter fields');
    }

    return {
        rerank,
        summary: {
            text: makeExcerpt(parsed.summary?.text || '', 2048),
            citations,
            uncertainties: Array.from(new Set([
                ...((Array.isArray(parsed.summary?.uncertainties) ? parsed.summary.uncertainties : []).map(String)),
                'local-ai-not-source-of-truth',
            ])),
        },
        facts,
    };
}

async function runLocalRuntimeOutput(input, profile, options = {}) {
    const root = options.root || ROOT;
    const localContract = await loadLocalLlmSelectionContract({
        root,
        contractPath: options.localLlmContractPath,
    });
    const runtimes = new Map((localContract.runtimes || []).map((runtime) => [runtime.id, runtime]));
    const runtimeIds = options.runtimeId
        ? [options.runtimeId]
        : (profile.runtime_priority || localContract.runtime_priority || [])
            .filter((runtimeId) => runtimeId !== 'rulebased');
    const summaryOperation = operationById(profile, 'summary');
    const timeoutMs = asPositiveNumber(
        options.timeoutMs,
        asPositiveNumber(profile.timeouts?.total_ms, asPositiveNumber(localContract.timeouts?.smoke_total_ms, 5000))
    );
    const errors = [];

    for (const runtimeId of runtimeIds) {
        const runtime = runtimes.get(runtimeId);
        if (!runtime || runtime.kind !== 'http') continue;
        try {
            const { baseUrl, requestedModel } = resolveRuntimeSettings(runtime, options);
            assertLocalBaseUrlAllowed(baseUrl, { runtimeId: runtime.id });
            const health = await fetchJson(buildUrl(baseUrl, runtime.healthcheck.path), {
                method: runtime.healthcheck.method || 'GET',
                timeoutMs: Math.min(timeoutMs, asPositiveNumber(profile.timeouts?.connect_ms, 750)),
            });
            const modelChoice = chooseModel(runtime, extractModelNames(runtime, health), requestedModel);
            const request = runtimeRequestFor(
                runtime,
                modelChoice.model,
                runtimePrompt(input),
                summaryOperation.max_output_tokens
            );
            const response = await fetchJson(buildUrl(baseUrl, request.path), {
                method: request.method,
                body: request.body,
                timeoutMs,
            });
            const parsed = parseJsonObject(valueAtPath(response, request.responseField));
            return {
                mode: 'local-runtime',
                runtime: {
                    id: runtime.id,
                    adapter: runtime.adapter,
                    model: modelChoice.model,
                    selected_via: modelChoice.selectedVia,
                },
                fallbackUsed: false,
                fallbackReason: null,
                outputs: sanitizeLocalOutput(parsed, input),
            };
        } catch (error) {
            errors.push({
                runtime: runtimeId,
                reason: classifyLocalError(error),
                error: error?.message || String(error),
            });
        }
    }

    const reason = errors[0]?.reason || 'runtime-unavailable';
    if (options.strictLocal) {
        const error = new Error(`local context adapter failed: ${reason}`);
        error.attempts = errors;
        throw error;
    }
    return {
        ...makeRuleBasedOutput(input, profile, {
            fallbackUsed: true,
            fallbackReason: reason,
        }),
        attempts: errors,
    };
}

async function loadQueryResult(questionOrQuery, options = {}) {
    if (questionOrQuery && typeof questionOrQuery === 'object') return questionOrQuery;
    if (options.queryResult) return options.queryResult;
    if (options.queryPath) return readJson(options.root || ROOT, options.queryPath);
    const question = String(questionOrQuery || options.question || '').trim();
    if (!question) throw new Error('Question or Graph-RAG query result is required');
    return runGraphRagQuery(question, {
        root: options.root || ROOT,
        index: options.index,
        indexPath: options.indexPath,
        contract: options.sourceContract,
        contractPath: options.sourceContractPath,
        graph: options.graph,
        graphPath: options.graphPath,
        coverage: options.coverage,
        coveragePath: options.coveragePath,
        includeConditional: options.includeConditional || [],
        sourcePaths: options.sourcePaths,
        maxChunks: options.queryMaxChunks || options.maxChunks,
    });
}

async function runGraphRagContextAdapter(questionOrQuery, options = {}) {
    const root = options.root || ROOT;
    const requestedWritePath = options.write || options.outPath
        ? assertGraphRagRuntimeOutputPath(options.outPath || 'tmp/graph-rag/graph-rag-context-adapter.json')
        : null;
    const contract = validateContextAdapterProfilesContract(options.contract || await loadContextAdapterProfilesContract({
        root,
        contractPath: options.contractPath,
    }));
    const profile = getProfile(contract, options.profileId || options.profile);
    const queryResult = await loadQueryResult(questionOrQuery, { ...options, root });
    const input = prepareAdapterInput(queryResult, profile, options);
    const requestedMode = options.mode || contract.default_mode || DEFAULT_MODE;
    let adapterOutput;

    if (requestedMode === 'mock') {
        adapterOutput = makeMockOutput(input);
    } else if (requestedMode === 'local' || requestedMode === 'auto') {
        adapterOutput = await runLocalRuntimeOutput(input, profile, { ...options, root });
    } else if (requestedMode === 'rulebased') {
        adapterOutput = makeRuleBasedOutput(input, profile);
    } else {
        throw new Error(`Unknown context adapter mode: ${requestedMode}`);
    }
    validateAdapterOutputs(input, adapterOutput);
    const evidenceMode = makeAdapterEvidenceMode(input, adapterOutput, requestedMode);

    const result = {
        contract: CONTEXT_ADAPTER_RESULT_CONTRACT,
        schema_version: 1,
        generated_at: new Date().toISOString(),
        question: input.question,
        profile: profile.id,
        requestedMode,
        mode: adapterOutput.mode,
        runtime: adapterOutput.runtime,
        fallbackUsed: adapterOutput.fallbackUsed,
        fallbackReason: adapterOutput.fallbackReason,
        evidenceMode,
        quality: {
            sourceOfTruth: false,
            claimStatus: evidenceMode.claimStatus,
            sourceBackedFactCount: evidenceMode.sourceBackedFactCount,
            confidenceCounts: evidenceMode.confidenceCounts,
            uncertainties: evidenceMode.uncertainties,
        },
        pipeline: [
            { stage: 'graph-rag-query', output: queryResult.contract },
            { stage: 'adapter-input-budget', output: input.stats },
            { stage: 'context-adapter', output: adapterOutput.mode },
        ],
        input: {
            queryContract: input.queryContract,
            queryGeneratedAt: input.queryGeneratedAt,
            chunks: input.chunks.map((chunk) => ({
                id: chunk.id,
                path: chunk.path,
                lineStart: chunk.lineStart,
                lineEnd: chunk.lineEnd,
                estimatedTokens: chunk.estimatedTokens,
                sourceClass: chunk.sourceClass,
            })),
            budget: input.stats,
        },
        outputs: adapterOutput.outputs,
        safety: {
            readOnly: true,
            sourceOfTruth: false,
            localAiSourceOfTruth: false,
            graphRagBlocked: false,
            writesOnlyWhenRequested: true,
        },
        attempts: adapterOutput.attempts || [],
    };

    if (options.write || options.outPath) {
        result.writtenPath = await writeJson(root, requestedWritePath, result);
    }
    return result;
}

function parseCliArgs(argv) {
    const options = {
        json: false,
        write: false,
        includeConditional: [],
        questionParts: [],
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
        } else if (arg === '--question' || arg === '-q') {
            options.questionParts.push(argv[index + 1]);
            index += 1;
        } else if (arg === '--query') {
            options.queryPath = argv[index + 1];
            index += 1;
        } else if (arg === '--mode') {
            options.mode = argv[index + 1];
            index += 1;
        } else if (arg === '--profile') {
            options.profileId = argv[index + 1];
            index += 1;
        } else if (arg === '--contract') {
            options.contractPath = argv[index + 1];
            index += 1;
        } else if (arg === '--source-contract') {
            options.sourceContractPath = argv[index + 1];
            index += 1;
        } else if (arg === '--index') {
            options.indexPath = argv[index + 1];
            index += 1;
        } else if (arg === '--graph') {
            options.graphPath = argv[index + 1];
            index += 1;
        } else if (arg === '--coverage') {
            options.coveragePath = argv[index + 1];
            index += 1;
        } else if (arg === '--include-conditional') {
            options.includeConditional.push(argv[index + 1]);
            index += 1;
        } else if (arg === '--max-chunks') {
            options.maxChunks = Number(argv[index + 1]);
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
        } else if (arg === '--strict-local') {
            options.strictLocal = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg.startsWith('--')) {
            throw new Error(`Unknown argument: ${arg}`);
        } else {
            options.questionParts.push(arg);
        }
    }
    return options;
}

function usage() {
    process.stdout.write(
        'Usage:\n'
        + '  node scripts/graph-rag-context-adapter.mjs "question" [--json] [--mode rulebased|mock|local|auto]\n'
        + '  node scripts/graph-rag-context-adapter.mjs --query tmp/graph-rag/graph-rag-query.json [--write]\n'
    );
}

async function runCli(argv = process.argv.slice(2)) {
    const cliOptions = parseCliArgs(argv);
    if (cliOptions.help) {
        usage();
        return;
    }
    const question = cliOptions.questionParts.join(' ').trim();
    if (!question && !cliOptions.queryPath) {
        usage();
        process.exitCode = 1;
        return;
    }
    const result = await runGraphRagContextAdapter(question || null, cliOptions);
    if (cliOptions.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
    }
    process.stdout.write([
        `Graph-RAG context adapter: ${result.mode}`,
        `Profile: ${result.profile}`,
        `Chunks: ${result.input.budget.chunksSelected}/${result.input.budget.chunksAvailable}; estimated input tokens: ${result.input.budget.estimatedInputTokens}`,
        `Evidence: ${result.evidenceMode.actualMode}; claim status: ${result.quality.claimStatus}; source of truth: no`,
        `Fallback used: ${result.fallbackUsed ? 'yes' : 'no'}`,
        `Output: ${result.writtenPath || 'stdout only'}`,
    ].join('\n') + '\n');
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
    runCli().catch((error) => {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exitCode = 1;
    });
}

export {
    CONTEXT_ADAPTER_PROFILE_CONTRACT,
    CONTEXT_ADAPTER_RESULT_CONTRACT,
    CONTRACT_PATH,
    loadContextAdapterProfilesContract,
    prepareAdapterInput,
    runGraphRagContextAdapter,
    validateContextAdapterProfilesContract,
};
