import { base } from "./clients.js";

// airtable is used as a fallback for old cases
export async function getLegacyAirtableRecords(targetUserId) {
  if (!base) return [];

  const records = await base("LYLA Records")
    .select({
      filterByFormula: `{User Being Dealt With} = '${targetUserId}'`,
      sort: [{ field: "Time Of Report", direction: "desc" }],
    })
    .all();

  return records.map((record) => ({
    date: record.fields["Time Of Report"],
    dealtWithBy: record.fields["Dealt With By"],
    whatDidUserDo: record.fields["What Did User Do"],
    howResolved: record.fields["How Was This Resolved"],
    permalink: record.fields["Link To Message"],
  }));
}
