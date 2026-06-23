import { createFileRoute } from "@tanstack/react-router";
import { mlOptionsResponse, proxyMlRequest } from "@/lib/ml-proxy";
import { requireRoleInRoute } from "@/lib/route-auth";

export const Route = createFileRoute("/api/ml/clinical-support")({
  server: {
    handlers: {
      OPTIONS: async () => mlOptionsResponse(),
      POST: async ({ request }) => {
        const denied = await requireRoleInRoute(request, ["admin", "doctor"]);
        if (denied) return denied;
        const body = await request.text();
        return proxyMlRequest("/clinical-support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      },
    },
  },
});
