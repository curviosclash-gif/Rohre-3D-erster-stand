const fs = require('fs');

function patchFile(file, searchRegex, replaceStr) {
    let content = fs.readFileSync(file, 'utf8');
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, replaceStr);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Patched ' + file);
    } else {
        console.log('String not found in ' + file);
    }
}

patchFile('src/core/main.js',
    /import \{ ScreenShake \} from '\.\.\/hunt\/ScreenShake\.js';[\s\r\n]*\/\* global/,
    `import { ScreenShake } from '../hunt/ScreenShake.js';\nimport { aiManager } from '../ai/AiManager.mjs';\nimport { AiBot } from '../ai/ai_bridge.mjs';\n\n/* global`
);

patchFile('src/core/main.js',
    /this\._autoStartPlaytestIfRequested\(\);[\s\r\n]*\}[\s\r\n]*\/\/ update/,
    `this._autoStartPlaytestIfRequested();\n\n        // Einmalig beim Spielstart:\n        aiManager.loadModel('PPO_V2', './assets/ai/rohre_ppo.onnx', AiBot).catch(e => {\n            console.warn('[Game] AI loadModel failed:', e);\n        });\n    }\n\n    // update`
);

patchFile('src/core/config/ConfigSections.js',
    /itemContextWeight: 1\.0,[\s\r\n]*\},[\s\r\n]*\},[\s\r\n]*\},/,
    `itemContextWeight: 1.0,\n            },\n            PPO_V2: {\n                reactionTime: 0.1,\n                lookAhead: 15,\n                aggression: 0.8,\n                errorRate: 0.0,\n                probeSpread: 0.9,\n                probeStep: 1.4,\n                turnCommitTime: 0.24,\n                stuckCheckInterval: 0.35,\n                stuckTriggerTime: 1.0,\n                minProgressDistance: 1.0,\n                minForwardProgress: 0.5,\n                recoveryDuration: 1.25,\n                recoveryCooldown: 1.2,\n                itemUseCooldown: 0.78,\n                itemShootCooldown: 0.48,\n                targetRefreshInterval: 0.12,\n                portalInterest: 0.74,\n                portalSeekDistance: 84,\n                portalEntryDotMin: 0.35,\n                portalIntentThreshold: 0.14,\n                portalIntentDuration: 1.35,\n                boostChance: 0.0065,\n                probeCount: 12,\n                projectileAwareness: 0.95,\n                pursuitEnabled: true,\n                pursuitRadius: 50,\n                pursuitAimTolerance: 0.75,\n                heightBias: 0.25,\n                spacingWeight: 0.5,\n                itemContextWeight: 1.0,\n            },\n        },\n    },`
);

patchFile('src/entities/Bot.js',
    /import \{ enterRecovery, updateRecovery, updateStuckState \} from '\.\/ai\/BotRecoveryOps\.js';[\s\r\n]*const WORLD_UP/,
    `import { enterRecovery, updateRecovery, updateStuckState } from './ai/BotRecoveryOps.js';\nimport { aiManager } from '../ai/AiManager.mjs';\n\nconst WORLD_UP`
);

patchFile('src/entities/Bot.js',
    /this\._updateTimers\(dt\);[\s\r\n]*updateStuckState\(this, player, arena, allPlayers\);[\s\r\n]*if \(this\.state\.recoveryActive\) \{[\s\r\n]*if \(updateRecovery\(this, dt, player, arena, allPlayers\)\) \{/,
    `this._updateTimers(dt);\n        updateStuckState(this, player, arena, allPlayers);\n\n        // --- NEU: PPO Bot Integration ---\n        this._gameTime = (this._gameTime || 0) + dt;\n        if (activeDifficulty === 'PPO_V2') {\n            aiManager.decideForPlayer(\n                player,\n                'PPO_V2',\n                allPlayers,\n                arena,\n                projectiles,\n                [], \n                this._gameTime,\n                CONFIG\n            ).then(action => {\n                if (action) {\n                    this.currentInput.yawLeft = action[0] === 0;\n                    this.currentInput.yawRight = action[0] === 2;\n                    this.currentInput.pitchUp = action[1] === 0;\n                    this.currentInput.pitchDown = action[1] === 2;\n                    this.currentInput.boost = action[2] === 1;\n                    this.currentInput.useItem = action[3] > 0 ? action[3] - 1 : -1;\n                    this.currentInput.shootItem = action[4] === 1;\n                    if (this.currentInput.shootItem) {\n                        this.currentInput.shootItemIndex = action[5];\n                    }\n                }\n            });\n            return this.currentInput;\n        }\n\n        if (this.state.recoveryActive) {\n            if (updateRecovery(this, dt, player, arena, allPlayers)) {`
);
