import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  mergeSupabaseCookieOptions,
  supabaseCookieOptions,
} from "@/lib/supabase/cookie-options";

export async function POST() {
  const cookieStore = await cookies();
  let response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, mergeSupabaseCookieOptions(options));
          });
        },
      },
    },
  );

  await supabase.auth.signOut();

  const allCookies = cookieStore.getAll();
  for (const { name } of allCookies) {
    if (name.startsWith("sb-")) {
      response.cookies.set(name, "", {
        ...mergeSupabaseCookieOptions(),
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }

  return response;
}
