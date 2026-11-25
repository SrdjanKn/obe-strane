/* Obe strane: merenje posećenosti (Google Analytics 4).
   Ništa se ne učitava dok posetilac ne klikne „Prihvatam“. Izbor se pamti u pregledaču.
   Aplikacija (app.js) poziva obeTrack() pri svakoj promeni stranice; statičke stranice se broje same. */
(function () {
  "use strict";
  var GA_ID = "G-BM3N09VN53";
  var KEY = "obe_consent_v1";
  var loaded = false, pending = null, lastPath = "";

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* privatni režim: izbor važi samo za ovu posetu */ } }

  function pageInfo() {
    var h = location.hash.split("?")[0];
    var path = h.indexOf("#/") === 0 ? "/" + h.slice(2).replace(/\/+$/, "") : location.pathname;
    if (path === "") path = "/";
    var m = path.match(/^\/vest\/([^/]+)/), params = {};
    var D = window.NEWS_DATA;
    if (m) {
      path = "/vest/" + m[1] + "/";
      params.content_id = m[1];
      var s = D && D.stories && D.stories.filter(function (x) { return x.id === m[1]; })[0];
      if (s && s.section) params.content_group = s.section;
    } else {
      var r = path.match(/^\/rubrika\/(.+)$/);
      if (r) { try { params.content_group = decodeURIComponent(r[1]); } catch (e) { /* ostaje bez grupe */ } }
    }
    params.page_path = path;
    params.page_location = location.origin + path;
    params.page_title = document.title;
    return params;
  }

  function send() {
    if (!loaded || !pending) return;
    window.gtag("event", "page_view", pending);
    pending = null;
  }

  function load() {
    if (loaded) return;
    loaded = true;
    window["ga-disable-" + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    send();
  }

  function unload() {
    window["ga-disable-" + GA_ID] = true;
    pending = null;
    var host = location.hostname, parts = host.split(".");
    var domains = [host, "." + host, "." + parts.slice(-2).join(".")];
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (n.indexOf("_ga") === 0) domains.forEach(function (d) { document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + d; });
    });
  }

  window.obeTrack = function () {
    setTimeout(function () {
      var p = pageInfo();
      if (p.page_path === lastPath) return;
      lastPath = p.page_path;
      pending = p;
      send();
    }, 80);
  };

  var CSS = ".obe-ck{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:460px;box-sizing:border-box;background:#fff;color:#111;border:1px solid #111;border-radius:6px;padding:16px 18px;box-shadow:0 6px 24px rgba(0,0,0,.18);font:400 15px/1.5 'Source Sans 3',system-ui,sans-serif}"
    + ".obe-ck p{margin:0 0 12px}.obe-ck a{color:#0057B7;text-decoration:underline}"
    + ".obe-ck .b{display:flex;gap:10px}.obe-ck button{flex:1;font:600 15px/1 'Source Sans 3',system-ui,sans-serif;padding:11px 14px;border-radius:4px;border:1px solid #111;cursor:pointer;background:#fff;color:#111}"
    + ".obe-ck button.y{background:#111;color:#fff}.obe-ck button:focus-visible{outline:3px solid #0057B7;outline-offset:2px}"
    + "@media(max-width:520px){.obe-ck{left:8px;right:8px;bottom:8px;max-width:none}}";

  function banner() {
    if (document.getElementById("obe-ck")) return;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var d = document.createElement("div");
    d.id = "obe-ck"; d.className = "obe-ck"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Merenje posećenosti");
    d.innerHTML = '<p>Koristimo Google Analytics da vidimo koje se vesti čitaju. Meri se samo poseta, bez reklama. Da li prihvatate kolačiće za merenje?'
      + ' <a href="' + new URL("metodologija/#merenje", document.baseURI).href + '">Više o tome</a></p>'
      + '<div class="b"><button type="button" class="y" data-v="granted">Prihvatam</button><button type="button" data-v="denied">Ne, hvala</button></div>';
    d.addEventListener("click", function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute("data-v");
      if (!v) return;
      choose(v);
      d.remove();
    });
    document.body.appendChild(d);
  }

  function choose(v) {
    write(v);
    if (v === "granted") load(); else unload();
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-consent-open]");
    if (t) { e.preventDefault(); banner(); }
  });

  function init() {
    var c = read();
    if (c === "granted") load();
    else if (c !== "denied") banner();
    if (!window.__spa) window.obeTrack();   // stranice bez aplikacije (metodologija, arhivirane vesti, 404)
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
