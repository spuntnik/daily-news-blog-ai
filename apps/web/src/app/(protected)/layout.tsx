import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../utils/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  async function signOut() {
    "use server";
    const supabase = supabaseServer();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          padding: 20,
          borderRight: "1px solid #eee",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 16 }}>AG SEO Studio</div>

        <nav style={{ display: "grid", gap: 10 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/generator">Generator</Link>
          <Link href="/keywords">Keywords</Link>
          <Link href="/trends">Trends</Link>
          <Link href="/library">Library</Link>
          <Link href="/settings">Settings</Link>
        </nav>

        <div style={{ marginTop: 20, fontSize: 12, opacity: 0.8 }}>
          Signed in as:
          <div style={{ wordBreak: "break-word" }}>{user.email}</div>
        </div>

        <form action={signOut} style={{ marginTop: 16 }}>
          <button type="submit">Logout</button>
        </form>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}