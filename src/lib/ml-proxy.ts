const DEFAULT_ML_API_URL = "https://health-ai-navigator.onrender.com";
const ML_UPSTREAM_TIMEOUT_MS = 20_000;

export function getMlApiBaseUrl() {
  return (process.env.VITE_ML_API_URL || DEFAULT_ML_API_URL).replace(/\/$/, "");
}

function corsHeaders(contentType = "application/json") {
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return headers;
}

export async function proxyMlRequest(path: string, init?: RequestInit) {
  const upstream = `${getMlApiBaseUrl()}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_UPSTREAM_TIMEOUT_MS);
  try {
    const upstreamResponse = await fetch(upstream, {
      ...init,
      signal: init?.signal ?? controller.signal,
    }).finally(() => clearTimeout(timeout));
    const body = await upstreamResponse.text();
    const headers = corsHeaders(
      upstreamResponse.headers.get("Content-Type") || "application/json",
    );
    return new Response(body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : "Upstream ML service unreachable";
    console.error(`[ml-proxy] ${path} failed:`, message);
    return new Response(
      JSON.stringify({
        status: "offline",
        error: "ML_SERVICE_UNAVAILABLE",
        message,
        fallback: true,
      }),
      { status: 503, headers: corsHeaders() },
    );
  }
}

export function mlOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}


export async function proxyMlPredictionRequest(disease: string, request: Request) {
  const body = await request.text();
  let response: Response;
  try {
    response = await proxyMlRequest(`/predict/${disease}`, {
      method: "POST",
      headers: { "Content-Type": request.headers.get("Content-Type") || "application/json" },
      body,
    });
  } catch {
    return Response.json(
      { detail: "ML prediction service is unavailable. Please try again in a moment." },
      { status: 503 },
    );
  }
  if (response.status >= 500) {
    return Response.json(
      { detail: "ML prediction service returned an error. Please try again in a moment." },
      { status: 503 },
    );
  }
  return response;
}