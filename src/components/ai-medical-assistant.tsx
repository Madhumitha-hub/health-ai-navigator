/**
 * Floating AI Medical Assistant.
 *
 * Renders a circular button in the bottom-right corner on whitelisted
 * routes (dashboard, predictions, patient profile). Opening it reveals
 * a compact chat panel that calls /api/ai-assistant.
 *
 * The assistant follows strict medical safety rules — see the system
 * prompt in src/routes/api.ai-assistant.ts.
 */
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

type Msg = { role: "user" | "assistant"; content: string };

/** Routes that show the floating assistant. Patient profile is `/patients/:id`. */
const ALLOWED_PREFIXES = ["/dashboard", "/predict", "/predict-full", "/patients/"];

function isAllowedRoute(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

const SUGGESTIONS: string[] = [
  "Why might this patient be high risk?",
  "What lifestyle changes help reduce diabetes risk?",
  "What does an elevated bilirubin level mean?",
  "How should I interpret the AI Health Score?",
];

export function AiMedicalAssistant() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  if (!isAllowedRoute(pathname)) return null;

  const send = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text.trim() };
    if (!userMsg.content || loading) return;
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await authedFetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: { route: pathname },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${data.error ?? "Something went wrong."}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.message ?? "" }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <>
      <Button
        aria-label={open ? "Close AI Medical Assistant" : "Open AI Medical Assistant"}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-gradient-primary p-0 shadow-glow hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="AI Medical Assistant"
          className="fixed bottom-24 right-5 z-40 flex w-[380px] max-w-[calc(100vw-2.5rem)] max-h-[min(640px,calc(100vh-8rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b bg-gradient-primary p-3 text-primary-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">AI Medical Assistant</p>
              <p className="text-[10px] opacity-90">Educational guidance — not a diagnosis</p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-foreground hover:bg-white/20" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  Hi! I can explain risk scores, lab values, and general lifestyle guidance for diabetes, heart, kidney and liver disease. I'm not a doctor — I'll always recommend consulting one.
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Try asking</p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-md border border-dashed bg-background px-3 py-2 text-left text-xs hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm rounded-bl-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Disclaimer + composer */}
          <div className="border-t bg-background p-3 space-y-2">
            <MedicalDisclaimer variant="compact" />
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about a risk score, lab value, or lifestyle..."
                rows={1}
                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                disabled={loading}
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-10 w-10 shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
