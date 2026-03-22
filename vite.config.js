import { defineConfig } from 'vite';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { parseMapJSON, toArenaMapDefinition } from './src/entities/MapSchema.js';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const buildTime = new Date().toISOString();
const buildId = Date.now().toString(36).toUpperCase();
const CHUNK_SIZE_WARNING_LIMIT_KB = 800;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_EDITOR_MAP_KEY_PREFIX = 'editor_';
const DEFAULT_EDITOR_DISK_MAP_NAME = 'Editor Map';
const EDITOR_MAP_NAME_MAX_LENGTH = 80;
const EDITOR_MAP_DIR = path.resolve(__dirname, 'data', 'maps');
const GENERATED_LOCAL_MAPS_MODULE_PATH = path.resolve(__dirname, 'src', 'entities', 'GeneratedLocalMaps.js');
const EDITOR_JSON_SUFFIX = '.editor.json';
const RUNTIME_JSON_SUFFIX = '.runtime.json';

const LEGACY_EDITOR_PLAYTEST_SCALE = 35;
const LEGACY_EDITOR_LARGE_DIM_THRESHOLD = 500;
const RUNTIME_MAP_SCALE = 3;

const GENERATED_EDITOR_VEHICLE_KEY_PREFIX = 'editor_vehicle_';
const DEFAULT_EDITOR_VEHICLE_NAME = 'Custom Vehicle';
const VEHICLE_NAME_MAX_LENGTH = 80;
const VEHICLE_CONFIG_DIR = path.resolve(__dirname, 'data', 'vehicles');
const GENERATED_VEHICLE_CONFIGS_MODULE_PATH = path.resolve(__dirname, 'js', 'entities', 'GeneratedVehicleConfigs.js');
const VEHICLE_CONFIG_SUFFIX = '.vehicle.json';
const DEFAULT_GENERATED_VEHICLE_HITBOX_RADIUS = 1.2;

function createJsonResponse(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

function readRequestBody(req, maxBytes = 5 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let total = 0;
        const chunks = [];

        req.on('data', (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                reject(new Error('Request body too large.'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf-8'));
        });

        req.on('error', reject);
    });
}

function readVideoBody(req, maxBytes = 500 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let total = 0;
        const chunks = [];

        req.on('data', (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
                reject(new Error('Video too large.'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            resolve(Buffer.concat(chunks));
        });

        req.on('error', reject);
    });
}

function getEditorDiskConversionScale(mapDocument) {
    const width = Number(mapDocument?.arenaSize?.width);
    const height = Number(mapDocument?.arenaSize?.height);
    const depth = Number(mapDocument?.arenaSize?.depth);
    const maxDim = Math.max(
        Number.isFinite(width) ? width : 0,
        Number.isFinite(height) ? height : 0,
        Number.isFinite(depth) ? depth : 0
    );

    if (maxDim >= LEGACY_EDITOR_LARGE_DIM_THRESHOLD && RUNTIME_MAP_SCALE < LEGACY_EDITOR_PLAYTEST_SCALE) {
        return LEGACY_EDITOR_PLAYTEST_SCALE;
    }

    return RUNTIME_MAP_SCALE;
}

function sanitizeMapName(value) {
    if (typeof value !== 'string') return DEFAULT_EDITOR_DISK_MAP_NAME;
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) return DEFAULT_EDITOR_DISK_MAP_NAME;
    return normalized.slice(0, EDITOR_MAP_NAME_MAX_LENGTH);
}

function slugifyForKey(value, fallback = 'item', maxLength = 48) {
    const ascii = String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const slug = ascii
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLength);

    return slug || fallback;
}

function slugifyMapNameToKeyBase(mapName) {
    const safeSlug = slugifyForKey(mapName, 'map', 48);
    return `${GENERATED_EDITOR_MAP_KEY_PREFIX}${safeSlug}`;
}

function sanitizeVehicleName(value) {
    if (typeof value !== 'string') return DEFAULT_EDITOR_VEHICLE_NAME;
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) return DEFAULT_EDITOR_VEHICLE_NAME;
    return normalized.slice(0, VEHICLE_NAME_MAX_LENGTH);
}

function slugifyVehicleNameToKeyBase(vehicleName) {
    const safeSlug = slugifyForKey(vehicleName, 'vehicle', 48);
    return `${GENERATED_EDITOR_VEHICLE_KEY_PREFIX}${safeSlug}`;
}

function getEditorSchemaPathForKey(mapKey) {
    return path.resolve(EDITOR_MAP_DIR, `${mapKey}${EDITOR_JSON_SUFFIX}`);
}

function getRuntimeMapPathForKey(mapKey) {
    return path.resolve(EDITOR_MAP_DIR, `${mapKey}${RUNTIME_JSON_SUFFIX}`);
}

function safeReadJson(filePath) {
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
        return null;
    }
}

function getExistingRuntimeMapByKey(mapKey) {
    const filePath = getRuntimeMapPathForKey(mapKey);
    if (!existsSync(filePath)) return null;
    return safeReadJson(filePath);
}

function resolveGeneratedMapKey(mapName) {
    const sanitizedName = sanitizeMapName(mapName);
    const baseKey = slugifyMapNameToKeyBase(sanitizedName);

    let candidateKey = baseKey;
    let index = 2;

    while (true) {
        const existing = getExistingRuntimeMapByKey(candidateKey);
        if (!existing) {
            return { mapKey: candidateKey, overwritten: false, mapName: sanitizedName };
        }

        const existingName = sanitizeMapName(existing?.name || '');
        if (existingName === sanitizedName) {
            return { mapKey: candidateKey, overwritten: true, mapName: sanitizedName };
        }

        candidateKey = `${baseKey}_${index++}`;
    }
}

