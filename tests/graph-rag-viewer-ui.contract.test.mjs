import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

import { chromium } from '@playwright/test';

const ROOT = process.cwd();
const FIXTURE_PATH = path.join(ROOT, 'data/contracts/knowledge-graph/graph-rag-viewer-fixture.v1.json');
const MIME_TYPES = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
]);

function serveWorkspace() {
    const server = http.createServer(async (request, response) => {
        try {
            const relativePath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).replace(/^\/+/, '');
            const absolutePath = path.resolve(ROOT, relativePath || 'tools/graph-rag-viewer/index.html');
            if (!absolutePath.startsWith(`${ROOT}${path.sep}`)) {
                response.writeHead(403);
                response.end('Forbidden');
                return;
            }
            const body = await fs.readFile(absolutePath);
            response.writeHead(200, { 'content-type': MIME_TYPES.get(path.extname(absolutePath)) || 'application/octet-stream' });
            response.end(body);
        } catch {
            response.writeHead(404);
            response.end('Not found');
        }
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ server, url: `http://127.0.0.1:${port}/tools/graph-rag-viewer/index.html` });
        });
    });
}

async function setViewerJson(page, name, data) {
    await page.locator('#fileInput').setInputFiles({
        name,
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(data)),
    });
}

async function expectError(page, message) {
    await page.waitForFunction((expected) => document.querySelector('#errorBanner')?.textContent.includes(expected), message);
}

test('viewer UI smoke renders fixture, safety, fallback and Ask Repo evidence', async (t) => {
    const { server, url } = await serveWorkspace();
    const browser = await chromium.launch({ headless: true });
    t.after(async () => {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    });
    const page = await browser.newPage();
    await page.goto(url);
    await page.getByRole('button', { name: 'Fixture laden', exact: true }).click();
    await page.waitForSelector('#dashboard:not([hidden])');

    assert.match(await page.locator('#statusStrip').textContent(), /READ-ONLY/);
    assert.match(await page.locator('#statusStrip').textContent(), /LLM FALLBACK/);

    await page.getByRole('button', { name: 'Critical Paths', exact: true }).click();
    assert.match(await page.locator('#criticalPathsView').textContent(), /spawn/);

    await page.getByRole('button', { name: 'Evidence', exact: true }).click();
    assert.ok(await page.locator('#evidenceView .evidence-card').count() > 0);

    await page.getByRole('button', { name: 'Safety', exact: true }).click();
    assert.match(await page.locator('#safetyView').textContent(), /Raw included\s*no/);

    await page.getByRole('button', { name: 'Ask Repo', exact: true }).click();
    await page.getByRole('button', { name: 'Chat-Fixture laden', exact: true }).click();
    await page.waitForSelector('#askRepoView .chat-response');
    assert.match(await page.locator('#askRepoView').textContent(), /Explain this answer/);
    assert.match(await page.locator('#askRepoView').textContent(), /fallback-rulebased/);
});

test('viewer UI rejects unsafe inputs and marks historical-only evidence', async (t) => {
    const { server, url } = await serveWorkspace();
    const browser = await chromium.launch({ headless: true });
    t.after(async () => {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    });
    const fixture = JSON.parse(await fs.readFile(FIXTURE_PATH, 'utf8'));
    const page = await browser.newPage();
    await page.goto(url);

    await setViewerJson(page, 'invalid-contract.json', { ...fixture, contract: 'invalid.viewer.contract' });
    await expectError(page, 'Nicht unterstuetzter Contract');

    await setViewerJson(page, 'missing-evidence.json', { ...fixture, evidence: undefined });
    await expectError(page, 'Feld "evidence" fehlt');

    await setViewerJson(page, 'unsafe-raw.json', {
        ...fixture,
        safety: { ...fixture.safety, mode: 'unsafe-raw', rawIncluded: true },
    });
    await expectError(page, 'Viewer akzeptiert nur default-redacted Exporte');

    const historicalFixture = {
        ...fixture,
        evidence: {
            ...fixture.evidence,
            claims: fixture.evidence.claims.map((claim) => ({ ...claim, historical: true })),
        },
        safety: { ...fixture.safety, historicalVisible: true },
    };
    await setViewerJson(page, 'historical-only.json', historicalFixture);
    await page.getByRole('button', { name: 'Evidence', exact: true }).click();
    assert.equal(
        await page.locator('#evidenceView .evidence-card.is-historical').count(),
        historicalFixture.evidence.claims.length,
    );
    assert.match(await page.locator('#statusStrip').textContent(), /HISTORICAL SOURCES/);
});

test('viewer and chat surfaces keep write actions outside the static UI', async () => {
    const [indexSource, viewerSource, chatSource] = await Promise.all([
        fs.readFile(path.join(ROOT, 'tools/graph-rag-viewer/index.html'), 'utf8'),
        fs.readFile(path.join(ROOT, 'tools/graph-rag-viewer/viewer.js'), 'utf8'),
        fs.readFile(path.join(ROOT, 'scripts/graph-rag-chat.mjs'), 'utf8'),
    ]);
    assert.doesNotMatch(indexSource, />\s*(?:Apply|Save|Write|Install|Download)\s*</i);
    assert.doesNotMatch(viewerSource, /\b(?:localStorage|sessionStorage|indexedDB)\b/);
    assert.match(chatSource, /tmp\/graph-rag\/chat\//);
    assert.match(chatSource, /writesAllowed:\s*false/);
    assert.doesNotMatch(chatSource, /docs\/plaene\/aktiv\/.*writeFile|data\/contracts\/.*writeFile/);
});
