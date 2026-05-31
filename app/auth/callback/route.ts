import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  mergeSupabaseCookieOptions,
  sanitizeAuthRedirect,
  supabaseCookieOptions,
} from "@/lib/supabase/cookie-options";

/**
 * GET /auth/callback
 * PKCE code · OTP token_hash 등 쿼리 파라미터 기반 세션 교환.
 * 해시(#access_token)는 서버로 전달되지 않으므로 /auth/callback/session 으로 위임.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = sanitizeAuthRedirect(requestUrl.searchParams.get("next"));

  if (!code && !tokenHash) {
    const sessionUrl = new URL("/auth/callback/session", requestUrl.origin);
    requestUrl.searchParams.forEach((value, key) => {
      sessionUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(sessionUrl);
  }

  let response = NextResponse.redirect(new URL(next, requestUrl.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, mergeSupabaseCookieOptions(options));
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "auth_callback");
      loginUrl.searchParams.set("next", next);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "recovery" | "invite" | "magiclink" | "signup",
    });
    if (error) {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "auth_callback");
      loginUrl.searchParams.set("next", next);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", "auth_callback");
  return NextResponse.redirect(loginUrl);
}
