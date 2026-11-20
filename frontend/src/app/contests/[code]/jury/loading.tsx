import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function JuryLoading() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back Link Skeleton */}
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        <Skeleton className="h-3.5 w-24 rounded" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border p-4 space-y-2">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card className="border-border">
        <CardHeader className="p-4 border-b border-border/60">
          <Skeleton className="h-5 w-40 rounded" />
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
