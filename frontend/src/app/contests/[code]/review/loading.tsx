import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

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

        {/* Right Review Area Skeleton (Preview + Decision) */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Preview Panel Skeleton */}
          <div className="flex-1 border border-border/80 rounded-lg bg-card flex flex-col overflow-hidden">
            {/* Top Flow Progress Bar */}
            <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <Skeleton className="h-2 w-48 rounded-full" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>

            {/* Article Header */}
            <div className="p-4 border-b border-border flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-1/2 max-w-sm rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>

            {/* Article Content Wireframe */}
            <div className="flex-1 p-6 space-y-4 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-11/12 rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                  <div className="pt-3 space-y-2">
                    <Skeleton className="h-5 w-40 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                  <div className="pt-3 space-y-2">
                    <Skeleton className="h-5 w-48 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-11/12 rounded" />
                  </div>
                </div>
                <div className="hidden lg:block space-y-3 p-4 rounded-xl border border-border bg-muted/20 h-fit">
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Decision Bar Skeleton */}
          <div className="h-[56px] border border-border/80 rounded-lg bg-card px-4 flex items-center justify-between gap-3">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-18 rounded-lg" />
              <Skeleton className="h-9 w-18 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
