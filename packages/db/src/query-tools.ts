import type { PostgrestError } from "@supabase/supabase-js";

export function assertSupabaseSuccess<T>(
  data: T,
  error: PostgrestError | null,
  fallbackMessage: string,
) {
  if (error) {
    throw new Error(`${fallbackMessage}: ${error.message}`);
  }
  return data;
}

export function buildPaginatedResult<T>(items: T[], total?: number) {
  return {
    items,
    total: total ?? items.length,
  };
}
