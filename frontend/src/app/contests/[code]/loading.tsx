import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function ContestLoading() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Link Skeleton */}
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        <Skeleton className="h-3.5 w-24 rounded" />
      </div>

      {/* 1. Header Overview Card Skeleton */}
      <Card className="mb-6 shadow-2xs border-border/80">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 w-full max-w-2xl">
              {/* Status Badge & Wiki Pill */}
              <div className="flex items-center gap-2 mb-1.5">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-28 rounded-md" />
              </div>

              {/* Title */}
              <Skeleton className="h-8 w-3/4 max-w-md rounded-md" />

              {/* Description */}
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3.5 w-full max-w-xl rounded" />
                <Skeleton className="h-3.5 w-2/3 max-w-md rounded" />
              </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </CardHeader>

        {/* Timeline & Metadata Footer */}
        <CardContent className="pt-3 border-t border-border/60">
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
              <Skeleton className="h-3.5 w-48 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
            <Skeleton className="w-full h-1.5 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Key Metrics Grid (4 Stat Cards Skeleton) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border shadow-2xs">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <Skeleton className="h-7 w-16 mt-1 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Multi-Tab Workspace Skeleton */}
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <Card className="border-border p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-8 rounded" />
                  <Skeleton className="h-4 w-36 rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
