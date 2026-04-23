# BT92 Single-Env

`python/envs/curvios_env.py` kapselt genau ein headless `gymnasium.Env` ueber den bestehenden Bridge-/Contract-v1-Pfad.

BT92 in diesem Pfad:

- `reset()`, `step()` und `close()` fuer genau einen Env-Lifecycle
- sichtbare Weitergabe von `reward`, `done`, `truncated`, `rewardBreakdown`, `terminalReason`, `truncatedReason`, `hybridDecision`, `observationSchemaVersion` und `observationLength`
- Action-Mapping gegen die bestehende Bool-/Index-Semantik aus `BotActionContract.js`

Weiterhin explizit ausserhalb:

- Mehr-Env
- VecEnv
- PPO-Baseline
- Parallelisierung
