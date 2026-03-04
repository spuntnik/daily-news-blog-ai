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
    response_format: { type: "json_schema", json_schema: schema }
    
    const audience = (body.audience || "general").trim();
    const region = (body.region || "global").trim();
    const language = "English";

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

const system = `
You are an SEO keyword research expert.

Rules:
- All output MUST be in English.
- Do NOT translate keywords into other languages.
- Do NOT add language prefixes such as "Le", "La", "Les".
- Return natural English search phrases used in Google.
- Output must match the provided JSON schema exactly. No extra keys. No markdown.

Definitions:
- primary_keywords: short, high-intent phrases (2–4 words max).
- long_tail_keywords: longer, specific phrases (6–12 words) with clear intent (how/what/best/for/near/price/etc).
- GEO keywords must include location intent (e.g. Singapore, Malaysia) where relevant.
- AEO long_tail_keywords must be QUESTIONS ending with '?'.

Generate for Topic, Audience, Region:
- SEO: 12 primary + 12 long-tail + 4 clusters (8–12 keywords each)
- GEO: 12 primary + 12 long-tail + 4 clusters (8–12 keywords each)
- AEO: 8 primary topics + 20 question long-tail + 4 clusters (8–12 questions each)
`.trim();

const user = `
Topic: ${topic}
Audience: ${audience}
Region: ${region}
Language: English

Return JSON matching the schema.
`.trim();

Generate:
- 8–12 seed keywords per section (seo/geo/aeo)
- 4 clusters per section
- 8–12 items per cluster
- AEO clusters must be questions people ask (strings ending with ?)
`.trim();      

"You generate keyword clusters for SEO, GEO (Generative Engine Optimization), and AEO (Answer Engine Optimization). Return STRICT JSON only matching the provided schema.";
    
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
  name: "keyword_clusters_v2",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["topic", "seo", "geo", "aeo"],
    properties: {
      topic: { type: "string" },

      seo: {
        type: "object",
        additionalProperties: false,
        required: ["primary_keywords", "long_tail_keywords", "clusters"],
        properties: {
          primary_keywords: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 20 },
          long_tail_keywords: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 24 },
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
        required: ["primary_keywords", "long_tail_keywords", "clusters"],
        properties: {
          primary_keywords: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 20 },
          long_tail_keywords: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 24 },
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
        required: ["primary_topics", "long_tail_questions", "clusters"],
        properties: {
          primary_topics: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 12 },
          long_tail_questions: { type: "array", items: { type: "string" }, minItems: 12, maxItems: 30 },
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
