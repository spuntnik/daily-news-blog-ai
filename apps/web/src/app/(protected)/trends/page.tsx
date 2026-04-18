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
  confidence: "low" | "medium" | "high";
  sourceLabel: string;
  url?: string;
};

function getConfidenceClasses(confidence: TrendCard["confidence"]) {
  if (confidence === "high") {
    return "border-[#85ecb7] bg-[#85ecb7]/20 text-[#213151]";
  }
  if (confidence === "medium") {
    return "border-[#c9937d] bg-[#c9937d]/20 text-[#213151]";
  }
  return "border-[#dfe5e4] bg-[#eef5f4]/20 text-[#213151]";
}

export default function TrendsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendCard[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/trends-v2", {
          method: "POST",
        });
        const json = await res.json();
        setTrends(json?.trends || []);
      } catch {
        setTrends([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function useTrend(trend: TrendCard) {
    localStorage.setItem(
      "agseo:keywords",
      JSON.stringify({
        topic: trend.title,
        selectedTopic: trend.title,
      })
    );
    router.push("/generator");
  }

  return (
    <main className="min-h-screen bg-[#213151] px-6 py-6 text-[#eef5f4]">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <section className="rounded-3xl bg-[#58739c] p-6">
          <h1 className="text-3xl font-semibold">Trends</h1>
          <p className="mt-2 text-sm text-[#213151]">
            Opportunity radar powered by real signals.
          </p>
        </section>

        {/* LOADING */}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {trends.map((trend) => (
              <div
                key={trend.id}
                className="rounded-3xl bg-[#58739c] p-6 text-[#213151]"
              >
                <div className="flex justify-between">
                  <h3 className="text-lg font-semibold">{trend.title}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${getConfidenceClasses(
                      trend.confidence
                    )}`}
                  >
                    {trend.confidence}
                  </span>
                </div>

                <p className="mt-3 text-sm">
                  <strong>Why:</strong> {trend.whyItMatters}
                </p>

                <p className="mt-2 text-sm">
                  <strong>Angle:</strong> {trend.suggestedAngle}
                </p>

                <button
                  onClick={() => useTrend(trend)}
                  className="mt-4 w-full rounded-lg bg-[#213151] px-4 py-2 text-[#eef5f4]"
                >
                  Use in Generator
                </button>
              </div>
            ))}

          </div>
        )}
      </div>
    </main>
  );
}