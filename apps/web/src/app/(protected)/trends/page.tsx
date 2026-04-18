"use client";

import { useEffect, useState } from "react";

type Profile = {
  siteUrl: string;
  industry: string;
  audiences: string[];
  markets: string[];
  topics: string[];
  competitors: {
    name: string;
    url: string;
    confidence: "low" | "medium" | "high";
    note: string;
  }[];
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
  whyItMatters?: string;
  suggestedAngle?: string;
  audience?: string;
  region?: string;
  confidence?: "low" | "medium" | "high";
  sourceLabel?: string;
  url?: string;
};

const SITE_PROFILE_KEY = "agseo:siteProfile";

function getConfidenceStyles(confidence?: "low" | "medium" | "high") {
  if (confidence === "high") {
    return {
      color: "#166534",
      background: "#dcfce7",
      border: "1px solid #86efac",
    };
  }

  if (confidence === "medium") {
    return {
      color: "#92400e",
      background: "#fef3c7",
      border: "1px solid #fcd34d",
    };
  }

  return {
    color: "#475569",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
  };
}

export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendCard[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        let profile: Profile | null = null;
        let kwState: StoredKwState = {};

        try {
          const rawProfile = localStorage.getItem(SITE_PROFILE_KEY);
          if (rawProfile) {
            profile = JSON.parse(rawProfile) as Profile;
          }
        } catch {
          profile = null;
        }

        try {
          const rawKw = localStorage.getItem("agseo:keywords");
          if (rawKw) {
            kwState = JSON.parse(rawKw) as StoredKwState;
          }
        } catch {
          kwState = {};
        }

        if (!profile) {
          const res = await fetch("/api/site", { cache: "no-store" });
          const json = await res.json();

          if (res.ok && json?.profile) {
            profile = json.profile as Profile;
            localStorage.setItem(SITE_PROFILE_KEY, JSON.stringify(profile));
          }
        }

        if (!profile) {
          setError(
            "No site profile found. Go to Site Setup, click Analyze site, then return here."
          );
          setTrends([]);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/trends-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            kwState,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load trends");
        }

        setTrends(Array.isArray(json?.trends) ? json.trends : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load trends");
        setTrends([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main>
      <h1 style={{ marginTop: 0, marginBottom: 12 }}>Trends</h1>
      <p style={{ marginTop: 0, marginBottom: 20 }}>
        Opportunity radar built from internal, news, and Google Trends signals.
      </p>

      {error ? (
        <p style={{ color: "crimson", marginBottom: 16 }}>{error}</p>
      ) : null}

      {loading ? (
        <p>Loading...</p>
      ) : trends.length === 0 ? (
        <p>No trends available yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
            alignItems: "start",
          }}
        >
          {trends.map((trend) => {
            const badgeStyle = getConfidenceStyles(trend.confidence);

            return (
              <div
                key={trend.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 14,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      lineHeight: 1.35,
                      fontSize: 18,
                    }}
                  >
                    {trend.title}
                  </h3>

                  <span
                    style={{
                      ...badgeStyle,
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {trend.confidence || "low"}
                  </span>
                </div>

                {trend.sourceLabel ? (
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                      marginBottom: 12,
                    }}
                  >
                    Source: {trend.sourceLabel}
                  </div>
                ) : null}

                {trend.whyItMatters ? (
                  <p style={{ marginTop: 0 }}>
                    <strong>Why it matters:</strong> {trend.whyItMatters}
                  </p>
                ) : null}

                {trend.suggestedAngle ? (
                  <p>
                    <strong>Suggested angle:</strong> {trend.suggestedAngle}
                  </p>
                ) : null}

                {trend.audience ? (
                  <p>
                    <strong>Audience:</strong> {trend.audience}
                  </p>
                ) : null}

                {trend.region ? (
                  <p style={{ marginBottom: trend.url ? 16 : 0 }}>
                    <strong>Region:</strong> {trend.region}
                  </p>
                ) : null}

                {trend.url ? (
                  <a
                    href={trend.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      textDecoration: "none",
                      color: "inherit",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Open source
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}