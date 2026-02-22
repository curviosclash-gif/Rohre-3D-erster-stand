import * as THREE from 'three';
import { CUSTOM_MAP_STORAGE_KEY } from '../../js/modules/MapSchema.js';
import { EditorCommandHistory, SnapshotCommand } from './EditorCommandHistory.js';

export class EditorUI {
    constructor(core) {
        this.core = core;
        this.mapManager = null; // Injected later

        this.currentTool = "select";
        this.selectedObject = null;
        this.clipboardData = null;
        this.syncArenaValues = null;

        this.useSnap = false;
        this.snapSize = 50;
        this.ARENA_W = 2800;
        this.ARENA_D = 2400;
        this.ARENA_H = 950;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isDrawing = false;
        this.drawStartPos = null;
        this.previewMesh = null;

        this.commandHistory = new EditorCommandHistory({
            limit: 100,
            onChange: (state) => this.updateUndoRedoUi(state)
        });
        this.historySuspendDepth = 0;
        this.pendingHistoryGestures = new Map();

        this.setupVisuals();
        this.setupEventListeners();
    }

    setMapManager(mana) {
        this.mapManager = mana;
        this.updateUndoRedoUi();
    }

    detachTransformControl() {
        if (this.core.transformControl.object) {
            this.core.transformControl.detach();
        }
    }

    isManagedObjectAlive(object) {
        if (!object) return false;
        if (!this.mapManager) return object.parent === this.core.objectsContainer;
        return this.mapManager.isRegisteredObject(object);
    }

    clearDrawingState() {
        this.cancelHistoryGesture('draw');
        this.isDrawing = false;
        this.drawStartPos = null;
        this.previewMesh = null;
    }

    getArenaSizeForExport() {
        return {
            width: this.ARENA_W,
            height: this.ARENA_H,
            depth: this.ARENA_D
        };
    }

    isHistoryRecordingSuspended() {
        return this.historySuspendDepth > 0 || this.commandHistory?.isApplying?.();
    }

    withHistorySuspended(fn) {
        this.historySuspendDepth += 1;
        try {
            return fn();
        } finally {
            this.historySuspendDepth = Math.max(0, this.historySuspendDepth - 1);
        }
    }

    captureHistorySnapshot() {
        if (!this.mapManager) return null;

        let json = '';
        try {
            json = this.mapManager.generateJSONExport(this.getArenaSizeForExport());
        } catch (error) {
            console.warn('[EditorUI] Failed to capture history snapshot:', error);
            return null;
        }

        const selectedObjectId = (this.selectedObject && this.isManagedObjectAlive(this.selectedObject))
            ? (this.selectedObject.userData?.id || null)
            : null;
        const hasPlayerSpawnObject = this.core.objectsContainer.children.some((obj) => (
            obj?.userData?.type === 'spawn' && obj?.userData?.subType === 'player'
        ));

        return {
            json,
            selectedObjectId,
            hasPlayerSpawnObject
        };
    }

    applyHistorySnapshot(snapshot) {
        if (!snapshot || !this.mapManager) return;
        const syncArenaValues = this.syncArenaValues || (() => { });

        this.withHistorySuspended(() => {
            this.mapManager.importFromJSON(snapshot.json, syncArenaValues);
            if (snapshot.hasPlayerSpawnObject === false) {
                const playerSpawns = [...this.core.objectsContainer.children].filter((obj) => (
                    obj?.userData?.type === 'spawn' && obj?.userData?.subType === 'player'
                ));
                playerSpawns.forEach((obj) => this.mapManager.removeObject(obj));
            }
            const selected = snapshot.selectedObjectId ? this.mapManager.getObjectById(snapshot.selectedObjectId) : null;
            this.selectObject(selected || null);
        });
    }

    pushSnapshotHistoryCommand(label, beforeSnapshot, afterSnapshot) {
        if (!beforeSnapshot || !afterSnapshot) return false;
        if (
            beforeSnapshot.json === afterSnapshot.json &&
            beforeSnapshot.hasPlayerSpawnObject === afterSnapshot.hasPlayerSpawnObject
        ) {
            return false;
        }

        return this.commandHistory.push(new SnapshotCommand({
            label,
            before: beforeSnapshot,
            after: afterSnapshot,
            applySnapshot: (snapshot) => this.applyHistorySnapshot(snapshot)
        }));
    }

