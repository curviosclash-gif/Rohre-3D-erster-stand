import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import {
    loadLocalLlmSelectionContract,
    runLocalLlmSmokeCheck,
    validateLocalLlmSelectionContract,
} from '../scripts/graph-rag-local-llm-check.mjs';

async function createFixtureServer(handler) {
    const server = http.createServer(handler);
    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        }),
    };
}

async function readRequestBody(request) {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
}

test('local LLM selection contract defines optional runtimes, roles and fallback rules', async () => {
    const contract = await loadLocalLlmSelectionContract();
    validateLocalLlmSelectionContract(contract);

    assert.deepEqual(contract.runtime_priority, ['ollama', 'llama-cpp', 'rulebased']);
    assert.equal(contract.runtimes.find((runtime) => runtime.id === 'ollama').required, false);
    assert.equal(contract.runtimes.find((runtime) => runtime.id === 'rulebased').kind, 'local-fallback');

    const roles = new Set(contract.model_roles.map((role) => role.id));
    assert.ok(roles.has('fast-rerank'));
    assert.ok(roles.has('summary'));
    assert.ok(roles.has('fact-extract'));
    assert.ok(roles.has('fallback-rulebased'));
    assert.ok(contract.installation_guidance.every((entry) => entry.user_action_only === true));
});

test('local LLM smoke check passes through rulebased fallback when no model is available', async () => {
    const server = await createFixtureServer((request, response) => {
        if (request.url === '/api/tags') {
            sendJson(response, 200, { models: [] });
            return;
        }
        sendJson(response, 404, { error: 'unexpected path' });
    });

    try {
        const result = await runLocalLlmSmokeCheck({
            runtimeId: 'ollama',
            baseUrl: server.baseUrl,
            timeoutMs: 500,
        });

        assert.equal(result.contract, 'knowledge-graph.local-llm-smoke.v1');
        assert.equal(result.status, 'pass');
        assert.equal(result.mode, 'rulebased-fallback');
        assert.equal(result.fallbackUsed, true);
        assert.equal(result.fallbackReason, 'model-missing');
        assert.equal(result.checks.graphRagBlocked, false);
        assert.equal(result.output.fixture_id, 'graph-rag-local-llm-smoke');
    } finally {
        await server.close();
    }
});

test('local LLM smoke check accepts parseable Ollama JSON output', async () => {
    const server = await createFixtureServer(async (request, response) => {
        if (request.url === '/api/tags') {
            sendJson(response, 200, { models: [{ name: 'fixture-model' }] });
            return;
        }
        if (request.url === '/api/generate' && request.method === 'POST') {
            const body = JSON.parse(await readRequestBody(request));
            assert.equal(body.model, 'fixture-model');
            sendJson(response, 200, {
                response: JSON.stringify({
                    fixture_id: 'graph-rag-local-llm-smoke',
                    verdict: 'pass',
                    reason: 'fixture ok',
                }),
            });
            return;
        }
        sendJson(response, 404, { error: 'unexpected path' });
    });

    try {
        const result = await runLocalLlmSmokeCheck({
            runtimeId: 'ollama',
            baseUrl: server.baseUrl,
            model: 'fixture-model',
            timeoutMs: 1000,
        });

        assert.equal(result.status, 'pass');
        assert.equal(result.mode, 'local-runtime');
        assert.equal(result.fallbackUsed, false);
        assert.equal(result.runtime.id, 'ollama');
        assert.equal(result.runtime.model, 'fixture-model');
        assert.equal(result.checks.outputParseable, true);
    } finally {
        await server.close();
    }
});

test('local LLM smoke check falls back when runtime output is not parseable JSON', async () => {
    const server = await createFixtureServer(async (request, response) => {
        if (request.url === '/api/tags') {
            sendJson(response, 200, { models: [{ name: 'fixture-model' }] });
            return;
        }
        if (request.url === '/api/generate' && request.method === 'POST') {
            await readRequestBody(request);
            sendJson(response, 200, { response: 'not-json' });
            return;
        }
        sendJson(response, 404, { error: 'unexpected path' });
    });

    try {
        const result = await runLocalLlmSmokeCheck({
            runtimeId: 'ollama',
            baseUrl: server.baseUrl,
            model: 'fixture-model',
            timeoutMs: 1000,
        });

        assert.equal(result.status, 'pass');
        assert.equal(result.fallbackUsed, true);
        assert.equal(result.fallbackReason, 'invalid-json');
        assert.equal(result.attempts[0].status, 'invalid-json');
        assert.equal(result.checks.graphRagBlocked, false);
    } finally {
        await server.close();
    }
});
