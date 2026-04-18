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
  return "border-[#eef5f4] bg-[#eef5f4]/20 text-[#213151]";
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
    <main className="min-h-screen bg-[#213151] px-6 py-6 text-[#eef5f4] md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-[#58739c] p-6 shadow-lg">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#eef5f4]/80">
            Opportunity Radar
          </div>
          <h1 className="mt-4 text-3xl font-semibold">Trends</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#213151]">
            Opportunity radar built from internal, news, and Google Trends
            signals. Use this page to spot timely topics and push them directly
            into the Generator.
          </p>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            Loading trends...
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trends.map((trend) => (
              <article
                key={trend.id}
                className="rounded-3xl bg-[#58739c] p-6 text-[#213151] shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold leading-tight">
                    {trend.title}
                  </h3>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getConfidenceClasses(
                      trend.confidence
                    )}`}
                  >
                    {trend.confidence}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6">
                  <strong>Why it matters:</strong> {trend.whyItMatters}
                </p>

                <p className="mt-3 text-sm leading-6">
                  <strong>Suggested angle:</strong> {trend.suggestedAngle}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-[#eef5f4]/50 p-3">
                    <div className="text-xs uppercase tracking-wide text-[#213151]/60">
                      Audience
                    </div>
                    <div className="mt-1 font-medium">{trend.audience}</div>
                  </div>
                  <div className="rounded-2xl bg-[#eef5f4]/50 p-3">
                    <div className="text-xs uppercase tracking-wide text-[#213151]/60">
                      Region
                    </div>
                    <div className="mt-1 font-medium">{trend.region}</div>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => useTrend(trend)}
                    className="rounded-xl bg-[#213151] px-4 py-2 text-sm font-semibold text-[#eef5f4]"
                  >
                    Use in Generator
                  </button>

                  {trend.url ? (
                    <a
                      href={trend.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[#213151]/20 bg-[#eef5f4]/60 px-4 py-2 text-sm font-semibold text-[#213151] no-underline"
                    >
                      Open source
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}