import { useState } from "react";
import { GitPullRequest, Download, Copy, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { DiffViewer } from "../components/diff-viewer";
import { SeverityChip } from "../components/severity-chip";
import { Badge } from "../components/ui/badge";
import { FixConfidence } from "../components/fix-confidence";

const sampleDiffs = [
  { type: "context" as const, content: "async function getUser(userId: string) {", oldLine: 44, newLine: 44 },
  { type: "removed" as const, content: "  const query = `SELECT * FROM users WHERE id = '${userId}'`;", oldLine: 45 },
  { type: "added" as const, content: "  const query = 'SELECT * FROM users WHERE id = $1';", newLine: 45 },
  { type: "removed" as const, content: "  return await db.query(query);", oldLine: 46 },
  { type: "added" as const, content: "  return await db.query(query, [userId]);", newLine: 46 },
  { type: "context" as const, content: "}", oldLine: 47, newLine: 47 },
];

const sampleDiffs2 = [
  { type: "context" as const, content: "{", oldLine: 11, newLine: 11 },
  { type: "context" as const, content: '  "dependencies": {', oldLine: 12, newLine: 12 },
  { type: "removed" as const, content: '    "express": "^4.17.1"', oldLine: 13 },
  { type: "added" as const, content: '    "express": "^4.19.2"', newLine: 13 },
  { type: "context" as const, content: "  }", oldLine: 14, newLine: 14 },
  { type: "context" as const, content: "}", oldLine: 15, newLine: 15 },
];

export function Fix() {
  const [selectedFixes, setSelectedFixes] = useState<Set<number>>(new Set([0, 1]));

  const fixes = [
    {
      id: 0,
      title: "Fix SQL Injection in user query",
      severity: "critical" as const,
      file: "src/api/users.ts",
      risk: "Low",
      effort: "5 min",
      filesAffected: 1,
      diff: sampleDiffs,
      fix_confidence: 0.92,
    },
    {
      id: 1,
      title: "Update Express to 4.19.2",
      severity: "high" as const,
      file: "package.json",
      risk: "Medium",
      effort: "15 min",
      filesAffected: 2,
      diff: sampleDiffs2,
      fix_confidence: 0.56,
    },
    {
      id: 2,
      title: "Rotate leaked secret",
      severity: "high" as const,
      file: "config/.env",
      risk: "High",
      effort: "10 min",
      filesAffected: 1,
      diff: sampleDiffs,
      fix_confidence: 0.3,
    },
    {
      id: 3,
      title: "Manual review required",
      severity: "medium" as const,
      file: "src/utils/helpers.ts",
      risk: "Low",
      effort: "30 min",
      filesAffected: 1,
      diff: sampleDiffs2,
      fix_confidence: null,
    },
  ];

  const toggleFix = (id: number) => {
    const newSelected = new Set(selectedFixes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFixes(newSelected);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl pb-20 md:pb-8">
      <div className="mb-6">
        <h1 className="mb-2">Proposed Fixes</h1>
        <p className="text-muted-foreground">
          Review and apply automated fixes for detected vulnerabilities
        </p>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fix Summary</CardTitle>
          <CardDescription>2 findings with available automated fixes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-semibold mb-1">2</div>
              <div className="text-sm text-muted-foreground">Proposed Fixes</div>
            </div>
            <div>
              <div className="text-2xl font-semibold mb-1">3</div>
              <div className="text-sm text-muted-foreground">Files Affected</div>
            </div>
            <div>
              <div className="text-2xl font-semibold mb-1">~20m</div>
              <div className="text-sm text-muted-foreground">Est. Time</div>
            </div>
            <div>
              <div className="text-2xl font-semibold mb-1">Low-Med</div>
              <div className="text-sm text-muted-foreground">Risk Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fix Cards */}
      <div className="space-y-6 mb-6">
        {fixes.map((fix) => (
          <Card key={fix.id} className={selectedFixes.has(fix.id) ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityChip severity={fix.severity} />
                    <Badge variant="outline" className="text-xs">
                      {fix.filesAffected} file{fix.filesAffected !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mb-1">{fix.title}</CardTitle>
                  <CardDescription className="font-mono text-xs">{fix.file}</CardDescription>
                </div>
                <input
                  type="checkbox"
                  checked={selectedFixes.has(fix.id)}
                  onChange={() => toggleFix(fix.id)}
                  className="h-5 w-5 rounded border-border"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-muted">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {fix.risk}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Est. Effort</div>
                  <div className="text-sm font-medium">{fix.effort}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Auto-fix</div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-status-success" />
                    Available
                  </div>
                </div>
              </div>

              <DiffViewer diff={fix.diff} filename={fix.file} className="mb-4" />

              <div className="flex flex-wrap items-center gap-2">
                <Link to="/verify">
                  <Button>Apply Patch</Button>
                </Link>
                <Button variant="outline" disabled>
                  <GitPullRequest className="h-4 w-4 mr-2" />
                  Open PR
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Not configured
                  </Badge>
                </Button>
                <Button variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Patch
                </Button>
            <div className="ml-4">
              <FixConfidence confidence={fix.fix_confidence} />
            </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-medium mb-1">Ready to apply {selectedFixes.size} fix{selectedFixes.size !== 1 ? "es" : ""}</div>
              <div className="text-sm text-muted-foreground">
                Changes will be validated before being applied
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
              <Link to="/verify">
                <Button disabled={selectedFixes.size === 0}>
                  Apply Selected Fixes
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
