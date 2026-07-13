import React from "https://esm.sh/react@18";
import htm from "https://esm.sh/htm@3";
import { db } from "../db.js";
import { wazeUrl, telUrl, minutesToDuration } from "../utils/format.js";
import { TreatmentRecorder, isSpeechRecognitionSupported } from "../utils/recording.js";

const html = htm.bind(React.createElement);
const { useEffect, useState, useRef } = React;

export default function TreatmentDetail({ navigate, treatmentId }) {
  const [treatment, setTreatment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [recording, setRecording] = useState(null); // { id, audioUrl }
  const [transcript, setTranscript] = useState(null); // { id, text }
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [editingText, setEditingText] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const recorderRef = useRef(null);

  async function load() {
    const t = await db.treatments.get(treatmentId);
    setTreatment(t);
    if (t) {
      setPatient(await db.patients.get(t.patientId));
      const rec = await db.recordings.where("treatmentId").equals(treatmentId).first();
      if (rec) setRecording({ id: rec.id, audioUrl: URL.createObjectURL(rec.blob) });
      const tr = await db.transcripts.where("treatmentId").equals(treatmentId).first();
      if (tr) setTranscript(tr);
    }
  }

  useEffect(() => { load(); }, [treatmentId]);

  async function toggleComplete() {
    const nextStatus = treatment.status === "completed" ? "scheduled" : "completed";
    await db.treatments.update(treatmentId, { status: nextStatus });
    setTreatment({ ...treatment, status: nextStatus });
  }

  async function startRecording() {
    recorderRef.current = new TreatmentRecorder();
    setLiveText("");
    setSpeechError(null);
    setIsRecording(true);
    await recorderRef.current.start({ onTranscriptUpdate: setLiveText, onError: setSpeechError });
  }

  async function stopRecording() {
    const { blob, transcript: text } = await recorderRef.current.stop();
    setIsRecording(false);

    // אם כבר יש הקלטה קודמת לטיפול הזה - מחליפים אותה
    const existingRec = await db.recordings.where("treatmentId").equals(treatmentId).first();
    if (existingRec) await db.recordings.delete(existingRec.id);
    const recId = await db.recordings.add({ treatmentId, blob, createdAt: Date.now() });

    const existingTr = await db.transcripts.where("treatmentId").equals(treatmentId).first();
    if (existingTr) await db.transcripts.delete(existingTr.id);
    let trId = null;
    if (text) {
      trId = await db.transcripts.add({ treatmentId, text, editedText: text, source: "device", createdAt: Date.now() });
    }

    setRecording({ id: recId, audioUrl: URL.createObjectURL(blob) });
    if (trId) setTranscript({ id: trId, text, editedText: text });
  }

  async function saveTranscriptEdit(newText) {
    await db.transcripts.update(transcript.id, { editedText: newText });
    setTranscript({ ...transcript, editedText: newText });
    setEditingText(false);
  }

  if (!treatment || !patient) return html`<div class="p-5 text-[--ink]/50">טוען…</div>`;

  return html`
    <div class="p-5 space-y-5 pb-10">
      <div class="flex items-center justify-between">
        <button class="text-[--pine]" onClick=${() => navigate("calendar")}>‹ חזרה</button>
        <button class="text-sm text-[--pine]" onClick=${() => navigate("treatmentForm", { treatmentId })}>עריכה</button>
      </div>

      <div>
        <h1 class="font-display text-2xl text-[--pine]">${patient.name}</h1>
        <p class="font-mono text-[--ink]/60 mt-1">${treatment.startTime} · ${minutesToDuration(treatment.durationMinutes)}</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <a href=${wazeUrl(patient.address)} class="btn-primary rounded-2xl py-3 text-center">🧭 ניווט ב-Waze</a>
        <a href=${telUrl(patient.phone)} class="btn-gold rounded-2xl py-3 text-center">📞 חיוג</a>
      </div>
      <p class="text-sm text-[--ink]/60">${patient.address}</p>

      <div class="bg-white rounded-2xl p-4 border border-[--border] flex items-center justify-between">
        <div>
          <div class="font-medium">${treatment.status === "completed" ? "טיפול הושלם" : "טרם הועלה למערכת"}</div>
          <div class="text-xs text-[--ink]/50">סמני לאחר העלאת הטיפול למחשב / למערכת החברה</div>
        </div>
        <button onClick=${toggleComplete}
          class="w-8 h-8 rounded-lg border-2 flex items-center justify-center text-lg ${treatment.status === "completed" ? "bg-[--sage] border-[--sage] text-white" : "border-[--border]"}">
          ${treatment.status === "completed" ? "✓" : ""}
        </button>
      </div>

      <div class="bg-white rounded-2xl p-4 border border-[--border] space-y-3">
        <div class="font-display text-lg text-[--pine]">תיעוד טיפול</div>

        ${!isSpeechRecognitionSupported() && html`
          <p class="text-xs text-[--clay]">תמלול אוטומטי לא נתמך במכשיר זה — ניתן עדיין להקליט ולהקליד תמלול ידני.</p>
        `}

        ${speechError && html`
          <p class="text-xs text-[--clay]">שגיאת תמלול: ${speechError} — ההקלטה עצמה עדיין נשמרת ותקינה.</p>
        `}

        ${isRecording
          ? html`
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-[--clay]">
                  <span class="w-2.5 h-2.5 rounded-full bg-[--clay] animate-pulse"></span>
                  <span>מקליטה…</span>
                </div>
                ${liveText && html`<p class="text-sm text-[--ink]/70">${liveText}</p>`}
                <button class="w-full bg-[--clay] text-white rounded-2xl py-3" onClick=${stopRecording}>עצירת הקלטה</button>
              </div>
            `
          : html`<button class="w-full btn-primary rounded-2xl py-3" onClick=${startRecording}>🎙️ ${recording ? "הקלטה חדשה" : "התחלת הקלטה"}</button>`}

        ${recording && !isRecording && html`
          <audio controls class="w-full" src=${recording.audioUrl}></audio>
        `}

        ${transcript && !isRecording && html`
          <div>
            <div class="text-xs text-[--ink]/50 mb-1">תמלול</div>
            ${editingText
              ? html`
                  <${TranscriptEditor} initial=${transcript.editedText} onSave=${saveTranscriptEdit} onCancel=${() => setEditingText(false)} />
                `
              : html`
                  <p class="text-sm bg-[--paper] rounded-xl p-3 whitespace-pre-wrap">${transcript.editedText}</p>
                  <button class="text-xs text-[--pine] mt-1" onClick=${() => setEditingText(true)}>עריכת טקסט</button>
                `}
          </div>
        `}
      </div>
    </div>
  `;
}

function TranscriptEditor({ initial, onSave, onCancel }) {
  const [val, setVal] = useState(initial);
  return html`
    <div class="space-y-2">
      <textarea class="w-full rounded-xl border border-[--border] p-3 text-sm" rows="5" value=${val} onChange=${(e) => setVal(e.target.value)}></textarea>
      <div class="flex gap-2">
        <button class="btn-primary rounded-xl px-4 py-2 text-sm" onClick=${() => onSave(val)}>שמירה</button>
        <button class="text-sm text-[--ink]/50" onClick=${onCancel}>ביטול</button>
      </div>
    </div>
  `;
}
