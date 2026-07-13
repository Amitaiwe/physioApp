// retention.js — מחיקה אוטומטית של מידע ישן (ברירת מחדל: 45 יום)
// רץ פעם אחת בכל פתיחת האפליקציה. מספר הימים ניתן לשינוי דרך מסך ההגדרות (settings.retentionDays).
import { db, getSetting } from "../db.js";

export async function runRetentionCleanup() {
  const days = await getSetting("retentionDays", 45);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // טיפולים ישנים מהגבול נמחקים, יחד עם ההקלטה והתמלול המשויכים להם
  const oldTreatments = await db.treatments
    .where("createdAt")
    .below(cutoff)
    .toArray();

  if (oldTreatments.length === 0) return { deleted: 0 };

  const ids = oldTreatments.map((t) => t.id);

  await db.transaction("rw", db.treatments, db.recordings, db.transcripts, async () => {
    await db.recordings.where("treatmentId").anyOf(ids).delete();
    await db.transcripts.where("treatmentId").anyOf(ids).delete();
    await db.treatments.bulkDelete(ids);
  });

  return { deleted: ids.length };
}
