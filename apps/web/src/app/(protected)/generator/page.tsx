// apps/web/src/app/(protected)/generator/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../utils/supabase/browser";

type KwState = {
  topic?: string;
  audience?: string;
  region?: string;
  seo?: any;
  geo?: any;
  aeo?: any;
  _savedAt?: string;
};

type Generated = {
  title: string;
  excerpt: string;
  content_md: string;
};

export default function GeneratorPage() {
  const supabase = supabaseBrowser();

  const [kwState, setKwState] = useState<KwState | null>(null);

  const [title, setTitle] = useState("Sample Blog Title");
  const [excerpt, setExcerpt] = useState("Short excerpt / standfast goes here.");
  const [contentMd, setContentMd] = useState("# Heading\n\nThis is a sample blog body.");

  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

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
    } catch {
      setKwState(null);
    }
  }, []);

  function canGenerate() {
    return !!kwState?.topic && !!kwState?.seo && !!kwState?.geo && !!kwState?.aeo;
  }

  async function generateOne(variation_hint?: string): Promise<Generated> {
    if (!kwState?.topic) throw new Error("No keyword data found. Go to Keywords and generate first.");

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
        variation_hint: variation_hint || "",
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Generate failed");

    return {
      title: json.title || kwState.topic,
      excerpt: json.excerpt || "",
      content_md: json.content_md || "",
    };
  }

  async function saveDraftToLibrary(d: Generated) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in.");

    // Insert + return id
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        user_id: auth.user.id,
        title: d.title,
        excerpt: d.excerpt,
        content_md: d.content_md,
        content_html: null,
        sources: {
          keywords_source: "agseo:keywords",
          topic: kwState?.topic || null,
          region: kwState?.region || null,
          savedAt: kwState?._savedAt || null,
        },
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw error;

    const id = String((data as any)?.id || "");
    if (id) {
      setLastSavedId(id);
      setSavedIds((prev) => [id, ...prev]);
    }
    return id;
  }

  async function autoGenerateOneToEditor() {
    setStatus("Generating blog...");
    setBusy(true);
    try {
      if (!canGenerate()) {
        setStatus("No keyword data found. Go to Keywords and generate first.");
        return;
      }
      const d = await generateOne("");
      setTitle(d.title);
      setExcerpt(d.excerpt);
      setContentMd(d.content_md);
      setStatus("Generated. Review, then Save draft to Library.");
    } catch (e: any) {
      setStatus(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrentDraft() {
    setStatus("Saving...");
    setBusy(true);
    try {
      const id = await saveDraftToLibrary({ title, excerpt, content_md: contentMd });
      setStatus(id ? "Saved to Library." : "Saved to Library.");
    } catch (e: any) {
      setStatus(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function generate5AndAutoSave() {
    setStatus("Generating 5 drafts and saving to Library...");
    setBusy(true);

    const variations = [
      "Angle: practical step-by-step guide. Use Singapore/Malaysia examples if relevant. Keep it grounded and actionable.",
      "Angle: common mistakes + fixes. Include realistic constraints and trade-offs. Keep tone calm and direct.",
      "Angle: FAQ-first article. Start with the biggest question and build from there. Add a short checklist near the end.",
      "Angle: executive-friendly playbook. Short sections, crisp explanations, minimal fluff, clear next steps.",
      "Angle: story-led opening (a believable situation), then turn it into a clear framework. Keep it human.",
    ];

    try {
      if (!canGenerate()) {
        setStatus("No keyword data found. Go to Keywords and generate first.");
        return;
      }

      const newIds: string[] = [];

      // Sequential (safer for rate limits and debugging)
      for (let i = 0; i < 5; i++) {
        setStatus(`Generating draft ${i + 1}/5...`);
        const d = await generateOne(variations[i]);
        setStatus(`Saving draft ${i + 1}/5 to Library...`);
        const id = await saveDraftToLibrary(d);
        if (id) newIds.push(id);

        // Update editor with the latest generated draft (so user sees something)
        setTitle(d.title);
        setExcerpt(d.excerpt);
        setContentMd(d.content_md);
      }

      setSavedIds((prev) => [...newIds.reverse(), ...prev]);
      setLastSavedId(newIds[0] || null);

      setStatus(`Done. Saved ${newIds.length}/5 drafts to Library.`);
    } catch (e: any) {
      setStatus(e?.message || "Generate/save failed");
    } finally {
      setBusy(false);
    }
  }

  function exportDocxById(postId: string) {
    window.location.href = `/api/export-docx?id=${encodeURIComponent(postId)}`;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Generator</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={autoGenerateOneToEditor} disabled={busy}>
          Auto-generate to Editor
        </button>

        <button onClick={generate5AndAutoSave} disabled={busy}>
          Generate 5 drafts + Auto-save
        </button>

        <button onClick={saveCurrentDraft} disabled={busy}>
          Save draft to Library
        </button>

        <button onClick={() => lastSavedId && exportDocxById(lastSavedId)} disabled={!lastSavedId || busy}>
          Export last saved .docx
        </button>

        {status && <span style={{ opacity: 0.85 }}>{status}</span>}
      </div>

      {!canGenerate() && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
          No keyword session found yet. Go to <strong>Keywords</strong>, generate once, then return here.
        </div>
      )}

      {savedIds.length > 0 && (
        <div style={{ marginBottom: 14, fontSize: 13, opacity: 0.8 }}>
          Recently saved IDs: {savedIds.slice(0, 5).join(", ")}
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
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          />
        </label>
      </div>
    </main>
  );
}
