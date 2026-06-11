import hashlib
import json
from datetime import datetime, timezone

from fpdf import FPDF

from app.models import ScanResponse


class AuditReport(FPDF):
    def __init__(self, job_id: str, project_name: str):
        """Initialize the AuditReport with job and project identifiers."""
        super().__init__()
        self.job_id = job_id
        self.project_name = project_name
        self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(15, 23, 42)
        self.cell(
            0, 10, "PatchPilot Strategic Audit Report", border=False, ln=True, align="C"
        )

        self.set_font("Helvetica", "", 10)
        self.set_text_color(100, 116, 139)
        self.cell(
            0,
            5,
            f"Project: {self.project_name} | Job ID: {self.job_id}",
            border=False,
            ln=True,
            align="C",
        )
        self.cell(
            0,
            5,
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
            border=False,
            ln=True,
            align="C",
        )
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def generate_audit_pdf(scan: ScanResponse) -> bytes:
    pdf = AuditReport(job_id=scan.job_id, project_name=scan.project_name)
    pdf.add_page()

    severities = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for f in scan.findings:
        sev = f.severity.upper()
        if sev in severities:
            severities[sev] += 1

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 10, "Executive Summary", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(51, 65, 85)
    summary_text = (
        f"This document serves as the official vulnerability audit for the target repository ({scan.repo_path}). "
        f"A total of {len(scan.findings)} security findings were identified across the architecture."
    )
    pdf.multi_cell(0, 6, summary_text)
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(40, 8, "Severity", border=1)
    pdf.cell(40, 8, "Count", border=1, ln=True)

    pdf.set_font("Helvetica", "", 9)
    for sev, count in severities.items():
        if count > 0:
            pdf.cell(40, 8, sev, border=1)
            pdf.cell(40, 8, str(count), border=1, ln=True)

    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Finding Ledger", ln=True)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(20, 8, "Severity", border=1, fill=True)
    pdf.cell(100, 8, "Vulnerability Title", border=1, fill=True)
    pdf.cell(70, 8, "Location", border=1, fill=True, ln=True)

    pdf.set_font("Helvetica", "", 8)
    sorted_findings = sorted(
        scan.findings,
        key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}.get(
            x.severity.upper(), 5
        ),
    )

    for f in sorted_findings:
        loc = f.location.path if f.location else "Unknown"
        title = f.title[:65] + "..." if len(f.title) > 65 else f.title
        loc = loc[:45] + "..." if len(loc) > 45 else loc

        pdf.cell(20, 8, f.severity.upper(), border=1)
        pdf.cell(100, 8, title, border=1)
        pdf.cell(70, 8, loc, border=1, ln=True)

    pdf.ln(15)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 10, "Cryptographic Data Integrity Signature", ln=True)

    pdf.set_font("Courier", "", 8)
    pdf.set_text_color(100, 116, 139)

    raw_data = json.dumps(scan.model_dump(), sort_keys=True)
    signature = hashlib.sha256(raw_data.encode("utf-8")).hexdigest()

    pdf.multi_cell(0, 5, f"SHA-256 Stamp:\n{signature}")

    return bytes(pdf.output())
