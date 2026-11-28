"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/I18nContext";
import { toast } from "sonner";

export default function SandboxNewContestPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [minWords, setMinWords] = useState("300");
  const [notifyTalk, setNotifyTalk] = useState(true);
  const [allowSelfReview, setAllowSelfReview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Sandbox preview: Contest configuration validated.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/sandbox"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{t("feather-nav-contests")}</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("feather-nav-create-contest")}</h1>
        <p className="text-sm text-muted-foreground">
          Clean, single-column contest setup with calm spacing and native switch controls.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-border/50 p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Basics
          </h2>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Contest Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bengali Wikipedia Science Edit-a-thon 2026"
              className="h-9 text-sm bg-muted/20 border-border/60"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">URL Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="bn-science-2026"
                className="h-9 text-sm font-mono bg-muted/20 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Minimum Words</label>
              <Input
                type="number"
                value={minWords}
                onChange={(e) => setMinWords(e.target.value)}
                className="h-9 text-sm tabular-nums bg-muted/20 border-border/60"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief overview for participants..."
              className="text-sm bg-muted/20 border-border/60"
            />
          </div>
        </section>

        <section className="rounded-xl border border-border/50 p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Automation & Rules
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-foreground">Talk-page notifications</div>
              <div className="text-[11px] text-muted-foreground">
                Automatically post contest templates via throttled queue (1 edit / 3s).
              </div>
            </div>
            <Switch checked={notifyTalk} onCheckedChange={setNotifyTalk} />
          </div>
          <div className="border-t border-border/40 pt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-foreground">Allow self-review</div>
              <div className="text-[11px] text-muted-foreground">
                Permit jury members to review their own submitted articles.
              </div>
            </div>
            <Switch checked={allowSelfReview} onCheckedChange={setAllowSelfReview} />
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/sandbox"
            className="inline-flex items-center h-9 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center h-9 px-5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t("feather-nav-create-contest")}
          </button>
        </div>
      </form>
    </div>
  );
}
