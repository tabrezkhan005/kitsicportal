"use client";

import { useState } from "react";
import { Button } from "@kitsic/ui";
import { Bot, MessageCircle, Send, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your KITSIC assistant. Ask me about tasks, events, learning, resources, messages, or attendance." },
  ]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Sorry, I could not answer that." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-2xl bg-primary shadow-lg transition-transform hover:scale-105 hover:bg-secondary"
        size="icon"
        aria-label="Open AI assistant"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <div className="dashboard-card fixed bottom-6 right-6 z-40 flex h-[420px] w-[360px] flex-col overflow-hidden">
      <div className="flex flex-row items-center justify-between border-b border-[var(--dashboard-border-subtle)] px-4 py-3">
        <p className="flex items-center gap-2 font-ui text-sm font-semibold text-primary">
          <MessageCircle className="h-4 w-4" />
          KITSIC Assistant
        </p>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-3">
        <div className="dashboard-scroll flex-1 space-y-3 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={[
                "max-w-[85%] rounded-xl px-3 py-2 text-sm font-body",
                msg.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "border border-[var(--dashboard-border)] bg-[var(--dashboard-muted-surface)] text-primary",
              ].join(" ")}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && <p className="font-body text-xs text-muted">Thinking…</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about the dashboard…"
            className="flex-1 rounded-lg border border-[var(--dashboard-border)] bg-background px-3 py-2 text-sm outline-none font-body"
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading} aria-label="Send" className="rounded-lg bg-primary hover:bg-secondary">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
