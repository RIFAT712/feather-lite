"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nContext";
import { fetchTalkQueue, retryTalkQueue, enqueueMissingTalkQueue, TalkQueueResponse, TalkQueueJob } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RotateCw, Clock, CheckCircle2, AlertCircle, Loader2, 
  Layers, ExternalLink, ShieldCheck, AlertTriangle, Plus
} from "lucide-react";
import { toast } from "sonner";

interface TalkQueueMonitorProps {
  contestCode: string;
  wikiUrl?: string;
  isOrganizer: boolean;
}

export default function TalkQueueMonitor({
  contestCode,
  wikiUrl = "https://bn.wikipedia.org",
  isOrganizer,
}: TalkQueueMonitorProps) {
  const { t, formatDate, n } = useI18n();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isEnqueueing, setIsEnqueueing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<TalkQueueResponse>({
    queryKey: ["talk-queue", contestCode],
    queryFn: () => fetchTalkQueue(contestCode),
    refetchInterval: (query) => {
      const q = query.state.data;
      if (q && (q.counts.queued > 0 || q.counts.processing > 0)) {
        return 3000; // Fast polling (3s) while queue is actively processing
      }
      return 10000; // Idle polling
    },
  });

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await retryTalkQueue(contestCode);
      toast.success(res.message || "Retried failed talk page jobs");
      queryClient.invalidateQueries({ queryKey: ["talk-queue", contestCode] });
    } catch (err: any) {
      toast.error(err.message || "Failed to retry jobs");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleEnqueueMissing = async () => {
    setIsEnqueueing(true);
    try {
      const res = await enqueueMissingTalkQueue(contestCode);
      toast.success(res.message || "Enqueued missing articles");
      queryClient.invalidateQueries({ queryKey: ["talk-queue", contestCode] });
    } catch (err: any) {
      toast.error(err.message || "Failed to enqueue missing articles");
    } finally {
      setIsEnqueueing(false);
    }
  };

  const counts = data?.counts || { queued: 0, processing: 0, done: 0, failed: 0, total: 0 };
  const jobs = data?.jobs || [];

  return (
    <Card className="border-border/80 bg-card/60 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>{t("feather-talk-queue-title")}</span>
              {counts.processing > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30 animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  <span>1 edit / 3s</span>
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("feather-talk-queue-desc")}
            </CardDescription>
          </div>

          {isOrganizer && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnqueueMissing}
                disabled={isEnqueueing}
                className="text-xs h-8 gap-1.5 cursor-pointer"
                title={t("feather-talk-queue-enqueue-all-hint")}
              >
                <Plus className={`h-3.5 w-3.5 ${isEnqueueing ? "animate-spin" : ""}`} />
                <span>
                  {isEnqueueing
                    ? t("feather-talk-queue-enqueueing-btn")
                    : t("feather-talk-queue-enqueue-all-btn")}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying || (counts.failed === 0 && counts.processing === 0)}
                className="text-xs h-8 gap-1.5 cursor-pointer"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                <span>
                  {isRetrying
                    ? t("feather-talk-queue-retrying-btn")
                    : t("feather-talk-queue-retry-btn")}
                </span>
                {counts.failed > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                    {n(counts.failed)}
                  </Badge>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Counter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("feather-talk-queue-stat-queued")}
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              {n(counts.queued)}
            </Badge>
          </div>

          <div className="p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              {counts.processing > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />}
              {t("feather-talk-queue-stat-processing")}
            </span>
            <Badge variant="outline" className="font-mono text-xs text-blue-600 dark:text-blue-400 border-blue-500/30">
              {n(counts.processing)}
            </Badge>
          </div>

          <div className="p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("feather-talk-queue-stat-done")}
            </span>
            <Badge variant="outline" className="font-mono text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              {n(counts.done)}
            </Badge>
          </div>

          <div className="p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("feather-talk-queue-stat-failed")}
            </span>
            <Badge variant={counts.failed > 0 ? "destructive" : "secondary"} className="font-mono text-xs">
              {n(counts.failed)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 space-y-3">
        {isLoading && (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-2 rounded-md border border-border/60 bg-background/50 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-3.5 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-44 rounded" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-3 w-14 rounded" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && jobs.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground italic border border-dashed border-border/70 rounded-lg">
            {t("feather-talk-queue-no-jobs")}
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {jobs.map((job) => {
              const talkTitle = job.title.startsWith("Talk:") ? job.title : `Talk:${job.title}`;
              const talkUrl = `${wikiUrl.replace(/\/$/, "")}/wiki/${encodeURIComponent(talkTitle)}`;

              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md border border-border/60 bg-background/50 hover:bg-background transition-colors text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Status Icon */}
                    {job.status === "done" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                    {job.status === "processing" && (
                      <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
                    )}
                    {job.status === "queued" && (
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                    {job.status === "failed" && (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}

                    {/* Talk Page Link */}
                    <a
                      href={talkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-medium text-foreground hover:text-primary truncate flex items-center gap-1 group"
                    >
                      <span className="truncate">{talkTitle}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>

                    {job.error && (
                      <span className="text-[10px] text-destructive truncate max-w-[200px]" title={job.error}>
                        ({job.error})
                      </span>
                    )}
                  </div>

                  {/* Attempts & Status Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {job.attempts > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {n(job.attempts)} {t("feather-talk-queue-attempts")}
                      </span>
                    )}

                    <Badge
                      variant={
                        job.status === "done"
                          ? "outline"
                          : job.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                      className={`text-[10px] capitalize px-1.5 py-0 font-medium ${
                        job.status === "done" ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : ""
                      }`}
                    >
                      {job.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
