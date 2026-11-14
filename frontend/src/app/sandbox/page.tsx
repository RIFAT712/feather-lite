"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Globe, Calendar, ArrowRight, Check, Sparkles, Layers,
  ExternalLink, Search, ChevronDown, Clock, ShieldCheck,
  CheckCircle2, Info, ArrowLeft, Sliders, Eye
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { searchWikis, getWikiInfo, getWikiIcon, WikiInfo } from "@/lib/wikis";

export default function SandboxPage() {
  const [activeTab, setActiveTab] = useState<"all" | "design1" | "design2" | "design3">("all");

  // Shared test form state
  const [wikiDbName, setWikiDbName] = useState("bnwiki");
  const [wikiURL, setWikiURL] = useState("https://bn.wikipedia.org");
  const [wikiLang, setWikiLang] = useState("bn");
  const [wikiTZ, setWikiTZ] = useState("Asia/Dhaka");
  const [startDate, setStartDate] = useState("2026-11-13T14:00");
  const [endDate, setEndDate] = useState("2026-12-13T14:00");

  const applyDuration = (days: number) => {
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatted = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setEndDate(formatted);
  };

  const selectedWiki = getWikiInfo(wikiDbName);

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header & Back link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/contests/new" className="hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Contest Form
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Design Sandbox</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            UI Component Sandbox &amp; Design Lab
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Interactive testbed to test and compare 3 distinct design architectures for the Target Wiki &amp; Timeframe section.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-card p-1 rounded-lg border border-border shadow-2xs self-start">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
              activeTab === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Compare All 3
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("design1")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
              activeTab === "design1" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Design 1: Standard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("design2")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
              activeTab === "design2" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Design 2: Material 3 Inset
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("design3")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
              activeTab === "design3" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Design 3: Unified Property Sheet
          </button>
        </div>
      </div>

      {/* Active State Bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-primary" /> Active State:
          </span>
          <span className="font-mono bg-muted/60 px-2 py-0.5 rounded text-[11px]">
            {wikiDbName} ({wikiLang})
          </span>
          <span className="font-mono bg-muted/60 px-2 py-0.5 rounded text-[11px]">
            {wikiTZ}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Any selection or edits in any component below updates live in real-time.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESIGN 1: Clean Standard Labels (Linear / Stripe / Vercel Style)           */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "design1") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/30">
                Option 1
              </Badge>
              <h2 className="text-sm font-bold text-foreground">
                Clean Standard Labels (Linear / Stripe / Vercel Style)
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Zero notched borders · 100% standard typography · Never cuts text
            </span>
          </div>

          <Card className="border-border shadow-xs bg-card">
            <CardHeader className="py-3 px-4 sm:px-6 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                Target Wiki &amp; Timeframe
              </CardTitle>
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 sm:p-1 rounded-md border border-border/60">
                <span className="text-[11px] font-medium text-muted-foreground px-1 hidden sm:inline">Preset:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyDuration(15)}
                  className="h-6 text-[11px] px-2 cursor-pointer hover:bg-background hover:text-foreground font-medium"
                >
                  +15d
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyDuration(30)}
                  className="h-6 text-[11px] px-2 cursor-pointer hover:bg-background hover:text-foreground font-medium"
                >
                  +30d
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyDuration(60)}
                  className="h-6 text-[11px] px-2 cursor-pointer hover:bg-background hover:text-foreground font-medium"
                >
                  +60d
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Row 1: Wiki (2/3) + Timezone (1/3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Target Wikimedia Wiki</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <StandardWikiCombobox
                    wikiDbName={wikiDbName}
                    wikiURL={wikiURL}
                    onChange={(data) => {
                      setWikiDbName(data.dbname);
                      setWikiURL(data.url);
                      setWikiLang(data.lang);
                      if (data.lang === "bn") setWikiTZ("Asia/Dhaka");
                    }}
                  />
                </div>

                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>Timezone</span>
                  </label>
                  <Input
                    value={wikiTZ}
                    onChange={(e) => setWikiTZ(e.target.value)}
                    className="h-10 text-xs font-medium"
                    placeholder="e.g. Asia/Dhaka or UTC"
                  />
                </div>
              </div>

              {/* Row 2: Start Date & Time + End Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>Start Date &amp; Time</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>End Date &amp; Time</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESIGN 2: Material 3 Inset Floating Style (Google style - Inner Float)     */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "design2") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">
                Option 2
              </Badge>
              <h2 className="text-sm font-bold text-foreground">
                Material 3 Inset Floating Style (Google style - Inner Float)
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Labels sit cleanly INSIDE the container · Gives floating feel without cutting borders
            </span>
          </div>

          <Card className="border-border shadow-xs bg-card">
            <CardHeader className="py-3 px-4 sm:px-6 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                Target Wiki &amp; Timeframe
              </CardTitle>
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 sm:p-1 rounded-md border border-border/60">
                <span className="text-[11px] font-medium text-muted-foreground px-1 hidden sm:inline">Preset:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyDuration(15)}
                  className="h-6 text-[11px] px-2 cursor-pointer hover:bg-background hover:text-foreground font-medium"
                >
                  +15d
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyDuration(30)}
                  className="h-6 text-[11px] px-2 cursor-pointer hover:bg-background hover:text-foreground font-medium"
                >
                  +30d
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyDuration(60)}
                  className="h-6 text-[11px] px-2 cursor-pointer hover:bg-background hover:text-foreground font-medium"
                >
                  +60d
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-3">
              {/* Row 1: Inset Wiki Box (2/3) + Inset Timezone Box (1/3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Material3WikiField
                    wikiDbName={wikiDbName}
                    wikiURL={wikiURL}
                    onChange={(data) => {
                      setWikiDbName(data.dbname);
                      setWikiURL(data.url);
                      setWikiLang(data.lang);
                      if (data.lang === "bn") setWikiTZ("Asia/Dhaka");
                    }}
                  />
                </div>

                <div className="md:col-span-1 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all px-3 py-2 flex flex-col justify-between h-[54px]">
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                    Timezone
                  </span>
                  <input
                    type="text"
                    value={wikiTZ}
                    onChange={(e) => setWikiTZ(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-foreground outline-none p-0 cursor-text"
                    placeholder="Asia/Dhaka"
                  />
                </div>
              </div>

              {/* Row 2: Inset Start Date + Inset End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 hover:bg-muted/30 focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all px-3 py-2 flex flex-col justify-between h-[54px]">
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" /> Start Date &amp; Time
                  </span>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-foreground outline-none p-0 cursor-pointer"
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/20 hover:bg-muted/30 focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all px-3 py-2 flex flex-col justify-between h-[54px]">
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" /> End Date &amp; Time
                  </span>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-foreground outline-none p-0 cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESIGN 3: Unified Connected Property Sheet (Apple / Notion Style)         */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "design3") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Option 3
              </Badge>
              <h2 className="text-sm font-bold text-foreground">
                Unified Connected Property Sheet (Apple / Notion Style)
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Ultra compact · Connected segment rows · Zero wasted vertical space
            </span>
          </div>

          <Card className="border-border shadow-xs bg-card overflow-visible">
            <CardHeader className="py-2.5 px-4 sm:px-6 flex flex-row items-center justify-between space-y-0 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                Target Wiki &amp; Timeframe
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-medium">
                Connected Sheet
              </Badge>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
              {/* Segmented Enclosure */}
              <div className="rounded-lg border border-border bg-card shadow-2xs divide-y divide-border overflow-hidden">
                {/* Row 1: Target Wiki | Timezone */}
                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Left: Wiki Picker (8 cols) */}
                  <div className="md:col-span-8 p-2.5 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
                    <UnifiedWikiCombobox
                      wikiDbName={wikiDbName}
                      wikiURL={wikiURL}
                      onChange={(data) => {
                        setWikiDbName(data.dbname);
                        setWikiURL(data.url);
                        setWikiLang(data.lang);
                        if (data.lang === "bn") setWikiTZ("Asia/Dhaka");
                      }}
                    />
                  </div>

                  {/* Right: Timezone (4 cols) */}
                  <div className="md:col-span-4 p-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Timezone
                      </span>
                      <input
                        type="text"
                        value={wikiTZ}
                        onChange={(e) => setWikiTZ(e.target.value)}
                        className="w-full bg-transparent text-xs font-semibold text-foreground outline-none truncate"
                        placeholder="Asia/Dhaka"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Timeline Schedule & Duration Presets */}
                <div className="p-2.5 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Start:</span>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-background border border-border/80 px-2 py-1 rounded text-xs font-semibold text-foreground outline-none cursor-pointer"
                      />
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />

                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">End:</span>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-background border border-border/80 px-2 py-1 rounded text-xs font-semibold text-foreground outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <span className="text-[10px] font-medium text-muted-foreground mr-1">Presets:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyDuration(15)}
                      className="h-6 text-[11px] px-2 cursor-pointer font-medium"
                    >
                      +15d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyDuration(30)}
                      className="h-6 text-[11px] px-2 cursor-pointer font-medium"
                    >
                      +30d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyDuration(60)}
                      className="h-6 text-[11px] px-2 cursor-pointer font-medium"
                    >
                      +60d
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Summary Card */}
      <div className="bg-card p-5 rounded-lg border border-border space-y-4 shadow-2xs">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> Architecture Breakdown:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="p-3 rounded-md bg-muted/20 border border-border/60 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Option 1: Standard
            </div>
            <p>Traditional clean labels above each input. High legibility, zero CSS clipping quirks, familiar Linear / Stripe pattern.</p>
          </div>

          <div className="p-3 rounded-md bg-muted/20 border border-border/60 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" /> Option 2: Material 3 Inset
            </div>
            <p>Label sits inside the container top. Gives Google's &quot;floating label&quot; identity without cutting or notching any border line.</p>
          </div>

          <div className="p-3 rounded-md bg-muted/20 border border-border/60 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Option 3: Unified Sheet
            </div>
            <p>Single connected panel. Combines wiki and timeframe into a compact 2-row block like Apple settings or Notion properties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Subcomponents for Design 1, 2, and 3
