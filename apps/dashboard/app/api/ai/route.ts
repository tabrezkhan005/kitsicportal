import { NextResponse } from "next/server";
import { getSessionUser } from "@kitsic/auth";

const FALLBACK: Record<string, string> = {
  tasks: "Open Tasks from the sidebar to view and manage the club board.",
  events: "Go to Events to see club events or propose one with attachments.",
  learning: "Learning has quizzes and assignments published by leadership.",
  resources: "Resources contains internships, roadmaps, and useful links.",
  messages: "Use Messages to contact President, VP, Secretary, or Treasurer.",
  attendance: "Attendance shows your online/offline meeting analytics.",
  members: "Members lists the club directory with skills and contribution scores.",
};

function fallbackReply(input: string) {
  const lower = input.toLowerCase();
  for (const [key, answer] of Object.entries(FALLBACK)) {
    if (lower.includes(key)) return answer;
  }
  return "I can help with tasks, events, learning, resources, messages, attendance, and members. Ask about any of these.";
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL ?? "https://api.groq.com/openai/v1/chat/completions";
  const model = process.env.AI_MODEL ?? "llama-3.1-8b-instant";

  if (!apiKey) {
    return NextResponse.json({ reply: fallbackReply(message), mode: "fallback" });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are the KITS Innovation Club (KITSIC) dashboard assistant. Help members navigate tasks, events, meetings, learning modules, resources, messages to leadership, attendance analytics, and profile settings. Be concise and practical.",
          },
          { role: "user", content: message },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ reply: fallbackReply(message), mode: "fallback" });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ reply: reply || fallbackReply(message), mode: "ai" });
  } catch {
    return NextResponse.json({ reply: fallbackReply(message), mode: "fallback" });
  }
}
