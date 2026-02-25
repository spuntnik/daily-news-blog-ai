"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SiteOnboardingPage() {
  const router = useRouter();
  const [siteUrl, setSiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If site already set, skip this page
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/site", { method: "GET" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.siteUrl) {
          router.replace("/dashboard");
          return;
        }
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  async function save() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to save site URL");

      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div>
        <h1>Set up your site</h1>
        <p style={{ opacity: 0.8 }}>Checking your saved site…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Set up your site</h1>
      <p style={{ opacity: 0.8 }}>
        Enter the website URL you want to work on. This will be used for keywords, trends, and content output.
      </p>

      <label style={{ display: "block", marginTop: 14 }}>
        Site URL
        <input
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="e.g., agseostudio.com or https://agseostudio.com"
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </label>

      <button
        onClick={save}
        disabled={loading || siteUrl.trim().length < 4}
        style={{ marginTop: 14 }}
      >
        {loading ? "Saving..." : "Continue to Dashboard"}
      </button>

      {error && <div style={{ color: "crimson", marginTop: 10 }}>{error}</div>}
    </div>
  );
}
