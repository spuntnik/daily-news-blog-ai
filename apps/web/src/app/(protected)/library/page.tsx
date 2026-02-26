"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/browser";

export default function LibraryPage() {
  const supabase = supabaseBrowser();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,created_at,sources")
      .order("created_at", { ascending: false });

    setPosts(data || []);
  }

  return (
    <div>
      <h1>Library</h1>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))" }}>
        {posts.map((p) => (
          <Link key={p.id} href={`/library/${p.id}`}>
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                background: "#111",
                color: "white",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600 }}>{p.title}</div>

              <div style={{ opacity: 0.7, marginTop: 6 }}>
                {new Date(p.created_at).toLocaleDateString()} ·{" "}
                {(p.sources?.length || 0)} sources
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
