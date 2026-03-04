// apps/web/src/app/(protected)/keywords/page.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePageState } from "../../../utils/usePageState";
import { supabaseBrowser } from "../../../utils/supabase/browser";

type Cluster = {
  name: string;
  keywords?: string[];
  questions?: string[];
};

type ApiPayload = {
  topic: string;
  seo: { seed: string[]; clusters: Cluster[] };
  geo: { seed: string[]; clusters: Cluster[] };
  aeo: { seed: string[]; clusters: Cluster[] };
};

type Row = {
  bucket: "SEO" | "GEO" | "AEO";
  type: "seed" | "cluster";
  clusterName?: string;
  value: string;
};

export default function KeywordsPage() {
  const supabase = supabaseBrowser();
  const searchParams = useSearchParams();
  const didAutoRun = useRef(false);

  const { state, setState, loaded } = usePageState("/keywords-v2", {
    topic: "",
    audience: "content creators and agencies",
    region: "Singapore",
    language: "English",
    loading: false,
    data: null as ApiPayload | null,
    rows: [] as Row[],
    error: null as string | null,
  });

  const { topic, audience, region, language, loading, data, rows, error } = state;

  const grouped = useMemo(() => {
    const buckets: Record<"SEO" | "GEO" | "AEO", Row[]> = { SEO: [], GEO: [], AEO: [] };
    for (const r of rows) buckets[r.bucket].push(r);
    return buckets;
  }, [rows]);

  // 1) Auto-prefill from URL (?topic=...) or from /site saved state.
  useEffect(() => {
    if (!loaded) return;

    const urlTopic = searchParams.get("topic");
    if (urlTopic && !state.topic) {
      setState((s) => ({ ...s, topic: urlTopic }));
      return;
    }

    // If still no topic, try to fetch from user_sites.site_setup_state
    if (!state.topic) {
      (async () => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;

        const { data: siteRow } = await supabase
          .from("user_sites")
          .select("site_setup_state")
          .eq("user_id", auth.user.id)
          .maybeSingle();

        const saved = siteRow?.site_setup_state as any;
        const rec =
          saved?.recommendedTopics ||
          saved?.recommended_blog_topics ||
          saved?.recommendedBlogTopics;

        const firstTopic =
          Array.isArray(rec) && rec.length > 0 ? String(rec[0]) : "";

        if (firstTopic) {
          setState((s) => ({ ...s, topic: firstTopic }));
        }
      })();
    }
  }, [loaded]);

  // 2) Auto-run generate ONCE when we have a topic but no rows yet.
  useEffect(() => {
    if (!loaded) return;
    if (didAutoRun.current) return;
    if (!topic || topic.trim().length < 2) return;
    if (rows.length > 0) return;

    didAutoRun.current = true;
    generate();
  }, [loaded, topic]);

  async function generate() {
    setState((s) => ({
      ...s,
      loading: true,
      error: null,
      data: null,
      rows: [],
    }));

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience, region, language }),
      });

      const json = await res.json();
      
