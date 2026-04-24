# PPO Artifact Path

Dieser Pfad ist ab BT90 der vorgesehene versionierbare Repo-Bauort fuer nichtproduktive PPO-Artefakte.
Die aktuell darin liegenden BT91-BT93C-Dateien sind repo-versionierte Evidence, sofern sie in `git ls-files data/training/ppo` auftauchen. Lokale Zusatzartefakte ohne Git-Eintrag bleiben nur Zusatzspuren und duerfen keine Closure-Evidence sein.

Zulaessig:
- Manifeste und Reports fuer Bootstrap-, Contract-Smoke-, Sidecar- und Lane-Evidence
- Single-Env-Smokes und Compliance-Evidence aus BT92
- Freeze-/Drift-Artefakte aus `python/scripts/bt90_freeze_check.py`
- spaetere Freeze-/Baseline-Artefakte aus BT91-BT95

Aktuelle versionierte BT90-BT93C-Artefaktklassen:

- `contract_smoke.json`
- `lane_baseline.json`
- `freeze_check.json`
- `single_env_smoke.json`
- `bt93a_*`
- `bt93b/**`
- `bt93c/**`

Nicht zulaessig:
- produktive Runtime-Artefakte
- generische Trainingsruns ausserhalb des PPO-Zweitpfads
- Lock-, Status- oder Gate-Pflege ausserhalb von `docs/bot-training/Bot_Trainingsplan.md`
