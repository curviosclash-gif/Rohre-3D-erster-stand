import { resolveGameplayConfig } from '../../../shared/contracts/GameplayConfigContract.js';

const POST_PORTAL_SIGNAL_SECONDS = 0.55;

export class PortalRuntimeSystem {
    constructor(arena) {
        this.arena = arena;
        this._postPortalSignalByEntity = new Map();
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

    _normalizeEntityKey(entityId) {
        if (entityId === null || entityId === undefined) return '';
        return String(entityId).trim();
    }

    _resolveEntityCooldown(cooldownMap, entityId) {
        if (!(cooldownMap instanceof Map)) return 0;

        const directRemaining = Number(cooldownMap.get(entityId) || 0);
        if (directRemaining > 0) return directRemaining;

        const normalizedKey = this._normalizeEntityKey(entityId);
        if (!normalizedKey) return 0;

        const normalizedRemaining = Number(cooldownMap.get(normalizedKey) || 0);
        if (normalizedRemaining > 0) return normalizedRemaining;

        const numericKey = Number(normalizedKey);
        if (Number.isFinite(numericKey)) {
            const numericRemaining = Number(cooldownMap.get(numericKey) || 0);
            if (numericRemaining > 0) return numericRemaining;
        }

        return 0;
    }

    _getMaxCooldownForEntity(entries, entityId) {
        if (!Array.isArray(entries) || entries.length === 0) return 0;
        let maxRemaining = 0;
        for (const entry of entries) {
            const remaining = this._resolveEntityCooldown(entry?.cooldowns, entityId);
            if (remaining > maxRemaining) {
                maxRemaining = remaining;
            }
        }
        return maxRemaining;
    }

    _markPostPortalSignal(entityId, cooldownSeconds = 0) {
        const entityKey = this._normalizeEntityKey(entityId);
        if (!entityKey) return;

        this._postPortalSignalByEntity.set(entityKey, {
            remainingSeconds: POST_PORTAL_SIGNAL_SECONDS,
            cooldownSeconds: Math.max(0, Number(cooldownSeconds) || 0),
            lastPortalTravelAtMs: Date.now(),
        });
    }

    checkPortal(position, radius, entityId) {
        if (!this.arena.portalsEnabled) {
            return { blockedReason: 'inactive', inactiveReason: 'portals-disabled' };
        }
        const portalConfig = resolveGameplayConfig(this.arena).PORTAL;

        const triggerRadius = portalConfig.RADIUS;
        const triggerRadiusSq = (triggerRadius + radius) * (triggerRadius + radius);
        let blockedCooldownRemaining = 0;

        for (const portal of this.arena.portals) {
            const distASq = position.distanceToSquared(portal.posA);
            const distBSq = position.distanceToSquared(portal.posB);
            const inRangeA = distASq < triggerRadiusSq;
            const inRangeB = distBSq < triggerRadiusSq;
            const cooldownRemaining = this._resolveEntityCooldown(portal.cooldowns, entityId);

            if (cooldownRemaining > 0) {
                if (inRangeA || inRangeB) {
                    blockedCooldownRemaining = Math.max(blockedCooldownRemaining, cooldownRemaining);
                }
                continue;
            }

            if (inRangeA) {
                const dist = portal.posA.distanceTo(portal.posB);
                const dynamicCooldown = Math.min(2.5, Math.max(portalConfig.COOLDOWN, dist / 80));
                portal.cooldowns.set(entityId, dynamicCooldown);
                this._markPostPortalSignal(entityId, dynamicCooldown);
                return {
                    target: portal.posB,
                    portal,
                    cooldownSeconds: dynamicCooldown,
                    postPortalSeconds: POST_PORTAL_SIGNAL_SECONDS,
                };
            }
            if (inRangeB) {
                const dist = portal.posA.distanceTo(portal.posB);
                const dynamicCooldown = Math.min(2.5, Math.max(portalConfig.COOLDOWN, dist / 80));
                portal.cooldowns.set(entityId, dynamicCooldown);
                this._markPostPortalSignal(entityId, dynamicCooldown);
                return {
                    target: portal.posA,
                    portal,
                    cooldownSeconds: dynamicCooldown,
                    postPortalSeconds: POST_PORTAL_SIGNAL_SECONDS,
                };
            }
        }

        if (blockedCooldownRemaining > 0) {
            return {
                blockedReason: 'cooldown',
                cooldownRemaining: blockedCooldownRemaining,
            };
        }

        return null;
    }

    checkExitPortal(position, radius, entityId) {
        if (!this.arena.portalsEnabled) {
            return { blockedReason: 'inactive', inactiveReason: 'portals-disabled' };
        }
        if (!Array.isArray(this.arena.exitPortals) || this.arena.exitPortals.length === 0) return null;
        const portalConfig = resolveGameplayConfig(this.arena).PORTAL;

        const triggerRadius = portalConfig.RADIUS * 1.3;
        const triggerRadiusSq = (triggerRadius + radius) * (triggerRadius + radius);
        let blockedCooldownRemaining = 0;
        let touchedInactiveExitPortal = false;

        for (const exitPortal of this.arena.exitPortals) {
            const distSq = position.distanceToSquared(exitPortal.pos);
            if (distSq >= triggerRadiusSq) continue;

            if (!exitPortal.active) {
                touchedInactiveExitPortal = true;
                continue;
            }

            const cooldownRemaining = this._resolveEntityCooldown(exitPortal.cooldowns, entityId);
            if (cooldownRemaining > 0) {
                blockedCooldownRemaining = Math.max(blockedCooldownRemaining, cooldownRemaining);
                continue;
            }

            exitPortal.cooldowns.set(entityId, 3.0);
            return { triggered: true, exitPortal, cooldownSeconds: 3.0 };
        }

        if (blockedCooldownRemaining > 0) {
            return {
                blockedReason: 'cooldown',
                cooldownRemaining: blockedCooldownRemaining,
            };
        }

        if (touchedInactiveExitPortal) {
            return {
                blockedReason: 'inactive',
                inactiveReason: 'exit-portal-inactive',
            };
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

        for (const [entityKey, signal] of this._postPortalSignalByEntity.entries()) {
            const remainingSeconds = Math.max(0, Number(signal?.remainingSeconds) || 0) - dt;
            if (remainingSeconds <= 0) {
                this._postPortalSignalByEntity.delete(entityKey);
            } else {
                signal.remainingSeconds = remainingSeconds;
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

    getEntityPortalRuntimeSignal(entityId) {
        const exitPortals = Array.isArray(this.arena.exitPortals) ? this.arena.exitPortals : [];
        const activeExitPortals = exitPortals.reduce((count, entry) => count + (entry?.active === true ? 1 : 0), 0);
        const entityKey = this._normalizeEntityKey(entityId);
        const postPortalSignal = entityKey ? this._postPortalSignalByEntity.get(entityKey) : null;
        const postPortalRemainingSeconds = Math.max(0, Number(postPortalSignal?.remainingSeconds) || 0);

        return {
            portalsEnabled: this.arena.portalsEnabled !== false,
            portalCooldownRemaining: this._getMaxCooldownForEntity(this.arena.portals, entityId),
            exitPortalCooldownRemaining: this._getMaxCooldownForEntity(exitPortals, entityId),
            exitPortal: {
                totalCount: exitPortals.length,
                activeCount: activeExitPortals,
                inactiveCount: Math.max(0, exitPortals.length - activeExitPortals),
            },
            postPortalActive: postPortalRemainingSeconds > 0,
            postPortalRemainingSeconds,
            lastPortalTravelAtMs: Math.max(0, Math.trunc(Number(postPortalSignal?.lastPortalTravelAtMs) || 0)),
        };
    }
}