// ---------------------------------------------------------------------------

function StandardWikiCombobox({
  wikiDbName,
  wikiURL,
  onChange,
}: {
  wikiDbName: string;
  wikiURL: string;
  onChange: (data: { dbname: string; url: string; lang: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedWiki = getWikiInfo(wikiDbName);
  const results = searchWikis(query);

  return (
    <div className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 rounded-md border border-input bg-background px-3 flex items-center justify-between text-left cursor-pointer hover:border-muted-foreground/50 transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <img
            src={getWikiIcon(selectedWiki?.project)}
            alt={selectedWiki?.project || "wiki"}
            className="h-4 w-4 object-contain shrink-0"
            onError={(e) => {
              e.currentTarget.src = "/icons/projects/wikipedia.svg";
            }}
          />
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {selectedWiki ? selectedWiki.nativeName : wikiDbName || "Select Wiki"}
          </span>
          <Badge variant="secondary" className="text-[10px] font-mono px-1 py-0 h-4 border border-border/80 shrink-0">
            {wikiDbName}
          </Badge>
          <span className="text-[11px] text-muted-foreground font-mono truncate hidden lg:inline">
            {wikiURL.replace(/^https?:\/\//, "")}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <WikiSearchDropdown
          query={query}
          setQuery={setQuery}
          results={results}
          wikiDbName={wikiDbName}
          onSelect={(wiki) => {
            onChange({ dbname: wiki.dbname, url: wiki.url, lang: wiki.lang });
            setIsOpen(false);
            setQuery("");
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

function Material3WikiField({
  wikiDbName,
  wikiURL,
  onChange,
}: {
  wikiDbName: string;
  wikiURL: string;
  onChange: (data: { dbname: string; url: string; lang: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedWiki = getWikiInfo(wikiDbName);
  const results = searchWikis(query);

  return (
    <div className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[54px] rounded-lg border border-border bg-muted/20 hover:bg-muted/30 focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all px-3 py-2 flex flex-col justify-between cursor-pointer outline-none"
      >
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center justify-between">
          <span>Target Wikimedia Wiki *</span>
          <span className="text-[9px] font-mono text-muted-foreground/80 lowercase">{selectedWiki?.domain}</span>
        </span>

        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={getWikiIcon(selectedWiki?.project)}
              alt={selectedWiki?.project || "wiki"}
              className="h-4 w-4 object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.src = "/icons/projects/wikipedia.svg";
              }}
            />
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
              {selectedWiki ? selectedWiki.nativeName : wikiDbName || "Select Wiki"}
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono px-1 py-0 h-4 shrink-0">
              {wikiDbName}
            </Badge>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <WikiSearchDropdown
          query={query}
          setQuery={setQuery}
          results={results}
          wikiDbName={wikiDbName}
          onSelect={(wiki) => {
            onChange({ dbname: wiki.dbname, url: wiki.url, lang: wiki.lang });
            setIsOpen(false);
            setQuery("");
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

function UnifiedWikiCombobox({
  wikiDbName,
  wikiURL,
  onChange,
}: {
  wikiDbName: string;
  wikiURL: string;
  onChange: (data: { dbname: string; url: string; lang: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedWiki = getWikiInfo(wikiDbName);
  const results = searchWikis(query);

  return (
    <div className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 cursor-pointer outline-none select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 shrink-0">
            <img
              src={getWikiIcon(selectedWiki?.project)}
              alt={selectedWiki?.project || "wiki"}
              className="h-4.5 w-4.5 object-contain"
              onError={(e) => {
                e.currentTarget.src = "/icons/projects/wikipedia.svg";
              }}
            />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Target Wiki
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                {selectedWiki ? selectedWiki.nativeName : wikiDbName || "Select Wiki"}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 h-4 border-border shrink-0">
                {wikiDbName}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 font-medium hover:bg-muted">
            Change
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <WikiSearchDropdown
          query={query}
          setQuery={setQuery}
          results={results}
          wikiDbName={wikiDbName}
          onSelect={(wiki) => {
            onChange({ dbname: wiki.dbname, url: wiki.url, lang: wiki.lang });
            setIsOpen(false);
            setQuery("");
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

function WikiSearchDropdown({
  query,
  setQuery,
  results,
  wikiDbName,
  onSelect,
  onClose,
}: {
  query: string;
  setQuery: (q: string) => void;
  results: WikiInfo[];
  wikiDbName: string;
  onSelect: (wiki: WikiInfo) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
      <div className="p-2 border-b border-border bg-muted/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            autoFocus
            placeholder="Search 860+ wikis by name, dbname, or code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-7 text-xs h-8 rounded-md border border-input bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
        {results.slice(0, 20).map((wiki) => {
          const isSelected = wiki.dbname === wikiDbName;
          return (
            <div
              key={wiki.dbname}
              onClick={() => onSelect(wiki)}
              className={cn(
                "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs",
                isSelected ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted/70 text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={getWikiIcon(wiki.project)}
                  alt={wiki.project}
                  className="h-4 w-4 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "/icons/projects/wikipedia.svg";
                  }}
                />
                <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold truncate">{wiki.nativeName}</span>
                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-3.5 border-border shrink-0">
                    {wiki.dbname}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                    · {wiki.domain}
                  </span>
                </div>
              </div>
              {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