// Save keywords session for Generator
localStorage.setItem(
  "agseo:keywords",
  JSON.stringify({
    topic,
    audience,
    region,
    seo: json.seo,
    geo: json.geo,
    aeo: json.aeo
  })
);
      const payload = json as ApiPayload;

      const nextRows: Row[] = [];

      // SEO
      for (const k of payload.seo.seed || []) nextRows.push({ bucket: "SEO", type: "seed", value: k });
      for (const c of payload.seo.clusters || []) {
        for (const k of c.keywords || []) nextRows.push({ bucket: "SEO", type: "cluster", clusterName: c.name, value: k });
      }

      // GEO
      for (const k of payload.geo.seed || []) nextRows.push({ bucket: "GEO", type: "seed", value: k });
      for (const c of payload.geo.clusters || []) {
        for (const k of c.keywords || []) nextRows.push({ bucket: "GEO", type: "cluster", clusterName: c.name, value: k });
      }

      // AEO
      for (const k of payload.aeo.seed || []) nextRows.push({ bucket: "AEO", type: "seed", value: k });
      for (const c of payload.aeo.clusters || []) {
        for (const q of c.questions || []) nextRows.push({ bucket: "AEO", type: "cluster", clusterName: c.name, value: q });
      }

      setState((s) => ({
        ...s,
        loading: false,
        data: payload,
        rows: nextRows,
      }));
    } catch (e: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e?.message || "Something went wrong",
      }));
    }
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${(data.topic || "topic").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!rows.length) return;
    const header = ["bucket", "type", "cluster", "value"];
    const csvLines = [
      header.join(","),
      ...rows.map((r) =>
        [r.bucket, r.type, (r.clusterName || "").replace(/"/g, '""'), (r.value || "").replace(/"/g, '""')]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${(data?.topic || "topic").toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Keywords</h1>
      <p style={{ opacity: 0.8 }}>Generate GEO/SEO/AEO keyword clusters and save them.</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 780 }}>
        <label>
          Topic
          <input
            value={topic}
            onChange={(e) => setState((s) => ({ ...s, topic: e.target.value }))}
            placeholder="e.g., executive burnout, leadership resilience, coaching ROI"
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            Audience
            <input
              value={audience}
              onChange={(e) => setState((s) => ({ ...s, audience: e.target.value }))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label>
            Region
            <input
              value={region}
              onChange={(e) => setState((s) => ({ ...s, region: e.target.value }))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>
        </div>

        <label>
          Language
          <input
            value={language}
            onChange={(e) => setState((s) => ({ ...s, language: e.target.value }))}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={generate} disabled={loading || topic.trim().length < 2}>
            {loading ? "Generating..." : "Generate keywords"}
          </button>

          <button onClick={exportJson} disabled={!data}>
            Export JSON
          </button>

          <button onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </button>
        </div>

        {error && <div style={{ color: "crimson" }}>{error}</div>}
      </div>

      {rows.length > 0 && (
        <div style={{ marginTop: 24, display: "grid", gap: 20 }}>
          <Bucket
            title="SEO Keywords"
            seedCount={data?.seo.seed?.length || 0}
            clusterCount={data?.seo.clusters?.length || 0}
            rows={grouped.SEO}
            valueLabel="Keyword"
          />
          <Bucket
            title="GEO Keywords"
            seedCount={data?.geo.seed?.length || 0}
            clusterCount={data?.geo.clusters?.length || 0}
            rows={grouped.GEO}
            valueLabel="Keyword"
          />
          <Bucket
            title="AEO Questions"
            seedCount={data?.aeo.seed?.length || 0}
            clusterCount={data?.aeo.clusters?.length || 0}
            rows={grouped.AEO}
            valueLabel="Question"
          />
        </div>
      )}
    </div>
  );
}

function Bucket({
  title,
  seedCount,
  clusterCount,
  rows,
  valueLabel,
}: {
  title: string;
  seedCount: number;
  clusterCount: number;
  rows: Row[];
  valueLabel: string;
}) {
  const seeds = rows.filter((r) => r.type === "seed");
  const clusters = rows.filter((r) => r.type === "cluster");

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <div style={{ opacity: 0.75 }}>
          Seeds: <strong>{seedCount}</strong> · Clusters: <strong>{clusterCount}</strong> · Total:{" "}
          <strong>{rows.length}</strong>
        </div>
      </div>

      {seeds.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Seed list</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {seeds.map((s, idx) => (
              <span
                key={idx}
                style={{ border: "1px solid #ddd", borderRadius: 999, padding: "6px 10px", fontSize: 13 }}
              >
                {s.value}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Cluster</th>
              <th align="left">{valueLabel}</th>
              <th align="left">Type</th>
            </tr>
          </thead>
          <tbody>
            {clusters.slice(0, 80).map((r, idx) => (
              <tr key={idx}>
                <td style={{ padding: "8px 0" }}>{r.clusterName || "-"}</td>
                <td>{r.value}</td>
                <td>{r.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clusters.length > 80 && (
        <div style={{ marginTop: 10, opacity: 0.7 }}>
          Showing 80 of {clusters.length} cluster items.
        </div>
      )}
    </div>
  );
}
