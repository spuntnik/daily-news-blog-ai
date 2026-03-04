"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../utils/supabase/browser";

type KeywordsV2 = {
  topic: string;
  audience?: string;
  region?: string;
  language?: string;
  data?: any; // full API payload
};

export default function GeneratorPage() {
  const supabase = supabaseBrowser();

  const [title, setTitle] = useState("Sample Blog Title");
  const [excerpt, setExcerpt] = useState("Short excerpt / standfast goes here.");
  const [contentMd, setContentMd] = useState("# Heading\n\nThis is a sample blog body.");
  const [status, setStatus] = useState<string>("");

  const [kwState, setKwState] = useState<any>(null);

  // Load keywords state saved by usePageState("/keywords-v2", ...)
  useEffect(() => {
  try {
    const candidates = [
      "page_state:/keywords-v2",
      "page_state:/keywords",
      "usePageState:/keywords-v2",
      "usePageState:/keywords",
      "pageState:/keywords-v2",
      "pageState:/keywords",
      "/keywords-v2",
      "/keywords",
    ];

    let found: any = null;

    // 1) Try known keys first
    for (const k of candidates) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      // common shapes:
      // A) { state: {...} }
      // B) { value: {...} }
      // C) { data: {...}, topic: ... }  (already the state)
      // D) {...}                        (already the state)
      const s = parsed?.state || parsed?.value || parsed;

      // keywords page stores full payload in state.data
      const payload = s?.data || s;
      if (payload?.seo && payload?.geo && payload?.aeo) {
        found = payload;
        break;
      }
    }

    // 2) If not found, scan for anything that looks like keywords state
    if (!found) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (!key.includes("keywords")) continue;

        const raw = localStorage.getItem(key);
        if (!raw) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }

        const s = parsed?.state || parsed?.value || parsed;
        const payload = s?.data || s;

        if (payload?.seo && payload?.geo && payload?.aeo) {
          found = payload;
          break;
        }
      }
    }

    setKwState(found);
  } catch {
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
          keywords_source: "keywords-v2",
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
      hasKw: !!kwState, 
      keys: Object.keys(localStorage).filter(k => k.includes("keywords")) 
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
            style={{ width: "100%", padding: 10, marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
          />
        </label>
      </div>
    </main>
  );
}
