from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class Location(BaseModel):
    path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None


class Reachability(BaseModel):
    reachable: bool
    evidence: Optional[str] = None


class Finding(BaseModel):
    id: str
    category: str
    severity: str
    title: str
    description: str = ""
    location: Optional[Location] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    reachability: Optional[Reachability] = None


class ScanResponse(BaseModel):
    job_id: str
    project_name: str
    repo_path: str
    findings: List[Finding]
    scanners: Dict[str, Any]


class Fix(BaseModel):
    finding_id: str
    status: str
    summary: str
    files_changed: List[str] = Field(default_factory=list)
    diff: Optional[str] = None
    notes: List[str] = Field(default_factory=list)


class FixRequest(BaseModel):
    job_id: str
    finding_ids: List[str]


class FixResponse(BaseModel):
    job_id: str
    fixes: List[Fix]


class VerifyResponse(BaseModel):
    ok: bool
    checks: Dict[str, Any]
