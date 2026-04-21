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

type BacklinkProject = {
  id: string;
  blog_post_id: string | null;
  blog_draft_id?: string | null;
  user_id: string;
  status: string;
  link_worthy_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type BacklinkOpportunity = {
  id: string;
  backlink_project_id: string;
  domain: string;
  page_title: string | null;
  page_url: string | null;
  relevance_reason: string | null;
  outreach_angle: string | null;
  status: string;
  created_at: string;
};

type BacklinkOutreach = {
  id: string;
  backlink_opportunity_id: string;
  subject_line: string;
  message_body: string;
  status: string;
  sent_at: string | null;
  reply_note: string | null;
  created_at: string;
};

type BacklinkLink = {
  id: string;
  backlink_project_id: string;
  source_domain: string;
  source_url: string | null;
  target_url: string | null;
  anchor_text: string | null;
  status: string;
  acquired_at: string | null;
  created_at: string;
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

type Suggestion = {
  domain: string;
  page_title: string;
  page_url: string;
  relevance_reason: string;
  outreach_angle: string;
};

type TabKey = "overview" | "opportunities" | "outreach" | "tracker";

const EMPTY_SITE_CONTEXT: SiteContext = {
  brandName: "our site",
  websiteUrl: "",
  niche: "practical business content",
  audience: "professionals",
  region: "our market",
  voice: "practical and credible",
  coreOffer: "useful expert-led resources",
};

export default function BacklinksPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [projects, setProjects] = useState<BacklinkProject[]>([]);
  const [opportunities, setOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [outreachRows, setOutreachRows] = useState<BacklinkOutreach[]>([]);
  const [links, setLinks] = useState<BacklinkLink[]>([]);
  const [userSite, setUserSite] = useState<UserSiteRow | null>(null);

  const [selectedPostId, setSelectedPostId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [notes, setNotes] = useState("");

  const [newOpportunity, setNewOpportunity] = useState({
    domain: "",
    page_title: "",
    page_url: "",
    relevance_reason: "",
    outreach_angle: "",
  });

  const [newLink, setNewLink] = useState({
    source_domain: "",
    source_url: "",
    target_url: "",
    anchor_text: "",
    status: "pending",
    acquired_at: "",
  });

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.blog_post_id === selectedPostId) || null,
    [projects, selectedPostId]
  );

  const selectedOpportunities = useMemo(() => {
    if (!selectedProject) return [];
    return opportunities.filter((o) => o.backlink_project_id === selectedProject.id);
  }, [opportunities, selectedProject]);

  const selectedOutreach = useMemo(() => {
    const ids = new Set(selectedOpportunities.map((o) => o.id));
    return outreachRows.filter((o) => ids.has(o.backlink_opportunity_id));
  }, [outreachRows, selectedOpportunities]);

  const selectedLinks = useMemo(() => {
    if (!selectedProject) return [];
    return links.filter((l) => l.backlink_project_id === selectedProject.id);
  }, [links, selectedProject]);

  const siteContext = useMemo(() => {
    return extractSiteContext(userSite);
  }, [userSite]);

  useEffect(() => {
    setNotes(selectedProject?.notes || "");
  }, [selectedProject]);

  function getProjectForPost(postId: string) {
    return projects.find((p) => p.blog_post_id === postId);
  }

  async function loadAll() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const [postsRes, projectsRes, oppsRes, outreachRes, linksRes, siteRes] =
        await Promise.all([
          supabase
            .from("blog_posts")
            .select("id,title,excerpt,status,created_at,updated_at")
            .order("created_at", { ascending: false }),

          supabase
            .from("backlink_projects")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false }),

          supabase
            .from("backlink_opportunities")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("backlink_outreach")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("backlink_links")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("user_sites")
            .select("profile,site_setup_state")
            .eq("user_id", user.id)
            .limit(1),
        ]);

      if (postsRes.error) throw postsRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (oppsRes.error) throw oppsRes.error;
      if (outreachRes.error) throw outreachRes.error;
      if (linksRes.error) throw linksRes.error;
      if (siteRes.error) throw siteRes.error;

      const nextPosts = (postsRes.data || []) as BlogPost[];
      const nextProjects = (projectsRes.data || []) as BacklinkProject[];
      const projectIds = new Set(nextProjects.map((p) => p.id));

      const nextOpportunities = ((oppsRes.data || []) as BacklinkOpportunity[]).filter((o) =>
        projectIds.has(o.backlink_project_id)
      );

      const opportunityIds = new Set(nextOpportunities.map((o) => o.id));

      const nextOutreach = ((outreachRes.data || []) as BacklinkOutreach[]).filter((o) =>
        opportunityIds.has(o.backlink_opportunity_id)
      );

      const nextLinks = ((linksRes.data || []) as BacklinkLink[]).filter((l) =>
        projectIds.has(l.backlink_project_id)
      );

      const nextUserSite = ((siteRes.data || [])[0] || null) as UserSiteRow | null;

      setPosts(nextPosts);
      setProjects(nextProjects);
      setOpportunities(nextOpportunities);
      setOutreachRows(nextOutreach);
      setLinks(nextLinks);
      setUserSite(nextUserSite);

      const urlPostId = searchParams.get("postId");
      if (urlPostId && nextPosts.some((p) => p.id === urlPostId)) {
        setSelectedPostId(urlPostId);
      } else if (nextPosts.length > 0) {
        setSelectedPostId(nextPosts[0].id);
      }
    } catch (err: any) {
      setMessage(err?.message || "Failed to load backlinks workspace.");
    } finally {
      setLoading(false);
    }
  }

  function calculateLinkWorthiness(post: BlogPost) {
    const text = `${post.title || ""} ${post.excerpt || ""}`;
    let score = 30;

    if (text.length > 300) score += 15;
    if (/\bguide\b|\bplaybook\b|\bframework\b|\bchecklist\b|\bstrategy\b/i.test(text)) {
      score += 20;
    }
    if (/\bhow to\b|\bwhy\b|\bwhat\b/i.test(text)) {
      score += 10;
    }
    if (
      /\bSingapore\b|\bMalaysia\b|\bexecutive\b|\bleadership\b|\bmarketing\b|\bAI\b/i.test(
        text
      )
    ) {
      score += 15;
    }
    if ((post.excerpt || "").length > 80) score += 10;

    return Math.min(score, 100);
  }

  async function ensureProjectForSelectedPost(): Promise<BacklinkProject | null> {
    if (!selectedPost) return null;

    const existing = getProjectForPost(selectedPost.id);
    if (existing) return existing;

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error("Not signed in.");

    const { data, error } = await supabase
      .from("backlink_projects")
      .insert({
        blog_post_id: selectedPost.id,
        blog_draft_id: null,
        user_id: user.id,
        status: "not_prepared",
        link_worthy_score: calculateLinkWorthiness(selectedPost),
        notes: "",
      })
      .select()
      .single();

    if (error) throw error;

    const created = data as BacklinkProject;
    setProjects((prev) => [created, ...prev]);
    return created;
  }

  async function createBacklinkProject() {
    if (!selectedPost) return;

    setBusy(true);
    setMessage("");

    try {
      const existing = getProjectForPost(selectedPost.id);
      if (existing) {
        setMessage("Backlink project already exists for this post.");
        return;
      }

      await ensureProjectForSelectedPost();
      setMessage("Backlink project created.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to create backlink project.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!selectedProject) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("backlink_projects")
        .update({ notes })
        .eq("id", selectedProject.id)
        .select()
        .single();

      if (error) throw error;

      setProjects((prev) => prev.map((p) => (p.id === selectedProject.id ? data : p)));
      setMessage("Notes saved.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to save notes.");
    } finally {
      setBusy(false);
    }
  }

  async function updateProjectStatus(status: string) {
    if (!selectedProject) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("backlink_projects")
        .update({ status })
        .eq("id", selectedProject.id)
        .select()
        .single();

      if (error) throw error;

      setProjects((prev) => prev.map((p) => (p.id === selectedProject.id ? data : p)));
      setMessage(`Project status updated to ${status}.`);
    } catch (err: any) {
      setMessage(err?.message || "Failed to update project status.");
    } finally {
      setBusy(false);
    }
  }

  async function addOpportunity() {
    const project = selectedProject || (await ensureProjectForSelectedPost());
    if (!project) return;

    if (!newOpportunity.domain.trim()) {
      setMessage("Target site / publication is required.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("backlink_opportunities")
        .insert({
          backlink_project_id: project.id,
          domain: newOpportunity.domain.trim(),
          page_title: newOpportunity.page_title.trim() || null,
          page_url: newOpportunity.page_url.trim() || null,
          relevance_reason: newOpportunity.relevance_reason.trim() || null,
          outreach_angle: newOpportunity.outreach_angle.trim() || null,
          status: "not_contacted",
        })
        .select()
        .single();

      if (error) throw error;

      const createdOpportunity = data as BacklinkOpportunity;
      setOpportunities((prev) => [createdOpportunity, ...prev]);

      const draft = buildOutreachDraft(
        selectedPost!,
        siteContext,
        createdOpportunity
      );

      const outreachInsert = await supabase
        .from("backlink_outreach")
        .insert({
          backlink_opportunity_id: createdOpportunity.id,
          subject_line: draft.subject_line,
          message_body: draft.message_body,
          status: "draft",
        })
        .select()
        .single();

      if (outreachInsert.error) throw outreachInsert.error;

      setOutreachRows((prev) => [outreachInsert.data as BacklinkOutreach, ...prev]);

      setNewOpportunity({
        domain: "",
        page_title: "",
        page_url: "",
        relevance_reason: "",
        outreach_angle: "",
      });

      setMessage("Opportunity and outreach draft added.");
      setActiveTab("outreach");
    } catch (err: any) {
      setMessage(err?.message || "Failed to add opportunity.");
    } finally {
      setBusy(false);
    }
  }

  async function addLinkRecord() {
    if (!selectedProject) return;
    if (!newLink.source_domain.trim()) {
      setMessage("Source domain is required.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("backlink_links")
        .insert({
          backlink_project_id: selectedProject.id,
          source_domain: newLink.source_domain.trim(),
          source_url: newLink.source_url.trim() || null,
          target_url: newLink.target_url.trim() || null,
          anchor_text: newLink.anchor_text.trim() || null,
          status: newLink.status,
          acquired_at: newLink.acquired_at || null,
        })
        .select()
        .single();

      if (error) throw error;

      setLinks((prev) => [data as BacklinkLink, ...prev]);
      setNewLink({
        source_domain: "",
        source_url: "",
        target_url: "",
        anchor_text: "",
        status: "pending",
        acquired_at: "",
      });
      setMessage("Link record added.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to add link.");
    } finally {
      setBusy(false);
    }
  }

  async function generateAiSuggestionsAndOutreach() {
    if (!selectedPost) return;

    setBusy(true);
    setMessage("");

    try {
      const project = selectedProject || (await ensureProjectForSelectedPost());
      if (!project) throw new Error("Could not create or load backlink project.");

      const suggestions = buildSmartSuggestions(selectedPost, siteContext);

      if (!suggestions.length) {
        setMessage("No AI suggestions generated.");
        return;
      }

      const existingDomains = new Set(
        selectedOpportunities.map((o) => o.domain.trim().toLowerCase())
      );

      const uniqueSuggestions = suggestions.filter(
        (item) => !existingDomains.has(item.domain.trim().toLowerCase())
      );

      if (!uniqueSuggestions.length) {
        setMessage("Suggestions already exist for this post.");
        setActiveTab("outreach");
        return;
      }

      const opportunityRows = uniqueSuggestions.map((item) => ({
        backlink_project_id: project.id,
        domain: item.domain,
        page_title: item.page_title,
        page_url: item.page_url || null,
        relevance_reason: item.relevance_reason,
        outreach_angle: item.outreach_angle,
        status: "planned",
      }));

      const oppInsert = await supabase
        .from("backlink_opportunities")
        .insert(opportunityRows)
        .select();

      if (oppInsert.error) throw oppInsert.error;

      const createdOpportunities = (oppInsert.data || []) as BacklinkOpportunity[];
      setOpportunities((prev) => [...createdOpportunities, ...prev]);

      const outreachRowsToInsert = createdOpportunities.map((opportunity) => {
        const draft = buildOutreachDraft(selectedPost, siteContext, opportunity);
        return {
          backlink_opportunity_id: opportunity.id,
          subject_line: draft.subject_line,
          message_body: draft.message_body,
          status: "draft",
        };
      });

      const outreachInsert = await supabase
        .from("backlink_outreach")
        .insert(outreachRowsToInsert)
        .select();

      if (outreachInsert.error) throw outreachInsert.error;

      const createdOutreach = (outreachInsert.data || []) as BacklinkOutreach[];
      setOutreachRows((prev) => [...createdOutreach, ...prev]);

      setMessage(
        `Generated ${createdOpportunities.length} opportunities and ${createdOutreach.length} outreach drafts.`
      );
      setActiveTab("outreach");
    } catch (err: any) {
      setMessage(err?.message || "Failed to generate AI backlink opportunities.");
    } finally {
      setBusy(false);
    }
  }

  function buildSmartSuggestions(post: BlogPost, site: SiteContext): Suggestion[] {
    const text = `${post.title || ""} ${post.excerpt || ""}`.toLowerCase();
    const suggestions: Suggestion[] = [];

    const region = site.region || "regional";
    const audience = site.audience || "professionals";
    const niche = site.niche || "business";
    const brand = site.brandName || "our site";

    const hasLeadership =
      text.includes("leadership") || text.includes("executive");
    const hasMarketing = text.includes("marketing");
    const hasAi = text.includes("ai");
    const hasSingapore = text.includes("singapore");
    const hasMalaysia = text.includes("malaysia");

    suggestions.push({
      domain: `${region} business publication`,
      page_title: `${region} business insights`,
      page_url: "",
      relevance_reason: `This post is relevant to ${region}-focused readers interested in ${niche}.`,
      outreach_angle: `Position the article as a practical resource for ${audience} in ${region}.`,
    });

    suggestions.push({
      domain: `${niche} roundup / curated resource page`,
      page_title: `${niche} resource roundup`,
      page_url: "",
      relevance_reason: `The post is educational and could fit a curated roundup or expert resource page.`,
      outreach_angle: `Lead with clarity, usefulness, and direct value for readers looking for concise expert guidance.`,
    });

    if (hasLeadership) {
      suggestions.push({
        domain: `executive leadership resource hub`,
        page_title: `leadership resources`,
        page_url: "",
        relevance_reason: `This post speaks directly to executives, leadership development, and decision-making themes.`,
        outreach_angle: `Present it as a practical leadership reference rather than a generic opinion piece.`,
      });
    }

    if (hasMarketing || hasAi) {
      suggestions.push({
        domain: `AI and digital strategy publication`,
        page_title: `digital growth library`,
        page_url: "",
        relevance_reason: `The post overlaps with current AI, digital growth, and marketing strategy conversations.`,
        outreach_angle: `Frame it as a grounded business-use article, not hype-driven AI commentary.`,
      });
    }

    if (hasSingapore || hasMalaysia) {
      suggestions.push({
        domain: `Singapore / Malaysia professional publication`,
        page_title: `regional professional insights`,
        page_url: "",
        relevance_reason: `The post has direct local relevance and may fit publications serving Singapore and Malaysia audiences.`,
        outreach_angle: `Pitch the article as locally relevant, practical, and immediately useful for professionals in the region.`,
      });
    }

    suggestions.push({
      domain: `${brand} guest contribution target`,
      page_title: `guest contribution / expert opinion`,
      page_url: "",
      relevance_reason: `This post can also be reframed as a guest contribution to extend reach and brand authority.`,
      outreach_angle: `Offer a shortened adapted version or summary tailored to the publication’s readers.`,
    });

    return dedupeSuggestions(suggestions).slice(0, 5);
  }

  function buildOutreachDraft(
    post: BlogPost,
    site: SiteContext,
    opportunity: Pick<
      BacklinkOpportunity,
      "domain" | "page_title" | "relevance_reason" | "outreach_angle"
    >
  ) {
    const brand = site.brandName || "our site";
    const website = site.websiteUrl ? ` (${site.websiteUrl})` : "";
    const audience = site.audience || "professionals";
    const niche = site.niche || "business";
    const region = site.region || "our market";
    const coreOffer = site.coreOffer || "useful expert-led resources";

    const subject_line = `Possible resource fit: ${post.title}`;

    const message_body = [
      `Hi ${opportunity.domain} team,`,
      "",
      `I'm reaching out from ${brand}${website}. We publish ${niche} content for ${audience} in ${region}.`,
      "",
      `We recently published: "${post.title}"`,
      post.excerpt ? `Summary: ${post.excerpt}` : "",
      "",
      `Why it may fit your audience: ${opportunity.relevance_reason || "It is practical, relevant, and audience-focused."}`,
      `Suggested angle: ${opportunity.outreach_angle || "A concise expert resource your readers can apply immediately."}`,
      "",
      `The piece supports our broader focus on ${coreOffer}.`,
      "",
      `If helpful, I'm happy to send over the link or a short adapted summary for review.`,
      "",
      `Best,`,
      `${brand}`,
    ]
      .filter(Boolean)
      .join("\n");

    return { subject_line, message_body };
  }

  function dedupeSuggestions(items: Suggestion[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.domain.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

    const brandName =
      pick(
        "brand_name",
        "site_name",
        "business_name",
        "company_name",
        "name"
      ) || EMPTY_SITE_CONTEXT.brandName;

    const websiteUrl =
      pick("website_url", "site_url", "url", "domain") || EMPTY_SITE_CONTEXT.websiteUrl;

    const niche =
      pick("niche", "industry", "topic", "site_topic", "business_type") ||
      EMPTY_SITE_CONTEXT.niche;

    const audience =
      pick("target_audience", "audience", "ideal_reader", "market") ||
      EMPTY_SITE_CONTEXT.audience;

    const region =
      pick("region", "location", "country", "market_region") ||
      EMPTY_SITE_CONTEXT.region;

    const voice =
      pick("voice", "tone", "brand_voice") || EMPTY_SITE_CONTEXT.voice;

    const coreOffer =
      pick("core_offer", "offer", "positioning", "value_proposition") ||
      EMPTY_SITE_CONTEXT.coreOffer;

    return {
      brandName,
      websiteUrl,
      niche,
      audience,
      region,
      voice,
      coreOffer,
    };
  }

  function pill(status: string) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 8px",
          border: "1px solid #ccc",
          borderRadius: 999,
          fontSize: 12,
        }}
      >
        {status}
      </span>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Backlinks Workspace
      </h1>
      <p style={{ marginBottom: 20, opacity: 0.7 }}>
        Turn blog posts into authority assets, smarter outreach opportunities, and tracked backlinks.
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
        <div style={{ width: 340 }}>
          <h3 style={{ marginBottom: 12 }}>Blog posts</h3>

          <div style={{ display: "grid", gap: 10 }}>
            {posts.map((post) => {
              const project = getProjectForPost(post.id);

              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    border: "1px solid #ccc",
                    borderRadius: 10,
                    background: selectedPostId === post.id ? "#f2f2f2" : "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{post.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                    {post.status}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {project ? pill(project.status) : null}
                    {project ? (
                      <span style={{ fontSize: 12 }}>Score: {project.link_worthy_score}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {!selectedPost ? (
            <div>Select a post</div>
          ) : (
            <>
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0, marginBottom: 8 }}>{selectedPost.title}</h2>
                <p style={{ margin: 0, opacity: 0.75 }}>
                  {selectedPost.excerpt || "No excerpt available."}
                </p>

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {!selectedProject ? (
                    <>
                      <button onClick={createBacklinkProject} disabled={busy}>
                        {busy ? "Working..." : "Create Backlink Project"}
                      </button>
                      <button onClick={generateAiSuggestionsAndOutreach} disabled={busy}>
                        AI Backlink Finder
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => updateProjectStatus("ready")} disabled={busy}>
                        Mark Ready
                      </button>
                      <button
                        onClick={() => updateProjectStatus("outreach_in_progress")}
                        disabled={busy}
                      >
                        Start Outreach
                      </button>
                      <button onClick={generateAiSuggestionsAndOutreach} disabled={busy}>
                        AI Backlink Finder
                      </button>
                    </>
                  )}
                </div>
              </div>

              {selectedProject ? (
                <>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <button onClick={() => setActiveTab("overview")}>Overview</button>
                    <button onClick={() => setActiveTab("opportunities")}>Opportunities</button>
                    <button onClick={() => setActiveTab("outreach")}>Outreach</button>
                    <button onClick={() => setActiveTab("tracker")}>Link Tracker</button>
                  </div>

                  {activeTab === "overview" ? (
                    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                      <h3>Overview</h3>
                      <div style={{ marginBottom: 10 }}>Status: {pill(selectedProject.status)}</div>
                      <div style={{ marginBottom: 10 }}>
                        Link-worthy score: {selectedProject.link_worthy_score}
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        Opportunities: {selectedOpportunities.length}
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        Outreach drafts: {selectedOutreach.length}
                      </div>
                      <div style={{ marginBottom: 16 }}>Links tracked: {selectedLinks.length}</div>

                      <div
                        style={{
                          marginBottom: 16,
                          padding: 12,
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          background: "#fafafa",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Site profile</div>
                        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                          <div><strong>Brand:</strong> {siteContext.brandName}</div>
                          <div><strong>Website:</strong> {siteContext.websiteUrl || "-"}</div>
                          <div><strong>Niche:</strong> {siteContext.niche}</div>
                          <div><strong>Audience:</strong> {siteContext.audience}</div>
                          <div><strong>Region:</strong> {siteContext.region}</div>
                          <div><strong>Voice:</strong> {siteContext.voice}</div>
                          <div><strong>Core offer:</strong> {siteContext.coreOffer}</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 8, fontWeight: 600 }}>Notes</div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={8}
                        style={{ width: "100%", marginBottom: 10 }}
                      />
                      <button onClick={saveNotes} disabled={busy}>
                        Save Notes
                      </button>
                    </div>
                  ) : null}

                  {activeTab === "opportunities" ? (
                    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                      <h3>Opportunities</h3>

                      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                        <input
                          placeholder="Target site / publication"
                          value={newOpportunity.domain}
                          onChange={(e) =>
                            setNewOpportunity((prev) => ({ ...prev, domain: e.target.value }))
                          }
                        />
                        <input
                          placeholder="Page title"
                          value={newOpportunity.page_title}
                          onChange={(e) =>
                            setNewOpportunity((prev) => ({ ...prev, page_title: e.target.value }))
                          }
                        />
                        <input
                          placeholder="Page URL"
                          value={newOpportunity.page_url}
                          onChange={(e) =>
                            setNewOpportunity((prev) => ({ ...prev, page_url: e.target.value }))
                          }
                        />
                        <textarea
                          placeholder="Why relevant"
                          value={newOpportunity.relevance_reason}
                          onChange={(e) =>
                            setNewOpportunity((prev) => ({
                              ...prev,
                              relevance_reason: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                        <textarea
                          placeholder="Outreach angle"
                          value={newOpportunity.outreach_angle}
                          onChange={(e) =>
                            setNewOpportunity((prev) => ({
                              ...prev,
                              outreach_angle: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                        <button onClick={addOpportunity} disabled={busy}>
                          Add Opportunity + Draft
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {selectedOpportunities.map((opportunity) => (
                          <div
                            key={opportunity.id}
                            style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{opportunity.domain}</div>
                            <div style={{ marginBottom: 6 }}>{pill(opportunity.status)}</div>
                            <div style={{ fontSize: 14, marginBottom: 6 }}>
                              {opportunity.page_title || "No page title"}
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>
                              {opportunity.relevance_reason || "No relevance reason"}
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.8 }}>
                              {opportunity.outreach_angle || "No outreach angle"}
                            </div>
                          </div>
                        ))}

                        {selectedOpportunities.length === 0 ? <div>No opportunities yet.</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "outreach" ? (
                    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                      <h3>Outreach drafts</h3>

                      <div style={{ display: "grid", gap: 12 }}>
                        {selectedOutreach.map((row) => {
                          const opp = selectedOpportunities.find(
                            (o) => o.id === row.backlink_opportunity_id
                          );

                          return (
                            <div
                              key={row.id}
                              style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                {opp?.domain || "Opportunity"}
                              </div>
                              <div style={{ marginBottom: 6 }}>Subject: {row.subject_line}</div>
                              <pre
                                style={{
                                  whiteSpace: "pre-wrap",
                                  margin: 0,
                                  fontFamily: "inherit",
                                }}
                              >
                                {row.message_body}
                              </pre>
                            </div>
                          );
                        })}

                        {selectedOutreach.length === 0 ? <div>No outreach drafts yet.</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "tracker" ? (
                    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                      <h3>Link Tracker</h3>

                      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                        <input
                          placeholder="Source domain"
                          value={newLink.source_domain}
                          onChange={(e) =>
                            setNewLink((prev) => ({ ...prev, source_domain: e.target.value }))
                          }
                        />
                        <input
                          placeholder="Source URL"
                          value={newLink.source_url}
                          onChange={(e) =>
                            setNewLink((prev) => ({ ...prev, source_url: e.target.value }))
                          }
                        />
                        <input
                          placeholder="Target URL"
                          value={newLink.target_url}
                          onChange={(e) =>
                            setNewLink((prev) => ({ ...prev, target_url: e.target.value }))
                          }
                        />
                        <input
                          placeholder="Anchor text"
                          value={newLink.anchor_text}
                          onChange={(e) =>
                            setNewLink((prev) => ({ ...prev, anchor_text: e.target.value }))
                          }
                        />
                        <input
                          placeholder="Acquired date (YYYY-MM-DD)"
                          value={newLink.acquired_at}
                          onChange={(e) =>
                            setNewLink((prev) => ({ ...prev, acquired_at: e.target.value }))
                          }
                        />
                        <select
                          value={newLink.status}
                          onChange={(e) =>
                            setNewLink((prev) => ({ ...prev, status: e.target.value }))
                          }
                        >
                          <option value="pending">pending</option>
                          <option value="verified">verified</option>
                        </select>

                        <button onClick={addLinkRecord} disabled={busy}>
                          Add Link Record
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {selectedLinks.map((link) => (
                          <div
                            key={link.id}
                            style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
                          >
                            <div style={{ fontWeight: 700 }}>{link.source_domain}</div>
                            <div style={{ marginTop: 6 }}>{pill(link.status)}</div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>
                              Source: {link.source_url || "-"}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>
                              Target: {link.target_url || "-"}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>
                              Anchor: {link.anchor_text || "-"}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>
                              Acquired: {link.acquired_at || "-"}
                            </div>
                          </div>
                        ))}

                        {selectedLinks.length === 0 ? <div>No link records yet.</div> : null}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                  Create a backlink project first.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
