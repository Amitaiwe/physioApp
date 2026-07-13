import React from "https://esm.sh/react@18";
import htm from "https://esm.sh/htm@3";
import JSZip from "https://esm.sh/jszip@3";
import { db, getSetting, setSetting } from "../db.js";

const html = htm.bind(React.createElement);
const { useEffect, useState, useRef } = React;

export default function Backup({ navigate }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retentionDays, setRetentionDays] = useState(45);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => setRetentionDays(await getSetting("retentionDays", 45)))();
  }, []);

  async function updateRetention(days) {
    setRetentionDays(days);
    await setSetting("retentionDays", days);
  }

  async function exportData() {
    setBusy(true);
    setMessage("");
    try {
      const [patients, treatments, recurringTemplates, recordings, transcripts] = await Promise.all([
        db.patients.toArray(),
        db.treatments.toArray(),
        db.recurringTemplates.toArray(),
        db.recordings.toArray(),
        db.transcripts.toArray(),
      ]);

      const zip = new JSZip();
      const audioFolder = zip.folder("audio");
      const recordingsMeta = recordings.map((r) => ({ id: r.id, treatmentId: r.treatmentId, createdAt: r.createdAt, file: `audio/rec-${r.id}.webm` }));
      recordings.forEach((r) => audioFolder.file(`rec-${r.id}.webm`, r.blob));

      zip.file("data.json", JSON.stringify({
        exportedAt: new Date().toISOString(),
        patients, treatments, recurringTemplates, transcripts,
        recordings: recordingsMeta,
      }, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `physio-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMessage("הגיבוי הורד בהצלחה. אפשר לשמור אותו ל-iCloud Drive או Files.");
    } catch (e) {
      setMessage("שגיאה בייצוא: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function restoreFromFile(file) {
    setBusy(true);
    setMessage("");
    try {
      const zip = await JSZip.loadAsync(file);
      const dataText = await zip.file("data.json").async("string");
      const data = JSON.parse(dataText);

      await db.transaction("rw", db.patients, db.treatments, db.recurringTemplates, db.recordings, db.transcripts, async () => {
        await db.patients.bulkPut(data.patients);
        await db.treatments.bulkPut(data.treatments);
        await db.recurringTemplates.bulkPut(data.recurringTemplates);
        await db.transcripts.bulkPut(data.transcripts);
        for (const r of data.recordings) {
          const audioFile = zip.file(r.file);
          if (audioFile) {
            const blob = await audioFile.async("blob");
            await db.recordings.put({ id: r.id, treatmentId: r.treatmentId, createdAt: r.createdAt, blob });
          }
        }
      });
      setMessage("השחזור הושלם בהצלחה.");
    } catch (e) {
      setMessage("שגיאה בשחזור: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return html`
    <div class="p-5 space-y-5">
      <h1 class="font-display text-2xl text-[--pine]">גיבוי ושחזור</h1>

      <div class="bg-white rounded-2xl p-4 border border-[--border] space-y-3">
        <div class="font-medium">ייצוא נתונים</div>
        <p class="text-sm text-[--ink]/60">מייצא קובץ ZIP הכולל את כל הטיפולים, המטופלים, התמלולים וקבצי ההקלטה. הקובץ נשמר במכשיר שלך בלבד — שום דבר לא נשלח לענן.</p>
        <button class="btn-primary rounded-2xl py-3 w-full" onClick=${exportData} disabled=${busy}>${busy ? "מייצא…" : "ייצוא כקובץ ZIP"}</button>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-[--border] space-y-3">
        <div class="font-medium">שחזור ממכשיר קודם</div>
        <p class="text-sm text-[--ink]/60">בחרי קובץ גיבוי (ZIP) לשחזור. פעולה זו תוסיף/תעדכן נתונים קיימים.</p>
        <input type="file" accept=".zip" ref=${fileInputRef} class="hidden"
          onChange=${(e) => e.target.files[0] && restoreFromFile(e.target.files[0])} />
        <button class="border border-[--pine] text-[--pine] rounded-2xl py-3 w-full" onClick=${() => fileInputRef.current.click()} disabled=${busy}>
          בחירת קובץ גיבוי
        </button>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-[--border] space-y-2">
        <div class="font-medium">שמירת מידע</div>
        <label class="text-sm text-[--ink]/60">מחיקה אוטומטית של טיפולים ישנים לאחר (ימים):</label>
        <input type="number" min="1" class="w-24 rounded-xl border border-[--border] p-2 font-mono"
          value=${retentionDays} onChange=${(e) => updateRetention(Number(e.target.value))} />
      </div>

      ${message && html`<p class="text-sm text-[--pine] bg-[--pine]/10 rounded-xl p-3">${message}</p>`}
    </div>
  `;
}
