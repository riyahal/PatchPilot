import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffViewerProps {
  diff: DiffLine[];
  filename: string;
  className?: string;
}

export function DiffViewer({ diff, filename, className }: DiffViewerProps) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"split" | "unified">("unified");

  const handleCopy = async () => {
    const diffText = diff
      .map((line) => {
        const prefix = line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  ";
        return prefix + line.content;
      })
      .join("\n");
    await navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderUnifiedView = () => (
    <div className="overflow-x-auto">
      <pre className="text-sm">
        <code className="font-mono">
          {diff.map((line, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                line.type === "added" && "bg-status-success-bg dark:bg-status-success-bg",
                line.type === "removed" && "bg-status-error-bg dark:bg-status-error-bg"
              )}
            >
              <span className="inline-block w-12 text-right px-2 text-muted-foreground select-none border-r border-border">
                {line.oldLine || " "}
              </span>
              <span className="inline-block w-12 text-right px-2 text-muted-foreground select-none border-r border-border">
                {line.newLine || " "}
              </span>
              <span
                className={cn(
                  "inline-block w-6 text-center select-none",
                  line.type === "added" && "text-status-success dark:text-status-success",
                  line.type === "removed" && "text-status-error dark:text-status-error"
                )}
              >
                {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
              </span>
              <span className="flex-1 px-2">{line.content}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );

  const renderSplitView = () => {
    const leftLines: (DiffLine | { type: "empty"; content: string; oldLine?: null })[] = [];
    const rightLines: (DiffLine | { type: "empty"; content: string; newLine?: null })[] = [];
    
    let tempRemoved: DiffLine[] = [];
    let tempAdded: DiffLine[] = [];

    // Flushes grouped added/removed lines to the left and right columns
    const flush = () => {
      const maxLines = Math.max(tempRemoved.length, tempAdded.length);
      for (let i = 0; i < maxLines; i++) {
        leftLines.push(tempRemoved[i] || { type: "empty", content: " " });
        rightLines.push(tempAdded[i] || { type: "empty", content: " " });
      }
      tempRemoved = [];
      tempAdded = [];
    };

    diff.forEach((line) => {
      if (line.type === "context") {
        flush();
        leftLines.push(line);
        rightLines.push(line);
      } else if (line.type === "removed") {
        tempRemoved.push(line);
      } else if (line.type === "added") {
        tempAdded.push(line);
      }
    });
    flush();

    return (
      <div className="grid grid-cols-2 divide-x divide-border overflow-x-auto">
        <div>
          <div className="bg-muted px-4 py-2 text-xs font-medium border-b border-border">
            Before
          </div>
          <pre className="text-sm">
            <code className="font-mono">
              {leftLines.map((line, index) => (
                <div
                  key={`left-${index}`}
                  className={cn(
                    "flex min-h-[1.25rem]",
                    line.type === "removed" && "bg-status-error-bg dark:bg-status-error-bg"
                  )}
                >
                  <span className="inline-block w-12 text-right px-2 text-muted-foreground select-none border-r border-border">
                    {line.oldLine || " "}
                  </span>
                  <span className="flex-1 px-2">{line.content || " "}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
        <div>
          <div className="bg-muted px-4 py-2 text-xs font-medium border-b border-border">
            After
          </div>
          <pre className="text-sm">
            <code className="font-mono">
              {rightLines.map((line, index) => (
                <div
                  key={`right-${index}`}
                  className={cn(
                    "flex min-h-[1.25rem]",
                    line.type === "added" && "bg-status-success-bg dark:bg-status-success-bg"
                  )}
                >
                  <span className="inline-block w-12 text-right px-2 text-muted-foreground select-none border-r border-border">
                    {line.newLine || " "}
                  </span>
                  <span className="flex-1 px-2">{line.content || " "}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
        <span className="text-sm font-mono">{filename}</span>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "split" | "unified")}>
            <TabsList className="h-8">
              <TabsTrigger value="unified" className="text-xs px-2 py-1">
                Unified
              </TabsTrigger>
              <TabsTrigger value="split" className="text-xs px-2 py-1">
                Split
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
      {view === "unified" ? renderUnifiedView() : renderSplitView()}
    </div>
  );
}
