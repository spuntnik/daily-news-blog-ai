import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
// If logged in but onboarding not completed, force /site (except when already on /site or /api)
if (data.user) {
  const { data: siteRow } = await supabase
    .from("user_sites")
    .select("site_url")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const hasSite = !!siteRow?.site_url;

  const pathname = req.nextUrl.pathname;

  const allowedWithoutSite =
    pathname.startsWith("/site") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/logout");

  if (!hasSite && !allowedWithoutSite) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/site";
    return NextResponse.redirect(redirectUrl);
  }
}
  const protectedRoutes = [
  "/site",
  "/dashboard",
  "/generator",
  "/keywords",
  "/library",
  "/settings",
  "/channels",
  "/trends",
];

  const isProtected = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !data.user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
