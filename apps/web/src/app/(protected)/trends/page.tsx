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
};

const SITE_PROFILE_KEY = "agseo:siteProfile";

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => (x || "").trim()).filter(Boolean)));
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function confidenceColor(confidence: TrendCard["confidence"]) {
  if (confidence === "high") return "#166534";
  if (confidence === "medium") return "#a16207";
  return "#6b7280";
}

function buildTrendCards(profile: Profile, selectedTopic?: string): TrendCard[] {
  const industry = profile.industry || "Business";
  const audiences = uniq(profile.audiences || []);
  const markets = uniq(profile.markets || []);
  const topics = uniq([
    ...(selectedTopic ? [selectedTopic] : []),
    ...(profile.topics || []),
  ]).slice(0, 12);

  const region = markets[0] || "Global";
  const fallbackAudience = audiences[0] || "Professionals";

  const angleTemplates = [
    "practical playbook",
    "common mistakes and fixes",
    "executive briefing",
    "step-by-step guide",
    "strategy framework",
    "what leaders are missing",
    "FAQ-led explainer",
    "how to apply this now",
  ];

  const whyTemplates = [
    `This aligns with ${industry.toLowerCase()} demand and current audience needs.`,
    `This is highly relevant for ${fallbackAudience.toLowerCase()} facing fast-changing priorities.`,
    `This topic supports authority-building and search intent across ${region}.`,
    `This creates a strong bridge between strategic interest and publishable content.`,
  ];

  return topics.map((topic, i) => {
    const audience = audiences[i % Math.max(audiences.length, 1)] || fallbackAudience;
    const angle = angleTemplates[i % angleTemplates.length];
    const why = whyTemplates[i % whyTemplates.length];
    const confidence: "low" | "medium" | "high" =
      i < 4 ? "high" : i < 8 ? "medium" : "low";

    return {
      id: slugify(`${topic}-${audience}-${region}-${i}`),
      title: topic,
      whyItMatters: why,
      suggestedAngle: `${topic}: ${angle}`,
      audience,
      region,
      sourceTopic: topic,
      confidence,
    };
  });
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

  useEffect(() => {
    loadTrends();
  }, []);

  async function loadTrends() {
    setLoading(true);
    setError("");
    setDebugSource("");

    try {
      let localProfile: Profile | null = null;
      let backendProfile: Profile | null = null;
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
            backendProfile = data.profile as Profile;
            localProfile = backendProfile;
            localStorage.setItem(SITE_PROFILE_KEY, JSON.stringify(backendProfile));
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
        return;
      }

      setProfile(localProfile);
      setTrends(buildTrendCards(localProfile, selected));
    } catch (e: any) {
      setError(e?.message || "Failed to load trends");
      setTrends([]);
      setProfile(null);
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
            maxWidth: 980,
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
