import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle, Send, X, Stethoscope, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const ALLOWED_PATHS = ["/dashboard", "/predict", "/predict-full", "/patients"];

declare global {
  interface Window {
    __AI_ASSISTANT_CONTEXT__?: string;
  }
}

export function AiAssistant() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm your HealthPredict assistant. Ask me about a patient's risk factors, what a lab value means, or lifestyle guidance. I provide educational information only — final decisions belong to your clinician.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const shouldShow = ALLOWED_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!shouldShow) return null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          context: typeof window !== "undefined" ? window.__AI_ASSISTANT_CONTEXT__ ?? "" : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages([...next, { role: "assistant", content: `⚠️ ${data?.error ?? "Sorry, I couldn't respond right now."}` }]);
      } else {
        setMessages([...next, { role: "assistant", content: data.reply || "(no response)" }]);
      }
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `⚠️ Network error: ${e?.message ?? "unknown"}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          aria-label="Open AI medical assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[380px] max-w-[95vw] flex-col rounded-xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Medical Assistant</div>
                <div className="text-[10px] text-muted-foreground">Educational use only</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="mb-2 flex flex-wrap gap-1">
              {["Why is this patient high risk?", "What lifestyle changes help?", "What does bilirubin mean?"].map(
                (q) => (
                  <Badge
                    key={q}
                    variant="outline"
                    className="cursor-pointer text-[10px] font-normal hover:bg-muted"
                    onClick={() => !busy && setInput(q)}
                  >
                    {q}
                  </Badge>
                ),
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about a risk, lab value, or lifestyle…"
                rows={2}
                className="flex-1 resize-none text-sm"
                disabled={busy}
              />
              <Button size="icon" onClick={send} disabled={busy || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Set the page-level context the assistant should reason about. Pass null to clear. */
export function useAssistantContext(context: string | null | undefined) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__AI_ASSISTANT_CONTEXT__ = context ?? "";
    return () => {
      if (typeof window !== "undefined") window.__AI_ASSISTANT_CONTEXT__ = "";
    };
  }, [context]);
}
