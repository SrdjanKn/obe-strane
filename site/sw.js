/* Obe strane service worker.
   Goal: the site opens and shows the last news when the connection drops, and never serves stale news when it is online.
   - pages and data.js: network first (4 s), then the last copy we saw
   - images, CSS, JS, logos: cached copy first, refreshed in the background
   - only same-origin GET requests; analytics, fonts and everything else go straight to the network */
const V = "obe-v1", STATIC = V + "-static", PAGES = V + "-pages";
const SHELL = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(V)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

async function networkFirst(req, key) {
  const cache = await caches.open(PAGES);
  try {
    const res = await timeout(fetch(req), 4000);
    if (res && res.ok) cache.put(key, res.clone());
    return res;
  } catch (_) {
    return (await cache.match(key)) || null;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await fresh) || Response.error();
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/og/") || url.pathname === "/sw.js") return;

  if (url.pathname === "/data.js") {                 // the news; the page adds ?t=<minute>, so we key it by path
    e.respondWith(networkFirst(req, "/data.js").then(r => r || new Response("window.NEWS_DATA=null;", {headers: {"Content-Type": "application/javascript"}})));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, req.url).then(async r => r || (await caches.match("/offline.html")) || Response.error()));
    return;
  }
  if (/\.(?:css|js|webp|png|svg|jpg|woff2?)$/.test(url.pathname)) e.respondWith(staleWhileRevalidate(req));
});
