import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ReqBody = {
  topic: string;
  audience?: string;
  region?: string;
  language?: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const topic = (body.topic || "").trim();
    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const audience = (body.audience || "").trim();
    const region = (body.region || "").trim();
    const language = (body.language || "English").trim();

    const apiKey = mustEnv("OPENAI_API_KEY");

    const prompt = `
Generate GEO (Generative Engine Optimization), SEO, and AEO (Answer Engine Optimization) keyword clusters.

Context:
- Topic: ${topic}
- Audience: ${audience || "general"}
- Region: ${region || "global"}
- Language: ${language}

Return STRICT JSON ONLY with this shape:
{
  "topic": "...",
  "seo": { "seed": ["..."], "clusters": [{ "name": "...", "keywords": ["..."] }] },
  "geo": { "seed": ["..."], "clusters": [{ "name": "...", "keywords": ["..."] }] },
  "aeo": { "seed": ["..."], "clusters": [{ "name": "...", "questions": ["..."] }] }
}

Rules:
- 8–12 seed keywords per section
- 4 clusters per section
- 8–12 items per cluster
- AEO uses questions people ask
`.trim();

    // Uses the Responses API. If your project uses a different endpoint already, tell me and I’ll align it.
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: prompt,
      }),
    });

    const raw = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed", status: r.status, details: raw },
        { status: 500 }
      );
    }

    // Responses API returns JSON; we need the text content.
    const parsed = JSON.parse(raw);
    const text =
      parsed?.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ??
      "";

    // Parse the STRICT JSON from the model output
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json(
        { error: "Model did not return JSON", raw: text },
        { status: 500 }
      );
    }

    const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
