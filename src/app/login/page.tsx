"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTarget = searchParams.get("redirect") || "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!secret.trim()) {
      toast.error("请输入管理密钥");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("验证通过,正在跳转...");
        router.push(redirectTarget);
        router.refresh();
      } else {
        toast.error(data.error || "密钥错误,请重试");
      }
    } catch (err) {
      toast.error("网络错误,请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Toaster position="top-center" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border bg-card text-card-foreground shadow-xl p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">管理面板登录</h1>
              <p className="text-sm text-muted-foreground">
                联盟 AI 选品中心 · 请输入管理密钥以继续
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-secret" className="text-sm font-medium">
                ADMIN_SECRET 管理密钥
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-secret"
                  type="password"
                  placeholder="输入管理密钥..."
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="pl-9"
                  autoFocus
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !secret.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  验证并登录
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>
              密钥已通过 ADMIN_SECRET 环境变量配置。
              <br />
              登录后将获得 30 天的会话有效期。
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
