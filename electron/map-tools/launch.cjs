const { spawn } = require('node:child_process');
const path = require('node:path');
const electronBinary = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.CURVIOS_NODE_EXECUTABLE = process.execPath;

const mainEntry = path.resolve(__dirname, 'main.cjs');
const repoRoot = path.resolve(__dirname, '..', '..');
const child = spawn(electronBinary, [mainEntry], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
});

child.on('exit', (code) => {
    process.exit(code ?? 0);
});

child.on('error', (error) => {
    console.error(error);
    process.exit(1);
});
