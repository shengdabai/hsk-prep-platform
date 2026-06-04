import { mockRepository } from "./mock-repository";
import { supabaseRepository } from "./supabase-repository";
import { isSupabaseConfigured } from "./supabase";
import type { Repository } from "./types";

export function getRepository(): Repository {
  // 配置了 Supabase env(URL + anon key)走真实持久化,否则回退到内存 mock,
  // 保证项目在未接 Supabase 时也能本地跑通。
  if (isSupabaseConfigured()) {
    return supabaseRepository;
  }

  return mockRepository;
}
