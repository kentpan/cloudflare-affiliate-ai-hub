// LLM client wrapper around z-ai-web-dev-sdk.
//
// Key behaviour required by the task: when the model returns
// "model glm-5.2 concurrency limit exceeded" (or any error whose message
// contains "concurrency limit exceeded"), we wait 3s and retry, up to 10
// attempts. This matches the user's explicit instruction:
//   "每轮的定时任务启动时如果返回 'model glm-5.2 concurrency limit exceeded',
//    则隔3s进行重试, 重试10次"

import ZAI from "z-ai-web-dev-sdk";
import { config } from "./config";

let zaiSingleton: ZAI | null = null;

async function getZAI(): Promise<ZAI> {
  if (!config.llm.apiKey) {
    throw new Error("LLMAI_APIKEY not configured — falling back to heuristic");
  }
  if (!zaiSingleton) {
    zaiSingleton = await ZAI.create();
  }
  return zaiSingleton;
}

export interface ChatResult {
  content: string;
  attempts: number;
  retried: boolean;
}

function isConcurrencyLimitError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? {});
  return msg.toLowerCase().includes(config.llmRetry.triggerPhrase);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run a chat completion with automatic retry on concurrency-limit errors.
 * Returns the assistant text plus telemetry about retries.
 */
export async function chatWithRetry(
  system: string,
  user: string,
  opts?: { temperature?: number; json?: boolean },
): Promise<ChatResult> {
  const { maxAttempts, delayMs } = config.llmRetry;
  let lastError: unknown = null;
  let retried = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const zai = await getZAI();
      const messages: Array<{ role: "assistant" | "user"; content: string }> = [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ];

      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: "disabled" },
        // @ts-expect-error - temperature is accepted by the underlying API
        temperature: opts?.temperature ?? 0.6,
      });

      const content = completion.choices[0]?.message?.content ?? "";
      if (!content.trim()) {
        throw new Error("Empty response from LLM");
      }
      return { content, attempts: attempt, retried };
    } catch (err) {
      lastError = err;
      if (isConcurrencyLimitError(err) && attempt < maxAttempts) {
        retried = true;
        console.warn(
          `[llm] concurrency limit exceeded (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`,
        );
        await sleep(delayMs);
        continue;
      }
      // Non-retryable error or out of attempts
      throw err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("LLM call failed after retries");
}

/**
 * Run a chat completion that must return a JSON object.
 * Strips code fences and extracts the first JSON object/array.
 */
export async function chatJSON<T = unknown>(
  system: string,
  user: string,
  opts?: { temperature?: number },
): Promise<{ data: T; attempts: number; retried: boolean }> {
  const res = await chatWithRetry(system, user, {
    ...opts,
    json: true,
  });
  const cleaned = stripCodeFences(res.content).trim();
  const parsed = safeParseJSON<T>(cleaned);
  if (parsed === undefined) {
    throw new Error(`LLM did not return valid JSON. Got: ${cleaned.slice(0, 200)}`);
  }
  return { data: parsed, attempts: res.attempts, retried: res.retried };
}

function stripCodeFences(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function safeParseJSON<T>(s: string): T | undefined {
  try {
    return JSON.parse(s) as T;
  } catch {
    // try to extract the first {...} or [...] block
    const objMatch = s.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as T;
      } catch {
        /* ignore */
      }
    }
    const arrMatch = s.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[0]) as T;
      } catch {
        /* ignore */
      }
    }
    return undefined;
  }
}
