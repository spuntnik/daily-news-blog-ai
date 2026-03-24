// apps/web/src/app/(protected)/library/page.tsx
// apps/web/src/app/(protected)/library/page.tsx
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
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
}: {
  post: PostRow;
  checked: boolean;
  onToggleChecked: (id: string) => void;
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
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>{post.title}</div>
          <div style={{ fontSize: 12, opacity: 0.75, color: "#fff" }}>
            {new Date(post.created_at).toLocaleString()}
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/api/export-docx?id=${post.id}`;
              }}
            >
              Export .docx
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LibraryPage() {
  const supabase = supabaseBrowser();

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,created_at,status,sources")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = ((data as any[]) ?? []).map((p) => ({
        ...p,
        status: (PIPELINE.includes(p.status) ? p.status : "draft") as Stage,
      })) as PostRow[];

      setPosts(normalized);
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
  }

  async function deleteSelected() {
    if (!selectedIds.length) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected item(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      const res = await fetch("/api/library/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");

      setSelectedIds([]);
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setBulkBusy(false);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <strong style={{ fontSize: 26 }}>Library</strong>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading || bulkBusy}>
            {loading ? "Loading…" : "Refresh"}
          </button>

          <button onClick={deleteSelected} disabled={!selectedIds.length || bulkBusy}>
            Delete selected ({selectedIds.length})
          </button>

          <button onClick={clearSelection} disabled={!selectedIds.length || bulkBusy}>
            Clear selection
          </button>

          <Link href="/generator">Generator</Link>
        </div>
      </div>

      {err ? (
        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 12, marginBottom: 12 }}>
          Error: {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => selectAllInStage("draft")} disabled={bulkBusy}>
          Select all Draft
        </button>
        <button onClick={() => selectAllInStage("review")} disabled={bulkBusy}>
          Select all Review
        </button>
        <button onClick={() => selectAllInStage("scheduled")} disabled={bulkBusy}>
          Select all Scheduled
        </button>
        <button onClick={() => selectAllInStage("published")} disabled={bulkBusy}>
          Select all Published
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
