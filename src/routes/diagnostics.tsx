import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Activity, Copy } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PREDICT_API_BASE } from "@/lib/predict-api";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({ meta: [{ title: "ML API Diagnostics — HealthPredict" }] }),
  component: DiagnosticsPage,
});

type CheckStatus = "idle" | "running" | "ok" | "fail";

type CheckResult = {
  status: CheckStatus;
  latencyMs?: number;
  detail?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
};

type Checks = {
  reachability: CheckResult;
  health: CheckResult;
  preflight: CheckResult;
  predict: CheckResult;
};

const empty: CheckResult = { status: "idle" };
const initial: Checks = {
  reachability: empty,
  health: empty,
  preflight: empty,
  predict: empty,
};

// Minimal valid diabetes payload (values are illustrative — the goal is to
// exercise the end-to-end POST round-trip, not produce a clinical reading).
const SAMPLE_DIABETES = {
  pregnancies: 1,
  glucose: 120,
  bloodPressure: 70,
  skinThickness: 20,
  insulin: 80,
  bmi: 25,
  pedigree: 0.5,
  age: 30,
};

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => { out[k] = v; });
  return out;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - t) };
}

function DiagnosticsPage() {
  const [checks, setChecks] = useState<Checks>(initial);
  const [running, setRunning] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "(ssr)";

  async function runAll() {
    setRunning(true);
    setChecks(initial);

    // 1. reachability — GET /
    setChecks((c) => ({ ...c, reachability: { status: "running" } }));
    try {
      const { value: res, ms } = await timed(() => fetch(`${PREDICT_API_BASE}/`));
      setChecks((c) => ({
        ...c,
        reachability: {
          status: res.ok ? "ok" : "fail",
          latencyMs: ms,
          detail: `HTTP ${res.status}`,
          responseHeaders: headersToObject(res.headers),
        },
      }));
    } catch (e) {
      setChecks((c) => ({
        ...c,
        reachability: { status: "fail", detail: (e as Error).message },
      }));
    }

    // 2. /health
    setChecks((c) => ({ ...c, health: { status: "running" } }));
    try {
      const { value: res, ms } = await timed(() => fetch(`${PREDICT_API_BASE}/health`));
      const body = await res.text();
      setChecks((c) => ({
        ...c,
        health: {
          status: res.ok ? "ok" : "fail",
          latencyMs: ms,
          detail: `HTTP ${res.status}`,
          responseHeaders: headersToObject(res.headers),
          responseBody: body.slice(0, 500),
        },
      }));
    } catch (e) {
      setChecks((c) => ({
        ...c,
        health: { status: "fail", detail: (e as Error).message },
      }));
    }

    // 3. CORS preflight (manual OPTIONS)
    setChecks((c) => ({ ...c, preflight: { status: "running" } }));
    try {
      const { value: res, ms } = await timed(() =>
        fetch(`${PREDICT_API_BASE}/predict/diabetes`, {
          method: "OPTIONS",
          headers: {
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
            Origin: origin,
          },
        }),
      );
      const headers = headersToObject(res.headers);
      const allowOrigin = headers["access-control-allow-origin"];
      const allowMethods = headers["access-control-allow-methods"];
      const corsOk = !!allowOrigin && (allowOrigin === "*" || allowOrigin === origin);
      setChecks((c) => ({
        ...c,
        preflight: {
          status: res.ok && corsOk ? "ok" : "fail",
          latencyMs: ms,
          detail: `HTTP ${res.status} · allow-origin: ${allowOrigin ?? "(missing)"} · allow-methods: ${allowMethods ?? "(missing)"}`,
          responseHeaders: headers,
        },
      }));
    } catch (e) {
      setChecks((c) => ({
        ...c,
        preflight: { status: "fail", detail: (e as Error).message },
      }));
    }

    // 4. POST /predict/diabetes
    setChecks((c) => ({ ...c, predict: { status: "running" } }));
    try {
      const { value: res, ms } = await timed(() =>
        fetch(`${PREDICT_API_BASE}/predict/diabetes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ features: SAMPLE_DIABETES }),
        }),
      );
      const body = await res.text();
      setChecks((c) => ({
        ...c,
        predict: {
          status: res.ok ? "ok" : "fail",
          latencyMs: ms,
          detail: `HTTP ${res.status}`,
          responseHeaders: headersToObject(res.headers),
          responseBody: body.slice(0, 500),
        },
      }));
    } catch (e) {
      setChecks((c) => ({
        ...c,
        predict: { status: "fail", detail: (e as Error).message },
      }));
    }

    setRunning(false);
  }

  function copyReport() {
    const lines: string[] = [
      "# HealthPredict ML diagnostics",
      "",
      `- VITE_ML_API_URL: \`${PREDICT_API_BASE}\``,
      `- Browser origin: \`${origin}\``,
      `- User agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "(n/a)"}`,
      `- Captured: ${new Date().toISOString()}`,
      "",
    ];
    (Object.entries(checks) as [keyof Checks, CheckResult][]).forEach(([name, r]) => {
      lines.push(`## ${name}`);
      lines.push(`- status: ${r.status}`);
      if (r.latencyMs != null) lines.push(`- latency: ${r.latencyMs}ms`);
      if (r.detail) lines.push(`- detail: ${r.detail}`);
      if (r.responseBody) lines.push(`- body: \`${r.responseBody}\``);
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Diagnostics report copied to clipboard");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="ML API Diagnostics"
        description="Verify connectivity, CORS preflight, and a live prediction round-trip against the configured ML backend."
        icon={Activity}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyReport} disabled={running}>
              <Copy className="mr-2 h-4 w-4" /> Copy report
            </Button>
            <Button onClick={runAll} disabled={running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run checks
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div><span className="text-muted-foreground">VITE_ML_API_URL:</span> <code className="font-mono">{PREDICT_API_BASE}</code></div>
          <div><span className="text-muted-foreground">Browser origin:</span> <code className="font-mono">{origin}</code></div>
        </CardContent>
      </Card>

      <CheckCard
        title="1. Reachability"
        description={`GET ${PREDICT_API_BASE}/ — confirms DNS, TLS and that the host is up.`}
        result={checks.reachability}
      />
      <CheckCard
        title="2. /health endpoint"
        description={`GET ${PREDICT_API_BASE}/health — should return {"status":"online"}.`}
        result={checks.health}
      />
      <CheckCard
        title="3. CORS preflight"
        description="OPTIONS /predict/diabetes — verifies Access-Control-Allow-Origin / -Methods / -Headers."
        result={checks.preflight}
      />
      <CheckCard
        title="4. Live prediction round-trip"
        description="POST /predict/diabetes with a sample payload — exercises the full path."
        result={checks.predict}
      />
    </div>
  );
}

function CheckCard({
  title, description, result,
}: { title: string; description: string; result: CheckResult }) {
  const Icon =
    result.status === "ok" ? CheckCircle2 :
    result.status === "fail" ? XCircle :
    result.status === "running" ? Loader2 : Activity;
  const tone =
    result.status === "ok" ? "text-success" :
    result.status === "fail" ? "text-destructive" :
    "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${tone} ${result.status === "running" ? "animate-spin" : ""}`} />
            {title}
          </span>
          {result.latencyMs != null && (
            <Badge variant="outline" className="text-xs">{result.latencyMs}ms</Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {result.detail && <div className="font-mono text-xs">{result.detail}</div>}
        {result.responseHeaders && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Response headers</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono">
              {Object.entries(result.responseHeaders).map(([k, v]) => `${k}: ${v}`).join("\n")}
            </pre>
          </details>
        )}
        {result.responseBody && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Response body</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono">{result.responseBody}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
