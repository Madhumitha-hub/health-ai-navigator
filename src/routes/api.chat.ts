import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT = `You are HealthPredict's clinical AI assistant — an educational helper for doctors and patients exploring disease-risk predictions in this app.

Hard rules:
- Never tell anyone they have a disease. Always say things like "This is an estimated risk based on a machine-learning model — please consult a qualified medical professional for diagnosis and treatment."
- Be concise (under ~200 words unless asked for detail). Use short paragraphs or bullet points.
- Ground answers in the project context provided. If the context does not contain what's being asked, say you don't have that information rather than guessing patient specifics.
- For lab terms (bilirubin, creatinine, HbA1c, etc.), give a short plain-language explanation and typical reference ranges, then remind the user that interpretation depends on the full clinical picture.
- Refuse anything outside health/clinical-prediction help with a brief redirect.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: { messages?: ChatMessage[]; context?: string } = {};
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const context = typeof body.context === "string" ? body.context.slice(0, 4000) : "";

        const systemContent = context
          ? `${SYSTEM_PROMPT}\n\n--- PROJECT CONTEXT ---\n${context}\n--- END CONTEXT ---`
          : SYSTEM_PROMPT;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: systemContent }, ...messages],
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (res.status === 429) return Response.json({ error: "Rate limit exceeded. Please try again shortly." }, { status: 429 });
          if (res.status === 402) return Response.json({ error: "AI credits exhausted. Please add credits in your workspace settings." }, { status: 402 });
          return Response.json({ error: text || `AI gateway error (${res.status})` }, { status: res.status });
        }

        const data: any = await res.json();
        const reply: string = data?.choices?.[0]?.message?.content ?? "";
        return Response.json({ reply });
      },
    },
  },
});
