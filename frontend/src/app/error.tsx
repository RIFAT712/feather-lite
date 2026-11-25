"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Feather ErrorBoundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-6 rounded-xl border border-border bg-card shadow-lg text-center space-y-5">
        <div className="mx-auto size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center ring-1 ring-destructive/20">
          <AlertTriangle className="size-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Something went wrong
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An unexpected error occurred while loading this page. You can try reloading or return to the contest portal.
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-muted-foreground/70 bg-muted/50 px-2 py-1 rounded inline-block">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => reset()}
            className="gap-2 cursor-pointer font-semibold shadow-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Try again</span>
          </Button>

          <Link
            href="/"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "gap-2 cursor-pointer",
            })}
          >
            <Home className="size-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
