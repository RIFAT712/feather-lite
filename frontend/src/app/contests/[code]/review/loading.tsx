import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function ReviewLoading() {
  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
      {/* 2-Column Review Queue Skeleton Shell */}
      <div className="flex-1 flex flex-row gap-0 p-2 min-h-0">
        {/* Left Drawer Skeleton */}
        <div className="w-[340px] shrink-0 border border-border/80 rounded-lg bg-card/60 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <Skeleton className="h-5 w-5 rounded-md" />
          </div>

          {/* Search bar */}
          <div className="p-2 border-b border-border/60">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/60 p-1 gap-1">
            <Skeleton className="h-7 flex-1 rounded" />
            <Skeleton className="h-7 flex-1 rounded" />
          </div>

          {/* List items */}
          <div className="flex-1 p-2 space-y-2 overflow-hidden">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded border border-border/40 bg-muted/20">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-2.5 w-1/3 rounded" />
                </div>
                <Skeleton className="h-4 w-4 rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Center Splitter Placeholder */}
        <div className="w-1.5 bg-transparent" />

        {/* Right Preview Pane Skeleton */}
        <div className="flex-1 border border-border/80 rounded-lg bg-card/40 flex flex-col items-center justify-center p-8">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-mono">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span>Loading review queue...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
