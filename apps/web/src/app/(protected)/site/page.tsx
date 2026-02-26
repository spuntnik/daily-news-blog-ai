"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Competitor = {
  name: string;
  url: string;
  confidence: "low" | "medium" | "high";
  note: string;
};

type SiteProfile = {
  siteUrl: string;
  industry: string;
  audiences: string[];
  markets: string[];
  topics: string[];
  competitors: Competitor[];
  needsClarification: boolean;
  suggestedPromptQuestions: string[];
};

function normalizeUrl(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return `https://${raw}`;
  return raw;
}

function splitLines(s: string) {
  return (s || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinLines(arr: string[]) {
  return (arr || []).join("\n");
}

export default function SiteOnboardingPage() {
  const router = useRouter();

  const [siteUrl, setSiteUrl] = useState("");
  const [regionHint, setRegionHint] = useState("Singapore");
  const [extraContext, setExtraContext] = useState("");

  const [loadingSaved, setLoadingSaved] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [signals, setSignals] = useState<any>(null);
  const [profile, setProfile] = useState<SiteProfile | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Load existing saved site URL (so this page is persistent)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      setError(null);
      try {
        const res = await fetch("/api/site", { method: "GET" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load site settings");
        if (!cancelled && data?.siteUrl) setSiteUrl(String(data.siteUrl));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canAnalyze = useMemo(() => normalizeUrl(siteUrl).length > 10, [siteUrl]);

  async function analyze() {
    setError(null);
    setAnalyzing(true);
    setSignals(null);

    try {
      const res = await fetch("/api/site/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: normalizeUrl(siteUrl),
          regionHint: regionHint.trim(),
          extraContext: extraContext.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyze failed");

      setSignals(data?.signals || null);
      setProfile(data?.profile || null);
    } catch (e: any) {
      setError(e?.message || "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveAndContinue() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: normalizeUrl(siteUrl),
          // Store profile as well (requires api/site route.ts to upsert profile jsonb).
          // If your api/site route.ts currently only stores siteUrl, tell me and I’ll give the one-file replacement for that too.
          profile,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");

      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function ensureProfile() {
    if (profile) return;
    setProfile({
      siteUrl: normalizeUrl(siteUrl),
      industry: "",
      audiences: [],
      markets: [],
      topics: [],
      competitors: [],
      needsClarification: true,
      suggestedPromptQuestions: [],
    });
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Site Setup</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Add a website and we’ll infer your market, audiences, competitor landscape, and recommended topic clusters.
      </p>

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          Website URL
          <input
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="e.g. agseostudio.com"
            style={{ width: "100%", padding: 10 }}
            disabled={loadingSaved}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Region hint (helps local context)
            <input
              value={regionHint}
              onChange={(e) => setRegionHint(e.target.value)}
              placeholder="e.g. Singapore, Malaysia, Global"
              style={{ width: "100%", padding: 10 }}
            />
          </label>

          <div style={{ opacity: 0.8, fontSize: 13, alignSelf: "end" }}>
            Tip: If the site is new or sparse, add context below so the analysis is accurate.
          </div>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          Add more context (optional)
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Example: We sell SEO + Generative Engine Optimization services for SMEs in SG/MY. Main buyers are founders and marketing managers. Top competitors: …"
            rows={4}
            style={{ width: "100%", padding: 10, resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={analyze}
            disabled={!canAnalyze || analyzing || saving}
            style={{ padding: "10px 14px" }}
          >
            {analyzing ? "Analyzing..." : "Analyze site"}
          </button>

          <button
            onClick={() => {
              ensureProfile();
            }}
            disabled={analyzing || saving}
            style={{ padding: "10px 14px" }}
          >
            Edit manually
          </button>

          <button
            onClick={saveAndContinue}
            disabled={saving || !normalizeUrl(siteUrl) || !profile}
            style={{ padding: "10px 14px" }}
          >
            {saving ? "Saving..." : "Save & go to Dashboard"}
          </button>
        </div>

        {error && <div style={{ color: "crimson" }}>{error}</div>}
      </div>

      {signals && (
        <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Signals extracted (for reference)</div>
          <div style={{ display: "grid", gap: 6, fontSize: 13, opacity: 0.9 }}>
            <div>
              <b>Title:</b> {signals.title || "-"}
            </div>
            <div>
              <b>Meta description:</b> {signals.metaDescription || "-"}
            </div>
            <div>
              <b>H1:</b> {signals.h1 || "-"}
            </div>
            <div>
              <b>H2s:</b> {Array.isArray(signals.h2s) && signals.h2s.length ? signals.h2s.join(" | ") : "-"}
            </div>
          </div>
        </div>
      )}

      {profile && (
        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800 }}>Draft Site Profile</div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>
                  Edit anything below. This will become the default context for Keywords / Trends / Generator.
                </div>
              </div>
              {profile.needsClarification && (
                <div style={{ color: "#8a5b00", fontSize: 13, alignSelf: "center" }}>
                  Needs clarification — answer questions below for higher accuracy.
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                Industry / category
                <input
                  value={profile.industry}
                  onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  style={{ width: "100%", padding: 10 }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  Audiences (one per line)
                  <textarea
                    value={joinLines(profile.audiences)}
                    onChange={(e) => setProfile({ ...profile, audiences: splitLines(e.target.value) })}
                    rows={5}
                    style={{ width: "100%", padding: 10, resize: "vertical" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  Markets served (one per line)
                  <textarea
                    value={joinLines(profile.markets)}
                    onChange={(e) => setProfile({ ...profile, markets: splitLines(e.target.value) })}
                    rows={5}
                    style={{ width: "100%", padding: 10, resize: "vertical" }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                Recommended blog topic themes (one per line)
                <textarea
                  value={joinLines(profile.topics)}
                  onChange={(e) => setProfile({ ...profile, topics: splitLines(e.target.value) })}
                  rows={8}
                  style={{ width: "100%", padding: 10, resize: "vertical" }}
                />
              </label>
            </div>
          </div>

          <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Competitors (editable)</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 10 }}>
              In MVP, competitors may be suggested with low confidence. You can replace them with exact competing URLs.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {(profile.competitors || []).map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1.6fr 0.7fr",
                    gap: 10,
                    alignItems: "start",
                    borderTop: idx === 0 ? "none" : "1px solid #f1f1f1",
                    paddingTop: idx === 0 ? 0 : 10,
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    Name
                    <input
                      value={c.name}
                      onChange={(e) => {
                        const next = [...profile.competitors];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setProfile({ ...profile, competitors: next });
                      }}
                      style={{ width: "100%", padding: 10 }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    URL
                    <input
                      value={c.url}
                      onChange={(e) => {
                        const next = [...profile.competitors];
                        next[idx] = { ...next[idx], url: e.target.value };
                        setProfile({ ...profile, competitors: next });
                      }}
                      style={{ width: "100%", padding: 10 }}
                    />
                    <span style={{ fontSize: 12, opacity: 0.7 }}>{c.note}</span>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    Confidence
                    <select
                      value={c.confidence}
                      onChange={(e) => {
                        const next = [...profile.competitors];
                        next[idx] = { ...next[idx], confidence: e.target.value as any };
                        setProfile({ ...profile, competitors: next });
                      }}
                      style={{ width: "100%", padding: 10 }}
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const next = profile.competitors.filter((_, i) => i !== idx);
                        setProfile({ ...profile, competitors: next });
                      }}
                      style={{ padding: "8px 10px" }}
                    >
                      Remove
                    </button>
                  </label>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const next = [
                    ...(profile.competitors || []),
                    { name: "", url: "", confidence: "low", note: "Manually added" } as Competitor,
                  ];
                  setProfile({ ...profile, competitors: next });
                }}
                style={{ padding: "10px 14px", width: "fit-content" }}
              >
                + Add competitor
              </button>
            </div>
          </div>

          {(profile.suggestedPromptQuestions || []).length > 0 && (
            <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Clarifying questions</div>
              <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 10 }}>
                Answer these in the “Add more context” box above, then click “Analyze site” again.
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {profile.suggestedPromptQuestions.map((q, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ height: 28 }} />
    </div>
  );
}