    executeHistoryMutation(label, mutateFn) {
        if (typeof mutateFn !== 'function') return undefined;
        if (!this.mapManager || this.isHistoryRecordingSuspended()) {
            return mutateFn();
        }

        const beforeSnapshot = this.captureHistorySnapshot();
        const result = mutateFn();
        const afterSnapshot = this.captureHistorySnapshot();
        this.pushSnapshotHistoryCommand(label, beforeSnapshot, afterSnapshot);
        return result;
    }

    beginHistoryGesture(key, label) {
        if (!key || !this.mapManager || this.isHistoryRecordingSuspended()) return;
        if (this.pendingHistoryGestures.has(key)) return;

        const snapshot = this.captureHistorySnapshot();
        if (!snapshot) return;

        this.pendingHistoryGestures.set(key, {
            label: String(label || 'Change'),
            before: snapshot
        });
    }

    commitHistoryGesture(key, labelOverride = null) {
        if (!key) return false;

        const pending = this.pendingHistoryGestures.get(key);
        if (!pending) return false;
        this.pendingHistoryGestures.delete(key);

        if (!this.mapManager || this.isHistoryRecordingSuspended()) return false;

        const afterSnapshot = this.captureHistorySnapshot();
        return this.pushSnapshotHistoryCommand(labelOverride || pending.label, pending.before, afterSnapshot);
    }

    cancelHistoryGesture(key) {
        if (!key) return;
        this.pendingHistoryGestures.delete(key);
    }

    undo() {
        if (!this.commandHistory) return false;
        try {
            return this.commandHistory.undo();
        } catch (error) {
            alert(`Undo fehlgeschlagen: ${error.message}`);
            return false;
        }
    }

    redo() {
        if (!this.commandHistory) return false;
        try {
            return this.commandHistory.redo();
        } catch (error) {
            alert(`Redo fehlgeschlagen: ${error.message}`);
            return false;
        }
    }

    updateUndoRedoUi(state = null) {
        const historyState = state || this.commandHistory?.getState?.();
        if (!historyState) return;

        const btnUndo = document.getElementById("btnUndo");
        const btnRedo = document.getElementById("btnRedo");

        if (btnUndo) {
            btnUndo.disabled = !historyState.canUndo;
            btnUndo.title = historyState.undoLabel
                ? `Undo: ${historyState.undoLabel} (Strg+Z)`
                : 'Undo (Strg+Z)';
        }
        if (btnRedo) {
            btnRedo.disabled = !historyState.canRedo;
            btnRedo.title = historyState.redoLabel
                ? `Redo: ${historyState.redoLabel} (Strg+Y / Strg+Shift+Z)`
                : 'Redo (Strg+Y / Strg+Shift+Z)';
        }
    }

    beforeManagedObjectsCleared() {
        this.cancelHistoryGesture('transform');
        this.clearDrawingState();
        this.selectObject(null);
        this.detachTransformControl();
    }

    onBeforeManagedObjectRemoved(object) {
        if (!object) return;

        if (this.previewMesh === object) {
            this.clearDrawingState();
        }

        if (this.selectedObject === object) {
            this.selectObject(null);
            return;
        }

        if (this.core.transformControl.object === object) {
            this.detachTransformControl();
        }
    }

    syncTransformControlAttachment() {
        const selected = this.isManagedObjectAlive(this.selectedObject) ? this.selectedObject : null;
        const flyMode = !!document.getElementById("chkFly")?.checked;

        if (!selected || flyMode) {
            this.detachTransformControl();
            return;
        }

        if (this.core.transformControl.object !== selected) {
            this.core.transformControl.attach(selected);
        }
    }

