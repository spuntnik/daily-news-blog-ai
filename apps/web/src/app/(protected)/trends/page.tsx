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
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  }
  if (confidence === "medium") {
    return "border-amber-300 bg-amber-100 text-amber-900";
  }
  return "border-slate-300 bg-slate-100 text-slate-700";
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
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Opportunity Radar
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Trends</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Opportunity radar built from internal, news, and Google Trends
            signals. Use this page to spot timely topics and push them directly
            into the Generator.
          </p>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-300">
            Loading trends...
          </div>
        ) : trends.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-100">
              No trends available yet
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              The trends API returned no items for this load. Once data is
              available, cards will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trends.map((trend) => (
              <article
                key={trend.id}
                className="rounded-3xl border border-slate-800 bg-slate-200 p-6 text-slate-900 shadow-xl"
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
                  <div className="rounded-2xl bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Audience
                    </div>
                    <div className="mt-1 font-medium">{trend.audience}</div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Region
                    </div>
                    <div className="mt-1 font-medium">{trend.region}</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => useTrend(trend)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Use in Generator
                  </button>

                  {trend.url ? (
                    <a
                      href={trend.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 no-underline"
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