// apps/web/src/app/(protected)/trends/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TrendCard = {
  id: string;
  title: string;
  whyItMatters: string;
  suggestedAngle: string;
  audience: string;
  region: string;
  sourceTopic: string;
  confidence: "low" | "medium" | "high";
};

type TrendsResponse = {
  ok?: boolean;
  trends?: TrendCard[];
  profileSummary?: {
    industry: string;
    audiences: string[];
    markets: string[];
  };
  error?: string;
};

type StoredKwState = {
  topic?: string;
  selectedTopic?: string;
  audience?: string;
  region?: string;
  seo?: any;
  geo?: any;
  aeo?: any;
  _savedAt?: string;
};

function confidenceColor(confidence: TrendCard["confidence"]) {
  if (confidence === "high") return "#166534";
  if (confidence === "medium") return "#a16207";
  return "#6b7280";
}

export default function TrendsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [trends, setTrends] = useState<TrendCard[]>([]);
  const [profileSummary, setProfileSummary] = useState<TrendsResponse["profileSummary"] | null>(null);
  const [selectedTopicHint, setSelectedTopicHint] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agseo:keywords");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredKwState;
        setSelectedTopicHint(parsed.selectedTopic || parsed.topic || "");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopicHint]);

  async function loadTrends() {
    setLoading(true);
    setError("");

    try {
      const qs = selectedTopicHint
        ? `?selectedTopic=${encodeURIComponent(selectedTopicHint)}`
        : "";

      const res = await fetch(`/api/trends${qs}`, { cache: "no-store" });
      const json: TrendsResponse = await res.json();

      if (!res.ok) throw new Error(json?.error || "Failed to load trends");

      setTrends(json.trends || []);
      setProfileSummary(json.profileSummary || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load trends");
      setTrends([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshNow() {
    setRefreshing(true);
    await loadTrends();
    setRefreshing(false);
  }

  function useTrendInGenerator(trend: TrendCard) {
    try {
      const raw = localStorage.getItem("agseo:keywords");
      let existing: StoredKwState = {};

      if (raw) {
        try {
          existing = JSON.parse(raw);
        } catch {
          existing = {};
        }
      }

      const nextState: StoredKwState = {
        ...existing,
        topic: trend.title,
        selectedTopic: trend.title,
        audience: trend.audience || existing.audience,
        region: trend.region || existing.region,
        _savedAt: new Date().toISOString(),
      };

      localStorage.setItem("agseo:keywords", JSON.stringify(nextState));
      router.push("/generator");
    } catch {
      router.push("/generator");
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Trends</h1>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Opportunity radar built from your Site Setup and saved keyword session.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={refreshNow} disabled={loading || refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {profileSummary ? (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            border: "1px solid #eee",
            borderRadius: 12,
            maxWidth: 980,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Profile Summary</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            <strong>Industry:</strong> {profileSummary.industry || "—"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
            <strong>Audiences:</strong> {(profileSummary.audiences || []).join(", ") || "—"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
            <strong>Markets:</strong> {(profileSummary.markets || []).join(", ") || "—"}
          </div>
          {selectedTopicHint ? (
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
              <strong>Current selected topic bias:</strong> {selectedTopicHint}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #f3d2d2",
            borderRadius: 12,
            color: "crimson",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ opacity: 0.8 }}>Loading trends...</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            maxWidth: 1200,
          }}
        >
          {trends.map((trend) => (
            <article
              key={trend.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 16,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <strong style={{ lineHeight: 1.35 }}>{trend.title}</strong>
                <span
                  style={{
                    color: confidenceColor(trend.confidence),
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {trend.confidence}
                </span>
              </div>

              <div style={{ fontSize: 14, marginBottom: 8 }}>
                <strong>Why it matters:</strong> {trend.whyItMatters}
              </div>

              <div style={{ fontSize: 14, marginBottom: 8 }}>
                <strong>Suggested angle:</strong> {trend.suggestedAngle}
              </div>

              <div style={{ fontSize: 14, marginBottom: 4 }}>
                <strong>Audience:</strong> {trend.audience}
              </div>

              <div style={{ fontSize: 14, marginBottom: 14 }}>
                <strong>Region:</strong> {trend.region}
              </div>

              <button onClick={() => useTrendInGenerator(trend)}>
                Use in Generator
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
