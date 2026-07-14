import { isNull } from "drizzle-orm";
import { db } from "../lib/db.js";
import { caseActions } from "../db/schema.js";
import { syncActionToUcat } from "../lib/case-tracker.js";

export default async function syncUnsyncedCaseActions() {
  if (!process.env.UCAT_URL || !process.env.UCAT_CASES_SECRET) return;

  const pending = await db.select().from(caseActions).where(isNull(caseActions.ucatId));
  if (pending.length === 0) return;

  await Promise.all(pending.map(syncActionToUcat));
}
