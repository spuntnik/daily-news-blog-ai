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

type TabKey = "overview" | "opportunities" | "outreach" | "tracker";

export default function BacklinksPage() {
  const backlinksEnabled =
    process.env.NEXT_PUBLIC_ENABLE_BACKLINKS === "true";

  if (!backlinksEnabled) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Distribution Engine (Beta)
        </h1>
        <p style={{ opacity: 0.7, marginBottom: 16 }}>
          This advanced module is currently hidden.
        </p>
        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            maxWidth: 720,
          }}
        >
          Focus on quality, not volume. This feature is being refined before wider use.
        </div>
      </main>
    );
  }

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
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadAll();
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

      setPosts(nextPosts);
      setProjects(nextProjects);
      setOpportunities(nextOpportunities);
      setOutreachRows(nextOutreach);
      setLinks(nextLinks);
      setUserSite(((siteRes.data || [])[0] || null) as UserSiteRow | null);

      const urlPostId = searchParams.get("postId");
      if (urlPostId && nextPosts.some((p) => p.id === urlPostId)) {
        setSelectedPostId(urlPostId);
      } else if (nextPosts.length > 0) {
        setSelectedPostId(nextPosts[0].id);
      }
    } catch (err: any) {
      setMessage(err?.message || "Failed to load beta module.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Distribution Engine (Beta)
      </h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>
        Advanced feature — experimental authority and placement system.
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

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        This tool suggests a small number of high-fit placements. Focus on quality, not volume.
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ width: 340 }}>
          <h3 style={{ marginBottom: 12 }}>Blog posts</h3>

          <div style={{ display: "grid", gap: 10 }}>
            {posts.map((post) => {
              const project = projects.find((p) => p.blog_post_id === post.id);

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
                    {project ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          border: "1px solid #ccc",
                          borderRadius: 999,
                          fontSize: 12,
                        }}
                      >
                        {project.status}
                      </span>
                    ) : null}
                    {project ? (
                      <span style={{ fontSize: 12 }}>
                        Score: {project.link_worthy_score}
                      </span>
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
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <button onClick={() => setActiveTab("overview")}>Overview</button>
                <button onClick={() => setActiveTab("opportunities")}>Opportunities</button>
                <button onClick={() => setActiveTab("outreach")}>Outreach</button>
                <button onClick={() => setActiveTab("tracker")}>Link Tracker</button>
              </div>

              {activeTab === "overview" ? (
                <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                  <h3>Overview</h3>
                  <div>Project: {selectedProject ? "Loaded" : "Not created yet"}</div>
                  <div>Opportunities: {selectedOpportunities.length}</div>
                  <div>Outreach drafts: {selectedOutreach.length}</div>
                  <div>Tracked links: {selectedLinks.length}</div>
                  <div style={{ marginTop: 12 }}>
                    Site profile loaded: {userSite ? "Yes" : "No"}
                  </div>
                </div>
              ) : null}

              {activeTab === "opportunities" ? (
                <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                  <h3>Opportunities</h3>
                  {selectedOpportunities.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedOpportunities.map((item) => (
                        <div
                          key={item.id}
                          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
                        >
                          <div style={{ fontWeight: 700 }}>{item.domain}</div>
                          <div>{item.page_title || "No page title"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>No opportunities yet.</div>
                  )}
                </div>
              ) : null}

              {activeTab === "outreach" ? (
                <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                  <h3>Outreach</h3>
                  {selectedOutreach.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedOutreach.map((item) => (
                        <div
                          key={item.id}
                          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
                        >
                          <div style={{ fontWeight: 700 }}>{item.subject_line}</div>
                          <pre
                            style={{
                              whiteSpace: "pre-wrap",
                              margin: 0,
                              fontFamily: "inherit",
                            }}
                          >
                            {item.message_body}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>No outreach drafts yet.</div>
                  )}
                </div>
              ) : null}

              {activeTab === "tracker" ? (
                <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
                  <h3>Link Tracker</h3>
                  {selectedLinks.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedLinks.map((item) => (
                        <div
                          key={item.id}
                          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
                        >
                          <div style={{ fontWeight: 700 }}>{item.source_domain}</div>
                          <div>Status: {item.status}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>No link records yet.</div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
