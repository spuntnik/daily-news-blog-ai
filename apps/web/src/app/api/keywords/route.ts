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

function extractJsonFromText(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;

    const topic = (body.topic || "").trim();
    if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });

    const audience = (body.audience || "general").trim();
    const region = (body.region || "global").trim();
    const language = (body.language || "English").trim();

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "o4-mini-deep-research";

    const prompt = `
Return STRICT JSON ONLY with this shape:
{
  "topic": "...",
  "seo": { "seed": ["..."], "clusters": [{ "name": "...", "keywords": ["..."] }] },
  "geo": { "seed": ["..."], "clusters": [{ "name": "...", "keywords": ["..."] }] },
  "aeo": { "seed": ["..."], "clusters": [{ "name": "...", "questions": ["..."] }] }
}

Context:
- Topic: ${topic}
- Audience: ${audience}
- Region: ${region}
- Language: ${language}

Rules:
- 8–12 seed keywords per section
- 4 clusters per section
- 8–12 items per cluster
- AEO uses questions people ask (each ends with "?")
`.trim();

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
    });

    const rawText = await r.text();

    if (!r.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed", status: r.status, details: rawText },
        { status: r.status }
      );
    }

    const raw = JSON.parse(rawText);

    // Try structured JSON output first (if present)
    // Some responses include output_json; others return output_text.
    let payload: any = null;

    // Attempt to find any content item that looks like JSON
    const output = raw?.output || [];
    for (const item of output) {
      const contentArr = item?.content || [];
      for (const c of contentArr) {
        if (c?.type === "output_json" && c?.json) {
          payload = c.json;
          break;
        }
        if (c?.type === "output_text" && typeof c?.text === "string") {
          payload = extractJsonFromText(c.text);
          if (payload) break;
        }
      }
      if (payload) break;
    }

    if (!payload) {
      return NextResponse.json(
        { error: "Model did not return JSON", raw },
        { status: 500 }
      );
    }

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
