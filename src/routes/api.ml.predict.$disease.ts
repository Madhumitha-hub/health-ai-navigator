import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlPredictionRequest } from "@/lib/ml-proxy";

export const Route = createFileRoute("/api/ml/predict/$disease")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request, params }) => proxyMlPredictionRequest(params.disease, request),
    },
  },
});