"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Lock, ShieldCheck, User, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

/**
 * Inner login form component — uses useSearchParams().
 *
 * MUST be wrapped in <Suspense> when used in a page, because useSearchParams()
 * is a Client Component hook that reads from the URL, and during static
 * prerendering Next.js needs a Suspense boundary to know what to render
 * before the client takes over.
 *
 * See: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTarget = searchParams.get("redirect") || "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("请输入登录令牌");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(data.role === "demo" ? "演示用户验证通过,正在跳转..." : "验证通过,正在跳转...");
        router.push(redirectTarget);
        router.refresh();
      } else {
        toast.error(data.error || "令牌错误,请重试");
      }
    } catch (err) {
      toast.error("网络错误,请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
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
            <h1 className="text-2xl font-bold tracking-tight">登录</h1>
            <p className="text-sm text-muted-foreground">
              联盟 AI 选品中心 · 请输入登录令牌以继续
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="auth-token" className="text-sm font-medium">
              登录令牌 (ADMIN_SECRET 或 DEMO_TOKEN)
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-token"
                type="password"
                placeholder="输入登录令牌..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
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
            disabled={loading || !token.trim()}
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

        <div className="space-y-2 text-center text-xs text-muted-foreground border-t pt-4">
          <p className="flex items-center justify-center gap-1">
            <UserCog className="w-3 h-3" />
            管理员:使用 ADMIN_SECRET 登录,拥有完整权限(含 AI 选品触发)。
          </p>
          <p className="flex items-center justify-center gap-1">
            <User className="w-3 h-3" />
            演示用户:使用 DEMO_TOKEN 登录,可浏览数据与配置演示凭证,但无法触发 AI 选品。
          </p>
          <p className="mt-1">登录后将获得 30 天的会话有效期。</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Loading fallback shown while the Suspense boundary resolves
 * useSearchParams() during static prerendering.
 */
function LoginFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border bg-card text-card-foreground shadow-xl p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">登录</h1>
            <p className="text-sm text-muted-foreground">
              联盟 AI 选品中心 · 请输入登录令牌以继续
            </p>
          </div>
        </div>
        <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
        <div className="h-10 rounded-md bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Toaster position="top-center" />
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
