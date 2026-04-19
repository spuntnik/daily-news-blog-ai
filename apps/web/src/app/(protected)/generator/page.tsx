"use client";

import { useEffect, useState } from "react";

type KwState = {
  selectedAudiences?: string[];
  selectedMarkets?: string[];
  selectedTopics?: string[];
  selectedKeywords?: string[];
  selectedTopic?: string;
  topic?: string;
  audience?: string;
  region?: string;
};

export default function GeneratorPage() {
  const [kwState, setKwState] = useState<KwState | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agseo:keywords");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      setKwState(parsed);

      setTopicInput(
        parsed.selectedTopic ||
        parsed.selectedTopics?.[0] ||
        parsed.topic ||
        ""
      );
    } catch {
      setKwState(null);
    }
  }, []);

  const audiences = kwState?.selectedAudiences || [];
  const markets = kwState?.selectedMarkets || [];
  const topics = kwState?.selectedTopics || [];
  const keywords = kwState?.selectedKeywords || [];

  async function generate() {
    if (!topicInput) {
      setStatus("No topic selected.");
      return;
    }

    setBusy(true);
    setStatus("Generating...");

    try {
      const res = await fetch("/api/generate-blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topicInput,
          audience: audiences[0] || kwState?.audience,
          region: markets[0] || kwState?.region,
          selectedKeywords: keywords,
          selectedTopics: topics,
          context: {
            audiences,
            markets,
            topics,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to generate");
      }

      setStatus("Generated successfully.");
    } catch (e: any) {
      setStatus(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Blog Generator</h1>

      {/* CONTEXT PANEL */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Current Context
        </div>

        <ContextRow label="Audiences" values={audiences} />
        <ContextRow label="Markets" values={markets} />
        <ContextRow label="Topics" values={topics} />
        <ContextRow label="Keywords" values={keywords} />
      </div>

      {/* TOPIC */}
      <div style={{ marginBottom: 16 }}>
        <label>
          Topic
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
            }}
          />
        </label>
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={generate} disabled={busy}>
          {busy ? "Generating..." : "Generate Blog"}
        </button>
      </div>

      {/* STATUS */}
      {status && (
        <div style={{ marginTop: 12, opacity: 0.8 }}>
          {status}
        </div>
      )}
    </main>
  );
}

function ContextRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <strong>{label}:</strong>{" "}
      {values.length ? values.join(", ") : "—"}
    </div>
  );
}