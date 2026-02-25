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
    const language = (body.language || "English").trim();

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "o4-mini-deep-research";

    const system = `You generate keyword clusters for SEO, GEO (Generative Engine Optimization), and AEO (Answer Engine Optimization). Always follow the provided JSON schema exactly.`;
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
      // Return the real OpenAI status so your UI can show it properly
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

    const payload = JSON.parse(content);
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
