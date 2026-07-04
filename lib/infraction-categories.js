import { db } from "./db.js";
import { infractionCategories } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { SEED_CATEGORIES } from "../db/seed-data/infraction-categories.js";

export async function seedInfractionCategories() {
  await db
    .insert(infractionCategories)
    .values(SEED_CATEGORIES)
    .onConflictDoNothing({ target: infractionCategories.code });
}

export async function getActiveCategories() {
  return db
    .select()
    .from(infractionCategories)
    .where(eq(infractionCategories.active, true))
    .orderBy(asc(infractionCategories.sortOrder));
}

export async function getCategoryByCode(code) {
  const [row] = await db
    .select()
    .from(infractionCategories)
    .where(eq(infractionCategories.code, code))
    .limit(1);
  return row ?? null;
}
