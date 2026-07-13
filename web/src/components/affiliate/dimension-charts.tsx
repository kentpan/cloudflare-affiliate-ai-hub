"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  type DimensionFile,
  type Platform,
} from "@/lib/affiliate/types";

interface DimensionChartsProps {
  byPlatform?: DimensionFile | null;
  byCategory?: DimensionFile | null;
  byCommission?: DimensionFile | null;
  byPriceRange?: DimensionFile | null;
}

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#0d9488", "#06b6d4", "#ec4899", "#84cc16", "#3b82f6"];

export function DimensionCharts({
  byPlatform,
  byCategory,
  byCommission,
  byPriceRange,
}: DimensionChartsProps) {
  return (
    <Tabs defaultValue="platform" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
        <TabsTrigger value="platform">按平台</TabsTrigger>
        <TabsTrigger value="category">按类目</TabsTrigger>
        <TabsTrigger value="commission">按佣金</TabsTrigger>
        <TabsTrigger value="price">按价格</TabsTrigger>
      </TabsList>

      <TabsContent value="platform" className="mt-4">
        <ChartCard title="平台分布 · 商品数 & 预期收益">
          {byPlatform ? (
            <PlatformBar data={byPlatform.groups} />
          ) : (
            <Empty />
          )}
        </ChartCard>
      </TabsContent>

      <TabsContent value="category" className="mt-4">
        <ChartCard title="类目分布 · 预期收益 Top 10">
          {byCategory ? (
            <CategoryBar data={byCategory.groups.slice(0, 10)} />
          ) : (
            <Empty />
          )}
        </ChartCard>
      </TabsContent>

      <TabsContent value="commission" className="mt-4">
        <ChartCard title="佣金区间分布">
          {byCommission ? (
            <CommissionPie data={byCommission.groups} />
          ) : (
            <Empty />
          )}
        </ChartCard>
      </TabsContent>

      <TabsContent value="price" className="mt-4">
        <ChartCard title="价格区间分布">
          {byPriceRange ? (
            <PricePie data={byPriceRange.groups} />
          ) : (
            <Empty />
          )}
        </ChartCard>
      </TabsContent>
    </Tabs>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-72 w-full">{children}</div>
    </Card>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      暂无数据
    </div>
  );
}

function PlatformBar({
  data,
}: {
  data: DimensionFile["groups"];
}) {
  const chartData = data.map((g) => ({
    name: PLATFORM_LABELS[g.key as Platform] ?? g.key,
    count: g.count,
    revenue: g.expectedRevenue,
    avgScore: g.avgScore,
    color: PLATFORM_COLORS[g.key as Platform] ?? "#10b981",
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => {
            if (name === "count") return [`${value} 件`, "商品数"];
            if (name === "revenue") return [`¥${value}`, "预期收益"];
            return [value, name];
          }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} name="count">
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CategoryBar({
  data,
}: {
  data: DimensionFile["groups"];
}) {
  const chartData = data.map((g) => ({
    name: g.key,
    revenue: g.expectedRevenue,
    count: g.count,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={80}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) =>
            name === "revenue" ? [`¥${value}`, "预期收益"] : [value, name]
          }
        />
        <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="revenue">
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CommissionPie({
  data,
}: {
  data: DimensionFile["groups"];
}) {
  const order = ["0-5%", "5-10%", "10-20%", "20%+"];
  const sorted = [...data].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );
  const chartData = sorted.map((g) => ({
    name: g.key,
    value: g.count,
    revenue: g.expectedRevenue,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={45}
          label={(entry) => `${entry.name} (${entry.value})`}
          labelLine={false}
        >
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number, _name: string, entry: any) => [
            `${value} 件 · ¥${entry.payload.revenue}`,
            entry.payload.name,
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function PricePie({
  data,
}: {
  data: DimensionFile["groups"];
}) {
  const order = ["0-50", "50-200", "200-1000", "1000+"];
  const sorted = [...data].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );
  const chartData = sorted.map((g) => ({
    name: `¥${g.key}`,
    value: g.count,
    revenue: g.expectedRevenue,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={45}
          label={(entry) => `${entry.name} (${entry.value})`}
          labelLine={false}
        >
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number, _name: string, entry: any) => [
            `${value} 件 · ¥${entry.payload.revenue}`,
            entry.payload.name,
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
