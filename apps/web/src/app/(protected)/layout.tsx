import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../utils/supabase/server";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/generator", label: "Generator" },
  { href: "/keywords", label: "Keywords" },
  { href: "/trends", label: "Trends" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" },
];

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
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/80 p-6">
        <div className="mb-8">
          <div className="text-xl font-semibold tracking-tight">AG SEO Studio</div>
          <p className="mt-2 text-sm text-slate-400">
            Content intelligence dashboard
          </p>
        </div>

        <nav className="grid gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 no-underline transition hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <div className="text-slate-400">Signed in as</div>
          <div className="mt-1 break-words font-medium text-slate-200">
            {user.email}
          </div>
        </div>

        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            Logout
          </button>
        </form>
      </aside>

      <main className="flex-1 bg-slate-950 p-6 md:p-8">{children}</main>
    </div>
  );
}