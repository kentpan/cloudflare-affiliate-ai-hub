"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  Flame,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
  ArrowUpRight,
  PlusCircle,
  Layers,
  Cloud,
  Box,
  LineChart as LineChartIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileJson,
  FileSpreadsheet,
  GitCompareArrows,
  ArrowRight,
  TrendingDown,
  History,
  Archive,
  KeyRound,
  MousePointerClick,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, Area, AreaChart } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { TrendingProductCard } from "@/components/trending/trending-product-card";
import { CustomizationPanel } from "@/components/trending/customization-panel";
import { ProductDetailDialog } from "@/components/affiliate/product-detail-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { WordCloud } from "@/components/trending/word-cloud";
import { SankeyDiagram } from "@/components/trending/sankey-diagram";
import { CredentialsPanel } from "@/components/trending/credentials-panel";
import {
  PLATFORM_LABELS,
  type DailySummary,
  type DataIndex,
  type Platform,
  type PickedProduct,
  type WordFreq,
  type SearchHit,
  PLATFORMS,
} from "@/lib/affiliate/types";
import type { DailyComparison, ProductComparison } from "@/lib/affiliate/comparison";
import type { CustomizationConfig, Direction } from "@/lib/affiliate/customization";
import {
  generate,
  getDates,
  getIndex,
  getSummary,
} from "@/lib/affiliate/api-client";
import { cn } from "@/lib/utils";

type SortKey = "score" | "expectedRevenue" | "commissionRate" | "price";
type VirtualFilter = "all" | "virtual" | "physical";

interface TrendPoint {
  date: string;
  total: number;
  avgScore: number;
  totalExpectedRevenue: number;
  virtualCount: number;
  virtualRatio: number;
}
interface TrendData {
  points: TrendPoint[];
  span: number;
  latest: TrendPoint | null;
}

interface PlatformDelta {
  platform: string;
  label: string;
  fromCount: number;
  toCount: number;
  countDelta: number;
  fromAvgScore: number;
  toAvgScore: number;
  scoreDelta: number;
  fromRevenue: number;
  toRevenue: number;
  revenueDelta: number;
}
interface CategoryShift {
  category: string;
  fromCount: number;
  toCount: number;
  delta: number;
  trend: "up" | "down" | "same" | "new" | "gone";
}
interface TrendCompareData {
  from: string;
  to: string;
  fromTotal: number;
  toTotal: number;
  totalDelta: number;
  fromAvgScore: number;
  toAvgScore: number;
  avgScoreDelta: number;
  fromRevenue: number;
  toRevenue: number;
  revenueDelta: number;
  fromVirtualRatio: number;
  toVirtualRatio: number;
  virtualRatioDelta: number;
  platforms: PlatformDelta[];
  categoryShifts: CategoryShift[];
  newProducts: PickedProduct[];
  lostProductTitles: string[];
}

