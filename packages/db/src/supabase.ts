import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

type CookieStoreLike = {
  getAll(): Array<{ name: string; value: string }>;
  set(name: string, value: string, options?: Record<string, unknown>): void;
};

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    url,
    anonKey,
    serviceRoleKey,
    configured: Boolean(url && anonKey),
  };
}

export function isSupabaseConfigured() {
  return getSupabaseEnv().configured;
}

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();
  if (!env.url || !env.anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }
  return createBrowserClient<Database>(env.url, env.anonKey);
}

export async function createSupabaseServerClient(cookieStore: CookieStoreLike) {
  const env = getSupabaseEnv();
  if (!env.url || !env.anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }
  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export function createSupabaseAdminClient() {
  const env = getSupabaseEnv();
  if (!env.url || !env.serviceRoleKey) {
    throw new Error("Supabase service role credentials are missing.");
  }
  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { persistSession: false },
  });
}
