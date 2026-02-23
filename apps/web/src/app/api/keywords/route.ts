import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Payload = {
  topic: string;
  audience?: string;
  region?: string;
  language?: string;
};

function getSupabaseRouteClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

// MVP generator (no AI): produces usable SEO/GEO/AEO buckets
function generateKeywordSet(input: Payload) {
  const topic = input.topic.trim();
  const region = (input.region || "").trim();
  const audience = (input.audience || "").trim();

  const base = [
    topic,
    region ? `${topic} ${region}` : null,
    audience ? `${topic} for ${audience}` : null,
  ].filter(Boolean) as string[];

  const intents = [
    { intent: "informational", patterns: ["what is", "how to", "guide", "examples", "checklist"] },
    { intent: "commercial", patterns: ["best", "top", "review", "comparison", "tools"] },
    { intent: "transactional", patterns: ["pricing", "cost", "buy", "template", "service"] },
  ] as const;

  const seo: any[] = [];
  const geo: any[] = [];
  const aeo: any[] = [];

  // SEO: classic keyword variations
  for (const b of base) {
    seo.push(
      { keyword: b, bucket: "SEO", intent: "informational", stage: "awareness", difficulty: "med", priority: 3 },
      { keyword: `best ${b}`, bucket: "SEO", intent: "commercial", stage: "consideration", difficulty: "med", priority: 4 },
      { keyword: `${b} checklist`, bucket: "SEO", intent: "informational", stage: "awareness", difficulty: "low", priority: 4 },
      { keyword: `${b} pricing`, bucket: "SEO", intent: "transactional", stage: "decision", difficulty: "med", priority: 5 }
    );
  }

  // GEO: “generative engine” style prompts and entity-rich queries
  for (const b of base) {
    geo.push(
      { keyword: `strategies for ${b}`, bucket: "GEO", intent: "informational", stage: "awareness", difficulty: "low", priority: 4 },
      { keyword: `framework for ${b}`, bucket: "GEO", intent: "informational", stage: "consideration", difficulty: "low", priority: 4 },
      { keyword: `step-by-step process for ${b}`, bucket: "GEO", intent: "informational", stage: "consideration", difficulty: "low", priority: 4 },
      { keyword: `common mistakes in ${b}`, bucket: "GEO", intent: "informational", stage: "awareness", difficulty: "low", priority: 3 }
    );
  }

  // AEO: answer-engine questions (featured snippet + FAQ style)
  for (const b of base) {
    for (const block of intents) {
      for (const p of block.patterns) {
        const q =
          p === "what is" ? `What is ${b}?` :
          p === "how to" ? `How do we do ${b}?` :
          p === "guide" ? `${b} guide` :
          p === "examples" ? `${b} examples` :
          p === "checklist" ? `${b} checklist` :
          p === "best" ? `What is the best way to do ${b}?` :
          p === "top" ? `Top tools for ${b}` :
          p === "review" ? `${b} review` :
          p === "comparison" ? `${b} comparison` :
          p === "tools" ? `Tools for ${b}` :
          p === "pricing" ? `How much does ${b} cost?` :
          p === "cost" ? `${b} cost` :
          p === "buy" ? `Where to buy ${b}?` :
          p === "template" ? `${b} template` :
          `Service for ${b}`;

        aeo.push({
          keyword: q,
          bucket: "AEO",
          intent: block.intent,
          stage: block.intent === "transactional" ? "decision" : "consideration",
          difficulty: "low",
          priority: block.intent === "transactional" ? 5 : 3,
        });
      }
    }
  }

  // De-dupe
  const seen = new Set<string>();
  const all = [...seo, ...geo, ...aeo].filter((x) => {
    const k = `${x.bucket}:${x.keyword.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return all;
}

export async function POST(req: Request) {
  const supabase = getSupabaseRouteClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Payload;
  if (!body.topic || body.topic.trim().length < 2) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const items = generateKeywordSet(body);

  // Save run
  const { data: run, error: runErr } = await supabase
    .from("keyword_runs")
    .insert({
      user_id: auth.user.id,
      topic: body.topic.trim(),
      audience: body.audience || null,
      region: body.region || null,
      language: body.language || null,
    })
    .select("id")
    .single();

  if (runErr || !run) {
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }

  // Save items
  const rows = items.map((i) => ({
    run_id: run.id,
    keyword: i.keyword,
    bucket: i.bucket,
    intent: i.intent,
    stage: i.stage,
    difficulty: i.difficulty,
    priority: i.priority,
  }));

  const { error: itemsErr } = await supabase.from("keyword_items").insert(rows);
  if (itemsErr) {
    return NextResponse.json({ error: "Failed to save keywords" }, { status: 500 });
  }

  return NextResponse.json({ runId: run.id, items });
}
