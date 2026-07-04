import { auditLog } from "../db/schema.js";

export async function recordAudit(
  tx,
  {
    subjectType,
    subjectId,
    changeType,
    actorId,
    before,
    after = null,
    caseNumber = null,
    targetUserId = null,
  }
) {
  await tx.insert(auditLog).values({
    subjectType,
    subjectId,
    changeType,
    actorId,
    before,
    after,
    caseNumber,
    targetUserId,
    createdAt: Date.now(),
  });
}
