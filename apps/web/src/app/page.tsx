export default function Home() {
  return (
    <main style={{ padding: "60px 40px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "42px", marginBottom: "20px" }}>
        AG SEO Studio
      </h1>

      <p style={{ fontSize: "18px", maxWidth: "600px", lineHeight: "1.6" }}>
        AI-powered SEO, GEO and AEO keyword intelligence built for
        modern content creators and agencies.
      </p>

      <div style={{ marginTop: "40px" }}>
        <a
          href="/login"
          style={{
            padding: "12px 24px",
            background: "black",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            marginRight: "15px"
          }}
        >
          Login
        </a>

        <a
          href="/generator"
          style={{
            padding: "12px 24px",
            border: "1px solid black",
            textDecoration: "none",
            borderRadius: "6px"
          }}
        >
          Try Generator
        </a>
      </div>
    </main>
  );
}
