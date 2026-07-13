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
import { Separator } from "@/components/ui/separator";
import { KeyRound, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { withBase } from "@/lib/base";

interface CredentialDef {
  key: string;
  label: string;
  group: string;
  required?: boolean;
  mask?: boolean;
  placeholder?: string;
}

interface Credential extends CredentialDef {
  isSet: boolean;
  maskedValue: string;
}

interface CredentialsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CredentialsPanel({ open, onOpenChange }: CredentialsPanelProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBase("/api/credentials"));
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials ?? []);
        // Initialize draft with masked values
        const d: Record<string, string> = {};
        for (const c of data.credentials ?? []) {
          d[c.key] = c.maskedValue;
        }
        setDraft(d);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const t = toast.loading("正在保存凭证…");
    try {
      const res = await fetch(withBase("/api/credentials"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message ?? `已更新 ${data.updatedCount} 项凭证`, { id: t });
        onOpenChange(false);
      } else {
        toast.error("保存失败", { id: t });
      }
    } catch {
      toast.error("请求异常", { id: t });
    } finally {
      setSaving(false);
    }
  }, [draft, onOpenChange]);

  // Group credentials
  const groups = Array.from(new Set(credentials.map((c) => c.group)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            联盟 API 凭证配置
          </DialogTitle>
          <DialogDescription>
            配置各联盟平台 API 密钥。保存后写入 <code className="rounded bg-muted px-1 text-[10px]">.env.local</code>，重启 dev server 后生效（或下次沙盒启动时自动加载）。无凭证的平台自动使用 mock 数据。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group}>
                <Label className="mb-2 block text-xs font-semibold text-foreground">{group}</Label>
                <div className="space-y-2">
                  {credentials
                    .filter((c) => c.group === group)
                    .map((c) => (
                      <div key={c.key} className="flex items-center gap-2">
                        <div className="w-32 shrink-0">
                          <div className="flex items-center gap-1 text-xs">
                            {c.label}
                            {c.required && <span className="text-rose-500">*</span>}
                          </div>
                          <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                            {c.isSet ? (
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                            ) : (
                              <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                            )}
                            {c.isSet ? "已配置" : "未配置"}
                          </div>
                        </div>
                        <Input
                          type={c.mask ? "password" : "text"}
                          value={draft[c.key] ?? ""}
                          onChange={(e) =>
                            setDraft({ ...draft, [c.key]: e.target.value })
                          }
                          placeholder={c.placeholder ?? `输入 ${c.label}`}
                          className="h-8 flex-1 text-xs"
                        />
                      </div>
                    ))}
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Badge variant="outline" className="gap-1 text-[10px]">
            {credentials.filter((c) => c.isSet).length}/{credentials.length} 已配置
          </Badge>
          <Button size="sm" className="gap-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存凭证
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
