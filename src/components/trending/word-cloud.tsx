"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { WordFreq } from "@/lib/affiliate/types";

interface WordCloudProps {
  words: WordFreq[];
  onSelect?: (word: string) => void;
}

const PALETTE = [
  "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#0d9488",
  "#06b6d4", "#84cc16", "#f97316", "#ef4444", "#14b8a6",
];

export function WordCloud({ words, onSelect }: WordCloudProps) {
  const processed = useMemo(() => {
    if (words.length === 0) return [];
    const max = words[0].value;
    const min = words[words.length - 1].value;
    const range = max - min || 1;
    return words.map((w, i) => ({
      ...w,
      sizeClass: getSizeClass((w.value - min) / range),
      color: PALETTE[i % PALETTE.length],
    }));
  }, [words]);

  if (processed.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        暂无标签数据
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 py-2">
      {processed.map((w, i) => (
        <motion.button
          key={w.text}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02, duration: 0.2 }}
          onClick={() => onSelect?.(w.text)}
          className={`rounded-full px-2.5 py-1 font-semibold transition-all hover:scale-110 hover:shadow-md ${w.sizeClass}`}
          style={{
            color: w.color,
            backgroundColor: `${w.color}15`,
            border: `1px solid ${w.color}30`,
          }}
          title={`${w.text}: ${w.value}次 · 均分${w.avgScore}${w.virtualCount ? ` · 虚拟${w.virtualCount}` : ""}`}
        >
          {w.text}
          <span className="ml-0.5 text-[10px] opacity-60">{w.value}</span>
        </motion.button>
      ))}
    </div>
  );
}

function getSizeClass(ratio: number): string {
  // ratio 0..1 → text size
  if (ratio > 0.8) return "text-lg";
  if (ratio > 0.6) return "text-base";
  if (ratio > 0.4) return "text-sm";
  if (ratio > 0.2) return "text-xs";
  return "text-[11px]";
}
