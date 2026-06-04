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

/**
 * service-role 客户端 —— **完全绕过 RLS**。
 *
 * 信任边界(必须遵守):
 * 本平台用自建 HMAC 会话(apps/web/lib/session.ts),不接 Supabase Auth,因此
 * Postgres 端 `auth.uid()` 恒为 null,所有基于 `auth.uid()` 的 RLS 策略对任何
 * 客户端都不会自动放行。换言之,数据隔离**不能**依赖 Postgres RLS,只能由
 * 应用层在每个学生数据查询处做归属校验(`resource.userId === currentUser.id`,
 * 见 apps/web/AGENTS.md「鉴权」节)。
 *
 * 故 supabaseRepository 统一用本 service-role 客户端,但调用方**只允许在服务端
 * (route handler / server component)使用**,且必须已通过 requireApiUser/requireApiRole
 * 完成鉴权 + 归属校验后才查询。绝不可把 service-role 客户端暴露到浏览器或未鉴权路径。
 *
 * 若未来接入 Supabase Auth 使 `auth.uid()` 生效,应改用下方 createSupabaseUserClient
 * 让 RLS 真正承担隔离,把 service-role 限制为明确的可信服务端写操作(webhook / 导入 / 后台)。
 */
export function createSupabaseAdminClient() {
  const env = getSupabaseEnv();
  if (!env.url || !env.serviceRoleKey) {
    throw new Error("Supabase service role credentials are missing.");
  }
  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * 用户态客户端 —— **走 RLS**(用 anon key)。
 *
 * 与 createSupabaseAdminClient 互为对照:本客户端受 RLS 约束,适合在已接入
 * Supabase Auth(或已注入用户 access token)的前提下,把数据隔离下沉到 Postgres。
 *
 * 当前自建会话体系下 `auth.uid()` 为 null,RLS 会拒绝绝大多数读写,因此本函数
 * 暂不被 supabaseRepository 默认使用,仅作为「RLS 优先」架构演进的入口预留:
 *   - 传入 accessToken 时,以该用户身份发起请求,RLS 按 auth.uid() 收敛行级可见性;
 *   - 不传时,即匿名身份,仅能命中 published 等公开读策略。
 *
 * 这样既满足「提供走 RLS 的用户态 client 选项」,又不破坏当前可运行的服务端路径。
 */
export function createSupabaseUserClient(accessToken?: string) {
  const env = getSupabaseEnv();
  if (!env.url || !env.anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }
  return createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}
