import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: "72px 28px", fontFamily: "ui-sans-serif, system-ui" }}>
<h1 className="text-4xl font-bold text-blue-500">
  Tailwind is working
</h1>

<div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>AG SEO Studio</div>
          <nav style={{ display: "flex", gap: 14 }}>
            <a href="#features" style={{ textDecoration: "none" }}>Features</a>
            <a href="#how" style={{ textDecoration: "none" }}>How it works</a>
            <a href="#pricing" style={{ textDecoration: "none" }}>Access</a>
          </nav>
        </header>

        <section style={{ marginTop: 64, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 32 }}>
          <div>
            <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: "0 0 14px 0" }}>
              Turn daily topics into publish-ready SEO content.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 600, margin: "0 0 22px 0" }}>
              Newsfeeder + Blog Generator + Keyword Engine (SEO / GEO / AEO) with region targeting.
              Built for creators, agencies, and internal content teams.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              <Link
                href="/login"
                style={{
                  padding: "12px 18px",
                  background: "black",
                  color: "white",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Login
              </Link>

              <Link
                href="/generator"
                style={{
                  padding: "12px 18px",
                  border: "1px solid #111",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Try Generator
              </Link>

              <a
                href="#features"
                style={{
                  padding: "12px 18px",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                See features
              </a>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap", color: "#444" }}>
              <span style={{ border: "1px solid #eee", padding: "6px 10px", borderRadius: 999 }}>Open topic</span>
              <span style={{ border: "1px solid #eee", padding: "6px 10px", borderRadius: 999 }}>Auto categories</span>
              <span style={{ border: "1px solid #eee", padding: "6px 10px", borderRadius: 999 }}>Region: SG/MY/Global</span>
              <span style={{ border: "1px solid #eee", padding: "6px 10px", borderRadius: 999 }}>API-ready</span>
            </div>
          </div>

          <aside
            style={{
              border: "1px solid #eee",
              borderRadius: 16,
              padding: 18,
              background: "#fafafa",
              alignSelf: "start",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 10 }}>What you can do today</div>
            <ol style={{ margin: 0, paddingLeft: 18, color: "#333", lineHeight: 1.8 }}>
              <li>Pick a region + topic.</li>
              <li>Pull daily headlines.</li>
              <li>Generate a blog draft.</li>
              <li>Generate SEO/GEO/AEO keyword sets.</li>
              <li>Export to your site via API.</li>
            </ol>
            <div style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
              Private beta mode. Access controlled by login.
            </div>
          </aside>
        </section>

        <section id="features" style={{ marginTop: 72 }}>
          <h2 style={{ fontSize: 28, marginBottom: 12 }}>Features</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              ["Daily News Feeder", "Pull topic-based headlines and summaries."],
              ["Blog Generator", "Convert feeds into publish-ready drafts."],
              ["Keyword Engine", "Short-tail, long-tail, GEO and AEO phrasing."],
              ["Category Detection", "Auto-detect category for better search intent."],
              ["Region Selector", "Different angles for SG, MY, or Global."],
              ["API-first", "Send content to any CMS or site."],
            ].map(([title, desc]) => (
              <div key={title} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800 }}>{title}</div>
                <div style={{ color: "#555", marginTop: 6, lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, marginBottom: 12 }}>How it works</h2>
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, lineHeight: 1.8, color: "#333" }}>
            1) Ingest topics → 2) Detect category + intent → 3) Generate blog outline + draft → 4) Generate keyword sets
            (SEO/GEO/AEO) → 5) Export via API.
          </div>
        </section>

        <section id="pricing" style={{ marginTop: 64, paddingBottom: 40 }}>
          <h2 style={{ fontSize: 28, marginBottom: 12 }}>Access</h2>
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, color: "#333" }}>
            Private access for now. Login required. Paywalls can be added later without rebuilding the core.
          </div>
        </section>
      </div>
    </main>
  );
}
