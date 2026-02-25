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
  // If user is logged in and tries to access /login, route them properly
if (req.nextUrl.pathname.startsWith("/login") && data.user) {
  // Check if onboarding is complete
  const { data: siteRow } = await supabase
    .from("user_sites")
    .select("site_url")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = siteRow?.site_url ? "/dashboard" : "/site";
  return NextResponse.redirect(redirectUrl);
}  
  if (req.nextUrl.pathname.startsWith("/login") && data.user) {
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = "/dashboard";
  return NextResponse.redirect(redirectUrl);
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
