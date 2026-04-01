import { spawn } from 'node:child_process';

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['playwright', 'test', ...process.argv.slice(2)];
const env = {
    ...process.env,
    PW_PREWARM: process.env.PW_PREWARM || '0',
};

const child = spawn(executable, args, {
    stdio: 'inherit',
    env,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 1);
});
