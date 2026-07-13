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
import {
  KeyRound,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Github,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
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

interface EnvInfo {
  env: "cloudflare" | "github-actions" | "local";
  label: string;
  description: string;
  store: string;
  writable: boolean;
  missingConfig: string[];
}

interface CredentialsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ENV_ICONS: Record<EnvInfo["env"], React.ReactNode> = {
  cloudflare: <Cloud className="h-3.5 w-3.5 text-orange-500" />,
  "github-actions": <Github className="h-3.5 w-3.5 text-foreground" />,
  local: <FileText className="h-3.5 w-3.5 text-emerald-500" />,
};

export function CredentialsPanel({ open, onOpenChange }: CredentialsPanelProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [envInfo, setEnvInfo] = useState<EnvInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBase("/api/credentials"));
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials ?? []);
        setEnvInfo(data.envInfo ?? null);
        // Initialize draft — empty so user types fresh values
        setDraft({});
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
    // Only send non-empty draft values (don't re-save existing masked placeholders)
    const toSave: Record<string, string> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v && v.trim()) toSave[k] = v.trim();
    }
    if (Object.keys(toSave).length === 0) {
      toast.info("没有需要保存的新凭证");
      return;
    }

    setSaving(true);
    const t = toast.loading(`正在写入到 ${envInfo?.label ?? "环境"}…`);
    try {
      const res = await fetch(withBase("/api/credentials"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(data.message ?? `已写入 ${data.updatedCount} 项凭证`, { id: t });
        setDraft({});
        // Reload to show updated masked values
        await load();
      } else {
        const errMsg = data.error ?? "保存失败";
        if (data.errors?.length) {
          const detail = data.errors.map((e: { key: string; error: string }) => `${e.key}: ${e.error}`).join("; ");
          toast.error(`${errMsg} — ${detail}`, { id: t, duration: 8000 });
        } else {
          toast.error(errMsg, { id: t });
        }
      }
    } catch {
      toast.error("请求异常", { id: t });
    } finally {
      setSaving(false);
    }
  }, [draft, envInfo, load]);

  // Group credentials
  const groups = Array.from(new Set(credentials.map((c) => c.group)));
  const configuredCount = credentials.filter((c) => c.isSet).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            联盟 API 凭证配置
          </DialogTitle>
          <DialogDescription>
            配置各联盟平台 API 密钥。无凭证的平台自动使用 mock 数据。
          </DialogDescription>
        </DialogHeader>

        {/* Environment info banner */}
        {envInfo && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              {ENV_ICONS[envInfo.env]}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{envInfo.label}</span>
                  <Badge variant={envInfo.writable ? "secondary" : "destructive"} className="h-4 px-1.5 text-[9px]">
                    {envInfo.writable ? "可写入" : "缺少配置"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{envInfo.description}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="font-mono">{envInfo.store}</span>
                </div>
                {envInfo.missingConfig.length > 0 && (
                  <div className="text-[10px] text-rose-600 dark:text-rose-400">
                    缺少: {envInfo.missingConfig.join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                    .map((c) => {
                      const isVisible = showValues[c.key] ?? false;
                      const hasDraft = draft[c.key]?.trim();
                      return (
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
                          <div className="relative flex-1">
                            <Input
                              type={c.mask && !isVisible ? "password" : "text"}
                              value={hasDraft ? draft[c.key] : (c.mask ? c.maskedValue : "")}
                              onChange={(e) =>
                                setDraft({ ...draft, [c.key]: e.target.value })
                              }
                              onFocus={() => {
                                // Clear masked placeholder on focus if no draft yet
                                if (!hasDraft && c.isSet && c.mask) {
                                  setDraft({ ...draft, [c.key]: "" });
                                }
                              }}
                              placeholder={c.isSet && c.mask ? c.maskedValue : `输入 ${c.label}`}
                              className="h-8 pr-8 text-xs"
                            />
                            {c.mask && (
                              <button
                                type="button"
                                onClick={() => setShowValues({ ...showValues, [c.key]: !isVisible })}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                              >
                                {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Badge variant="outline" className="gap-1 text-[10px]">
            {configuredCount}/{credentials.length} 已配置
          </Badge>
          <Button
            size="sm"
            className="gap-1"
            onClick={handleSave}
            disabled={saving || !envInfo?.writable}
            title={!envInfo?.writable ? `缺少配置: ${envInfo?.missingConfig.join(", ")}` : "保存凭证"}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存到 {envInfo?.label ?? "环境"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
