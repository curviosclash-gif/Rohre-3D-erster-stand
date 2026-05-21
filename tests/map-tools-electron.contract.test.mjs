import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

import { buildKnowledgeGraph } from '../scripts/build-knowledge-graph.mjs';

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
    await writeFixtureFile(rootDir, 'tools/agent-map/index.html', '<!doctype html><title>Agent</title>');
    await writeFixtureFile(rootDir, 'tools/plan-map/viewer.js', 'export {};');
    await writeFixtureFile(rootDir, 'tmp/plan-map/plan-map.json', '{"contract":"curvios.plan-map.v1"}');
    await writeFixtureFile(rootDir, 'tmp/agent-map/agent-map.json', '{"contract":"curvios.agent-map.v1"}');
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

    const agentJsonResponse = await fetch(`${server.url}/tmp/agent-map/agent-map.json`);
    assert.equal(agentJsonResponse.status, 200);
    assert.match(await agentJsonResponse.text(), /curvios\.agent-map\.v1/);

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
    const preloadSource = await fs.readFile(new URL('../electron/map-tools/preload.cjs', import.meta.url), 'utf8');
    const shellHtml = await fs.readFile(new URL('../electron/map-tools/ui/map-tools.html', import.meta.url), 'utf8');
    const shellCss = await fs.readFile(new URL('../electron/map-tools/ui/map-tools.css', import.meta.url), 'utf8');
    const rendererSource = await fs.readFile(new URL('../electron/map-tools/ui/map-tools-renderer.js', import.meta.url), 'utf8');
    const planMapHtml = await fs.readFile(new URL('../tools/plan-map/index.html', import.meta.url), 'utf8');
    const planMapSource = await fs.readFile(new URL('../tools/plan-map/viewer.js', import.meta.url), 'utf8');

    assert.equal(rootPackage.scripts['app:maps:start'], 'npm --prefix electron run start:maps');
    assert.equal(rootPackage.scripts['app:maps:smoke'], 'node --test tests/map-tools-electron-smoke.test.mjs');
    assert.equal(electronPackage.scripts['start:maps'], 'node map-tools/launch.cjs');
    assert.ok(electronPackage.build.files.includes('map-tools/**/*'));
    assert.match(mainSource, /Menu\.setApplicationMenu\(buildApplicationMenu\(\)\)/);
    assert.match(mainSource, /map-tools:view-requested/);
    assert.match(mainSource, /map-tools:refresh-requested/);
    assert.match(mainSource, /CURVIOS_NODE_EXECUTABLE/);
    assert.match(mainSource, /scripts\/export-plan-map\.mjs/);
    assert.match(mainSource, /scripts\/export-repo-map\.mjs/);
    assert.match(mainSource, /scripts\/export-agent-map\.mjs/);
    assert.match(preloadSource, /mapToolsApi/);
    assert.match(preloadSource, /map-tools-preload\.v1/);
    assert.match(rendererSource, /#errorPanel/);
    assert.match(rendererSource, /mapFrame/);
    assert.match(shellHtml, /id="infoToggle"/);
    assert.match(shellHtml, /id="helpPopover"/);
    assert.match(shellCss, /\.map-tools-shell\.info-hidden/);
    assert.match(rendererSource, /function setInfoVisible/);
    assert.match(rendererSource, /curvios\.map-tools:set-help-visible/);
    assert.match(rendererSource, /Agent Map/);
    assert.match(planMapHtml, /data-view="intake"/);
    assert.match(planMapHtml, /id="intakeClassificationFilter"/);
    assert.match(planMapSource, /function renderIntakeView/);
    assert.match(planMapSource, /intakePlans/);
});

test('map tools and repo map are represented in the knowledge graph mapping source', async () => {
    const mapping = JSON.parse(
        await fs.readFile(new URL('../data/contracts/knowledge-graph/map-tools-electron.v1.json', import.meta.url), 'utf8')
    );
    assert.equal(mapping.contract, 'knowledge-graph.mapping.v1');
    assert.equal(mapping.mapping_id, 'map-tools-electron');

    const graph = await buildKnowledgeGraph();
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const edges = new Set(graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.type}`));

    for (const nodeId of [
        'runtime:map-tools-electron-shell',
        'runtime:map-tools-renderer',
        'runtime:map-tools-static-server',
        'runtime:repo-map-export',
        'runtime:repo-map-viewer',
        'state:repo-map-readonly-dataset',
        'state:agent-map-readonly-dataset',
        'test:map-tools-electron-smoke',
    ]) {
        assert.ok(nodes.has(nodeId), `${nodeId} missing`);
    }

    assert.equal(nodes.get('runtime:map-tools-electron-shell').attributes.mappingId, 'map-tools-electron');
    assert.ok(edges.has('runtime:repo-map-export->state:repo-map-readonly-dataset:writes_state'));
    assert.ok(edges.has('runtime:map-tools-renderer->state:plan-map-readonly-dataset:reads_state'));
    assert.ok(edges.has('runtime:map-tools-renderer->state:agent-map-readonly-dataset:reads_state'));
    assert.ok(edges.has('runtime:map-tools-electron-shell->test:map-tools-electron-smoke:validated_by'));
});
