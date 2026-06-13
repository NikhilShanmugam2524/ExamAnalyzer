/**
 * Session-refresh + auth-gate middleware helper.
 *
 * Route-based redirect targets:
 *   - /teacher  (exact) — passes through; the page shows its own login form
 *   - /teacher/* (sub) — unauthed → /teacher
 *   - /admin    (exact) — passes through; the page shows its own login form
 *   - /admin/*  (sub)  — unauthed → /admin
 *   - /welcome         — always public (marketing + student login)
 *   - everything else  — unauthed → /welcome
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/welcome",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token and refreshes cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { pathname } = request.nextUrl;

    // These exact pages handle their own auth — let them through.
    if (pathname === "/teacher" || pathname === "/admin") {
      return response;
    }

    // Teacher sub-routes: redirect to the teacher login page.
    if (pathname.startsWith("/teacher/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/teacher";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Admin sub-routes: redirect to the admin login page.
    if (pathname.startsWith("/admin/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Public marketing/login pages pass through.
    if (isPublic(pathname)) {
      return response;
    }

    // Everything else (student routes: /, /test, /report, …) → welcome page.
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
