import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";
import { requireAuthInRoute } from "@/lib/route-auth";

export const Route = createFileRoute("/api/ml/predict/full-assessment")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request }) => {
        const unauthorized = await requireAuthInRoute(request);
        if (unauthorized) return unauthorized;
        const body = await request.text();
        return proxyMlRequest("/predict/full-assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      },
    },
  },
});
