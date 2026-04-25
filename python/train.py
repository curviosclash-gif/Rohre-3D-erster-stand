"""PPO train entrypoint.

BT93B stays scaffold-only. BT93C runs the first real PPO optimizer smoke and
still makes no pilot, baseline, promotion, or runtime-integration claim.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from scaffold.bt93b_runner import run_from_cli as run_bt93b_from_cli


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", default="bt93b", choices=["bt93b", "bt93c", "bt93f"])
    parser.add_argument("--run-kind", default=None)
    parser.add_argument("--phase-id", default=None)
    parser.add_argument("--manifest-template", default=None)
    parser.add_argument("--config", default=None)
    parser.add_argument("--artifact-root", default=None)
    parser.add_argument("--target-steps-per-env", type=int, default=None)
    parser.add_argument("--total-timesteps", type=int, default=None)
    parser.add_argument("--checkpoint", default=None)
    args = parser.parse_args()

    if args.profile == "bt93b":
        run_kind = args.run_kind or "fresh-smoke"
        if run_kind not in {"fresh-smoke", "resume-smoke"}:
            raise SystemExit(f"unsupported BT93B run kind: {run_kind}")
        phase_id = args.phase_id or ("93B.3.1" if run_kind == "resume-smoke" else "93B.2.1")
        run_bt93b_from_cli(
            run_kind=run_kind,
            phase_id=phase_id,
            manifest_template=args.manifest_template,
            artifact_root=args.artifact_root,
            target_steps_per_env=args.target_steps_per_env,
            checkpoint=args.checkpoint,
        )
        return

    run_kind = args.run_kind or ("repair-diagnostic" if args.profile == "bt93f" else "learner-smoke")
    default_phase_ids = {
        "learner-smoke": "93C.3.1",
        "resume-smoke": "93C.3.2",
        "diagnostics-smoke": "93C.4.1",
        "pilot-train": "93C.5.2",
        "baseline-train": "93C.5.3",
        "repair-diagnostic": "93F.4.1",
    }
    phase_id = args.phase_id or default_phase_ids.get(run_kind, "93C.3.1")
    from scripts.bt93c_learner_smoke import run_training_from_cli as run_bt93c_training_from_cli

    run_bt93c_training_from_cli(
        run_kind=run_kind,
        phase_id=phase_id,
        config_path=args.config,
        artifact_root=args.artifact_root,
        total_timesteps=args.total_timesteps,
        checkpoint=args.checkpoint,
    )


if __name__ == "__main__":
    main()
