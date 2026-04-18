"use client";

import { useEffect, useState } from "react";

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

export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendCard[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/trends-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const json = await res.json();
        setTrends(Array.isArray(json?.trends) ? json.trends : []);
      } catch {
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