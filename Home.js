import React from "https://esm.sh/react@18";
import htm from "https://esm.sh/htm@3";
import { db } from "../db.js";
import { toDateKey, hourLabel } from "../utils/format.js";

const html = htm.bind(React.createElement);
const { useEffect, useState } = React;

export default function Home({ navigate }) {
  const [next, setNext] = useState(null);
  const [todayCount, setTodayCount] = useState(0);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    (async () => {
      const todayKey = toDateKey(new Date());
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const todays = await db.treatments.where("date").equals(todayKey).sortBy("startTime");
      setTodayCount(todays.length);

      const upcoming = todays.find((t) => {
        const [h, m] = t.startTime.split(":").map(Number);
        return h * 60 + m >= nowMinutes && t.status !== "completed";
      });
      setNext(upcoming || null);
      if (upcoming) setPatient(await db.patients.get(upcoming.patientId));
    })();
  }, []);

  return html`
    <div class="p-5 space-y-5">
      <div>
        <h1 class="font-display text-3xl text-[--pine]">שלום 👋</h1>
        <p class="text-[--ink]/60 mt-1">${new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
      </div>

      <svg class="pulse-arc" viewBox="0 0 300 28" preserveAspectRatio="none">
        <path d="M0,14 L90,14 L110,2 L130,26 L150,14 L300,14" />
      </svg>

      ${next
        ? html`
            <button onClick=${() => navigate("treatmentDetail", { treatmentId: next.id })}
              class="w-full text-right bg-white rounded-2xl p-4 shadow-sm border border-[--border]">
              <div class="text-xs text-[--ink]/50 mb-1">הטיפול הבא</div>
              <div class="font-display text-xl text-[--pine]">${patient?.name || "מטופל"}</div>
              <div class="font-mono text-[--ink]/70 mt-1">${hourLabel(Number(next.startTime.split(":")[0]))} · ${next.durationMinutes} דק'</div>
            </button>
          `
        : html`<div class="bg-white rounded-2xl p-4 border border-[--border] text-[--ink]/60">אין טיפולים נוספים היום</div>`}

      <div class="bg-white rounded-2xl p-4 border border-[--border] flex justify-between items-center">
        <span class="text-[--ink]/70">טיפולים היום</span>
        <span class="font-mono text-2xl text-[--pine]">${todayCount}</span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button class="btn-primary rounded-2xl py-4 font-medium" onClick=${() => navigate("calendar")}>מעבר ליומן</button>
        <button class="btn-gold rounded-2xl py-4 font-medium" onClick=${() => navigate("stats")}>סטטיסטיקות</button>
      </div>
      <button class="w-full border border-[--border] bg-white rounded-2xl py-3 text-[--pine]" onClick=${() => navigate("backup")}>גיבוי וייצוא נתונים</button>
    </div>
  `;
}
