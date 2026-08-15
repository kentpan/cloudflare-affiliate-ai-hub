"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface SankeyNode {
  id: string;
  name: string;
  color?: string;
  type: "direction" | "platform";
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  revenue: number;
  avgScore: number;
}

interface SankeyData {
  date: string;
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalProducts: number;
  directionCount: number;
  platformCount: number;
}

interface SankeyDiagramProps {
  data: SankeyData;
}

// A lightweight custom Sankey-like visualization (no heavy dep).
// Renders two columns (directions on left, platforms on right) with
// proportional colored bars + SVG connection paths.
export function SankeyDiagram({ data }: SankeyDiagramProps) {
  const directionNodes = data.nodes.filter((n) => n.type === "direction");
  const platformNodes = data.nodes.filter((n) => n.type === "platform");

  const layout = useMemo(() => {
    const W = 600;
    const H = 280;
    const colW = 140;
    const gap = 8;

    // Compute totals
    const dirTotals = new Map<string, number>();
    const pltTotals = new Map<string, number>();
    for (const l of data.links) {
      dirTotals.set(l.source, (dirTotals.get(l.source) ?? 0) + l.value);
      pltTotals.set(l.target, (pltTotals.get(l.target) ?? 0) + l.value);
    }
    const dirGrand = [...dirTotals.values()].reduce((a, b) => a + b, 0) || 1;
    const pltGrand = [...pltTotals.values()].reduce((a, b) => a + b, 0) || 1;

    // Direction node positions (left column) — use reduce to accumulate y
    const dirReduce = directionNodes.reduce<{ rects: any[]; y: number }>(
      (acc, n) => {
        const val = dirTotals.get(n.id) ?? 0;
        const h = Math.max(8, (val / dirGrand) * (H - gap * (directionNodes.length - 1)));
        acc.rects.push({ ...n, y: acc.y, h, value: val });
        acc.y += h + gap;
        return acc;
      },
      { rects: [], y: 0 },
    );

    // Platform node positions (right column)
    const pltReduce = platformNodes.reduce<{ rects: any[]; y: number }>(
      (acc, n) => {
        const val = pltTotals.get(n.id) ?? 0;
        const h = Math.max(8, (val / pltGrand) * (H - gap * (platformNodes.length - 1)));
        acc.rects.push({ ...n, y: acc.y, h, value: val });
        acc.y += h + gap;
        return acc;
      },
      { rects: [], y: 0 },
    );

    return { W, H, colW, dirRects: dirReduce.rects, pltRects: pltReduce.rects, dirGrand, pltGrand };
  }, [data, directionNodes, platformNodes]);

  // Build connection paths
  const paths = useMemo(() => {
    const { colW, dirRects, pltRects } = layout;
    const dirOffset = new Map<string, number>();
    const pltOffset = new Map<string, number>();
    return data.links.map((l) => {
      const dir = dirRects.find((d) => d.id === l.source);
      const plt = pltRects.find((p) => p.id === l.target);
      if (!dir || !plt) return null;
      const dy = dirOffset.get(l.source) ?? 0;
      const py = pltOffset.get(l.target) ?? 0;
      const h = Math.max(2, (l.value / layout.dirGrand) * dir.h);
      dirOffset.set(l.source, dy + h);
      pltOffset.set(l.target, py + h);

      const x1 = colW;
      const y1 = dir.y + dy;
      const x2 = colW * 2 + 60;
      const y2 = plt.y + py;
      const cx = (x1 + x2) / 2;
      // Bezier path
      const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
      return { d, color: dir.color, value: l.value, revenue: l.revenue, avgScore: l.avgScore, name: `${dir.name} → ${plt.name}`, h };
    }).filter(Boolean);
  }, [data.links, layout]);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 340 ${layout.H}`} width="100%" height={layout.H} style={{ minWidth: 340 }}>
        <defs>
          {paths.map((p, i) => (
            <linearGradient key={i} id={`flow-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={p!.color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={p!.color} stopOpacity={0.15} />
            </linearGradient>
          ))}
        </defs>

        {/* Direction nodes (left) */}
        {layout.dirRects.map((n) => (
          <g key={n.id}>
            <rect
              x={0}
              y={n.y}
              width={12}
              height={n.h}
              fill={n.color}
              rx={3}
            />
            <text
              x={16}
              y={n.y + n.h / 2 + 4}
              fontSize={10}
              fill="currentColor"
              className="fill-foreground"
            >
              {n.name.length > 8 ? n.name.slice(0, 8) + "…" : n.name} ({n.value})
            </text>
          </g>
        ))}

        {/* Platform nodes (right) */}
        {layout.pltRects.map((n) => (
          <g key={n.id}>
            <rect
              x={layout.colW * 2 + 60}
              y={n.y}
              width={12}
              height={n.h}
              fill={n.color}
              rx={3}
            />
            <text
              x={layout.colW * 2 + 56}
              y={n.y + n.h / 2 + 4}
              fontSize={10}
              textAnchor="end"
              fill="currentColor"
              className="fill-foreground"
            >
              {n.name} ({n.value})
            </text>
          </g>
        ))}

        {/* Connection paths */}
        {paths.map((p, i) => (
          <path
            key={i}
            d={p!.d}
            fill="none"
            stroke={`url(#flow-${i})`}
            strokeWidth={Math.max(3, p!.h)}
            strokeLinecap="round"
          >
            <title>{`${p!.name}: ${p!.value}件 · ≈${p!.revenue} (多币种合计) · 均分${p!.avgScore}`}</title>
          </path>
        ))}
      </svg>
    </div>
  );
}
