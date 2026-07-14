import { getCategoryByCode } from "./infraction-categories.js";

const UCAT_URL = process.env.UCAT_URL;
const UCAT_CASES_SECRET = process.env.UCAT_CASES_SECRET;

const RETRIES = 3;
const BACKOFF_MS = [500, 1500, 4000];

function authHeaders() {
  return {
    Authorization: `Bearer ${UCAT_CASES_SECRET}`,
    "Content-Type": "application/json",
  };
}

async function request(path, method, body) {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const res = await fetch(`${UCAT_URL}${path}`, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`UCAT ${method} ${path} failed: ${res.status} ${await res.text()}`);
      }
      return await res.json();
    } catch (e) {
      if (attempt === RETRIES - 1) {
        console.error(`[ucat] ${method} ${path} failed after retries:`, e.message);
        return null;
      }
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
  }
}

async function buildFields(caseRow, action) {
  const category = action.categoryCode ? await getCategoryByCode(action.categoryCode) : null;
  return {
    subject_slack_id: action.targetUserId,
    subject_email: action.data?.email ?? null,
    subject_display_name: action.data?.displayName ?? null,
    rule_broken: category?.name ?? null,
    summary: action.data?.whatTheyDid ?? null,
    evidence: action.data?.permalink ?? null,
    status: caseRow.status === "open" ? "open" : "resolved",
    action_taken: action.actionType,
    action_until: action.data?.banUntil ? new Date(action.data.banUntil).getTime() : null,
    opened_at: action.performedAt,
    resolved_at: caseRow.resolvedAt ?? null,
    handled_by: action.performedBy.join(", "),
  };
}

export async function pushCaseAction(caseRow, action) {
  if (!UCAT_URL || !UCAT_CASES_SECRET) return null;

  const fields = await buildFields(caseRow, action);

  if (action.ucatId) {
    await request(`/cases/${action.ucatId}`, "PATCH", fields);
    return action.ucatId;
  }

  const created = await request("/cases", "POST", fields);
  return created?.id ?? null;
}
