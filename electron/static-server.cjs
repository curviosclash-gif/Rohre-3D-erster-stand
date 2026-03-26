const http = require('node:http');
const path = require('node:path');
const { createReadStream, existsSync } = require('node:fs');

const MIME_TYPES = Object.freeze({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
});

function sendText(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
}

function toFilePath(rootDir, requestPath) {
    const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
    const resolvedRoot = path.resolve(rootDir);
    const resolvedPath = path.resolve(rootDir, `.${normalizedPath}`);

    if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
        return null;
    }

    return resolvedPath;
}

function createStaticRequestHandler(rootDir) {
    return (req, res) => {
        try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            const filePath = toFilePath(rootDir, decodeURIComponent(requestUrl.pathname || '/'));

            if (!filePath) {
                sendText(res, 403, '403 - Zugriff verweigert');
                return;
            }

            if (!existsSync(filePath)) {
                sendText(res, 404, '404 - Nicht gefunden');
                return;
            }

            const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            createReadStream(filePath).pipe(res);
        } catch {
            sendText(res, 500, '500 - Interner Serverfehler');
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

async function startStaticServer({ rootDir, host = '127.0.0.1', port = 0 }) {
    const resolvedRoot = path.resolve(rootDir);
    const indexPath = path.join(resolvedRoot, 'index.html');

    if (!existsSync(indexPath)) {
        throw new Error(`Desktop-App-Build fehlt: ${indexPath}`);
    }

    const server = http.createServer(createStaticRequestHandler(resolvedRoot));

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
    startStaticServer,
};
