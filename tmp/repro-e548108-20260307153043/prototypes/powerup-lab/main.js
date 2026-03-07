import { PowerupLabApp } from './src/PowerupLabApp.js';

const canvas = document.getElementById('lab-canvas');

try {
    const app = new PowerupLabApp(canvas);
    app.start();
    window.powerupLabApp = app;
} catch (error) {
    console.error('[PowerupLab] Startup failed', error);
    const overlay = document.createElement('pre');
    overlay.textContent = `Powerup Lab konnte nicht gestartet werden.\n\n${String(error?.stack || error)}`;
    overlay.style.position = 'fixed';
    overlay.style.inset = '12px';
    overlay.style.padding = '12px';
    overlay.style.margin = '0';
    overlay.style.overflow = 'auto';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.color = '#ffb3b3';
    overlay.style.border = '1px solid rgba(255,100,100,0.4)';
    overlay.style.borderRadius = '10px';
    document.body.appendChild(overlay);
}
