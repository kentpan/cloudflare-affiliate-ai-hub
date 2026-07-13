import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "联盟 AI 选品中心 · Affiliate AI Hub",
  description: "多平台联盟营销 AI 自动选品与分发系统，覆盖 Amazon / 淘宝客 / 京东 / Google，AI 智能评分、种草文案与多维度聚合分析。",
  keywords: ["AI选品", "联盟营销", "Amazon", "淘宝客", "京东", "Google", "affiliate", "AI"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
