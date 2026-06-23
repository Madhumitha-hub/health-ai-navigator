import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";

export const Route = createFileRoute("/api/ml/eda/$disease")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      GET: async ({ params }) => proxyMlRequest(`/eda/${params.disease}`),
    },
  },
});
