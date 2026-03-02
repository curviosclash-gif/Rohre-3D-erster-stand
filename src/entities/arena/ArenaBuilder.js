import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../../core/Config.js';
import { createBoxWithTunnel } from '../TunnelGeometry.js';

function asPositiveNumber(value, defaultValue = 1) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : defaultValue;
}

function normalizeTunnelAxis(axis) {
    if (axis === 'x' || axis === 'y' || axis === 'z') return axis;
    return 'z';
}

function resolveTunnelRadius(tunnelRadius, width, height, depth, axis) {
    const tunnelAxis = normalizeTunnelAxis(axis);
    const crossA = tunnelAxis === 'x' ? height : width;
    const crossB = tunnelAxis === 'z' ? height : depth;
    const maxRadius = Math.max(0.001, Math.min(crossA, crossB) * 0.5 - 1e-4);
    const fallback = Math.max(0.35, Math.min(crossA, crossB) * 0.3);
    const radius = asPositiveNumber(tunnelRadius, fallback);
    return Math.min(radius, maxRadius);
}

export class ArenaBuilder {
    constructor(arena) {
        this.arena = arena;
    }

    build(mapKey) {
        this.arena.obstacles = [];
        this.arena._pendingWallGeos = [];
        this.arena._pendingObstacleGeos = [];
        this.arena._pendingFoamGeos = [];
        this.arena._pendingObstacleEdgeGeos = [];
        this.arena._pendingFoamEdgeGeos = [];

        const fallbackMap = CONFIG.MAPS.standard || Object.values(CONFIG.MAPS || {})[0] || {
            name: 'Fallback Map',
            size: [80, 30, 80],
            obstacles: [],
            portals: [],
        };
        const hasRequestedMap = typeof mapKey === 'string' && !!CONFIG.MAPS[mapKey];
        const map = hasRequestedMap ? CONFIG.MAPS[mapKey] : fallbackMap;
        this.arena.currentMapKey = hasRequestedMap ? mapKey : 'standard';

        const scale = CONFIG.ARENA.MAP_SCALE || 1;
        const fallbackSize = Array.isArray(fallbackMap.size) ? fallbackMap.size : [80, 30, 80];
        const mapSize = Array.isArray(map.size) ? map.size : fallbackSize;
        const baseSx = Number.isFinite(mapSize[0]) && mapSize[0] > 0 ? mapSize[0] : fallbackSize[0];
        const baseSy = Number.isFinite(mapSize[1]) && mapSize[1] > 0 ? mapSize[1] : fallbackSize[1];
        const baseSz = Number.isFinite(mapSize[2]) && mapSize[2] > 0 ? mapSize[2] : fallbackSize[2];
        const sx = baseSx * scale;
        const sy = baseSy * scale;
        const sz = baseSz * scale;
        const halfX = sx / 2;
        const halfY = sy / 2;
        const halfZ = sz / 2;

        this.arena.bounds = {
            minX: -halfX, maxX: halfX,
            minY: 0, maxY: sy,
            minZ: -halfZ, maxZ: halfZ,
        };

        const checkerTexture = this._createCheckerTexture(
            CONFIG.ARENA.CHECKER_LIGHT_COLOR,
            CONFIG.ARENA.CHECKER_DARK_COLOR
        );
        const checkerWorldSize = Math.max(1, CONFIG.ARENA.CHECKER_WORLD_SIZE || 18);

        const floorTexture = checkerTexture;
        floorTexture.needsUpdate = true;
        floorTexture.repeat.set(
            Math.max(1, sx / checkerWorldSize),
            Math.max(1, sz / checkerWorldSize)
        );

        const wallTexture = checkerTexture.clone();
        wallTexture.needsUpdate = true;
        wallTexture.repeat.set(
            Math.max(1, sx / checkerWorldSize),
            Math.max(1, sy / checkerWorldSize)
        );

        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: wallTexture,
            transparent: true,
            opacity: 0.9,
            roughness: 0.75,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: floorTexture,
            roughness: 0.9,
            metalness: 0.05,
        });

        const obstacleMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a4a,
            roughness: 0.4,
            metalness: 0.5,
            transparent: true,
            opacity: 0.6,
        });
        const foamObstacleMat = new THREE.MeshStandardMaterial({
            color: 0x2b5a49,
            roughness: 0.55,
            metalness: 0.15,
            transparent: true,
            opacity: 0.42,
        });

        this.arena._wallMat = wallMat;
        this.arena._obstacleMat = obstacleMat;
        this.arena._foamMat = foamObstacleMat;
        this.arena._obstacleEdgeMat = new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.5 });
        this.arena._foamEdgeMat = new THREE.LineBasicMaterial({ color: 0x3ddc97, transparent: true, opacity: 0.42 });

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(sx, sz),
            floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.matrixAutoUpdate = false;
        floor.updateMatrix();
        this.arena.renderer.addToScene(floor);

        const t = CONFIG.ARENA.WALL_THICKNESS * scale;
        this._addWall(0, halfY, halfZ + t / 2, sx + 2 * t, sy, t, wallMat);
        this._addWall(0, halfY, -halfZ - t / 2, sx + 2 * t, sy, t, wallMat);
        this._addWall(-halfX - t / 2, halfY, 0, t, sy, sz, wallMat);
        this._addWall(halfX + t / 2, halfY, 0, t, sy, sz, wallMat);
        this._addWall(0, sy + t / 2, 0, sx, t, sz, wallMat);

        const obstacleDefs = Array.isArray(map.obstacles) ? map.obstacles : [];
        for (const obs of obstacleDefs) {
            if (!obs || !Array.isArray(obs.pos) || !Array.isArray(obs.size)) continue;
            const px = Number(obs.pos[0]);
            const py = Number(obs.pos[1]);
            const pz = Number(obs.pos[2]);
            const ox = Number(obs.size[0]);
            const oy = Number(obs.size[1]);
            const oz = Number(obs.size[2]);
            if (![px, py, pz, ox, oy, oz].every(Number.isFinite)) continue;
            if (ox <= 0 || oy <= 0 || oz <= 0) continue;

            const obstacleKind = String(obs.kind || 'hard').toLowerCase();
            const isFoamObstacle = obstacleKind === 'foam';
            const obstacleOptions = {
                kind: isFoamObstacle ? 'foam' : 'hard',
                edgeColor: isFoamObstacle ? 0x3ddc97 : 0x4466aa,
                edgeOpacity: isFoamObstacle ? 0.42 : 0.5,
            };

            const hasTunnel = obs.tunnel && typeof obs.tunnel === 'object';
            if (hasTunnel) {
                const tunnelRadius = Number(obs.tunnel.radius);
                const tunnelAxis = normalizeTunnelAxis(String(obs.tunnel.axis || 'z').toLowerCase());
                this._addObstacleWithTunnel(
                    px * scale,
                    py * scale,
                    pz * scale,
                    ox * scale,
                    oy * scale,
                    oz * scale,
                    isFoamObstacle ? foamObstacleMat : obstacleMat,
                    tunnelRadius * scale,
                    tunnelAxis,
                    obstacleOptions,
                );
            } else {
                this._addObstacle(
                    px * scale,
                    py * scale,
                    pz * scale,
                    ox * scale,
                    oy * scale,
                    oz * scale,
                    isFoamObstacle ? foamObstacleMat : obstacleMat,
                    obstacleOptions,
                );
            }
        }

        this._flushMergedGeometries();

        return { map, scale, sx, sy, sz };
    }

    addParticles(sx, sy, sz) {
        const count = 200;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * sx;
            positions[i * 3 + 1] = Math.random() * sy;
            positions[i * 3 + 2] = (Math.random() - 0.5) * sz;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x4488ff,
            size: 0.15,
            transparent: true,
            opacity: 0.4,
            sizeAttenuation: true,
        });

        this.arena.particles = new THREE.Points(geo, mat);
        this.arena.renderer.addToScene(this.arena.particles);
    }

    _createCheckerTexture(lightColor, darkColor) {
        const size = 128;
        const half = size / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const light = `#${lightColor.toString(16).padStart(6, '0')}`;
        const dark = `#${darkColor.toString(16).padStart(6, '0')}`;

        ctx.fillStyle = light;
        ctx.fillRect(0, 0, half, half);
        ctx.fillRect(half, half, half, half);

        ctx.fillStyle = dark;
        ctx.fillRect(half, 0, half, half);
        ctx.fillRect(0, half, half, half);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestMipmapLinearFilter;
        return texture;
    }

    _addWall(x, y, z, w, h, d) {
        const geo = new THREE.BoxGeometry(w, h, d);

        const box = new THREE.Box3(
            new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
            new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
        );
        this.arena.obstacles.push({ box, isWall: true, kind: 'wall' });

        const worldGeo = geo.clone();
        const translationMatrix = new THREE.Matrix4().makeTranslation(x, y, z);
        worldGeo.applyMatrix4(translationMatrix);
        this.arena._pendingWallGeos.push(worldGeo);

        geo.dispose();
    }

    _addObstacle(x, y, z, w, h, d, material, options = {}) {
        const kind = typeof options.kind === 'string' ? options.kind : 'hard';
        const isFoam = kind === 'foam';

        const geo = new THREE.BoxGeometry(w, h, d);
        const translationMatrix = new THREE.Matrix4().makeTranslation(x, y, z);

        const box = new THREE.Box3(
            new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
            new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
        );
        this.arena.obstacles.push({ box, isWall: false, kind });

        const worldGeo = geo.clone();
        worldGeo.applyMatrix4(translationMatrix);
        if (isFoam) {
            this.arena._pendingFoamGeos.push(worldGeo);
        } else {
            this.arena._pendingObstacleGeos.push(worldGeo);
        }

        const edgeGeo = new THREE.EdgesGeometry(geo);
        const worldEdgeGeo = edgeGeo.clone();
        worldEdgeGeo.applyMatrix4(translationMatrix);

        if (isFoam) {
            this.arena._pendingFoamEdgeGeos.push(worldEdgeGeo);
        } else {
            this.arena._pendingObstacleEdgeGeos.push(worldEdgeGeo);
        }

        edgeGeo.dispose();
        geo.dispose();
    }

    _addObstacleWithTunnel(x, y, z, w, h, d, material, tunnelRadius, tunnelAxis, options = {}) {
        const kind = typeof options.kind === 'string' ? options.kind : 'hard';
        const isFoam = kind === 'foam';
        const axis = normalizeTunnelAxis(tunnelAxis);
        const radius = resolveTunnelRadius(tunnelRadius, w, h, d, axis);

        const geo = createBoxWithTunnel(w, h, d, radius, axis);
        const translationMatrix = new THREE.Matrix4().makeTranslation(x, y, z);

        const box = new THREE.Box3(
            new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
            new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
        );

        this.arena.obstacles.push({
            box,
            isWall: false,
            kind,
            tunnel: { cx: x, cy: y, cz: z, radius, axis },
        });

        const worldGeo = geo.clone();
        worldGeo.applyMatrix4(translationMatrix);
        if (isFoam) {
            this.arena._pendingFoamGeos.push(worldGeo);
        } else {
            this.arena._pendingObstacleGeos.push(worldGeo);
        }

        const edgeGeo = new THREE.EdgesGeometry(geo);
        const worldEdgeGeo = edgeGeo.clone();
        worldEdgeGeo.applyMatrix4(translationMatrix);
        if (isFoam) {
            this.arena._pendingFoamEdgeGeos.push(worldEdgeGeo);
        } else {
            this.arena._pendingObstacleEdgeGeos.push(worldEdgeGeo);
        }

        edgeGeo.dispose();
        geo.dispose();
    }

    _flushMergedGeometries() {
        const addMergedMesh = (geos, material, isShadowCaster = false) => {
            if (geos.length === 0) return null;
            const merged = mergeGeometries(geos, false);
            if (!merged) return null;
            const mesh = new THREE.Mesh(merged, material);
            mesh.castShadow = isShadowCaster;
            mesh.receiveShadow = true;
            mesh.matrixAutoUpdate = false;
            mesh.updateMatrix();
            this.arena.renderer.addToScene(mesh);
            geos.forEach((g) => g.dispose());
            return mesh;
        };

        const addMergedLines = (geos, material) => {
            if (geos.length === 0) return null;
            const merged = mergeGeometries(geos, false);
            if (!merged) return null;
            const lines = new THREE.LineSegments(merged, material);
            lines.matrixAutoUpdate = false;
            lines.updateMatrix();
            this.arena.renderer.addToScene(lines);
            geos.forEach((g) => g.dispose());
            return lines;
        };

        this.arena._mergedWallMesh = addMergedMesh(this.arena._pendingWallGeos, this.arena._wallMat, true);
        this.arena._mergedObstacleMesh = addMergedMesh(this.arena._pendingObstacleGeos, this.arena._obstacleMat, true);
        this.arena._mergedFoamMesh = addMergedMesh(this.arena._pendingFoamGeos, this.arena._foamMat, true);
        this.arena._mergedObstacleEdges = addMergedLines(this.arena._pendingObstacleEdgeGeos, this.arena._obstacleEdgeMat);
        this.arena._mergedFoamEdges = addMergedLines(this.arena._pendingFoamEdgeGeos, this.arena._foamEdgeMat);

        this.arena._pendingWallGeos = [];
        this.arena._pendingObstacleGeos = [];
        this.arena._pendingFoamGeos = [];
        this.arena._pendingObstacleEdgeGeos = [];
        this.arena._pendingFoamEdgeGeos = [];
    }
}
