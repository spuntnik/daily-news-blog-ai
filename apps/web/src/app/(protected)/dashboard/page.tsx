import { supabaseServer } from "../../../utils/supabase/server";

export default async function DashboardPage() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>

      <div style={{ marginTop: 16 }}>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>User ID:</strong> {user?.id}</p>
      </div>

      <div style={{ marginTop: 24 }}>
        <p>Modules coming next:</p>
        <ul>
          <li>Keyword Engine</li>
          <li>News → Blog Generator</li>
          <li>Saved Library</li>
        </ul>
      </div>
    </main>
  );
}
