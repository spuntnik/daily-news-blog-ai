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
      <h1>Trends</h1>
      <p>Opportunity radar built from internal, news, and Google Trends signals.</p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {loading ? (
        <p>Loading...</p>
      ) : trends.length === 0 ? (
        <p>No trends available yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {trends.map((trend) => (
            <div
              key={trend.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{trend.title}</h3>

              {trend.whyItMatters ? (
                <p>
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
                <p>
                  <strong>Region:</strong> {trend.region}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}