import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
    resolveMapToolsRequestPath,
    startMapToolsServer,
} = require('../electron/map-tools/server.cjs');

async function writeFixtureFile(rootDir, relativePath, content) {
    const filePath = path.join(rootDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
}

test('map tools server serves only map viewers and generated map datasets', async (t) => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'curvios-map-tools-'));
    await writeFixtureFile(rootDir, 'tools/plan-map/index.html', '<!doctype html><title>Plan</title>');
    await writeFixtureFile(rootDir, 'tools/repo-map/index.html', '<!doctype html><title>Repo</title>');
    await writeFixtureFile(rootDir, 'tools/plan-map/viewer.js', 'export {};');
    await writeFixtureFile(rootDir, 'tmp/plan-map/plan-map.json', '{"contract":"curvios.plan-map.v1"}');
    await writeFixtureFile(rootDir, 'secret.txt', 'nope');

    const server = await startMapToolsServer({ rootDir, port: 0 });
    t.after(async () => {
        await server.close();
        await fs.rm(rootDir, { recursive: true, force: true });
    });

    const planResponse = await fetch(`${server.url}/tools/plan-map/index.html`);
    assert.equal(planResponse.status, 200);
    assert.match(planResponse.headers.get('content-type') || '', /text\/html/);

    const jsonResponse = await fetch(`${server.url}/tmp/plan-map/plan-map.json`);
    assert.equal(jsonResponse.status, 200);
    assert.match(await jsonResponse.text(), /curvios\.plan-map\.v1/);

    const blockedResponse = await fetch(`${server.url}/secret.txt`);
    assert.equal(blockedResponse.status, 403);

    const traversalResponse = await fetch(`${server.url}/tools/plan-map/../../secret.txt`);
    assert.equal(traversalResponse.status, 403);
});

test('map tools request resolver defaults to Plan Map and rejects non-map paths', async () => {
    const rootDir = path.resolve('C:/repo');
    assert.equal(
        path.relative(rootDir, resolveMapToolsRequestPath(rootDir, '/') || '').replace(/\\/g, '/'),
        'tools/plan-map/index.html',
    );
    assert.equal(resolveMapToolsRequestPath(rootDir, '/package.json'), null);
    assert.equal(resolveMapToolsRequestPath(rootDir, '/tmp/other/tool.json'), null);
});

test('map tools app is wired as a separate Electron entry with native menu actions', async () => {
    const rootPackage = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
    const electronPackage = JSON.parse(await fs.readFile(new URL('../electron/package.json', import.meta.url), 'utf8'));
    const mainSource = await fs.readFile(new URL('../electron/map-tools/main.cjs', import.meta.url), 'utf8');

    assert.equal(rootPackage.scripts['app:maps:start'], 'npm --prefix electron run start:maps');
    assert.equal(electronPackage.scripts['start:maps'], 'node map-tools/launch.cjs');
    assert.ok(electronPackage.build.files.includes('map-tools/**/*'));
    assert.match(mainSource, /Menu\.setApplicationMenu\(buildApplicationMenu\(\)\)/);
    assert.match(mainSource, /CURVIOS_NODE_EXECUTABLE/);
    assert.match(mainSource, /scripts\/export-plan-map\.mjs/);
    assert.match(mainSource, /scripts\/export-repo-map\.mjs/);
});
