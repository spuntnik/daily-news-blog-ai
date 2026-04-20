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

type BacklinkProjectStatus =
  | "not_prepared"
  | "ready"
  | "outreach_in_progress"
  | "linked"
  | "archived";

type OpportunityStatus =
  | "not_contacted"
  | "planned"
  | "contacted"
  | "replied"
  | "won"
  | "lost";

type OutreachStatus = "draft" | "ready" | "sent";

type LinkStatus = "pending" | "verified";

type BacklinkProject = {
  id: string;
  blog_draft_id: string;
  user_id: string;
  status: BacklinkProjectStatus;
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
  status: OpportunityStatus;
  created_at: string;
};

type BacklinkOutreach = {
  id: string;
  backlink_opportunity_id: string;
  subject_line: string;
  message_body: string;
  status: OutreachStatus;
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
  status: LinkStatus;
  acquired_at: string | null;
  created_at: string;
};

type ActiveTab = "overview" | "opportunities" | "outreach" | "tracker";

const tabButtonClass =
  "rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/5 hover:text-white";

function getStatusPillClass(status: string) {
  const map: Record<string, string> = {
    not_prepared: "border-white/10 bg-white/5 text-white/70",
    ready: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    outreach_in_progress: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    linked: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    archived: "border-zinc-500/20 bg-zinc-500/10 text-zinc-300",
    not_contacted: "border-white/10 bg-white/5 text-white/70",
    planned: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    contacted: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    replied: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    won: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    lost: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    draft: "border-white/10 bg-white/5 text-white/70",
    sent: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    verified: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  };

  return map[status] || "border-white/10 bg-white/5 text-white/70";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusPillClass(status)}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/60">
      <div className="mb-1 font-medium text-white/80">{title}</div>
      <p>{description}</p>
    </div>
  );
}

