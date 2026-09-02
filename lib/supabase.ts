import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

/** 공개 참고 데이터(영화/상영관/맛집/소식) 읽기 전용. RLS로 select만 허용됨. */
export function supabasePublic() {
  browserClient ??= createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return browserClient;
}

/**
 * 개인 데이터(viewers/schedule_items/watch_items) 조작용. service_role 키 사용 — RLS 우회.
 * 서버 전용(Server Component/Server Action/Route Handler)에서만 import할 것.
 */
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
