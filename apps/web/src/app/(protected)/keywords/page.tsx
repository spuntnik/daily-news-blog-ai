"use client";

import { useMemo, useState } from "react";

type Item = {
  keyword: string;
  bucket: "SEO" | "GEO" | "AEO";
  intent?: string;
  stage?: string;
  difficulty?: string;
  priority?: number;
};

export default function KeywordsPage() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("content creators and agencies");
  const [region, setRegion] = useState("Singapore");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<string, Item[]> = { SEO: [], GEO: [], AEO: [] };
    for (const i of items) buckets[i.bucket].push(i);
    return buckets;
  }, [items]);

  async function generate() {
    setLoading(true);
    setError(null);
    setRunId(null);
    setItems([]);

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience, region, language }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      setRunId(data.runId);
      setItems(data.items);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Keywords</h1>
      <p style={{ opacity: 0.8 }}>
        Generate GEO/SEO/AEO keyword clusters and save them to your library.
      </p>

      <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <label>
          Topic
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., diabetic meal plan, AI resume writing, skincare serum"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            Audience
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label>
            Region
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>
        </div>

        <label>
          Language
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button onClick={generate} disabled={loading || topic.trim().length < 2}>
          {loading ? "Generating..." : "Generate keywords"}
        </button>

        {error && <div style={{ color: "crimson" }}>{error}</div>}
        {runId && <div style={{ opacity: 0.8 }}>Saved Run ID: {runId}</div>}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 24, display: "grid", gap: 20 }}>
          <Bucket title="SEO Keywords" items={grouped.SEO} />
          <Bucket title="GEO Prompts" items={grouped.GEO} />
          <Bucket title="AEO Questions" items={grouped.AEO} />
        </div>
      )}
    </div>
  );
}

function Bucket({ title, items }: { title: string; items: Item[] }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Keyword</th>
              <th align="left">Intent</th>
              <th align="left">Stage</th>
              <th align="left">Priority</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 40).map((i, idx) => (
              <tr key={idx}>
                <td style={{ padding: "8px 0" }}>{i.keyword}</td>
                <td>{i.intent || "-"}</td>
                <td>{i.stage || "-"}</td>
                <td>{i.priority ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length > 40 && (
        <div style={{ marginTop: 10, opacity: 0.7 }}>
          Showing 40 of {items.length}. (We can add pagination + export next.)
        </div>
      )}
    </div>
  );
}
