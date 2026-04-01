import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_OUT_DIR = '.codex_tmp/game-only-export';

const COPY_ENTRIES = Object.freeze([
    { source: 'dist', target: 'dist' },
    { source: 'data/maps', target: 'data/maps' },
    { source: 'data/vehicles', target: 'data/vehicles' },
    { source: 'electron/launch.cjs', target: 'electron/launch.cjs' },
    { source: 'electron/main.cjs', target: 'electron/main.cjs' },
    { source: 'electron/preload.cjs', target: 'electron/preload.cjs' },
    { source: 'electron/static-server.cjs', target: 'electron/static-server.cjs' },
    { source: 'electron/package.json', target: 'electron/package.json' },
    { source: 'electron/package-lock.json', target: 'electron/package-lock.json' },
    { source: 'server/lan-signaling.js', target: 'server/lan-signaling.js' },
    { source: 'server/signaling-server.js', target: 'server/signaling-server.js' },
    { source: 'src/shared/contracts', target: 'src/shared/contracts' },
]);

function parseOutDir(argv) {
    const outFlagIndex = argv.indexOf('--out');
    if (outFlagIndex >= 0 && argv[outFlagIndex + 1]) {
        return argv[outFlagIndex + 1];
    }
    return DEFAULT_OUT_DIR;
}

function assertSourceExists(repoRoot, relativePath) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`Required export source is missing: ${relativePath}`);
    }
    return absolutePath;
}

function copyEntry(repoRoot, outDir, { source, target }) {
    const sourcePath = assertSourceExists(repoRoot, source);
    const targetPath = path.resolve(outDir, target);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    cpSync(sourcePath, targetPath, { recursive: true, force: true });
}

function writeGeneratedFiles(outDir) {
    const readme = [
        '# CurviosClash Game-Only',
        '',
        'Dieses Repository wird automatisch aus dem Hauptrepository gespiegelt und enthaelt die volle Desktop-Spielversion, aber ohne Doku, Tests, Training und sonstigen Entwicklungsballast.',
        '',
        '## Start',
        '',
        '1. Node.js LTS installieren.',
        '2. `start_game.bat` ausfuehren.',
        '',
        'Alternativ im Terminal:',
        '',
        '```bash',
        'npm --prefix electron install',
        'npm --prefix electron start',
        '```',
        '',
        '## Enthalten',
        '',
        '- `dist/`: fertig gebauter Desktop-Renderer',
        '- `data/maps/` und `data/vehicles/`: Laufzeitdaten fuer Spielinhalte',
        '- `electron/`: Desktop-Launcher und Electron-Konfiguration',
        '- `server/`: LAN-Signaling fuer Multiplayer',
        '- `src/shared/contracts/`: geteilte Runtime-Contracts fuer den Host-Modus',
        '',
        'Quelle: https://github.com/curviosclash-gif/Rohre-3D-erster-stand',
    ].join('\n');

    const startBat = [
        '@echo off',
        'setlocal',
        'set "ROOT=%~dp0"',
        'if not exist "%ROOT%electron\\node_modules\\electron\\dist\\electron.exe" (',
        '  echo Installiere Desktop-Runtime...',
        '  call npm --prefix "%ROOT%electron" install',
        '  if errorlevel 1 exit /b %errorlevel%',
        ')',
        'call npm --prefix "%ROOT%electron" start',
        'exit /b %errorlevel%',
    ].join('\r\n');

    const gitignore = [
        'electron/node_modules/',
        'release/',
        'npm-debug.log*',
    ].join('\n');

    writeFileSync(path.resolve(outDir, 'README.md'), `${readme}\n`, 'utf8');
    writeFileSync(path.resolve(outDir, 'start_game.bat'), `${startBat}\r\n`, 'utf8');
    writeFileSync(path.resolve(outDir, '.gitignore'), `${gitignore}\n`, 'utf8');
}

function main() {
    const repoRoot = process.cwd();
    const requestedOutDir = parseOutDir(process.argv.slice(2));
    const outDir = path.resolve(repoRoot, requestedOutDir);

    assertSourceExists(repoRoot, 'dist');

    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    for (const entry of COPY_ENTRIES) {
        copyEntry(repoRoot, outDir, entry);
    }

    writeGeneratedFiles(outDir);

    process.stdout.write(`${path.relative(repoRoot, outDir).replace(/\\/g, '/')}\n`);
}

main();
