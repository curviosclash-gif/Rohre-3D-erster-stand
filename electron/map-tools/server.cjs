const http = require('node:http');
const path = require('node:path');
const { createReadStream, existsSync } = require('node:fs');
const { access, constants: fsConstants } = require('node:fs/promises');

const MIME_TYPES = Object.freeze({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
});

const ALLOWED_PREFIXES = Object.freeze([
    'tools/repo-map/',
    'tools/plan-map/',
    'tmp/repo-map/',
    'tmp/plan-map/',
]);

const CSP_HEADER = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
].join('; ');

function sendText(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
}

function normalizeRequestPath(urlPath) {
    const decodedPath = decodeURIComponent(String(urlPath || '/').split('?')[0]);
    const normalized = path
        .normalize(decodedPath === '/' ? '/tools/plan-map/index.html' : decodedPath)
        .replace(/^([/\\])+/, '')
        .replace(/\\/g, '/');
    return normalized;
}

function isAllowedMapToolsPath(normalizedPath) {
    return ALLOWED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function resolveMapToolsRequestPath(rootDir, urlPath) {
    const normalizedPath = normalizeRequestPath(urlPath);
    if (!isAllowedMapToolsPath(normalizedPath)) {
        return null;
    }

    const resolvedRoot = path.resolve(rootDir);
    const resolvedPath = path.resolve(resolvedRoot, normalizedPath);
    if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
        return null;
    }
    return resolvedPath;
}

function createMapToolsRequestHandler(rootDir) {
    const resolvedRoot = path.resolve(rootDir);
    return async (req, res) => {
        try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            const filePath = resolveMapToolsRequestPath(resolvedRoot, requestUrl.pathname || '/');
            if (!filePath) {
                sendText(res, 403, '403 - Zugriff verweigert');
                return;
            }

            try {
                await access(filePath, fsConstants.R_OK);
            } catch {
                sendText(res, 404, '404 - Nicht gefunden');
                return;
            }

            const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
            const headers = { 'Content-Type': contentType };
            if (contentType.startsWith('text/html')) {
                headers['Content-Security-Policy'] = CSP_HEADER;
            }
            res.writeHead(200, headers);
            const stream = createReadStream(filePath);
            stream.on('error', () => {
                if (!res.headersSent) {
                    sendText(res, 500, '500 - Interner Serverfehler');
                } else {
                    res.end();
                }
            });
            stream.pipe(res);
        } catch {
            if (!res.headersSent) {
                sendText(res, 500, '500 - Interner Serverfehler');
            }
        }
    };
}

function closeServer(server) {
    return new Promise((resolve) => {
        try {
            server.close(() => resolve());
        } catch {
            resolve();
        }
    });
}

async function startMapToolsServer({ rootDir, host = '127.0.0.1', port = 0 }) {
    const resolvedRoot = path.resolve(rootDir);
    if (!existsSync(path.join(resolvedRoot, 'tools', 'repo-map', 'index.html'))) {
        throw new Error(`Repo-Map-Viewer fehlt: ${path.join(resolvedRoot, 'tools', 'repo-map', 'index.html')}`);
    }
    if (!existsSync(path.join(resolvedRoot, 'tools', 'plan-map', 'index.html'))) {
        throw new Error(`Plan-Map-Viewer fehlt: ${path.join(resolvedRoot, 'tools', 'plan-map', 'index.html')}`);
    }

    const server = http.createServer(createMapToolsRequestHandler(resolvedRoot));
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            server.removeListener('error', reject);
            resolve();
        });
    });

    const address = server.address();
    const actualPort = address && typeof address === 'object' ? address.port : port;
    return {
        host,
        port: actualPort,
        server,
        url: `http://${host}:${actualPort}`,
        close: () => closeServer(server),
    };
}

module.exports = {
    ALLOWED_PREFIXES,
    createMapToolsRequestHandler,
    isAllowedMapToolsPath,
    resolveMapToolsRequestPath,
    startMapToolsServer,
};
