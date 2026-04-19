"use client";

import { useEffect, useMemo, useState } from "react";

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
  __uiSelections?: {
    selectedAudiences?: string[];
    selectedMarkets?: string[];
    selectedTopics?: string[];
  };
};

type StoredKwState = {
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

function getRelevanceColor(score: number) {
  if (score >= 75) return "#F57513";
  if (score >= 45) return "#F54927";
  return "#E97451";
}

function scoreToLabel(score: number) {
  if (score >= 75) return "High relevance";
  if (score >= 45) return "Medium relevance";
  return "Low relevance";
}

function buildSearchText(trend: TrendCard) {
  return [
    trend.title,
    trend.whyItMatters,
    trend.suggestedAngle,
    trend.audience,
    trend.region,
    trend.sourceLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesAny(searchText: string, items: string[]) {
  if (!items.length) return 0;

  let hits = 0;

  for (const item of items) {
    const needle = item.trim().toLowerCase();
    if (needle && searchText.includes(needle)) {
      hits += 1;
    }
  }

  return hits;
}

function computeRelevanceScore(
  trend: TrendCard,
  selectedAudiences: string[],
  selectedMarkets: string[],
  selectedTopics: string[]
) {
  const searchText = buildSearchText(trend);

  const audienceHits = matchesAny(searchText, selectedAudiences);
  const marketHits = matchesAny(searchText, selectedMarkets);
  const topicHits = matchesAny(searchText, selectedTopics);

  let score = 20;

  score += audienceHits * 18;
  score += marketHits * 20;
  score += topicHits * 22;

  if (
    trend.audience &&
    selectedAudiences.some(
      (a) => a.toLowerCase() === String(trend.audience).toLowerCase()
    )
  ) {
    score += 10;
  }

  if (
    trend.region &&
    selectedMarkets.some(
      (m) => m.toLowerCase() === String(trend.region).toLowerCase()
    )
  ) {
    score += 10;
  }

  if (trend.confidence === "high") score += 8;
  if (trend.confidence === "medium") score += 4;

  return Math.max(8, Math.min(100, score));
}

function MiniPie({
  score,
  size = 40,
}: {
  score: number;
  size?: number;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getRelevanceColor(score);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title={`${score}% relevance`}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          fontSize: 11,
          fontWeight: 700,
          color: "#111",
        }}
      >
        {score}%
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendCard[]>([]);
  const [error, setError] = useState("");

  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

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

        const nextAudiences =
          kwState.selectedAudiences?.length
            ? kwState.selectedAudiences
            : profile?.__uiSelections?.selectedAudiences?.length
            ? profile.__uiSelections.selectedAudiences
            : profile?.audiences?.length
            ? [profile.audiences[0]]
            : [];

        const nextMarkets =
          kwState.selectedMarkets?.length
            ? kwState.selectedMarkets
            : profile?.__uiSelections?.selectedMarkets?.length
            ? profile.__uiSelections.selectedMarkets
            : profile?.markets?.length
            ? [profile.markets[0]]
            : [];

        const nextTopics =
          kwState.selectedTopics?.length
            ? kwState.selectedTopics
            : profile?.__uiSelections?.selectedTopics?.length
            ? profile.__uiSelections.selectedTopics
            : profile?.topics?.length
            ? [profile.topics[0]]
            : [];

        setSelectedAudiences(nextAudiences);
        setSelectedMarkets(nextMarkets);
        setSelectedTopics(nextTopics);

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

  const scoredTrends = useMemo(() => {
    return trends.map((trend) => {
      const relevanceScore = computeRelevanceScore(
        trend,
        selectedAudiences,
        selectedMarkets,
        selectedTopics
      );

      return {
        ...trend,
        relevanceScore,
      };
    });
  }, [trends, selectedAudiences, selectedMarkets, selectedTopics]);

  return (
    <main>
      <h1 style={{ marginTop: 0, marginBottom: 12 }}>Trends</h1>
      <p style={{ marginTop: 0, marginBottom: 20 }}>
        Opportunity radar built from internal, news, and Google Trends signals.
      </p>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Selected Context</div>
        <div style={{ marginBottom: 8 }}>
          <strong>Audiences:</strong>{" "}
          {selectedAudiences.length ? selectedAudiences.join(", ") : "—"}
        </div>
        <div style={{ marginBottom: 8 }}>
          <strong>Markets:</strong>{" "}
          {selectedMarkets.length ? selectedMarkets.join(", ") : "—"}
        </div>
        <div>
          <strong>Blog Topics:</strong>{" "}
          {selectedTopics.length ? selectedTopics.join(", ") : "—"}
        </div>
      </div>

      {error ? (
        <p style={{ color: "crimson", marginBottom: 16 }}>{error}</p>
      ) : null}

      {loading ? (
        <p>Loading...</p>
      ) : scoredTrends.length === 0 ? (
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
          {scoredTrends.map((trend) => {
            const badgeStyle = getConfidenceStyles(trend.confidence);
            const relevanceColor = getRelevanceColor(trend.relevanceScore);

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
                      flex: 1,
                    }}
                  >
                    {trend.title}
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
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

                    <MiniPie score={trend.relevanceScore} />
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: relevanceColor,
                  }}
                >
                  <span>Relevance:</span>
                  <span>{scoreToLabel(trend.relevanceScore)}</span>
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