function loadGeneratedRuntimeMapsFromDisk() {
    if (!existsSync(EDITOR_MAP_DIR)) {
        return {};
    }

    const files = readdirSync(EDITOR_MAP_DIR)
        .filter((fileName) => fileName.endsWith(RUNTIME_JSON_SUFFIX))
        .sort((a, b) => a.localeCompare(b));

    const maps = {};
    for (const fileName of files) {
        const mapKey = fileName.slice(0, -RUNTIME_JSON_SUFFIX.length);
        if (!mapKey.startsWith(GENERATED_EDITOR_MAP_KEY_PREFIX)) continue;

        const runtimeMap = safeReadJson(path.resolve(EDITOR_MAP_DIR, fileName));
        if (!runtimeMap || typeof runtimeMap !== 'object') continue;
        maps[mapKey] = runtimeMap;
    }

    return maps;
}

function writeGeneratedLocalMapsModule() {
    const payload = loadGeneratedRuntimeMapsFromDisk();

    const fileContent = `// Auto-generated by the editor disk-save API. Do not edit manually.\n` +
        `export const GENERATED_LOCAL_MAPS = ${JSON.stringify(payload, null, 2)};\n\n` +
        `export default GENERATED_LOCAL_MAPS;\n`;

    writeFileSync(GENERATED_LOCAL_MAPS_MODULE_PATH, fileContent, 'utf-8');
}

function saveEditorMapToDisk({ jsonText, mapName }) {
    const parsed = parseMapJSON(jsonText);
    const resolved = resolveGeneratedMapKey(mapName);
    const conversionScale = getEditorDiskConversionScale(parsed.map);
    const converted = toArenaMapDefinition(parsed.map, {
        mapScale: conversionScale,
        name: resolved.mapName,
    });

    const editorSchemaPath = getEditorSchemaPathForKey(resolved.mapKey);
    const runtimeMapPath = getRuntimeMapPathForKey(resolved.mapKey);

    mkdirSync(EDITOR_MAP_DIR, { recursive: true });
    writeFileSync(editorSchemaPath, JSON.stringify(parsed.map, null, 2), 'utf-8');
    writeFileSync(runtimeMapPath, JSON.stringify(converted.map, null, 2), 'utf-8');
    writeGeneratedLocalMapsModule();

    return {
        mapKey: resolved.mapKey,
        mapName: converted.map?.name || resolved.mapName,
        overwritten: resolved.overwritten,
        editorSchemaPath: path.relative(__dirname, editorSchemaPath).replace(/\\/g, '/'),
        runtimeMapPath: path.relative(__dirname, runtimeMapPath).replace(/\\/g, '/'),
        generatedModulePath: path.relative(__dirname, GENERATED_LOCAL_MAPS_MODULE_PATH).replace(/\\/g, '/'),
        warnings: [...(parsed.warnings || []), ...(converted.warnings || [])],
    };
}

function getVehicleConfigPathForKey(vehicleId) {
    return path.resolve(VEHICLE_CONFIG_DIR, `${vehicleId}${VEHICLE_CONFIG_SUFFIX}`);
}

function getExistingVehicleConfigByKey(vehicleId) {
    const filePath = getVehicleConfigPathForKey(vehicleId);
    if (!existsSync(filePath)) return null;
    return safeReadJson(filePath);
}

function sanitizeVehicleConfig(raw, fallbackName) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const label = sanitizeVehicleName(source.label || fallbackName);
    const primaryColorRaw = Number(source.primaryColor);
    const primaryColor = Number.isFinite(primaryColorRaw)
        ? Math.max(0, Math.min(0xffffff, Math.trunc(primaryColorRaw)))
        : 0x60a5fa;
    const parts = Array.isArray(source.parts) ? source.parts : [];

    return {
        ...source,
        label,
        primaryColor,
        parts
    };
}

function resolveGeneratedVehicleKey(vehicleName) {
    const sanitizedName = sanitizeVehicleName(vehicleName);
    const baseKey = slugifyVehicleNameToKeyBase(sanitizedName);

    let candidateKey = baseKey;
    let index = 2;

    while (true) {
        const existing = getExistingVehicleConfigByKey(candidateKey);
        if (!existing) {
            return { vehicleId: candidateKey, overwritten: false, vehicleName: sanitizedName };
        }

        const existingName = sanitizeVehicleName(existing?.label || existing?.name || '');
        if (existingName === sanitizedName) {
            return { vehicleId: candidateKey, overwritten: true, vehicleName: sanitizedName };
        }

        candidateKey = `${baseKey}_${index++}`;
    }
}

function estimateGeneratedVehicleHitboxRadius(vehicleConfig) {
    let maxCandidate = 0;

    const visit = (part) => {
        if (!part || typeof part !== 'object') return;
        const pos = Array.isArray(part.pos) ? part.pos : [0, 0, 0];
        const size = Array.isArray(part.size) && part.size.length > 0 ? part.size : [1, 1, 1];
        const scale = Array.isArray(part.scale) && part.scale.length > 0 ? part.scale : [1, 1, 1];

        const maxPos = Math.max(Math.abs(Number(pos[0]) || 0), Math.abs(Number(pos[1]) || 0), Math.abs(Number(pos[2]) || 0));
        const maxSize = Math.max(...size.map((v) => Math.abs(Number(v) || 0)), 1);
        const maxScale = Math.max(...scale.map((v) => Math.abs(Number(v) || 0)), 1);
        maxCandidate = Math.max(maxCandidate, maxPos + (maxSize * maxScale));

        if (Array.isArray(part.children)) {
            part.children.forEach(visit);
        }
    };

    if (Array.isArray(vehicleConfig?.parts)) {
        vehicleConfig.parts.forEach(visit);
    }

    if (maxCandidate <= 0) return DEFAULT_GENERATED_VEHICLE_HITBOX_RADIUS;
    const estimated = maxCandidate / 6;
    return Math.max(0.6, Math.min(2.5, Number(estimated.toFixed(2))));
}

