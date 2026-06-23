import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlPredictionRequest } from "@/lib/ml-proxy";
import { requireAuthInRoute } from "@/lib/route-auth";

export const Route = createFileRoute("/api/ml/predict/$disease")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request, params }) => {
        const unauthorized = await requireAuthInRoute(request);
        if (unauthorized) return unauthorized;
        return proxyMlPredictionRequest(params.disease, request);
      },
    },
  },
});
