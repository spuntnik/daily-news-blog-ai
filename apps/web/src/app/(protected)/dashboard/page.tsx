import Link from "next/link";
import { supabaseServer } from "../../../utils/supabase/server";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Welcome back{user?.email ? `, ${user.email}` : ""}.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <Card
          title="Keyword Engine"
          desc="Generate GEO/SEO/AEO keyword clusters and intent."
          href="/keywords"
        />
        <Card
          title="Generator"
          desc="Turn topics into outlines, titles, and drafts."
          href="/generator"
        />
        <Card
          title="Trends"
          desc="Track trending topics and content angles."
          href="/trends"
        />
        <Card
          title="Library"
          desc="Save runs, export lists, reuse later."
          href="/library"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 16,
        textDecoration: "none",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ opacity: 0.8, fontSize: 14 }}>{desc}</div>
    </Link>
  );
}
