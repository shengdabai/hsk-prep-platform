import { mockRepository } from "./mock-repository";
import { supabaseRepository } from "./supabase-repository";
import { isSupabaseRepositoryConfigured } from "./supabase";
import type { Repository } from "./types";

export function getRepository(): Repository {
  // Repository 使用 service-role 客户端，因此 URL + service role key 才算完整配置。
  if (isSupabaseRepositoryConfigured()) {
    return supabaseRepository;
  }

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (isProduction) {
    throw new Error(
      "Supabase repository credentials are required in production; mock repository is disabled.",
    );
  }

  // mock 仅用于本地开发与测试，避免生产请求落入易失内存数据。
  return mockRepository;
}