export default function DashboardPage() {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [comparison, setComparison] = useState<DailyComparison | null>(null);
  const [config, setConfig] = useState<CustomizationConfig | null>(null);

  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [virtualFilter, setVirtualFilter] = useState<VirtualFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [detail, setDetail] = useState<PickedProduct | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareFrom, setCompareFrom] = useState<string>("");
  const [compareTo, setCompareTo] = useState<string>("");
  const [compareData, setCompareData] = useState<TrendCompareData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [wordcloudData, setWordcloudData] = useState<WordFreq[]>([]);
  const [wordcloudField, setWordcloudField] = useState<"tags" | "category">("tags");
  const [crossSearch, setCrossSearch] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sankeyData, setSankeyData] = useState<any>(null);
  const [sankeyOpen, setSankeyOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const risingStarsRef = useRef<HTMLDivElement>(null);

  const scrollRisingStars = useCallback((dir: "left" | "right") => {
    const el = risingStarsRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  // Comparison map for quick lookup by product id
  const cmpByTitle = useMemo(() => {
    const m = new Map<string, ProductComparison>();
    for (const c of comparison?.comparisons ?? []) {
      m.set(normalize(c.title), c);
    }
    return m;
  }, [comparison]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    let idx = await getIndex();
    let ds = await getDates();
    if ((!idx || !idx.dates?.length) && (!ds || !ds.dates?.length)) {
      toast.info("首次访问，正在生成初始示例数据…");
      const seedRes = await generate({ action: "seed" });
      if (seedRes.ok && seedRes.dates?.length) {
        idx = await getIndex();
        ds = await getDates();
      }
    }
    if (idx) setIndex(idx);
    const dateList = ds?.dates?.length ? ds.dates : idx?.dates?.length ? idx.dates : [];
    if (dateList.length) {
      setDates(dateList);
      setSelectedDate(dateList[0]);
      // Default compare: oldest vs newest
      setCompareFrom(dateList[dateList.length - 1]);
      setCompareTo(dateList[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const loadDateData = useCallback(async (date: string) => {
    if (!date) return;
    setLoading(true);
    const [s, cmp] = await Promise.all([
      getSummary(date),
      fetch(`/api/comparison?date=${date}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setSummary(s);
    setComparison(cmp);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedDate) loadDateData(selectedDate);
  }, [selectedDate, loadDateData]);

  // Load config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setConfig(c))
      .catch(() => null);
  }, []);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    const t = toast.loading("正在调用 AI 重新生成今日选品…");
    try {
      const res = await generate({ date: selectedDate || undefined, useLlm: true });
      if (res.ok) {
        toast.success(
          `生成完成 · ${res.total ?? 0} 件 · ${((res.durationMs ?? 0) / 1000).toFixed(1)}s`,
          { id: t },
        );
        await loadDateData(selectedDate);
        const idx = await getIndex();
        if (idx) setIndex(idx);
      } else {
        toast.error(`生成失败：${res.error ?? "未知错误"}`, { id: t });
      }
    } catch (e) {
      toast.error(`生成异常：${(e as Error).message}`, { id: t });
    } finally {
      setRegenerating(false);
    }
  }, [selectedDate, loadDateData]);

  const handleSaveConfig = useCallback(async (cfg: CustomizationConfig) => {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
      toast.success("配置已保存，正在重新生成选品…");
      // Auto-trigger a heuristic regeneration so the new directions/keywords
      // are reflected immediately (avoids burning LLM quota on every config
      // save; user can click "AI 选品" for a full LLM run).
      try {
        const genRes = await generate({ date: selectedDate || undefined, useLlm: false });
        if (genRes.ok) {
          await loadDateData(selectedDate);
          const idx = await getIndex();
          if (idx) setIndex(idx);
          toast.success(`选品已更新 · ${genRes.total ?? 0} 件商品`);
        }
      } catch {
        // non-fatal — config is still saved
      }
    } else {
      toast.error("保存失败");
    }
  }, [selectedDate, loadDateData]);

  const handleResetConfig = useCallback(async () => {
    const res = await fetch("/api/config?action=reset", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
      toast.success("已重置为默认配置");
    }
  }, []);

  const handleExport = useCallback(
    (format: "csv" | "json" | "md") => {
      if (!selectedDate) {
        toast.error("请先选择日期");
        return;
      }
      const url = `/api/export?date=${encodeURIComponent(selectedDate)}&format=${format}`;
      // Trigger download via a hidden link click (works across browsers).
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      const label = format === "csv" ? "CSV 表格" : format === "json" ? "JSON 数据" : "Markdown 文案";
      toast.success(`正在导出 ${label} · ${selectedDate}`);
    },
    [selectedDate],
  );

  const handleCompare = useCallback(async () => {
    if (!compareFrom || !compareTo) {
      toast.error("请选择两个日期");
      return;
    }
    if (compareFrom === compareTo) {
      toast.error("请选择两个不同的日期");
      return;
    }
    setCompareLoading(true);
    try {
      const res = await fetch(
        `/api/trend-compare?from=${compareFrom}&to=${compareTo}`,
      );
      if (!res.ok) {
        toast.error("对比数据获取失败");
        return;
      }
      const data = (await res.json()) as TrendCompareData;
      setCompareData(data);
    } catch {
      toast.error("对比请求异常");
    } finally {
      setCompareLoading(false);
    }
  }, [compareFrom, compareTo]);

  const enabledDirections = useMemo(
    () => (config?.directions ?? []).filter((d) => d.enabled),
    [config],
  );

  // Build comparison map by title for current products
  const cmpForProduct = useCallback(
    (p: PickedProduct): ProductComparison | undefined => cmpByTitle.get(normalize(p.title)),
    [cmpByTitle],
  );

  // Group products by direction
  const groupedByDirection = useMemo(() => {
    const list = summary?.topPicks ?? [];
    const groups = new Map<string, PickedProduct[]>();
    const other: PickedProduct[] = [];
    for (const p of list) {
      const dirId = p.directionId;
      if (dirId) {
        if (!groups.has(dirId)) groups.set(dirId, []);
        groups.get(dirId)!.push(p);
      } else {
        other.push(p);
      }
    }
    return { groups, other };
  }, [summary]);

  // Load trend data (7-day)
  useEffect(() => {
    fetch("/api/trend")
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => setTrend(t))
      .catch(() => null);
  }, [selectedDate, regenerating]);

  // Load wordcloud data
  useEffect(() => {
    if (!selectedDate) return;
    fetch(`/api/wordcloud?date=${selectedDate}&field=${wordcloudField}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setWordcloudData(d?.words ?? []))
      .catch(() => null);
  }, [selectedDate, wordcloudField, regenerating]);

  // Load sankey data (lazy — only when section opens)
  useEffect(() => {
    if (sankeyOpen && selectedDate && !sankeyData) {
      fetch(`/api/sankey?date=${selectedDate}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setSankeyData(d))
        .catch(() => null);
    }
  }, [sankeyOpen, selectedDate, sankeyData]);

  const handleCrossSearch = useCallback(async (query?: string) => {
    const q = (query ?? crossSearch).trim();
    if (!q) {
      setSearchHits(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setSearchHits(data.hits ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  }, [crossSearch]);

  // Filtered + sorted products
  const filtered = useMemo(() => {
    let list = [...(summary?.topPicks ?? [])];
    if (directionFilter !== "all") {
      list = list.filter((p) => p.directionId === directionFilter);
    }
    if (platformFilter !== "all") {
      list = list.filter((p) => p.platform === platformFilter);
    }
    if (virtualFilter !== "all") {
      list = list.filter((p) =>
        virtualFilter === "virtual" ? p.isVirtual : !p.isVirtual,
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.aiTags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    list.sort((a, b) => {
      switch (sortKey) {
        case "expectedRevenue":
          return b.expectedRevenue - a.expectedRevenue;
        case "commissionRate":
          return b.commissionRate - a.commissionRate;
        case "price":
          return b.price - a.price;
        default:
          return b.score - a.score;
      }
    });
    return list;
  }, [summary, directionFilter, platformFilter, search, sortKey]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20">
              <Zap className="h-5 w-5" fill="white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-foreground sm:text-lg">
                Amazon Skills 选品中心
              </h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                联盟 AI Trending Hub · 每日智能选品 + 多维度趋势分析
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent p-0 text-xs focus:ring-0">
                  <SelectValue placeholder="选择日期" />
                </SelectTrigger>
                <SelectContent>
                  {dates.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowSearch((v) => !v);
                if (showSearch) setSearchHits(null);
              }}
              className={cn("gap-1.5", showSearch && "bg-primary/10")}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">跨日搜索</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCredentialsOpen(true)}
              className="gap-1.5"
            >
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">凭证</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfigOpen(true)}
              className="gap-1.5"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">选品配置</span>
            </Button>

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">导出</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                  CSV 表格
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileJson className="mr-2 h-4 w-4 text-amber-600" />
                  JSON 数据
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("md")}>
                  <FileText className="mr-2 h-4 w-4 text-teal-600" />
                  Markdown 文案
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/api/export-all?format=zip";
                    a.download = "";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success("正在导出全部日期 ZIP…");
                  }}
                >
                  <Archive className="mr-2 h-4 w-4 text-cyan-600" />
                  全部日期 ZIP
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={handleRegenerate} disabled={regenerating} className="gap-1.5">
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">AI 选品</span>
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {/* Hero / stats row */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
                <Trophy className="h-6 w-6 text-amber-500" />
                今日 Trending 选品
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary
                  ? `生成于 ${new Date(summary.generatedAt).toLocaleString("zh-CN")} · ${summary.totalCount} 件精选商品 · 平均评分 ${summary.avgScore?.toFixed(1)}`
                  : "加载中…"}
                {comparison?.previousDate && (
                  <span className="ml-2 text-emerald-600">
                    · 较 {comparison.previousDate}{" "}
                    {comparison.avgScoreDelta !== null &&
                      comparison.avgScoreDelta >= 0 &&
                      `↑${comparison.avgScoreDelta.toFixed(1)}`}
                    {comparison.avgScoreDelta !== null &&
                      comparison.avgScoreDelta < 0 &&
                      `↓${Math.abs(comparison.avgScoreDelta).toFixed(1)}`}
                  </span>
                )}
              </p>
            </div>
            {index && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Activity className="h-3 w-3" />
                累计 {index.dates.length} 天数据
              </Badge>
            )}
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="今日精选"
              value={summary?.totalCount ?? 0}
              tone="emerald"
              hint="滚动到列表"
              onClick={() => {
                document.getElementById("product-list")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <StatCard
              icon={<PlusCircle className="h-5 w-5" />}
              label="新上榜"
              value={comparison?.newEntrants.length ?? 0}
              tone="cyan"
              hint="展开趋势对比"
              onClick={() => {
                setCompareOpen(true);
                setCompareFrom(dates[dates.length - 1] ?? selectedDate);
                setCompareTo(selectedDate);
                setTimeout(() => handleCompare(), 100);
              }}
            />
            <StatCard
              icon={<Flame className="h-5 w-5" />}
              label="上升最快"
              value={comparison?.risingStars.length ?? 0}
              tone="amber"
              hint="滚动到 Rising Stars"
              onClick={() => {
                risingStarsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            />
            <StatCard
              icon={<Layers className="h-5 w-5" />}
              label="覆盖方向"
              value={enabledDirections.length}
              tone="rose"
              hint="展开桑基图"
              onClick={() => setSankeyOpen(true)}
            />
          </div>

          {/* 7-day trend mini chart */}
          {trend && trend.points.length >= 2 && (
            <TrendSparkline trend={trend} />
          )}

          {/* Word cloud */}
          {wordcloudData.length > 0 && (
            <Card className="mt-3 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {wordcloudField === "tags" ? "AI 标签词云" : "类目词云"}
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {wordcloudData.length} 词
                  </Badge>
                </h3>
                <div className="flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5">
                  <button
                    onClick={() => setWordcloudField("tags")}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all",
                      wordcloudField === "tags"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    标签
                  </button>
                  <button
                    onClick={() => setWordcloudField("category")}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all",
                      wordcloudField === "category"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    类目
                  </button>
                </div>
              </div>
              <WordCloud
                words={wordcloudData}
                onSelect={(w) => {
                  setCrossSearch(w);
                  setShowSearch(true);
                  handleCrossSearch(w);
                }}
              />
            </Card>
          )}
        </motion.section>

        {/* Rising Stars section */}
        {comparison && comparison.risingStars.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                🔥 Rising Stars · 上升最快
                <Badge variant="secondary" className="ml-1 text-xs">
                  {comparison.risingStars.length}
                </Badge>
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => scrollRisingStars("left")}
                  title="向左滚动"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => scrollRisingStars("right")}
                  title="向右滚动"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div
              ref={risingStarsRef}
              className="flex gap-3 overflow-x-auto pb-2 [scroll-behavior:smooth] [snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            >
              {comparison.risingStars.slice(0, 8).map((c) => {
                const product = summary?.topPicks.find(
                  (p) => normalize(p.title) === normalize(c.title),
                );
                if (!product) return null;
                return (
                  <div key={c.id} className="w-72 shrink-0 [scroll-snap-align:start]">
                    <TrendingProductCard
                      product={product}
                      comparison={c}
                      rank={c.todayRank}
                      onSelect={setDetail}
                    />
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Cross-date search section */}
        {showSearch && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6"
          >
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Search className="h-4 w-4 text-cyan-600" />
                  跨日期全文搜索
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchHits(null);
                    setCrossSearch("");
                  }}
                >
                  关闭
                </Button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCrossSearch();
                }}
              >
                <Input
                  value={crossSearch}
                  onChange={(e) => setCrossSearch(e.target.value)}
                  placeholder="搜索标题/类目/AI文案/标签/店铺…（跨所有日期）"
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  搜索
                </Button>
              </form>

              {searchHits !== null && (
                <div className="mt-3">
                  {searchHits.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      未找到匹配商品
                    </p>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          找到 <span className="font-bold text-foreground">{searchHits.length}</span> 条匹配
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 px-2 text-[10px]"
                          onClick={() => {
                            // Export search results as CSV
                            const headers = ["日期", "平台", "标题", "类目", "价格", "评分", "预期收益", "虚拟", "匹配字段", "片段", "链接"];
                            const rows = searchHits.map((h) => [
                              h.date,
                              PLATFORM_LABELS[h.product.platform],
                              h.product.title,
                              h.product.category,
                              h.product.price,
                              h.product.score,
                              h.product.expectedRevenue,
                              h.product.isVirtual ? "是" : "否",
                              h.matchedFields.join("/"),
                              h.snippet.replace(/[\r\n,]/g, " "),
                              h.product.link,
                            ]);
                            const csv = [headers, ...rows]
                              .map((r) => r.map((c) => {
                                const s = String(c ?? "");
                                return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                              }).join(","))
                              .join("\n");
                            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `search-${crossSearch || "results"}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            toast.success(`已导出 ${searchHits.length} 条搜索结果`);
                          }}
                        >
                          <Download className="h-3 w-3" />
                          导出 CSV
                        </Button>
                      </div>
                      <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                        {searchHits.map((hit, i) => (
                          <button
                            key={`${hit.date}-${hit.product.platform}-${hit.product.id}-${i}`}
                            onClick={() => setDetail(hit.product)}
                            className="flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left text-xs transition-colors hover:bg-muted/40"
                          >
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {hit.date}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="line-clamp-1 font-medium text-foreground">
                                  {hit.product.title}
                                </span>
                                {hit.product.isVirtual && (
                                  <Cloud className="h-2.5 w-2.5 shrink-0 text-teal-500" />
                                )}
                              </div>
                              <div className="line-clamp-1 text-[10px] text-muted-foreground">
                                <span className="text-emerald-600">{hit.matchedFields.join("/")}</span>: {hit.snippet}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-bold text-amber-600">
                                {hit.product.score.toFixed(1)}
                              </div>
                              <div className="text-[9px] text-emerald-600">
                                ¥{hit.product.expectedRevenue.toFixed(0)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          </motion.section>
        )}

        {/* Trend Compare section */}
        {dates.length >= 2 && (
          <Collapsible open={compareOpen} onOpenChange={setCompareOpen} className="mb-6">
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-muted/40">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <GitCompareArrows className="h-4 w-4 text-cyan-600" />
                    趋势对比
                    <Badge variant="secondary" className="ml-1 text-xs">
                      跨日期
                    </Badge>
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {compareOpen ? "收起" : "展开"}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-4 pb-4 pt-3">
                  {/* Date pickers */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">从</span>
                      <Select value={compareFrom} onValueChange={setCompareFrom}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dates.map((d) => (
                            <SelectItem key={d} value={d} className="text-xs">
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">到</span>
                      <Select value={compareTo} onValueChange={setCompareTo}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dates.map((d) => (
                            <SelectItem key={d} value={d} className="text-xs">
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={handleCompare}
                      disabled={compareLoading}
                    >
                      {compareLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GitCompareArrows className="h-3.5 w-3.5" />
                      )}
                      对比
                    </Button>
                  </div>

                  {compareData && <CompareResult data={compareData} onSelect={setDetail} />}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Sankey diagram section */}
        <Collapsible open={sankeyOpen} onOpenChange={setSankeyOpen} className="mb-6">
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-muted/40">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <GitCompareArrows className="h-4 w-4 text-teal-600" />
                  方向 → 平台 流向图
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Sankey
                  </Badge>
                </h3>
                <span className="text-xs text-muted-foreground">
                  {sankeyOpen ? "收起" : "展开"}
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t px-4 pb-4 pt-3">
                {sankeyData?.nodes?.length ? (
                  <SankeyDiagram data={sankeyData} />
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    加载流向数据…
                  </div>
                )}
                {sankeyData && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    共 {sankeyData.totalProducts} 件商品 · {sankeyData.directionCount} 个方向 → {sankeyData.platformCount} 个平台 · 曲线宽度代表商品数量，悬停查看详情
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Filter bar */}
        <section className="mb-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
            {/* Direction chips — horizontally scrollable on small screens */}
            <div className="flex max-w-full flex-1 items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
              <button
                onClick={() => setDirectionFilter("all")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  directionFilter === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                全部
              </button>
              {enabledDirections.map((d) => (
                <DirectionChip
                  key={d.id}
                  direction={d}
                  count={groupedByDirection.groups.get(d.id)?.length ?? 0}
                  active={directionFilter === d.id}
                  onClick={() =>
                    setDirectionFilter(directionFilter === d.id ? "all" : d.id)
                  }
                />
              ))}
            </div>

            {/* Virtual / Physical filter toggle */}
            <div className="flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5">
              <FilterToggleBtn
                active={virtualFilter === "all"}
                onClick={() => setVirtualFilter("all")}
              >
                全部
              </FilterToggleBtn>
              <FilterToggleBtn
                active={virtualFilter === "virtual"}
                onClick={() => setVirtualFilter("virtual")}
                icon={<Cloud className="h-3 w-3" />}
              >
                虚拟
              </FilterToggleBtn>
              <FilterToggleBtn
                active={virtualFilter === "physical"}
                onClick={() => setVirtualFilter("physical")}
                icon={<Box className="h-3 w-3" />}
              >
                实体
              </FilterToggleBtn>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索商品/类目/标签…"
                className="h-8 w-40 pl-7 text-xs sm:w-52"
              />
            </div>

            {/* Platform filter */}
            <Select
              value={platformFilter}
              onValueChange={(v) => setPlatformFilter(v as Platform | "all")}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">综合分</SelectItem>
                <SelectItem value="expectedRevenue">预期收益</SelectItem>
                <SelectItem value="commissionRate">佣金率</SelectItem>
                <SelectItem value="price">价格</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Product list — grouped by direction */}
        <section id="product-list" className="mb-6 space-y-6 scroll-mt-20">
          {loading ? (
            <ProductGridSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <Card className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              暂无符合条件的数据，试试调整筛选或点击「AI 选品」生成
            </Card>
          ) : directionFilter === "all" ? (
            // Grouped view (when no direction filter)
            <>
              {enabledDirections
                .filter((d) => (groupedByDirection.groups.get(d.id)?.length ?? 0) > 0)
                .map((d) => {
                  const items = groupedByDirection.groups.get(d.id) ?? [];
                  const filteredItems = items.filter(
                    (p) =>
                      (platformFilter === "all" || p.platform === platformFilter) &&
                      (virtualFilter === "all" ||
                        (virtualFilter === "virtual" ? p.isVirtual : !p.isVirtual)) &&
                      (search.trim() === "" ||
                        p.title.toLowerCase().includes(search.trim().toLowerCase()) ||
                        p.aiTags.some((t) =>
                          t.toLowerCase().includes(search.trim().toLowerCase()),
                        )),
                  );
                  const sorted = sortItems(filteredItems, sortKey);
                  if (sorted.length === 0) return null;
                  return (
                    <DirectionGroup
                      key={d.id}
                      direction={d}
                      products={sorted}
                      cmpForProduct={cmpForProduct}
                      onSelect={setDetail}
                    />
                  );
                })}
              {groupedByDirection.other.length > 0 && (
                <DirectionGroup
                  direction={{
                    id: "other",
                    name: "其他",
                    color: "#94a3b8",
                    icon: "📦",
                    keywords: [],
                    enabled: true,
                  }}
                  products={sortItems(
                    groupedByDirection.other.filter(
                      (p) =>
                        (platformFilter === "all" || p.platform === platformFilter) &&
                        (virtualFilter === "all" ||
                          (virtualFilter === "virtual" ? p.isVirtual : !p.isVirtual)),
                    ),
                    sortKey,
                  )}
                  cmpForProduct={cmpForProduct}
                  onSelect={setDetail}
                />
              )}
            </>
          ) : (
            // Flat grid when a direction is selected
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p, i) => (
                <TrendingProductCard
                  key={`${p.platform}-${p.id}`}
                  product={p}
                  rank={i}
                  comparison={cmpForProduct(p)}
                  directionColor={
                    enabledDirections.find((d) => d.id === p.directionId)?.color
                  }
                  onSelect={setDetail}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-medium text-foreground">Amazon Skills 选品中心</span>
            <span>· 数据源：Amazon / 淘宝客 / 京东 / Google</span>
          </div>
          <div className="flex items-center gap-3">
            <span>AI：z-ai-web-dev-sdk</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">并发限制自动重试 (3s × 10)</span>
          </div>
        </div>
      </footer>

      <ProductDetailDialog product={detail} onOpenChange={(o) => !o && setDetail(null)} />
      <CustomizationPanel
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={config}
        onSave={handleSaveConfig}
        onReset={handleResetConfig}
      />
      <CredentialsPanel open={credentialsOpen} onOpenChange={setCredentialsOpen} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  onClick,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "emerald" | "amber" | "cyan" | "rose";
  onClick?: () => void;
  hint?: string;
}) {
  const toneMap = {
    emerald: "from-emerald-500 to-green-600",
    amber: "from-amber-500 to-orange-600",
    cyan: "from-cyan-500 to-blue-600",
    rose: "from-rose-500 to-pink-600",
  }[tone];
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-4 transition-all",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-white opacity-90",
          toneMap,
        )}
      >
        {icon}
      </div>
      <div className="relative">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</div>
        {hint && (
          <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
            <MousePointerClick className="h-2.5 w-2.5" />
            {hint}
          </div>
        )}
      </div>
    </Card>
  );
}

function DirectionChip({
  direction,
  count,
  active,
  onClick,
}: {
  direction: Direction;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all",
        active ? "text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
      style={active ? { backgroundColor: direction.color } : undefined}
    >
      <span>{direction.icon}</span>
      <span>{direction.name}</span>
      <span
        className={cn(
          "ml-0.5 rounded-full px-1 text-[10px]",
          active ? "bg-white/25" : "bg-background",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function DirectionGroup({
  direction,
  products,
  cmpForProduct,
  onSelect,
}: {
  direction: Direction;
  products: PickedProduct[];
  cmpForProduct: (p: PickedProduct) => ProductComparison | undefined;
  onSelect: (p: PickedProduct) => void;
}) {
  const avgScore = products.length
    ? (products.reduce((s, p) => s + p.score, 0) / products.length).toFixed(1)
    : "0";
  const totalRevenue = products.reduce((s, p) => s + p.expectedRevenue, 0).toFixed(0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
          style={{ backgroundColor: `${direction.color}20`, color: direction.color }}
        >
          {direction.icon}
        </div>
        <h3 className="text-sm font-bold text-foreground">{direction.name}</h3>
        <Badge variant="secondary" className="text-[10px]">
          {products.length} 件
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          均分 {avgScore} · 预期 ¥{totalRevenue}
        </span>
        {direction.keywords.length > 0 && (
          <div className="ml-2 hidden flex-wrap gap-1 sm:flex">
            {direction.keywords.slice(0, 3).map((k, i) => (
              <Badge key={i} variant="outline" className="text-[9px] font-normal">
                {k}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {products.map((p, i) => (
          <TrendingProductCard
            key={`${p.platform}-${p.id}`}
            product={p}
            rank={i}
            comparison={cmpForProduct(p)}
            directionColor={direction.color}
            onSelect={onSelect}
          />
        ))}
      </div>
    </motion.div>
  );
}

function sortItems(items: PickedProduct[], key: SortKey): PickedProduct[] {
  return [...items].sort((a, b) => {
    switch (key) {
      case "expectedRevenue":
        return b.expectedRevenue - a.expectedRevenue;
      case "commissionRate":
        return b.commissionRate - a.commissionRate;
      case "price":
        return b.price - a.price;
      default:
        return b.score - a.score;
    }
  });
}

function normalize(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "")
    .slice(0, 60);
}

function FilterToggleBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function TrendSparkline({ trend }: { trend: TrendData }) {
  const data = trend.points.map((p) => ({
    date: p.date.slice(5),
    total: p.total,
    avgScore: p.avgScore,
    revenue: p.totalExpectedRevenue,
    virtualRatio: p.virtualRatio,
  }));
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <Card className="p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <LineChartIcon className="h-3 w-3" />
            7 日选品量
          </span>
          <span className="text-xs font-bold text-foreground">
            {trend.latest?.total ?? 0}
          </span>
        </div>
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip
                contentStyle={{
                  borderRadius: 6,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                  padding: "4px 8px",
                }}
                labelStyle={{ fontSize: 10 }}
                formatter={(v: number) => [`${v} 件`, "选品量"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gTotal)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 text-amber-500" />
            7 日平均分
          </span>
          <span className="text-xs font-bold text-foreground">
            {trend.latest?.avgScore?.toFixed(1) ?? "0"}
          </span>
        </div>
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                contentStyle={{
                  borderRadius: 6,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                  padding: "4px 8px",
                }}
                labelStyle={{ fontSize: 10 }}
                formatter={(v: number) => [v.toFixed(1), "平均分"]}
              />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#gScore)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Cloud className="h-3 w-3 text-teal-500" />
            虚拟商品占比
          </span>
          <span className="text-xs font-bold text-foreground">
            {trend.latest?.virtualRatio ?? 0}%
          </span>
        </div>
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="gVirtual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  borderRadius: 6,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                  padding: "4px 8px",
                }}
                labelStyle={{ fontSize: 10 }}
                formatter={(v: number) => [`${v}%`, "虚拟占比"]}
              />
              <Area
                type="monotone"
                dataKey="virtualRatio"
                stroke="#0d9488"
                strokeWidth={2}
                fill="url(#gVirtual)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}

function CompareResult({
  data,
  onSelect,
}: {
  data: TrendCompareData;
  onSelect: (p: PickedProduct) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Overview deltas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DeltaCard label="商品总数" from={data.fromTotal} to={data.toTotal} delta={data.totalDelta} unit="件" />
        <DeltaCard label="平均评分" from={data.fromAvgScore} to={data.toAvgScore} delta={data.avgScoreDelta} digits={1} />
        <DeltaCard label="预期收益" from={data.fromRevenue} to={data.toRevenue} delta={data.revenueDelta} prefix="¥" />
        <DeltaCard label="虚拟占比" from={data.fromVirtualRatio} to={data.toVirtualRatio} delta={data.virtualRatioDelta} suffix="%" digits={1} />
      </div>

      {/* Platform deltas */}
      <div>
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">平台变化</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium">平台</th>
                <th className="py-1.5 pr-3 font-medium">{data.from}</th>
                <th className="py-1.5 pr-3 font-medium">{data.to}</th>
                <th className="py-1.5 font-medium">变化</th>
              </tr>
            </thead>
            <tbody>
              {data.platforms.map((p) => (
                <tr key={p.platform} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 font-medium">{p.label}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{p.fromCount}件 / {p.fromAvgScore.toFixed(1)}分</td>
                  <td className="py-1.5 pr-3">{p.toCount}件 / {p.toAvgScore.toFixed(1)}分</td>
                  <td className="py-1.5">
                    <DeltaBadge value={p.countDelta} suffix="件" />
                    <DeltaBadge value={p.scoreDelta} prefix="分" className="ml-1" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category shifts */}
      {data.categoryShifts.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">类目迁移（按变化幅度排序）</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.categoryShifts.map((c) => {
              const tone = {
                up: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                new: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
                down: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
                gone: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                same: "bg-muted text-muted-foreground",
              }[c.trend];
              const label = { up: "↑", new: "NEW", down: "↓", gone: "消失", same: "=" }[c.trend];
              return (
                <span key={c.category} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>
                  {c.category} {c.fromCount}→{c.toCount} {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* New products */}
      {data.newProducts.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
            新增商品（{data.newProducts.length}）
          </h4>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {data.newProducts.slice(0, 6).map((p) => (
              <TrendingProductCard key={`${p.platform}-${p.id}`} product={p} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}

      {/* Lost products */}
      {data.lostProductTitles.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <TrendingDown className="h-3 w-3 text-rose-500" />
            消失商品（{data.lostProductTitles.length}）
          </h4>
          <div className="flex flex-wrap gap-1">
            {data.lostProductTitles.map((t, i) => (
              <span key={i} className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-600 line-clamp-1 dark:bg-rose-950/30">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaCard({
  label,
  from,
  to,
  delta,
  unit,
  prefix,
  suffix,
  digits,
}: {
  label: string;
  from: number;
  to: number;
  delta: number;
  unit?: string;
  prefix?: string;
  suffix?: string;
  digits?: number;
}) {
  const fmt = (n: number) => {
    const v = digits ? n.toFixed(digits) : Math.round(n).toLocaleString();
    return `${prefix ?? ""}${v}${suffix ?? ""}${unit ?? ""}`;
  };
  const isUp = delta > 0;
  const isDown = delta < 0;
  const deltaStr = `${prefix ?? ""}${digits ? delta.toFixed(digits) : delta}${suffix ?? ""}${unit ?? ""}`;
  return (
    <Card className="p-3">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-base font-bold">{fmt(to)}</span>
        {delta !== 0 && (
          <span className={cn("text-[10px] font-bold", isUp ? "text-emerald-600" : "text-rose-500")}>
            {isUp ? "↑" : "↓"} {isUp ? "+" : ""}{deltaStr}
          </span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">从 {fmt(from)}</div>
    </Card>
  );
}

function DeltaBadge({
  value,
  prefix,
  suffix,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  if (value === 0) return null;
  const isUp = value > 0;
  return (
    <span
      className={cn(
        "rounded px-1 text-[10px] font-bold",
        isUp ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
        className,
      )}
    >
      {isUp ? "+" : ""}{prefix ?? ""}{value}{suffix ?? ""}
    </span>
  );
}

function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex gap-3 p-3">
          <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="mt-auto flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-1 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
