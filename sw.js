// sw.js — cache-first לקבצי המעטפת של האפליקציה, כדי שהיא תעבוד גם ללא אינטרנט.
// שים לב: כל הנתונים (טיפולים/הקלטות/תמלולים) נשמרים ב-IndexedDB ולא כאן;
// ה-service worker אחראי רק על קוד/עיצוב האפליקציה עצמה.

const CACHE_NAME = "physio-diary-shell-v3";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/db.js",
  "./js/utils/format.js",
  "./js/utils/retention.js",
  "./js/utils/recording.js",
  "./js/views/Home.js",
  "./js/views/Calendar.js",
  "./js/views/TreatmentForm.js",
  "./js/views/TreatmentDetail.js",
  "./js/views/Stats.js",
  "./js/views/Backup.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
