import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('production repository cannot fall back to in-memory data', async () => {
  const source = await read('packages/db/src/repository.ts');
  assert.match(source, /process\.env\.NODE_ENV === "production"/);
  assert.match(source, /process\.env\.VERCEL_ENV === "production"/);
  assert.match(source, /mock repository is disabled/);
  assert.ok(source.indexOf('throw new Error') < source.lastIndexOf('return mockRepository'));
});

test('persistent repository requires its service-role credential', async () => {
  const source = await read('packages/db/src/supabase.ts');
  assert.match(source, /repositoryConfigured: Boolean\(url && serviceRoleKey\)/);
});
