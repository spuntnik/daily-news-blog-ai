// app/library/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";

type Stage = "Draft" | "Review" | "Scheduled" | "Published" | "Archived";

type Post = {
  id: string;
  title: string;
  keyword: string | null;
  angle: string | null;
  hook_style: string | null;
  pipeline_stage: Stage;
  status: string;
  created_at: string;
  updated_at: string | null;
};

const STAGES: Stage[] = ["Draft", "Review", "Scheduled", "Published"];

export default function LibraryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // Step 4: sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function load() {
    setLoading(true);
    setErr("");
    const res = await fetch("/api/library/list", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) {
      setErr(json.error || "Failed to load");
      setLoading(false);
      return;
    }
    setPosts(json.posts);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Post[]> = {};
    for (const s of STAGES) map[s] = [];
    for (const p of posts) {
      if (map[p.pipeline_stage]) map[p.pipeline_stage].push(p);
    }
    return map;
  }, [posts]);

  async function move(id: string, next: Stage) {
    // optimistic UI
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pipeline_stage: next } : p))
    );

    const res = await fetch("/api/library/update-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pipeline_stage: next }),
    });
    const json = await res.json();
    if (!json.ok) {
      await load();
      alert(json.error || "Update failed");
    }
  }

  function stageFromPostId(id: string): Stage | null {
    const p = posts.find((x) => x.id === id);
    return p?.pipeline_stage ?? null;
  }

  // Step 5: handle drag end -> infer stage and update via existing API
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const fromStage = stageFromPostId(activeId);
    if (!fromStage) return;

    let toStage: Stage | null = null;

    // If dropped onto a column (we set column ids = stage names)
    if (STAGES.includes(overId as Stage)) {
      toStage = overId as Stage;
    } else {
      // If dropped onto another card, use that card's stage
      const overStage = stageFromPostId(overId);
      if (overStage) toStage = overStage;
    }

    if (!toStage || toStage === fromStage) return;

    await move(activeId, toStage);
  }

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (err) return <main style={{ padding: 24 }}>Error: {err}</main>;

  return (
    <main style={{ padding: 24 }}>
      {/* Step 3: wrap the whole board with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            overflowX: "auto",
          }}
        >
          {STAGES.map((stage) => (
            // IMPORTANT: id={stage} makes the column a drop target by id inference
            <section
              key={stage}
              id={stage}
              style={{
                minWidth: 320,
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <strong>{stage}</strong>
                <span>{grouped[stage]?.length ?? 0}</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {grouped[stage].map((p) => (
                  // IMPORTANT: id={p.id} allows dropping onto another card to infer stage
                  <article
                    key={p.id}
                    id={p.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", p.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    style={{
                      border: "1px solid #333",
                      borderRadius: 12,
                      padding: 12,
                      cursor: "grab",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                      {p.keyword ? `Keyword: ${p.keyword}` : "Keyword: —"}
                      {p.angle ? ` • ${p.angle}` : ""}
                      {p.hook_style ? ` • ${p.hook_style}` : ""}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {stage !== "Draft" && (
                        <button onClick={() => move(p.id, "Draft")}>← Draft</button>
                      )}
                      {stage === "Draft" && (
                        <button onClick={() => move(p.id, "Review")}>
                          To Review →
                        </button>
                      )}
                      {stage === "Review" && (
                        <>
                          <button onClick={() => move(p.id, "Draft")}>← Back</button>
                          <button onClick={() => move(p.id, "Scheduled")}>
                            Schedule →
                          </button>
                        </>
                      )}
                      {stage === "Scheduled" && (
                        <>
                          <button onClick={() => move(p.id, "Review")}>← Back</button>
                          <button onClick={() => move(p.id, "Published")}>
                            Publish →
                          </button>
                        </>
                      )}
                      {stage === "Published" && (
                        <button onClick={() => move(p.id, "Scheduled")}>← Back</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DndContext>
    </main>
  );
}
