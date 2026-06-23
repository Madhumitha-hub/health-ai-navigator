const DEFAULT_ML_API_URL = "https://health-ai-navigator.onrender.com";

export function getMlApiBaseUrl() {
  return (process.env.VITE_ML_API_URL || DEFAULT_ML_API_URL).replace(/\/$/, "");
}

export async function proxyMlRequest(path: string, init?: RequestInit) {
  const upstream = `${getMlApiBaseUrl()}${path}`;
  const upstreamResponse = await fetch(upstream, init);
  const headers = new Headers(upstreamResponse.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
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