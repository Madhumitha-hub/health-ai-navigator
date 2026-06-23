import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlPredictionRequest } from "@/lib/ml-proxy";
import { requireRoleInRoute } from "@/lib/route-auth";

export const Route = createFileRoute("/api/ml/predict/$disease")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request, params }) => {
        const denied = await requireRoleInRoute(request, ["admin", "doctor"]);
        if (denied) return denied;
        return proxyMlPredictionRequest(params.disease, request);
      },
    },
  },
});
