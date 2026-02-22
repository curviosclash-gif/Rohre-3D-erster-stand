import { CUSTOM_MAP_STORAGE_KEY } from '../../../js/modules/MapSchema.js';
import { getJsonEditorText, setJsonEditorText } from './EditorFormState.js';

export function bindEditorSessionControls(editor, { syncArenaValues } = {}) {
    if (!editor) return;
    const dom = editor.dom;

    dom.btnExport?.addEventListener("click", () => {
        setJsonEditorText(editor, editor.mapManager.generateJSONExport(editor.getArenaSizeForExport()));
    });

    dom.btnPlaytest?.addEventListener("click", () => {
        const jsonText = editor.mapManager.generateJSONExport(editor.getArenaSizeForExport());

        try {
            localStorage.setItem(CUSTOM_MAP_STORAGE_KEY, jsonText);
        } catch (error) {
            alert(`Playtest konnte nicht gespeichert werden: ${error.message}`);
            return;
        }

        const playtestWindow = window.open("../index.html?playtest=1", "_blank", "noopener");
        if (!playtestWindow) {
            alert("Popup blockiert. Bitte Popups erlauben und erneut versuchen.");
        }
    });

    dom.btnImport?.addEventListener("click", () => {
        const txt = getJsonEditorText(editor).trim();
        if (!txt) return;
        editor.executeHistoryMutation('Import map', () => {
            editor.mapManager.importFromJSON(txt, {
                onArenaSize: (arenaSize) => {
                    if (typeof editor.setArenaSizeInputs === 'function') {
                        editor.setArenaSizeInputs(arenaSize);
                    }
                    if (typeof syncArenaValues === 'function') {
                        syncArenaValues();
                    }
                }
            });
        });
    });

    dom.btnNew?.addEventListener("click", () => {
        editor.executeHistoryMutation('Clear map', () => {
            editor.clearAllObjects();
            setJsonEditorText(editor, "");
        });
    });

    dom.btnDelSelected?.addEventListener("click", () => {
        editor.deleteSelectedObject();
    });

    dom.btnUndo?.addEventListener("click", () => {
        editor.undo();
    });

    dom.btnRedo?.addEventListener("click", () => {
        editor.redo();
    });
}
