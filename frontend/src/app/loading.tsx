import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function GlobalLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-7xl space-y-6">
      {/* 1. Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-48 rounded-md" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 max-w-sm rounded" />
        </div>
        <Skeleton className="h-8 w-32 rounded-md shrink-0" />
      </div>

      {/* 2. Platform Pulse Banner Skeleton */}
      <Card className="border-border/80 shadow-2xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded" />
                <Skeleton className="h-7 w-16 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Toolbar Skeleton */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <Skeleton className="h-8 w-full md:w-80 rounded-md" />
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* 4. Contest Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border-border shadow-2xs flex flex-col justify-between">
            <CardHeader className="p-4 sm:p-5 pb-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-md" />
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-4/5 rounded" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
