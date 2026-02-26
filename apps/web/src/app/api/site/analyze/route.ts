import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../utils/supabase/server";

export const runtime = "nodejs";

type ReqBody = {
  siteUrl: string;
  extraContext?: string;
  regionHint?: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeUrl(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `https://${raw}`;
  return raw;
}

// Lightweight extraction
function extractSignals(html: string) {
  const pick = (re: RegExp) => {
    const m = html.match(re);
    return m?.[1]?.trim() || "";
  };

  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);

  const metaDescription =
    pick(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i) ||
    pick(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["'][^>]*>/i);

  const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  const h2s: string[] = [];
  const h2re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = h2re.exec(html)) && h2s.length < 8) {
    h2s.push(m[1].replace(/<[^>]+>/g, "").trim());
  }

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

  return { title, metaDescription, h1, h2s, bodyText };
}

export async function POST(req: Request) {
  try {
    const supabase = supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as ReqBody;
    const siteUrl = normalizeUrl(body.siteUrl || "");
    if (!siteUrl) return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });

    const extraContext = (body.extraContext || "").trim();
    const regionHint = (body.regionHint || "").trim();

    const resp = await fetch(siteUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AGSEOStudioBot/1.0; +https://agseostudio.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const html = await resp.text();
    if (!resp.ok) {
      return NextResponse.json(
        { error: "Failed to fetch site", status: resp.status, details: html?.slice?.(0, 300) },
        { status: 400 }
      );
    }

    const signals = extractSignals(html);

    const apiKey = mustEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const schema = {
      name: "site_profile",
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "siteUrl",
          "industry",
          "audiences",
          "markets",
          "topics",
          "competitors",
          "needsClarification",
          "suggestedPromptQuestions",
        ],
        properties: {
          siteUrl: { type: "string" },
          industry: { type: "string" },
          audiences: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
          markets: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
          topics: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 20 },
          competitors: {
            type: "array",
            minItems: 3,
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "url", "confidence", "note"],
              properties: {
                name: { type: "string" },
                url: { type: "string" },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
                note: { type: "string" },
              },
            },
          },
          needsClarification: { type: "boolean" },
          suggestedPromptQuestions: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 8 },
        },
      },
      strict: true,
    } as const;

    const system =
      "You are an SEO/GEO/AEO site analyst. Infer the site's business and content strategy from provided HTML signals. If uncertain, set needsClarification=true and ask concise questions.";

    const user = `
Site URL: ${siteUrl}
Region hint (optional): ${regionHint || "none"}
Extra context from user (optional): ${extraContext || "none"}

Extracted signals:
- Title: ${signals.title || "none"}
- Meta description: ${signals.metaDescription || "none"}
- H1: ${signals.h1 || "none"}
- H2s: ${signals.h2s.length ? signals.h2s.join(" | ") : "none"}
- Body sample: ${signals.bodyText || "none"}

Task:
1) Identify likely industry/category.
2) Identify target audiences (roles/types).
3) Identify markets served (countries/regions) using regionHint if provided.
4) Propose blog topic themes (6–20) that match the site.
5) Suggest competitors: if you cannot be sure, still provide plausible competitors but mark confidence low and explain in note.
6) If the signals are too thin, set needsClarification=true and ask up to 8 questions.
Return strict JSON only.
`.trim();

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
    if (!content) return NextResponse.json({ error: "Empty model response" }, { status: 500 });

    const profile = JSON.parse(content);

    // Persist site_url + profile so /site and dashboard can use it
    const { error: upsertErr } = await supabase
      .from("user_sites")
      .upsert(
        { user_id: auth.user.id, site_url: siteUrl, profile },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      siteUrl,
      profile,
      signals: {
        title: signals.title,
        metaDescription: signals.metaDescription,
        h1: signals.h1,
        h2s: signals.h2s,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
