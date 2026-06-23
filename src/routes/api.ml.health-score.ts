import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";
import { requireAuthInRoute } from "@/lib/route-auth";

export const Route = createFileRoute("/api/ml/health-score")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request }) => {
        const unauthorized = await requireAuthInRoute(request);
        if (unauthorized) return unauthorized;
        const body = await request.text();
        const upstream = await proxyMlRequest("/health-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (upstream.status !== 404) return upstream;
        try {
          const { probabilities } = JSON.parse(body) as { probabilities: Record<string, number> };
          const values = Object.values(probabilities ?? {});
          if (!values.length) return Response.json({ score: 0, band: "High Risk", components: {} });
          const mean = values.reduce((s, v) => s + v, 0) / values.length;
          const score = Math.round((1 - Math.max(0, Math.min(1, mean))) * 100);
          const band = score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Moderate" : "High Risk";
          const components = Object.fromEntries(Object.entries(probabilities).map(([k, v]) => [k, Math.round(v * 100)]));
          return Response.json({ score, band, components });
        } catch {
          return upstream;
        }
      },
    },
  },
});
