/**
 * AI Medical Chat Assistant — server route.
 *
 * Proxies chat completion requests to the Lovable AI Gateway using the
 * server-only LOVABLE_API_KEY. The system prompt enforces strict medical
 * safety rules (no diagnosis, always recommend a clinician).
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireAuthInRoute } from "@/lib/route-auth";

type ClientMessage = { role: "user" | "assistant"; content: string };
type RequestBody = { messages?: ClientMessage[]; context?: Record<string, unknown> };

const SYSTEM_PROMPT = `You are HealthPredict's AI Medical Assistant, embedded in a clinical decision-support tool.

STRICT RULES — never violate:
1. Never tell a user they "have" a disease. Always say "this is an estimated risk" and recommend consulting a licensed medical professional.
2. Do not prescribe medication, dosages, or treatments. Suggest categories ("lifestyle changes", "lab tests to discuss with your doctor") instead.
3. If asked about emergencies (chest pain, stroke symptoms, suicidal ideation), tell the user to call local emergency services immediately.
4. Stay focused on the four supported diseases (diabetes, heart, kidney, liver), general clinical literacy (what lab values mean), and the project's risk-prediction outputs. Politely decline unrelated topics.
5. Keep answers concise (under ~180 words). Use short paragraphs or bullet points. Markdown is supported.
6. When a "context" object is provided, ground your answer in those values. If the context disagrees with the user, trust the context.
7. End every disease-risk explanation with: "This is an estimated risk based on a model, not a diagnosis. Please consult a medical professional."`;

export const Route = createFileRoute("/api/ai-assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await requireAuthInRoute(request);
        if (unauthorized) return unauthorized;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI assistant is not configured." }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        let body: RequestBody;
        try { body = (await request.json()) as RequestBody; }
        catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const cleanMessages = messages.slice(-20).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content ?? "").slice(0, 4000),
        }));

        const contextLine = body.context && Object.keys(body.context).length > 0
          ? `\n\nCURRENT CONTEXT (JSON):\n${JSON.stringify(body.context).slice(0, 2000)}`
          : "";

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEM_PROMPT + contextLine },
                ...cleanMessages,
              ],
              temperature: 0.4,
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text().catch(() => "");
            if (upstream.status === 429) {
              return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }), {
                status: 429, headers: { "Content-Type": "application/json" },
              });
            }
            if (upstream.status === 402) {
              return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact your administrator." }), {
                status: 402, headers: { "Content-Type": "application/json" },
              });
            }
            return new Response(JSON.stringify({ error: `AI gateway error (${upstream.status})`, detail: text.slice(0, 300) }), {
              status: 502, headers: { "Content-Type": "application/json" },
            });
          }

          const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
          const content = data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response.";

          return new Response(JSON.stringify({ message: content }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
