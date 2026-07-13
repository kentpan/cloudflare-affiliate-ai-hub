// Client-side data fetching helpers for the affiliate dashboard.

import type {
  DataIndex,
  DailySummary,
  DimensionFile,
  DimensionName,
  Platform,
  PickedProduct,
  GenerationLogEntry,
} from "@/lib/affiliate/types";
import { withBase } from "@/lib/base";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getIndex = () => fetchJson<DataIndex>(withBase("/api/data/index"));
export const getDates = () =>
  fetchJson<{ dates: string[] }>(withBase("/api/data/dates"));
export const getSummary = (date: string) =>
  fetchJson<DailySummary>(withBase(`/api/data/summary?date=${date}`));
export const getDimension = (date: string, name: DimensionName) =>
  fetchJson<DimensionFile>(
    withBase(`/api/data/dimension?date=${date}&name=${name}`),
  );
export const getPlatform = (date: string, platform: Platform) =>
  fetchJson<{ date: string; platform: Platform; items: PickedProduct[] }>(
    withBase(`/api/data/platform?date=${date}&platform=${platform}`),
  );
export const getLogs = () =>
  fetchJson<{ logs: GenerationLogEntry[] }>(withBase("/api/logs"));

export interface GenerateResponse {
  ok: boolean;
  date?: string;
  total?: number;
  durationMs?: number;
  llmUsed?: boolean;
  error?: string;
  seeded?: boolean;
  dates?: string[];
}

export async function generate(opts: {
  date?: string;
  useLlm?: boolean;
  action?: "seed";
}): Promise<GenerateResponse> {
  const params = new URLSearchParams();
  if (opts.date) params.set("date", opts.date);
  if (opts.useLlm !== undefined) params.set("useLlm", String(opts.useLlm));
  if (opts.action) params.set("action", opts.action);
  const res = await fetch(withBase(`/api/generate?${params.toString()}`), {
    method: "POST",
  });
  return (await res.json()) as GenerateResponse;
}
