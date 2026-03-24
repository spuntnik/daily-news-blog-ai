// apps/web/src/app/api/generate-blog/route.ts
import { buildGeneratorPrompt } from "../../../lib/addon/promptBuilders";
import type {
  AddonRequest,
  GeneratorMode,
  AddonProfile,
} from "../../../lib/addon/types";

export const runtime = "nodejs";

type Cluster = {
  name: string;
  primary?: string[];
  long_tail?: string[];
  keywords?: string[];
  questions?: string[];
};

type KeywordPayload = {
  seed?: string[];
  clusters?: Cluster[];
};

type ReqBody = AddonRequest & {
  topic: string;
  audience?: string;
  region?: string;
  language?: string;
  seo?: KeywordPayload;
  geo?: KeywordPayload;
  aeo?: KeywordPayload;
  variation_hint?: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((s) => (s || "").trim()).filter(Boolean)));
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function flattenKeywords(p?: KeywordPayload) {
  if (!p) {
    return {
      seed: [] as string[],
      primary: [] as string[],
      longTail: [] as string[],
      questions: [] as string[],
    };
  }

  const seed = uniq(p.seed || []);
  const primary: string[] = [];
  const longTail: string[] = [];
  const questions: string[] = [];

  for (const c of p.clusters || []) {
    const prim = (c.primary || []).length ? c.primary || [] : [];
    const lt = (c.long_tail || []).length ? c.long_tail || [] : [];
    const legacy = c.keywords || [];

    const legacyPrimary = legacy.filter(
      (k) => (k || "").trim().split(/\s+/).length <= 3
    );
    const legacyLong = legacy.filter(
      (k) => (k || "").trim().split(/\s+/).length >= 4
    );

    primary.push(...prim, ...legacyPrimary);
    longTail.push(...lt, ...legacyLong);

    for (const q of c.questions || []) questions.push(q);
  }

  return {
    seed,
    primary: uniq(primary),
    longTail: uniq(longTail),
    questions: uniq(questions),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;

    const mode: GeneratorMode =
      body.mode === "addon-beta" ? "addon-beta" : "standard";

    const topic = (body.topic || body.keyword || "").trim();
    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const profile: AddonProfile = body.profile ?? "strategic-article";

    const audience = (body.audience || "general").trim();
    const region = (body.region || "global").trim();
    const language = (body.language || "English").trim();
    const variationHint = (body.variation_hint || "").trim();

    const seoFlat = flattenKeywords(body.seo);
    const geoFlat = flattenKeywords(body.geo);
    const aeoFlat = flattenKeywords(body.aeo);

    const primaryKw = uniq([
      ...seoFlat.primary.slice(0, 10),
      ...geoFlat.primary.slice(0, 8),
    ]).slice(0, 14);

    const longTailKw = uniq([
      ...seoFlat.longTail.slice(0, 10),
      ...geoFlat.longTail.slice(0, 10),
    ]).slice(0, 16);

    const questions = uniq(aeoFlat.questions).slice(0, 10);

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    let system = "";
    let user = "";
    let schema: any;

    if (mode === "addon-beta") {
      const finalPrompt = buildGeneratorPrompt({
        mode,
        topic,
        profile,
      });

      system = `
You are a structured content generator.

Rules:
- Write in natural, modern ${language}.
- Output MUST be valid JSON matching the schema.
- Do not include markdown fences.
- Keep the tone professional, readable, and commercially useful.
- blogHtml must contain valid HTML, not markdown.
- FAQs should contain 3 to 5 entries when relevant.
`.trim();

      user = `
${finalPrompt}

Audience: ${audience}
Region: ${region}

Variation hint:
${variationHint || "none"}

Primary keywords to prioritize:
${primaryKw.length ? primaryKw.map((k) => `- ${k}`).join("\n") : "- (none provided)"}

Long-tail keywords to weave in selectively:
${longTailKw.length ? longTailKw.map((k) => `- ${k}`).join("\n") : "- (none provided)"}

FAQ candidate questions:
${questions.length ? questions.map((q) => `- ${q}`).join("\n") : "- (none provided)"}
`.trim();

      schema = {
        name: "addon_blog_draft",
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "blogTitle",
            "seoTitle",
            "metaDescription",
            "blogHtml",
            "faqs",
            "cta",
          ],
          properties: {
            blogTitle: { type: "string" },
            seoTitle: { type: "string" },
            metaDescription: { type: "string" },
            blogHtml: { type: "string" },
            faqs: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["question", "answer"],
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                },
              },
            },
            cta: { type: "string" },
          },
        },
        strict: true,
      } as const;
    } else {
      system = `
You are an expert SEO blog writer.

Rules:
- Write in natural, modern ${language}. (If language is not English, still keep keywords in English.)
- Do NOT output anything in French or add prefixes like "Le/La/Les".
- The blog must feel human and editorial, not like notes, not like code.
- Use short paragraphs, clear transitions, and varied sentence openings.
- Output MUST be valid JSON matching the schema. Do not include markdown fences.

Structure requirements:
- Title should be compelling, non-clickbait.
- Provide a short standfast/excerpt (1–2 sentences).
- Provide Markdown content with:
  - One H1 (same as title)
  - Several H2s
  - Some H3s where appropriate
  - A brief conclusion
  - Optional FAQ section using 3–5 of the provided questions (if any)

SEO requirements:
- Use primary keywords naturally (don’t stuff).
- Sprinkle long-tail keywords where they truly fit.
- If region is specific, include local context naturally (examples, phrasing, scenarios).
`.trim();

      user = `
Topic: ${topic}
Audience: ${audience}
Region: ${region}

Variation hint (if present, change the angle, examples, and structure while staying on-topic):
${variationHint || "none"}

Primary keywords to prioritize (use naturally):
${primaryKw.length ? primaryKw.map((k) => `- ${k}`).join("\n") : "- (none provided)"}

Long-tail keywords to weave in (use selectively):
${longTailKw.length ? longTailKw.map((k) => `- ${k}`).join("\n") : "- (none provided)"}

AEO questions (optional FAQ inputs):
${questions.length ? questions.map((q) => `- ${q}`).join("\n") : "- (none provided)"}

Deliver:
- title
- excerpt
- content_md (markdown)
`.trim();

      schema = {
        name: "blog_draft",
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
    }

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

    if (!r.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed", status: r.status, details: raw },
        { status: 500 }
      );
    }

    const parsedResponse = JSON.parse(raw);
    const content = parsedResponse?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Empty model response", raw: parsedResponse },
        { status: 500 }
      );
    }

    const payload = safeParseJson(content);

    if (!payload) {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: content },
        { status: 500 }
      );
    }

    if (mode === "addon-beta") {
      return NextResponse.json({
        ok: true,
        mode,
        profile,
        blogTitle: payload.blogTitle || "",
        seoTitle: payload.seoTitle || "",
        metaDescription: payload.metaDescription || "",
        blogHtml: payload.blogHtml || "",
        faqs: Array.isArray(payload.faqs) ? payload.faqs : [],
        cta: payload.cta || "",
      });
    }

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