function loadGeneratedVehicleConfigsFromDisk() {
    if (!existsSync(VEHICLE_CONFIG_DIR)) {
        return [];
    }

    const files = readdirSync(VEHICLE_CONFIG_DIR)
        .filter((fileName) => fileName.endsWith(VEHICLE_CONFIG_SUFFIX))
        .sort((a, b) => a.localeCompare(b));

    const vehicles = [];
    for (const fileName of files) {
        const vehicleId = fileName.slice(0, -VEHICLE_CONFIG_SUFFIX.length);
        if (!vehicleId.startsWith(GENERATED_EDITOR_VEHICLE_KEY_PREFIX)) continue;

        const configRaw = safeReadJson(path.resolve(VEHICLE_CONFIG_DIR, fileName));
        if (!configRaw || typeof configRaw !== 'object') continue;

        const config = sanitizeVehicleConfig(configRaw, DEFAULT_EDITOR_VEHICLE_NAME);
        vehicles.push({
            id: vehicleId,
            label: String(config.label || vehicleId),
            hitbox: { radius: estimateGeneratedVehicleHitboxRadius(config) },
            config
        });
    }

    return vehicles;
}

function isGeneratedVehicleId(vehicleId) {
    return typeof vehicleId === 'string' && vehicleId.startsWith(GENERATED_EDITOR_VEHICLE_KEY_PREFIX);
}

function ensureGeneratedVehicleIdEditable(vehicleId) {
    if (!isGeneratedVehicleId(vehicleId)) {
        throw new Error('Standard vehicles are read-only and cannot be modified.');
    }
}

function listSavedVehicleConfigs() {
    return loadGeneratedVehicleConfigsFromDisk().map((entry) => ({
        id: entry.id,
        label: entry.label,
        readOnly: false
    }));
}

function getVehicleConfigFromDisk({ vehicleId }) {
    ensureGeneratedVehicleIdEditable(vehicleId);

    const sourcePath = getVehicleConfigPathForKey(vehicleId);
    if (!existsSync(sourcePath)) {
        throw new Error(`Vehicle "${vehicleId}" was not found.`);
    }

    const configRaw = safeReadJson(sourcePath);
    if (!configRaw || typeof configRaw !== 'object') {
        throw new Error(`Vehicle "${vehicleId}" config is invalid.`);
    }

    const config = sanitizeVehicleConfig(configRaw, DEFAULT_EDITOR_VEHICLE_NAME);
    return {
        vehicleId,
        vehicleLabel: config.label,
        config
    };
}

function writeGeneratedVehicleConfigsModule() {
    const payload = loadGeneratedVehicleConfigsFromDisk();
    const fileContent = `// Auto-generated by the vehicle editor disk-save API. Do not edit manually.\n` +
        `export const GENERATED_VEHICLE_CONFIGS = ${JSON.stringify(payload, null, 2)};\n\n` +
        `export default GENERATED_VEHICLE_CONFIGS;\n`;

    writeFileSync(GENERATED_VEHICLE_CONFIGS_MODULE_PATH, fileContent, 'utf-8');
}

