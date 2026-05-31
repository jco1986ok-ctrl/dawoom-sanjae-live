import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  mergeSupabaseCookieOptions,
  supabaseCookieOptions,
} from "./cookie-options";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, mergeSupabaseCookieOptions(options)),
            );
          } catch {
            // Server Component 읽기 전용 컨텍스트 — proxy/route handler가 갱신 담당
          }
        },
      },
    },
  );
}
