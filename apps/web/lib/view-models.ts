import { getRepository } from "@hsk/db";
import type { ContentItem } from "@hsk/shared";

export async function getSanitizedSetItems(setIdOrSlug: string) {
  const items = await getRepository().getPublishedItemsForSet(setIdOrSlug);
  return items.map((item) => getDisplayItem(item));
}

export function getDisplayItem(item: ContentItem) {
  return {
    id: item.id,
    levelCode: item.levelCode,
    sectionCode: item.sectionCode,
    questionTypeCode: item.questionTypeCode,
    title: item.title,
    stem: item.stem,
    prompt: item.prompt,
    explanation: item.explanation,
    reviewStatus: item.reviewStatus,
    publishStatus: item.publishStatus,
    sourceType: item.sourceType,
    copyrightCleared: item.copyrightCleared,
    options: item.options,
    tags: item.tags,
  };
}
