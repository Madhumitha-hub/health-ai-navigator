import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";

export const Route = createFileRoute("/api/ml/metrics")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      GET: async () => proxyMlRequest("/metrics"),
    },
  },
});