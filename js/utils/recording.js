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

  async start({ onTranscriptUpdate, onError } = {}) {
    this.onTranscriptUpdate = onTranscriptUpdate || null;
    this.onError = onError || null;
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
      this.recognition.onerror = (event) => {
        console.error("SpeechRecognition error:", event.error);
        if (this.onError) this.onError(event.error);
      };
      this.recognition.onend = () => {
        // בדפדפנים מסוימים (כרום) ה-recognition נעצר לבד אחרי שקט ממושך.
        // מפעילים אותו מחדש כל עוד עדיין מקליטים, כדי לא לאבד המשך דיבור.
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
          try {
            this.recognition.start();
          } catch {
            /* מתעלמים אם כבר רץ */
          }
        }
      };
      try {
        this.recognition.start();
      } catch (err) {
        console.error("SpeechRecognition start failed:", err);
        if (this.onError) this.onError(String(err));
      }
    } else if (this.onError) {
      this.onError("not-supported");
    }
  }

  async stop() {
    if (this.recognition) {
      this.recognition.onend = null; // מבטלים את ההפעלה-מחדש האוטומטית לפני העצירה הסופית
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
