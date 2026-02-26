// apps/web/src/app/(protected)/keywords/page.tsx
"use client";

import { useMemo } from "react";
import { usePageState } from "@/utils/usePageState";

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
  const { state, setState } = usePageState("/keywords", {
    topic: "",
    audience: "content creators and agencies",
    region: "Singapore",
    language: "English",
    loading: false,
    data: null as ApiPayload | null,
    rows: [] as Row[],
    error: null as string | null,
  });

  const {
    topic,
    audience,
    region,
    language,
    loading,
    data,
    rows,
    error,
  } = state;

  const grouped = useMemo(() => {
    const buckets: Record<string, Row[]> = { SEO: [], GEO: [], AEO: [] };
    for (const r of rows) buckets[r.bucket].push(r);
    return buckets;
  }, [rows]);

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
      if (!res.ok) throw new Error(json?.error || "Request failed");

      const payload = json as ApiPayload;

      const nextRows: Row[] = [];

      // SEO
      for (const k of payload.seo.seed || []) {
        nextRows.push({ bucket: "SEO", type: "seed", value: k });
      }
      for (const c of payload.seo.clusters || []) {
        for (const k of c.keywords || []) {
          nextRows.push({
            bucket: "SEO",
            type: "cluster",
            clusterName: c.name,
            value: k,
          });
        }
      }

      // GEO
      for (const k of payload.geo.seed || []) {
        nextRows.push({ bucket: "GEO", type: "seed", value: k });
      }
      for (const c of payload.geo.clusters || []) {
        for (const k of c.keywords || []) {
          nextRows.push({
            bucket: "GEO",
            type: "cluster",
            clusterName: c.name,
            value: k,
          });
        }
      }

      // AEO
      for (const k of payload.aeo.seed || []) {
        nextRows.push({ bucket: "AEO", type: "seed", value: k });
      }
      for (const c of payload.aeo.clusters || []) {
        for (const q of c.questions || []) {
          nextRows.push({
            bucket: "AEO",
            type: "cluster",
            clusterName: c.name,
            value: q,
          });
        }
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
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${(data.topic || "topic")
      .toLowerCase()
      .replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!rows.length) return;

    const header = ["bucket", "type", "cluster", "value"];
    const csvLines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.bucket,
          r.type,
          (r.clusterName || "").replace(/"/g, '""'),
          (r.value || "").replace(/"/g, '""'),
        ]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${(data?.topic || "topic")
      .toLowerCase()
      .replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Keywords</h1>
      <p style={{ opacity: 0.8 }}>
        Generate GEO/SEO/AEO keyword clusters and save them.
      </p>

      <div style={{ display: "grid", gap: 10, maxWidth: 780 }}>
        <label>
          Topic
          <input
            value={topic}
            onChange={(e) =>
              setState((s) => ({ ...s, topic: e.target.value }))
            }
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            Audience
            <input
              value={audience}
              onChange={(e) =>
                setState((s) => ({ ...s, audience: e.target.value }))
              }
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <label>
            Region
            <input
              value={region}
              onChange={(e) =>
                setState((s) => ({ ...s, region: e.target.value }))
              }
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>
        </div>

        <label>
          Language
          <input
            value={language}
            onChange={(e) =>
              setState((s) => ({ ...s, language: e.target.value }))
            }
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={generate} disabled={loading || topic.length < 2}>
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
        <div style={{ marginTop: 24 }}>
          <h2>Results ({rows.length})</h2>
        </div>
      )}
    </div>
  );
}
