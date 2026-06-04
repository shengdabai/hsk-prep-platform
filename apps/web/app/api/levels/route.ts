import { getRepository } from "@hsk/db";

import { ok, withApiHandler } from "@/lib/api-response";

export const GET = withApiHandler(async () => {
  return ok({ levels: await getRepository().getLevels() });
});
