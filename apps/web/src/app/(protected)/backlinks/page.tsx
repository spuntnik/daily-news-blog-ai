"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../utils/supabase/browser";

type DraftRow = {
  id: string;
  title: string;
  excerpt: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type BacklinkProject = {
  id: string;
  blog_draft_id: string;
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

export default function BacklinksPage() {
  const supabase = supabaseBrowser();

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [projects, setProjects] = useState<BacklinkProject[]>([]);
  const [opportunities, setOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedDraft = useMemo(
    () => drafts.find((d) => d.id === selectedDraftId),
    [drafts, selectedDraftId]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.blog_draft_id === selectedDraftId),
    [projects, selectedDraftId]
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const [d, p, o] = await Promise.all([
        supabase
          .from("blog_drafts")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),

        supabase
          .from("backlink_projects")
          .select("*")
          .eq("user_id", user.id),

        supabase
          .from("backlink_opportunities")
          .select("*"),
      ]);

      if (d.error) throw d.error;
      if (p.error) throw p.error;
      if (o.error) throw o.error;

      setDrafts(d.data || []);
      setProjects(p.data || []);
      setOpportunities(o.data || []);

      if (d.data?.length) setSelectedDraftId(d.data[0].id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    if (!selectedDraft) return;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("backlink_projects")
      .insert({
        blog_draft_id: selectedDraft.id,
        user_id: user.id,
        status: "not_prepared",
        link_worthy_score: 0,
      })
      .select()
      .single();

    if (!error && data) {
      setProjects((prev) => [data, ...prev]);
    }
  }

  async function addOpportunity() {
    if (!selectedProject) return;

    const { data, error } = await supabase
      .from("backlink_opportunities")
      .insert({
        backlink_project_id: selectedProject.id,
        domain: "example.com",
        status: "not_contacted",
      })
      .select()
      .single();

    if (!error && data) {
      setOpportunities((prev) => [data, ...prev]);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1020] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Backlinks Workspace</h1>

      {error && <div className="text-red-400 mb-4">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT PANEL */}
        <div className="col-span-1 space-y-3">
          {drafts.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDraftId(d.id)}
              className={`w-full text-left p-3 rounded border ${
                d.id === selectedDraftId
                  ? "bg-[#1a7a8a]/20 border-[#1a7a8a]"
                  : "border-white/10"
              }`}
            >
              <div className="font-semibold">{d.title}</div>
              <div className="text-xs text-white/50">{d.status}</div>
            </button>
          ))}
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-2 space-y-6">
          {!selectedDraft ? (
            <div>Select a draft</div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedDraft.title}
                </h2>
                <p className="text-sm text-white/60">
                  {selectedDraft.excerpt}
                </p>
              </div>

              {!selectedProject ? (
                <button
                  onClick={createProject}
                  className="bg-[#1a7a8a] px-4 py-2 rounded"
                >
                  Create Backlink Project
                </button>
              ) : (
                <>
                  <div className="flex gap-4">
                    <div>Score: {selectedProject.link_worthy_score}</div>
                    <div>Status: {selectedProject.status}</div>
                  </div>

                  <button
                    onClick={addOpportunity}
                    className="bg-white/10 px-3 py-2 rounded"
                  >
                    Add Opportunity
                  </button>

                  <div className="space-y-3">
                    {opportunities
                      .filter(
                        (o) =>
                          o.backlink_project_id === selectedProject.id
                      )
                      .map((o) => (
                        <div
                          key={o.id}
                          className="border border-white/10 p-3 rounded"
                        >
                          <div className="font-semibold">{o.domain}</div>
                          <div className="text-xs text-white/50">
                            {o.status}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/library" className="underline">
          Library
        </Link>
        <Link href="/generator" className="underline">
          Generator
        </Link>
      </div>
    </main>
  );
}