function saveVehicleConfigToDisk({ jsonText, vehicleName }) {
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (error) {
        throw new Error(`Invalid vehicle JSON: ${error.message}`);
    }

    const resolved = resolveGeneratedVehicleKey(vehicleName);
    const config = sanitizeVehicleConfig(parsed, resolved.vehicleName);
    config.label = resolved.vehicleName;

    const vehicleConfigPath = getVehicleConfigPathForKey(resolved.vehicleId);
    mkdirSync(VEHICLE_CONFIG_DIR, { recursive: true });
    writeFileSync(vehicleConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    writeGeneratedVehicleConfigsModule();

    return {
        vehicleId: resolved.vehicleId,
        vehicleLabel: config.label,
        overwritten: resolved.overwritten,
        vehicleConfigPath: path.relative(__dirname, vehicleConfigPath).replace(/\\/g, '/'),
        generatedModulePath: path.relative(__dirname, GENERATED_VEHICLE_CONFIGS_MODULE_PATH).replace(/\\/g, '/'),
    };
}

function renameVehicleConfigOnDisk({ vehicleId, vehicleName }) {
    ensureGeneratedVehicleIdEditable(vehicleId);

    const sourcePath = getVehicleConfigPathForKey(vehicleId);
    if (!existsSync(sourcePath)) {
        throw new Error(`Vehicle "${vehicleId}" was not found.`);
    }

    const sourceConfig = safeReadJson(sourcePath);
    if (!sourceConfig || typeof sourceConfig !== 'object') {
        throw new Error(`Vehicle "${vehicleId}" config is invalid.`);
    }

    const saveResult = saveVehicleConfigToDisk({
        jsonText: JSON.stringify(sourceConfig),
        vehicleName
    });

    if (saveResult.vehicleId !== vehicleId) {
        rmSync(sourcePath, { force: true });
        writeGeneratedVehicleConfigsModule();
    }

    return {
        previousVehicleId: vehicleId,
        ...saveResult
    };
}

function deleteVehicleConfigFromDisk({ vehicleId }) {
    ensureGeneratedVehicleIdEditable(vehicleId);

    const sourcePath = getVehicleConfigPathForKey(vehicleId);
    if (!existsSync(sourcePath)) {
        throw new Error(`Vehicle "${vehicleId}" was not found.`);
    }

    rmSync(sourcePath, { force: true });
    writeGeneratedVehicleConfigsModule();

    return {
        vehicleId,
        deleted: true,
        generatedModulePath: path.relative(__dirname, GENERATED_VEHICLE_CONFIGS_MODULE_PATH).replace(/\\/g, '/'),
    };
}

function editorDiskSaveApiPlugin() {
    const mapRoutePath = '/api/editor/save-map-disk';
    const vehicleRoutePath = '/api/editor/save-vehicle-disk';
    const listVehiclesRoutePath = '/api/editor/list-vehicles-disk';
    const getVehicleRoutePath = '/api/editor/get-vehicle-disk';
    const renameVehicleRoutePath = '/api/editor/rename-vehicle-disk';
    const deleteVehicleRoutePath = '/api/editor/delete-vehicle-disk';
    const videoRoutePath = '/api/editor/save-video-disk';

    const registerMiddleware = (middlewares) => {
        middlewares.use(async (req, res, next) => {
            const reqPath = String(req.url || '').split('?')[0];
            const isMapSave = req.method === 'POST' && reqPath === mapRoutePath;
            const isVehicleSave = req.method === 'POST' && reqPath === vehicleRoutePath;
            const isVehicleList = req.method === 'GET' && reqPath === listVehiclesRoutePath;
            const isVehicleGet = req.method === 'GET' && reqPath === getVehicleRoutePath;
            const isVehicleRename = req.method === 'POST' && reqPath === renameVehicleRoutePath;
            const isVehicleDelete = req.method === 'POST' && reqPath === deleteVehicleRoutePath;
            const isVideoSave = req.method === 'POST' && reqPath === videoRoutePath;

            if (!isMapSave && !isVehicleSave && !isVehicleList && !isVehicleGet && !isVehicleRename && !isVehicleDelete && !isVideoSave) {
                next();
                return;
            }

            try {
                if (isVideoSave) {
                    const fileNameHeader = req.headers['x-file-name'];
                    if (!fileNameHeader) {
                        createJsonResponse(res, 400, { ok: false, error: 'x-file-name header required' });
                        return;
                    }
                    const safeName = String(fileNameHeader).replace(/[^a-zA-Z0-9.\-_/]/g, '');
                    const videoDir = path.resolve(__dirname, path.dirname(safeName));
                    const outPath = path.resolve(__dirname, safeName);

                    if (!existsSync(videoDir)) {
                        mkdirSync(videoDir, { recursive: true });
                    }

                    const buffer = await readVideoBody(req);
                    writeFileSync(outPath, buffer);
                    createJsonResponse(res, 200, { ok: true, file: safeName });
                    return;
                }
                if (isVehicleList) {
                    createJsonResponse(res, 200, {
                        ok: true,
                        vehicles: listSavedVehicleConfigs(),
                    });
                    return;
                }
                if (isVehicleGet) {
                    const urlObj = new URL(req.url || '', 'http://localhost');
                    const vehicleId = String(urlObj.searchParams.get('vehicleId') || '').trim();
                    if (!vehicleId) {
                        createJsonResponse(res, 400, { ok: false, error: 'vehicleId is required.' });
                        return;
                    }
                    createJsonResponse(res, 200, {
                        ok: true,
                        ...getVehicleConfigFromDisk({ vehicleId })
                    });
                    return;
                }

                const rawBody = await readRequestBody(req);
                const body = JSON.parse(rawBody || '{}');
                const jsonText = typeof body?.jsonText === 'string' ? body.jsonText : '';
                const mapName = typeof body?.mapName === 'string' ? body.mapName : '';
                const vehicleName = typeof body?.vehicleName === 'string' ? body.vehicleName : '';
                const vehicleId = typeof body?.vehicleId === 'string' ? body.vehicleId.trim() : '';

                if ((isMapSave || isVehicleSave) && !jsonText.trim()) {
                    createJsonResponse(res, 400, { ok: false, error: 'jsonText is required.' });
                    return;
                }

                const result = isMapSave
                    ? saveEditorMapToDisk({ jsonText, mapName })
                    : isVehicleSave
                        ? saveVehicleConfigToDisk({ jsonText, vehicleName })
                        : isVehicleRename
                            ? renameVehicleConfigOnDisk({ vehicleId, vehicleName })
                            : deleteVehicleConfigFromDisk({ vehicleId });
                createJsonResponse(res, 200, { ok: true, ...result });
            } catch (error) {
                createJsonResponse(res, 500, {
                    ok: false,
                    error: error?.message || 'Unknown disk save error.',
                });
            }
        });
    };

    return {
        name: 'editor-disk-save-api',
        configureServer(server) {
            registerMiddleware(server.middlewares);
        },
        configurePreviewServer(server) {
            registerMiddleware(server.middlewares);
        },
    };
}

function latestCheckpointApiPlugin() {
    const CHECKPOINT_API_PATH = '/api/bot/latest-checkpoint';
    const LATEST_INDEX_PATH = path.resolve(__dirname, 'data', 'training', 'runs', 'latest.json');

    function resolveCheckpointFromIndex() {
        const indexJson = safeReadJson(LATEST_INDEX_PATH);
        const checkpointRelPath = indexJson?.artifacts?.checkpoint?.path
            || indexJson?.checkpointPath
            || null;
        if (typeof checkpointRelPath !== 'string' || !checkpointRelPath.trim()) return null;
        const absPath = path.resolve(__dirname, checkpointRelPath.trim());
        if (!existsSync(absPath)) return null;
        const raw = safeReadJson(absPath);
        if (!raw) return null;
        if (raw.checkpoint && typeof raw.checkpoint === 'object') return raw.checkpoint;
        if (raw.contractVersion === 'v35-dqn-checkpoint-v1' || raw.contractVersion === 'v34-dqn-checkpoint-v1') return raw;
        return null;
    }

    const registerMiddleware = (middlewares) => {
        middlewares.use((req, res, next) => {
            const reqPath = String(req.url || '').split('?')[0];
            if (req.method !== 'GET' || reqPath !== CHECKPOINT_API_PATH) {
                next();
                return;
            }
            const checkpoint = resolveCheckpointFromIndex();
            if (!checkpoint) {
                createJsonResponse(res, 404, { ok: false, error: 'no-checkpoint-available' });
                return;
            }
            createJsonResponse(res, 200, { ok: true, checkpoint });
        });
    };

    return {
        name: 'latest-checkpoint-api',
        configureServer(server) {
            registerMiddleware(server.middlewares);
        },
        configurePreviewServer(server) {
            registerMiddleware(server.middlewares);
        },
    };
}

function trainingDashboardApiPlugin() {
    const TRAINING_RUNS_DIR = path.resolve(__dirname, 'data', 'training', 'runs');
    const TRAINING_MODELS_DIR = path.resolve(__dirname, 'data', 'training', 'models');
    const SCHEDULE_CONFIG_PATH = path.resolve(__dirname, 'data', 'training', 'schedule.json');
    const MAX_OUTPUT_LINES = 500;

    let trainingProcess = null;
    let wsClients = new Set();
    let scheduledTimer = null;
    let scheduledConfig = null;

    function broadcast(msg) {
        const json = JSON.stringify(msg);
        for (const ws of wsClients) {
            try { ws.send(json); } catch { /* ignore */ }
        }
    }

    function appendOutputLine(source, text) {
        if (!trainingProcess) return;
        const lines = String(text).split(/\r?\n/);
        for (const line of lines) {
            if (!line) continue;
            const entry = { i: trainingProcess.outputLines.length, t: Date.now(), s: source, text: line };
            trainingProcess.outputLines.push(entry);
            broadcast({ type: 'line', ...entry });
        }
        if (trainingProcess.outputLines.length > MAX_OUTPUT_LINES) {
            trainingProcess.outputLines = trainingProcess.outputLines.slice(-MAX_OUTPUT_LINES);
        }
    }

    function buildCliArgs(config) {
        const args = [];
        if (config.episodes) args.push('--episodes', String(config.episodes));
        if (config.modes) args.push('--modes', String(config.modes));
        if (config.seed) args.push('--seeds', String(config.seed));
        if (config.resumeCheckpoint) args.push('--resume-checkpoint', String(config.resumeCheckpoint));
        if (config.maxSteps) args.push('--max-steps', String(config.maxSteps));
        return args;
    }

    function spawnTraining(config, onExit) {
        const cliArgs = buildCliArgs(config);
        const npmArgs = ['run', 'training:e2e'];
        if (cliArgs.length > 0) npmArgs.push('--', ...cliArgs);

        const child = spawn('npm', npmArgs, {
            shell: true,
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env },
        });

        child.stdout?.on('data', (data) => appendOutputLine('stdout', data.toString()));
        child.stderr?.on('data', (data) => appendOutputLine('stderr', data.toString()));
        child.on('exit', (code) => {
            const exitCode = Number.isInteger(code) ? code : 1;
            if (trainingProcess && trainingProcess.child === child) {
                trainingProcess.exitCode = exitCode;
                broadcast({ type: 'done', exitCode, mode: trainingProcess.mode });
            }
            if (typeof onExit === 'function') onExit(exitCode);
        });
        child.on('error', (err) => {
            appendOutputLine('stderr', `[spawn error] ${err.message}`);
            if (trainingProcess && trainingProcess.child === child) {
                trainingProcess.exitCode = 1;
                broadcast({ type: 'done', exitCode: 1, mode: trainingProcess.mode });
            }
            if (typeof onExit === 'function') onExit(1);
        });

        return child;
    }

    function startSingle(config) {
        trainingProcess = {
            child: null, startedAt: Date.now(), outputLines: [], exitCode: null,
            pid: null, mode: 'single', config, shouldContinue: true, loopIteration: 0,
            curriculumStage: null, curriculumIndex: 0, curriculumTotal: 0,
        };
        const child = spawnTraining(config, () => {
            broadcast({ type: 'status', running: false, mode: 'single', exitCode: trainingProcess?.exitCode });
        });
        trainingProcess.child = child;
        trainingProcess.pid = child.pid;
        broadcast({ type: 'status', running: true, mode: 'single' });
    }

    function startLoop(config) {
        trainingProcess = {
            child: null, startedAt: Date.now(), outputLines: [], exitCode: null,
            pid: null, mode: 'loop', config, shouldContinue: true, loopIteration: 1,
            curriculumStage: null, curriculumIndex: 0, curriculumTotal: 0,
        };

        function launchIteration() {
            const iterConfig = trainingProcess.loopIteration > 1
                ? { ...config, resumeCheckpoint: 'latest' }
                : config;
            appendOutputLine('system', `--- Loop Iteration ${trainingProcess.loopIteration} ---`);
            broadcast({ type: 'loop-restart', iteration: trainingProcess.loopIteration });

            const child = spawnTraining(iterConfig, (exitCode) => {
                if (exitCode === 0 && trainingProcess?.shouldContinue) {
                    trainingProcess.loopIteration++;
                    trainingProcess.exitCode = null;
                    launchIteration();
                } else {
                    broadcast({ type: 'status', running: false, mode: 'loop', exitCode });
                }
            });
            trainingProcess.child = child;
            trainingProcess.pid = child.pid;
        }

        broadcast({ type: 'status', running: true, mode: 'loop' });
        launchIteration();
    }

    function startCurriculum(stages) {
        trainingProcess = {
            child: null, startedAt: Date.now(), outputLines: [], exitCode: null,
            pid: null, mode: 'curriculum', config: {}, shouldContinue: true, loopIteration: 0,
            curriculumStage: null, curriculumIndex: 0, curriculumTotal: stages.length,
        };

        let stageIdx = 0;
        function runNextStage() {
            if (stageIdx >= stages.length || !trainingProcess?.shouldContinue) {
                broadcast({ type: 'status', running: false, mode: 'curriculum', exitCode: trainingProcess?.exitCode ?? 0 });
                return;
            }
            const stage = stages[stageIdx];
            trainingProcess.curriculumStage = stage.name || `stage-${stageIdx + 1}`;
            trainingProcess.curriculumIndex = stageIdx;
            appendOutputLine('system', `--- Curriculum Stage ${stageIdx + 1}/${stages.length}: ${stage.name || 'unnamed'} ---`);
            broadcast({ type: 'curriculum-stage', stage: stage.name, index: stageIdx, total: stages.length });

            const stageConfig = {
                episodes: stage.episodes || 20,
                modes: stage.modes || 'classic-3d',
                maxSteps: stage.maxSteps || '',
                resumeCheckpoint: stageIdx > 0 ? 'latest' : (stage.resumeCheckpoint || ''),
            };

            const child = spawnTraining(stageConfig, (exitCode) => {
                if (exitCode === 0 && trainingProcess?.shouldContinue) {
                    stageIdx++;
                    runNextStage();
                } else {
                    trainingProcess.exitCode = exitCode;
                    broadcast({ type: 'status', running: false, mode: 'curriculum', exitCode });
                }
            });
            trainingProcess.child = child;
            trainingProcess.pid = child.pid;
        }

        broadcast({ type: 'status', running: true, mode: 'curriculum' });
        runNextStage();
    }

    function isRunning() {
        return trainingProcess && trainingProcess.child && trainingProcess.exitCode === null;
    }

    function loadRunArtifacts(runDir) {
        const run = safeReadJson(path.resolve(runDir, 'run.json'));
        const evalData = safeReadJson(path.resolve(runDir, 'eval.json'));
        const gate = safeReadJson(path.resolve(runDir, 'gate.json'));
        const trainer = safeReadJson(path.resolve(runDir, 'trainer.json'));
        return { run, eval: evalData, gate, trainer };
    }

    function resolveStatusPayload(stampFilter) {
        const latestPath = path.resolve(TRAINING_RUNS_DIR, 'latest.json');
        const latest = safeReadJson(latestPath);
        if (!latest) return { ok: true, stamp: null, run: null, eval: null, gate: null, trainer: null, checkpoint: null, training: getTrainingState() };

        const stamp = stampFilter || latest.stamp;
        const runDir = path.resolve(TRAINING_RUNS_DIR, stamp);
        const artifacts = loadRunArtifacts(runDir);

        const checkpointPath = latest?.artifacts?.checkpoint?.path;
        const checkpointExists = checkpointPath ? existsSync(path.resolve(__dirname, checkpointPath)) : false;
        const checkpointRaw = checkpointExists ? safeReadJson(path.resolve(__dirname, checkpointPath)) : null;
        const hasData = !!(checkpointRaw?.checkpoint && typeof checkpointRaw.checkpoint === 'object')
            || checkpointRaw?.contractVersion === 'v35-dqn-checkpoint-v1'
            || checkpointRaw?.contractVersion === 'v34-dqn-checkpoint-v1';

        // Extract KPIs from run
        let runPayload = null;
        if (artifacts.run) {
            runPayload = {
                kpis: artifacts.run.summary?.kpis || null,
                totals: {
                    episodesTotal: artifacts.run.summary?.episodesTotal ?? 0,
                    stepsTotal: artifacts.run.summary?.stepsTotal ?? 0,
                    elapsedMs: artifacts.run.summary?.elapsedMs ?? 0,
                },
                episodes: artifacts.run.summary?.episodes || [],
            };
        }

        // Extract eval domains
        let evalPayload = null;
        if (artifacts.eval) {
            const episodes = artifacts.eval.summary?.episodes || artifacts.eval.episodes || [];
            const domains = {};
            for (const ep of episodes) {
                const d = ep.domainId || 'unknown';
                if (!domains[d]) domains[d] = { count: 0, totalReturn: 0, wins: 0 };
                domains[d].count++;
                domains[d].totalReturn += ep.episodeReturn || 0;
                if (ep.done && ep.terminalReason?.includes?.('win')) domains[d].wins++;
            }
            const domainSummary = {};
            for (const [d, v] of Object.entries(domains)) {
                domainSummary[d] = { count: v.count, avgReturn: v.count > 0 ? v.totalReturn / v.count : 0, winRate: v.count > 0 ? v.wins / v.count : 0 };
            }
            evalPayload = { domains: domainSummary, episodes };
        }

        // Gate
        let gatePayload = null;
        if (artifacts.gate) {
            gatePayload = {
                status: artifacts.gate.passed === true ? 'pass' : artifacts.gate.passed === false ? 'fail' : 'unknown',
                checks: artifacts.gate.checks || artifacts.gate.criteria || [],
            };
        }

        // Trainer
        let trainerPayload = null;
        if (artifacts.trainer) {
            const eps = artifacts.trainer.episodes || [];
            const lastEp = eps.length > 0 ? eps[eps.length - 1] : {};
            trainerPayload = {
                episodeCount: eps.length,
                latestEpsilon: lastEp.epsilon ?? null,
                latestReplayFill: lastEp.replayFill ?? null,
                latestLoss: lastEp.avgLoss ?? null,
            };
        }

        return {
            ok: true,
            stamp,
            generatedAt: latest.generatedAt,
            lastCompletedStage: latest.lastCompletedStage,
            run: runPayload,
            eval: evalPayload,
            gate: gatePayload,
            trainer: trainerPayload,
            checkpoint: { exists: checkpointExists, hasData, path: checkpointPath || null },
            training: getTrainingState(),
        };
    }

    function getTrainingState() {
        if (!trainingProcess) return { running: false, pid: null, mode: null, loopIteration: 0, exitCode: null };
        return {
            running: isRunning(),
            pid: trainingProcess.pid,
            mode: trainingProcess.mode,
            loopIteration: trainingProcess.loopIteration,
            exitCode: trainingProcess.exitCode,
            startedAt: trainingProcess.startedAt,
            elapsedMs: trainingProcess.startedAt ? Date.now() - trainingProcess.startedAt : 0,
            curriculumStage: trainingProcess.curriculumStage,
            curriculumIndex: trainingProcess.curriculumIndex,
            curriculumTotal: trainingProcess.curriculumTotal,
        };
    }

    function resolveHistory() {
        if (!existsSync(TRAINING_RUNS_DIR)) return { ok: true, runs: [] };
        const dirs = readdirSync(TRAINING_RUNS_DIR).filter(d => /^\d{8}T\d{6}Z$/.test(d)).sort().reverse();
        const runs = [];
        for (const stamp of dirs.slice(0, 50)) {
            const runJson = safeReadJson(path.resolve(TRAINING_RUNS_DIR, stamp, 'run.json'));
            const gateJson = safeReadJson(path.resolve(TRAINING_RUNS_DIR, stamp, 'gate.json'));
            runs.push({
                stamp,
                kpis: runJson?.summary?.kpis || null,
                episodes: runJson?.summary?.episodesTotal ?? 0,
                avgReturn: runJson?.summary?.kpis?.episodeReturnMean ?? null,
                gateStatus: gateJson?.passed === true ? 'pass' : gateJson?.passed === false ? 'fail' : null,
            });
        }
        return { ok: true, runs };
    }

    function loadScheduleConfig() {
        const raw = safeReadJson(SCHEDULE_CONFIG_PATH);
        if (raw && raw.enabled) {
            scheduledConfig = { enabled: true, intervalHours: raw.intervalHours || 6, config: raw.config || {} };
        }
    }

    function saveScheduleConfig() {
        if (!scheduledConfig) return;
        mkdirSync(path.dirname(SCHEDULE_CONFIG_PATH), { recursive: true });
        writeFileSync(SCHEDULE_CONFIG_PATH, JSON.stringify(scheduledConfig, null, 2), 'utf-8');
    }

    function setupScheduledTimer() {
        if (scheduledTimer) { clearInterval(scheduledTimer); scheduledTimer = null; }
        if (!scheduledConfig?.enabled) return;
        const ms = (scheduledConfig.intervalHours || 6) * 3600000;
        scheduledTimer = setInterval(() => {
            if (!isRunning()) startSingle(scheduledConfig.config || {});
        }, ms);
    }

    const registerMiddleware = (middlewares) => {
        middlewares.use(async (req, res, next) => {
            const reqPath = String(req.url || '').split('?')[0];
            const urlParams = new URL(req.url || '', 'http://localhost').searchParams;

            if (req.method === 'GET' && reqPath === '/api/training/status') {
                const stamp = urlParams.get('stamp') || null;
                createJsonResponse(res, 200, resolveStatusPayload(stamp));
                return;
            }

            if (req.method === 'GET' && reqPath === '/api/training/history') {
                createJsonResponse(res, 200, resolveHistory());
                return;
            }

            if (req.method === 'GET' && reqPath === '/api/training/progress') {
                const since = parseInt(urlParams.get('since') || '0', 10) || 0;
                const lines = trainingProcess ? trainingProcess.outputLines.filter(l => l.i >= since) : [];
                createJsonResponse(res, 200, {
                    ok: true,
                    ...getTrainingState(),
                    lines,
                    totalLines: trainingProcess ? trainingProcess.outputLines.length : 0,
                });
                return;
            }

            if (req.method === 'POST' && reqPath === '/api/training/start') {
                if (isRunning()) {
                    createJsonResponse(res, 409, { ok: false, error: 'already-running', pid: trainingProcess.pid });
                    return;
                }
                try {
                    const rawBody = await readRequestBody(req);
                    const body = JSON.parse(rawBody || '{}');
                    const mode = String(body.mode || 'single').toLowerCase();

                    if (mode === 'loop') {
                        startLoop(body);
                    } else if (mode === 'curriculum') {
                        const stages = Array.isArray(body.curriculum) ? body.curriculum : [
                            { name: 'Navigate', episodes: 20, modes: 'classic-3d', maxSteps: 5000 },
                            { name: 'Combat', episodes: 20, modes: 'classic-3d,hunt-3d', maxSteps: 10000 },
                            { name: 'Full', episodes: 20, modes: 'classic-3d,classic-2d,hunt-3d,hunt-2d', maxSteps: 15000 },
                        ];
                        startCurriculum(stages);
                    } else {
                        startSingle(body);
                    }
                    createJsonResponse(res, 200, { ok: true, pid: trainingProcess.pid, mode: trainingProcess.mode });
                } catch (err) {
                    createJsonResponse(res, 500, { ok: false, error: err.message });
                }
                return;
            }

            if (req.method === 'POST' && reqPath === '/api/training/stop') {
                if (!trainingProcess || !isRunning()) {
                    createJsonResponse(res, 200, { ok: true, message: 'not-running' });
                    return;
                }
                trainingProcess.shouldContinue = false;
                try { trainingProcess.child.kill(); } catch { /* ignore */ }
                appendOutputLine('system', '--- Training stopped by user ---');
                createJsonResponse(res, 200, { ok: true });
                return;
            }

            if (req.method === 'POST' && reqPath === '/api/training/schedule') {
                try {
                    const rawBody = await readRequestBody(req);
                    const body = JSON.parse(rawBody || '{}');
                    scheduledConfig = {
                        enabled: !!body.enabled,
                        intervalHours: Math.max(0.01, Number(body.intervalHours) || 6),
                        config: body.config || {},
                    };
                    saveScheduleConfig();
                    setupScheduledTimer();
                    createJsonResponse(res, 200, {
                        ok: true,
                        scheduled: {
                            enabled: scheduledConfig.enabled,
                            intervalHours: scheduledConfig.intervalHours,
                            nextRunAt: scheduledConfig.enabled
                                ? new Date(Date.now() + scheduledConfig.intervalHours * 3600000).toISOString()
                                : null,
                        },
                    });
                } catch (err) {
                    createJsonResponse(res, 500, { ok: false, error: err.message });
                }
                return;
            }

            next();
        });
    };

    return {
        name: 'training-dashboard-api',
        configureServer(server) {
            registerMiddleware(server.middlewares);
            loadScheduleConfig();
            setupScheduledTimer();

            // WebSocket upgrade
            const wss = new WebSocketServer({ noServer: true });
            server.httpServer?.on('upgrade', (request, socket, head) => {
                const url = new URL(request.url || '', 'http://localhost');
                if (url.pathname !== '/ws/training') return;
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wsClients.add(ws);
                    ws.on('close', () => wsClients.delete(ws));
                    ws.on('error', () => wsClients.delete(ws));
                    // Send current state immediately
                    try { ws.send(JSON.stringify({ type: 'status', ...getTrainingState() })); } catch { /* ignore */ }
                });
            });

            // Cleanup on server close
            const cleanup = () => {
                if (scheduledTimer) { clearInterval(scheduledTimer); scheduledTimer = null; }
                if (trainingProcess?.child && trainingProcess.exitCode === null) {
                    try { trainingProcess.child.kill(); } catch { /* ignore */ }
                }
            };
            process.on('exit', cleanup);
            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);
        },
        configurePreviewServer(server) {
            registerMiddleware(server.middlewares);
        },
    };
}

