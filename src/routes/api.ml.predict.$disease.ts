import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";

export const Route = createFileRoute("/api/ml/predict/$disease")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request, params }) => {
        const body = await request.text();
        return proxyMlRequest(`/predict/${params.disease}`, {
          method: "POST",
          headers: { "Content-Type": request.headers.get("Content-Type") || "application/json" },
          body,
        });
      },
    },
  },
});