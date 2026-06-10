from __future__ import annotations

import json
from pathlib import Path
from typing import List

from ..models import Finding, Location
from ..utils.exec import run_cmd
from ..utils.categories import normalize_category
from ..utils.ml_features import extract_features

SEMGRP_CONFIG = "p/ci"


def run_semgrep(repo_dir: Path) -> List[Finding]:
    cmd = ["semgrep", "--config", SEMGRP_CONFIG, "--json", "--quiet"]
    r = run_cmd(cmd, cwd=repo_dir, timeout_s=600)

    if r["returncode"] not in (0, 1):
        return [
            Finding(
                id="semgrep:error",
                category=normalize_category("sast"),
                severity="INFO",
                title="Semgrep failed to run",
                description=r["stderr"][:5000],
            )
        ]

    try:
        data = json.loads(r["stdout"] or "{}")
    except Exception:
        return []

    out: List[Finding] = []
    for res in data.get("results", []) or []:
        check_id = res.get("check_id", "semgrep:unknown")
        path = res.get("path")
        start = (res.get("start") or {}).get("line")
        end = (res.get("end") or {}).get("line")

        extra = res.get("extra") or {}
        msg = extra.get("message", "")
        raw_severity = (extra.get("severity") or "INFO").upper()

        severity = (
            raw_severity
            if raw_severity in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")
            else "INFO"
        )
        finding_id = f"semgrep:{check_id}:{path}:{start}"

        cwe_data = (extra.get("metadata") or {}).get("cwe", "unknown")
        cwe_category = (
            str(cwe_data[0])
            if isinstance(cwe_data, list) and cwe_data
            else str(cwe_data)
        )

        raw_data_for_extractor = {
            "id": check_id,
            "severity": severity,
            "location": {"path": path},
            "metadata": {"cwe_category": cwe_category},
        }

        ml_features = extract_features(raw_data_for_extractor, scanner_name="semgrep")

        out.append(
            Finding(
                id=finding_id,
                category=normalize_category("sast"),
                severity=severity,
                title=check_id,
                description=msg,
                location=Location(path=path, start_line=start, end_line=end),
                metadata={"check_id": check_id, "engine": "semgrep"},
                features=ml_features,
            )
        )
    return out
