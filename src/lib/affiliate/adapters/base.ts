// Adapter interface — mirrors the plan's IAdapter contract.
// fetchTrending accepts the active selection keywords (from the
// customization config) so adapters can scope their product search.
import type { RawProduct } from "../types";

export interface AdapterFetchOptions {
  keywords?: string[]; // active keywords from customization config
}

export interface IAdapter {
  platform: string;
  fetchTrending(opts?: AdapterFetchOptions): Promise<RawProduct[]>;
}
