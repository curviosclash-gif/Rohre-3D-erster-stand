# PPO Artifact Path

Dieser Pfad ist ab BT90 der vorgesehene versionierbare Repo-Bauort fuer nichtproduktive PPO-Artefakte.
Die aktuell darin liegenden BT91/BT92-Dateien sind im Worktree vorhanden, werden von Git derzeit aber noch als untracked gefuehrt.

Zulaessig:
- Manifeste und Reports fuer Bootstrap-, Contract-Smoke-, Sidecar- und Lane-Evidence
- Single-Env-Smokes und Compliance-Evidence aus BT92
- Freeze-/Drift-Artefakte aus `python/scripts/bt90_freeze_check.py`
- spaetere Freeze-/Baseline-Artefakte aus BT91-BT95

Aktuelle lokale BT90-BT92-Artefakte im Worktree (laut Git-Status noch nicht repo-versioniert):

- `contract_smoke.json`
- `lane_baseline.json`
- `freeze_check.json`
- `single_env_smoke.json`

Nicht zulaessig:
- produktive Runtime-Artefakte
- generische Trainingsruns ausserhalb des PPO-Zweitpfads
- Lock-, Status- oder Gate-Pflege ausserhalb von `docs/bot-training/Bot_Trainingsplan.md`