    setupVisuals() {
        // Arena Box Visual
        const wallGeo = new THREE.BoxGeometry(1, 1, 1);
        const wallMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true, transparent: true, opacity: 0.1 });
        this.arenaBoxWall = new THREE.Mesh(wallGeo, wallMat);
        this.core.scene.add(this.arenaBoxWall);

        this.arenaBox = new THREE.BoxHelper(this.arenaBoxWall, 0x3b82f6);
        this.core.scene.add(this.arenaBox);

        this.matTunnelLine = new THREE.LineBasicMaterial({
            color: 0x60a5fa,
            linewidth: 2,
            transparent: true,
            opacity: 0.5
        });

        this.updateArenaVisual();
    }

    updateArenaVisual() {
        this.arenaBox.matrixAutoUpdate = false;
        const matrix = new THREE.Matrix4().makeScale(this.ARENA_W, this.ARENA_H, this.ARENA_D);
        matrix.setPosition(0, this.ARENA_H / 2, 0);
        this.arenaBox.matrix.copy(matrix);
        this.arenaBox.update();
    }

    updateTunnelVisuals() {
        while (this.core.tunnelLines.children.length > 0) {
            const line = this.core.tunnelLines.children[0];
            this.core.tunnelLines.remove(line);
            line.geometry?.dispose?.();
        }

        this.core.objectsContainer.children.forEach(obj => {
            if (obj.userData.type !== 'tunnel') return;
            if (!obj.userData.pointA || !obj.userData.pointB) return;
            const geometry = new THREE.BufferGeometry().setFromPoints([obj.userData.pointA, obj.userData.pointB]);
            const line = new THREE.Line(geometry, this.matTunnelLine);
            this.core.tunnelLines.add(line);
        });
    }

    updateHudCount() {
        const count = this.mapManager?.getObjectCount?.() ?? this.core.objectsContainer.children.length;
        document.getElementById("hudObjCount").textContent = `Objekte: ${count}`;
    }

    getSelectionOutlines(object) {
        const outlines = [];
        if (!object) return outlines;
        object.traverse((child) => {
            if (child.userData?.isSelectionOutline && child.material) outlines.push(child);
        });
        return outlines;
    }

    setSelectionOutline(object, color = 0x000000, opacity = 0.2) {
        const outlines = this.getSelectionOutlines(object);
        outlines.forEach((outline) => {
            outline.material.color.setHex(color);
            outline.material.opacity = opacity;
            outline.material.transparent = true;
            outline.material.needsUpdate = true;
        });
    }

    resolveSelectableObject(hitObject) {
        if (!hitObject) return null;
        if (this.mapManager) {
            return this.mapManager.resolveManagedObject(hitObject);
        }

        let node = hitObject;
        while (node && node.parent && node.parent !== this.core.objectsContainer) {
            node = node.parent;
        }
        if (node && node.parent === this.core.objectsContainer) return node;
        return null;
    }

    createClipboardPayload(object) {
        const payload = {
            ...object.userData,
            sourcePos: object.position.clone(),
            rotateY: object.rotation.y || 0
        };
        delete payload.id;
        delete payload.editorObjectId;
        delete payload.editorManagedRoot;
        if (payload.pointA?.isVector3) payload.pointA = payload.pointA.clone();
        if (payload.pointB?.isVector3) payload.pointB = payload.pointB.clone();
        return payload;
    }

    deleteSelectedObject() {
        if (!this.selectedObject) return;
        if (!this.isManagedObjectAlive(this.selectedObject)) {
            this.selectObject(null);
            return;
        }
        if (this.mapManager) {
            this.executeHistoryMutation('Delete object', () => {
                this.mapManager.removeObject(this.selectedObject);
            });
            return;
        }

        const removed = this.selectedObject;
        this.core.objectsContainer.remove(removed);
        this.detachTransformControl();
        if (removed.userData.type === 'tunnel') this.updateTunnelVisuals();
        this.selectedObject = null;
        this.hidePropPanel();
        this.updateHudCount();
    }

    selectObject(obj) {
        const nextObject = this.mapManager ? this.mapManager.resolveManagedObject(obj) : obj;

        if (this.selectedObject && !this.isManagedObjectAlive(this.selectedObject)) {
            this.selectedObject = null;
        }

        if (this.selectedObject) {
            this.setSelectionOutline(this.selectedObject, 0x000000, 0.2);
        }

        this.selectedObject = nextObject && this.isManagedObjectAlive(nextObject) ? nextObject : null;

        if (this.selectedObject) {
            this.setSelectionOutline(this.selectedObject, 0xffffff, 0.8);
            this.syncTransformControlAttachment();
            this.showPropPanel(this.selectedObject);
        } else {
            this.detachTransformControl();
            this.hidePropPanel();
        }
    }

    clearAllObjects() {
        if (this.mapManager) {
            this.mapManager.clearAllObjects();
            return;
        }

        while (this.core.objectsContainer.children.length > 0) {
            this.core.objectsContainer.remove(this.core.objectsContainer.children[0]);
        }
        this.selectObject(null);
        this.updateTunnelVisuals();
        this.updateHudCount();
    }

    showPropPanel(obj) {
        if (!obj || !obj.userData) {
            this.hidePropPanel();
            return;
        }
        const propPanel = document.getElementById("propPanel");
        const propSizeRow = document.getElementById("propSizeRow");
        const propWidthRow = document.getElementById("propWidthRow");
        const propDepthRow = document.getElementById("propDepthRow");
        const propHeightRow = document.getElementById("propHeightRow");
        const propSize = document.getElementById("propSize");
        const propWidth = document.getElementById("propWidth");
        const propDepth = document.getElementById("propDepth");
        const propHeight = document.getElementById("propHeight");
        const propY = document.getElementById("propY");

        propPanel.style.display = "block";
        propY.value = Math.round(obj.position.y);

        const u = obj.userData;

        propSizeRow.style.display = "none";
        propWidthRow.style.display = "none";
        propDepthRow.style.display = "none";
        propHeightRow.style.display = "none";
        const propScaleRow = document.getElementById("propScaleRow");
        if (propScaleRow) propScaleRow.style.display = "none";

        if (u.type === 'hard' || u.type === 'foam') {
            propWidthRow.style.display = "flex";
            propDepthRow.style.display = "flex";
            propHeightRow.style.display = "flex";
            propWidth.value = u.sizeX || u.sizeInfo * 2;
            propDepth.value = u.sizeZ || u.sizeInfo * 2;
            propHeight.value = u.sizeY || u.sizeInfo * 2;
        } else if (u.type === 'tunnel' || u.type === 'portal') {
            propSizeRow.style.display = "flex";
            propSize.value = u.radius || u.sizeInfo;
        } else if (u.type === 'aircraft') {
            const propScaleRow = document.getElementById("propScaleRow");
            const propScale = document.getElementById("propScale");
            propScaleRow.style.display = "flex";
            propScale.value = u.modelScale || 50;
        }
    }

    hidePropPanel() {
        document.getElementById("propPanel").style.display = "none";
    }

    setupEventListeners() {
        // UI Tools
        document.querySelectorAll('.tool').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;

                document.querySelectorAll('.sub-menu').forEach(m => m.style.display = 'none');
                if (this.currentTool === 'spawn') document.getElementById("subSpawn").style.display = "flex";
                if (this.currentTool === 'item') document.getElementById("subItem").style.display = "flex";
                if (this.currentTool === 'aircraft') document.getElementById("subAircraft").style.display = "flex";

                if (this.currentTool !== 'select') this.selectObject(null);
            });
        });

        // Click & Draw on 3D Canvas
        let isDraggingTransform = false;
        this.core.transformControl.addEventListener('dragging-changed', (e) => {
            isDraggingTransform = e.value;
            if (e.value) {
                const activeObject = this.core.transformControl.object;
                const managed = this.mapManager?.resolveManagedObject?.(activeObject) || activeObject;
                if (managed && this.isManagedObjectAlive(managed)) {
                    this.beginHistoryGesture('transform', `Transform ${managed.userData?.type || 'object'}`);
                }
            } else {
                this.commitHistoryGesture('transform');
            }
        });
        this.core.transformControl.addEventListener('objectChange', () => {
            const activeObject = this.core.transformControl.object;
            if (!activeObject) return;

            const managedObject = this.mapManager?.notifyObjectMutated?.(activeObject) || activeObject;
            if (!this.isManagedObjectAlive(managedObject)) {
                this.detachTransformControl();
                if (this.selectedObject && !this.isManagedObjectAlive(this.selectedObject)) {
                    this.selectObject(null);
                }
                return;
            }

            if (managedObject === this.selectedObject) {
                this.showPropPanel(managedObject);
            }
        });

        const getGroundPos = (e) => {
            const rect = this.core.container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / this.core.container.clientWidth) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / this.core.container.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.core.camera);

            const useYLayer = document.getElementById("chkYLayer").checked;
            const targetMesh = useYLayer ? this.core.yGroundMesh : this.core.groundMesh;

            const intersectsGround = this.raycaster.intersectObject(targetMesh);
            if (intersectsGround.length > 0) {
                let p = intersectsGround[0].point;
                if (this.useSnap) {
                    p.x = Math.round(p.x / this.snapSize) * this.snapSize;
                    p.z = Math.round(p.z / this.snapSize) * this.snapSize;
                }
                return p;
            }
            return null;
        };

        this.core.container.addEventListener('pointerdown', (e) => {
            if (isDraggingTransform) return;
            if (e.button !== 0) return;

            const rect = this.core.container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / this.core.container.clientWidth) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / this.core.container.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.core.camera);

            if (this.currentTool === "select") {
                const intersects = this.raycaster.intersectObjects(this.core.objectsContainer.children, true);
                if (intersects.length > 0) {
                    this.selectObject(this.resolveSelectableObject(intersects[0].object));
                } else {
                    this.selectObject(null);
                }
            } else {
                // START DRAWING
                const p = getGroundPos(e);
                if (p) {
                    this.selectObject(null);
                    this.beginHistoryGesture('draw', `Create ${this.currentTool}`);
                    this.isDrawing = true;

                    const useYLayer = document.getElementById("chkYLayer").checked;
                    let y = useYLayer ? parseFloat(document.getElementById("numYLayer").value) : (this.currentTool === 'hard' || this.currentTool === 'foam' ? this.ARENA_H * 0.35 : this.ARENA_H * 0.55);

                    if (useYLayer && (this.currentTool === 'hard' || this.currentTool === 'foam')) {
                        y += (this.ARENA_H * 0.7) / 2; // Offset um Hälfte der Standardhöhe
                    }

                    this.drawStartPos = { x: p.x, y: y, z: p.z };

                    let subType = null;
                    if (this.currentTool === 'spawn') subType = document.getElementById("selSpawnType").value;
                    if (this.currentTool === 'item') subType = document.getElementById("selItemType").value;
                    if (this.currentTool === 'aircraft') subType = document.getElementById("selAircraftType").value;

                    // Erschaffe temporäres Mesh mit Init-Werten
                    this.previewMesh = this.mapManager.createMesh(this.currentTool, subType, p.x, y, p.z, 0, {
                        sizeX: this.snapSize, sizeZ: this.snapSize, sizeY: this.ARENA_H * 0.7,
                        pointA: new THREE.Vector3(p.x, y, p.z), pointB: new THREE.Vector3(p.x, y, p.z)
                    });

                    if (this.previewMesh) {
                        this.setSelectionOutline(this.previewMesh, 0xffff00, 0.65);
                    } else {
                        this.cancelHistoryGesture('draw');
                    }
                }
            }
        });

        this.core.container.addEventListener('pointermove', (e) => {
            if (!this.isDrawing || !this.previewMesh) return;
            if (!this.isManagedObjectAlive(this.previewMesh)) {
                this.cancelHistoryGesture('draw');
                this.clearDrawingState();
                return;
            }

            const curr = getGroundPos(e);
            if (curr) {
                const start = this.drawStartPos;
                const tool = this.previewMesh.userData.type;

                if (tool === 'hard' || tool === 'foam') {
                    // Rechteck: berechne Center und Größe
                    const minSize = this.useSnap ? this.snapSize : 10;
                    const w = Math.max(minSize, Math.abs(curr.x - start.x));
                    const d = Math.max(minSize, Math.abs(curr.z - start.z));
                    const cx = (start.x + curr.x) / 2;
                    const cz = (start.z + curr.z) / 2;

                    this.previewMesh.position.set(cx, start.y, cz);
                    this.previewMesh.scale.set(w, this.ARENA_H * 0.7, d); // Standardwandhöhe
                    this.previewMesh.userData.sizeX = w;
                    this.previewMesh.userData.sizeZ = d;
                    this.previewMesh.userData.sizeY = this.ARENA_H * 0.7;
                    this.previewMesh.userData.sizeInfo = Math.max(w, d, this.ARENA_H * 0.7) * 0.5;
                } else if (tool === 'tunnel') {
                    const pA = new THREE.Vector3(start.x, start.y, start.z);
                    const pB = new THREE.Vector3(curr.x, start.y, curr.z);
                    if (pA.distanceTo(pB) > 0.1) {
                        this.mapManager.alignTunnelSegment(this.previewMesh, pA, pB, 160);
                    }
                } else {
                    // Items/Portal/Spawn folgen einfach der Maus (Drag-to-place)
                    this.previewMesh.position.set(curr.x, start.y, curr.z);
                }
            }
        });

        this.core.container.addEventListener('pointerup', () => {
            if (this.isDrawing && this.previewMesh) {
                this.isDrawing = false;
                if (this.isManagedObjectAlive(this.previewMesh)) {
                    this.setSelectionOutline(this.previewMesh, 0x000000, 0.2);
                    this.selectObject(this.previewMesh);
                }
                this.previewMesh = null;
                this.drawStartPos = null;
                this.commitHistoryGesture('draw');
            }
        });

        this.core.container.addEventListener('keyup', (e) => {
            if (e.ctrlKey) return; // handled below
            if (e.key === 'Delete' || e.key === 'Backspace') {
                document.getElementById("btnDelSelected").click();
            }
        });

        // Keyboard Actions
        const shouldIgnoreGlobalShortcut = (target) => {
            if (!(target instanceof Element)) return false;
            const tagName = target.tagName.toLowerCase();
            return tagName === 'input'
                || tagName === 'textarea'
                || tagName === 'select'
                || target.isContentEditable;
        };

        document.addEventListener('keydown', (e) => {
            if (shouldIgnoreGlobalShortcut(e.target)) return;

            const lowerKey = e.key.toLowerCase();

            if (e.ctrlKey && lowerKey === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
                return;
            }
            if (e.ctrlKey && lowerKey === 'y') {
                e.preventDefault();
                this.redo();
                return;
            }

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelectedObject();
            }

            // Transform Modes
            if (lowerKey === 'r') {
                if (this.selectedObject && this.isManagedObjectAlive(this.selectedObject) && this.core.transformControl.object) {
                    this.core.transformControl.setMode('rotate');
                    this.core.transformControl.showX = false;
                    this.core.transformControl.showY = true;
                    this.core.transformControl.showZ = false;
                }
            }
            if (lowerKey === 't') {
                if (this.selectedObject && this.isManagedObjectAlive(this.selectedObject) && this.core.transformControl.object) {
                    this.core.transformControl.setMode('translate');
                    this.core.transformControl.showX = true;
                    this.core.transformControl.showY = true;
                    this.core.transformControl.showZ = true;
                }
            }

            // Copy
            if (e.ctrlKey && lowerKey === 'c') {
                if (this.selectedObject && this.isManagedObjectAlive(this.selectedObject)) {
                    this.clipboardData = this.createClipboardPayload(this.selectedObject);
                }
            }
            // Paste
            if (e.ctrlKey && lowerKey === 'v') {
                if (this.clipboardData) {
                    this.executeHistoryMutation('Paste object', () => {
                        this.raycaster.setFromCamera(this.mouse, this.core.camera);

                        const useYLayer = document.getElementById("chkYLayer").checked;
                        const targetMesh = useYLayer ? this.core.yGroundMesh : this.core.groundMesh;
                        const intersectsGround = this.raycaster.intersectObject(targetMesh);

                        let targetPos = new THREE.Vector3(0, this.clipboardData.sourcePos?.y ?? this.ARENA_H * 0.55, 0);

                        if (intersectsGround.length > 0) {
                            targetPos.x = intersectsGround[0].point.x;
                            targetPos.z = intersectsGround[0].point.z;
                            if (this.useSnap) {
                                targetPos.x = Math.round(targetPos.x / this.snapSize) * this.snapSize;
                                targetPos.z = Math.round(targetPos.z / this.snapSize) * this.snapSize;
                            }
                        }

                        if (useYLayer) {
                            const base_y = parseFloat(document.getElementById("numYLayer").value);
                            targetPos.y = base_y;
                            if (this.clipboardData.type === 'hard' || this.clipboardData.type === 'foam') {
                                const sy = this.clipboardData.sizeY || (this.clipboardData.sizeInfo * 2);
                                targetPos.y = base_y + sy / 2;
                            }
                        } else if (this.clipboardData.type === 'hard' || this.clipboardData.type === 'foam') {
                            targetPos.y = this.ARENA_H * 0.35;
                        }

                        let extraProps = { ...this.clipboardData };
                        delete extraProps.sourcePos;
                        if (extraProps.pointA?.isVector3) extraProps.pointA = extraProps.pointA.clone();
                        if (extraProps.pointB?.isVector3) extraProps.pointB = extraProps.pointB.clone();

                        if (this.clipboardData.type === 'tunnel' && this.clipboardData.pointA && this.clipboardData.pointB) {
                            // Offset the tunnel segment safely so we don't paste directly on top
                            const sourcePos = this.clipboardData.sourcePos?.isVector3
                                ? this.clipboardData.sourcePos
                                : this.clipboardData.pointA.clone().lerp(this.clipboardData.pointB, 0.5);
                            const diff = targetPos.clone().sub(sourcePos);
                            extraProps.pointA = this.clipboardData.pointA.clone().add(diff);
                            extraProps.pointB = this.clipboardData.pointB.clone().add(diff);
                        }

                        const mesh = this.mapManager.createMesh(
                            this.clipboardData.type,
                            this.clipboardData.subType,
                            targetPos.x, targetPos.y, targetPos.z,
                            this.clipboardData.sizeInfo,
                            extraProps
                        );
                        if (mesh) this.selectObject(mesh);
                    });
                }
            }
        });

        // Prop changes
        document.getElementById("propY").addEventListener('change', (e) => {
            this.executeHistoryMutation('Edit object Y', () => {
                if (!this.selectedObject || !this.isManagedObjectAlive(this.selectedObject)) return;
                this.selectedObject.position.y = parseFloat(e.target.value);
                if (this.selectedObject.userData.type === 'tunnel') {
                    this.mapManager?.notifyObjectMutated?.(this.selectedObject);
                }
                this.showPropPanel(this.selectedObject);
            });
        });

        document.getElementById("propSize").addEventListener('change', (e) => {
            this.executeHistoryMutation('Edit object size', () => {
                if (this.selectedObject && this.isManagedObjectAlive(this.selectedObject)) {
                    const val = parseFloat(e.target.value);
                    const u = this.selectedObject.userData;
                    u.sizeInfo = val;

                    if (u.type === 'tunnel') {
                        u.radius = val;
                        if (u.pointA && u.pointB) {
                            this.mapManager.alignTunnelSegment(this.selectedObject, u.pointA, u.pointB, val);
                            this.mapManager?.notifyObjectMutated?.(this.selectedObject);
                        }
                    } else if (u.type === 'portal') {
                        this.selectedObject.scale.set(val, val, val);
                        u.radius = val;
                    }
                }
            });
        });

        // Box Scale Inputs
        const updateBoxScale = () => {
            this.executeHistoryMutation('Resize block', () => {
                if (this.selectedObject && this.isManagedObjectAlive(this.selectedObject) && (this.selectedObject.userData.type === 'hard' || this.selectedObject.userData.type === 'foam')) {
                    const w = parseFloat(document.getElementById("propWidth").value);
                    const d = parseFloat(document.getElementById("propDepth").value);
                    const h = parseFloat(document.getElementById("propHeight").value);

                    this.selectedObject.userData.sizeX = w;
                    this.selectedObject.userData.sizeZ = d;
                    this.selectedObject.userData.sizeY = h;
                    this.selectedObject.userData.sizeInfo = Math.max(w, d, h) * 0.5;
                    this.selectedObject.scale.set(w, h, d);
                }
            });
        };

        document.getElementById("propWidth").addEventListener('change', updateBoxScale);
        document.getElementById("propDepth").addEventListener('change', updateBoxScale);
        document.getElementById("propHeight").addEventListener('change', updateBoxScale);

        // Aircraft Scale Input
        document.getElementById("propScale").addEventListener('change', (e) => {
            this.executeHistoryMutation('Scale aircraft', () => {
                if (this.selectedObject && this.isManagedObjectAlive(this.selectedObject) && this.selectedObject.userData.type === 'aircraft') {
                    const s = parseFloat(e.target.value);
                    if (s > 0) {
                        this.selectedObject.userData.modelScale = s;
                        this.selectedObject.scale.set(s, s, s);
                    }
                }
            });
        });

        // Arena resize
        const syncArenaValues = () => {
            this.ARENA_W = parseFloat(document.getElementById("numArenaW").value) || 2800;
            this.ARENA_D = parseFloat(document.getElementById("numArenaD").value) || 2400;
            this.ARENA_H = parseFloat(document.getElementById("numArenaH").value) || 950;
            this.updateArenaVisual();
        };
        this.syncArenaValues = syncArenaValues;

        document.getElementById("numArenaW").addEventListener('change', () => this.executeHistoryMutation('Resize arena', syncArenaValues));
        document.getElementById("numArenaD").addEventListener('change', () => this.executeHistoryMutation('Resize arena', syncArenaValues));
        document.getElementById("numArenaH").addEventListener('change', () => this.executeHistoryMutation('Resize arena', syncArenaValues));

        // Y-Layer Setup
        document.getElementById("chkYLayer").addEventListener('change', (e) => {
            this.core.yGridHelper.visible = e.target.checked;
        });
        document.getElementById("numYLayer").addEventListener('change', (e) => {
            const y = parseFloat(e.target.value);
            this.core.yGridHelper.position.y = y;
            this.core.yGroundMesh.position.y = y;
        });

        // Fly Mode Setup
        document.getElementById("chkFly").addEventListener('change', (e) => {
            const isFly = e.target.checked;
            const rightClickRotate = {
                LEFT: THREE.MOUSE.NONE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
            };

            // Wenn FlyMode an ist, erlauben wir das Drehen nur noch über Rechtsklick (MOUSE.RIGHT),
            // damit Links-Klick (MOUSE.LEFT) komplett fürs Bauen von Blöcken frei ist.
            if (isFly) {
                this.core.orbit.mouseButtons = rightClickRotate;
                if (this.selectedObject) this.detachTransformControl();
            } else {
                this.core.orbit.mouseButtons = rightClickRotate;
                if (this.selectedObject) this.syncTransformControlAttachment();
            }
        });

        // Snap Setup
        document.getElementById("chkSnap").addEventListener('change', (e) => {
            this.useSnap = e.target.checked;
            this.core.transformControl.setTranslationSnap(this.useSnap ? this.snapSize : null);
        });
        document.getElementById("numGrid").addEventListener('change', (e) => {
            this.snapSize = parseFloat(e.target.value);
            if (this.useSnap) this.core.transformControl.setTranslationSnap(this.snapSize);
        });

        // Export/Import
        document.getElementById("btnExport").addEventListener("click", () => {
            document.getElementById("jsonOutput").value = this.mapManager.generateJSONExport(this.getArenaSizeForExport());
        });

        document.getElementById("btnPlaytest").addEventListener("click", () => {
            const jsonText = this.mapManager.generateJSONExport(this.getArenaSizeForExport());

            try {
                // Gleicher Origin (Vite-Server) -> localStorage funktioniert direkt
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

        document.getElementById("btnImport").addEventListener("click", () => {
            const txt = document.getElementById("jsonOutput").value.trim();
            if (!txt) return;
            this.executeHistoryMutation('Import map', () => {
                this.mapManager.importFromJSON(txt, syncArenaValues);
            });
        });

        document.getElementById("btnNew").addEventListener("click", () => {
            this.executeHistoryMutation('Clear map', () => {
                this.clearAllObjects();
                document.getElementById("jsonOutput").value = "";
            });
        });

        document.getElementById("btnDelSelected").addEventListener("click", () => {
            this.deleteSelectedObject();
        });

        document.getElementById("btnUndo")?.addEventListener("click", () => {
            this.undo();
        });

        document.getElementById("btnRedo")?.addEventListener("click", () => {
            this.redo();
        });

        this.updateUndoRedoUi();
    }
}

