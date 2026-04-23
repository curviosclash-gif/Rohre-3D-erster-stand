"""CLI entrypoint for the BT91 bridge-v1 sidecar."""

from __future__ import annotations

import argparse
import asyncio
import signal
import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))

from bridge.sidecar_server import Bt91HeadlessBridgeSidecar


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="BT91 minimal Python sidecar for the existing bridge-v1 path."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--session-id", default="bt91-sidecar")
    return parser


async def main() -> None:
    args = build_parser().parse_args()
    sidecar = Bt91HeadlessBridgeSidecar(
        host=args.host,
        port=args.port,
        session_id=args.session_id,
    )
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, sidecar.stop)
        except NotImplementedError:
            pass
    await sidecar.run()


if __name__ == "__main__":
    asyncio.run(main())
