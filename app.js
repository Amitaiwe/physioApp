// app.js — נקודת הכניסה. React + htm נטענים ישירות מ-CDN (esm.sh), בלי שלב build,
// כך שהאפליקציה היא סטטית לחלוטין וניתנת לאירוח ב-GitHub Pages בדיוק כמו הפרויקטים האחרים שלך.
import React from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import htm from "https://esm.sh/htm@3";

import { db, ensureDefaultSettings } from "./db.js";
import { runRetentionCleanup } from "./utils/retention.js";
import Home from "./views/Home.js";
import CalendarView from "./views/Calendar.js";
import TreatmentForm from "./views/TreatmentForm.js";
import TreatmentDetail from "./views/TreatmentDetail.js";
import Stats from "./views/Stats.js";
import Backup from "./views/Backup.js";

const html = htm.bind(React.createElement);
const { useState, useEffect, useCallback } = React;

function App() {
  const [route, setRoute] = useState({ name: "home" });
  const [ready, setReady] = useState(false);
  const [cleanupInfo, setCleanupInfo] = useState(null);

  useEffect(() => {
    (async () => {
      await ensureDefaultSettings();
      const result = await runRetentionCleanup();
      if (result.deleted > 0) setCleanupInfo(result.deleted);
      setReady(true);
    })();
  }, []);

  const navigate = useCallback((name, params = {}) => setRoute({ name, ...params }), []);

  if (!ready) {
    return html`<div class="h-full flex items-center justify-center text-[--pine]">טוען…</div>`;
  }

  let screen;
  if (route.name === "home") screen = html`<${Home} navigate=${navigate} />`;
  else if (route.name === "calendar") screen = html`<${CalendarView} navigate=${navigate} />`;
  else if (route.name === "treatmentForm")
    screen = html`<${TreatmentForm} navigate=${navigate} date=${route.date} startTime=${route.startTime} treatmentId=${route.treatmentId} />`;
  else if (route.name === "treatmentDetail")
    screen = html`<${TreatmentDetail} navigate=${navigate} treatmentId=${route.treatmentId} />`;
  else if (route.name === "stats") screen = html`<${Stats} navigate=${navigate} />`;
  else if (route.name === "backup") screen = html`<${Backup} navigate=${navigate} />`;
  else screen = html`<${Home} navigate=${navigate} />`;

  const isTab = ["home", "calendar", "stats", "backup"].includes(route.name);

  return html`
    <div class="h-full flex flex-col safe-top">
      <div class="flex-1 overflow-y-auto">${screen}</div>
      ${cleanupInfo &&
      html`<div class="fixed bottom-20 inset-x-4 bg-[--ink] text-white text-sm rounded-xl px-4 py-2 shadow-lg flex justify-between items-center">
        <span>נמחקו אוטומטית ${cleanupInfo} טיפולים ישנים מ-45 יום ומעלה</span>
        <button class="text-[--gold]" onClick=${() => setCleanupInfo(null)}>סגור</button>
      </div>`}
      ${isTab &&
      html`
        <nav class="tab-bar safe-bottom">
          <button class="tab-btn ${route.name === "home" ? "active" : ""}" onClick=${() => navigate("home")}>
            <span>🏠</span><span>ראשי</span>
          </button>
          <button class="tab-btn ${route.name === "calendar" ? "active" : ""}" onClick=${() => navigate("calendar")}>
            <span>📅</span><span>יומן</span>
          </button>
          <button class="tab-btn ${route.name === "stats" ? "active" : ""}" onClick=${() => navigate("stats")}>
            <span>📊</span><span>סטטיסטיקות</span>
          </button>
          <button class="tab-btn ${route.name === "backup" ? "active" : ""}" onClick=${() => navigate("backup")}>
            <span>🗂️</span><span>גיבוי</span>
          </button>
        </nav>
      `}
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
