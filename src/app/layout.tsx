import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/affiliate/types";

const platformNames = PLATFORMS.map((p) => PLATFORM_LABELS[p]).join(" / ");

export const metadata: Metadata = {
  title: "联盟 AI 选品中心 · Affiliate AI Hub",
  description: `多平台联盟营销 AI 自动选品与分发系统，覆盖 ${platformNames}，AI 智能评分、种草文案与多维度聚合分析。`,
  keywords: ["AI选品", "联盟营销", ...Object.values(PLATFORM_LABELS), "affiliate", "AI"],
  authors: [{ name: "Affiliate AI Hub" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "联盟 AI 选品中心",
    description: "多平台联盟营销 AI 自动选品与分发系统",
    siteName: "Affiliate AI Hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "联盟 AI 选品中心",
    description: "多平台联盟营销 AI 自动选品与分发系统",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
