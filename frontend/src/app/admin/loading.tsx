import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* 5 Stats Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="border-border p-4 space-y-2">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-7 w-12 rounded" />
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* Table Skeleton */}
      <Card className="border-border p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/5 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-20 rounded" />
              <Skeleton className="h-7 w-20 rounded" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
