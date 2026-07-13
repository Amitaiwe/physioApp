import React from "https://esm.sh/react@18";
import htm from "https://esm.sh/htm@3";
import { db } from "../db.js";
import { startOfWeek, addDays, toDateKey, formatHeaderDate, hourLabel, START_HOUR, END_HOUR, DAY_NAMES, WORK_DAYS } from "../utils/format.js";

const html = htm.bind(React.createElement);
const { useEffect, useState, useMemo } = React;

export default function CalendarView({ navigate }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [treatments, setTreatments] = useState([]);
  const [patientsById, setPatientsById] = useState({});

  const days = useMemo(() => WORK_DAYS.map((offset) => addDays(weekStart, offset)), [weekStart]);
  const hours = useMemo(() => {
    const arr = [];
    for (let h = START_HOUR; h < END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  useEffect(() => {
    (async () => {
      const keys = days.map(toDateKey);
      const all = await db.treatments.where("date").anyOf(keys).toArray();
      setTreatments(all);
      const patients = await db.patients.toArray();
      setPatientsById(Object.fromEntries(patients.map((p) => [p.id, p])));
    })();
  }, [weekStart]);

  function treatmentAt(dateKey, hour) {
    return treatments.find((t) => t.date === dateKey && Number(t.startTime.split(":")[0]) === hour);
  }

  return html`
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-between p-4 bg-white border-b border-[--border]">
        <button class="text-[--pine] text-2xl px-2" onClick=${() => setWeekStart(addDays(weekStart, -7))}>›</button>
        <div class="font-display text-lg text-[--pine]">
          ${formatHeaderDate(days[0])} – ${formatHeaderDate(days[days.length - 1])}
        </div>
        <button class="text-[--pine] text-2xl px-2" onClick=${() => setWeekStart(addDays(weekStart, 7))}>‹</button>
      </div>

      <div class="grid grid-cols-6 border-b border-[--border] bg-white sticky top-0 z-10 text-center text-xs">
        <div class="py-2"></div>
        ${days.map((d) => html`
          <div class="py-2 font-medium text-[--pine]" key=${toDateKey(d)}>
            ${DAY_NAMES[d.getDay()]}<br/><span class="font-mono text-[--ink]/50">${formatHeaderDate(d)}</span>
          </div>
        `)}
      </div>

      <div class="flex-1 overflow-y-auto">
        ${hours.map((hour) => html`
          <div class="grid grid-cols-6 border-b border-[--border]/60" key=${hour}>
            <div class="py-3 text-[10px] font-mono text-[--ink]/40 text-center">${hourLabel(hour)}</div>
            ${days.map((d) => {
              const dateKey = toDateKey(d);
              const t = treatmentAt(dateKey, hour);
              if (t) {
                const patient = patientsById[t.patientId];
                return html`
                  <button key=${dateKey} onClick=${() => navigate("treatmentDetail", { treatmentId: t.id })}
                    class="m-0.5 rounded-lg p-1 text-[10px] text-right ${t.status === "completed" ? "bg-[--sage]/20 text-[--sage]" : "bg-[--clay]/15 text-[--clay]"}">
                    <div class="font-medium truncate">${patient?.name || "מטופל"}</div>
                  </button>
                `;
              }
              return html`
                <button key=${dateKey} onClick=${() => navigate("treatmentForm", { date: dateKey, startTime: hourLabel(hour) })}
                  class="m-0.5 rounded-lg hover:bg-[--pine]/5 active:bg-[--pine]/10"></button>
              `;
            })}
          </div>
        `)}
      </div>
    </div>
  `;
}
