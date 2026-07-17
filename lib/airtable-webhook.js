import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { appState } from "../db/schema.js";
import { isDev } from "./config.js";
import { mapAirtableFields } from "./airtable-fields.js";
import {
  getCaseActionByAirtableRecordId,
  updateCaseAction,
  deleteCaseAction,
} from "./case-tracker.js";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_WEBHOOK_URL = process.env.AIRTABLE_WEBHOOK_URL;
const TABLE_NAME = "LYLA Records";
const API_BASE = "https://api.airtable.com/v0";

const STATE_KEYS = {
  webhookId: "airtableWebhookId",
  macSecret: "airtableWebhookMacSecret",
  cursor: "airtableWebhookCursor",
};

function isConfigured() {
  return Boolean(AIRTABLE_PAT && AIRTABLE_BASE_ID && AIRTABLE_WEBHOOK_URL);
}

async function getState(key) {
  const [row] = await db.select().from(appState).where(eq(appState.key, key)).limit(1);
  return row?.value ?? null;
}

async function setState(key, value) {
  await db
    .insert(appState)
    .values({ key, value })
    .onConflictDoUpdate({ target: appState.key, set: { value } });
}

async function clearState(key) {
  await db.delete(appState).where(eq(appState.key, key));
}

function authHeaders() {
  return {
    Authorization: `Bearer ${AIRTABLE_PAT}`,
    "Content-Type": "application/json",
  };
}

let tableMetaPromise = null;

function getTableMeta() {
  if (!tableMetaPromise) {
    tableMetaPromise = (async () => {
      const res = await fetch(`${API_BASE}/meta/bases/${AIRTABLE_BASE_ID}/tables`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch base schema: ${res.status}`);

      const { tables } = await res.json();
      const table = tables.find((t) => t.name === TABLE_NAME);
      if (!table) throw new Error(`Table "${TABLE_NAME}" not found in base`);

      const fieldNamesById = new Map(table.fields.map((f) => [f.id, f.name]));
      return { tableId: table.id, fieldNamesById };
    })().catch((error) => {
      tableMetaPromise = null;
      throw error;
    });
  }
  return tableMetaPromise;
}

export async function ensureWebhook() {
  if (!isConfigured() || isDev) return;

  const existingId = await getState(STATE_KEYS.webhookId);
  if (existingId) return;

  const { tableId } = await getTableMeta();

  const res = await fetch(`${API_BASE}/bases/${AIRTABLE_BASE_ID}/webhooks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      notificationUrl: AIRTABLE_WEBHOOK_URL,
      specification: {
        options: {
          filters: {
            dataTypes: ["tableData"],
            recordChangeScope: tableId,
            changeTypes: ["add", "update", "remove"],
            fromSources: ["client"],
          },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error(`[airtable-webhook] create failed: ${res.status} ${await res.text()}`);
    return;
  }

  const created = await res.json();
  await setState(STATE_KEYS.webhookId, created.id);
  await setState(STATE_KEYS.macSecret, created.macSecretBase64);
  console.log(`[airtable-webhook] registered webhook ${created.id}`);
}

export async function refreshWebhook() {
  if (!isConfigured() || isDev) return;

  const webhookId = await getState(STATE_KEYS.webhookId);
  if (!webhookId) {
    await ensureWebhook();
    return;
  }

  const res = await fetch(`${API_BASE}/bases/${AIRTABLE_BASE_ID}/webhooks/${webhookId}/refresh`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (res.status === 404 || res.status === 410) {
    await clearState(STATE_KEYS.webhookId);
    await clearState(STATE_KEYS.macSecret);
    await ensureWebhook();
    return;
  }

  if (!res.ok) {
    console.error(`[airtable-webhook] refresh failed: ${res.status} ${await res.text()}`);
  }
}

export async function verifyMac(rawBody, macHeader) {
  if (!macHeader) return false;

  const macSecret = await getState(STATE_KEYS.macSecret);
  if (!macSecret) return false;

  const expected = crypto
    .createHmac("sha256", Buffer.from(macSecret, "base64"))
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(macHeader, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

async function applyRecordChange(recordId, cellValuesByFieldId, fieldNamesById, actorId) {
  if (!cellValuesByFieldId) return;

  const existing = await getCaseActionByAirtableRecordId(recordId);
  if (!existing) {
    console.log(`[airtable-webhook] no case_actions row for Airtable record ${recordId}, skipping`);
    return;
  }

  const fields = {};
  for (const [fieldId, value] of Object.entries(cellValuesByFieldId)) {
    const name = fieldNamesById.get(fieldId);
    if (name) fields[name] = value;
  }

  const mapped = mapAirtableFields(fields);
  if (Object.keys(mapped).length === 0) return;

  await updateCaseAction(existing.id, actorId, mapped);
}

async function processPayload(payload, tableId, fieldNamesById) {
  const tableChanges = payload.changedTablesById?.[tableId];
  if (!tableChanges) return;

  const sourceMetadata = payload.actionMetadata?.sourceMetadata ?? {};
  const actorId = `airtable:${sourceMetadata.email ?? sourceMetadata.id ?? "unknown"}`;

  for (const [recordId, change] of Object.entries(tableChanges.changedRecordsById ?? {})) {
    await applyRecordChange(recordId, change.current?.cellValuesByFieldId, fieldNamesById, actorId);
  }

  for (const recordId of tableChanges.destroyedRecordIds ?? []) {
    const existing = await getCaseActionByAirtableRecordId(recordId);
    if (!existing) continue;
    await deleteCaseAction(existing.id, actorId);
  }
}

export async function processNewPayloads() {
  if (!isConfigured()) return;

  const webhookId = await getState(STATE_KEYS.webhookId);
  if (!webhookId) return;

  const { tableId, fieldNamesById } = await getTableMeta();

  let cursor = await getState(STATE_KEYS.cursor);
  let mightHaveMore = true;

  while (mightHaveMore) {
    const url = new URL(`${API_BASE}/bases/${AIRTABLE_BASE_ID}/webhooks/${webhookId}/payloads`);
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      console.error(`[airtable-webhook] list payloads failed: ${res.status} ${await res.text()}`);
      return;
    }

    const { cursor: nextCursor, mightHaveMore: more, payloads } = await res.json();

    for (const payload of payloads) {
      await processPayload(payload, tableId, fieldNamesById);
    }

    cursor = nextCursor;
    mightHaveMore = more;
    await setState(STATE_KEYS.cursor, String(cursor));
  }
}
