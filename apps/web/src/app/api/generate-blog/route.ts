// apps/web/src/app/api/generate-blog/route.ts
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

// Accept both OLD keyword shape:
// { seed: string[], clusters: [{ name, keywords[] }] }
// and NEW shape (if you upgraded):
// { primary: string[], long_tail: string[], clusters: ... }
function normalizeKeywords(section: any) {
  const out = {
    primary: [] as string[],
    longTail: [] as string[],
    clusters: [] as { name: string; items: string[] }[],
  };

  if (!section) return out;

  // NEW
  if (Array.isArray(section.primary)) out.primary.push(...section.primary);
  if (Array.isArray(section.long_tail)) out.longTail.push(...section.long_tail);

  // OLD seed => treat as primary
  if (Array.isArray(section.seed)) out.primary.push(...section.seed);

  // clusters
  const clusters = Array.isArray(section.clusters) ? section.clusters : [];
  for (const c of clusters) {
    const name = String(c?.name || "").trim() || "Cluster";
    const items =
      Array.isArray(c?.keywords) ? c.keywords :
      Array.isArray(c?.questions) ? c.questions :
      [];
    out.clusters.push({
      name,
      items: items.map((x: any) => String(x).trim()).filter(Boolean),
    });
  }

  // De-dupe + trim
  const dedupe = (arr: string[]) =>
    Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).slice(0, 60);

  out.primary = dedupe(out.primary);
  out.longTail = dedupe(out.longTail);

  return out;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;

    const topic = String(body.topic || "").trim();
    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const audience = String(body.audience || "general readers").trim();
    const region = String(body.region || "global").trim();

    const seo = normalizeKeywords(body.seo);
    const geo = normalizeKeywords(body.geo);
    const aeo = normalizeKeywords(body.aeo);

    // Keep prompt compact and practical
    const primaryKw = [...seo.primary, ...geo.primary].slice(0, 18);
    const longTailKw = [...seo.longTail, ...geo.longTail].slice(0, 18);

    const aeoQuestions = (() => {
      // Prefer NEW long_tail for AEO if present, else cluster questions
      const qs = [...aeo.longTail, ...aeo.primary];
      if (qs.length) return qs.slice(0, 10);
      const fromClusters = aeo.clusters.flatMap((c) => c.items);
      return fromClusters.slice(0, 10);
    })();

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = `
You are an SEO blog writer who writes like a real human, not like an outline generator.

Hard rules:
- Output MUST be in English.
- Do NOT translate keywords into other languages.
- Do NOT add language prefixes like "Le", "La", "Les".
- Avoid “AI-ish” filler. No hype words like Unlock/Unleash/Optimize/Journey.
- Sound conversational and clear. Short paragraphs. Natural transitions.
- Use headings, but keep them human (not robotic).
- Write in Markdown.

Content requirements:
- Start with a strong opening that feels grounded and practical.
- Use ONE H1 at the top.
- Use H2/H3 where it helps readability.
- Weave the provided keywords naturally (do not stuff).
- Include a short FAQ section that answers AEO questions plainly.
- End with a simple, realistic next step.

Return ONLY valid JSON matching the schema.
`.trim();

    const user = `
Topic: ${topic}
Audience: ${audience}
Region context: ${region}

Primary keywords (use many, naturally): ${JSON.stringify(primaryKw)}
Long-tail keywords (sprinkle naturally): ${JSON.stringify(longTailKw)}

AEO questions for FAQ (answer 5–8): ${JSON.stringify(aeoQuestions)}
`.trim();

    const schema = {
      name: "blog_post",
      strict: true,
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
    } as const;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
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
      return NextResponse.json(
        { error: "Empty model response", raw: parsed },
        { status: 500 }
      );
    }

    // content is a JSON string because of json_schema
    const payload = JSON.parse(content);

    // Safety cleanup: strip accidental French articles if they still appear
    const stripLeLa = (s: string) =>
      s
        .replace(/\b(Le|La|Les)\s+/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    payload.title = stripLeLa(String(payload.title || topic));
    payload.excerpt = String(payload.excerpt || "").trim();
    payload.content_md = String(payload.content_md || "").trim();

    // Ensure H1 exists at top
    if (!payload.content_md.startsWith("# ")) {
      payload.content_md = `# ${payload.title}\n\n${payload.content_md}`;
    }

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
