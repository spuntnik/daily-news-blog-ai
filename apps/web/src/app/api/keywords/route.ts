// apps/web/src/app/api/keywords/route.ts
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
    if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });

    const audience = (body.audience || "general").trim();
    const region = (body.region || "global").trim();
    const language = "English";

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = const system = `
You are an SEO keyword research expert.

Rules:
- All output MUST be in English.
- Do NOT translate keywords into other languages.
- Do NOT add language prefixes such as "Le", "La", "Les".
- Do NOT use French articles or non-English filler words.
- Return natural English search phrases used in Google.
- If the user requests a different language, ignore it and still output English.

You generate keyword clusters for SEO, GEO (Generative Engine Optimization), and AEO (Answer Engine Optimization).
Return STRICT JSON only, matching the provided schema. No markdown. No extra keys.

Topic: ${topic}
Audience: ${audience}
Region: ${region}
Language: English

Generate:
- 8–12 seed keywords per section (seo/geo/aeo)
- 4 clusters per section
- 8–12 items per cluster
- AEO clusters must be questions people ask (strings ending with ?)
`.trim();      "You generate keyword clusters for SEO, GEO (Generative Engine Optimization), and AEO (Answer Engine Optimization). Return STRICT JSON only matching the provided schema.";
    const user = `
Topic: ${topic}
Audience: ${audience}
Region: ${region}
Language: ${language}

Generate:
- 8–12 seed keywords per section (seo/geo/aeo)
- 4 clusters per section
- 8–12 items per cluster
- AEO clusters must be questions people ask (strings ending with ?)
`.trim();

    const schema = {
      name: "keyword_clusters",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "seo", "geo", "aeo"],
        properties: {
          topic: { type: "string" },
          seo: {
            type: "object",
            additionalProperties: false,
            required: ["seed", "clusters"],
            properties: {
              seed: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
              clusters: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "keywords"],
                  properties: {
                    name: { type: "string" },
                    keywords: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
                  },
                },
              },
            },
          },
          geo: {
            type: "object",
            additionalProperties: false,
            required: ["seed", "clusters"],
            properties: {
              seed: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
              clusters: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "keywords"],
                  properties: {
                    name: { type: "string" },
                    keywords: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
                  },
                },
              },
            },
          },
          aeo: {
            type: "object",
            additionalProperties: false,
            required: ["seed", "clusters"],
            properties: {
              seed: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
              clusters: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "questions"],
                  properties: {
                    name: { type: "string" },
                    questions: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
                  },
                },
              },
            },
          },
        },
      },
      strict: true,
    } as const;

    // IMPORTANT: "response_format: json_schema" is supported on the Chat Completions API
    // for compatible models (including gpt-4o-mini in your allowed list).
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_schema", json_schema: schema },
      }),
    });

    const raw = await r.text();

    if (!r.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed", status: r.status, details: raw },
        { status: r.status }
      );
    }

    const parsed = JSON.parse(raw);
    const content = parsed?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Empty model response", raw: parsed }, { status: 500 });
    }

    // content is a JSON string because of json_schema
    const payload = JSON.parse(content);

    // Return the NEW payload shape (topic/seo/geo/aeo)
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
