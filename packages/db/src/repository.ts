import { mockRepository } from "./mock-repository";
import { isSupabaseConfigured } from "./supabase";
import type { Repository } from "./types";

export function getRepository(): Repository {
  // MVP 默认使用 mock repository，保证项目在未接 Supabase 时也能本地跑通。
  // 生产接入后，可在这里切换到 Supabase-backed repository。
  if (isSupabaseConfigured()) {
    return mockRepository;
  }

  return mockRepository;
}
