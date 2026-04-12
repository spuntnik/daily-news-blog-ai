"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  siteUrl: string;
  industry: string;
  audiences: string[];
  markets: string[];
  topics: string[];
  competitors: { name: string; url: string; confidence: "low" | "medium" | "high"; note: string }[];
  needsClarification: boolean;
  suggestedPromptQuestions: string[];
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

type TrendCard = {
  id: string;
  title: string;
  whyItMatters: string;
  suggestedAngle: string;
  audience: string;
  region: string;
  sourceTopic: string;
  confidence: "low" | "medium" | "high";
  sourceLabel: string;
  url?: string;
};

const SITE_PROFILE_KEY = "agseo:siteProfile";

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
  const [debugSource, setDebugSource] = useState("");
  const [trends, setTrends] = useState<TrendCard[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedTopicHint, setSelectedTopicHint] = useState("");
  const [counts, setCounts] = useState<{
    internal: number;
    news: number;
    google: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    loadTrends();
  }, []);

  async function loadTrends() {
    setLoading(true);
    setError("");
    setDebugSource("");

    try {
      let localProfile: Profile | null = null;
      let kwState: StoredKwState = {};

      try {
        const rawProfile = localStorage.getItem(SITE_PROFILE_KEY);
        if (rawProfile) {
          localProfile = JSON.parse(rawProfile) as Profile;
          setDebugSource("Loaded profile from localStorage");
        }
      } catch {
        // ignore
      }

      try {
        const rawKw = localStorage.getItem("agseo:keywords");
        if (rawKw) {
          kwState = JSON.parse(rawKw) as StoredKwState;
        }
      } catch {
        // ignore
      }

      const selected = kwState.selectedTopic || kwState.topic || "";
      setSelectedTopicHint(selected);

      if (!localProfile) {
        try {
          const res = await fetch("/api/site", { cache: "no-store" });
          const data = await res.json();
          if (res.ok && data?.profile) {
            localProfile = data.profile as Profile;
            localStorage.setItem(SITE_PROFILE_KEY, JSON.stringify(localProfile));
            setDebugSource("Loaded profile from /api/site");
          }
        } catch {
          // ignore
        }
      }

      if (!localProfile) {
        setError("No site profile found. Go to Site Setup, click Analyze site, then return here.");
        setTrends([]);
        setProfile(null);
        setCounts(null);
        return;
      }

      setProfile(localProfile);

      const res = await fetch("/api/trends-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: localProfile,
          kwState,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load Trends V2");
      }

      setTrends(Array.isArray(json?.trends) ? json.trends : []);
      setCounts(
        json?.counts || {
          internal: 0,
          news: 0,
          google: 0,
          total: 0,
        }
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load trends");
      setTrends([]);
      setCounts(null);
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
            Opportunity radar built from internal + external signals.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={refreshNow} disabled={loading || refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {debugSource ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            fontSize: 13,
            opacity: 0.85,
          }}
        >
          {debugSource}
        </div>
      ) : null}

      {profile ? (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            border: "1px solid #eee",
            borderRadius: 12,
            maxWidth: 1100,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Profile Summary</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            <strong>Industry:</strong> {profile.industry || "—"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
            <strong>Audiences:</strong> {(profile.audiences || []).join(", ") || "—"}
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
            <strong>Markets:</strong> {(profile.markets || []).join(", ") || "—"}
          </div>
          {selectedTopicHint ? (
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
              <strong>Current selected topic bias:</strong> {selectedTopicHint}
            </div>
          ) : null}

          {counts ? (
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
              <strong>Signals:</strong> internal {counts.internal} · news {counts.news} · google {counts.google} · total {counts.total}
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

              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                Source: {trend.sourceLabel}
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

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => useTrendInGenerator(trend)}>
                  Use in Generator
                </button>

                {trend.url ? (
                  <a
                    href={trend.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    Open source
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
