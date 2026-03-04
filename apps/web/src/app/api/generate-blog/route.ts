import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ReqBody = {
  topic: string;
  audience?: string;
  region?: string;
  seo?: any;
  geo?: any;
  aeo?: any;
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

    // Collect keywords defensively (supports old seed/clusters schema)
    const pick = (arr: any) => (Array.isArray(arr) ? arr.filter(Boolean) : []);
    const fromSeedClusters = (obj: any) => {
      const seeds = pick(obj?.seed);
      const clusters = pick(obj?.clusters).flatMap((c: any) => pick(c?.keywords || c?.questions));
      return [...seeds, ...clusters];
    };

    const seoList = fromSeedClusters(body.seo);
    const geoList = fromSeedClusters(body.geo);
    const aeoList = fromSeedClusters(body.aeo);

    const primaryKw = seoList.slice(0, 8);
    const longTailKw = [...seoList, ...geoList].filter((k) => String(k).split(" ").length >= 4).slice(0, 10);
    const geoKw = geoList.slice(0, 8);
    const questions = aeoList.slice(0, 8);

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = `
You are a professional SEO blog writer.

Rules:
- Output MUST be English.
- Write a complete blog article.

Structure required:
1) Title
2) Excerpt (1–2 sentences)
3) Markdown blog containing:
   - One H1 (main topic)
   - 4–6 H2 sections
   - Optional H3 subsections
   - Bullet lists where useful
   - Final FAQ section using AEO questions

Content guidelines:
- Use primary keywords naturally in H1 and early H2 sections.
- Use long-tail keywords inside sub-sections.
- Use GEO keywords naturally when referencing the region.
- FAQ must answer the AEO questions clearly.

Return JSON only with:
{
 "title": "...",
 "excerpt": "...",
 "content_md": "..."
}
`;
    const user = `
Topic: ${topic}
Audience: ${audience}
Region: ${region}

Primary keywords: ${primaryKw.join(", ")}
Long-tail keywords: ${longTailKw.join(", ")}
Geo keywords: ${geoKw.join(", ")}
AEO questions: ${questions.join(" | ")}
`.trim();

    const schema = {
      name: "blog_payload",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "excerpt", "content_md"],
        properties: {
          title: { type: "string" },
          excerpt: { type: "string" },
          content_md: { type: "string" },
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
        temperature: 0.7,
      }),
    });

    const raw = await r.text();
    if (!r.ok) return NextResponse.json({ error: "OpenAI request failed", details: raw }, { status: r.status });

    const parsed = JSON.parse(raw);
    const content = parsed?.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "Empty model response", details: parsed }, { status: 500 });

    const payload = JSON.parse(content);
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
