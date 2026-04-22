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
      setMessage(`Generated ${drafts.length} LinkedIn post angles in ${toneMode} / ${lengthMode} mode.`);
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
    <main style={{ padding: 24, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        LinkedIn Posts
      </h1>
      <p style={{ marginBottom: 20, opacity: 0.75, maxWidth: 900 }}>
        Turn blog ideas and articles into LinkedIn-ready posts with more tension, recognition, and reflective pull.
      </p>

      {message ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fafafa",
          }}
        >
          {message}
        </div>
      ) : null}

      {loading ? <div>Loading...</div> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Source</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button
                onClick={() => setSourceMode("blog")}
                style={{ background: sourceMode === "blog" ? "#f2f2f2" : "#fff" }}
              >
                Use Blog
              </button>
              <button
                onClick={() => setSourceMode("keyword")}
                style={{ background: sourceMode === "keyword" ? "#f2f2f2" : "#fff" }}
              >
                Use Keyword
              </button>
            </div>

            {sourceMode === "blog" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  style={{ width: "100%" }}
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
                      padding: 14,
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      {selectedPost.title}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
                      {selectedPost.excerpt || "No excerpt available."}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
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
          </section>

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
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
          </section>

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Site Context</div>
            <div style={{ fontSize: 14, lineHeight: 1.75 }}>
              <div><strong>Brand:</strong> {siteContext.brandName}</div>
              <div><strong>Website:</strong> {siteContext.websiteUrl || "-"}</div>
              <div><strong>Niche:</strong> {siteContext.niche}</div>
              <div><strong>Audience:</strong> {siteContext.audience}</div>
              <div><strong>Region:</strong> {siteContext.region}</div>
              <div><strong>Voice:</strong> {siteContext.voice}</div>
              <div><strong>Core offer:</strong> {siteContext.coreOffer}</div>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Generated Drafts</div>
                <div style={{ fontSize: 14, opacity: 0.75 }}>
                  The same source should produce different outputs when tone or length changes.
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
          </section>

          {generatedDrafts.length ? (
            <div style={{ display: "grid", gap: 16 }}>
              {generatedDrafts.map((draft, index) => (
                <section
                  key={`${draft.angle_name}-${index}`}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>
                        {draft.angle_name}
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>{draft.tone}</div>
                    </div>

                    <button onClick={() => copyDraft(draft.full_post)}>Copy</button>
                  </div>

                  <div style={{ display: "grid", gap: 16 }}>
                    <div>
                      <strong>Hook</strong>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          marginTop: 8,
                          lineHeight: 1.5,
                        }}
                      >
                        {draft.hook}
                      </div>
                    </div>

                    <div>
                      <strong>Body</strong>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          marginTop: 8,
                          lineHeight: 1.6,
                        }}
                      >
                        {draft.body}
                      </div>
                    </div>

                    <div>
                      <strong>CTA</strong>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          marginTop: 8,
                          lineHeight: 1.5,
                        }}
                      >
                        {draft.cta}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        padding: 14,
                        border: "1px solid #eee",
                        borderRadius: 10,
                        background: "#fafafa",
                      }}
                    >
                      <strong>Full Post</strong>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          marginTop: 8,
                          lineHeight: 1.6,
                        }}
                      >
                        {draft.full_post}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
              }}
            >
              Generate drafts to preview them here.
            </section>
          )}

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
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
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {draft.angle_name || "Untitled angle"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
                      {draft.tone || "-"} • {new Date(draft.created_at).toLocaleString()}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {draft.full_post}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No saved LinkedIn drafts yet.</div>
            )}
          </section>
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
  const baseSummary =
    summary?.trim() ||
    `This topic matters because it touches a tension many ${site.audience.toLowerCase()} feel but rarely say out loud.`;

  if (toneMode === "Blair Warren") {
    return [
      buildBlairDreamDraft(topic, baseSummary, lengthMode),
      buildBlairValidationDraft(topic, baseSummary, lengthMode),
      buildBlairEnemyDraft(topic, baseSummary, lengthMode),
    ];
  }

  if (toneMode === "Reflective") {
    return [
      buildReflectiveQuietDraft(topic, baseSummary, lengthMode),
      buildReflectiveIdentityDraft(topic, baseSummary, lengthMode),
      buildReflectivePermissionDraft(topic, baseSummary, lengthMode),
    ];
  }

  if (toneMode === "Thought Leadership") {
    return [
      buildThoughtLeadershipTrendDraft(topic, baseSummary, lengthMode),
      buildThoughtLeadershipMisreadDraft(topic, baseSummary, lengthMode),
      buildThoughtLeadershipShiftDraft(topic, baseSummary, lengthMode),
    ];
  }

  return [
    buildContrarianMythDraft(topic, baseSummary, lengthMode),
    buildContrarianCostDraft(topic, baseSummary, lengthMode),
    buildContrarianSignalDraft(topic, baseSummary, lengthMode),
  ];
}

function buildBlairDreamDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `Most people don’t want another strategy.`,
    `They want the version of life and work that strategy was supposed to give them.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s why topics like "${topic}" matter more than most people think.`,
        `People are not just chasing better tactics. They are trying to recover clarity, momentum, and self-respect.`,
        summary,
      ],
      Standard: [
        `That’s why topics like "${topic}" matter more than most people think.`,
        `People are not just chasing better tactics. They are trying to recover clarity, momentum, and self-respect.`,
        `A lot of smart people are exhausted not because they lack discipline, but because they’ve been pursuing results in ways that quietly disconnect them from who they want to become.`,
        summary,
        `When a message speaks to that deeper frustration, it stops feeling like content and starts feeling like recognition.`,
      ],
      Long: [
        `That’s why topics like "${topic}" matter more than most people think.`,
        `People are not just chasing better tactics. They are trying to recover clarity, momentum, and self-respect.`,
        `A lot of smart people are exhausted not because they lack discipline, but because they’ve been pursuing results in ways that quietly disconnect them from who they want to become.`,
        `The external problem gets attention.`,
        `The internal cost is what actually drives change.`,
        summary,
        `When a message speaks to that deeper frustration, it stops feeling like content and starts feeling like recognition.`,
      ],
    },
    lengthMode
  );

  const cta = `What are people really hoping to get back when they say they want better results?`;

  return finalizeDraft("Dream Beneath the Goal", "Blair Warren", hook, body, cta);
}

function buildBlairValidationDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `People don’t need to be shamed into change.`,
    `They need someone to explain why they ended up here in the first place.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s what makes "${topic}" powerful when handled properly.`,
        `Instead of telling people what they did wrong, it helps them see that they were playing by rules that no longer serve them.`,
        summary,
      ],
      Standard: [
        `That’s what makes "${topic}" powerful when handled properly.`,
        `Instead of telling people what they did wrong, it helps them see that they were playing by rules that no longer serve them.`,
        `Most people were not careless. They were responsible, loyal, and trying to do the right thing with the model they were given.`,
        summary,
        `The moment people feel understood instead of judged, they become open to a better path.`,
      ],
      Long: [
        `That’s what makes "${topic}" powerful when handled properly.`,
        `Instead of telling people what they did wrong, it helps them see that they were playing by rules that no longer serve them.`,
        `Most people were not careless. They were responsible, loyal, and trying to do the right thing with the model they were given.`,
        `And when that model stops working, they often turn the blame inward.`,
        `That is where good messaging changes everything.`,
        summary,
        `The moment people feel understood instead of judged, they become open to a better path.`,
      ],
    },
    lengthMode
  );

  const cta = `What if the problem wasn’t a lack of effort — but loyalty to an outdated way of operating?`;

  return finalizeDraft("Justify the Struggle", "Blair Warren", hook, body, cta);
}

function buildBlairEnemyDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `A lot of people are not failing because they’re weak.`,
    `They’re struggling because the system rewards the wrong things for too long.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s why "${topic}" hits a nerve.`,
        `It exposes the cost of staying loyal to patterns that once looked responsible but now quietly limit growth.`,
        summary,
      ],
      Standard: [
        `That’s why "${topic}" hits a nerve.`,
        `It exposes the cost of staying loyal to patterns that once looked responsible but now quietly limit growth.`,
        `The real enemy is not always laziness, lack of intelligence, or lack of ambition.`,
        `Sometimes it’s the inherited script people keep obeying long after it stops serving them.`,
        summary,
      ],
      Long: [
        `That’s why "${topic}" hits a nerve.`,
        `It exposes the cost of staying loyal to patterns that once looked responsible but now quietly limit growth.`,
        `The real enemy is not always laziness, lack of intelligence, or lack of ambition.`,
        `Sometimes it’s the inherited script people keep obeying long after it stops serving them.`,
        `And because that script feels familiar, they mistake it for truth.`,
        summary,
        `The more clearly you name the false loyalty, the more powerful the message becomes.`,
      ],
    },
    lengthMode
  );

  const cta = `What outdated script do people keep obeying because it still looks respectable on the surface?`;

  return finalizeDraft("Name the Hidden Enemy", "Blair Warren", hook, body, cta);
}

function buildReflectiveQuietDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `Sometimes the real shift doesn’t begin with action.`,
    `It begins with finally telling the truth about what no longer fits.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s why "${topic}" can land so deeply.`,
        `Not because it gives people more to do, but because it gives language to something they’ve been carrying quietly.`,
        summary,
      ],
      Standard: [
        `That’s why "${topic}" can land so deeply.`,
        `Not because it gives people more to do, but because it gives language to something they’ve been carrying quietly.`,
        `A lot of capable people don’t need another push. They need a moment of honesty.`,
        summary,
        `Once something is named clearly, it becomes much harder to keep pretending it isn’t there.`,
      ],
      Long: [
        `That’s why "${topic}" can land so deeply.`,
        `Not because it gives people more to do, but because it gives language to something they’ve been carrying quietly.`,
        `A lot of capable people don’t need another push. They need a moment of honesty.`,
        `They need room to admit that what used to feel aligned now feels heavy.`,
        `That is often where change starts.`,
        summary,
        `Once something is named clearly, it becomes much harder to keep pretending it isn’t there.`,
      ],
    },
    lengthMode
  );

  const cta = `What truth have you been sensing quietly, but haven’t fully admitted yet?`;

  return finalizeDraft("Quiet Recognition", "Reflective", hook, body, cta);
}

function buildReflectiveIdentityDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `You can be deeply capable and still feel misaligned.`,
    `Those two things are not a contradiction.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s part of what makes "${topic}" so important.`,
        `Sometimes the issue is not competence. It’s that your current way of operating no longer reflects who you are becoming.`,
        summary,
      ],
      Standard: [
        `That’s part of what makes "${topic}" so important.`,
        `Sometimes the issue is not competence. It’s that your current way of operating no longer reflects who you are becoming.`,
        `A lot of people feel guilt before they feel clarity.`,
        `They assume friction means failure, when it may actually be a sign of growth that has outpaced an old identity.`,
        summary,
      ],
      Long: [
        `That’s part of what makes "${topic}" so important.`,
        `Sometimes the issue is not competence. It’s that your current way of operating no longer reflects who you are becoming.`,
        `A lot of people feel guilt before they feel clarity.`,
        `They assume friction means failure, when it may actually be a sign of growth that has outpaced an old identity.`,
        `That is why certain seasons feel confusing before they feel liberating.`,
        summary,
        `Not every tension is a warning. Some tensions are invitations.`,
      ],
    },
    lengthMode
  );

  const cta = `Where in your life are you mistaking misalignment for inadequacy?`;

  return finalizeDraft("Identity Misalignment", "Reflective", hook, body, cta);
}

function buildReflectivePermissionDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `Growth often looks messy before it looks obvious.`,
    `That doesn’t make it wrong.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s one reason "${topic}" matters.`,
        `It can give people permission to stop forcing themselves into patterns that used to work but no longer feel true.`,
        summary,
      ],
      Standard: [
        `That’s one reason "${topic}" matters.`,
        `It can give people permission to stop forcing themselves into patterns that used to work but no longer feel true.`,
        `A lot of people do not need permission to work harder. They need permission to change shape without calling it failure.`,
        summary,
        `That shift alone can be enough to change the way they move forward.`,
      ],
      Long: [
        `That’s one reason "${topic}" matters.`,
        `It can give people permission to stop forcing themselves into patterns that used to work but no longer feel true.`,
        `A lot of people do not need permission to work harder. They need permission to change shape without calling it failure.`,
        `They need to know that letting go of one version of success is not betrayal.`,
        `Sometimes it is maturity.`,
        summary,
        `That shift alone can be enough to change the way they move forward.`,
      ],
    },
    lengthMode
  );

  const cta = `What would change if you stopped treating evolution as disloyalty?`;

  return finalizeDraft("Permission to Evolve", "Reflective", hook, body, cta);
}

function buildThoughtLeadershipTrendDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `The most valuable shifts in leadership are rarely tactical first.`,
    `They are interpretive.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s why "${topic}" deserves more serious attention.`,
        `What leaders notice, tolerate, and normalise often shapes outcomes long before any formal strategy does.`,
        summary,
      ],
      Standard: [
        `That’s why "${topic}" deserves more serious attention.`,
        `What leaders notice, tolerate, and normalise often shapes outcomes long before any formal strategy does.`,
        `In many organisations, the visible issue gets all the focus while the interpretive habits underneath it go untouched.`,
        summary,
        `That is usually where the deeper leverage sits.`,
      ],
      Long: [
        `That’s why "${topic}" deserves more serious attention.`,
        `What leaders notice, tolerate, and normalise often shapes outcomes long before any formal strategy does.`,
        `In many organisations, the visible issue gets all the focus while the interpretive habits underneath it go untouched.`,
        `The result is predictable: more intervention, less real change.`,
        `The sharper question is not only what people are doing.`,
        `It is how they are making sense of what they are doing.`,
        summary,
      ],
    },
    lengthMode
  );

  const cta = `What are leaders still treating as a tactical issue when it is actually an interpretive one?`;

  return finalizeDraft("Interpretive Leadership Shift", "Thought Leadership", hook, body, cta);
}

function buildThoughtLeadershipMisreadDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `One of the biggest mistakes in professional development is misdiagnosis.`,
    `People try to fix what is visible and ignore what is driving it.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That is why "${topic}" is more than a surface conversation.`,
        `When the diagnosis is shallow, the solution becomes performative.`,
        summary,
      ],
      Standard: [
        `That is why "${topic}" is more than a surface conversation.`,
        `When the diagnosis is shallow, the solution becomes performative.`,
        `Many leaders are not short on frameworks. They are short on accurate interpretation.`,
        summary,
        `That difference changes the quality of every downstream decision.`,
      ],
      Long: [
        `That is why "${topic}" is more than a surface conversation.`,
        `When the diagnosis is shallow, the solution becomes performative.`,
        `Many leaders are not short on frameworks. They are short on accurate interpretation.`,
        `And when interpretation is weak, effort multiplies while effectiveness stalls.`,
        `This is where more mature leadership begins: not with more motion, but with better reading of what is actually going on.`,
        summary,
      ],
    },
    lengthMode
  );

  const cta = `Where are we still solving symptoms because they are easier to discuss than the real driver?`;

  return finalizeDraft("The Cost of Misdiagnosis", "Thought Leadership", hook, body, cta);
}

function buildThoughtLeadershipShiftDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `Real authority does not come from having the most answers.`,
    `It comes from naming the shift others have sensed but not yet articulated.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That is what makes "${topic}" strategically useful.`,
        `When you name the shift accurately, people stop hearing information and start hearing relevance.`,
        summary,
      ],
      Standard: [
        `That is what makes "${topic}" strategically useful.`,
        `When you name the shift accurately, people stop hearing information and start hearing relevance.`,
        `Strong thought leadership does not flood people with insight.`,
        `It sharpens their ability to interpret what they were already living through.`,
        summary,
      ],
      Long: [
        `That is what makes "${topic}" strategically useful.`,
        `When you name the shift accurately, people stop hearing information and start hearing relevance.`,
        `Strong thought leadership does not flood people with insight.`,
        `It sharpens their ability to interpret what they were already living through.`,
        `That is why some content gets politely consumed while other content changes the way people think.`,
        summary,
        `The difference is not volume. It is precision of framing.`,
      ],
    },
    lengthMode
  );

  const cta = `What shift does your audience already feel — but still lacks language for?`;

  return finalizeDraft("Name the Shift", "Thought Leadership", hook, body, cta);
}

function buildContrarianMythDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `The usual advice sounds good because it is familiar.`,
    `That does not mean it is still useful.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s why "${topic}" deserves a more honest conversation.`,
        `A lot of accepted advice keeps people busy while quietly preserving the problem.`,
        summary,
      ],
      Standard: [
        `That’s why "${topic}" deserves a more honest conversation.`,
        `A lot of accepted advice keeps people busy while quietly preserving the problem.`,
        `The most dangerous ideas are not always obviously wrong.`,
        `They are the ones that still sound reasonable long after they stop producing results.`,
        summary,
      ],
      Long: [
        `That’s why "${topic}" deserves a more honest conversation.`,
        `A lot of accepted advice keeps people busy while quietly preserving the problem.`,
        `The most dangerous ideas are not always obviously wrong.`,
        `They are the ones that still sound reasonable long after they stop producing results.`,
        `That is what makes certain patterns so hard to confront.`,
        summary,
        `Familiarity protects weak ideas from scrutiny.`,
      ],
    },
    lengthMode
  );

  const cta = `Which piece of accepted advice still sounds smart — but no longer produces anything worth defending?`;

  return finalizeDraft("Challenge the Accepted Myth", "Contrarian", hook, body, cta);
}

function buildContrarianCostDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `Not every responsible-looking decision is actually responsible.`,
    `Some are just expensive habits with good branding.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That’s why "${topic}" matters.`,
        `A pattern can look disciplined on the outside while quietly draining momentum, confidence, or relevance underneath.`,
        summary,
      ],
      Standard: [
        `That’s why "${topic}" matters.`,
        `A pattern can look disciplined on the outside while quietly draining momentum, confidence, or relevance underneath.`,
        `A lot of people keep defending costly habits because the habit still carries social approval.`,
        summary,
        `But approval and effectiveness are not the same thing.`,
      ],
      Long: [
        `That’s why "${topic}" matters.`,
        `A pattern can look disciplined on the outside while quietly draining momentum, confidence, or relevance underneath.`,
        `A lot of people keep defending costly habits because the habit still carries social approval.`,
        `It looks mature. It sounds responsible. It feels safe.`,
        `And that is exactly why it survives longer than it should.`,
        summary,
        `But approval and effectiveness are not the same thing.`,
      ],
    },
    lengthMode
  );

  const cta = `What habit still looks responsible on paper — but is getting more expensive every quarter?`;

  return finalizeDraft("The Hidden Cost", "Contrarian", hook, body, cta);
}

function buildContrarianSignalDraft(topic: string, summary: string, lengthMode: string): GeneratedDraft {
  const hook = [
    `What people call resistance is often information.`,
    `They just do not know how to read it yet.`,
  ].join("\n");

  const body = bodyByLength(
    {
      Short: [
        `That changes the way "${topic}" should be handled.`,
        `Not every hesitation is a weakness. Sometimes it is a signal that the current approach is misaligned.`,
        summary,
      ],
      Standard: [
        `That changes the way "${topic}" should be handled.`,
        `Not every hesitation is a weakness. Sometimes it is a signal that the current approach is misaligned.`,
        `The contrarian move is not to push harder by default.`,
        `It is to ask whether the friction is revealing something the old model cannot explain.`,
        summary,
      ],
      Long: [
        `That changes the way "${topic}" should be handled.`,
        `Not every hesitation is a weakness. Sometimes it is a signal that the current approach is misaligned.`,
        `The contrarian move is not to push harder by default.`,
        `It is to ask whether the friction is revealing something the old model cannot explain.`,
        `That question alone can expose a better path faster than another round of force.`,
        summary,
      ],
    },
    lengthMode
  );

  const cta = `What if the friction you keep fighting is actually trying to tell you something useful?`;

  return finalizeDraft("Friction as Signal", "Contrarian", hook, body, cta);
}

function bodyByLength(
  variants: {
    Short: string[];
    Standard: string[];
    Long: string[];
  },
  lengthMode: string
) {
  if (lengthMode === "Short") return variants.Short.join("\n\n");
  if (lengthMode === "Long") return variants.Long.join("\n\n");
  return variants.Standard.join("\n\n");
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