export default function BacklinksPage() {
  const supabase = supabaseBrowser();

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [projects, setProjects] = useState<BacklinkProject[]>([]);
  const [opportunities, setOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [outreach, setOutreach] = useState<BacklinkOutreach[]>([]);
  const [links, setLinks] = useState<BacklinkLink[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BacklinkProjectStatus>("all");
  const [projectNotes, setProjectNotes] = useState("");
  const [newOpportunity, setNewOpportunity] = useState({
    domain: "",
    page_title: "",
    page_url: "",
    relevance_reason: "",
    outreach_angle: "",
  });

  useEffect(() => {
    void load();
  }, []);

  const projectByDraftId = useMemo(() => {
    return new Map(projects.map((project) => [project.blog_draft_id, project]));
  }, [projects]);

  const filteredDrafts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return drafts.filter((draft) => {
      const project = projectByDraftId.get(draft.id);
      const matchesSearch =
        !term ||
        draft.title?.toLowerCase().includes(term) ||
        draft.excerpt?.toLowerCase().includes(term) ||
        draft.status?.toLowerCase().includes(term);

      const matchesFilter =
        statusFilter === "all" || project?.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [drafts, projectByDraftId, search, statusFilter]);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId]
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.blog_draft_id === selectedDraftId) ?? null,
    [projects, selectedDraftId]
  );

  const selectedOpportunities = useMemo(() => {
    if (!selectedProject) return [];
    return opportunities.filter(
      (item) => item.backlink_project_id === selectedProject.id
    );
  }, [opportunities, selectedProject]);

  const selectedOutreach = useMemo(() => {
    if (!selectedOpportunities.length) return [];
    const ids = new Set(selectedOpportunities.map((item) => item.id));
    return outreach.filter((item) => ids.has(item.backlink_opportunity_id));
  }, [outreach, selectedOpportunities]);

  const selectedLinks = useMemo(() => {
    if (!selectedProject) return [];
    return links.filter((item) => item.backlink_project_id === selectedProject.id);
  }, [links, selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      setProjectNotes(selectedProject.notes || "");
    } else {
      setProjectNotes("");
    }
  }, [selectedProject]);

  async function load() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) {
        setError("Please sign in to access backlinks.");
        setDrafts([]);
        setProjects([]);
        return;
      }

      const [draftsRes, projectsRes, opportunitiesRes, outreachRes, linksRes] = await Promise.all([
        supabase
          .from("blog_drafts")
          .select("id,title,excerpt,status,created_at,updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("backlink_projects")
          .select("id,blog_draft_id,user_id,status,link_worthy_score,notes,created_at,updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("backlink_opportunities")
          .select("id,backlink_project_id,domain,page_title,page_url,relevance_reason,outreach_angle,status,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("backlink_outreach")
          .select("id,backlink_opportunity_id,subject_line,message_body,status,sent_at,reply_note,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("backlink_links")
          .select("id,backlink_project_id,source_domain,source_url,target_url,anchor_text,status,acquired_at,created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (draftsRes.error) throw draftsRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (opportunitiesRes.error) throw opportunitiesRes.error;
      if (outreachRes.error) throw outreachRes.error;
      if (linksRes.error) throw linksRes.error;

      const nextDrafts = (draftsRes.data || []) as DraftRow[];
      const nextProjects = (projectsRes.data || []) as BacklinkProject[];
      const allowedProjectIds = new Set(nextProjects.map((project) => project.id));
      const nextOpportunities = ((opportunitiesRes.data || []) as BacklinkOpportunity[]).filter((item) =>
        allowedProjectIds.has(item.backlink_project_id)
      );
      const allowedOpportunityIds = new Set(nextOpportunities.map((item) => item.id));
      const nextOutreach = ((outreachRes.data || []) as BacklinkOutreach[]).filter((item) =>
        allowedOpportunityIds.has(item.backlink_opportunity_id)
      );
      const nextLinks = ((linksRes.data || []) as BacklinkLink[]).filter((item) =>
        allowedProjectIds.has(item.backlink_project_id)
      );

      setDrafts(nextDrafts);
      setProjects(nextProjects);
      setOpportunities(nextOpportunities);
      setOutreach(nextOutreach);
      setLinks(nextLinks);

      if (!selectedDraftId && nextDrafts.length > 0) {
        const firstProjectDraftId = nextProjects[0]?.blog_draft_id;
        setSelectedDraftId(firstProjectDraftId || nextDrafts[0].id);
      } else if (
        selectedDraftId &&
        !nextDrafts.some((draft) => draft.id === selectedDraftId)
      ) {
        setSelectedDraftId(nextDrafts[0]?.id || "");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load backlinks workspace.");
    } finally {
      setLoading(false);
    }
  }

  async function createProjectForSelectedDraft() {
    if (!selectedDraft) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Please sign in to create a backlink project.");

      const { data, error: insertError } = await supabase
        .from("backlink_projects")
        .insert({
          blog_draft_id: selectedDraft.id,
          user_id: user.id,
          status: "not_prepared",
          link_worthy_score: 0,
          notes: null,
        })
        .select("id,blog_draft_id,user_id,status,link_worthy_score,notes,created_at,updated_at")
        .single();

      if (insertError) throw insertError;

      setProjects((prev) => [data as BacklinkProject, ...prev]);
      setNotice("Backlink project created.");
    } catch (err: any) {
      setError(err?.message || "Failed to create backlink project.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProjectNotes() {
    if (!selectedProject) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("backlink_projects")
        .update({ notes: projectNotes })
        .eq("id", selectedProject.id)
        .select("id,blog_draft_id,user_id,status,link_worthy_score,notes,created_at,updated_at")
        .single();

      if (updateError) throw updateError;

      setProjects((prev) =>
        prev.map((project) => (project.id === selectedProject.id ? (data as BacklinkProject) : project))
      );
      setNotice("Project notes saved.");
    } catch (err: any) {
      setError(err?.message || "Failed to save notes.");
    } finally {
      setSaving(false);
    }
  }

  async function updateProjectStatus(status: BacklinkProjectStatus) {
    if (!selectedProject) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("backlink_projects")
        .update({ status })
        .eq("id", selectedProject.id)
        .select("id,blog_draft_id,user_id,status,link_worthy_score,notes,created_at,updated_at")
        .single();

      if (updateError) throw updateError;

      setProjects((prev) =>
        prev.map((project) => (project.id === selectedProject.id ? (data as BacklinkProject) : project))
      );
      setNotice(`Project moved to ${status.replace(/_/g, " ")}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to update project status.");
    } finally {
      setSaving(false);
    }
  }

  async function addOpportunity() {
    if (!selectedProject) return;
    if (!newOpportunity.domain.trim()) {
      setError("Domain is required.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        backlink_project_id: selectedProject.id,
        domain: newOpportunity.domain.trim(),
        page_title: newOpportunity.page_title.trim() || null,
        page_url: newOpportunity.page_url.trim() || null,
        relevance_reason: newOpportunity.relevance_reason.trim() || null,
        outreach_angle: newOpportunity.outreach_angle.trim() || null,
        status: "not_contacted" as OpportunityStatus,
      };

      const { data, error: insertError } = await supabase
        .from("backlink_opportunities")
        .insert(payload)
        .select("id,backlink_project_id,domain,page_title,page_url,relevance_reason,outreach_angle,status,created_at")
        .single();

      if (insertError) throw insertError;

      setOpportunities((prev) => [data as BacklinkOpportunity, ...prev]);
      setNewOpportunity({
        domain: "",
        page_title: "",
        page_url: "",
        relevance_reason: "",
        outreach_angle: "",
      });
      setNotice("Opportunity added.");
      setActiveTab("opportunities");
    } catch (err: any) {
      setError(err?.message || "Failed to add opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function markOpportunityWon(item: BacklinkOpportunity) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("backlink_opportunities")
        .update({ status: "won" })
        .eq("id", item.id)
        .select("id,backlink_project_id,domain,page_title,page_url,relevance_reason,outreach_angle,status,created_at")
        .single();

      if (updateError) throw updateError;

      setOpportunities((prev) =>
        prev.map((entry) => (entry.id === item.id ? (data as BacklinkOpportunity) : entry))
      );

      const existingLink = selectedLinks.find(
        (linkItem) => linkItem.source_url && item.page_url && linkItem.source_url === item.page_url
      );

      if (!existingLink && selectedProject) {
        const { data: linkData, error: linkError } = await supabase
          .from("backlink_links")
          .insert({
            backlink_project_id: selectedProject.id,
            source_domain: item.domain,
            source_url: item.page_url,
            target_url: null,
            anchor_text: null,
            status: "pending",
            acquired_at: new Date().toISOString(),
          })
          .select("id,backlink_project_id,source_domain,source_url,target_url,anchor_text,status,acquired_at,created_at")
          .single();

        if (linkError) throw linkError;
        setLinks((prev) => [linkData as BacklinkLink, ...prev]);
      }

      setNotice("Opportunity marked as won.");
    } catch (err: any) {
      setError(err?.message || "Failed to update opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function createOutreachDraft(item: BacklinkOpportunity) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const existing = selectedOutreach.find(
        (entry) => entry.backlink_opportunity_id === item.id
      );
      if (existing) {
        setNotice("An outreach draft already exists for this opportunity.");
        setActiveTab("outreach");
        return;
      }

      const subject = `Possible resource fit for ${item.domain}`;
      const body = [
        `Hi ${item.domain} team,`,
        "",
        `I came across ${item.page_title || item.domain} and thought this draft could complement it.",
        item.outreach_angle
          ? `Angle: ${item.outreach_angle}`
          : "We are building a practical resource that may be useful to your readers.",
        selectedDraft?.title
          ? `Draft: ${selectedDraft.title}`
          : "",
        "",
        "Open to sending over the link if helpful.",
      ]
        .filter(Boolean)
        .join("\n");

      const { data, error: insertError } = await supabase
        .from("backlink_outreach")
        .insert({
          backlink_opportunity_id: item.id,
          subject_line: subject,
          message_body: body,
          status: "draft",
        })
        .select("id,backlink_opportunity_id,subject_line,message_body,status,sent_at,reply_note,created_at")
        .single();

      if (insertError) throw insertError;

      setOutreach((prev) => [data as BacklinkOutreach, ...prev]);
      setActiveTab("outreach");
      setNotice("Outreach draft created.");
    } catch (err: any) {
      setError(err?.message || "Failed to create outreach draft.");
    } finally {
      setSaving(false);
    }
  }

  const summary = {
    opportunities: selectedOpportunities.length,
    outreach: selectedOutreach.length,
    linksWon: selectedLinks.length,
  };

  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c9937d]">
              Authority growth workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Backlinks</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/60">
              Turn saved drafts into authority assets, manage outreach, and track links won.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void load()}
              disabled={loading || saving}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/library"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Open Library
            </Link>
            <Link
              href="/generator"
              className="rounded-xl bg-[#1a7a8a] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Open Generator
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20">
            <div className="mb-4 space-y-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search drafts"
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#1a7a8a]"
              />

              <div className="flex flex-wrap gap-2">
                {(["all", "not_prepared", "ready", "outreach_in_progress", "linked", "archived"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setStatusFilter(item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      statusFilter === item
                        ? "bg-[#1a7a8a] text-white"
                        : "border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {item === "all" ? "All" : item.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredDrafts.length === 0 ? (
                <EmptyState
                  title="No drafts found"
                  description="Save a draft from Generator or adjust the current search and filters."
                />
              ) : (
                filteredDrafts.map((draft) => {
                  const project = projectByDraftId.get(draft.id);
                  const isSelected = draft.id === selectedDraftId;
                  const projectOpportunities = opportunities.filter(
                    (item) => item.backlink_project_id === project?.id
                  ).length;
                  const projectLinks = links.filter(
                    (item) => item.backlink_project_id === project?.id
                  ).length;

                  return (
                    <button
                      key={draft.id}
                      onClick={() => setSelectedDraftId(draft.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-[#1a7a8a] bg-[#1a7a8a]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">
                            {draft.title || "Untitled draft"}
                          </div>
                          <div className="mt-1 text-xs text-white/40">
                            {new Date(draft.updated_at || draft.created_at).toLocaleString()}
                          </div>
                        </div>
                        {project ? <StatusPill status={project.status} /> : null}
                      </div>

                      <p className="line-clamp-2 text-xs text-white/50">
                        {draft.excerpt || "No excerpt available yet."}
                      </p>

                      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/45">
                        <span>Score: {project?.link_worthy_score ?? 0}</span>
                        <span>Opps: {projectOpportunities}</span>
                        <span>Links: {projectLinks}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20">
            {!selectedDraft ? (
              <EmptyState
                title="Select a draft"
                description="Choose a draft from the left to open its backlink workspace."
              />
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c9937d]">
                      Selected draft
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight">{selectedDraft.title || "Untitled draft"}</h2>
                    <p className="mt-2 max-w-3xl text-sm text-white/60">
                      {selectedDraft.excerpt || "No excerpt available. Use this space to prepare opportunities, outreach drafts, and link tracking."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!selectedProject ? (
                      <button
                        onClick={() => void createProjectForSelectedDraft()}
                        disabled={saving}
                        className="rounded-xl bg-[#1a7a8a] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Creating..." : "Create backlink project"}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => void updateProjectStatus("ready")}
                          disabled={saving || selectedProject.status === "ready"}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark ready
                        </button>
                        <button
                          onClick={() => void updateProjectStatus("outreach_in_progress")}
                          disabled={saving || selectedProject.status === "outreach_in_progress"}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Start outreach
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">Status</div>
                    <div className="mt-3">{selectedProject ? <StatusPill status={selectedProject.status} /> : <span className="text-sm text-white/50">No project yet</span>}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">Link-worthy score</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{selectedProject?.link_worthy_score ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">Opportunities</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{summary.opportunities}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">Links won</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{summary.linksWon}</div>
                  </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
                  {([
                    ["overview", "Overview"],
                    ["opportunities", "Opportunities"],
                    ["outreach", "Outreach"],
                    ["tracker", "Tracker"],
                  ] as [ActiveTab, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`${tabButtonClass} ${activeTab === value ? "border-[#1a7a8a] bg-[#1a7a8a]/10 text-white" : ""}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === "overview" ? (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                      <h3 className="text-base font-semibold text-white">Project notes</h3>
                      <p className="mt-1 text-sm text-white/50">
                        Capture why this draft matters, what should improve, and who it should be pitched to.
                      </p>

                      {!selectedProject ? (
                        <div className="mt-4">
                          <EmptyState
                            title="No backlink project yet"
                            description="Create a backlink project first, then you can save notes and start outreach planning."
                          />
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={projectNotes}
                            onChange={(event) => setProjectNotes(event.target.value)}
                            placeholder="Add notes about positioning, angle, or why this draft deserves backlinks."
                            className="mt-4 min-h-[200px] w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#1a7a8a]"
                          />
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              onClick={() => void saveProjectNotes()}
                              disabled={saving}
                              className="rounded-xl bg-[#1a7a8a] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save notes
                            </button>
                            <button
                              onClick={() => setActiveTab("opportunities")}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                              Add opportunity
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                      <h3 className="text-base font-semibold text-white">Quick actions</h3>
                      <div className="mt-4 grid gap-3">
                        <button
                          onClick={() => setActiveTab("opportunities")}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.05]"
                        >
                          Add a site we can approach
                        </button>
                        <button
                          onClick={() => setActiveTab("outreach")}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.05]"
                        >
                          Review outreach drafts
                        </button>
                        <button
                          onClick={() => setActiveTab("tracker")}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.05]"
                        >
                          Track links won
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === "opportunities" ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                      <h3 className="text-base font-semibold text-white">Add opportunity</h3>
                      <p className="mt-1 text-sm text-white/50">
                        Manually add sites, pages, and outreach angles for this draft.
                      </p>

                      {!selectedProject ? (
                        <div className="mt-4">
                          <EmptyState
                            title="Create a project first"
                            description="Once the backlink project exists, you can start adding opportunity records here."
                          />
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <input
                            value={newOpportunity.domain}
                            onChange={(event) =>
                              setNewOpportunity((prev) => ({ ...prev, domain: event.target.value }))
                            }
                            placeholder="Domain"
                            className="rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#1a7a8a]"
                          />
                          <input
                            value={newOpportunity.page_title}
                            onChange={(event) =>
                              setNewOpportunity((prev) => ({ ...prev, page_title: event.target.value }))
                            }
                            placeholder="Page title"
                            className="rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#1a7a8a]"
                          />
                          <input
                            value={newOpportunity.page_url}
                            onChange={(event) =>
                              setNewOpportunity((prev) => ({ ...prev, page_url: event.target.value }))
                            }
                            placeholder="Page URL"
                            className="rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#1a7a8a] md:col-span-2"
                          />
                          <textarea
                            value={newOpportunity.relevance_reason}
                            onChange={(event) =>
                              setNewOpportunity((prev) => ({ ...prev, relevance_reason: event.target.value }))
                            }
                            placeholder="Why this site is relevant"
                            className="min-h-[120px] rounded-2xl border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#1a7a8a]"
                          />
                          <textarea
                            value={newOpportunity.outreach_angle}
                            onChange={(event) =>
                              setNewOpportunity((prev) => ({ ...prev, outreach_angle: event.target.value }))
                            }
                            placeholder="Suggested outreach angle"
                            className="min-h-[120px] rounded-2xl border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#1a7a8a]"
                          />
                          <div className="md:col-span-2">
                            <button
                              onClick={() => void addOpportunity()}
                              disabled={saving}
                              className="rounded-xl bg-[#1a7a8a] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Add opportunity
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                      <h3 className="text-base font-semibold text-white">Current opportunities</h3>

                      {selectedOpportunities.length === 0 ? (
                        <div className="mt-4">
                          <EmptyState
                            title="No opportunities yet"
                            description="Start by adding a site we can approach for this draft."
                          />
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {selectedOpportunities.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-white/10 bg-[#020617] p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-semibold text-white">{item.domain}</h4>
                                    <StatusPill status={item.status} />
                                  </div>
                                  <p className="mt-1 text-sm text-white/50">{item.page_title || "No page title added."}</p>
                                  {item.page_url ? (
                                    <a
                                      href={item.page_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-2 inline-block text-xs text-[#c9937d] hover:underline"
                                    >
                                      Open page
                                    </a>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => void createOutreachDraft(item)}
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                                  >
                                    Draft outreach
                                  </button>
                                  <button
                                    onClick={() => void markOpportunityWon(item)}
                                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:opacity-90"
                                  >
                                    Mark won
                                  </button>
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                                    Why relevant
                                  </div>
                                  <p className="text-sm text-white/60">{item.relevance_reason || "No relevance notes yet."}</p>
                                </div>
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                                    Outreach angle
                                  </div>
                                  <p className="text-sm text-white/60">{item.outreach_angle || "No outreach angle yet."}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === "outreach" ? (
                  <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                    <h3 className="text-base font-semibold text-white">Outreach drafts</h3>
                    {selectedOutreach.length === 0 ? (
                      <div className="mt-4">
                        <EmptyState
                          title="No outreach drafted yet"
                          description="Create a draft from the Opportunities tab to start building your contact plan."
                        />
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {selectedOutreach.map((item) => {
                          const relatedOpportunity = selectedOpportunities.find(
                            (opportunity) => opportunity.id === item.backlink_opportunity_id
                          );

                          return (
                            <div key={item.id} className="rounded-2xl border border-white/10 bg-[#020617] p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-semibold text-white">
                                      {relatedOpportunity?.domain || "Opportunity"}
                                    </h4>
                                    <StatusPill status={item.status} />
                                  </div>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/35">Subject</p>
                                  <p className="mt-1 text-sm text-white/80">{item.subject_line}</p>
                                </div>
                              </div>

                              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm whitespace-pre-wrap text-white/65">
                                {item.message_body}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === "tracker" ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">Sites we can approach</div>
                        <div className="mt-3 text-2xl font-semibold text-white">{summary.opportunities}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">Contact plan items</div>
                        <div className="mt-3 text-2xl font-semibold text-white">{summary.outreach}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">Recorded links</div>
                        <div className="mt-3 text-2xl font-semibold text-white">{summary.linksWon}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-5">
                      <h3 className="text-base font-semibold text-white">Links won</h3>
                      {selectedLinks.length === 0 ? (
                        <div className="mt-4">
                          <EmptyState
                            title="No backlinks recorded yet"
                            description="When an opportunity turns into a live link, it will show up here."
                          />
                        </div>
                      ) : (
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full divide-y divide-white/10 text-sm">
                            <thead>
                              <tr className="text-left text-white/40">
                                <th className="pb-3 pr-4 font-medium">Source domain</th>
                                <th className="pb-3 pr-4 font-medium">Source URL</th>
                                <th className="pb-3 pr-4 font-medium">Status</th>
                                <th className="pb-3 font-medium">Acquired</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 text-white/75">
                              {selectedLinks.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-3 pr-4">{item.source_domain}</td>
                                  <td className="py-3 pr-4">
                                    {item.source_url ? (
                                      <a
                                        href={item.source_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#c9937d] hover:underline"
                                      >
                                        Open source
                                      </a>
                                    ) : (
                                      <span className="text-white/40">Not added</span>
                                    )}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <StatusPill status={item.status} />
                                  </td>
                                  <td className="py-3">
                                    {item.acquired_at
                                      ? new Date(item.acquired_at).toLocaleDateString()
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
