"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../../../utils/supabase/browser";

type BlogPost = {
  id: string;
  title: string;
  excerpt?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
};

type UserSiteRow = {
  profile?: Record<string, any> | null;
  site_setup_state?: Record<string, any> | null;
};

type SiteContext = {
  brandName: string;
  websiteUrl: string;
  niche: string;
  audience: string;
  region: string;
  voice: string;
  coreOffer: string;
};

type LinkedInDraft = {
  id: string;
  user_id: string;
  blog_post_id: string | null;
  keyword: string | null;
  angle_name: string | null;
  tone: string | null;
  hook: string;
  body: string;
  cta: string;
  full_post: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type GeneratedDraft = {
  angle_name: string;
  tone: string;
  hook: string;
  body: string;
  cta: string;
  full_post: string;
};

const EMPTY_SITE_CONTEXT: SiteContext = {
  brandName: "our brand",
  websiteUrl: "",
  niche: "practical business content",
  audience: "professionals",
  region: "our market",
  voice: "clear, reflective, grounded",
  coreOffer: "practical growth and leadership insight",
};

export default function LinkedInPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [userSite, setUserSite] = useState<UserSiteRow | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<LinkedInDraft[]>([]);

  const [sourceMode, setSourceMode] = useState<"blog" | "keyword">("blog");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [manualKeyword, setManualKeyword] = useState("");
  const [toneMode, setToneMode] = useState("Blair Warren");
  const [lengthMode, setLengthMode] = useState("Standard");

  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const siteContext = useMemo(() => extractSiteContext(userSite), [userSite]);

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  useEffect(() => {
    void loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPageData() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const [postsRes, siteRes, draftsRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("id,title,excerpt,status,created_at,updated_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("user_sites")
          .select("profile,site_setup_state")
          .eq("user_id", user.id)
          .limit(1),

        supabase
          .from("linkedin_drafts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (postsRes.error) throw postsRes.error;
      if (siteRes.error) throw siteRes.error;
      if (draftsRes.error) throw draftsRes.error;

      const nextPosts = (postsRes.data || []) as BlogPost[];
      const nextSite = ((siteRes.data || [])[0] || null) as UserSiteRow | null;
      const nextDrafts = (draftsRes.data || []) as LinkedInDraft[];

      setPosts(nextPosts);
      setUserSite(nextSite);
      setSavedDrafts(nextDrafts);

      const urlPostId = searchParams.get("postId");
      if (urlPostId && nextPosts.some((p) => p.id === urlPostId)) {
        setSelectedPostId(urlPostId);
        setSourceMode("blog");
      } else if (nextPosts.length > 0) {
        setSelectedPostId(nextPosts[0].id);
      }
    } catch (err: any) {
      setMessage(err?.message || "Failed to load LinkedIn workspace.");
    } finally {
      setLoading(false);
    }
  }

  async function generateDrafts() {
    setBusy(true);
    setMessage("");

    try {
      const baseInput = getBaseInput();
      if (!baseInput.topic.trim()) {
        setMessage("Please select a blog post or enter a keyword/topic.");
        return;
      }

      const drafts = buildLinkedInDrafts({
        topic: baseInput.topic,
        summary: baseInput.summary,
        site: siteContext,
        toneMode,
        lengthMode,
      });

      setGeneratedDrafts(drafts);
      setMessage(`Generated ${drafts.length} LinkedIn post angles.`);
    } catch (err: any) {
      setMessage(err?.message || "Failed to generate LinkedIn drafts.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAllDrafts() {
    if (!generatedDrafts.length) {
      setMessage("Nothing to save yet.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not signed in.");

      const payload = generatedDrafts.map((draft) => ({
        user_id: user.id,
        blog_post_id: sourceMode === "blog" ? selectedPost?.id || null : null,
        keyword: sourceMode === "keyword" ? manualKeyword.trim() || null : null,
        angle_name: draft.angle_name,
        tone: draft.tone,
        hook: draft.hook,
        body: draft.body,
        cta: draft.cta,
        full_post: draft.full_post,
        status: "draft",
      }));

      const { data, error } = await supabase
        .from("linkedin_drafts")
        .insert(payload)
        .select();

      if (error) throw error;

      setSavedDrafts((prev) => [...((data || []) as LinkedInDraft[]), ...prev]);
      setMessage(`Saved ${payload.length} LinkedIn drafts.`);
    } catch (err: any) {
      setMessage(err?.message || "Failed to save LinkedIn drafts.");
    } finally {
      setBusy(false);
    }
  }

  function copyDraft(fullPost: string) {
    navigator.clipboard.writeText(fullPost);
    setMessage("Copied to clipboard.");
  }

  function exportGeneratedAsCsv() {
    if (!generatedDrafts.length) {
      setMessage("Nothing to export yet.");
      return;
    }

    const rows = [
      ["angle_name", "tone", "hook", "body", "cta", "full_post"],
      ...generatedDrafts.map((draft) => [
        draft.angle_name,
        draft.tone,
        draft.hook,
        draft.body,
        draft.cta,
        draft.full_post,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const safe = String(value ?? "").replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filenameBase =
      sourceMode === "blog"
        ? selectedPost?.title || "linkedin-drafts"
        : manualKeyword || "linkedin-drafts";

    a.href = url;
    a.download = `${slugify(filenameBase)}-linkedin-drafts.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setMessage("Exported CSV.");
  }

  function getBaseInput() {
    if (sourceMode === "blog" && selectedPost) {
      return {
        topic: selectedPost.title || "",
        summary: selectedPost.excerpt || "",
      };
    }

    return {
      topic: manualKeyword.trim(),
      summary: "",
    };
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        LinkedIn Posts
      </h1>
      <p style={{ marginBottom: 20, opacity: 0.7 }}>
        Turn blog ideas and articles into LinkedIn-ready posts with more tension, recognition, and reflective pull.
      </p>

      {message ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          {message}
        </div>
      ) : null}

      {loading ? <div>Loading...</div> : null}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ width: 360 }}>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Source</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button
                onClick={() => setSourceMode("blog")}
                style={{
                  background: sourceMode === "blog" ? "#f2f2f2" : "white",
                }}
              >
                Use Blog
              </button>
              <button
                onClick={() => setSourceMode("keyword")}
                style={{
                  background: sourceMode === "keyword" ? "#f2f2f2" : "white",
                }}
              >
                Use Keyword
              </button>
            </div>

            {sourceMode === "blog" ? (
              <div style={{ display: "grid", gap: 10 }}>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                >
                  <option value="">Select a blog post</option>
                  {posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title}
                    </option>
                  ))}
                </select>

                {selectedPost ? (
                  <div
                    style={{
                      padding: 12,
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {selectedPost.title}
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.8 }}>
                      {selectedPost.excerpt || "No excerpt available."}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  placeholder="Enter keyword or topic"
                  value={manualKeyword}
                  onChange={(e) => setManualKeyword(e.target.value)}
                />
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.75,
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    background: "#fafafa",
                  }}
                >
                  Example: executive coaching Singapore
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Generation Settings</div>

            <div style={{ display: "grid", gap: 10 }}>
              <select value={toneMode} onChange={(e) => setToneMode(e.target.value)}>
                <option>Blair Warren</option>
                <option>Reflective</option>
                <option>Thought Leadership</option>
                <option>Contrarian</option>
              </select>

              <select value={lengthMode} onChange={(e) => setLengthMode(e.target.value)}>
                <option>Short</option>
                <option>Standard</option>
                <option>Long</option>
              </select>

              <button onClick={generateDrafts} disabled={busy}>
                {busy ? "Generating..." : "Generate LinkedIn Angles"}
              </button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Site Context</div>
            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
              <div><strong>Brand:</strong> {siteContext.brandName}</div>
              <div><strong>Website:</strong> {siteContext.websiteUrl || "-"}</div>
              <div><strong>Niche:</strong> {siteContext.niche}</div>
              <div><strong>Audience:</strong> {siteContext.audience}</div>
              <div><strong>Region:</strong> {siteContext.region}</div>
              <div><strong>Voice:</strong> {siteContext.voice}</div>
              <div><strong>Core offer:</strong> {siteContext.coreOffer}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Generated Drafts</div>
                <div style={{ fontSize: 14, opacity: 0.75 }}>
                  3 recognition-led post angles designed to feel more human and less generic.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={saveAllDrafts} disabled={busy || !generatedDrafts.length}>
                  Save All Drafts
                </button>
                <button onClick={exportGeneratedAsCsv} disabled={!generatedDrafts.length}>
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {generatedDrafts.length ? (
            <div style={{ display: "grid", gap: 16 }}>
              {generatedDrafts.map((draft, index) => (
                <div
                  key={`${draft.angle_name}-${index}`}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{draft.angle_name}</div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>{draft.tone}</div>
                    </div>

                    <button onClick={() => copyDraft(draft.full_post)}>Copy</button>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <strong>Hook</strong>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{draft.hook}</div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <strong>Body</strong>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{draft.body}</div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <strong>CTA</strong>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{draft.cta}</div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      border: "1px solid #eee",
                      borderRadius: 10,
                      background: "#fafafa",
                    }}
                  >
                    <strong>Full Post</strong>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                      {draft.full_post}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
              }}
            >
              Generate drafts to preview them here.
            </div>
          )}

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              marginTop: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Saved Drafts</div>

            {savedDrafts.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {savedDrafts.slice(0, 10).map((draft) => (
                  <div
                    key={draft.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {draft.angle_name || "Untitled angle"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
                      {draft.tone || "-"} • {new Date(draft.created_at).toLocaleString()}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{draft.full_post}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No saved LinkedIn drafts yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function buildLinkedInDrafts({
  topic,
  summary,
  site,
  toneMode,
  lengthMode,
}: {
  topic: string;
  summary: string;
  site: SiteContext;
  toneMode: string;
  lengthMode: string;
}): GeneratedDraft[] {
  const conciseSummary =
    summary?.trim() ||
    `This topic matters because it touches the tension many ${site.audience.toLowerCase()} feel but rarely say out loud.`;

  const drafts: GeneratedDraft[] = [
    buildIdentityShiftDraft(topic, conciseSummary, site, toneMode, lengthMode),
    buildValidationDraft(topic, conciseSummary, site, toneMode, lengthMode),
    buildContrarianDraft(topic, conciseSummary, site, toneMode, lengthMode),
  ];

  return drafts;
}

function buildIdentityShiftDraft(
  topic: string,
  summary: string,
  site: SiteContext,
  toneMode: string,
  lengthMode: string
): GeneratedDraft {
  const hook = [
    `You didn’t hit a ceiling because you lack strategy.`,
    `You hit it because the version of you that got results before may not be enough for what comes next.`,
  ].join("\n");

  const body = buildBody(
    [
      `A lot of capable people keep trying to solve a next-level problem with an old identity.`,
      `That’s why progress starts to feel heavier, even when effort goes up.`,
      `What used to make you dependable can quietly become what keeps you overextended, overcareful, or overresponsible.`,
      summary,
      `The painful part is this: most people don’t need more information first. They need permission to stop operating from a pattern they’ve already outgrown.`,
    ],
    lengthMode
  );

  const cta = `What’s one way of thinking that got you here… but might not take you where you want to go next?`;

  return finalizeDraft("Identity Shift", toneMode, hook, body, cta);
}

function buildValidationDraft(
  topic: string,
  summary: string,
  site: SiteContext,
  toneMode: string,
  lengthMode: string
): GeneratedDraft {
  const hook = [
    `Most people don’t stall because they’re lazy.`,
    `They stall because they’re still being loyal to a way of working that used to be rewarded.`,
  ].join("\n");

  const body = buildBody(
    [
      `That’s why smart, hardworking people can still feel stuck.`,
      `Not because they’re incapable.`,
      `Because they were trained to survive one level of pressure, then expected to lead through a completely different one.`,
      `And when the old methods stop working, they often blame themselves first.`,
      summary,
      `Sometimes the problem isn’t effort. It’s that the identity behind the effort no longer fits the role, season, or responsibility.`,
    ],
    lengthMode
  );

  const cta = `What have you been blaming yourself for… that might actually be a sign you’ve outgrown an old pattern?`;

  return finalizeDraft("Validation + Tension", toneMode, hook, body, cta);
}

function buildContrarianDraft(
  topic: string,
  summary: string,
  site: SiteContext,
  toneMode: string,
  lengthMode: string
): GeneratedDraft {
  const hook = [
    `The next breakthrough usually doesn’t come from doing more.`,
    `It comes from seeing what no longer deserves your loyalty.`,
  ].join("\n");

  const body = buildBody(
    [
      `That’s what makes topics like "${topic}" more important than most people realise.`,
      `Because the surface issue is rarely the real issue.`,
      `Behind performance problems, hesitation, burnout, or inconsistency, there is usually a hidden attachment to an identity, a role, or a rule that once felt safe.`,
      summary,
      `The hard truth is that old success patterns often feel responsible right up until they start limiting your future.`,
    ],
    lengthMode
  );

  const cta = `What are you still holding onto because it once worked… even though it may be costing you now?`;

  return finalizeDraft("Contrarian Realisation", toneMode, hook, body, cta);
}

function buildBody(lines: string[], lengthMode: string) {
  let selected = lines;

  if (lengthMode === "Short") {
    selected = lines.slice(0, 3);
  }

  if (lengthMode === "Standard") {
    selected = lines.slice(0, 5);
  }

  if (lengthMode === "Long") {
    selected = lines;
  }

  return selected.join("\n\n");
}

function finalizeDraft(
  angle_name: string,
  tone: string,
  hook: string,
  body: string,
  cta: string
): GeneratedDraft {
  const full_post = [hook, "", body, "", cta].join("\n");

  return {
    angle_name,
    tone,
    hook,
    body,
    cta,
    full_post,
  };
}

function extractSiteContext(row: UserSiteRow | null): SiteContext {
  if (!row) return EMPTY_SITE_CONTEXT;

  const profile = row.profile || {};
  const siteSetup = row.site_setup_state || {};

  const source = {
    ...siteSetup,
    ...profile,
  };

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value =
        source?.[key] ??
        profile?.[key] ??
        siteSetup?.[key] ??
        profile?.branding?.[key] ??
        profile?.business?.[key] ??
        profile?.site?.[key] ??
        siteSetup?.site?.[key] ??
        siteSetup?.profile?.[key];

      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };

  return {
    brandName:
      pick("brand_name", "site_name", "business_name", "company_name", "name") ||
      EMPTY_SITE_CONTEXT.brandName,
    websiteUrl:
      pick("website_url", "site_url", "url", "domain") ||
      EMPTY_SITE_CONTEXT.websiteUrl,
    niche:
      pick("niche", "industry", "topic", "site_topic", "business_type") ||
      EMPTY_SITE_CONTEXT.niche,
    audience:
      pick("target_audience", "audience", "ideal_reader", "market") ||
      EMPTY_SITE_CONTEXT.audience,
    region:
      pick("region", "location", "country", "market_region") ||
      EMPTY_SITE_CONTEXT.region,
    voice: pick("voice", "tone", "brand_voice") || EMPTY_SITE_CONTEXT.voice,
    coreOffer:
      pick("core_offer", "offer", "positioning", "value_proposition") ||
      EMPTY_SITE_CONTEXT.coreOffer,
  };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
