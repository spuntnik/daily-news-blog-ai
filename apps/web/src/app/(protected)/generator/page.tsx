// apps/web/src/app/(protected)/generator/page.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../../utils/supabase/browser";

type SourceItem = { title?: string; url?: string; publisher?: string };

export default function GeneratorPage() {
  const supabase = supabaseBrowser();

  const [title, setTitle] = useState("Sample Blog Title");
  const [excerpt, setExcerpt] = useState("Short excerpt / standfast goes here.");
  const [contentMd, setContentMd] = useState("# Heading\n\nThis is a sample blog body.");
  const [status, setStatus] = useState<string>("");

  async function saveToLibrary(args: {
    title: string;
    excerpt?: string;
    contentMd?: string;
    contentHtml?: string;
    sources?: SourceItem[];
  }) {
    setStatus("Saving...");

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setStatus(authError.message);
      return;
    }
    if (!auth.user) {
      setStatus("Not signed in.");
      return;
    }

    const { error } = await supabase.from("blog_posts").insert({
      user_id: auth.user.id,
      title: args.title,
      excerpt: args.excerpt ?? null,
      content_md: args.contentMd ?? null,
      content_html: args.contentHtml ?? null,
      sources: args.sources ?? [],
      status: "draft",
    });

    if (error) {
      console.error(error);
      setStatus(`Save failed: ${error.message}`);
      return;
    }

    setStatus("Saved to Library ✅");
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Generator</h1>

      <div style={{ display: "grid", gap: 10 }}>
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
            rows={10}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() =>
              saveToLibrary({
                title,
                excerpt,
                contentMd,
                sources: [
                  { title: "Example Source", url: "https://example.com", publisher: "Example" },
                ],
              })
            }
          >
            Save draft to Library
          </button>

          <div style={{ opacity: 0.8 }}>{status}</div>
        </div>
      </div>
    </main>
  );
}
