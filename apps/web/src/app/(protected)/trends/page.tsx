"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
        setError(
          "No site profile found. Go to Site Setup, click Analyze site, then return here."
        );
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
    <main className="min-h-screen bg-[#213151] px-6 py-6 text-[#eef5f4] md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#58739c] to-[#213151] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#eef5f4]/80">
                Opportunity Radar
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-[#eef5f4] md:text-4xl">
                Trends
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#eef5f4]/80 md:text-base">
                Opportunity radar built from internal, news, and Google Trends
                signals. Use this page to spot timely topics and push them
                directly into the Generator.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                onClick={refreshNow}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center rounded-xl border border-[#eef5f4]/20 bg-[#eef5f4] px-4 py-2.5 text-sm font-semibold text-[#213151] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        {debugSource ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#eef5f4]/75">
            {debugSource}
          </div>
        ) : null}

        {profile ? (
          <section className="rounded-3xl border border-white/10 bg-[#58739c] p-6 text-[#213151] shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Profile Summary</h2>
                <p className="mt-1 text-sm text-[#213151]/75">
                  These settings are shaping the opportunities shown below.
                </p>
              </div>

              {counts ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/55 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-[#213151]/60">
                      Internal
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {counts.internal}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/55 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-[#213151]/60">
                      News
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {counts.news}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/55 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-[#213151]/60">
                      Google
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {counts.google}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#213151]/10 bg-[#213151] px-4 py-3 text-[#eef5f4]">
                    <div className="text-xs uppercase tracking-wide text-[#eef5f4]/65">
                      Total
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {counts.total}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/55 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                  Industry
                </div>
                <div className="mt-2 text-sm font-medium text-[#213151]">
                  {profile.industry || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/55 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                  Audiences
                </div>
                <div className="mt-2 text-sm leading-6 text-[#213151]">
                  {(profile.audiences || []).join(", ") || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/55 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                  Markets
                </div>
                <div className="mt-2 text-sm leading-6 text-[#213151]">
                  {(profile.markets || []).join(", ") || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/55 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                  Current topic bias
                </div>
                <div className="mt-2 text-sm leading-6 text-[#213151]">
                  {selectedTopicHint || "—"}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[#e76660]/40 bg-[#e76660]/10 px-4 py-3 text-sm text-[#eef5f4]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-[#eef5f4]/80">
            Loading trends...
          </section>
        ) : (
          <section>
            {trends.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-[#eef5f4]/75">
                No trends available yet.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {trends.map((trend) => (
                  <article
                    key={trend.id}
                    className="flex h-full flex-col rounded-3xl border border-[#213151]/15 bg-[#58739c] p-6 text-[#213151] shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#213151]/60">
                          {trend.sourceLabel}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold leading-tight">
                          {trend.title}
                        </h3>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getConfidenceClasses(
                          trend.confidence
                        )}`}
                      >
                        {trend.confidence}
                      </span>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl bg-[#eef5f4]/55 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                          Why it matters
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#213151]">
                          {trend.whyItMatters}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#eef5f4]/55 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                          Suggested angle
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#213151]">
                          {trend.suggestedAngle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/40 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                          Audience
                        </div>
                        <div className="mt-2 text-sm font-medium text-[#213151]">
                          {trend.audience || "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#213151]/10 bg-[#eef5f4]/40 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-[#213151]/60">
                          Region
                        </div>
                        <div className="mt-2 text-sm font-medium text-[#213151]">
                          {trend.region || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => useTrendInGenerator(trend)}
                        className="inline-flex items-center justify-center rounded-xl bg-[#213151] px-4 py-2.5 text-sm font-semibold text-[#eef5f4] transition hover:opacity-90"
                      >
                        Use in Generator
                      </button>

                      {trend.url ? (
                        <a
                          href={trend.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-[#213151]/15 bg-[#eef5f4]/60 px-4 py-2.5 text-sm font-semibold text-[#213151] transition hover:bg-[#eef5f4]"
                        >
                          Open source
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
