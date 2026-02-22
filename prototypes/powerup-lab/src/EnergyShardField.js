import * as THREE from 'three';

export class EnergyShardField {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.count = options.count ?? 24;
        this.bounds = options.bounds ?? {
            minX: -24,
            maxX: 24,
            minY: -10,
            maxY: 12,
            minZ: -270,
            maxZ: -30,
        };
        this.shards = [];
        this._tmpVec = new THREE.Vector3();
        this._tmpVec2 = new THREE.Vector3();

        this.group = new THREE.Group();
        scene.add(this.group);
        this._build();
    }

    _build() {
        const geo = new THREE.OctahedronGeometry(0.35, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x83f5ff,
            emissive: 0x1eb7ff,
            emissiveIntensity: 0.85,
            roughness: 0.25,
            metalness: 0.15,
        });

        for (let i = 0; i < this.count; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            const shard = {
                mesh,
                home: new THREE.Vector3(),
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                orbitPhase: Math.random() * Math.PI * 2,
                bobPhase: Math.random() * Math.PI * 2,
                orbitRadius: 0.6 + Math.random() * 1.1,
                orbitSpeed: 0.8 + Math.random() * 1.5,
            };
            this._respawnShard(shard, true);
            mesh.position.copy(shard.position);
            this.group.add(mesh);
            this.shards.push(shard);
        }
    }

    _respawnShard(shard, initial = false, playerPosition = null) {
        const b = this.bounds;
        const z = playerPosition
            ? Math.min(b.maxZ, playerPosition.z - (20 + Math.random() * 85))
            : (b.minZ + Math.random() * (b.maxZ - b.minZ));

        shard.home.set(
            b.minX + Math.random() * (b.maxX - b.minX),
            b.minY + Math.random() * (b.maxY - b.minY),
            z,
        );
        shard.position.copy(shard.home);
        shard.velocity.set(0, 0, 0);
        shard.orbitPhase = Math.random() * Math.PI * 2;
        shard.bobPhase = Math.random() * Math.PI * 2;
        if (!initial) shard.mesh.scale.setScalar(0.65 + Math.random() * 0.5);
    }

    update(dt, time, player, worldTimeScale = 1) {
        const magnet = player.getMagnetState();
        const magnetRadiusSq = magnet ? magnet.radius * magnet.radius : 0;
        const magnetPull = magnet ? magnet.strength : 0;

        for (let i = 0; i < this.shards.length; i++) {
            const shard = this.shards[i];

            shard.orbitPhase += shard.orbitSpeed * dt;
            const orbitX = Math.cos(shard.orbitPhase) * shard.orbitRadius;
            const orbitY = Math.sin(shard.orbitPhase * 0.65 + shard.bobPhase) * 0.45;

            this._tmpVec.copy(shard.home);
            this._tmpVec.x += orbitX;
            this._tmpVec.y += orbitY + Math.sin(time * 2.5 + shard.bobPhase) * 0.2;

            this._tmpVec2.subVectors(this._tmpVec, shard.position).multiplyScalar(2.8);
            shard.velocity.lerp(this._tmpVec2, Math.min(1, dt * 3.2));

            if (magnet) {
                const distSq = player.position.distanceToSquared(shard.position);
                if (distSq <= magnetRadiusSq) {
                    const dist = Math.max(0.25, Math.sqrt(distSq));
                    this._tmpVec2.subVectors(player.position, shard.position).normalize();
                    const pull = (magnetPull / dist) * dt;
                    shard.velocity.addScaledVector(this._tmpVec2, pull);
                }
            }

            shard.position.addScaledVector(shard.velocity, dt * (0.85 + worldTimeScale * 0.15));
            shard.mesh.position.copy(shard.position);
            shard.mesh.rotation.x += 0.8 * dt;
            shard.mesh.rotation.y += 1.2 * dt;
            const shardScale = typeof player.resonanceTimer === 'number' && player.resonanceTimer > 0 ? 1.15 : 1.0;
            shard.mesh.scale.lerp(this._tmpVec2.setScalar(shardScale), Math.min(1, dt * 5));

            if (player.position.distanceToSquared(shard.position) < 1.4 * 1.4) {
                if (typeof player.collectShard === 'function') player.collectShard(1);
                else player.addEnergy(1);
                this._respawnShard(shard, false, player.position);
                shard.mesh.position.copy(shard.position);
            }

            if (shard.position.z > player.position.z + 25) {
                this._respawnShard(shard, false, player.position);
                shard.mesh.position.copy(shard.position);
            }
        }
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse((node) => {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
                if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
                else node.material.dispose();
            }
        });
        this.shards.length = 0;
    }
}
