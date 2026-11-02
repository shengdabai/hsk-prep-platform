-- Every table in public gets row level security, and the browser-facing roles get no direct access.
-- The app reads and writes through the service role on the server, which bypasses row level security,
-- so the app does not change. Rerunning this file is safe.
do $$
declare
  t text;
begin
  foreach t in array array[
    'plans', 'levels', 'sections', 'question_types', 'tags',
    'source_document_families', 'source_documents', 'source_pages', 'media_assets',
    'content_item_options', 'content_item_answers', 'content_item_tags', 'practice_set_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end
$$;
