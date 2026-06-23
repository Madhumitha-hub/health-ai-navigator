import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";
import { requireAuthInRoute } from "@/lib/route-auth";

export const Route = createFileRoute("/api/ml/eda/$disease")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      GET: async ({ params, request }) => {
        const unauthorized = await requireAuthInRoute(request);
        if (unauthorized) return unauthorized;
        try {
          const response = await proxyMlRequest(`/eda/${params.disease}`);
          if (response.status >= 500) {
            return Response.json(
              { error: "EDA_SERVICE_UNAVAILABLE", fallback: true, disease: params.disease },
              { status: 200 },
            );
          }
          return response;
        } catch {
          return Response.json(
            { error: "EDA_SERVICE_FAILED", fallback: true, disease: params.disease },
            { status: 200 },
          );
        }
      },
    },
  },
});
