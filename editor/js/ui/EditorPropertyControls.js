export function bindEditorPropertyControls(editor) {
    if (!editor) return;
    const dom = editor.dom;

    dom.propY?.addEventListener('change', (e) => {
        editor.executeHistoryMutation('Edit object Y', () => {
            if (!editor.selectedObject || !editor.isManagedObjectAlive(editor.selectedObject)) return;
            editor.selectedObject.position.y = parseFloat(e.target.value);
            if (editor.selectedObject.userData.type === 'tunnel') {
                editor.mapManager?.notifyObjectMutated?.(editor.selectedObject);
            }
            editor.showPropPanel(editor.selectedObject);
        });
    });

    dom.propSize?.addEventListener('change', (e) => {
        editor.executeHistoryMutation('Edit object size', () => {
            if (editor.selectedObject && editor.isManagedObjectAlive(editor.selectedObject)) {
                const val = parseFloat(e.target.value);
                const userData = editor.selectedObject.userData;
                userData.sizeInfo = val;

                if (userData.type === 'tunnel') {
                    userData.radius = val;
                    if (userData.pointA && userData.pointB) {
                        editor.mapManager.alignTunnelSegment(editor.selectedObject, userData.pointA, userData.pointB, val);
                        editor.mapManager?.notifyObjectMutated?.(editor.selectedObject);
                    }
                } else if (userData.type === 'portal') {
                    editor.selectedObject.scale.set(val, val, val);
                    userData.radius = val;
                }
            }
        });
    });

    const updateBoxScale = () => {
        editor.executeHistoryMutation('Resize block', () => {
            const selected = editor.selectedObject;
            if (!selected || !editor.isManagedObjectAlive(selected)) return;
            if (selected.userData.type !== 'hard' && selected.userData.type !== 'foam') return;

            const w = parseFloat(dom.propWidth?.value);
            const d = parseFloat(dom.propDepth?.value);
            const h = parseFloat(dom.propHeight?.value);

            selected.userData.sizeX = w;
            selected.userData.sizeZ = d;
            selected.userData.sizeY = h;
            selected.userData.sizeInfo = Math.max(w, d, h) * 0.5;
            selected.scale.set(w, h, d);
        });
    };

    dom.propWidth?.addEventListener('change', updateBoxScale);
    dom.propDepth?.addEventListener('change', updateBoxScale);
    dom.propHeight?.addEventListener('change', updateBoxScale);

    dom.propScale?.addEventListener('change', (e) => {
        editor.executeHistoryMutation('Scale aircraft', () => {
            const selected = editor.selectedObject;
            if (!selected || !editor.isManagedObjectAlive(selected)) return;
            if (selected.userData.type !== 'aircraft') return;

            const s = parseFloat(e.target.value);
            if (s > 0) {
                selected.userData.modelScale = s;
                selected.scale.set(s, s, s);
            }
        });
    });
}
