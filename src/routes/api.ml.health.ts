import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";
import { requireAuthInRoute } from "@/lib/route-auth";

export const Route = createFileRoute("/api/ml/health")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      GET: async ({ request }) => {
        const unauthorized = await requireAuthInRoute(request);
        if (unauthorized) return unauthorized;
        return proxyMlRequest("/health");
      },
    },
  },
});
