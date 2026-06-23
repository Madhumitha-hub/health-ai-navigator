import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";

export const Route = createFileRoute("/api/ml/feature-importance/$disease")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const qs = url.searchParams.toString();
        const path = `/feature-importance/${params.disease}${qs ? `?${qs}` : ""}`;
        return proxyMlRequest(path, { method: "GET" });
      },
    },
  },
});
