#!/usr/bin/env python3
"""Create a deterministic KOReader offline-preview ZIP package."""
from __future__ import annotations

import argparse
from pathlib import Path
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PLUGIN = ROOT / "plugins" / "koreader" / "grimmlink_next.koplugin"
REQUIRED = {"_meta.lua", "main.lua", "offline_core.lua", "README.md"}


def package(output: Path) -> None:
    files = sorted(path for path in PLUGIN.rglob("*") if path.is_file())
    names = {path.relative_to(PLUGIN).as_posix() for path in files}
    if not REQUIRED.issubset(names):
        raise SystemExit("KOReader plugin package is missing required files")
    if any(path.suffix in {".pyc", ".db", ".sqlite", ".log"} for path in files):
        raise SystemExit("Refusing to include generated or private data")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            info = zipfile.ZipInfo(
                f"grimmlink_next.koplugin/{path.relative_to(PLUGIN).as_posix()}",
                date_time=(1980, 1, 1, 0, 0, 0),
            )
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            archive.writestr(info, path.read_bytes())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    package(args.output)
