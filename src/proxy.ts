import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { copyCookies } from "@/lib/response-cookies";

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  source: NextResponse
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  const response = NextResponse.redirect(redirectUrl);

  copyCookies(source.cookies.getAll(), (name, value, options) =>
    response.cookies.set(name, value, options)
  );

  return response;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/app")) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (user && pathname === "/login") {
    return redirectWithCookies(request, "/app", supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
