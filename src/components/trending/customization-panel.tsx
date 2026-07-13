"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  RotateCcw,
  X,
  GripVertical,
  Save,
  Loader2,
  Archive,
  ArchiveRestore,
  History,
} from "lucide-react";
import type { CustomizationConfig, Direction } from "@/lib/affiliate/customization";
import { withBase } from "@/lib/base";

interface ArchiveEntry {
  date: string;
  size: number;
  archivedAt: string;
}

interface CustomizationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CustomizationConfig | null;
  onSave: (cfg: CustomizationConfig) => Promise<void>;
  onReset: () => Promise<void>;
}

export function CustomizationPanel({
  open,
  onOpenChange,
  config,
  onSave,
  onReset,
}: CustomizationPanelProps) {
  const [draft, setDraft] = useState<CustomizationConfig | null>(config);
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config, open]);

  const loadArchives = useCallback(async () => {
    try {
      const res = await fetch(withBase("/api/archive?action=list"));
      if (res.ok) {
        const data = await res.json();
        setArchives(data.archives ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Load archive list when panel opens
  useEffect(() => {
    if (open) loadArchives();
  }, [open, loadArchives]);

  const handleRunArchive = useCallback(async () => {
    setArchiving(true);
    const t = toast.loading("正在归档 60 天以上数据…");
    try {
      const res = await fetch(withBase("/api/archive?action=run"));
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `归档完成 · ${data.count ?? 0} 个日期已归档`,
          { id: t },
        );
        await loadArchives();
      } else {
        toast.error("归档失败", { id: t });
      }
    } catch {
      toast.error("归档请求异常", { id: t });
    } finally {
      setArchiving(false);
    }
  }, [loadArchives]);

  const handleRestoreArchive = useCallback(
    async (date: string) => {
      const t = toast.loading(`正在恢复 ${date} …`);
      try {
        const res = await fetch(withBase(`/api/archive?action=restore&date=${date}`));
        if (res.ok) {
          toast.success(`${date} 已恢复`, { id: t });
          await loadArchives();
        } else {
          toast.error("恢复失败", { id: t });
        }
      } catch {
        toast.error("恢复请求异常", { id: t });
      }
    },
    [loadArchives],
  );

  if (!draft) return null;

  const updateDirection = (id: string, patch: Partial<Direction>) => {
    setDraft({
      ...draft,
      directions: draft.directions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  };

  const removeDirection = (id: string) => {
    setDraft({ ...draft, directions: draft.directions.filter((d) => d.id !== id) });
  };

  const addDirection = () => {
    const id = `dir-${Date.now()}`;
    setDraft({
      ...draft,
      directions: [
        ...draft.directions,
        {
          id,
          name: "新方向",
          keywords: [],
          color: "#0d9488",
          icon: "📦",
          enabled: true,
        },
      ],
    });
  };

  const addKeyword = (dirId: string) => {
    const kw = (newKeyword[dirId] ?? "").trim();
    if (!kw) return;
    updateDirection(dirId, {
      keywords: [...(draft.directions.find((d) => d.id === dirId)?.keywords ?? []), kw],
    });
    setNewKeyword({ ...newKeyword, [dirId]: "" });
  };

  const removeKeyword = (dirId: string, idx: number) => {
    const d = draft.directions.find((x) => x.id === dirId);
    if (!d) return;
    updateDirection(dirId, { keywords: d.keywords.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onReset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            选品方向与关键词配置
          </DialogTitle>
          <DialogDescription>
            自定义选品方向（niche）和关键词。生成时各平台会用关键词驱动选品，商品按方向自动归类。
          </DialogDescription>
        </DialogHeader>

        {/* Global keywords */}
        <div className="rounded-lg border p-3">
          <Label className="text-xs font-semibold">全局关键词（应用于所有平台）</Label>
          <div className="mt-2 flex flex-wrap gap-1">
            {draft.globalKeywords.map((kw, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                {kw}
                <button
                  onClick={() =>
                    setDraft({
                      ...draft,
                      globalKeywords: draft.globalKeywords.filter((_, j) => j !== i),
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {draft.globalKeywords.length === 0 && (
              <span className="text-xs text-muted-foreground">暂无</span>
            )}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = (document.getElementById("global-kw") as HTMLInputElement)?.value?.trim();
              if (v) {
                setDraft({ ...draft, globalKeywords: [...draft.globalKeywords, v] });
                (document.getElementById("global-kw") as HTMLInputElement).value = "";
              }
            }}
          >
            <Input id="global-kw" placeholder="输入关键词后回车" className="h-8 text-xs" />
            <Button type="submit" size="sm" variant="secondary" className="h-8 px-2">
              <Plus className="h-3 w-3" />
            </Button>
          </form>
        </div>

        <Separator />

        {/* Directions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">选品方向（{draft.directions.length}）</Label>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addDirection}>
              <Plus className="h-3 w-3" />
              新增方向
            </Button>
          </div>

          {draft.directions.map((d) => (
            <div key={d.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={d.color}
                  onChange={(e) => updateDirection(d.id, { color: e.target.value })}
                  className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={d.icon}
                  onChange={(e) => updateDirection(d.id, { icon: e.target.value })}
                  className="h-7 w-10 rounded border bg-transparent px-1 text-center text-sm"
                  maxLength={2}
                />
                <Input
                  value={d.name}
                  onChange={(e) => updateDirection(d.id, { name: e.target.value })}
                  className="h-7 flex-1 text-sm"
                />
                <Switch
                  checked={d.enabled}
                  onCheckedChange={(v) => updateDirection(d.id, { enabled: v })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                  onClick={() => removeDirection(d.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {d.keywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="gap-1 text-[11px]">
                    {kw}
                    <button onClick={() => removeKeyword(d.id, i)}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                {d.keywords.length === 0 && (
                  <span className="text-[11px] text-muted-foreground">无关键词</span>
                )}
              </div>

              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addKeyword(d.id);
                }}
              >
                <Input
                  value={newKeyword[d.id] ?? ""}
                  onChange={(e) => setNewKeyword({ ...newKeyword, [d.id]: e.target.value })}
                  placeholder="添加关键词后回车"
                  className="h-7 text-xs"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-7 px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </form>
            </div>
          ))}
        </div>

        {/* Archive management */}
        <Separator />
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
              数据归档管理
            </Label>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleRunArchive}
              disabled={archiving}
            >
              {archiving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <History className="h-3 w-3" />
              )}
              归档 60+ 天
            </Button>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            60 天以上的数据会打包到 <code className="rounded bg-muted px-1">.data/_archive/</code>，保持活跃目录精简。已归档 {archives.length} 个快照。
          </p>
          {archives.length > 0 ? (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {archives.map((a) => (
                <div
                  key={a.date}
                  className="flex items-center justify-between gap-2 rounded border bg-card px-2 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Archive className="h-3 w-3 text-amber-600" />
                    <span className="font-medium">{a.date}</span>
                    <span className="text-muted-foreground">
                      {(a.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() => handleRestoreArchive(a.date)}
                  >
                    <ArchiveRestore className="h-3 w-3" />
                    恢复
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
              暂无已归档快照（当前数据均未满 60 天）
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="gap-1" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置默认
          </Button>
          <Button size="sm" className="gap-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
