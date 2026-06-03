from __future__ import annotations

import os
import re
import shutil
import zipfile
from pathlib import Path


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def safe_rmtree(p: Path) -> None:
    shutil.rmtree(p, ignore_errors=True)


def unzip_to_dir(zip_path: Path, out_dir: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(out_dir)

    children = list(out_dir.iterdir())
    if len(children) == 1 and children[0].is_dir():
        top = children[0]
        tmp = out_dir.parent / (out_dir.name + "_tmp")
        tmp.mkdir(parents=True, exist_ok=True)
        for item in top.iterdir():
            shutil.move(str(item), str(tmp / item.name))
        shutil.rmtree(top)
        for item in tmp.iterdir():
            shutil.move(str(item), str(out_dir / item.name))
        shutil.rmtree(tmp)


def check_reachability(repo_dir: Path, package_name: str) -> tuple[bool, str | None]:
    ignore_dirs = {".git", "node_modules", "venv", "env", "__pycache__", "dist", "build", ".next"}
    target_exts = {".js", ".jsx", ".ts", ".tsx", ".py", ".cjs", ".mjs"}

    patterns = [
        rf"require\(['\"]{re.escape(package_name)}['\"]\)",
        rf"from\s+['\"]{re.escape(package_name)}['\"]",
        rf"import\s+['\"]{re.escape(package_name)}['\"]",
        rf"import\s+{re.escape(package_name)}\b",
        rf"from\s+{re.escape(package_name)}\s+import"
    ]
    compiled_patterns = [re.compile(p) for p in patterns]

    for root, dirs, files in os.walk(repo_dir):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]

        for file in files:
            path = Path(root) / file
            if path.suffix not in target_exts:
                continue

            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line_num, line in enumerate(f, 1):
                        for pattern in compiled_patterns:
                            if pattern.search(line):
                                rel_path = path.relative_to(repo_dir)
                                return True, f"Imported in {rel_path}: line {line_num}"
            except (UnicodeDecodeError, PermissionError):
                continue

    return False, None