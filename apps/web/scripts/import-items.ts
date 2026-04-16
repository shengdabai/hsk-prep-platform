import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "csv-parse/sync";

import { createSupabaseAdminClient, isSupabaseConfigured } from "@hsk/db";
import type { ImportPayload, QuestionOption } from "@hsk/shared";

function parseOptions(input: string): QuestionOption[] {
  return input.split("|").map((chunk, index) => {
    const [label, text] = chunk.split(":");
    const optionId = label?.trim() || ["A", "B", "C", "D"][index] || `O${index + 1}`;
    return {
      id: optionId,
      label: optionId,
      text: (text ?? chunk).trim(),
    };
  });
}

async function readImportFile(filePath: string): Promise<ImportPayload> {
  const raw = await readFile(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    return JSON.parse(raw) as ImportPayload;
  }

  if (filePath.endsWith(".csv")) {
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    return {
      items: records.map((record) => ({
        id: record.id,
        title: record.title,
        stem: record.stem,
        prompt: record.prompt,
        levelCode: record.levelCode as ImportPayload["items"][number]["levelCode"],
        sectionCode: record.sectionCode as ImportPayload["items"][number]["sectionCode"],
        questionTypeCode: record.questionTypeCode as ImportPayload["items"][number]["questionTypeCode"],
        explanation: record.explanation,
        reviewStatus: record.reviewStatus as ImportPayload["items"][number]["reviewStatus"],
        publishStatus: record.publishStatus as ImportPayload["items"][number]["publishStatus"],
        sourceType: record.sourceType as ImportPayload["items"][number]["sourceType"],
        copyrightCleared: record.copyrightCleared === "true",
        options: parseOptions(record.options),
        correctOptionId: record.correctOptionId,
        tags: record.tags ? record.tags.split("|") : [],
      })),
      sets: [],
    };
  }

  throw new Error(`Unsupported import file: ${filePath}`);
}

async function previewPayload(payload: ImportPayload) {
  const previewDir = path.resolve(process.cwd(), "../../content/imports");
  await mkdir(previewDir, { recursive: true });
  const targetPath = path.join(previewDir, "last-import.preview.json");
  await writeFile(targetPath, JSON.stringify(payload, null, 2), "utf8");
  return targetPath;
}

async function importToSupabase(payload: ImportPayload) {
  const supabase = createSupabaseAdminClient();

  for (const item of payload.items) {
    await supabase.from("content_items").upsert({
      title: item.id,
      stem: item.stem,
      prompt: item.prompt,
      explanation: item.explanation,
      review_status: item.reviewStatus,
      publish_status: item.publishStatus,
      source_type: item.sourceType,
      copyright_status: item.copyrightCleared ? "cleared" : "pending",
    } as never);
  }
}

async function main() {
  const inputPath =
    process.argv[2] ??
    path.resolve(process.cwd(), "../../content/published/hsk1-seed.json");

  const payload = await readImportFile(inputPath);

  if (!isSupabaseConfigured()) {
    const previewPath = await previewPayload(payload);
    console.log(`Supabase not configured. Wrote preview payload to ${previewPath}`);
    return;
  }

  await importToSupabase(payload);
  console.log(`Imported ${payload.items.length} items${payload.sets?.length ? ` and ${payload.sets.length} sets` : ""}.`);
}

void main();
