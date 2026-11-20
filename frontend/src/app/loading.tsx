import React from "react";
import { Feather, Loader2, Sparkles } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="relative flex flex-col items-center justify-center p-8 sm:p-10 max-w-sm w-full rounded-2xl bg-card/80 border border-border/80 shadow-xl backdrop-blur-md text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Glowing Brand Icon Aura */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md animate-pulse" />
          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary/10 via-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
            <Feather className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center justify-center gap-1.5">
            <span>Loading Feather</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
            Fetching contest data and preparing workspace...
          </p>
        </div>

        {/* Indeterminate Slide Bar */}
        <div className="w-full max-w-[200px]">
          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden relative">
            <div className="h-full bg-primary rounded-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
