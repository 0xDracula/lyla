import { db } from "./db.js";
import { userNotes } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { recordAudit } from "./audit-log.js";

export async function getUserNotes(targetUserId) {
  return db
    .select()
    .from(userNotes)
    .where(eq(userNotes.targetUserId, targetUserId))
    .orderBy(desc(userNotes.createdAt));
}

export async function getUserNote(id) {
  const [row] = await db.select().from(userNotes).where(eq(userNotes.id, id)).limit(1);
  return row ?? null;
}

export async function addUserNote(targetUserId, body, createdBy) {
  await db.insert(userNotes).values({ targetUserId, body, createdBy, createdAt: Date.now() });
}

export async function editUserNote(id, actorId, newBody) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(userNotes).where(eq(userNotes.id, id)).limit(1);
    if (!existing) return null;
    const [updated] = await tx
      .update(userNotes)
      .set({ body: newBody, editedBy: actorId, editedAt: Date.now() })
      .where(eq(userNotes.id, id))
      .returning();
    await recordAudit(tx, {
      subjectType: "user_note",
      subjectId: id,
      changeType: "edit",
      actorId,
      before: existing,
      after: updated,
      targetUserId: existing.targetUserId,
    });
    return updated;
  });
}

export async function deleteUserNote(id, actorId) {
  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(userNotes).where(eq(userNotes.id, id)).limit(1);
    if (!existing) return;
    await tx.delete(userNotes).where(eq(userNotes.id, id));
    await recordAudit(tx, {
      subjectType: "user_note",
      subjectId: id,
      changeType: "delete",
      actorId,
      before: existing,
      targetUserId: existing.targetUserId,
    });
  });
}
