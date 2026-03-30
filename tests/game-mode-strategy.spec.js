import { test, expect } from '@playwright/test';
import { loadGame, startGame } from './helpers.js';

test.describe('Game Mode Strategy (V47)', () => {
    test.describe.configure({ timeout: 60000 });

    test('S01: GameModeRegistry returns ClassicModeStrategy for unknown mode', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { createGameModeStrategy } = await import('/src/modes/GameModeRegistry.js');
            const s = createGameModeStrategy('UNKNOWN_MODE');
            return { modeType: s.modeType };
        });
        expect(result.modeType).toBe('CLASSIC');
    });

    test('S02: GameModeRegistry returns ClassicModeStrategy for "classic"', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { createGameModeStrategy } = await import('/src/modes/GameModeRegistry.js');
            const s = createGameModeStrategy('classic');
            return { modeType: s.modeType };
        });
        expect(result.modeType).toBe('CLASSIC');
    });

    test('S03: GameModeRegistry returns HuntModeStrategy for "hunt"', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { createGameModeStrategy } = await import('/src/modes/GameModeRegistry.js');
            const s = createGameModeStrategy('HUNT');
            return { modeType: s.modeType };
        });
        expect(result.modeType).toBe('HUNT');
    });

    test('S04: ClassicModeStrategy feature flags', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { ClassicModeStrategy } = await import('/src/modes/ClassicModeStrategy.js');
            const s = new ClassicModeStrategy();
            return {
                requiresShootItemIndex: s.requiresShootItemIndex(),
                hasMachineGun: s.hasMachineGun(),
                isRespawnEnabled: s.isRespawnEnabled(),
                hasScoring: s.hasScoring(),
                hasDamageEvents: s.hasDamageEvents(),
                hasDestructibleTrails: s.hasDestructibleTrails(),
                isHudVisible: s.isHudVisible(),
            };
        });
        expect(result.requiresShootItemIndex).toBe(false);
        expect(result.hasMachineGun).toBe(false);
        expect(result.isRespawnEnabled).toBe(false);
        expect(result.hasScoring).toBe(false);
        expect(result.hasDamageEvents).toBe(false);
        expect(result.hasDestructibleTrails).toBe(false);
        expect(result.isHudVisible).toBe(false);
    });

    test('S05: HuntModeStrategy feature flags', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { HuntModeStrategy } = await import('/src/modes/HuntModeStrategy.js');
            const s = new HuntModeStrategy();
            return {
                requiresShootItemIndex: s.requiresShootItemIndex(),
                hasMachineGun: s.hasMachineGun(),
                hasScoring: s.hasScoring(),
                hasDamageEvents: s.hasDamageEvents(),
                hasDestructibleTrails: s.hasDestructibleTrails(),
                isHudVisible: s.isHudVisible(),
            };
        });
        expect(result.requiresShootItemIndex).toBe(true);
        expect(result.hasMachineGun).toBe(true);
        expect(result.hasScoring).toBe(true);
        expect(result.hasDamageEvents).toBe(true);
        expect(result.hasDestructibleTrails).toBe(true);
        expect(result.isHudVisible).toBe(true);
    });

    test('S06: ClassicModeStrategy resetPlayerHealth sets hp=1', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { ClassicModeStrategy } = await import('/src/modes/ClassicModeStrategy.js');
            const s = new ClassicModeStrategy();
            const player = { hasShield: true, maxHp: 0, hp: 0, maxShieldHp: 0, shieldHP: 0, lastDamageTimestamp: 0, shieldHitFeedback: 0 };
            s.resetPlayerHealth(player);
            return { maxHp: player.maxHp, hp: player.hp, shieldHP: player.shieldHP };
        });
        expect(result.maxHp).toBe(1);
        expect(result.hp).toBe(1);
        expect(result.shieldHP).toBe(1);
    });

    test('S07: HuntModeStrategy resetPlayerHealth sets hp=100', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { HuntModeStrategy } = await import('/src/modes/HuntModeStrategy.js');
            const s = new HuntModeStrategy();
            const player = { hasShield: true, maxHp: 0, hp: 0, maxShieldHp: 0, shieldHP: 0, lastDamageTimestamp: 0, shieldHitFeedback: 0 };
            s.resetPlayerHealth(player);
            return { maxHp: player.maxHp, hp: player.hp, shieldHP: player.shieldHP };
        });
        expect(result.maxHp).toBe(100);
        expect(result.hp).toBe(100);
        expect(result.shieldHP).toBe(40);
    });

    test('S08: ClassicModeStrategy applyDamage is instant kill', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { ClassicModeStrategy } = await import('/src/modes/ClassicModeStrategy.js');
            const s = new ClassicModeStrategy();
            const player = { maxHp: 1, hp: 1, shieldHP: 0, hasShield: false, lastDamageTimestamp: 0 };
            const dmg = s.applyDamage(player, 1, {});
            return { isDead: dmg.isDead, remainingHp: dmg.remainingHp, hp: player.hp };
        });
        expect(result.isDead).toBe(true);
        expect(result.remainingHp).toBe(0);
        expect(result.hp).toBe(0);
    });

    test('S09: HuntModeStrategy applyDamage with shield absorption', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { HuntModeStrategy } = await import('/src/modes/HuntModeStrategy.js');
            const s = new HuntModeStrategy();
            const player = { maxHp: 100, hp: 100, maxShieldHp: 40, shieldHP: 40, hasShield: true, shieldHitFeedback: 0, lastDamageTimestamp: 0 };
            const dmg = s.applyDamage(player, 30, {});
            return { isDead: dmg.isDead, absorbedByShield: dmg.absorbedByShield, remainingHp: dmg.remainingHp, shieldHP: player.shieldHP };
        });
        expect(result.isDead).toBe(false);
        expect(result.absorbedByShield).toBe(30);
        expect(result.remainingHp).toBe(100);
        expect(result.shieldHP).toBe(10);
    });

    test('S10: ClassicModeStrategy resolveCollisionDamage returns 1', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { ClassicModeStrategy } = await import('/src/modes/ClassicModeStrategy.js');
            const s = new ClassicModeStrategy();
            return {
                wall: s.resolveCollisionDamage('WALL'),
                trail: s.resolveCollisionDamage('TRAIL'),
            };
        });
        expect(result.wall).toBe(1);
        expect(result.trail).toBe(1);
    });

    test('S11: HuntModeStrategy resolveRocketProjectileParams returns params for rocket', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { HuntModeStrategy } = await import('/src/modes/HuntModeStrategy.js');
            const s = new HuntModeStrategy();
            const params = s.resolveRocketProjectileParams('ROCKET_WEAK');
            const noParams = s.resolveRocketProjectileParams('SPEED_UP');
            return {
                hasParams: !!params,
                hasVisualScale: params?.visualScale > 0,
                noParamsIsNull: noParams === null,
            };
        });
        expect(result.hasParams).toBe(true);
        expect(result.hasVisualScale).toBe(true);
        expect(result.noParamsIsNull).toBe(true);
    });

    test('S12: ClassicModeStrategy resolveRocketProjectileParams returns null', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { ClassicModeStrategy } = await import('/src/modes/ClassicModeStrategy.js');
            const s = new ClassicModeStrategy();
            return { result: s.resolveRocketProjectileParams('ROCKET_WEAK') };
        });
        expect(result.result).toBeNull();
    });

    test('S13: ClassicModeStrategy grantShield sets shieldHP=1', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { ClassicModeStrategy } = await import('/src/modes/ClassicModeStrategy.js');
            const s = new ClassicModeStrategy();
            const player = { hasShield: false, maxShieldHp: 0, shieldHP: 0, shieldHitFeedback: 0 };
            const hp = s.grantShield(player);
            return { hp, shieldHP: player.shieldHP, hasShield: player.hasShield };
        });
        expect(result.hp).toBe(1);
        expect(result.shieldHP).toBe(1);
        expect(result.hasShield).toBe(true);
    });

    test('S14: HuntModeStrategy grantShield sets full shieldHP', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { HuntModeStrategy } = await import('/src/modes/HuntModeStrategy.js');
            const s = new HuntModeStrategy();
            const player = { hasShield: false, maxShieldHp: 0, shieldHP: 0, shieldHitFeedback: 0 };
            const hp = s.grantShield(player);
            return { hp, shieldHP: player.shieldHP, hasShield: player.hasShield };
        });
        expect(result.hp).toBe(40);
        expect(result.shieldHP).toBe(40);
        expect(result.hasShield).toBe(true);
    });

    test('S14a: RocketPickupSystem normalisiert Legacy-Rocket-Typen auf aktive Tiers', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const {
                normalizeRocketPickupType,
                isRocketTierType,
            } = await import('/src/hunt/RocketPickupSystem.js');
            const strong = normalizeRocketPickupType('ROCKET_STRONG');
            const weak = normalizeRocketPickupType('rocket');
            return {
                strong,
                weak,
                strongIsTier: isRocketTierType(strong),
                weakIsTier: isRocketTierType(weak),
            };
        });
        expect(result.strong).toBe('ROCKET_HEAVY');
        expect(result.weak).toBe('ROCKET_WEAK');
        expect(result.strongIsTier).toBeTruthy();
        expect(result.weakIsTier).toBeTruthy();
    });

    test('S14b: RocketPickupSystem waehlt bei null Gewichten stabilen Fallback und respektiert Allowlist', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { pickWeightedRocketTierType } = await import('/src/hunt/RocketPickupSystem.js');
            const fallback = pickWeightedRocketTierType({
                allowedTypes: ['ROCKET_HEAVY', 'ROCKET_MEGA'],
                tiersConfig: {
                    WEAK: { spawnChance: 0 },
                    MEDIUM: { spawnChance: 0 },
                    HEAVY: { spawnChance: 0 },
                    MEGA: { spawnChance: 0 },
                },
                random: () => 0.97,
            });
            const weighted = pickWeightedRocketTierType({
                allowedTypes: ['ROCKET_HEAVY', 'ROCKET_MEGA'],
                tiersConfig: {
                    HEAVY: { spawnChance: 0.2 },
                    MEGA: { spawnChance: 0.8 },
                },
                random: () => 0.9,
            });
            return { fallback, weighted };
        });
        expect(result.fallback).toBe('ROCKET_HEAVY');
        expect(result.weighted).toBe('ROCKET_MEGA');
    });

    test('S14c: HuntModeStrategy resolveSpawnType bleibt robust bei invaliden Non-Rocket-Gewichten', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { HuntModeStrategy } = await import('/src/modes/HuntModeStrategy.js');
            const strategy = new HuntModeStrategy();
            const nonRocketFallback = strategy.resolveSpawnType(
                ['SHIELD', 'SPEED_UP', 'ROCKET_WEAK'],
                {
                    HUNT: {
                        ROCKET_PICKUP_SPAWN_CHANCE: 0,
                        PICKUP_WEIGHTS: {
                            SHIELD: 0,
                            SPEED_UP: -4,
                        },
                    },
                }
            );
            const forcedRocket = strategy.resolveSpawnType(
                ['SPEED_UP', 'ROCKET_WEAK'],
                {
                    HUNT: {
                        ROCKET_PICKUP_SPAWN_CHANCE: 1,
                        PICKUP_WEIGHTS: {
                            SPEED_UP: 10,
                        },
                        ROCKET_TIERS: {
                            WEAK: { spawnChance: 0 },
                            MEDIUM: { spawnChance: 0 },
                            HEAVY: { spawnChance: 0 },
                            MEGA: { spawnChance: 0 },
                        },
                    },
                }
            );
            return { nonRocketFallback, forcedRocket };
        });
        expect(result.nonRocketFallback).toBe('SHIELD');
        expect(result.forcedRocket).toBe('ROCKET_WEAK');
    });

    test('S14d: HuntModeStrategy behandelt Shield-Treffer als Damage-Kontakt fuer Regen-Delay', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { HuntModeStrategy } = await import('/src/modes/HuntModeStrategy.js');
            const strategy = new HuntModeStrategy();
            const config = {
                HUNT: {
                    PLAYER_MAX_HP: 100,
                    PLAYER_REGEN_DELAY: 3,
                    PLAYER_REGEN_PER_SECOND: 2,
                    SHIELD_MAX_HP: 40,
                },
            };
            const player = {
                maxHp: 100,
                hp: 80,
                maxShieldHp: 40,
                shieldHP: 40,
                hasShield: true,
                shieldHitFeedback: 0,
                lastDamageTimestamp: -Infinity,
            };

            const damage = strategy.applyDamage(player, 10, { nowSeconds: 10 }, config);
            const hpAfterHit = Number(player.hp || 0);
            const lastDamageTimestamp = Number(player.lastDamageTimestamp || 0);

            strategy.updateHealthRegen(player, 1, config, 11.0);
            const hpAfterEarlyRegenTick = Number(player.hp || 0);

            strategy.updateHealthRegen(player, 1, config, 13.6);
            const hpAfterLateRegenTick = Number(player.hp || 0);

            return {
                damage,
                hpAfterHit,
                lastDamageTimestamp,
                hpAfterEarlyRegenTick,
                hpAfterLateRegenTick,
            };
        });
        expect(result.damage.absorbedByShield).toBeGreaterThan(0);
        expect(result.hpAfterHit).toBe(80);
        expect(result.lastDamageTimestamp).toBe(10);
        expect(result.hpAfterEarlyRegenTick).toBe(80);
        expect(result.hpAfterLateRegenTick).toBeGreaterThan(80);
    });

    test('S15: EntityManager has gameModeStrategy wired after setup', async ({ page }) => {
        await startGame(page);
        const result = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const em = game?.entityManager;
            if (!em) return { error: 'no-entityManager' };
            return {
                hasStrategy: !!em.gameModeStrategy,
                modeType: em.gameModeStrategy?.modeType || null,
            };
        });
        expect(result.hasStrategy).toBe(true);
        expect(result.modeType).toBeTruthy();
    });

    test('S16: registerGameModeStrategy allows adding new mode', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { createGameModeStrategy, registerGameModeStrategy } = await import('/src/modes/GameModeRegistry.js');
            const { GameModeContract } = await import('/src/modes/GameModeContract.js');
            class ArcadeModeStrategy extends GameModeContract {
                get modeType() { return 'ARCADE'; }
            }
            registerGameModeStrategy('ARCADE', () => new ArcadeModeStrategy());
            const s = createGameModeStrategy('ARCADE');
            return { modeType: s.modeType };
        });
        expect(result.modeType).toBe('ARCADE');
    });
});