export default defineConfig({
    plugins: [editorDiskSaveApiPlugin(), latestCheckpointApiPlugin(), trainingDashboardApiPlugin()],
    build: {
        chunkSizeWarningLimit: CHUNK_SIZE_WARNING_LIMIT_KB,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id) return undefined;
                    if (id.includes('node_modules/three/examples/jsm/loaders/OBJLoader.js') ||
                        id.includes('node_modules/three/examples/jsm/loaders/MTLLoader.js')) {
                        return 'three-loaders';
                    }
                    if (id.includes('node_modules/three')) {
                        return 'three-core';
                    }
                    const normalizedId = id.replace(/\\/g, '/');
                    if (normalizedId.includes('/entities/ai/training/') ||
                        normalizedId.includes('/state/training/')) {
                        return 'training';
                    }
                    if (normalizedId.includes('/state/validation/')) {
                        return 'validation';
                    }
                    if (normalizedId.includes('/trainer/') && !normalizedId.includes('node_modules')) {
                        return 'trainer';
                    }
                    if (normalizedId.includes('/state/recorder/')) {
                        return 'recorder';
                    }
                    if (normalizedId.includes('/config/maps/MapPresetCatalog') ||
                        normalizedId.includes('/config/maps/MapPresetCatalogBaseData') ||
                        normalizedId.includes('/config/maps/MapPresetCatalogExpertData') ||
                        normalizedId.includes('/config/maps/MapPresetCatalogLarge') ||
                        normalizedId.includes('/config/maps/presets/')) {
                        return 'map-presets';
                    }
                    if (normalizedId.includes('/menu/MenuTelemetryDashboard') ||
                        normalizedId.includes('/menu/MenuTelemetryStore') ||
                        normalizedId.includes('/state/TelemetryHistoryStore')) {
                        return 'developer-ui';
                    }
                    return undefined;
                },
            },
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
        __BUILD_TIME__: JSON.stringify(buildTime),
        __BUILD_ID__: JSON.stringify(buildId),
        /**
         * APP_MODE: 'web' (join-only, canHost=false) or 'app' (Electron, canHost=true) (C.3).
         * Set via: npm run build:web (--mode web) or npm run build:app (--mode app).
         * Vite loads .env.web or .env.app respectively, setting VITE_APP_MODE.
         */
        __APP_MODE__: JSON.stringify(process.env.VITE_APP_MODE || 'web'),

        /**
         * Network / WebRTC configuration.
         * VITE_SIGNALING_URL: WebSocket URL for online signaling (e.g. wss://myserver.com:9090)
         * VITE_TURN_URL:        TURN server URL   (e.g. turn:myserver.com:3478)
         * VITE_TURN_USER:       TURN username (preferred)
         * VITE_TURN_USERNAME:   TURN username (legacy alias)
         * VITE_TURN_CREDENTIAL: TURN credential/password
         */
        __SIGNALING_URL__: JSON.stringify(process.env.VITE_SIGNALING_URL || ''),
        __TURN_URL__: JSON.stringify(process.env.VITE_TURN_URL || ''),
        __TURN_USERNAME__: JSON.stringify(process.env.VITE_TURN_USER || process.env.VITE_TURN_USERNAME || ''),
        __TURN_CREDENTIAL__: JSON.stringify(process.env.VITE_TURN_CREDENTIAL || ''),
    },
});
