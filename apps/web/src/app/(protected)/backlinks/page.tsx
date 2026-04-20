"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../utils/supabase/browser";

export default function BacklinksPage() {
  const supabase = supabaseBrowser();

  const [drafts, setDrafts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;

    const draftsRes = await supabase
      .from("blog_drafts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const projectsRes = await supabase
      .from("backlink_projects")
      .select("*")
      .eq("user_id", user.id);

    setDrafts(draftsRes.data || []);
    setProjects(projectsRes.data || []);
    setLoading(false);
  }

  async function createProject(draft: any) {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    const { data } = await supabase
      .from("backlink_projects")
      .insert({
        blog_draft_id: draft.id,
        user_id: user?.id,
        status: "not_prepared",
        link_worthy_score: 0,
      })
      .select()
      .single();

    setProjects((prev) => [data, ...prev]);
  }

  function getProject(draftId: string) {
    return projects.find((p) => p.blog_draft_id === draftId);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Backlinks Workspace
      </h1>

      <p style={{ marginBottom: 20, opacity: 0.7 }}>
        Turn your drafts into authority assets
      </p>

      {loading && <div>Loading...</div>}

      <div style={{ display: "flex", gap: 24 }}>
        {/* LEFT */}
        <div style={{ width: 300 }}>
          <h3>Drafts</h3>

          {drafts.map((d) => {
            const project = getProject(d.id);

            return (
              <div
                key={d.id}
                onClick={() => setSelected(d)}
                style={{
                  padding: 12,
                  marginBottom: 10,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  background:
                    selected?.id === d.id ? "#eee" : "transparent",
                }}
              >
                <div style={{ fontWeight: 600 }}>{d.title}</div>

                {project && (
                  <div style={{ fontSize: 12 }}>
                    Status: {project.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1 }}>
          {!selected && <div>Select a draft</div>}

          {selected && (
            <>
              <h2>{selected.title}</h2>

              {!getProject(selected.id) ? (
                <button
                  onClick={() => createProject(selected)}
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: "#1a7a8a",
                    color: "white",
                  }}
                >
                  Create Backlink Project
                </button>
              ) : (
                <div style={{ marginTop: 20 }}>
                  <h3>Project Active</h3>

                  <div>
                    Status: {getProject(selected.id)?.status}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    Score:{" "}
                    {getProject(selected.id)?.link_worthy_score}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
