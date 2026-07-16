const DATA_FIELD_MAP = {
  "What Did User Do": "whatTheyDid",
  "Display Name": "displayName",
  Email: "email",
  "If Banned, Until When": "banUntil",
  channel_ban_channel: "channelBanChannel",
  "Link To Message": "permalink",
};

export function mapAirtableFields(fields) {
  const result = {};

  if (fields["User Being Dealt With"] !== undefined) {
    result.targetUserId = fields["User Being Dealt With"] || null;
  }
  if (fields["Dealt With By"] !== undefined) {
    result.performedBy = (fields["Dealt With By"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (fields["How Was This Resolved"] !== undefined) {
    result.actionType = fields["How Was This Resolved"] || null;
  }

  const data = {};
  for (const [airtableKey, dataKey] of Object.entries(DATA_FIELD_MAP)) {
    if (fields[airtableKey] !== undefined) {
      data[dataKey] = fields[airtableKey] || null;
    }
  }
  if (Object.keys(data).length > 0) result.data = data;

  return result;
}
