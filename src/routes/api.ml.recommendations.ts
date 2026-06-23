import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";
import { generateRecommendations } from "@/lib/recommendations";

export const Route = createFileRoute("/api/ml/recommendations")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request }) => {
        const body = await request.text();
        const upstream = await proxyMlRequest("/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (upstream.status !== 404 && upstream.status !== 503) return upstream;
        // Fallback when backend doesn't expose /recommendations yet.
        try {
          const payload = JSON.parse(body) as {
            disease?: "diabetes" | "heart" | "kidney" | "liver";
            risk_level?: "Low" | "Moderate" | "High";
            probability?: number;
            top_factors?: string[];
            age?: number;
          };
          if (!payload.disease || typeof payload.probability !== "number") return upstream;
          const risk = payload.risk_level === "High" ? "high" : payload.risk_level === "Moderate" ? "medium" : "low";
          const bundle = generateRecommendations({
            disease: payload.disease,
            result: {
              probability: payload.probability,
              risk,
              riskLabel: payload.risk_level ?? "Low",
              topFactors: (payload.top_factors ?? []).map((name) => ({ name, impact: 0 })),
            },
            patient: { age: payload.age ?? null, gender: null },
          });
          return Response.json(bundle);
        } catch {
          return upstream;
        }
      },
    },
  },
});
