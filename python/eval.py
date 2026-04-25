"""PPO eval entrypoint."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from scaffold.bt93b_runner import DEFAULT_ARTIFACT_ROOT, latest_checkpoint_path, run_from_cli as run_bt93b_from_cli


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", default="bt93b", choices=["bt93b", "bt93c", "bt93f", "bt93g"])
    parser.add_argument("--run-kind", default="eval-smoke")
    parser.add_argument("--phase-id", default=None)
    parser.add_argument("--manifest-template", default=None)
    parser.add_argument("--config", default=None)
    parser.add_argument("--artifact-root", default=None)
    parser.add_argument("--target-steps-per-env", type=int, default=64)
    parser.add_argument("--eval-steps", type=int, default=None)
    parser.add_argument("--checkpoint", default=None)
    args = parser.parse_args()

    if args.profile in {"bt93c", "bt93f", "bt93g"}:
        if args.run_kind not in {
            "eval-smoke",
            "diagnostics-eval",
            "pilot-eval",
            "baseline-eval",
            "baseline-repro-eval",
            "holdout-eval",
            "comparable-repair-eval",
        }:
            raise SystemExit(f"unsupported PPO eval run kind: {args.run_kind}")
        from scripts.bt93c_learner_smoke import run_eval_from_cli as run_bt93c_eval_from_cli

        run_bt93c_eval_from_cli(
            run_kind=args.run_kind,
            phase_id=args.phase_id
            or {
                "diagnostics-eval": "93C.4.2",
                "pilot-eval": "93C.5.2",
                "baseline-eval": "93C.5.3",
                "baseline-repro-eval": "93F.4.2" if args.profile == "bt93f" else "93C.7.1",
                "holdout-eval": "93G.5.4" if args.profile == "bt93g" else "93F.4.2" if args.profile == "bt93f" else "93C.6.2",
                "comparable-repair-eval": "93G.5.4",
            }.get(args.run_kind, "93C.3.4"),
            config_path=args.config,
            artifact_root=args.artifact_root,
            eval_steps=args.eval_steps,
            checkpoint=args.checkpoint,
        )
        return

    artifact_root = Path(args.artifact_root).resolve() if args.artifact_root else DEFAULT_ARTIFACT_ROOT
    checkpoint = args.checkpoint or str(latest_checkpoint_path(artifact_root))
    run_bt93b_from_cli(
        run_kind=args.run_kind,
        phase_id=args.phase_id or "93B.3.1",
        manifest_template=args.manifest_template,
        artifact_root=args.artifact_root,
        target_steps_per_env=args.target_steps_per_env,
        checkpoint=checkpoint,
    )


if __name__ == "__main__":
    main()

