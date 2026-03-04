// apps/web/src/app/(protected)/library/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../utils/supabase/browser";

type PostRow = {
  id: string;
  title: string;
  created_at: string;
  status: string;
  sources: any;
};

const PIPELINE = ["draft", "review", "scheduled", "published"] as const;

export default function LibraryPage() {
  const supabase = supabaseBrowser();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,created_at,status,sources")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts((data as any) || []);
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const buckets: Record<string, PostRow[]> = {};
    for (const s of PIPELINE) buckets[s] = [];
    buckets["other"] = [];

    for (const p of posts) {
      const st = (p.status || "draft").toLowerCase();
      if (buckets[st]) buckets[st].push(p);
      else buckets["other"].push(p);
    }
    return buckets;
  }, [posts]);

  function exportDocx(id: string) {
    window.location.href = `/api/export-docx?id=${encodeURIComponent(id)}`;
  }

  function statusLabel(s: string) {
    const t = (s || "draft").toLowerCase();
    if (t === "draft") return "Draft";
    if (t === "review") return "Review";
    if (t === "scheduled") return "Scheduled";
    if (t === "published") return "Published";
    return "Other";
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <h1>Library</h1>
        <button onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {PIPELINE.map((col) => (
          <div key={col} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{statusLabel(col)}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{grouped[col].length}</div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {grouped[col].map((p) => (
                <Link key={p.id} href={`/library/${p.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 12,
                      padding: 12,
                      cursor: "pointer",
                      background: "#111",
                      color: "white",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
                      {p.title}
                    </div>

                    <div style={{ opacity: 0.75, marginTop: 6, fontSize: 12 }}>
                      {new Date(p.created_at).toLocaleDateString()} · {(p?.sources ? 1 : 0)} source bundle
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          exportDocx(p.id);
                        }}
                        style={{ fontSize: 12, padding: "6px 8px", cursor: "pointer" }}
                      >
                        Export .docx
                      </button>
                    </div>
                  </div>
                </Link>
              ))}

              {grouped[col].length === 0 && (
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  No items yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
