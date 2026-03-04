"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../utils/supabase/browser";

export default function GeneratorPage() {
  const supabase = supabaseBrowser();

  const [title, setTitle] = useState("Sample Blog Title");
  const [excerpt, setExcerpt] = useState("Short excerpt / standfast goes here.");
  const [contentMd, setContentMd] = useState("# Heading\n\nThis is a sample blog body.");
  const [status, setStatus] = useState<string>("");

  const [kwState, setKwState] = useState<any>(null);
  function exportDocxFromSavedId(postId: string) {
  window.location.href = `/api/export-docx?id=${encodeURIComponent(postId)}`;
}
  // Load latest keywords session saved by Keywords page
  useEffect(() => {
    try {
      const raw = localStorage.getItem("agseo:keywords");
      if (!raw) {
        setKwState(null);
        return;
      }
      const parsed = JSON.parse(raw);
      setKwState(parsed);
    } catch (e) {
      setKwState(null);
    }
  }, []);

  async function autoGenerate() {
    setStatus("Generating blog...");
    try {
      if (!kwState?.topic) {
        setStatus("No keyword data found. Go to Keywords and generate first.");
        return;
      }

      const res = await fetch("/api/generate-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: kwState.topic,
          audience: kwState.audience,
          region: kwState.region,
          seo: kwState.seo,
          geo: kwState.geo,
          aeo: kwState.aeo,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Generate failed");

      setTitle(json.title || kwState.topic);
      setExcerpt(json.excerpt || "");
      setContentMd(json.content_md || "");
      setStatus("Generated. Review and click Save draft to Library.");
    } catch (e: any) {
      setStatus(e?.message || "Something went wrong");
    }
  }

  async function saveDraft() {
    setStatus("Saving...");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setStatus("Not signed in.");
        return;
      }

      const { error } = await supabase.from("blog_posts").insert({
        user_id: auth.user.id,
        title,
        excerpt,
        content_md: contentMd,
        content_html: null,
        sources: {
          keywords_source: "agseo:keywords",
          topic: kwState?.topic || null,
          region: kwState?.region || null,
        },
        status: "draft",
      });

      if (error) throw error;

      setStatus("Saved to Library.");
    } catch (e: any) {
      setStatus(e?.message || "Save failed");
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Generator</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={autoGenerate}>Auto-generate from Keywords</button>
        <button onClick={saveDraft}>Save draft to Library</button>
        {status && <span style={{ opacity: 0.8 }}>{status}</span>}
      </div>

      <pre style={{ fontSize: 12, opacity: 0.7 }}>
  {JSON.stringify(
    {
      hasKwState: !!kwState,
      topic: kwState?.topic || null,
      savedAt: kwState?._savedAt || null,
      bytes: typeof window !== "undefined" ? localStorage.getItem("agseo:keywords")?.length : null,
    },
    null,
    2
  )}
</pre>
      
      {!kwState?.topic && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
          No keyword session found yet. Go to <strong>Keywords</strong>, generate once, then return here.
        </div>
      )}

      <div style={{ display: "grid", gap: 12, maxWidth: 980 }}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label>
          Excerpt
          <input
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label>
          Content (Markdown)
          <textarea
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            rows={18}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          />
        </label>
      </div>
    </main>
  );
}
