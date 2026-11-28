"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import { toast } from "sonner";

export default function SandboxSubmitPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [submitted, setSubmitted] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitted((prev) => [trimmed, ...prev]);
    setTitle("");
    toast.success(`Preview submitted: ${trimmed}`);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <Link
        href={`/sandbox/contests/${code}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{code}</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("feather-contest-submit")}</h1>
        <p className="text-sm text-muted-foreground">
          Enter the exact Wikipedia article title to validate and submit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            {t("feather-contest-col-article")}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. James Webb Space Telescope"
            className="h-10 text-sm bg-muted/20 border-border/60"
          />
        </div>

        <button
          type="submit"
          disabled={!title.trim()}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{t("feather-contest-submit")}</span>
        </button>
      </form>

      {submitted.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Recent</div>
          <div className="divide-y divide-border/40 rounded-xl border border-border/50">
            {submitted.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="font-medium text-foreground">{item}</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Validated</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
