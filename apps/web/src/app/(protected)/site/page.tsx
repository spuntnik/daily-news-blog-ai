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
  selectedTopics?: string[];
  selectedAudiences?: string[];
  selectedMarkets?: string[];
  audience?: string;
  region?: string;
  seo?: any;
  geo?: any;
  aeo?: any;
  _savedAt?: string;
};

const SITE_PROFILE_KEY = "agseo:siteProfile";

type SiteSelections = {
  selectedAudiences: string[];
  selectedMarkets: string[];
  selectedTopics: string[];
};

function normalizeList(items?: string[]) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function buildDefaultSelections(profile: Profile | null): SiteSelections {
  return {
    selectedAudiences: profile?.audiences?.length ? [profile.audiences[0]] : [],
    selectedMarkets: profile?.markets?.length ? [profile.markets[0]] : [],
    selectedTopics: profile?.topics?.length ? [profile.topics[0]] : [],
  };
}

export default function SitePage() {
  const router = useRouter();

  const [siteUrl, setSiteUrl] = useState("");
  const [regionHint, setRegionHint] = useState("Singapore");
  const [extraContext, setExtraContext] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selections, setSelections] = useState<SiteSelections>({
    selectedAudiences: [],
    selectedMarkets: [],
    selectedTopics: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function persistProfileAndSelections(nextProfile: Profile | null, nextSelections: SiteSelections) {
    if (!nextProfile) return;

    const payload = {
      ...nextProfile,
      __uiSelections: nextSelections,
    };

    try {
      localStorage.setItem(SITE_PROFILE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  function persistKeywordContext(nextSelections: SiteSelections, explicitTopic?: string) {
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

      const selectedTopic =
        explicitTopic ||
        nextSelections.selectedTopics[0] ||
        existing.selectedTopic ||
        existing.topic ||
        "";

      const nextState: StoredKwState = {
        ...existing,
        topic: selectedTopic || existing.topic,
        selectedTopic: selectedTopic || existing.selectedTopic,
        selectedTopics: nextSelections.selectedTopics,
        selectedAudiences: nextSelections.selectedAudiences,
        selectedMarkets: nextSelections.selectedMarkets,
        audience:
          nextSelections.selectedAudiences[0] ||
          existing.audience ||
          profile?.audiences?.[0] ||
          "general",
        region:
          nextSelections.selectedMarkets[0] ||
          existing.region ||
          regionHint ||
          profile?.markets?.[0] ||
          "global",
        _savedAt: new Date().toISOString(),
      };

      localStorage.setItem("agseo:keywords", JSON.stringify(nextState));
    } catch {
      // ignore
    }
  }

  function hydrateSelectionsFromProfile(nextProfile: Profile | null) {
    if (!nextProfile) {
      setSelections({
        selectedAudiences: [],
        selectedMarkets: [],
        selectedTopics: [],
      });
      return;
    }

    try {
      const localRaw = localStorage.getItem(SITE_PROFILE_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw) as any;
        const saved = parsed?.__uiSelections;

        if (saved) {
          const nextSelections = {
            selectedAudiences: normalizeList(saved.selectedAudiences).filter((x) =>
              nextProfile.audiences.includes(x)
            ),
            selectedMarkets: normalizeList(saved.selectedMarkets).filter((x) =>
              nextProfile.markets.includes(x)
            ),
            selectedTopics: normalizeList(saved.selectedTopics).filter((x) =>
              nextProfile.topics.includes(x)
            ),
          };

          const safeSelections = {
            selectedAudiences:
              nextSelections.selectedAudiences.length > 0
                ? nextSelections.selectedAudiences
                : buildDefaultSelections(nextProfile).selectedAudiences,
            selectedMarkets:
              nextSelections.selectedMarkets.length > 0
                ? nextSelections.selectedMarkets
                : buildDefaultSelections(nextProfile).selectedMarkets,
            selectedTopics:
              nextSelections.selectedTopics.length > 0
                ? nextSelections.selectedTopics
                : buildDefaultSelections(nextProfile).selectedTopics,
          };

          setSelections(safeSelections);
          persistProfileAndSelections(nextProfile, safeSelections);
          persistKeywordContext(safeSelections);
          return;
        }
      }
    } catch {
      // ignore
    }

    const defaults = buildDefaultSelections(nextProfile);
    setSelections(defaults);
    persistProfileAndSelections(nextProfile, defaults);
    persistKeywordContext(defaults);
  }

  useEffect(() => {
    (async () => {
      try {
        const localRaw = localStorage.getItem(SITE_PROFILE_KEY);
        if (localRaw) {
          const localProfile = JSON.parse(localRaw) as any;
          const strippedProfile: Profile = {
            siteUrl: localProfile.siteUrl,
            industry: localProfile.industry,
            audiences: localProfile.audiences || [],
            markets: localProfile.markets || [],
            topics: localProfile.topics || [],
            competitors: localProfile.competitors || [],
            needsClarification: !!localProfile.needsClarification,
            suggestedPromptQuestions: localProfile.suggestedPromptQuestions || [],
          };

          setProfile(strippedProfile);
          hydrateSelectionsFromProfile(strippedProfile);
        }
      } catch {
        // ignore local parse issues
      }

      try {
        const res = await fetch("/api/site", { cache: "no-store" });
        const data = await res.json();

        if (res.ok) {
          if (data?.siteUrl) setSiteUrl(data.siteUrl);
          if (data?.profile) {
            setProfile(data.profile);
            hydrateSelectionsFromProfile(data.profile);
          }
        }
      } catch {
        // ignore backend load issues for now
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

      const defaults = buildDefaultSelections(data.profile);
      setSelections(defaults);
      persistProfileAndSelections(data.profile, defaults);
      persistKeywordContext(defaults);

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
        persistProfileAndSelections(profile, selections);
        persistKeywordContext(selections);
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
    const nextSelections = {
      ...selections,
      selectedTopics: toggleSingleValue(selections.selectedTopics, topic),
    };

    setSelections(nextSelections);
    if (profile) {
      persistProfileAndSelections(profile, nextSelections);
    }
    persistKeywordContext(nextSelections, topic);
    router.push("/generator");
  }

  function handleSelectionChange(
    key: keyof SiteSelections,
    value: string,
    mode: "single" | "multi"
  ) {
    const nextSelections: SiteSelections = {
      ...selections,
      [key]:
        mode === "single"
          ? toggleSingleValue(selections[key], value)
          : toggleMultiValue(selections[key], value),
    };

    setSelections(nextSelections);

    if (profile) {
      persistProfileAndSelections(profile, nextSelections);
    }
    persistKeywordContext(nextSelections);
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
            <SelectableSection
              title="Audiences"
              items={profile.audiences}
              selectedItems={selections.selectedAudiences}
              onToggle={(value) =>
                handleSelectionChange("selectedAudiences", value, "multi")
              }
            />

            <SelectableSection
              title="Markets"
              items={profile.markets}
              selectedItems={selections.selectedMarkets}
              onToggle={(value) =>
                handleSelectionChange("selectedMarkets", value, "multi")
              }
            />

            <SelectableTopicsSection
              title="Recommended Blog Topics"
              items={profile.topics}
              selectedItems={selections.selectedTopics}
              onToggle={(value) =>
                handleSelectionChange("selectedTopics", value, "multi")
              }
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

function toggleSingleValue(existing: string[], value: string) {
  return existing.includes(value) ? existing : [value];
}

function toggleMultiValue(existing: string[], value: string) {
  return existing.includes(value)
    ? existing.filter((item) => item !== value)
    : [...existing, value];
}

function SelectableSection({
  title,
  items,
  selectedItems,
  onToggle,
}: {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((t, i) => {
          const selected = selectedItems.includes(t);

          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(t)}
              style={{
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 13,
                opacity: 0.95,
                background: selected ? "#111" : "#fff",
                color: selected ? "#fff" : "#111",
                cursor: "pointer",
              }}
              title={selected ? "Selected" : "Click to select"}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectableTopicsSection({
  title,
  items,
  selectedItems,
  onToggle,
  onTopicClick,
}: {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (value: string) => void;
  onTopicClick: (topic: string) => void;
}) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((t, i) => {
          const selected = selectedItems.includes(t);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #eee",
                borderRadius: 999,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <button
                type="button"
                onClick={() => onToggle(t)}
                style={{
                  border: "none",
                  borderRight: "1px solid #eee",
                  padding: "6px 10px",
                  fontSize: 13,
                  background: selected ? "#111" : "#fff",
                  color: selected ? "#fff" : "#111",
                  cursor: "pointer",
                }}
                title={selected ? "Selected" : "Click to select"}
              >
                {t}
              </button>

              <button
                type="button"
                onClick={() => onTopicClick(t)}
                style={{
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 12,
                  background: "#fff",
                  cursor: "pointer",
                }}
                title={`Use "${t}" in Blog Generator`}
              >
                Use
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}