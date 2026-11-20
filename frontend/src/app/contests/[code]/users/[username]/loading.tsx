import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function ContestUserLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 max-w-5xl space-y-6">
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        <Skeleton className="h-3.5 w-24 rounded" />
      </div>

      {/* Profile Header Card Skeleton */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-44 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </CardHeader>
      </Card>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border p-4 space-y-2">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-7 w-14 rounded" />
          </Card>
        ))}
      </div>
    </div>
  );
}
