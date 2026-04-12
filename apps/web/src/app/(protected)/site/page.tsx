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

export default function SitePage() {
  const router = useRouter();

  const [siteUrl, setSiteUrl] = useState("");
  const [regionHint, setRegionHint] = useState("Singapore");
  const [extraContext, setExtraContext] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/site");
        const data = await res.json();
        if (res.ok) {
          if (data?.siteUrl) setSiteUrl(data.siteUrl);
          if (data?.profile) {
            setProfile(data.profile);
            localStorage.setItem("agseo:siteProfile", JSON.stringify(data.profile));
          }
        }
      } catch {
        try {
          const raw = localStorage.getItem("agseo:siteProfile");
          if (raw) setProfile(JSON.parse(raw));
        } catch {
          // ignore
        }
      }
    })();
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/site/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, regionHint, extraContext }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyze failed");

      setProfile(data.profile);

      // Save locally so Trends V1 can use it immediately
      localStorage.setItem("agseo:siteProfile", JSON.stringify(data.profile));

      // Try saving to backend too, but do not fail the UI if backend persistence has issues
      try {
        await fetch("/api/site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteUrl,
            profile: data.profile,
          }),
        });
      } catch {
        // ignore backend save issues for V1
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveAndContinue() {
    setSaving(true);
    setError(null);

    try {
      if (profile) {
        localStorage.setItem("agseo:siteProfile", JSON.stringify(profile));
      }

      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, profile }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");

      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleTopicClick(topic: string) {
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
        topic,
        selectedTopic: topic,
        audience: existing.audience || profile?.audiences?.[0] || "general",
        region: existing.region || regionHint || profile?.markets?.[0] || "global",
        _savedAt: new Date().toISOString(),
      };

      localStorage.setItem("agseo:keywords", JSON.stringify(nextState));
      router.push("/generator");
    } catch {
      router.push("/generator");
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h1>Site Setup</h1>
      <p style={{ opacity: 0.8 }}>
        Enter a website URL. We’ll infer industry, audience, markets, competitors, and recommended blog topics.
      </p>

      <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>
        <label>
          Site URL
          <input
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="e.g., agseostudio.com"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            Region hint (optional)
            <input
              value={regionHint}
              onChange={(e) => setRegionHint(e.target.value)}
              placeholder="Singapore / Malaysia / Global"
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label>
            Extra context (optional)
            <input
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="What is this site really selling? Who do we serve?"
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={runAnalysis} disabled={loading || siteUrl.trim().length < 4}>
            {loading ? "Analyzing..." : "Analyze site"}
          </button>

          <button
            onClick={saveAndContinue}
            disabled={saving || siteUrl.trim().length < 4 || !profile}
          >
            {saving ? "Saving..." : "Save & go to Dashboard"}
          </button>
        </div>

        {error && <div style={{ color: "crimson" }}>{error}</div>}
      </div>

      {profile && (
        <div style={{ marginTop: 22, border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{profile.industry}</div>
              <div style={{ opacity: 0.75, fontSize: 14 }}>{profile.siteUrl}</div>
            </div>

            {profile.needsClarification ? (
              <div style={{ color: "#a16207" }}>Needs clarification</div>
            ) : (
              <div style={{ color: "#166534" }}>Good confidence</div>
            )}
          </div>

          {profile.needsClarification && profile.suggestedPromptQuestions?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Quick questions (answer in “Extra context”)
              </div>
              <ul style={{ marginTop: 0 }}>
                {profile.suggestedPromptQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            <Section title="Audiences" items={profile.audiences} />
            <Section title="Markets" items={profile.markets} />
            <ClickableTopicsSection
              title="Recommended Blog Topics"
              items={profile.topics}
              onTopicClick={handleTopicClick}
            />

            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Competitors</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th align="left">Name</th>
                      <th align="left">URL</th>
                      <th align="left">Confidence</th>
                      <th align="left">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.competitors.map((c, i) => (
                      <tr key={i}>
                        <td style={{ padding: "8px 0" }}>{c.name}</td>
                        <td>{c.url}</td>
                        <td>{c.confidence}</td>
                        <td style={{ opacity: 0.85 }}>{c.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((t, i) => (
          <span
            key={i}
            style={{
              border: "1px solid #eee",
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function ClickableTopicsSection({
  title,
  items,
  onTopicClick,
}: {
  title: string;
  items: string[];
  onTopicClick: (topic: string) => void;
}) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onTopicClick(t)}
            style={{
              border: "1px solid #eee",
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 13,
              opacity: 0.95,
              background: "#fff",
              cursor: "pointer",
            }}
            title={`Use "${t}" in Generator`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
