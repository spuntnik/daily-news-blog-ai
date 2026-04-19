"use client";

import { useEffect, useState } from "react";

type KwState = {
  selectedAudiences?: string[];
  selectedMarkets?: string[];
  selectedTopics?: string[];
  selectedKeywords?: string[];
  selectedTopic?: string;
  topic?: string;
};

export default function GeneratorPage() {
  const [kwState, setKwState] = useState<KwState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agseo:keywords");
      if (!raw) return;
      setKwState(JSON.parse(raw));
    } catch {
      setKwState(null);
    }
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Blog Generator</h1>

      <div
        style={{
          border: "2px solid red",
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          marginBottom: 16,
          background: "#fff8f8",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Current Context TEST
        </div>

        <div><strong>Audiences:</strong> {kwState?.selectedAudiences?.join(", ") || "—"}</div>
        <div><strong>Markets:</strong> {kwState?.selectedMarkets?.join(", ") || "—"}</div>
        <div><strong>Topics:</strong> {kwState?.selectedTopics?.join(", ") || "—"}</div>
        <div><strong>Keywords:</strong> {kwState?.selectedKeywords?.join(", ") || "—"}</div>
        <div><strong>Selected Topic:</strong> {kwState?.selectedTopic || kwState?.topic || "—"}</div>
      </div>

      <p>If you can see this red box, you are editing the correct Generator file.</p>
    </main>
  );
}