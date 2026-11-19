"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, Plus, Trash2, ArrowUp, ArrowDown, 
  FileCode, Sparkles, Layers, ShieldCheck
} from "lucide-react";

interface TalkTemplateBuilderProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Normalizes raw string input into clean individual template strings.
 * e.g. "{{talk page}}\n{{wiki loves earth}}" -> ["{{talk page}}", "{{wiki loves earth}}"]
 */
function parseTemplates(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split("\n");
  const list: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      list.push(trimmed);
    }
  }
  return list;
}

/**
 * Formats template items into standard wikitext syntax.
 * Ensures each non-empty entry is enclosed with {{ and }}.
 */
function formatTemplatesToWikitext(items: string[]): string {
  const formatted: string[] = [];
  for (const item of items) {
    let t = item.trim();
    if (!t) continue;
    if (!t.startsWith("{{")) {
      t = "{{" + t;
    }
    if (!t.endsWith("}}")) {
      t = t + "}}";
    }
    formatted.push(t);
  }
  return formatted.join("\n");
}

export default function TalkTemplateBuilder({
  value,
  onChange,
  disabled = false,
}: TalkTemplateBuilderProps) {
  const { t, n } = useI18n();

  // Local state array of template strings
  const [items, setItems] = useState<string[]>(() => {
    const parsed = parseTemplates(value);
    return parsed.length > 0 ? parsed : [""];
  });

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Sync internal items whenever incoming value changes from outside (e.g. initial fetch)
  useEffect(() => {
    const parsed = parseTemplates(value);
    const currentWikitext = formatTemplatesToWikitext(items);
    if (value !== currentWikitext && parsed.length > 0) {
      setItems(parsed);
    } else if (!value && items.length === 0) {
      setItems([""]);
    }
  }, [value]);

  const updateParent = (newItems: string[]) => {
    setItems(newItems);
    const wikitext = formatTemplatesToWikitext(newItems);
    onChange(wikitext);
  };

  const handleItemChange = (index: number, val: string) => {
    const next = [...items];
    next[index] = val;
    updateParent(next);
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text || !text.includes("\n")) return;
    e.preventDefault();
    const pastedLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (pastedLines.length === 0) return;
    const next = [...items];
    next.splice(index, 1, ...pastedLines);
    updateParent(next);
  };

  const handleAddTemplate = () => {
    const next = [...items, ""];
    updateParent(next);
  };

  const handleRemove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    if (next.length === 0) {
      updateParent([""]);
    } else {
      updateParent(next);
    }
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    updateParent(next);
  };

  const previewWikitext = formatTemplatesToWikitext(items);
  const activeCount = items.filter((i) => i.trim().length > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>{t("feather-templates-builder-title")}</span>
        </label>
        <span className="text-[11px] font-mono text-muted-foreground">
          {n(activeCount)} {t("feather-templates-configured-count")}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("feather-templates-builder-desc")}
      </p>

      {/* Drag & Drop Reorderable Template List */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            draggable={!disabled}
            onDragStart={(e) => {
              if (disabled) return;
              e.dataTransfer.effectAllowed = "move";
              setDraggedIdx(idx);
            }}
            onDragOver={(e) => {
              if (disabled) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverIdx !== idx) {
                setDragOverIdx(idx);
              }
            }}
            onDragLeave={() => {
              if (dragOverIdx === idx) {
                setDragOverIdx(null);
              }
            }}
            onDrop={(e) => {
              if (disabled) return;
              e.preventDefault();
              if (draggedIdx !== null && draggedIdx !== idx) {
                handleMove(draggedIdx, idx);
              }
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
            onDragEnd={() => {
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
              dragOverIdx === idx
                ? "border-primary bg-primary/10 shadow-xs"
                : "border-border bg-card/60 hover:bg-card"
            } ${draggedIdx === idx ? "opacity-30 scale-98" : "opacity-100"}`}
          >
            {/* Drag Handle */}
            <button
              type="button"
              disabled={disabled}
              className={`p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded hover:bg-muted/50 transition-colors ${
                disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
              title={t("feather-talk-queue-drag-hint")}
              aria-label={t("feather-talk-queue-drag-hint")}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Template Number Badge */}
            <span className="text-[11px] font-mono font-medium text-muted-foreground w-4 text-center select-none">
              {n(idx + 1)}
            </span>

            {/* Template Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={item}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                onPaste={(e) => handlePaste(idx, e)}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                placeholder={t("feather-templates-placeholder")}
                disabled={disabled}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
              />
            </div>

            {/* Move Up / Move Down Actions */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleMove(idx, idx - 1)}
                disabled={disabled || idx === 0}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t("feather-talk-queue-move-up")}
                aria-label={t("feather-talk-queue-move-up")}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(idx, idx + 1)}
                disabled={disabled || idx === items.length - 1}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title={t("feather-talk-queue-move-down")}
                aria-label={t("feather-talk-queue-move-down")}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                disabled={disabled}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors ml-0.5"
                title={t("feather-talk-queue-delete")}
                aria-label={t("feather-talk-queue-delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Button */}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddTemplate}
          className="text-xs gap-1.5 h-8 border-dashed hover:border-primary/50 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("feather-templates-add-btn")}</span>
        </Button>
      )}

      {/* Real-time Wikitext Preview */}
      {previewWikitext ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-primary" />
              <span>{t("feather-templates-preview-title")}</span>
            </span>
            <Badge variant="outline" className="text-[10px] font-mono tracking-wider">
              wikitext
            </Badge>
          </div>
          <pre className="text-xs font-mono text-primary font-medium bg-background p-2.5 rounded-md border border-border/60 whitespace-pre overflow-x-auto leading-relaxed shadow-2xs">
            {previewWikitext}
          </pre>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground italic pl-1">
          {t("feather-templates-empty")}
        </div>
      )}

      {/* Wikimedia Bot Rate-Limiting & Queue Notice */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/40 border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>{t("feather-templates-queue-notice")}</span>
      </div>
    </div>
  );
}
