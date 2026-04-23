"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type BlogPost = {
  id: string;
  title: string;
  excerpt?: string;
};

export default function LinkedInPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const [tone, setTone] = useState("Reflective");
  const [length, setLength] = useState("Short");

  const [generated, setGenerated] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,excerpt")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setPosts(data);
  }

  async function generatePosts() {
    if (!selectedPost) return;

    setLoading(true);

    const res = await fetch("/api/generate-linkedin", {
      method: "POST",
      body: JSON.stringify({
        title: selectedPost.title,
        excerpt: selectedPost.excerpt,
        tone,
        length,
      }),
    });

    const data = await res.json();

    // attach metadata for UI labels
    const enriched = data.map((item: any) => ({
      ...item,
      source: "Blog",
      tone,
      length,
    }));

    setGenerated(enriched);
    setLoading(false);
  }

  async function saveAll() {
    if (!generated.length || !selectedPost) return;

    const payload = generated.map((g) => ({
      blog_post_id: selectedPost.id,
      content: g.full,
      hook: g.hook,
      body: g.body,
      cta: g.cta,
      tone: g.tone,
      length: g.length,
      source: g.source,
    }));

    await supabase.from("linkedin_drafts").insert(payload);

    alert("Saved successfully");
  }

  function exportCSV() {
    if (!generated.length) return;

    const rows = generated.map((g) => ({
      source: g.source,
      tone: g.tone,
      length: g.length,
      hook: g.hook,
      body: g.body,
      cta: g.cta,
      full: g.full,
    }));

    const csv =
      [
        Object.keys(rows[0]).join(","),
        ...rows.map((r) =>
          Object.values(r)
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "linkedin_posts.csv";
    a.click();
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">LinkedIn Posts</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          <div className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Source</h2>

            <select
              className="w-full border p-2"
              onChange={(e) =>
                setSelectedPost(
                  posts.find((p) => p.id === e.target.value) || null
                )
              }
            >
              <option>Select blog post</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="border p-4 rounded space-y-3">
            <h2 className="font-semibold">Generation Settings</h2>

            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full border p-2"
            >
              <option>Reflective</option>
              <option>Blair Warren</option>
              <option>Thought Leadership</option>
              <option>Contrarian</option>
            </select>

            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full border p-2"
            >
              <option>Short</option>
              <option>Medium</option>
              <option>Long</option>
            </select>

            <button
              onClick={generatePosts}
              className="bg-black text-white px-4 py-2 w-full"
            >
              Generate LinkedIn Posts
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          <div className="border p-4 rounded flex justify-between items-center">
            <span className="font-semibold">Generated Drafts</span>

            <div className="flex gap-2">
              <button
                onClick={saveAll}
                className="border px-3 py-1 text-sm"
              >
                Save All
              </button>
              <button
                onClick={exportCSV}
                className="border px-3 py-1 text-sm"
              >
                Export CSV
              </button>
            </div>
          </div>

          {loading && <div>Generating...</div>}

          {!generated.length && (
            <div className="border p-4 rounded text-gray-500">
              Generate drafts to preview here.
            </div>
          )}

          {generated.map((g, i) => (
            <div key={i} className="border p-4 rounded space-y-3">

              {/* ✅ NEW LABEL BAR */}
              <div className="flex gap-2 text-xs">
                <span className="bg-gray-200 px-2 py-1 rounded">
                  Source: {g.source}
                </span>
                <span className="bg-gray-200 px-2 py-1 rounded">
                  Tone: {g.tone}
                </span>
                <span className="bg-gray-200 px-2 py-1 rounded">
                  Length: {g.length}
                </span>
              </div>

              <div>
                <strong>Hook</strong>
                <p>{g.hook}</p>
              </div>

              <div>
                <strong>Body</strong>
                <p>{g.body}</p>
              </div>

              <div>
                <strong>CTA</strong>
                <p>{g.cta}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <strong>Full Post</strong>
                <p>{g.full}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
