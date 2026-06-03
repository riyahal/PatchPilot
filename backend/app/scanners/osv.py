from __future__ import annotations

import json
from pathlib import Path
from typing import List

from ..models import Finding, Reachability
from ..utils.fs import check_reachability
from ..utils.exec import run_cmd


def run_osv_scanner(repo_dir: Path) -> List[Finding]:
    """
    Runs osv-scanner in repo_dir and returns ONLY real vulnerability findings.

    Important behavior change (fix):
    - If osv-scanner fails to run, or outputs invalid JSON, we DO NOT create a fake
      "OSV-Scanner failed to run" Finding (which was polluting the Findings UI).
    - Instead we fail silently by returning [].

    If you want to surface scanner failures in the UI, the better approach is:
    - Add an "error" field to the /scan response `scanners.osv` object (ok=false, error="...").
    """
    cmd = ["osv-scanner", "scan", "--format", "json", "--recursive", "."]

    r = run_cmd(cmd, cwd=repo_dir, timeout_s=600)
    print("OSV cmd:", cmd)
    print("OSV cwd:", str(repo_dir))
    print("OSV returncode:", r.get("returncode"))
    print("OSV stdout head:", (r.get("stdout") or "")[:200])
    print("OSV stderr head:", (r.get("stderr") or "")[:500])

    stdout = r.get("stdout") or ""
    stderr = r.get("stderr") or ""
    returncode = r.get("returncode")

    if not stdout.strip():
        return []

    try:
        data = json.loads(stdout)
    except Exception:
        return []

    out: List[Finding] = []
    unique_packages = set()

    results = data.get("results", []) or []
    for res in results:
        packages = res.get("packages", []) or []
        for pkg in packages:
            vulns = pkg.get("vulnerabilities", []) or []
            if not vulns:
                continue
            pkg_name = (pkg.get("package", {}) or {}).get("name")
            if pkg_name:
                unique_packages.add(pkg_name)

            for v in vulns:
                vuln_id = v.get("id", "OSV-UNKNOWN")

                out.append(
                    Finding(
                        id=f"osv:{vuln_id}:{pkg_name or 'pkg'}",
                        category="dependency",
                        severity="HIGH",
                        title=f"Dependency vulnerability {vuln_id}",
                        description=(v.get("summary") or v.get("details") or "")[:1000],
                        location=None,
                        metadata={
                            "osv_id": vuln_id,
                            "package": pkg.get("package"),
                            "affected": v.get("affected"),
                            "references": v.get("references"),
                            "engine": "osv-scanner",
                            "cmd": cmd,
                            "returncode": returncode,
                            "stderr": stderr[:2000] if stderr else None,
                        },
                    )
                )

    if unique_packages:
        reachability_results = check_reachability(repo_dir, unique_packages)

        for finding in out:
            pkg_name = (finding.metadata.get("package") or {}).get("name")
            if pkg_name and pkg_name in reachability_results:
                reachable, evidence = reachability_results[pkg_name]
                finding.reachability = Reachability(
                    reachable=reachable, evidence=evidence
                )

    return out
