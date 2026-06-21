import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { downloadAuditReport } from "../lib/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { SeverityChip } from "../components/severity-chip";
import { ToolBadge } from "../components/tool-badge";
import { CodeBlock } from "../components/code-block";
import { FilterChips } from "../components/filter-chips";
import type { Finding } from "../data/sample-data";
import { loadLastScan } from "../lib/scan-store";
import { getJobFindings } from "../lib/api";
import { mapBackendFindingToUi } from "../lib/mappers";
import { cn } from "../components/ui/utils";

function ExportReportButton({ scanId }: { scanId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleDownload = async () => {
    setIsGenerating(true);
    setStatus("idle");

    try {
      const { blob, filename } = await downloadAuditReport(scanId);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus("success");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <Button
        variant="outline"
        onClick={handleDownload}
        disabled={isGenerating}
        className="flex items-center gap-2"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isGenerating ? "Generating..." : "Export Audit PDF"}
      </Button>

      {status === "success" && (
        <div className="absolute top-full right-0 mt-2 z-50 flex items-center gap-2 p-3 bg-slate-900 border border-emerald-800 text-slate-200 shadow-xl rounded min-w-[220px] animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Report Downloaded</span>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute top-full right-0 mt-2 z-50 flex items-center gap-2 p-3 bg-slate-900 border border-rose-800 text-slate-200 shadow-xl rounded min-w-[220px] animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Export Failed</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Findings() {
  const navigate = useNavigate();

  const [scan, setScan] = useState<any>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoadingFindings, setIsLoadingFindings] = useState(true);

  useEffect(() => {
    const storedScan = loadLastScan();
    if (!storedScan?.job_id) {
      setIsLoadingFindings(false);
      return;
    }
    setScan(storedScan);
    getJobFindings(storedScan.job_id)
      .then((response: any) => {
        const actualFindings = Array.isArray(response) 
          ? response 
          : (response.findings || response.data || []);
          
        setFindings(actualFindings.map(mapBackendFindingToUi));
      })
      .catch((err) => console.error("Failed to fetch findings", err))
      .finally(() => setIsLoadingFindings(false));
  }, []);

  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());
  const [detailFinding, setDetailFinding] = useState<Finding | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() =>
    (searchParams.get("q") ?? "").toString(),
  );

  const baseFilters = [
    { id: "critical", label: "Critical", active: false },
    { id: "high", label: "High", active: false },
    { id: "medium", label: "Medium", active: false },
    { id: "low", label: "Low", active: false },
  ];

  const [filters, setFilters] = useState(() => {
    const param = searchParams.get("severity");
    const active = new Set(param ? param.split(",") : []);
    return baseFilters.map((f) => ({ ...f, active: active.has(f.id) }));
  });

  const toggleFinding = (id: string) => {
    const next = new Set(selectedFindings);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFindings(next);
  };

  const toggleFilter = (id: string) => {
    setFilters((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f));
      const activeIds = next.filter((f) => f.active).map((f) => f.id);
      const params = new URLSearchParams();
      if (activeIds.length) params.set("severity", activeIds.join(","));
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      setSearchParams(params, { replace: true });
      return next;
    });
  };

  const updateQueryParam = (q: string) => {
    setSearchQuery(q);
    const activeIds = filters.filter((f) => f.active).map((f) => f.id);
    const params = new URLSearchParams();
    if (activeIds.length) params.set("severity", activeIds.join(","));
    if (q.trim()) params.set("q", q.trim());
    setSearchParams(params, { replace: true });
  };

  const selectAll = () => {
    if (selectedFindings.size === findings.length) {
      setSelectedFindings(new Set());
    } else {
      setSelectedFindings(new Set(findings.map((f) => f.id)));
    }
  };

  const activeSeverities = useMemo(
    () => new Set(filters.filter((f) => f.active).map((f) => f.id)),
    [filters],
  );

  const filteredFindings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return findings.filter((f) => {
      const matchesQuery =
        q.length === 0 ||
        f.title.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.file ?? "").toLowerCase().includes(q);

      const matchesSeverity =
        activeSeverities.size === 0 || activeSeverities.has(f.severity);

      return matchesQuery && matchesSeverity;
    });
  }, [findings, searchQuery, activeSeverities]);

  if (isLoadingFindings) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl pb-20 md:pb-8">
        <div className="mb-6">
          <h1 className="mb-2">Findings</h1>
          <p className="text-muted-foreground">
            No scan results yet. Go to the Dashboard and upload a ZIP to start a
            scan.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl pb-20 md:pb-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="mb-2">Findings</h1>
          <p className="text-muted-foreground">
            {findings.length} vulnerabilities detected in {scan.project_name}
          </p>
        </div>
        <ExportReportButton scanId={scan.job_id} />
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => updateQueryParam(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
          <div className="mt-4">
            <FilterChips filters={filters} onToggle={toggleFilter} />
          </div>
        </CardContent>
      </Card>

      {selectedFindings.size > 0 && (
        <Card className="mb-4 bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedFindings.size} finding
                {selectedFindings.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Link to="/fix">
                  <Button size="sm">Propose Fixes</Button>
                </Link>
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Evidence
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    findings.length > 0 &&
                    selectedFindings.size === findings.length
                  }
                  onCheckedChange={selectAll}
                />
              </TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Tool</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFindings.map((finding) => (
              <TableRow
                key={finding.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setDetailFinding(finding)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedFindings.has(finding.id)}
                    onCheckedChange={() => toggleFinding(finding.id)}
                  />
                </TableCell>
                <TableCell>
                  <SeverityChip severity={finding.severity} />
                </TableCell>
                <TableCell>
                  <div className="font-medium max-w-md truncate">
                    {finding.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {finding.category}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs">{finding.file}</div>
                  <div className="text-xs text-muted-foreground">
                    Line {finding.lineNumber}
                  </div>
                </TableCell>
                <TableCell>
                  <ToolBadge tool={finding.tool} />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium">
                    {finding.confidence}%
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      finding.status === "open" && "text-foreground",
                      finding.status === "accepted" && "text-status-success",
                      finding.status === "ignored" && "text-muted-foreground",
                    )}
                  >
                    {finding.status === "accepted" && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {finding.status === "ignored" && (
                      <XCircle className="h-3 w-3" />
                    )}
                    {finding.status.charAt(0).toUpperCase() +
                      finding.status.slice(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="md:hidden space-y-3">
        {filteredFindings.map((finding) => (
          <Card
            key={finding.id}
            className="hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setDetailFinding(finding)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedFindings.has(finding.id)}
                  onCheckedChange={() => toggleFinding(finding.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityChip severity={finding.severity} />
                    <ToolBadge tool={finding.tool} />
                  </div>
                  <div className="font-medium mb-1 line-clamp-2">
                    {finding.title}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {finding.file}:{finding.lineNumber}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    <Sheet open={!!detailFinding} onOpenChange={() => setDetailFinding(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto flex flex-col p-6 sm:p-8">
          {detailFinding && (
            <>
              <SheetHeader className="pb-4 border-b border-border/50">
                <SheetTitle className="text-xl font-semibold tracking-tight">{detailFinding.title}</SheetTitle>
                {/* 🚨 CRITICAL ACCESSIBILITY FIX: Added SheetDescription to prevent Radix layout crash */}
                <div id="dialog-description" className="text-sm text-muted-foreground mt-1">
                  Finding ID: <span className="font-mono">{detailFinding.id}</span>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto mt-6 space-y-8" aria-describedby="dialog-description">
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityChip severity={detailFinding.severity} />
                  <ToolBadge tool={detailFinding.tool} />
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/30 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                    {detailFinding.confidence}% Confidence
                  </span>
                </div>

                <Tabs defaultValue="details" className="w-full flex flex-col gap-6">
                  <TabsList className="w-full grid grid-cols-3 bg-muted/20 p-1 rounded-lg">
                    <TabsTrigger value="details" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Details</TabsTrigger>
                    <TabsTrigger value="fix" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Suggested Fix</TabsTrigger>
                    <TabsTrigger value="references" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">References</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="flex flex-col gap-8 animate-in fade-in duration-300 mt-0 outline-none">
                    <div className="flex flex-col gap-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Description</h4>
                      <div className="bg-muted/5 rounded-lg p-5 border border-border/40 shadow-sm">
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {detailFinding.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Location</h4>
                      <div className="bg-muted/5 rounded-lg p-5 border border-border/40 flex flex-col gap-2 shadow-sm">
                        <div className="font-mono text-sm text-primary break-all">
                          {detailFinding.file}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          Line {detailFinding.lineNumber}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Code Evidence</h4>
                      <div className="rounded-lg overflow-hidden border border-border/40 shadow-sm bg-muted/5">
                        <CodeBlock
                          code={detailFinding.code}
                          language="typescript"
                          startLine={detailFinding.lineNumber}
                          highlightLines={[detailFinding.lineNumber + 1]}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="fix" className="flex flex-col gap-6 animate-in fade-in duration-300 mt-0 outline-none">
                    {detailFinding.suggestedFix ? (
                      <>
                        <div className="flex flex-col gap-3">
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Recommended Patch</h4>
                          <div className="rounded-lg overflow-hidden border border-border/40 shadow-sm bg-muted/5">
                            <CodeBlock
                              code={detailFinding.suggestedFix}
                              language="typescript"
                              startLine={detailFinding.lineNumber}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <Link to="/fix" className="flex-1">
                            <Button className="w-full shadow-sm">Apply Fix</Button>
                          </Link>
                          <Button variant="outline" disabled className="flex-1 bg-muted/5">
                            Copy Patch
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed border-border/60 bg-muted/5">
                        <p className="text-sm text-muted-foreground font-medium">No automated fix available for this finding.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="references" className="flex flex-col gap-4 animate-in fade-in duration-300 mt-0 outline-none">
                    {detailFinding.references && detailFinding.references.length > 0 ? (
                      <ul className="flex flex-col gap-3">
                        {detailFinding.references.map((ref, index) => (
                          <li key={index} className="group flex items-start gap-3 p-4 rounded-lg border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors shadow-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 group-hover:bg-primary transition-colors" />
                            <a
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:text-primary/80 font-medium break-all flex-1 leading-relaxed"
                            >
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed border-border/60 bg-muted/5">
                        <p className="text-sm text-muted-foreground font-medium">No external references provided.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Status Buttons - Pushed cleanly to the bottom */}
              <div className="flex gap-3 pt-6 mt-6 border-t border-border/50 shrink-0">
                <Button variant="outline" className="flex-1 bg-muted/5 border-border/60 text-muted-foreground" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-2 opacity-50" />
                  Accept Risk
                </Button>
                <Button variant="outline" className="flex-1 bg-muted/5 border-border/60 text-muted-foreground" disabled>
                  <XCircle className="h-4 w-4 mr-2 opacity-50" />
                  Ignore Finding
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
