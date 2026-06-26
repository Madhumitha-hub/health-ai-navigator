import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { PREDICT_API_BASE } from "@/lib/predict-api";
import { authedFetch } from "@/lib/authed-fetch";

export type MlErrorCategory =
  | "timeout"
  | "network"
  | "http"
  | "bad-json"
  | "none";

export type MlHealth = {
  online: boolean;
  latencyMs: number | null;
  statusCode: number | null;
  uptimeS: number | null;
  modelsLoaded: number | null;
  lastSyncAt: Date | null;
  errorCategory: MlErrorCategory;
  errorMessage?: string;
  /** kept for backwards-compat with components that read `error` */
  error?: string;
};

// Exponential backoff schedule (ms) keyed by consecutive failure count
const BACKOFF_MS = [30_000, 60_000, 120_000, 300_000, 600_000];
const SUCCESS_INTERVAL_MS = 30_000;
const TIMEOUT_MS = 15_000;

async function fetchHealth(): Promise<MlHealth> {
  const start = performance.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await authedFetch(`${PREDICT_API_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        online: false,
        latencyMs,
        statusCode: res.status,
        uptimeS: null,
        modelsLoaded: null,
        lastSyncAt: new Date(),
        errorCategory: "http",
        errorMessage: `HTTP ${res.status}`,
        error: `HTTP ${res.status}`,
      };
    }
    let j: { status?: string; uptime_s?: number; models_loaded?: number };
    try {
      j = await res.json();
    } catch (e) {
      return {
        online: false,
        latencyMs,
        statusCode: res.status,
        uptimeS: null,
        modelsLoaded: null,
        lastSyncAt: new Date(),
        errorCategory: "bad-json",
        errorMessage: (e as Error).message,
        error: "Invalid JSON response",
      };
    }
    return {
      online: j.status === "online",
      latencyMs,
      statusCode: res.status,
      uptimeS: j.uptime_s ?? null,
      modelsLoaded: j.models_loaded ?? null,
      lastSyncAt: new Date(),
      errorCategory: "none",
    };
  } catch (e) {
    clearTimeout(t);
    const err = e as Error;
    const isTimeout = err.name === "AbortError";
    return {
      online: false,
      latencyMs: null,
      statusCode: null,
      uptimeS: null,
      modelsLoaded: null,
      lastSyncAt: new Date(),
      errorCategory: isTimeout ? "timeout" : "network",
      errorMessage: err.message,
      error: isTimeout ? "Request timed out" : err.message,
    };
  }
}

/** Polls /health with exponential backoff on failure. */
export function useMlHealth() {
  const qc = useQueryClient();
  const failuresRef = useRef(0);
  const nextRetryAtRef = useRef<Date | null>(null);

  const query = useQuery({
    queryKey: ["ml-health"],
    queryFn: async () => {
      const result = await fetchHealth();
      if (result.online) {
        failuresRef.current = 0;
      } else {
        failuresRef.current += 1;
      }
      const interval = result.online
        ? SUCCESS_INTERVAL_MS
        : BACKOFF_MS[Math.min(failuresRef.current - 1, BACKOFF_MS.length - 1)];
      nextRetryAtRef.current = new Date(Date.now() + interval);
      return result;
    },
    refetchInterval: () => {
      const fails = failuresRef.current;
      if (fails === 0) return SUCCESS_INTERVAL_MS;
      return BACKOFF_MS[Math.min(fails - 1, BACKOFF_MS.length - 1)];
    },
    refetchOnWindowFocus: true,
    staleTime: 25_000,
  });

  const retryNow = useCallback(() => {
    failuresRef.current = 0;
    nextRetryAtRef.current = null;
    qc.invalidateQueries({ queryKey: ["ml-health"] });
  }, [qc]);

  return {
    ...query,
    retryNow,
    consecutiveFailures: failuresRef.current,
    nextRetryAt: nextRetryAtRef.current,
  };
}
