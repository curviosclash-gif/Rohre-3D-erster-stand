import { CONFIG } from '../../../core/Config.js';

export class PortalRuntimeSystem {
    constructor(arena) {
        this.arena = arena;
    }

    _syncPortalVisualState(portal, timeSeconds = 0) {
        if (!portal) return;
        const engaged = portal.cooldowns instanceof Map && portal.cooldowns.size > 0;
        const scale = engaged ? 0.88 + Math.sin(timeSeconds * 6) * 0.03 : 1;
        portal.meshA?.scale?.setScalar?.(scale);
        portal.meshB?.scale?.setScalar?.(scale);
    }

    _syncExitPortalVisualState(exitPortal, timeSeconds = 0) {
        if (!exitPortal?.mesh) return;
        const engaged = exitPortal.cooldowns instanceof Map && exitPortal.cooldowns.size > 0;
        const scale = engaged ? 1.24 + Math.sin(timeSeconds * 6) * 0.04 : 1.4;
        exitPortal.mesh.scale?.set?.(scale, scale, scale);
    }

    checkPortal(position, radius, entityId) {
        if (!this.arena.portalsEnabled) return null;

        const triggerRadius = CONFIG.PORTAL.RADIUS;
        const triggerRadiusSq = (triggerRadius + radius) * (triggerRadius + radius);

        for (const portal of this.arena.portals) {
            if (portal.cooldowns.has(entityId) && portal.cooldowns.get(entityId) > 0) continue;

            const distASq = position.distanceToSquared(portal.posA);
            const distBSq = position.distanceToSquared(portal.posB);

            if (distASq < triggerRadiusSq) {
                const dist = portal.posA.distanceTo(portal.posB);
                const dynamicCooldown = Math.min(2.5, Math.max(CONFIG.PORTAL.COOLDOWN, dist / 80));
                portal.cooldowns.set(entityId, dynamicCooldown);
                return { target: portal.posB, portal };
            }
            if (distBSq < triggerRadiusSq) {
                const dist = portal.posA.distanceTo(portal.posB);
                const dynamicCooldown = Math.min(2.5, Math.max(CONFIG.PORTAL.COOLDOWN, dist / 80));
                portal.cooldowns.set(entityId, dynamicCooldown);
                return { target: portal.posA, portal };
            }
        }

        return null;
    }

    checkExitPortal(position, radius, entityId) {
        if (!this.arena.portalsEnabled) return null;
        if (!Array.isArray(this.arena.exitPortals) || this.arena.exitPortals.length === 0) return null;

        const triggerRadius = CONFIG.PORTAL.RADIUS * 1.3;
        const triggerRadiusSq = (triggerRadius + radius) * (triggerRadius + radius);

        for (const exitPortal of this.arena.exitPortals) {
            if (!exitPortal.active) continue;
            if (exitPortal.cooldowns.has(entityId) && exitPortal.cooldowns.get(entityId) > 0) continue;

            const distSq = position.distanceToSquared(exitPortal.pos);
            if (distSq < triggerRadiusSq) {
                exitPortal.cooldowns.set(entityId, 3.0);
                return { triggered: true, exitPortal };
            }
        }

        return null;
    }

    activateExitPortals() {
        if (!Array.isArray(this.arena.exitPortals)) return;
        for (const exitPortal of this.arena.exitPortals) {
            exitPortal.active = true;
            if (exitPortal.mesh) {
                exitPortal.mesh.visible = true;
            }
        }
    }

    deactivateExitPortals() {
        if (!Array.isArray(this.arena.exitPortals)) return;
        for (const exitPortal of this.arena.exitPortals) {
            exitPortal.active = false;
            if (exitPortal.mesh) {
                exitPortal.mesh.visible = false;
            }
        }
    }

    update(dt) {
        for (const portal of this.arena.portals) {
            for (const [id, t] of portal.cooldowns) {
                const newT = t - dt;
                if (newT <= 0) {
                    portal.cooldowns.delete(id);
                } else {
                    portal.cooldowns.set(id, newT);
                }
            }
        }

        if (Array.isArray(this.arena.exitPortals)) {
            for (const exitPortal of this.arena.exitPortals) {
                for (const [id, t] of exitPortal.cooldowns) {
                    const newT = t - dt;
                    if (newT <= 0) {
                        exitPortal.cooldowns.delete(id);
                    } else {
                        exitPortal.cooldowns.set(id, newT);
                    }
                }
            }
        }

        const time = performance.now() * 0.001;
        for (const portal of this.arena.portals) {
            if (portal.meshA?.setSpinZ) {
                portal.meshA.setSpinZ(time * 0.5);
            } else if (portal.meshA) {
                portal.meshA.rotation.z = time * 0.5;
            }
            if (portal.meshB?.setSpinZ) {
                portal.meshB.setSpinZ(-time * 0.5);
            } else if (portal.meshB) {
                portal.meshB.rotation.z = -time * 0.5;
            }
            this._syncPortalVisualState(portal, time);
        }

        if (Array.isArray(this.arena.exitPortals)) {
            for (const exitPortal of this.arena.exitPortals) {
                if (!exitPortal.mesh || !exitPortal.active) continue;
                if (exitPortal.mesh.setSpinZ) {
                    exitPortal.mesh.setSpinZ(time * 0.8);
                } else {
                    exitPortal.mesh.rotation.z = time * 0.8;
                }
                this._syncExitPortalVisualState(exitPortal, time);
            }
        }
    }
}
