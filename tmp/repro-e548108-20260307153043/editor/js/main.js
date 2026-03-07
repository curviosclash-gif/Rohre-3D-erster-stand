import { EditorCore } from './EditorCore.js';
import { EditorAssetLoader } from './EditorAssetLoader.js';
import { EditorUI } from './EditorUI.js';
import { EditorMapManager } from './EditorMapManager.js';

export async function initEditor() {
    try {
        const assetStatusText = document.getElementById("assetStatusText");
        const setAssetStatus = ({ level = 'info', message = '' } = {}) => {
            if (!assetStatusText) return;
            assetStatusText.textContent = message || 'Unbekannt';
            assetStatusText.style.color = (
                level === 'error' ? 'var(--danger)' :
                    level === 'warn' ? '#fbbf24' :
                        'var(--muted)'
            );
        };

        setAssetStatus({ level: 'info', message: 'Lade Assets...' });
        const assetLoader = new EditorAssetLoader({ timeoutMs: 8000, onStatus: setAssetStatus });
        const assetSummary = await assetLoader.loadAll();

        if ((assetSummary.failed + assetSummary.timedOut) > 0) {
            setAssetStatus({
                level: 'warn',
                message: `${assetSummary.loaded}/${assetSummary.total} geladen, ${assetSummary.failed + assetSummary.timedOut} Placeholder`
            });
        } else {
            setAssetStatus({
                level: 'info',
                message: `${assetSummary.loaded}/${assetSummary.total} geladen`
            });
        }

        const core = new EditorCore("threeCanvas");
        const ui = new EditorUI(core);
        const mapManager = new EditorMapManager(core, assetLoader);

        ui.setMapManager(mapManager);
        mapManager.setCallbacks({
            onTunnelVisualsChanged: () => ui.updateTunnelVisuals(),
            onHudCountChanged: () => ui.updateHudCount(),
            onBeforeManagedObjectRemoved: (object) => ui.onBeforeManagedObjectRemoved(object),
            onBeforeManagedObjectsCleared: () => ui.beforeManagedObjectsCleared()
        });

        core.animate();
        console.log("3D Map Editor successfully initialized.");
    } catch (error) {
        console.error("Editor initialization failed:", error);
        const assetStatusText = document.getElementById("assetStatusText");
        if (assetStatusText) {
            assetStatusText.textContent = "Init fehlgeschlagen";
            assetStatusText.style.color = "var(--danger)";
        }
        alert("Fehler beim Starten des 3D Map Editors. Details in der Konsole.");
    }
}

initEditor();
