"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../utils/supabase/browser";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Stage = "draft" | "review" | "scheduled" | "published";

type PostRow = {
  id: string;
  title: string;
  created_at: string;
  status: Stage;
  sources: any;
  excerpt?: string | null;
};

type BacklinkProject = {
  id: string;
  blog_post_id: string | null;
  user_id: string;
  status: string;
  link_worthy_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const PIPELINE: Stage[] = ["draft", "review", "scheduled", "published"];

function ColumnDropZone({
  id,
  title,
  count,
  children,
}: {
  id: Stage;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      style={{
        minWidth: 320,
        border: "1px solid #222",
        borderRadius: 12,
        padding: 12,
        background: isOver ? "rgba(255,255,255,0.03)" : "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <strong style={{ textTransform: "capitalize" }}>{title}</strong>
        <span>{count}</span>
      </div>
      {children}
    </section>
  );
}

function Card({
  post,
  checked,
  onToggleChecked,
  backlinkProject,
}: {
  post: PostRow;
  checked: boolean;
  onToggleChecked: (id: string) => void;
  backlinkProject?: BacklinkProject;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: post.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    border: "1px solid #333",
    borderRadius: 12,
    padding: 12,
    background: "#111",
    cursor: "grab",
  };

  return (
    <article ref={setNodeRef} style={style}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggleChecked(post.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 4 }}
        />

        <div style={{ flex: 1 }} {...attributes} {...listeners}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>
            {post.title}
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, color: "#fff" }}>
            {new Date(post.created_at).toLocaleString()}
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/api/export-docx?id=${encodeURIComponent(post.id)}`;
              }}
            >
              Export .docx
            </button>

            <Link
              href={`/linkedin?postId=${encodeURIComponent(post.id)}`}
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#9ad", textDecoration: "underline" }}
            >
              Create LinkedIn Post
            </Link>

            <Link
              href={`/backlinks?postId=${encodeURIComponent(post.id)}`}
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#9ad", textDecoration: "underline" }}
            >
              Backlinks
            </Link>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#bbb",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span>Backlink status: {backlinkProject?.status || "none"}</span>
            <span>Score: {backlinkProject?.link_worthy_score ?? 0}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LibraryPage() {
  const supabase = supabaseBrowser();

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [backlinkProjects, setBacklinkProjects] = useState<BacklinkProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    setStatus("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setPosts([]);
        setBacklinkProjects([]);
        setLoading(false);
        return;
      }

      const [{ data, error }, { data: backlinkData, error: backlinkError }] =
        await Promise.all([
          supabase
            .from("blog_posts")
            .select("id,title,created_at,status,sources,excerpt")
            .order("created_at", { ascending: false }),

          supabase
            .from("backlink_projects")
            .select("*")
            .eq("user_id", auth.user.id),
        ]);

      if (error) throw error;
      if (backlinkError) throw backlinkError;

      const normalized = ((data as any[]) ?? []).map((p) => ({
        ...p,
        status: (PIPELINE.includes(p.status) ? p.status : "draft") as Stage,
      })) as PostRow[];

      setPosts(normalized);
      setBacklinkProjects((backlinkData as BacklinkProject[]) || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const map: Record<Stage, PostRow[]> = {
      draft: [],
      review: [],
      scheduled: [],
      published: [],
    };
    for (const p of posts) {
      map[p.status]?.push(p);
    }
    return map;
  }, [posts]);

  function getBacklinkProject(postId: string) {
    return backlinkProjects.find((p) => p.blog_post_id === postId);
  }

  function findStageById(id: string): Stage | null {
    const p = posts.find((x) => x.id === id);
    return p?.status ?? null;
  }

  function toggleChecked(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllInStage(stage: Stage) {
    const ids = grouped[stage].map((p) => p.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function clearSelection() {
    setSelectedIds([]);
    setStatus("");
  }

  function calculateLinkWorthiness(post: PostRow) {
    const text = `${post.title || ""} ${post.excerpt || ""}`;
    let score = 30;

    if (text.length > 300) score += 15;
    if (/\bguide\b|\bplaybook\b|\bframework\b|\bchecklist\b|\bstrategy\b/i.test(text)) {
      score += 20;
    }
    if (/\bhow to\b|\bwhy\b|\bwhat\b/i.test(text)) {
      score += 10;
    }
    if (/\bSingapore\b|\bMalaysia\b|\bexecutive\b|\bleadership\b/i.test(text)) {
      score += 15;
    }
    if ((post.excerpt || "").length > 80) score += 10;

    return Math.min(score, 100);
  }

  function buildSmartSuggestions(post: PostRow) {
    const text = `${post.title || ""} ${post.excerpt || ""}`.toLowerCase();
    const suggestions: {
      domain: string;
      page_title: string;
      page_url: string;
      relevance_reason: string;
      outreach_angle: string;
    }[] = [];

    if (text.includes("executive") || text.includes("leadership")) {
      suggestions.push({
        domain: "leadershipinsights.example.com",
        page_title: "Leadership Resources",
        page_url: "",
        relevance_reason:
          "This post is leadership-oriented and may fit executive development or management resources.",
        outreach_angle: "Lead with executive relevance and practical takeaways.",
      });
    }

    if (text.includes("singapore")) {
      suggestions.push({
        domain: "sgbusinesshub.example.com",
        page_title: "Singapore Business Insights",
        page_url: "",
        relevance_reason:
          "This post has local Singapore relevance and may fit business publications serving that market.",
        outreach_angle:
          "Position it as a locally relevant resource for Singapore professionals.",
      });
    }

    if (text.includes("marketing") || text.includes("ai")) {
      suggestions.push({
        domain: "digitalgrowthguide.example.com",
        page_title: "Digital Growth Library",
        page_url: "",
        relevance_reason:
          "The content aligns with digital growth, AI, and practical strategy topics.",
        outreach_angle: "Present it as a practical implementation guide.",
      });
    }

    suggestions.push({
      domain: "industryroundup.example.com",
      page_title: "Industry Resource Roundup",
      page_url: "",
      relevance_reason:
        "This post appears educational and suitable for roundup or resource pages.",
      outreach_angle: "Offer the article as a concise resource with direct reader value.",
    });

    return suggestions.slice(0, 5);
  }

  async function oneClickGenerateBacklinksForSelected() {
    if (!selectedIds.length) return;

    setBusy(true);
    setStatus("Generating AI backlink opportunities for selected posts...");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not signed in.");

      for (const post of posts.filter((p) => selectedIds.includes(p.id))) {
        let project = backlinkProjects.find((p) => p.blog_post_id === post.id);

        if (!project) {
          const { data: createdProject, error: projectError } = await supabase
            .from("backlink_projects")
            .insert({
              blog_post_id: post.id,
              blog_draft_id: null,
              user_id: user.id,
              status: "ready",
              link_worthy_score: calculateLinkWorthiness(post),
              notes: "",
            })
            .select()
            .single();

          if (projectError) throw projectError;
          project = createdProject as BacklinkProject;
          setBacklinkProjects((prev) => [project!, ...prev]);
        }

        const suggestions = buildSmartSuggestions(post);

        if (suggestions.length) {
          const rows = suggestions.map((item) => ({
            backlink_project_id: project!.id,
            domain: item.domain,
            page_title: item.page_title,
            page_url: item.page_url,
            relevance_reason: item.relevance_reason,
            outreach_angle: item.outreach_angle,
            status: "planned",
          }));

          const { error: oppError } = await supabase
            .from("backlink_opportunities")
            .insert(rows);

          if (oppError) throw oppError;
        }
      }

      setStatus(`Generated backlink opportunities for ${selectedIds.length} selected post(s).`);
      setSelectedIds([]);
      await load();
    } catch (e: any) {
      setStatus("");
      alert(e?.message || "Failed to generate AI backlink opportunities.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (!selectedIds.length) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected item(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("Deleting selected items...");

    try {
      const res = await fetch("/api/library/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");

      setSelectedIds([]);
      setStatus(`Deleted ${json?.deleted || 0} item(s).`);
      await load();
    } catch (e: any) {
      setStatus("");
      alert(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function persistStage(id: string, next: Stage) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: next } : p)));

    const { error } = await supabase
      .from("blog_posts")
      .update({ status: next })
      .eq("id", id);

    if (error) {
      await load();
      alert(error.message || "Update failed");
    }
  }

  async function bulkMoveSelected(next: Stage) {
    if (!selectedIds.length) return;

    setBusy(true);
    setStatus(`Moving ${selectedIds.length} item(s) to ${next}...`);

    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({ status: next })
        .in("id", selectedIds);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((p) => (selectedIds.includes(p.id) ? { ...p, status: next } : p))
      );
      setStatus(`Moved ${selectedIds.length} item(s) to ${next}.`);
      setSelectedIds([]);
    } catch (e: any) {
      await load();
      setStatus("");
      alert(e?.message || "Bulk move failed");
    } finally {
      setBusy(false);
    }
  }

  async function bulkExportSelected() {
    if (!selectedIds.length) return;

    setBusy(true);
    setStatus(`Exporting ${selectedIds.length} .docx file(s)...`);

    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/export-docx?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          throw new Error(`Export failed for item ${id}`);
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        const matchingPost = posts.find((p) => p.id === id);
        const safeTitle =
          (matchingPost?.title || "blog-post")
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 80) || "blog-post";

        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeTitle}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      setStatus(`Exported ${selectedIds.length} .docx file(s).`);
    } catch (e: any) {
      setStatus("");
      alert(e?.message || "Bulk export failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const from = findStageById(activeId);
    if (!from) return;

    let to: Stage | null = null;

    if (PIPELINE.includes(overId as Stage)) {
      to = overId as Stage;
    } else {
      const inferred = findStageById(overId);
      if (inferred) to = inferred;
    }

    if (!to || to === from) return;

    await persistStage(activeId, to);
  }

  return (
    <main style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <strong style={{ fontSize: 26 }}>Library</strong>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading || busy}>
            {loading ? "Loading…" : "Refresh"}
          </button>

          <button onClick={bulkExportSelected} disabled={!selectedIds.length || busy}>
            Bulk Export .docx ({selectedIds.length})
          </button>

          <button onClick={oneClickGenerateBacklinksForSelected} disabled={!selectedIds.length || busy}>
            AI Backlinks for Selected ({selectedIds.length})
          </button>

          <button onClick={deleteSelected} disabled={!selectedIds.length || busy}>
            Delete selected ({selectedIds.length})
          </button>

          <button onClick={clearSelection} disabled={!selectedIds.length || busy}>
            Clear selection
          </button>

          <Link href="/generator">Generator</Link>
          <Link href="/linkedin">LinkedIn</Link>
        </div>
      </div>

      {err ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #333",
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          Error: {err}
        </div>
      ) : null}

      {status ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          {status}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => selectAllInStage("draft")} disabled={busy}>
          Select all Draft
        </button>
        <button onClick={() => selectAllInStage("review")} disabled={busy}>
          Select all Review
        </button>
        <button onClick={() => selectAllInStage("scheduled")} disabled={busy}>
          Select all Scheduled
        </button>
        <button onClick={() => selectAllInStage("published")} disabled={busy}>
          Select all Published
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => bulkMoveSelected("draft")} disabled={!selectedIds.length || busy}>
          Move selected to Draft
        </button>
        <button onClick={() => bulkMoveSelected("review")} disabled={!selectedIds.length || busy}>
          Move selected to Review
        </button>
        <button onClick={() => bulkMoveSelected("scheduled")} disabled={!selectedIds.length || busy}>
          Move selected to Scheduled
        </button>
        <button onClick={() => bulkMoveSelected("published")} disabled={!selectedIds.length || busy}>
          Move selected to Published
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", overflowX: "auto" }}>
          {PIPELINE.map((stage) => (
            <ColumnDropZone
              key={stage}
              id={stage}
              title={stage}
              count={grouped[stage]?.length ?? 0}
            >
              <SortableContext
                items={grouped[stage].map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  {grouped[stage].map((p) => (
                    <Card
                      key={p.id}
                      post={p}
                      checked={selectedIds.includes(p.id)}
                      onToggleChecked={toggleChecked}
                      backlinkProject={getBacklinkProject(p.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </ColumnDropZone>
          ))}
        </div>
      </DndContext>
    </main>
  );
}
