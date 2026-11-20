import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Feather, Loader2, Sparkles } from "lucide-react";

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

        {/* Right Preview Pane Skeleton / Center Loading State */}
        <div className="flex-1 border border-border/80 rounded-lg bg-card/40 flex flex-col items-center justify-center relative p-8">
          <div className="relative flex flex-col items-center justify-center p-8 max-w-sm w-full rounded-2xl bg-card/90 border border-border shadow-2xl backdrop-blur-xl text-center space-y-5">
            {/* Glowing Brand Icon */}
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md animate-pulse" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary/10 via-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                <Feather className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center justify-center gap-1.5">
                <span>Opening Review Console</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                Connecting to Wikipedia Action API and preparing queue workspace...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-[200px]">
              <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden relative">
                <div className="h-full bg-primary rounded-full w-2/5 animate-[pulse_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
