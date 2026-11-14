"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { fetchContest, fetchArticles, fetchArticlePreview, reviewArticle, Contest, Article, ArticlePreview } from "@/lib/api";
import { useI18n } from "@/i18n/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, CheckCircle2, XCircle, SkipForward, 
  Search, ExternalLink, Keyboard, BookOpen, Loader2, User
} from "lucide-react";

export default function ReviewQueuePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [comment, setComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: contest } = useQuery<Contest>({
    queryKey: ["contest", code],
    queryFn: () => fetchContest(code),
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["articles", code, statusFilter],
    queryFn: () => fetchArticles(code, undefined, statusFilter, 100),
  });

  const articles = articlesData?.items || [];
  const filteredArticles = articles.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!selectedArticle && filteredArticles.length > 0) {
      setSelectedArticle(filteredArticles[0]);
    }
  }, [filteredArticles, selectedArticle]);

  // Fetch real MediaWiki parsed HTML preview
  const { data: previewData, isLoading: previewLoading } = useQuery<ArticlePreview>({
    queryKey: ["article-preview", code, selectedArticle?.id],
    queryFn: () => fetchArticlePreview(code, selectedArticle!.id),
    enabled: !!selectedArticle?.id,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: ({
      articleId,
      status,
      decisionComment,
    }: {
      articleId: number;
      status: "accepted" | "rejected" | "skipped";
      decisionComment: string;
    }) => reviewArticle(articleId, status, decisionComment),
    onSuccess: (_, variables) => {
      toast.success(`Article marked as ${variables.status}`);
      setComment("");
      const currentIndex = filteredArticles.findIndex((a) => a.id === variables.articleId);
      if (currentIndex >= 0 && currentIndex < filteredArticles.length - 1) {
        setSelectedArticle(filteredArticles[currentIndex + 1]);
      }
      queryClient.invalidateQueries({ queryKey: ["articles", code] });
      queryClient.invalidateQueries({ queryKey: ["contest", code] });
      queryClient.invalidateQueries({ queryKey: ["standings", code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit review");
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedArticle || mutation.isPending) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input") return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        mutation.mutate({ articleId: selectedArticle.id, status: "accepted", decisionComment: comment });
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        mutation.mutate({ articleId: selectedArticle.id, status: "rejected", decisionComment: comment });
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        mutation.mutate({ articleId: selectedArticle.id, status: "skipped", decisionComment: comment });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedArticle, comment, mutation]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredArticles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sub-header Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Link
            href={`/contests/${code}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("feather-nav-dashboard")}
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-bold truncate max-w-sm">
            {contest?.name || t("feather-review-title")}
          </h1>
          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
            {t("feather-review-loaded", filteredArticles.length)}
          </Badge>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <Keyboard className="h-3.5 w-3.5" />
          <span>{t("feather-review-shortcuts")}:</span>
          <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">A</kbd> {t("feather-review-accept")}
          <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">R</kbd> {t("feather-review-reject")}
          <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">S</kbd> {t("feather-review-skip")}
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Virtualized Article List */}
        <div className="w-80 sm:w-96 border-r border-border flex flex-col bg-muted/10 h-full">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>
            <div className="flex gap-1.5">
              {(["pending", "accepted", "rejected", ""] as const).map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className="flex-1 text-[11px] h-7 px-2 capitalize cursor-pointer"
                >
                  {st || "All"}
                </Button>
              ))}
            </div>
          </div>

          <div ref={parentRef} className="flex-1 overflow-y-auto">
            {articlesLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No articles found matching filters.
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const article = filteredArticles[virtualRow.index];
                  const isSelected = selectedArticle?.id === article.id;

                  return (
                    <div
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className={`absolute top-0 left-0 w-full p-3 border-b border-border cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-primary/40 font-medium"
                          : "hover:bg-muted/30"
                      }`}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate text-foreground">
                          {article.title}
                        </span>
                        <Badge
                          variant={
                            article.status === "accepted"
                              ? "default"
                              : article.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[9px] uppercase px-1.5 py-0 h-4 font-bold"
                        >
                          {article.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                        <span>by {article.submitter_username}</span>
                        <span>{article.word_count} words</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Article Details & Decision Console */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          {selectedArticle ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-border flex items-start justify-between bg-card/60">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-xs font-mono">
                      #{selectedArticle.id}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Submitted by <strong className="text-foreground">{selectedArticle.submitter_username}</strong>
                    </span>
                    {selectedArticle.wiki_creator && selectedArticle.wiki_creator !== selectedArticle.submitter_username && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        (Wiki creator: {selectedArticle.wiki_creator})
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {selectedArticle.title}
                  </h2>
                </div>

                <a
                  href={`${contest?.wiki_url || "https://bn.wiktionary.org"}/wiki/${encodeURIComponent(
                    selectedArticle.title
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 text-xs cursor-pointer" })}
                >
                  {t("feather-review-open-wiki")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Rendered MediaWiki Article Preview */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="rounded-lg border border-border p-6 bg-card shadow-2xs">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {t("feather-review-live-preview")}
                    </span>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span>
                        <strong>{previewData?.word_count ?? selectedArticle.word_count}</strong> words
                      </span>
                      <span>
                        <strong>{previewData?.byte_count ?? selectedArticle.byte_count}</strong> bytes
                      </span>
                    </div>
                  </div>

                  {previewLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs">Fetching rendered article from MediaWiki API...</p>
                    </div>
                  ) : previewData?.html ? (
                    <div
                      className="wiki-content max-w-none text-sm leading-relaxed overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: previewData.html }}
                    />
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Could not render live preview. Use the &quot;Open on Wiki&quot; button above to view directly on Wiktionary.
                    </div>
                  )}
                </div>
              </div>

              {/* Decision Toolbar */}
              <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t("feather-review-comment-placeholder")}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="h-16 text-xs resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Action records decision immediately
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({
                          articleId: selectedArticle.id,
                          status: "skipped",
                          decisionComment: comment,
                        })
                      }
                      disabled={mutation.isPending}
                      className="gap-1.5 text-xs text-muted-foreground cursor-pointer"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                      {t("feather-review-skip")} [S]
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({
                          articleId: selectedArticle.id,
                          status: "rejected",
                          decisionComment: comment,
                        })
                      }
                      disabled={mutation.isPending}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("feather-review-reject")} [R]
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({
                          articleId: selectedArticle.id,
                          status: "accepted",
                          decisionComment: comment,
                        })
                      }
                      disabled={mutation.isPending}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("feather-review-accept")} [A]
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground text-xs">
              Select an article to begin reviewing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
