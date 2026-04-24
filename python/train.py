"""BT93B scaffold train entrypoint.

This is a scaffold-only runner. It exercises the measured 2-env boundary lane,
persists manifest/checkpoint/normalization artifacts, and makes no baseline or
promotion claim.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from scaffold.bt93b_runner import run_from_cli


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", default="bt93b", choices=["bt93b"])
    parser.add_argument("--run-kind", default="fresh-smoke", choices=["fresh-smoke", "resume-smoke"])
    parser.add_argument("--phase-id", default="93B.2.1")
    parser.add_argument("--manifest-template", default=None)
    parser.add_argument("--artifact-root", default=None)
    parser.add_argument("--target-steps-per-env", type=int, default=None)
    parser.add_argument("--checkpoint", default=None)
    args = parser.parse_args()

    run_from_cli(
        run_kind=args.run_kind,
        phase_id=args.phase_id,
        manifest_template=args.manifest_template,
        artifact_root=args.artifact_root,
        target_steps_per_env=args.target_steps_per_env,
        checkpoint=args.checkpoint,
    )


if __name__ == "__main__":
    main()

