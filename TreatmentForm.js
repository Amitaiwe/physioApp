import React from "https://esm.sh/react@18";
import htm from "https://esm.sh/htm@3";
import { db } from "../db.js";

const html = htm.bind(React.createElement);
const { useEffect, useState } = React;

const DURATIONS = [30, 45, 60, 90];

export default function TreatmentForm({ navigate, date, startTime, treatmentId }) {
  const isEdit = !!treatmentId;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState(startTime || "08:00");
  const [duration, setDuration] = useState(45);
  const [isRecurring, setIsRecurring] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [existingPatients, setExistingPatients] = useState([]);

  useEffect(() => {
    (async () => {
      setExistingPatients(await db.patients.toArray());
      if (isEdit) {
        const t = await db.treatments.get(treatmentId);
        if (!t) return;
        setTime(t.startTime);
        setDuration(t.durationMinutes);
        const p = await db.patients.get(t.patientId);
        if (p) {
          setName(p.name);
          setAddress(p.address || "");
          setPhone(p.phone || "");
          setPatientId(p.id);
        }
      }
    })();
  }, [treatmentId]);

  function pickExisting(id) {
    const p = existingPatients.find((x) => x.id === Number(id));
    if (!p) return;
    setPatientId(p.id);
    setName(p.name);
    setAddress(p.address || "");
    setPhone(p.phone || "");
  }

  async function save() {
    if (!name.trim()) return;
    let pid = patientId;
    if (!pid) {
      pid = await db.patients.add({ name: name.trim(), address: address.trim(), phone: phone.trim(), isRecurring });
    } else {
      await db.patients.update(pid, { name: name.trim(), address: address.trim(), phone: phone.trim() });
    }

    let recurringTemplateId = null;
    if (isRecurring && !isEdit) {
      const dayOfWeek = new Date(date).getDay();
      recurringTemplateId = await db.recurringTemplates.add({ patientId: pid, dayOfWeek, startTime: time, durationMinutes: duration });
    }

    if (isEdit) {
      await db.treatments.update(treatmentId, { startTime: time, durationMinutes: duration });
    } else {
      await db.treatments.add({
        patientId: pid,
        date,
        startTime: time,
        durationMinutes: duration,
        status: "scheduled",
        recurringTemplateId,
        createdAt: Date.now(),
      });
    }
    navigate("calendar");
  }

  async function remove() {
    if (!isEdit) return;
    await db.treatments.delete(treatmentId);
    navigate("calendar");
  }

  return html`
    <div class="p-5 space-y-4">
      <h1 class="font-display text-2xl text-[--pine]">${isEdit ? "עריכת טיפול" : "טיפול חדש"}</h1>

      ${!isEdit && existingPatients.length > 0 && html`
        <div>
          <label class="text-xs text-[--ink]/60">בחירת מטופל קיים</label>
          <select class="w-full rounded-xl border border-[--border] p-3 mt-1" onChange=${(e) => pickExisting(e.target.value)}>
            <option value="">— מטופל חדש —</option>
            ${existingPatients.map((p) => html`<option value=${p.id} key=${p.id}>${p.name}</option>`)}
          </select>
        </div>
      `}

      <div>
        <label class="text-xs text-[--ink]/60">שם המטופל</label>
        <input class="w-full rounded-xl border border-[--border] p-3 mt-1" value=${name} onChange=${(e) => setName(e.target.value)} />
      </div>
      <div>
        <label class="text-xs text-[--ink]/60">כתובת מלאה</label>
        <input class="w-full rounded-xl border border-[--border] p-3 mt-1" value=${address} onChange=${(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label class="text-xs text-[--ink]/60">טלפון</label>
        <input class="w-full rounded-xl border border-[--border] p-3 mt-1" value=${phone} onChange=${(e) => setPhone(e.target.value)} inputMode="tel" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-[--ink]/60">שעה</label>
          <input type="time" class="w-full rounded-xl border border-[--border] p-3 mt-1 font-mono" value=${time} onChange=${(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label class="text-xs text-[--ink]/60">משך (דקות)</label>
          <select class="w-full rounded-xl border border-[--border] p-3 mt-1" value=${duration} onChange=${(e) => setDuration(Number(e.target.value))}>
            ${DURATIONS.map((d) => html`<option value=${d} key=${d}>${d}</option>`)}
          </select>
        </div>
      </div>

      ${!isEdit && html`
        <label class="flex items-center gap-2 text-sm text-[--ink]/70">
          <input type="checkbox" checked=${isRecurring} onChange=${(e) => setIsRecurring(e.target.checked)} />
          טיפול קבוע (חוזר כל שבוע באותו יום ושעה)
        </label>
      `}

      <div class="flex gap-3 pt-2">
        <button class="btn-primary flex-1 rounded-2xl py-3 font-medium" onClick=${save}>שמירה</button>
        ${isEdit && html`<button class="border border-[--clay] text-[--clay] rounded-2xl px-5" onClick=${remove}>מחיקה</button>`}
      </div>
      <button class="w-full text-[--ink]/50 py-2" onClick=${() => navigate("calendar")}>ביטול</button>
    </div>
  `;
}
