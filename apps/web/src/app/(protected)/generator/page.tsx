"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../utils/supabase/browser";
import type { AddonProfile, GeneratorMode } from "../../../lib/addon/types";

type KwState = {
  topic?: string;
  selectedTopic?: string;
  selectedKeywords?: string[];
  selectedAudiences?: string[];
  selectedMarkets?: string[];
  selectedTopics?: string[];
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

type AddonGenerated = {
  blogTitle: string;
  seoTitle: string;
  metaDescription: string;
  blogHtml: string;
  faqs: { question: string; answer: string }[];
  cta: string;
};

function ContextRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <strong>{label}:</strong> {values.length ? values.join(", ") : "—"}
    </div>
  );
}

export default function GeneratorPage() {
  const supabase = supabaseBrowser();

  const [kwState, setKwState] = useState<KwState | null>(null);
  const [topicInput, setTopicInput] = useState("");

  const [mode, setMode] = useState<GeneratorMode>("standard");
  const [profile, setProfile] = useState<AddonProfile>("strategic-article");
  const [activeTab, setActiveTab] = useState<"blog" | "seo" | "faq">("blog");
  const [addonResult, setAddonResult] = useState<AddonGenerated | null>(null);

  const [title, setTitle] = useState("Sample Blog Title");
  const [excerpt, setExcerpt] = useState("Short excerpt / standfast goes here.");
  const [contentMd, setContentMd] = useState("# Heading\n\nThis is a sample blog body.");

  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agseo:keywords");
      if (!raw) {
        setKwState(null);
        setTopicInput("");
        return;
      }

      const parsed = JSON.parse(raw);
      setKwState(parsed);
      setTopicInput(parsed.selectedTopic || parsed.topic || "");
    } catch {
      setKwState(null);
      setTopicInput("");
    }
  }, []);

  function canGenerate() {
    return !!topicInput && !!kwState?.seo && !!kwState?.geo && !!kwState?.aeo;
  }

  async function generateOne(variation_hint?: string): Promise<Generated> {
    if (!topicInput) {
      throw new Error("No topic found. Go to Site or Keywords and select a topic first.");
    }

    const res = await fetch("/api/generate-blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        profile,
        topic: topicInput,
        audience: kwState?.selectedAudiences?.[0] || kwState?.audience,
        region: kwState?.selectedMarkets?.[0] || kwState?.region,
        seo: kwState?.seo,
        geo: kwState?.geo,
        aeo: kwState?.aeo,
        selectedKeywords: kwState?.selectedKeywords || [],
        selectedTopics: kwState?.selectedTopics || [],
        context: {
          audiences: kwState?.selectedAudiences || [],
          markets: kwState?.selectedMarkets || [],
          topics: kwState?.selectedTopics || [],
        },
        variation_hint: variation_hint || "",
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Generate failed");

    if (mode === "addon-beta") {
      const addonPayload: AddonGenerated = {
        blogTitle: json.blogTitle || topicInput,
        seoTitle: json.seoTitle || "",
        metaDescription: json.metaDescription || "",
        blogHtml: json.blogHtml || "",
        faqs: Array.isArray(json.faqs) ? json.faqs : [],
        cta: json.cta || "",
      };

      setAddonResult(addonPayload);
      setActiveTab("blog");

      return {
        title: addonPayload.blogTitle,
        excerpt: addonPayload.metaDescription || "",
        content_md: addonPayload.blogHtml || "",
      };
    }

    setAddonResult(null);

    return {
      title: json.title || topicInput,
      excerpt: json.excerpt || "",
      content_md: json.content_md || "",
    };
  }

  async function saveDraftToLibrary(d: Generated) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in.");

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        user_id: auth.user.id,
        title: d.title,
        excerpt: d.excerpt,
        content_md: d.content_md,
        content_html: mode === "addon-beta" ? addonResult?.blogHtml || null : null,
        sources: {
          keywords_source: "agseo:keywords",
          topic: topicInput || null,
          selectedKeywords: kwState?.selectedKeywords || [],
          selectedTopics: kwState?.selectedTopics || [],
          selectedAudiences: kwState?.selectedAudiences || [],
          selectedMarkets: kwState?.selectedMarkets || [],
          region: kwState?.selectedMarkets?.[0] || kwState?.region || null,
          savedAt: kwState?._savedAt || null,
          mode,
          profile: mode === "addon-beta" ? profile : null,
          addon:
            mode === "addon-beta"
              ? {
                  seoTitle: addonResult?.seoTitle || "",
                  metaDescription: addonResult?.metaDescription || "",
                  faqs: addonResult?.faqs || [],
                  cta: addonResult?.cta || "",
                }
              : null,
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
    setStatus(mode === "addon-beta" ? "Generating add-on content..." : "Generating blog...");
    setBusy(true);

    try {
      if (!canGenerate()) {
        setStatus("No topic or keyword session found. Go to Site or Keywords first.");
        return;
      }

      const d = await generateOne("");

      setTitle(d.title);
      setExcerpt(d.excerpt);
      setContentMd(d.content_md);

      if (mode === "addon-beta") {
        setStatus("Generated add-on content. Saving to Library...");
        const id = await saveDraftToLibrary(d);
        setStatus(id ? "Generated and auto-saved to Library." : "Generated and auto-saved to Library.");
      } else {
        setStatus("Generated. Review, then Save draft to Library.");
      }
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
      const id = await saveDraftToLibrary({
        title,
        excerpt,
        content_md: contentMd,
      });
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

    const selectedKeywords = (kwState?.selectedKeywords || []).slice(0, 5);

    const variations = [
      "Angle: practical step-by-step guide. Use local examples if relevant. Keep it grounded and actionable.",
      "Angle: common mistakes + fixes. Include realistic constraints and trade-offs. Keep tone calm and direct.",
      "Angle: FAQ-first article. Start with the biggest question and build from there. Add a short checklist near the end.",
      "Angle: executive-friendly playbook. Short sections, crisp explanations, minimal fluff, clear next steps.",
      "Angle: story-led opening (a believable situation), then turn it into a clear framework. Keep it human.",
    ];

    try {
      if (!canGenerate()) {
        setStatus("No topic or keyword session found. Go to Site or Keywords first.");
        return;
      }

      const newIds: string[] = [];
      const topicsToUse = selectedKeywords.length > 0 ? selectedKeywords : [topicInput];

      for (let i = 0; i < topicsToUse.length; i++) {
        const activeTopic = topicsToUse[i];

        setTopicInput(activeTopic);
        setStatus(`Generating draft ${i + 1}/${topicsToUse.length}...`);

        const d = await generateOne(
          selectedKeywords.length > 0
            ? `Focus on keyword: ${activeTopic}`
            : variations[i] || ""
        );

        setStatus(`Saving draft ${i + 1}/${topicsToUse.length} to Library...`);
        const id = await saveDraftToLibrary(d);
        if (id) newIds.push(id);

        setTitle(d.title);
        setExcerpt(d.excerpt);
        setContentMd(d.content_md);
      }

      setSavedIds((prev) => [...newIds.reverse(), ...prev]);
      setLastSavedId(newIds[0] || null);

      setStatus(`Done. Saved ${newIds.length}/${topicsToUse.length} drafts to Library.`);
    } catch (e: any) {
      setStatus(e?.message || "Generate/save failed");
    } finally {
      setBusy(false);
    }
  }

  function exportDocxById(postId: string) {
    window.location.href = `/api/export-docx?id=${encodeURIComponent(postId)}`;
  }

  function chooseKeyword(keyword: string) {
    setTopicInput(keyword);
    try {
      const raw = localStorage.getItem("agseo:keywords");
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        "agseo:keywords",
        JSON.stringify({
          ...parsed,
          selectedTopic: keyword,
        })
      );
      setKwState((prev) =>
        prev
          ? {
              ...prev,
              selectedTopic: keyword,
            }
          : prev
      );
    } catch {
      // ignore
    }
  }

  const audiences = kwState?.selectedAudiences || [];
  const markets = kwState?.selectedMarkets || [];
  const topics = kwState?.selectedTopics || [];
  const keywords = kwState?.selectedKeywords || [];

  return (
    <main style={{ padding: 24 }}>
      <h1>Blog Generator</h1>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Current Context</div>
        <ContextRow label="Audiences" values={audiences} />
        <ContextRow label="Markets" values={markets} />
        <ContextRow label="Topics" values={topics} />
        <ContextRow label="Keywords" values={keywords} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setMode("standard")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: mode === "standard" ? "#111" : "#fff",
            color: mode === "standard" ? "#fff" : "#111",
          }}
        >
          Standard
        </button>

        <button
          type="button"
          onClick={() => setMode("addon-beta")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: mode === "addon-beta" ? "#111" : "#fff",
            color: mode === "addon-beta" ? "#fff" : "#111",
          }}
        >
          Add-on (Beta)
        </button>
      </div>

      {mode === "addon-beta" && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Content Type</label>
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as AddonProfile)}
            style={{ padding: "8px 12px", borderRadius: 8, minWidth: 240 }}
          >
            <option value="strategic-article">Strategic Article</option>
            <option value="authority-blog">Authority Blog</option>
            <option value="seo-faq">SEO + FAQ</option>
            <option value="conversion-article">Conversion Article</option>
          </select>
        </div>
      )}

      <div style={{ display: "grid", gap: 12, maxWidth: 980, marginBottom: 16 }}>
        <label>
          Selected Topic
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Choose a topic from Site, or type one here"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        {keywords.length > 0 && (
          <div
            style={{
              padding: 12,
              border: "1px solid #eee",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Selected keywords from Keywords page
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {keywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => chooseKeyword(keyword)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: topicInput === keyword ? "#111" : "#fff",
                    color: topicInput === keyword ? "#fff" : "#111",
                    cursor: "pointer",
                  }}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
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

        {lastSavedId ? (
          <Link
            href={`/linkedin?postId=${encodeURIComponent(lastSavedId)}`}
            style={{ textDecoration: "underline" }}
          >
            Create LinkedIn Post
          </Link>
        ) : null}

        {status && <span style={{ opacity: 0.85 }}>{status}</span>}
      </div>

      {!canGenerate() && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 10,
          }}
        >
          No topic or keyword session found yet. Go to <strong>Site</strong> or <strong>Keywords</strong> first.
        </div>
      )}

      {savedIds.length > 0 && (
        <div style={{ marginBottom: 14, fontSize: 13, opacity: 0.8 }}>
          Recently saved IDs: {savedIds.slice(0, 5).join(", ")}
        </div>
      )}

      {mode === "addon-beta" && addonResult?.blogTitle ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setActiveTab("blog")}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: activeTab === "blog" ? "#111" : "#fff",
                color: activeTab === "blog" ? "#fff" : "#111",
              }}
            >
              Blog
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("seo")}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: activeTab === "seo" ? "#111" : "#fff",
                color: activeTab === "seo" ? "#fff" : "#111",
              }}
            >
              SEO
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("faq")}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: activeTab === "faq" ? "#111" : "#fff",
                color: activeTab === "faq" ? "#fff" : "#111",
              }}
            >
              FAQ
            </button>
          </div>

          {activeTab === "blog" && (
            <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <h2 style={{ margin: 0 }}>{addonResult.blogTitle}</h2>
                {lastSavedId ? (
                  <Link
                    href={`/linkedin?postId=${encodeURIComponent(lastSavedId)}`}
                    style={{ textDecoration: "underline" }}
                  >
                    Create LinkedIn Post
                  </Link>
                ) : null}
              </div>

              <div dangerouslySetInnerHTML={{ __html: addonResult.blogHtml }} />
              <p style={{ marginTop: 16 }}>
                <strong>CTA:</strong> {addonResult.cta}
              </p>
            </div>
          )}

          {activeTab === "seo" && (
            <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
              <p>
                <strong>SEO Title:</strong> {addonResult.seoTitle}
              </p>
              <p>
                <strong>Meta Description:</strong> {addonResult.metaDescription}
              </p>
            </div>
          )}

          {activeTab === "faq" && (
            <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
              {addonResult.faqs?.length ? (
                addonResult.faqs.map((faq, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <strong>{faq.question}</strong>
                    <p>{faq.answer}</p>
                  </div>
                ))
              ) : (
                <p>No FAQ entries returned.</p>
              )}
            </div>
          )}
        </div>
      ) : null}

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
          Content (Markdown / HTML)
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
