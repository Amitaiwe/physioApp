// recording.js — הקלטת קול + תמלול מבוסס Web Speech API (מקומי במכשיר, ללא שליחה לענן)
//
// הערה: Web Speech API על iOS Safari דורש שהאפליקציה תהיה פתוחה ופעילה בזמן ההקלטה
// (לא רץ ברקע), והתמיכה משתנה בין גרסאות iOS. אם האיכות לא תספיק, השלב הבא
// המומלץ הוא תמלול ענן עם מסך הסכמה מפורש (ivrit.ai / Whisper).

export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export class TreatmentRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.recognition = null;
    this.transcriptText = "";
    this.onTranscriptUpdate = null;
  }

  async start({ onTranscriptUpdate } = {}) {
    this.onTranscriptUpdate = onTranscriptUpdate || null;
    this.chunks = [];
    this.transcriptText = "";

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();

    if (isSpeechRecognitionSupported()) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SR();
      this.recognition.lang = "he-IL";
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.onresult = (event) => {
        let finalText = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
        }
        this.transcriptText = finalText.trim();
        if (this.onTranscriptUpdate) this.onTranscriptUpdate(this.transcriptText);
      };
      this.recognition.onerror = () => {
        /* ממשיכים בשקט — ההקלטה עצמה לא תלויה בתמלול */
      };
      try {
        this.recognition.start();
      } catch {
        /* אם כבר רץ / לא נתמך - מתעלמים, ההקלטה עדיין תישמר */
      }
    }
  }

  async stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        this.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        resolve({ blob, transcript: this.transcriptText });
      };
      this.mediaRecorder.stop();
    });
  }
}
