import React from "https://esm.sh/react@18";
import htm from "https://esm.sh/htm@3";
import { db } from "../db.js";
import { toDateKey, startOfWeek, minutesToDuration } from "../utils/format.js";

const html = htm.bind(React.createElement);
const { useEffect, useState } = React;

export default function Stats({ navigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const all = await db.treatments.toArray();
      const patients = await db.patients.toArray();
      const patientsById = Object.fromEntries(patients.map((p) => [p.id, p]));

      const todayKey = toDateKey(new Date());
      const weekStartKey = toDateKey(startOfWeek(new Date()));
      const monthPrefix = todayKey.slice(0, 7); // YYYY-MM

      const todayCount = all.filter((t) => t.date === todayKey).length;
      const weekCount = all.filter((t) => t.date >= weekStartKey).length;
      const monthCount = all.filter((t) => t.date.startsWith(monthPrefix)).length;

      const byPatient = {};
      let totalMinutes = 0;
      let completed = 0;
      for (const t of all) {
        const name = patientsById[t.patientId]?.name || "לא ידוע";
        byPatient[name] = (byPatient[name] || 0) + 1;
        totalMinutes += t.durationMinutes;
        if (t.status === "completed") completed++;
      }
      const completionRate = all.length ? Math.round((completed / all.length) * 100) : 0;
      const topPatients = Object.entries(byPatient).sort((a, b) => b[1] - a[1]).slice(0, 8);

      setStats({ todayCount, weekCount, monthCount, totalMinutes, completionRate, topPatients, total: all.length });
    })();
  }, []);

  if (!stats) return html`<div class="p-5 text-[--ink]/50">טוען…</div>`;

  return html`
    <div class="p-5 space-y-5">
      <h1 class="font-display text-2xl text-[--pine]">סטטיסטיקות</h1>

      <div class="grid grid-cols-3 gap-3">
        <${StatCard} label="היום" value=${stats.todayCount} />
        <${StatCard} label="השבוע" value=${stats.weekCount} />
        <${StatCard} label="החודש" value=${stats.monthCount} />
      </div>

      <div class="bg-white rounded-2xl p-4 border border-[--border] flex justify-between items-center">
        <span class="text-[--ink]/70">סך זמן עבודה (כל הנתונים)</span>
        <span class="font-mono text-[--pine]">${minutesToDuration(stats.totalMinutes)}</span>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-[--border] flex justify-between items-center">
        <span class="text-[--ink]/70">אחוז טיפולים שהושלמו</span>
        <span class="font-mono text-[--sage] text-xl">${stats.completionRate}%</span>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-[--border]">
        <div class="text-[--ink]/70 mb-2">טיפולים לפי מטופל</div>
        <div class="space-y-1">
          ${stats.topPatients.map(([name, count]) => html`
            <div class="flex justify-between text-sm" key=${name}>
              <span>${name}</span><span class="font-mono text-[--ink]/50">${count}</span>
            </div>
          `)}
        </div>
      </div>
    </div>
  `;
}

function StatCard({ label, value }) {
  return html`
    <div class="bg-white rounded-2xl p-3 border border-[--border] text-center">
      <div class="font-mono text-2xl text-[--pine]">${value}</div>
      <div class="text-xs text-[--ink]/50">${label}</div>
    </div>
  `;
}
