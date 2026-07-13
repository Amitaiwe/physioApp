// db.js — schema של בסיס הנתונים המקומי (IndexedDB דרך Dexie)
import Dexie from "https://esm.sh/dexie@4?bundle";

export const db = new Dexie("PhysioDiaryDB");

// גרסה 1 של הסכמה. שדות עם & הם אינדקסים ייחודיים, שאר השדות מאונדקסים לחיפוש/מיון.
db.version(1).stores({
  patients: "++id, name, phone",
  treatments: "++id, patientId, date, startTime, status, recurringTemplateId, createdAt",
  recurringTemplates: "++id, patientId, dayOfWeek, startTime",
  recordings: "++id, treatmentId, createdAt", // blob נשמר בשדה blob (לא מאונדקס)
  transcripts: "++id, treatmentId, createdAt",
  settings: "key",
});

// ערכי ברירת מחדל להגדרות — נכתבים פעם אחת אם לא קיימים
export async function ensureDefaultSettings() {
  const existing = await db.settings.get("retentionDays");
  if (!existing) {
    await db.settings.put({ key: "retentionDays", value: 45 });
  }
  const consent = await db.settings.get("cloudTranscriptionConsent");
  if (!consent) {
    await db.settings.put({ key: "cloudTranscriptionConsent", value: false });
  }
}

export async function getSetting(key, fallback) {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}
