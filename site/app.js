(() => {
  "use strict";
  const RELAB = {"":"režimski",i:"režimski",ih:"režimskih",a:"režimska",e:"režimske",im:"režimskim",og:"režimskog",om:"režimskom",u:"režimsku"};
  const relabel = t => typeof t === "string" ? t.replace(/\b([Pp])rovladin(i|ih|a|e|im|og|om|u)?\b/g, (w, P, suf = "") => (P === "P" ? "R" : "r") + RELAB[suf].slice(1)) : t;
  const fixAI = d => { (d.stories || []).forEach(x => { if (x.ai) for (const k in x.ai) x.ai[k] = relabel(x.ai[k]); }); ((d.briefing || {}).stories || []).forEach(x => { if (x.ai) for (const k in x.ai) x.ai[k] = relabel(x.ai[k]); }); return d; };
  // story headlines are shown in Latin script everywhere; the outlets' own titles ("Kako su naslovili") stay as published
  const LATM = {"а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"};
  const lat = t => typeof t !== "string" || !/[\u0400-\u04FF]/.test(t) ? t : [...t].map((ch, i, a) => {
    const lo = ch.toLowerCase(), m = LATM[lo]; if (m === undefined) return ch; if (ch === lo) return m;
    const nextUp = a[i + 1] && a[i + 1] !== a[i + 1].toLowerCase(), prevUp = a[i - 1] && a[i - 1] !== a[i - 1].toLowerCase();
    return nextUp || prevUp ? m.toUpperCase() : m[0].toUpperCase() + m.slice(1); }).join("");
  const prep = d => { fixAI(d);
    const seen = new Set(), key = u => String(u || "").replace(/-\d{2,4}x\d{2,4}(?=\.)/, "").split("?")[0];
    (d.stories || []).forEach(x => { x.headline = lat(x.headline); x.summary = lat(x.summary);
      if (x.image) { const k = key(x.image); if (seen.has(k)) { x.image = ""; x.image_source = ""; } else seen.add(k); } });
    ((d.briefing || {}).stories || []).forEach(x => { x.headline = lat(x.headline); });
    return d; };
  let D = prep(window.NEWS_DATA);
  const app = document.getElementById("app");
  const MOTION = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) && "IntersectionObserver" in window;
  const ORDER = ["pro_government", "public", "mixed", "international", "critical"];
  const VAR = {pro_government: "var(--pg)", critical: "var(--cr)", public: "var(--pub)", mixed: "var(--mix)", international: "var(--intl)"};
  const LAB = {pro_government: "Režimski", critical: "Kritički", public: "Javni servis", mixed: "Između kategorija", international: "Međunarodni"};
  const SECTION_ORDER = ["Politika", "Društvo", "Hronika", "Ekonomija", "Svet", "Region", "Kultura"];
  const TONES = {Politika: "#7d8a96", Društvo: "#6e7684", Hronika: "#2f3846", Ekonomija: "#5a6977", Svet: "#5d7894", Region: "#6c6a86", Kultura: "#7b8594", Vesti: "#80858c"};
  const EYE = '<svg class="eye" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/></svg>';

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const safe = u => /^https?:\/\//i.test(u || "") ? u : "#";
  const src = id => D.sources.find(s => s.id === id) || {name: id, camp: "mixed"};
  const camp = id => src(id).camp;
  const clock = iso => new Date(iso).toLocaleTimeString("sr-Latn-RS", {hour: "2-digit", minute: "2-digit"});
  const day = iso => new Date(iso).toLocaleDateString("sr-Latn-RS", {weekday: "long", day: "numeric", month: "long", year: "numeric"});
  const pct = (s, k) => Math.round(100 * (s.split[k] || 0) / s.sources);
  const LOGO_SVG = `<path d="M13.56 11.187C14.6147 12.543 15.142 14.0873 15.142 15.82C15.142 17.9293 14.3887 19.7373 12.882 21.244C11.4507 22.7507 9.68033 23.504 7.571 23.504C5.46167 23.504 3.65367 22.7507 2.147 21.244C0.715667 19.7373 0 17.9293 0 15.82C0 12.656 0.979333 9.75566 2.938 7.119C4.89667 4.407 7.458 2.034 10.622 0L13.108 2.147C12.204 2.97566 11.3753 3.99266 10.622 5.198C9.944 6.328 9.52967 7.42033 9.379 8.475C11.1117 8.927 12.5053 9.831 13.56 11.187Z" fill="#D3001A"/><path d="M21.56 16.187C22.6147 17.543 23.142 19.0873 23.142 20.82C23.142 22.9293 22.3887 24.7373 20.882 26.244C19.4507 27.7507 17.6803 28.504 15.571 28.504C13.4617 28.504 11.6537 27.7507 10.147 26.244C8.71567 24.7373 8 22.9293 8 20.82C8 17.656 8.97933 14.7557 10.938 12.119C12.8967 9.407 15.458 7.034 18.622 5L21.108 7.147C20.204 7.97566 19.3753 8.99266 18.622 10.198C17.944 11.328 17.5297 12.4203 17.379 13.475C19.1117 13.927 20.5053 14.831 21.56 16.187Z" fill="#0057B7"/><path d="M12.5488 10.1162C12.9143 10.4349 13.2518 10.7909 13.5596 11.1865C14.6142 12.5425 15.1416 14.0876 15.1416 15.8203C15.1415 17.9295 14.3884 19.7375 12.8818 21.2441C11.6485 22.5423 10.1634 23.2794 8.42676 23.459C8.14282 22.6391 8.00003 21.7597 8 20.8203C8 17.6563 8.97981 14.7558 10.9385 12.1191C11.4364 11.4297 11.973 10.7619 12.5488 10.1162Z" fill="#685C9A"/><path d="M34.2415 23.2131C33.1288 23.2131 32.2079 22.9764 31.4787 22.5029C30.7496 22.0247 30.2358 21.3618 29.9375 20.5142C29.644 19.662 29.5895 18.67 29.7742 17.5384C29.9541 16.421 30.3282 15.4432 30.8964 14.6052C31.4645 13.7671 32.1866 13.116 33.0625 12.652C33.9385 12.1833 34.9257 11.9489 36.0242 11.9489C37.1321 11.9489 38.0507 12.188 38.7799 12.6662C39.509 13.1397 40.0228 13.8026 40.3211 14.6549C40.6194 15.5071 40.6762 16.4991 40.4915 17.6307C40.3069 18.7434 39.9281 19.7188 39.3552 20.5569C38.7822 21.3949 38.0602 22.0483 37.189 22.5171C36.3178 22.9811 35.3353 23.2131 34.2415 23.2131ZM34.5398 20.8694C35.0512 20.8694 35.5034 20.7249 35.8964 20.4361C36.2941 20.1426 36.6232 19.7448 36.8836 19.2429C37.1487 18.7363 37.3334 18.1634 37.4375 17.5242C37.5417 16.8945 37.5488 16.3357 37.4589 15.8481C37.3689 15.3556 37.1795 14.9674 36.8907 14.6833C36.6066 14.3992 36.216 14.2571 35.7188 14.2571C35.2074 14.2571 34.7529 14.4039 34.3552 14.6975C33.9574 14.9863 33.6284 15.384 33.3679 15.8907C33.1075 16.3973 32.9252 16.9726 32.8211 17.6165C32.7216 18.2415 32.7145 18.8002 32.7998 19.2927C32.885 19.7803 33.072 20.1662 33.3608 20.4503C33.6497 20.7297 34.0427 20.8694 34.5398 20.8694Z" fill="currentColor"/><path d="M40.8208 23L43.2356 8.45459H46.2611L45.3662 13.9233H45.4515C45.6314 13.6298 45.8729 13.3315 46.1759 13.0285C46.4837 12.7207 46.8601 12.465 47.3052 12.2614C47.7502 12.0531 48.2782 11.9489 48.889 11.9489C49.6844 11.9489 50.3828 12.1572 50.9841 12.5739C51.5855 12.9858 52.0187 13.6085 52.2839 14.4418C52.549 15.2704 52.5774 16.3097 52.3691 17.5597C52.1702 18.7766 51.8033 19.804 51.2682 20.6421C50.7379 21.4754 50.1011 22.1075 49.3577 22.5384C48.6191 22.9645 47.8355 23.1776 47.0069 23.1776C46.4197 23.1776 45.9368 23.0805 45.558 22.8864C45.1839 22.6923 44.8928 22.4484 44.6844 22.1549C44.4761 21.8566 44.3269 21.5559 44.237 21.2529H44.0878L43.8037 23H40.8208ZM44.6915 17.5455C44.5874 18.1942 44.585 18.76 44.6844 19.2429C44.7886 19.7259 44.9874 20.1023 45.281 20.3722C45.5793 20.6374 45.9699 20.7699 46.4529 20.7699C46.95 20.7699 47.3904 20.635 47.7739 20.3651C48.1622 20.0905 48.4841 19.7117 48.7398 19.2287C48.9955 18.741 49.1754 18.18 49.2796 17.5455C49.379 16.9158 49.3814 16.3618 49.2867 15.8836C49.192 15.4053 48.9979 15.0313 48.7043 14.7614C48.4107 14.4915 48.013 14.3566 47.5111 14.3566C47.0234 14.3566 46.5855 14.4868 46.1972 14.7472C45.8137 15.0076 45.4917 15.3769 45.2313 15.8552C44.9756 16.3334 44.7957 16.8968 44.6915 17.5455Z" fill="currentColor"/><path d="M57.622 23.2131C56.5046 23.2131 55.5789 22.9858 54.845 22.5313C54.1111 22.072 53.595 21.4233 53.2967 20.5853C53.0031 19.7425 52.9534 18.7458 53.1476 17.5952C53.337 16.4731 53.7181 15.4882 54.291 14.6407C54.8687 13.7931 55.5931 13.1326 56.4643 12.6591C57.3355 12.1857 58.3062 11.9489 59.3763 11.9489C60.0959 11.9489 60.747 12.0649 61.3294 12.2969C61.9165 12.5242 62.4042 12.8698 62.7924 13.3339C63.1807 13.7931 63.4459 14.3684 63.5879 15.0597C63.7347 15.751 63.7323 16.5607 63.5808 17.4887L63.4459 18.3196H54.2413L54.5325 16.4446H60.8961C60.9672 16.009 60.9388 15.6232 60.8109 15.287C60.6831 14.9508 60.47 14.688 60.1717 14.4986C59.8734 14.3045 59.5065 14.2074 59.0709 14.2074C58.6258 14.2074 58.2091 14.3163 57.8209 14.5341C57.4326 14.7519 57.1059 15.0384 56.8407 15.3935C56.5803 15.7439 56.4122 16.125 56.3365 16.537L56.0027 18.3978C55.908 18.9707 55.9269 19.4465 56.0595 19.8253C56.1968 20.2041 56.4335 20.4882 56.7697 20.6776C57.1059 20.8623 57.532 20.9546 58.0481 20.9546C58.3843 20.9546 58.6992 20.9072 58.9927 20.8125C59.291 20.7178 59.5562 20.5782 59.7882 20.3935C60.0202 20.2041 60.2096 19.9697 60.3564 19.6904L63.1191 19.875C62.8635 20.5474 62.4752 21.1345 61.9544 21.6364C61.4335 22.1336 60.8062 22.5218 60.0723 22.8012C59.3431 23.0758 58.5263 23.2131 57.622 23.2131Z" fill="currentColor"/><path d="M78.0426 15.2017L75.294 15.3722C75.2798 15.1307 75.2135 14.9153 75.0951 14.7259C74.9815 14.5318 74.8134 14.3779 74.5909 14.2642C74.3731 14.1506 74.0985 14.0938 73.767 14.0938C73.2699 14.0938 72.8271 14.2074 72.4389 14.4347C72.0506 14.662 71.8305 14.9532 71.7784 15.3083C71.7358 15.5356 71.795 15.7273 71.9559 15.8836C72.1169 16.0398 72.4413 16.1724 72.929 16.2813L74.8466 16.679C75.8693 16.8968 76.6079 17.259 77.0625 17.7657C77.5218 18.2723 77.6851 18.9352 77.5525 19.7543C77.4342 20.4503 77.1288 21.0588 76.6363 21.5796C76.1439 22.0957 75.5189 22.4982 74.7613 22.787C74.0038 23.0711 73.1633 23.2131 72.24 23.2131C70.758 23.2131 69.6311 22.9101 68.8593 22.304C68.0876 21.698 67.7159 20.8765 67.7443 19.8395L70.6988 19.6833C70.7225 20.1284 70.8788 20.4645 71.1676 20.6918C71.4564 20.9143 71.8518 21.028 72.3537 21.0327C72.9171 21.0422 73.3953 20.9262 73.7883 20.6847C74.1861 20.4385 74.411 20.1402 74.463 19.7898C74.5009 19.5436 74.4299 19.3447 74.25 19.1932C74.0748 19.0417 73.7528 18.9162 73.2841 18.8168L71.4659 18.4404C70.4337 18.2273 69.6927 17.8462 69.2429 17.2969C68.7931 16.7477 68.6392 16.0493 68.7812 15.2017C68.8949 14.5247 69.1766 13.9446 69.6264 13.4617C70.0809 12.974 70.6657 12.6 71.3807 12.3395C72.1003 12.0791 72.9124 11.9489 73.8167 11.9489C75.2325 11.9489 76.2978 12.2401 77.0128 12.8225C77.7325 13.4049 78.0757 14.198 78.0426 15.2017Z" fill="currentColor"/><path d="M85.7316 12.091L85.3552 14.3637H78.7785L79.162 12.091H85.7316ZM81.0796 9.47732H84.1052L82.4148 19.6478C82.3675 19.9271 82.3746 20.1449 82.4361 20.3012C82.4977 20.4527 82.5995 20.5592 82.7415 20.6208C82.8883 20.6823 83.0635 20.7131 83.2671 20.7131C83.4091 20.7131 83.5535 20.7013 83.7003 20.6776C83.8471 20.6492 83.9584 20.6279 84.0341 20.6137L84.1478 22.8651C83.9773 22.9172 83.7477 22.974 83.4589 23.0356C83.1748 23.0971 82.8386 23.135 82.4503 23.1492C81.7117 23.1776 81.0867 23.0805 80.5753 22.858C80.064 22.6307 79.697 22.2827 79.4745 21.814C79.2519 21.3452 79.2046 20.7557 79.3324 20.0455L81.0796 9.47732Z" fill="currentColor"/><path d="M85.0843 23L86.9025 12.091H89.8357L89.5161 13.9944H89.6297C89.9422 13.3173 90.3613 12.8059 90.8868 12.4603C91.4171 12.1099 91.9877 11.9347 92.5985 11.9347C92.75 11.9347 92.9086 11.9442 93.0743 11.9631C93.2448 11.9773 93.3963 12.001 93.5289 12.0341L93.0743 14.7259C92.9418 14.6785 92.7524 14.6407 92.5062 14.6123C92.2647 14.5791 92.035 14.5625 91.8172 14.5625C91.3769 14.5625 90.9673 14.6596 90.5885 14.8537C90.2098 15.0431 89.8902 15.3083 89.6297 15.6492C89.3741 15.9901 89.206 16.3831 89.1255 16.8282L88.1098 23H85.0843Z" fill="currentColor"/><path d="M95.2378 23.206C94.5465 23.206 93.9475 23.0853 93.4409 22.8438C92.939 22.5976 92.5697 22.233 92.3329 21.75C92.0962 21.2671 92.037 20.6681 92.1554 19.9532C92.2595 19.3471 92.456 18.8405 92.7449 18.4333C93.0384 18.0214 93.3959 17.6899 93.8173 17.439C94.2387 17.188 94.7051 16.9963 95.2165 16.8637C95.7326 16.7311 96.2652 16.6411 96.8145 16.5938C97.4489 16.5275 97.965 16.4636 98.3628 16.402C98.7652 16.3405 99.0659 16.2529 99.2647 16.1392C99.4636 16.0209 99.5844 15.8457 99.627 15.6137V15.5711C99.698 15.126 99.6151 14.7803 99.3784 14.5341C99.1464 14.2832 98.7747 14.1577 98.2633 14.1577C97.7236 14.1577 97.2643 14.2761 96.8855 14.5128C96.5114 14.7496 96.2439 15.0502 96.0829 15.4148L93.3272 15.1875C93.5735 14.5247 93.9451 13.9517 94.4423 13.4688C94.9442 12.9811 95.5479 12.6071 96.2534 12.3466C96.9589 12.0815 97.7496 11.9489 98.6255 11.9489C99.2316 11.9489 99.7974 12.0199 100.323 12.162C100.853 12.304 101.31 12.5242 101.694 12.8225C102.082 13.1208 102.361 13.5043 102.532 13.9731C102.707 14.4371 102.742 14.9934 102.638 15.6421L101.41 23H98.5403L98.796 21.4873H98.7108C98.4788 21.8282 98.1947 22.1288 97.8585 22.3892C97.5223 22.6449 97.1364 22.8462 96.7008 22.9929C96.2652 23.135 95.7775 23.206 95.2378 23.206ZM96.4522 21.1179C96.8926 21.1179 97.2974 21.0303 97.6667 20.8552C98.0408 20.6752 98.3486 20.4338 98.59 20.1307C98.8363 19.8277 98.9925 19.4844 99.0588 19.1009L99.2434 17.9432C99.1487 18.0048 99.0114 18.0592 98.8315 18.1066C98.6563 18.1539 98.4646 18.1989 98.2562 18.2415C98.0526 18.2794 97.8467 18.3149 97.6383 18.3481C97.43 18.3765 97.243 18.4049 97.0772 18.4333C96.7127 18.4854 96.386 18.5682 96.0971 18.6819C95.8083 18.7955 95.5739 18.9494 95.394 19.1435C95.2141 19.3329 95.1028 19.5696 95.0602 19.8537C94.9939 20.2657 95.091 20.5805 95.3514 20.7983C95.6165 21.0114 95.9835 21.1179 96.4522 21.1179Z" fill="currentColor"/><path d="M107.048 16.6932L105.997 23H102.978L104.796 12.091H107.673L107.36 14.0157H107.481C107.827 13.3765 108.314 12.8722 108.944 12.5029C109.579 12.1336 110.301 11.9489 111.11 11.9489C111.868 11.9489 112.5 12.1146 113.007 12.4461C113.518 12.7775 113.878 13.2486 114.086 13.8594C114.299 14.4702 114.335 15.2017 114.193 16.054L113.028 23H110.002L111.075 16.5938C111.184 15.9262 111.099 15.4053 110.819 15.0313C110.545 14.6525 110.102 14.4631 109.491 14.4631C109.084 14.4631 108.71 14.5507 108.369 14.7259C108.028 14.9011 107.742 15.1568 107.509 15.4929C107.282 15.8244 107.128 16.2245 107.048 16.6932Z" fill="currentColor"/><path d="M119.542 23.2131C118.424 23.2131 117.498 22.9858 116.765 22.5313C116.031 22.072 115.515 21.4233 115.216 20.5853C114.923 19.7425 114.873 18.7458 115.067 17.5952C115.256 16.4731 115.638 15.4882 116.211 14.6407C116.788 13.7931 117.513 13.1326 118.384 12.6591C119.255 12.1857 120.226 11.9489 121.296 11.9489C122.015 11.9489 122.667 12.0649 123.249 12.2969C123.836 12.5242 124.324 12.8698 124.712 13.3339C125.1 13.7931 125.365 14.3684 125.507 15.0597C125.654 15.751 125.652 16.5607 125.5 17.4887L125.365 18.3196H116.161L116.452 16.4446H122.816C122.887 16.009 122.858 15.6232 122.73 15.287C122.603 14.9508 122.39 14.688 122.091 14.4986C121.793 14.3045 121.426 14.2074 120.99 14.2074C120.545 14.2074 120.129 14.3163 119.74 14.5341C119.352 14.7519 119.025 15.0384 118.76 15.3935C118.5 15.7439 118.332 16.125 118.256 16.537L117.922 18.3978C117.828 18.9707 117.846 19.4465 117.979 19.8253C118.116 20.2041 118.353 20.4882 118.689 20.6776C119.025 20.8623 119.452 20.9546 119.968 20.9546C120.304 20.9546 120.619 20.9072 120.912 20.8125C121.211 20.7178 121.476 20.5782 121.708 20.3935C121.94 20.2041 122.129 19.9697 122.276 19.6904L125.039 19.875C124.783 20.5474 124.395 21.1345 123.874 21.6364C123.353 22.1336 122.726 22.5218 121.992 22.8012C121.263 23.0758 120.446 23.2131 119.542 23.2131Z" fill="currentColor"/>`;
  const brand = (h, label = "Obe strane") => `<svg class="brand-logo" role="img" aria-label="${label}" height="${h}" width="${Math.round(h * 126 / 29)}" viewBox="0 0 126 29" xmlns="http://www.w3.org/2000/svg">${LOGO_SVG}</svg>`;
  const mark = (n, gap = 3) => `<span class="mark" aria-hidden="true" style="width:${n}px;height:${n}px"><i></i><b style="width:${gap}px"></b><i></i></span>`;
  const bar = (s, h = 6) => { if (h <= 4) {   // small: režimski | svi ostali | kritički
      const pg = s.split.pro_government || 0, cr = s.split.critical || 0, o = s.sources - pg - cr;
      const seg = (n, c, t) => n ? `<i style="width:${100 * n / s.sources}%;background:${c}" title="${t}: ${n}"></i>` : "";
      return `<div class="bar" style="height:${h}px">${seg(pg, VAR.pro_government, LAB.pro_government)}${seg(o, "var(--mix)", "Ostali")}${seg(cr, VAR.critical, LAB.critical)}</div>`; }
    return `<div class="bar${h >= 8 ? " bar-x" : ""}" style="height:${h}px"${h >= 8 ? ` data-id="${s.id}"` : ""}>${ORDER.filter(k => s.split[k]).map(k =>
      h >= 8 ? `<i data-k="${k}" tabindex="0" role="button" aria-label="${LAB[k]}: ${s.split[k]} ${form(s.split[k], "medij")}. Prikaži medije." style="width:${100 * s.split[k] / s.sources}%;background:${VAR[k]}"></i>`
        : `<i style="width:${100 * s.split[k] / s.sources}%;background:${VAR[k]}" title="${LAB[k]}: ${s.split[k]}"></i>`).join("")}</div>`; };
  const cov = s => `<div class="cov"><span class="pg"><b>${pct(s, "pro_government")}%</b> režimski</span><span>${s.sources} medija</span><span class="cr"><b>${pct(s, "critical")}%</b> kritički</span></div>`;
  const dot = k => `<i class="dot" style="background:${VAR[k]}"></i>`;
  const kick = (t, cls = "") => `<div class="kicker ${cls}">${t}</div>`;
  const link = s => `vest/${s.id}/`;
  const secKick = (s, extra) => kick([s.section ? esc(s.section) : "", extra].filter(Boolean).join(" · "));
  function photo(s, ratio = "3/2", lead = false) {
    const tone = TONES[s.section] || TONES.Vesti;
    const img = s.image ? `<img src="${esc(safe(s.image))}" alt="" ${lead ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : "";
    return `<div class="ph${s.image ? " has-img" : ""}" style="aspect-ratio:${ratio};background:${tone}">${img}<span>${esc(s.section || "Vesti")}</span></div>`;
  }
  // Serbian number agreement: 1 režimski, 2-4 režimska, 5+ režimskih (11-14 -> many)
  const FORMS = {pro_government: ["režimski", "režimska", "režimskih"], critical: ["kritički", "kritička", "kritičkih"],
                 public: ["javni servis", "javna servisa", "javnih servisa"], mixed: ["mešoviti", "mešovita", "mešovitih"], international: ["međunarodni", "međunarodna", "međunarodnih"], medij: ["medij", "medija", "medija"], prica: ["priča", "priče", "priča"], ostali: ["ostali", "ostala", "ostalih"]};
  const form = (n, k) => { const f = FORMS[k], d = n % 10, h = n % 100; return n === 1 || (d === 1 && h !== 11) ? f[0] : (d >= 2 && d <= 4 && (h < 12 || h > 14)) ? f[1] : f[2]; };
  const tidy = (t, max) => {   // calm a SHOUTED first word, optionally shorten
    t = String(t || "").replace(/^([A-ZČĆŽŠĐ]{3,})(?=[\s,])/, w => w[0] + w.slice(1).toLowerCase());
    return max && t.length > max ? t.slice(0, t.lastIndexOf(" ", max)) + "…" : t;
  };
  const firstOf = (s, k) => s.items.find(i => camp(i.source) === k);
  const bsLabel = k => k === "pro_government" ? "Prećutali režimski" : "Prećutali kritički";
  const secsWithNews = () => SECTION_ORDER.filter(n => D.stories.some(s => s.section === n));
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return ""; } };
  const initials = n => String(n).replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  // outlet logo: our own file in site/logos/<id>.png if present, otherwise the site's icon; initials underneath as fallback
  function logo(id, size = 18) {
    const s = src(id);
    if (s.logo) return `<img class="lg" src="${esc(s.logo)}" alt="" aria-hidden="true" width="${size}" height="${size}" style="width:${size}px;height:${size}px;background:none;border-radius:${Math.max(3, Math.round(size * .1))}px">`;
    const url = s.home ? `https://icons.duckduckgo.com/ip3/${host(s.home)}.ico` : "";
    return `<span class="lg" style="width:${size}px;height:${size}px;font-size:${Math.max(8, Math.round(size * .4))}px" aria-hidden="true">${esc(initials(s.name))}${url ? `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</span>`;
  }
  const outletLink = id => `<a href="#/izvor/${encodeURIComponent(id)}" style="text-decoration:underline;text-underline-offset:2px">${esc(src(id).name)}</a>`;
  const out = (url, sid) => `href="${esc(safe(url))}" target="_blank" rel="noopener" data-s="${esc(sid)}"`;
  const topicName = slug => ((D.topics || []).find(t => t.slug === slug) || {name: slug}).name;
  const sumSplit = list => { const split = {}; list.forEach(s => Object.entries(s.split).forEach(([k, n]) => split[k] = (split[k] || 0) + n)); return {split, sources: Object.values(split).reduce((a, b) => a + b, 0)}; };
  const share = (o, k) => o.sources ? Math.round(100 * (o.split[k] || 0) / o.sources) : 0;

  // "Moja medijska ishrana": kept only in this browser (localStorage), never sent anywhere
  const DIET = "obe-strane-ishrana";
  const diet = () => { try { const d = JSON.parse(localStorage.getItem(DIET) || "{}"); return {reads: d.reads || [], views: d.views || []}; } catch (_) { return {reads: [], views: []}; } };
  const saveDiet = d => { try { const cut = Date.now() - 60 * 864e5;
    localStorage.setItem(DIET, JSON.stringify({reads: d.reads.filter(r => r.t > cut).slice(-600), views: d.views.filter(r => r.t > cut).slice(-600)})); } catch (_) {} };
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[data-s]");
    if (!a) return;
    const d = diet(), before = dietShare(d.reads); d.reads.push({s: a.dataset.s, c: camp(a.dataset.s), t: Date.now()}); saveDiet(d);
    dietToast(before, dietShare(d.reads));
  });
  // ---- coverage-bar popover: which outlets make up this part of the bar
  const pop = document.createElement("div"); pop.className = "barpop"; pop.hidden = true; pop.setAttribute("role", "dialog"); document.body.appendChild(pop);
  let popFor = null, popT = 0;
  const popHide = () => { pop.hidden = true; if (popFor) popFor.classList.remove("on"); popFor = null; };
  const popShow = seg => {
    clearTimeout(popT); if (popFor === seg && !pop.hidden) return;
    const b = seg.closest(".bar-x"), st = D.stories.find(x => x.id === b.dataset.id), k = seg.dataset.k; if (!st) return;
    const seen = new Set(), arts = st.items.filter(i => camp(i.source) === k && !seen.has(i.source) && seen.add(i.source));
    pop.innerHTML = `<div class="bp-h" style="color:${VAR[k]}">${LAB[k]} · ${arts.length} ${form(arts.length, "medij")}</div>
      ${arts.map(i => `<a class="bp-i" ${out(i.url, i.source)}>${logo(i.source, 18)}<span><b>${esc(src(i.source).name)}</b><span class="bp-t">${esc(i.title)}</span></span></a>`).join("")}`;
    if (popFor) popFor.classList.remove("on"); popFor = seg; seg.classList.add("on");
    pop.hidden = false;
    const r = seg.getBoundingClientRect(), w = Math.min(340, innerWidth - 24);
    pop.style.width = w + "px";
    pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + scrollX + "px";
    pop.style.top = r.bottom + scrollY + 10 + "px";
  };
  const popLater = () => { clearTimeout(popT); popT = setTimeout(popHide, 220); };
  document.addEventListener("pointerover", e => { const seg = e.target.closest && e.target.closest(".bar-x i"); if (seg && e.pointerType === "mouse") popShow(seg); else if (e.target.closest && e.target.closest(".barpop")) clearTimeout(popT); });
  document.addEventListener("pointerout", e => { if (e.pointerType === "mouse" && e.target.closest && (e.target.closest(".bar-x i") || e.target.closest(".barpop"))) popLater(); });
  document.addEventListener("click", e => { const seg = e.target.closest && e.target.closest(".bar-x i");
    if (seg) { e.preventDefault(); popFor === seg && !pop.hidden ? popHide() : popShow(seg); } else if (!(e.target.closest && e.target.closest(".barpop"))) popHide(); });
  document.addEventListener("focusin", e => { const seg = e.target.closest && e.target.closest(".bar-x i"); if (seg) popShow(seg); else if (!(e.target.closest && e.target.closest(".barpop"))) popHide(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) { const f = popFor; popHide(); f && f.focus(); }
    else if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".bar-x i")) { e.preventDefault(); const a = pop.querySelector("a"); a && a.focus(); } });
  addEventListener("hashchange", popHide);

  // ---- 8. reading an article nudges "Moja medijska ishrana": a small bar shows the new balance
  const dietShare = reads => { const n = reads.length || 1, c = k => reads.filter(r => r.c === k).length;
    return {pg: c("pro_government") / n * 100, cr: c("critical") / n * 100, n: reads.length}; };
  let toastT = 0;
  function dietToast(before, after) {
    let t = document.querySelector(".dtoast");
    if (!t) { t = document.createElement("div"); t.className = "dtoast"; t.setAttribute("role", "status"); document.body.appendChild(t);
      t.addEventListener("mouseenter", () => clearTimeout(toastT)); t.addEventListener("mouseleave", () => { toastT = setTimeout(() => t.classList.remove("in"), 2500); }); }
    const seg = (x, c) => `<i style="width:${x}%;background:${c}"></i>`;
    const mid = x => Math.max(0, 100 - x.pg - x.cr);
    t.innerHTML = `<div class="dt-h">Vaša medijska ishrana <a href="#/moja-ishrana">Pogledaj</a></div>
      <div class="dt-bar">${seg(before.pg, "var(--pg)")}${seg(mid(before), "var(--mix)")}${seg(before.cr, "var(--cr)")}</div>
      <div class="dt-n"><span style="color:var(--pg)"><b>${Math.round(after.pg)}%</b> režimski</span><span>${after.n} ${after.n === 1 ? "članak" : after.n % 10 >= 2 && after.n % 10 <= 4 && (after.n % 100 < 12 || after.n % 100 > 14) ? "članka" : "članaka"}</span><span style="color:var(--cr)"><b>${Math.round(after.cr)}%</b> kritički</span></div>`;
    t.classList.add("in");
    requestAnimationFrame(() => requestAnimationFrame(() => { const is = t.querySelectorAll(".dt-bar i"); [after.pg, mid(after), after.cr].forEach((x, i) => is[i].style.width = x + "%"); }));
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("in"), 6000);
  }
  const balanceObj = () => { const sh = (D.balance && D.balance.shown) || {}; return {split: sh, sources: Object.values(sh).reduce((a, b) => a + b, 0)}; };

  function header(active) {
    return `
    <div class="util"><div class="wrap">
      <span class="date">${esc(day(D.generated))} · ažurirano u ${clock(D.generated)}<span class="u-stats"> · ${D.articles.toLocaleString("sr-RS")} članaka · ${D.sources.filter(x => !x.paused).length} medija · ${D.stories.length} priča</span></span>
      <form id="search" role="search"><label class="vh" for="q">Pretraga</label><input id="q" type="search" placeholder="Pretraži vesti…"><button class="btn dark" type="submit">Traži</button></form>
    </div></div>
    <header class="wrap mast"><a href="#/" class="mast-logo">${brand(56)}</a><button class="s-tog" type="button" aria-label="Pretraga" aria-expanded="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button>
      <div class="tag">Ista vest, dve strane. Uporedite kako je prenose režimski i kritički mediji – i šta jedna strana prećuti.</div></header>
    <div class="wrap">
      <nav class="sections" aria-label="Rubrike">
        <a href="#/" class="${active === "home" ? "on" : ""}">Naslovna</a>
        <a href="#/slepe-tacke" class="amber ${active === "bs" ? "on" : ""}">${EYE}Slepe tačke</a>
        <span class="sep" aria-hidden="true"></span>
        ${secsWithNews().map(n => `<a href="#/rubrika/${encodeURIComponent(n)}" class="${active === n ? "on" : ""}">${n}</a>`).join("")}
        <span class="sep" aria-hidden="true"></span>
        <a href="#/brifing" class="${active === "brief" ? "on" : ""}">Brifing</a>
        <a href="#/izvori" class="${active === "src" ? "on" : ""}">Izvori</a>
      </nav>
      ${active === "home" || active === "topic" ? focusBar() : ""}
    </div>
    ${ticker()}`;
  }
  function ticker() {
    const latest = D.stories.filter(st => st.sources >= 3).map(st => { const it = st.items.slice().sort((a, b) => b.published.localeCompare(a.published))[0]; return {st, it}; })
      .sort((a, b) => b.it.published.localeCompare(a.it.published)).slice(0, 28);
    if (latest.length < 4) return "";
    const ago = t => { const m = Math.max(1, Math.round((Date.now() - new Date(t)) / 6e4)); return m < 60 ? `${m} min` : `${Math.round(m / 60)} h`; };
    const items = latest.map(({st, it}) => `<a class="tk-i" href="${link(st)}"><span class="tk-dot" style="background:${VAR[camp(it.source)] || "var(--mix)"}"></span>${st.section ? `<b>${esc(st.section)}</b>` : ""}<span>${esc(lat(it.title))}</span><time>${esc(src(it.source).name)} · ${ago(it.published)}</time></a>`).join("");
    return `<div class="tk" aria-label="Najnovije vesti"><div class="wrap tk-in"><span class="tk-lab"><span class="tk-live" aria-hidden="true"></span>Najnovije</span>
      <div class="tk-win"><div class="tk-track" style="animation-duration:${latest.length * 7}s">${items}<span aria-hidden="true" class="tk-dup">${items}</span></div></div></div></div>`;
  }
  function focusBar() {
    const t = (D.topics || []).filter(x => x.stories >= 2).sort((a, b) => b.stories - a.stories).slice(0, 8);
    if (!t.length) return `<div class="focus"><b>U fokusu</b>${D.stories.slice(0, 6).map(s => `<a href="${link(s)}">${esc(s.headline.split(/[:,–]/)[0].split(" ").slice(0, 5).join(" "))}</a>`).join("")}</div>`;
    const cur = location.hash.startsWith("#/tema/") ? decodeURIComponent(location.hash.slice(7)) : "";
    return `<div class="focus"><b>U fokusu</b>${t.map(x => `<a href="#/tema/${x.slug}" style="${x.slug === cur ? "font-weight:700;color:var(--ink)" : ""}">${esc(x.name)}</a>`).join("")}</div>`;
  }
  function compactHeader(sec) {
    return `<header class="compact-head"><div class="wrap">
      <a class="logo" href="#/">${brand(34)}</a>
      <nav aria-label="Rubrike"><a href="#/slepe-tacke" style="color:var(--ink);background:var(--sig);padding:3px 9px;border-radius:3px">${EYE}Slepe tačke</a>${secsWithNews().slice(0, 5).map(n => `<a href="#/rubrika/${encodeURIComponent(n)}" style="${n === sec ? "border-bottom:2px solid var(--ink)" : ""}">${n}</a>`).join("")}<a href="#/brifing">Brifing</a></nav>
      <a class="btn dark" href="#/">Naslovna</a></div></header>${ticker()}`;
  }
  const footer = () => `<footer><div class="wrap top">
      <div style="flex:1 1 260px;min-width:0"><div class="logo" style="color:#fff">${brand(38)}</div>
      <p style="margin:14px 0 0;font:400 14px/1.55 var(--sans);color:#b8b8bd">Prikazujemo kako mediji u Srbiji izveštavaju o istim događajima. Ne pišemo vesti; povezujemo ih sa izvorima.</p></div>
      <div class="links"><b>Rubrike</b>${secsWithNews().slice(0, 5).map(n => `<a href="#/rubrika/${encodeURIComponent(n)}">${n}</a>`).join("")}</div>
      <div class="links"><b>O projektu</b><a href="#/o-nama">O nama</a><a href="metodologija/">Metodologija</a><a href="metodologija/#merenje">Merenje posećenosti</a><a href="#/izvori">Izvori i vlasništvo</a><a href="#/brifing">Jutarnji brifing</a><a href="#/proveri">Proveri link</a><a href="#/ton">Kako se menja ton</a><a href="#/reci">Reči koje biraju</a><a href="#/citati">Citati</a><a href="#/podkasti">Podkasti i emisije</a><a href="#/sacuvano">Sačuvane vesti</a><a href="#/najrazlicitije">Ista vest, različiti naslovi</a><a href="#/za-medije">Za medije</a><a href="#/moja-ishrana">Moja medijska ishrana</a><a href="https://github.com/SrdjanKn/obe-strane" target="_blank" rel="noopener">Kod projekta</a></div>
    </div><div class="wrap bottom">${balanceLine()} · ${D.sources.filter(s => !s.paused).length} medija · poslednjih ${D.hours} h · ${D.articles} članaka. Oznake medija su početne procene zasnovane na javnim analizama (CRTA, BIRN, Raskrikavanje). Naslovi i linkovi pripadaju izvornim medijima.</div></footer>`;
  function balanceLine() {
    const b = balanceObj();
    if (!b.sources) return "Prototip";
    const o = 100 - share(b, "pro_government") - share(b, "critical");
    return `<a href="#/o-nama/balans">Naš balans</a>: prikazali smo ${share(b, "pro_government")}% režimskih, ${share(b, "critical")}% kritičkih i ${o}% ostalih objava`;
  }
  const newsletter = () => `<section class="news" aria-label="Bilten">
      <div style="flex:1 1 360px;min-width:0">${kick(EYE + "Jutarnji brifing · e-poštom uskoro", "amber")}
      <h2>Obe strane u 5 minuta</h2>
      <p style="margin:0;color:var(--ink2)">Najvažnije vesti dana i kako ih je koja strana uokvirila, svako jutro u 7. <a href="#/brifing" style="text-decoration:underline">Pročitajte današnji brifing</a>.</p></div>
      <form id="nl"><label>Vaša e-adresa<input type="email" required placeholder="ime@primer.rs"></label><button type="submit">Prijavi se</button></form>
    </section>`;

  // a blindspot shows the silence itself: one side full, the other an empty dashed outline (pro-government always left)
  const silence = s => {
    const quiet = s.blindspot, loud = quiet === "pro_government" ? "critical" : "pro_government", n = s.split[loud] || 0;
    const half = k => k === quiet ? `<span class="gone" style="border-color:${VAR[k]}"></span>` : `<span style="background:${VAR[k]}"></span>`;
    const lab = k => k === quiet ? `<span style="color:${VAR[k]}">0 ${k === "pro_government" ? "režimskih" : "kritičkih"}</span>` : `<span style="color:${VAR[k]}">${n} ${form(n, k)}</span>`;
    return `<div class="sil">${half("pro_government")}${half("critical")}</div><div class="sil-lab">${lab("pro_government")}${lab("critical")}</div>`;
  };
  const railItem = s => `<a class="rail-item" href="${link(s)}"><div class="hl">${esc(s.headline)}</div>${silence(s)}</a>`;
  const stripCard = s => `<a href="${link(s)}">${photo(s)}<div style="margin-top:12px">${secKick(s)}<div class="hl">${esc(s.headline)}</div>${bar(s)}${cov(s)}</div></a>`;
  const listItem = (s, showSec) => `<a class="li" href="${link(s)}">${showSec ? secKick(s) : ""}<div class="hl">${esc(s.headline)}</div>${bar(s, 4)}<div class="meta" style="margin-top:6px">${s.sources} medija · prvi: ${esc(src(s.broke).name)} u ${clock(s.first)}</div></a>`;
  function quotes(s) {
    const p = firstOf(s, "pro_government"), c = firstOf(s, "critical");
    const q = (i, cls) => i ? `<a class="${cls}" href="${esc(safe(i.url))}" target="_blank" rel="noopener" data-s="${esc(i.source)}"><div class="quote">„${esc(i.title)}“</div><div class="meta" style="margin-top:3px">${esc(src(i.source).name)} · ${clock(i.published)}</div></a>` : "";
    if (!p && !c) return "";
    return `<div class="meta" style="font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:10px">Kako su naslovili</div>
      <div class="quotes2">${q(p, "q-pg")}${q(c, "q-cr")}</div>`;
  }

  // home layout blocks, in the live site's style
  const lvMeta = s => `<div class="meta">${s.sources} medija · prvi: ${esc(src(s.broke).name)} u ${clock(s.first)}</div>`;
  const lvDek = (s, n = 120) => s.summary ? `<p class="lv-dek">${esc(tidy(s.summary, n))}</p>` : "";
  const lvCard = (s, ratio = "3/2") => `<a class="lv-card" href="${link(s)}">${photo(s, ratio)}${secKick(s)}<div class="hl">${esc(s.headline)}</div>${lvDek(s)}${bar(s, 4)}<div style="margin-top:6px">${lvMeta(s)}</div></a>`;
  const lvRow = s => `<a class="lv-row${s.image ? "" : " no-pic"}" href="${link(s)}"><div>${secKick(s)}<div class="hl">${esc(s.headline)}</div>${bar(s, 4)}<div style="margin-top:6px">${lvMeta(s)}</div></div>${s.image ? photo(s, "1/1") : ""}</a>`;
  const lvBs = s => `<a class="rail-item${s.image ? "" : " no-pic"}" href="${link(s)}"><div><div class="hl">${esc(s.headline)}</div>${silence(s)}</div>${s.image ? photo(s, "1/1") : ""}</a>`;
  const lvOver = (s, ratio, tag) => `<a class="lv-over" href="${link(s)}">${photo(s, ratio, true)}<div class="lv-over-txt">${secKick(s, s.sources + " medija")}<${tag}${tag === "h2" && s.headline.length > 70 ? ` class="long${s.headline.length > 110 ? " xlong" : ""}"` : ""}>${esc(s.headline)}</${tag}><div class="lv-over-meta">Prvi je objavio ${esc(src(s.broke).name)} u ${clock(s.first)}</div></div></a>`;
  const lvHead = (title, href, label) => `<div class="sec-head"><h2>${title}</h2>${href ? `<a href="${href}">${label} →</a>` : ""}</div>`;

  const INTRO_KEY = "os_intro_seen";
  const introSeen = () => { try { return localStorage.getItem(INTRO_KEY) === "1"; } catch (_) { return false; } };
  const introStrip = () => introSeen() ? "" : `<section class="intro" aria-label="Šta je Obe strane"><div class="wrap intro-in">
    <div class="intro-h">Prvi put ovde? <b>Obe strane</b> povezuje vesti o istom događaju iz ${D.sources.filter(x => !x.paused).length} medija.</div>
    <ul class="intro-l"><li><b>Iste vesti, uporedo.</b> Naslovi režimskih i kritičkih medija jedni pored drugih.</li>
      <li><b>Slepe tačke.</b> Šta je objavila samo jedna strana, a druga prećutala.</li>
      <li><b>Bez naših tekstova.</b> Sve vodi na izvorne članke.</li></ul>
    <div class="intro-a"><button class="btn dark" type="button" id="intro-ok">Razumem</button><a href="metodologija/" class="intro-more">Kako radimo</a></div></div></section>`;
  function home() {
    const S = D.stories;
    if (!S.length) return `${header("home")}<div class="wrap empty">Još nema dovoljno podataka. Sledeće prikupljanje je za najviše 15 minuta.</div>${footer()}`;
    const used = new Set();
    const take = (list, n) => list.filter(s => !used.has(s.id)).slice(0, n).map(s => (used.add(s.id), s));
    // stories with a sharp photo go first where a photo is shown big
    const pick = (n, win) => { const pool = S.filter(s => !used.has(s.id)).slice(0, win);
      const sel = [...pool.filter(s => s.image), ...pool.filter(s => !s.image)].slice(0, n); sel.forEach(s => used.add(s.id)); return sel; };
    const [top] = pick(1, 3);
    // blindspots are placed next, so a story shows up in exactly one place on the page
    const bsAll = S.filter(s => s.blindspot), bs = bsAll.filter(s => !used.has(s.id));
    const bsTop = bs.slice().sort((a, b) => b.sources - a.sources).slice(0, 3);
    const bsDay = bsTop.find(s => s.image) || bsTop[0];
    if (bsDay) used.add(bsDay.id);
    const quietPg = bs.filter(s => s.blindspot === "pro_government" && s !== bsDay), quietCr = bs.filter(s => s.blindspot === "critical" && s !== bsDay);
    const nPg = quietCr.length ? 3 : 5, nCr = quietPg.length ? 3 : 5;
    quietPg.slice(0, nPg).concat(quietCr.slice(0, nCr)).forEach(s => used.add(s.id));
    const sideList = pick(2, 6);
    const under = take(S, 2);
    const fill = take(S.filter(s => !s.blindspot), 8);
    const group = (list, n, k, title) => list.length ? `<div class="bs-group"><h3 style="color:${VAR[k]};border-color:${VAR[k]}">${title}</h3>${list.slice(0, n).map(lvBs).join("")}</div>` : "";
    const strip = take(S, 4);
    const spin = homeSpin(used);
    const counts = SECTION_ORDER.map(n => [n, S.filter(s => s.section === n && !used.has(s.id)).length]).filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]);
    const secLink = n => `#/rubrika/${encodeURIComponent(n)}`;
    const secP = n => { const sel = S.filter(s => s.section === n && !used.has(s.id));
      const lead = [...sel.filter(s => s.image), ...sel][0]; used.add(lead.id); const rest = take(sel, 2);
      return `<section aria-label="${esc(n)}">${lvHead(esc(n), secLink(n), "Sve vesti")}<div class="lv-sec-p">${lvOver(lead, "4/5", "h3")}<div>${rest.map(x => lvCard(x)).join("")}</div></div></section>`; };
    const secK = n => { const sel = S.filter(s => s.section === n && !used.has(s.id));
      const lead = [...sel.filter(s => s.image), ...sel][0]; used.add(lead.id); const [w, ...trio] = take(sel, 4);
      return `<section aria-label="${esc(n)}">${lvHead(esc(n), secLink(n), "Sve vesti")}<div class="lv-sec-k">${lvOver(lead, "3/4", "h3")}
        ${w ? `<a class="lv-wide" href="${link(w)}">${photo(w, "16/9")}<div>${secKick(w)}<div class="hl">${esc(w.headline)}</div>${lvDek(w)}${bar(w, 4)}<div style="margin-top:6px">${lvMeta(w)}</div></div></a>` : ""}
        ${trio.length ? `<div class="lv-trio">${trio.map(x => lvCard(x, "16/10")).join("")}</div>` : ""}</div></section>`; };
    const sec1 = counts[0] ? secP(counts[0][0]) : "";
    const n2 = counts.slice(1).find(([n]) => S.filter(s => s.section === n && !used.has(s.id)).length >= 2);
    const sec2 = n2 ? secK(n2[0]) : "";
    const quotesBox = homeQuotes(used);
    const more = take(S, 18);
    return `${header("home")}
    ${introStrip()}
    <main class="wrap lv">
      <h1 class="vh">Obe strane: ista vest, dve strane</h1>
      <section class="lv-top" aria-label="Glavne vesti">
        <div class="lv-hero">
          ${lvOver(top, "5/4", "h2")}
          <div class="lv-under">
            ${top.image && top.image_source ? `<div class="meta" style="margin-bottom:8px">Fotografija: ${esc(src(top.image_source).name)}</div>` : ""}
            ${top.summary ? `<p class="dek">${esc(tidy(top.summary, 220))}</p>` : ""}
            ${bar(top, 8)}${cov(top)}
            ${quotes(top)}
          </div>
          ${fill.length ? `<div class="lv-fill" aria-label="Još vesti">${fill.map(lvRow).join("")}</div>` : ""}
        </div>
        <div class="lv-left">${sideList.map(x => lvCard(x)).join("")}${under.map(x => listItem(x, true)).join("")}</div>
        <aside class="lv-right rail" aria-label="Slepe tačke">
          <div class="bs-panel">
            <a href="#/slepe-tacke" class="bs-panel-head">${EYE}Slepe tačke</a>
            <p class="bs-panel-dek">Vesti koje je objavila samo jedna strana. Druga strana ih je prećutala.</p>
            ${group(quietPg, nPg, "pro_government", "Režimski nisu objavili")}${group(quietCr, nCr, "critical", "Kritički nisu objavili")}
            ${bsAll.length ? `<a class="all" href="#/slepe-tacke">Sve slepe tačke (${bsAll.length}) →</a>` : `<p class="meta" style="margin-top:12px">Trenutno nema slepih tačaka.</p>`}
          </div>
          <div class="chk"><h3>Proveri link</h3><p>Nalepite link članka i vidite čiji je medij i kako je istu vest prenela druga strana.</p>${chkForm()}</div>
          ${D.briefing ? `<a href="#/brifing" class="rail-item" style="margin-top:22px;border-top:3px solid var(--ink)"><div class="lab">Jutarnji brifing</div><div class="hl">Obe strane u 5 minuta</div><div class="meta">${(D.briefing.stories || []).length} vesti · izdanje u ${clock(D.briefing.made)}</div></a>` : ""}
          ${D.tone && D.tone.days.filter(d => (d.c.pro_government || [0])[0] >= 150).length > 1 ? `<a href="#/ton" class="rail-item" style="margin-top:22px;border-top:3px solid var(--ink)"><div class="lab">Posle izbora</div><div class="hl">Kako se menja ton</div><div class="meta">Reči u naslovima obe strane, dan po dan</div></a>` : ""}
        </aside>
      </section>
      <div class="lv-pair">
        ${strip.length ? `<section class="${sec1 ? "c4" : "c12"}" aria-label="Najvažnije danas">${lvHead("Najvažnije danas")}<div class="lv-list">${strip.map(lvRow).join("")}</div></section>` : ""}
        ${sec1 ? `<div class="${strip.length ? "c8" : "c12"}">${sec1}</div>` : ""}
      </div>
    </main>
    ${bsDay ? bsBand(bsDay, used) : ""}
    <div class="wrap">
      ${spin}
      ${sec2}
      ${quotesBox}
      ${homePods()}
      ${more.length ? `<section aria-label="Još vesti"><div class="sec-head"><h2>Još vesti</h2><span class="meta">${S.length} priča sa 2+ medija</span></div><div class="grid3">${more.map(s => listItem(s, true)).join("")}</div></section>` : ""}
      ${newsletter()}
    </div>${footer()}`;
  }

  function homeQuotes(used = new Set()) {
    const all = D.stories.flatMap(storyQuotes).sort((a, b) => (used.has(a.s.id) - used.has(b.s.id)) || b.n - a.n);
    if (all.length < 2) return "";
    const one = k => all.find(x => x.c[k] >= 2 && !x.c[k === "pro_government" ? "critical" : "pro_government"]);
    const pick = [];
    [all[0], one("pro_government"), one("critical"), ...all].forEach(x => { if (x && !pick.includes(x) && !pick.some(p => p.s.id === x.s.id) && pick.length < 4) pick.push(x); });
    if (pick.length % 2 && pick.length > 1) pick.pop();
    return `<section class="home-box" aria-label="Citati"><div class="hb-head"><h2>Citati <span>${all.length}</span></h2><a class="btn" href="#/citati">Svi citati</a></div>
      <div class="hb-quotes">${pick.map(x => qCard(x)).join("")}</div></section>`;
  }
  function homePods() {
    const P = D.podcasts; if (!P || !P.episodes.length) return "";
    const seen = new Set(), pick = [];
    P.episodes.forEach(e => { if (!seen.has(e.show) && pick.length < 4) { seen.add(e.show); pick.push(e); } });
    P.episodes.forEach(e => { if (!pick.includes(e) && pick.length < 4) pick.push(e); });
    const tile = e => { const sh = P.shows.find(x => x.id === e.show) || {};
      return `<a class="ep-tile" href="${esc(safe(e.url))}" target="_blank" rel="noopener">${e.img ? `<img src="${esc(safe(e.img))}" alt="" loading="lazy" onerror="this.remove()">` : ""}
        <div class="ep-tile-in"><div class="ep-tile-top"><span>${esc(sh.name || "")} · ${esc(sh.by || "")}</span><span>${e.date ? epAgo(e.date) : ""}</span></div>
        <div class="ep-tile-t">${esc(e.title)}</div><div class="ep-tile-b"><span class="ep-lab" style="background:${PODCOL(sh.camp)};margin:0">${PODLAB(sh.camp)}</span><span class="ep-tile-play" aria-hidden="true">▶</span></div></div></a>`; };
    return `<section class="home-box" aria-label="Podkasti i emisije"><div class="hb-head"><h2>Podkasti i emisije <span>${P.episodes.length}</span></h2><a class="btn" href="#/podkasti">Sve epizode</a></div>
      <div class="hb-pods">${pick.map(tile).join("")}</div></section>`;
  }
  function bsBand(s, used = new Set()) {
    const silent = s.blindspot, loud = silent === "pro_government" ? "critical" : "pro_government";
    const n = s.split[loud] || 0, others = s.sources - n;
    const sideWord = k => k === "pro_government" ? "režimski" : "kritički";
    const loudItems = s.items.filter(i => camp(i.source) === loud);
    const outlets = [...new Set(loudItems.map(i => i.source))];
    const ai = s.ai && s.ai.ukratko ? s.ai : null;
    const t0 = new Date(s.first).getTime();
    const meanwhile = D.stories.filter(x => x.id !== s.id && !x.blindspot && (x.split[silent] || 0) >= 2 && Math.abs(new Date(x.first).getTime() - t0) < 18 * 36e5)
      .sort((a, b) => (used.has(a.id) - used.has(b.id)) || (b.split[silent] || 0) - (a.split[silent] || 0)).slice(0, 3);
    const bar = (k, v) => `<div class="bd-row"><span class="bd-n" style="color:${VAR[k]}" data-v="${v}">${MOTION && v ? 0 : v}</span><div class="bd-track">${v ? `<div class="bd-fill" style="width:${Math.max(8, v / Math.max(n, 1) * 100)}%;background:${VAR[k]}"></div>` : `<div class="bd-gone" style="border-color:${VAR[k]};color:${VAR[k]}"></div>`}</div><span class="bd-l">${form(v, k)}</span></div>`;
    return `<section class="bsday${MOTION ? " pre" : ""}" aria-label="Slepa tačka dana"><div class="wrap">
      <div class="bd-top">
        <div class="bd-text">
          <a href="#/slepe-tacke" class="bd-kick">${EYE}Slepa tačka dana</a>
          <a href="${link(s)}"><h2 class="bd-h">${esc(s.headline)}</h2></a>
          <p class="bd-dek">Ovu vest ${n === 1 ? "objavio je" : "objavilo je"} ${n} ${form(n, loud)} ${form(n, "medij")}${others ? ` (i još ${others} ${others === 1 ? "drugi" : "drugih"})` : ""}. <b>Nijedan ${sideWord(silent)} medij je nije preneo.</b></p>
          ${ai ? `<p class="bd-ai">${esc(ai.ukratko)} <span class="bd-note">AI sažetak</span></p>` : ""}
          <a class="btn dark" href="${link(s)}">Cela priča</a>
        </div>
        <div class="bd-card bd-meter">
          <div class="bd-sub">Ko je objavio</div>
          ${bar(loud, n)}${bar(silent, 0)}
          <div class="bd-logos">${outlets.slice(0, 14).map(id => `<span class="bd-logo">${logo(id, 16)}${esc(src(id).name)}</span>`).join("")}${outlets.length > 14 ? `<span class="bd-logo">+${outlets.length - 14}</span>` : ""}</div>
        </div>
      </div>
      <div class="bd-cards">
        <div class="bd-card"><div class="bd-sub" style="color:${VAR[loud]}">Kako su naslovili ${sideWord(loud)}</div>
          ${loudItems.slice(0, 3).map(i => `<a class="bd-item" ${out(i.url, i.source)}><div class="meta">${logo(i.source, 15)}${esc(src(i.source).name)} · ${clock(i.published)}</div><div class="t">${esc(i.title)}</div></a>`).join("")}
          ${loudItems.length > 3 ? `<a class="bd-more" href="${link(s)}">Svi naslovi (${loudItems.length})</a>` : ""}</div>
        <div class="bd-card"><div class="bd-sub" style="color:${VAR[silent]}">Šta su u isto vreme objavljivali ${sideWord(silent)}</div>
          ${meanwhile.length ? meanwhile.map(x => `<a class="bd-item" href="${link(x)}"><div class="meta">${x.split[silent]} ${form(x.split[silent], silent)} ${form(x.split[silent], "medij")} · ${esc(x.section)}</div><div class="t">${esc(x.headline)}</div></a>`).join("") : `<p class="meta" style="margin:8px 0 0">Nema drugih priča te strane u isto vreme.</p>`}</div>
      </div></div></section>`;
  }

  function aiBox(s) {
    const a = s.ai;
    if (!a || !a.ukratko) return "";
    const side = (k, text) => text && s.split[k] ? `<div class="ai-side" style="border-left-color:${VAR[k]}"><h3 style="color:${VAR[k]}">Kako su uokvirili ${k === "pro_government" ? "režimski" : "kritički"}</h3><p>${esc(text)}</p></div>` : "";
    return `<section id="ukratko" class="col" style="margin-top:36px" aria-label="Ukratko"><div class="ai">
      <div class="kicker" style="color:var(--ink2)">Ukratko</div><p class="ai-sum">${esc(a.ukratko)}</p>
      ${a.provladini || a.kriticki ? `<div class="ai-two">${side("pro_government", a.provladini)}${side("critical", a.kriticki)}</div>` : ""}
      ${a.razlika ? `<p class="ai-diff"><b class="sans" style="font-size:14px">Glavna razlika:</b> ${esc(a.razlika)}</p>` : ""}
      <p class="ai-note">Ovaj sažetak je automatski napisao AI model na osnovu naslova i uvoda članaka, bez sopstvene ocene. Može da sadrži greške: proverite u izvornim člancima ispod. <a href="metodologija/">Kako radimo</a></p>
    </div></section>`;
  }
  // ---- Licem u lice: one representative headline per side, what each side stresses, and the words that split them
  function h2h(s, its, sw) {
    const pg = its.filter(i => i.camp === "pro_government"), cr = its.filter(i => i.camp === "critical");
    if (!pg.length && !cr.length) return "";
    const rep = list => { if (list.length < 3) return list[0]; const T = list.map(i => tokSet(i.title));
      let best = 0, bs = -1; T.forEach((a, i) => { const sc = T.reduce((t, b, j) => t + (i === j ? 0 : jac(a, b)), 0); if (sc > bs) { bs = sc; best = i; } }); return list[best]; };
    const a = s.ai || {}, n = s.sources;
    const card = (k, list, emph) => { const col = VAR[k], word = k === "pro_government" ? "režimski" : "kritički";
      if (!list.length) return `<div class="hh-side hh-empty" style="--c:${col}"><div class="hh-top"><span class="hh-lab">${LAB[k]}</span><span class="hh-n"><b>0</b> od ${n} medija</span></div>
        <p class="hh-silent">${word[0].toUpperCase() + word.slice(1)} mediji ovu vest nisu objavili.</p><p class="hh-sub">Ako je neki ${word} medij objavi, pojaviće se ovde.</p></div>`;
      const r = rep(list);
      return `<div class="hh-side" style="--c:${col}"><div class="hh-top"><span class="hh-lab">${LAB[k]}</span><span class="hh-n"><b>${list.length}</b> od ${n} medija</span></div>
        <a class="hh-hl" ${out(r.url, r.source)}>„${esc(r.title)}“</a>
        <div class="hh-src">${logo(r.source, 16)}${esc(src(r.source).name)} · ${clock(r.published)}</div>
        ${emph ? `<p class="hh-emph"><b>Naglašavaju:</b> ${esc(emph.replace(/^(Režimski|Kritički) mediji\s+(ističu|naglašavaju)?\s*/i, ""))}</p>` : ""}
        ${list.length > 1 ? `<button type="button" class="hh-more" data-go="poredjenje">Svi ${word} naslovi (${list.length})</button>` : ""}</div>`; };
    // words that one side uses and the other mostly doesn't, counted in both sides' headlines
    let words = "";
    if (sw && pg.length && cr.length) {
      const has = (list, st) => list.filter(i => wordsOf(i.title).has(st)).length;
      const rows = [...sw.pg.slice(0, 2), ...sw.cr.slice(0, 2)].slice(0, 3).map(x => ({word: x.word, st: x.st, p: has(pg, x.st), c: has(cr, x.st)}));
      const row = r => `<button type="button" class="hh-w" data-w="${r.st}"><span class="hh-word">„${esc(r.word)}“</span>
        <span class="hh-wr"><span>Režimski</span><span class="hh-track"><i style="width:${r.p / pg.length * 100}%;background:var(--pg)"></i></span><b style="color:var(--pg)">${r.p} od ${pg.length}</b></span>
        <span class="hh-wr"><span>Kritički</span><span class="hh-track"><i style="width:${r.c / cr.length * 100}%;background:var(--cr)"></i></span><b style="color:var(--cr)">${r.c} od ${cr.length}</b></span></button>`;
      if (rows.length) words = `<div class="hh-words"><div class="hh-wh">Ista vest, druge reči</div>${rows.map(row).join("")}<p class="meta" style="margin:2px 0 0">Kliknite na reč da je vidite u svim naslovima.</p></div>`;
    }
    const pgFirst = parseInt(s.id.slice(-2), 16) % 2 === 0;   // sides swap from story to story, so neither is always first
    const sides = pgFirst ? card("pro_government", pg, a.provladini) + card("critical", cr, a.kriticki) : card("critical", cr, a.kriticki) + card("pro_government", pg, a.provladini);
    return `<section id="licem" class="hh" aria-label="Licem u lice"><div class="wide">
      <h2 class="h2">Licem u lice</h2>
      ${a.razlika ? `<p class="hh-diff"><b>Glavna razlika:</b> ${esc(a.razlika)}</p>` : `<p class="hh-diff">Najtipičniji naslov svake strane. Strane menjaju mesta od priče do priče.</p>`}
      <div class="hh-grid">${sides}</div>
      ${words}
      ${a.provladini || a.kriticki || a.razlika ? `<p class="ai-note">Rečenice „Naglašavaju“ i „Glavna razlika“ automatski piše AI model na osnovu naslova i uvoda članaka. Može da pogreši: proverite u naslovima ispod. <a href="metodologija/">Kako radimo</a></p>` : ""}
    </div></section>`;
  }
  function story(id) {
    const s = D.stories.find(x => x.id === id);
    if (!s) return `${compactHeader()}<div class="wrap empty">Ova vest više nije u izboru poslednjih ${D.hours} sati. <a href="#/" style="text-decoration:underline">Nazad na naslovnu</a></div>${footer()}`;
    const its = s.items.map(i => ({...i, camp: camp(i.source)}));
    const pg = its.filter(i => i.camp === "pro_government"), cr = its.filter(i => i.camp === "critical");
    const sw = storyWords(s), stems = new Set(sw ? [...sw.pg, ...sw.cr].map(x => x.st) : []);
    const wrapW = t => stems.size ? esc(t).replace(/[\p{L}\d]+/gu, w => { const st = stemOf(toLat(w)); return stems.has(st) ? `<span class="wq" data-w="${st}">${w}</span>` : w; }) : esc(t);
    const side = (list, k, title) => `<div class="side" style="border-top-color:${VAR[k]}"><h3 style="color:${VAR[k]}">${title} · ${list.length}</h3>
      ${list.length ? list.map(i => `<a href="${esc(safe(i.url))}" target="_blank" rel="noopener" data-s="${esc(i.source)}"><div class="t">${wrapW(i.title)}</div><div class="meta" style="margin-top:4px">${logo(i.source, 16)}${esc(src(i.source).name)} · ${clock(i.published)}</div></a>`).join("")
        : `<div class="none">Nijedan ${k === "critical" ? "kritički" : "režimski"} medij nije objavio ovu vest.</div>`}</div>`;
    const p = s.split.pro_government || 0, c = s.split.critical || 0;
    const rest = ["public", "mixed", "international"].filter(k => s.split[k]).map(k => `${s.split[k]} ${form(s.split[k], k)}`).join(" i ");
    const lead = p && c ? (Math.abs(p - c) <= 1 ? "Vest je ravnomerno pokrivena" : p > c ? "Vest više prate režimski mediji" : "Vest više prate kritički mediji") : "Vest prati samo jedna strana";
    const sentence = `${lead}: <b>${p}</b> ${form(p, "pro_government")} i <b>${c}</b> ${form(c, "critical")} ${form(c || p, "medij")}${rest ? `, uz ${rest}` : ""}.`;
    const more = D.stories.filter(x => x.section === s.section && x.id !== s.id).slice(0, 3);
    return `${compactHeader(s.section)}
    <div class="subnav"><div class="wrap"><b style="color:var(--ink)">${esc(s.section)} ›</b>
<button data-go="licem">Licem u lice</button><button data-go="poredjenje">Kako su naslovili</button><button data-go="hronologija">Hronologija</button><button data-go="pokrivenost">Pokrivenost</button><a href="#/izvori">Izvori</a></div></div>
    <article class="story">
      ${s.image ? `<figure class="wide story-fig">${photo(s, "16/9", true)}${s.image_source ? `<figcaption class="meta">Fotografija: ${esc(src(s.image_source).name)}</figcaption>` : ""}</figure>` : ""}
      <div class="col" style="padding-top:${s.image ? 22 : 40}px">
        ${kick(esc(s.section) + (s.blindspot ? " · " + EYE + "Slepa tačka" : ""), s.blindspot ? "amber" : "")}
        <h1 class="hl">${esc(s.headline)}</h1>
        ${s.summary ? `<p class="dek" style="color:var(--ink2);margin:0 0 22px">${esc(tidy(s.summary))}</p>` : ""}
        ${(s.topics || []).length ? `<div class="chips" style="margin:0 0 16px">${s.topics.map(t => `<a class="chip" href="#/tema/${t}">${esc(topicName(t))}</a>`).join("")}</div>` : ""}
        <div class="byline"><div class="meta"><b style="color:var(--ink)">Priču prati ${s.sources} medija</b> · prvi objavio ${esc(src(s.broke).name)} u ${clock(s.first)} · poslednji članak u ${clock(its[its.length - 1].published)}</div>
          ${shareRow(s)}</div>
      </div>
      <section id="pokrivenost" class="col" style="margin-top:30px" aria-label="Pokrivenost"><div class="covbox">
        <div><div class="kicker" style="color:var(--ink2)">Ko je objavio</div><div class="sent">${sentence}</div>${bar(s, 14)}${cov(s)}</div>
        <div>${ORDER.map(k => `<div class="row"><span>${dot(k)}${LAB[k]}</span><b>${s.split[k] || 0}</b></div>`).join("")}</div>
      </div>
      ${profileBox(s)}
      ${s.blindspot ? `<div class="bs-note">${EYE}<b>Slepa tačka.</b> ${bsLabel(s.blindspot)} mediji nisu objavili ovu vest, iako su u to vreme objavljivali druge vesti.</div>` : ""}</section>
      ${h2h(s, its, sw)}
      <section id="poredjenje" class="wide" style="margin-top:44px" aria-label="Kako su naslovili">
        <h2 class="h2">Kako su naslovili</h2>
        <p style="margin:0 0 20px;color:var(--ink2)">Svi naslovi iz oba tabora, po vremenu objave. Naslovi vode na izvorni članak.</p>
        ${(() => { const w = sw; if (!w || (!w.pg.length && !w.cr.length)) return ""; const chips = (arr, k) => arr.map(x => `<button type="button" class="w-chip" data-w="${x.st}" aria-pressed="false" style="border-color:${VAR[k]};color:${VAR[k]};--c:${VAR[k]}" title="U ${x.n} od ${x.of} ${k === "pro_government" ? "režimskih" : "kritičkih"} naslova">${esc(x.word)} <small>${x.n}/${x.of}</small></button>`).join("") || `<span class="meta">nema izdvojenih reči</span>`;
          return `<div class="w-story-box"><a href="#/reci" class="w-title">Reči koje biraju</a><div><span class="w-lab">Režimski</span>${chips(w.pg, "pro_government")}</div><div><span class="w-lab">Kritički</span>${chips(w.cr, "critical")}</div><p class="meta w-tip">Pređite preko reči ili je dodirnite da vidite gde se javlja u naslovima.</p></div>`; })()}
        <div class="sides">${side(pg, "pro_government", "Režimski mediji")}${side(cr, "critical", "Kritički mediji")}</div>
        ${(() => { const qs = storyQuotes(s); return qs.length ? `<h3 class="h3" style="margin:32px 0 12px">Citati u ovoj priči</h3><div class="q-grid">${qs.slice(0, 6).map(x => qCard(x, false)).join("")}</div>` : ""; })()}
        ${(() => { const eps = ((D.podcasts || {}).episodes || []).filter(e => (e.stories || []).includes(s.id)); return eps.length ? `<h3 class="h3" style="margin:32px 0 12px">Razgovori o ovoj temi</h3><div class="ep-grid">${eps.slice(0, 4).map(e => epCard(e, true)).join("")}</div>` : ""; })()}
      </section>
      <section id="hronologija" class="col" style="margin-top:48px" aria-label="Hronologija">
        <h2 class="h2">Hronologija</h2>
        <p style="margin:0 0 22px;color:var(--ink2)">Kako se vest širila kroz medije.</p>
        ${spread(s, its)}
        <ol class="tl">${its.map(i => `<li><div class="when">${clock(i.published)} <span>· ${logo(i.source, 15)}${outletLink(i.source)} · ${dot(i.camp)}${LAB[i.camp]}</span></div><a href="${esc(safe(i.url))}" target="_blank" rel="noopener" data-s="${esc(i.source)}">${esc(i.title)}</a></li>`).join("")}</ol>
      </section>
    </article>
    <div class="col">${newsletter()}</div>
    ${more.length ? `<div class="wrap"><div class="sec-head"><h2>Još iz rubrike ${esc(s.section)}</h2><a href="#/rubrika/${encodeURIComponent(s.section)}">Sve vesti →</a></div><div class="strip">${more.map(stripCard).join("")}</div></div>` : ""}
    ${footer()}`;
  }

  // the story's spread over time: režimski articles above the line, kritički below, the rest on it
  function spread(s, its) {
    if (its.length < 3) return "";
    const T = its.map(i => new Date(i.published).getTime()), t0 = Math.min(...T), t1 = Math.max(...T), span = Math.max(t1 - t0, 36e5);
    const pos = t => (t - t0) / span * 100, lane = k => k === "pro_government" ? "pg" : k === "critical" ? "cr" : "mid";
    const stack = {};
    const dots = its.map((i, n) => { const p = pos(T[n]), L = lane(i.camp), b = L + Math.round(p / 1.8), k = stack[b] = (stack[b] || 0) + 1;
      return `<span class="sx-dot sx-${L}" style="left:${p.toFixed(2)}%;--k:${Math.min(k - 1, 5)};--d:${Math.round(p * 14)}ms;background:${VAR[i.camp] || "var(--mix)"}" data-n="${n}" data-p="${p.toFixed(2)}"
        data-time="${clock(i.published)}" data-src="${esc(src(i.source).name)}" data-lab="${esc(LAB[i.camp] || "")}" data-col="${VAR[i.camp] || "var(--mix)"}" data-title="${esc(i.title)}" data-url="${esc(safe(i.url))}"></span>`; }).join("");
    const hrs = span / 36e5, maxT = innerWidth < 600 ? 3 : 6, step = [1, 2, 3, 6, 12, 24].find(h => hrs / h <= maxT) || 24;
    const first = new Date(t0); first.setMinutes(0, 0, 0); let tk = first.getTime() + 36e5, ticks = "";
    let grid = "";
    for (; tk < t1; tk += 36e5) { const d = new Date(tk), p = pos(tk); if (d.getHours() % step) continue; grid += `<span class="sx-grid" style="left:${p.toFixed(2)}%"></span>`;
      if (p > 11 && p < 89) ticks += `<span class="sx-tick" style="left:${p.toFixed(2)}%">${d.getHours() === 0 ? d.toLocaleDateString("sr-Latn-RS", {day: "numeric", month: "numeric"}) : clock(d.toISOString())}</span>`; }
    const fst = k => its.find(i => i.camp === k);
    const fp = fst("pro_government"), fc = fst("critical");
    const gap = (a, b) => { const m = Math.round(Math.abs(new Date(b.published) - new Date(a.published)) / 6e4); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`; };
    const firstLine = fp && fc ? (() => { const [a, b] = new Date(fp.published) <= new Date(fc.published) ? [fp, fc] : [fc, fp];
        const wa = a.camp === "pro_government" ? "režimski" : "kritički", wb = b.camp === "pro_government" ? "Režimski" : "Kritički";
        return `Prvi ${wa}: <b>${esc(src(a.source).name)}</b> u ${clock(a.published)}. ${wb} su se javili ${gap(a, b) === "0 min" ? "u isto vreme" : gap(a, b) + " kasnije"} (<b>${esc(src(b.source).name)}</b>).`; })()
      : fp || fc ? `${fc ? "Režimski" : "Kritički"} mediji se nisu javili.` : "";
    return `<div class="sx">${firstLine ? `<p class="sx-first">${firstLine}</p>` : ""}
      <div class="sx-track${MOTION ? " pre" : ""}" tabindex="0" role="slider" aria-label="Članci po vremenu objave. Strelicama birate članak." aria-valuemin="0" aria-valuemax="${its.length - 1}" aria-valuenow="0">
        <span class="sx-lab sx-lab-pg" style="color:var(--pg)">Režimski${fp ? "" : " · 0"}</span><span class="sx-lab sx-lab-cr" style="color:var(--cr)">Kritički${fc ? "" : " · 0"}</span>
        <span class="sx-line"></span><div class="sx-in">${grid}${dots}<span class="sx-cur" aria-hidden="true"></span></div></div>
      <div class="sx-axis"><div class="sx-in"><span class="sx-tick" style="left:0">${clock(new Date(t0).toISOString())}</span>${ticks}<span class="sx-tick" style="left:100%">${clock(new Date(t1).toISOString())}</span></div></div>
      <a class="sx-read" target="_blank" rel="noopener" href="#"></a>
      <p class="meta sx-hint">Prevucite preko linije da vidite naslove po satima.</p></div>`;
  }
  function wireSpread() {
    const tr = document.querySelector(".sx-track"); if (!tr) return;
    const dots = [...tr.querySelectorAll(".sx-dot")], cur = tr.querySelector(".sx-cur"), rd = document.querySelector(".sx-read");
    let at = -1;
    const show = n => { n = Math.max(0, Math.min(dots.length - 1, n)); if (n === at) return; at = n; const d = dots[n].dataset;
      dots.forEach((x, i) => x.classList.toggle("on", i === n)); cur.style.left = d.p + "%";
      rd.href = d.url; rd.innerHTML = `<span class="sx-r-meta"><i style="background:${d.col}"></i>${d.time} · <b>${d.src}</b> · ${d.lab}</span><span class="sx-r-t">${d.title}</span>`;
      tr.setAttribute("aria-valuenow", n); tr.setAttribute("aria-valuetext", `${d.time}, ${d.src}: ${d.title}`); };
    const near = x => { const r = tr.querySelector(".sx-in").getBoundingClientRect(), p = (x - r.left) / r.width * 100; let b = 0, bd = 1e9; dots.forEach((d, i) => { const dd = Math.abs(+d.dataset.p - p); if (dd < bd) { bd = dd; b = i; } }); return b; };
    tr.addEventListener("pointermove", e => show(near(e.clientX)));
    tr.addEventListener("pointerdown", e => show(near(e.clientX)));
    tr.addEventListener("keydown", e => { const k = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1}[e.key]; if (k) { e.preventDefault(); show(at + k); } else if (e.key === "Home") show(0); else if (e.key === "End") show(dots.length - 1); });
    show(0);
    reveal(tr);
  }
  // one reveal per element when it scrolls into view (only when motion is allowed)
  function reveal(el, done) {
    if (!el || !el.classList.contains("pre")) { done && done(); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.disconnect();
      requestAnimationFrame(() => { el.classList.remove("pre"); done && done(); }); }), {threshold: 0.45});
    io.observe(el);
  }
  function wireBand() {
    const b = document.querySelector(".bsday"); if (!b) return;
    reveal(b, () => b.querySelectorAll(".bd-n[data-v]").forEach(el => { const v = +el.dataset.v; if (!v || !MOTION) return; const t0 = performance.now();
      const tick = t => { const f = Math.min(1, (t - t0 - 150) / 900); el.textContent = Math.round(v * (1 - Math.pow(1 - Math.max(0, f), 3))); if (f < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
  }

  function section(name) {
    const list = D.stories.filter(s => s.section === name);
    return `${header(name)}<main class="wrap"><h1 class="page-h">${esc(name)}</h1><p class="page-p">${list.length} priča koje je objavilo najmanje dva medija u poslednjih ${D.hours} sati.</p>
      ${list.length ? `<div class="strip">${list.slice(0, 4).map(stripCard).join("")}</div><div class="grid3" style="margin-top:28px">${list.slice(4).map(s => listItem(s)).join("")}</div>` : `<div class="empty">Nema vesti u ovoj rubrici.</div>`}
    </main>${footer()}`;
  }
  function search(q) {
    const t = q.toLowerCase();
    const list = D.stories.filter(s => (s.headline + " " + s.summary + " " + s.items.map(i => i.title).join(" ")).toLowerCase().includes(t));
    return `${header()}<main class="wrap"><h1 class="page-h">„${esc(q)}“</h1><p class="page-p">${list.length} priča.</p>
      <div class="grid3">${list.map(s => listItem(s, true)).join("")}</div></main>${footer()}`;
  }
  function blindspots(filter) {
    const want = (filter === "rezimski" || filter === "provladini") ? "pro_government" : filter === "kriticki" ? "critical" : "";
    const sec = decodeURIComponent((location.hash.split("?r=")[1] || ""));
    const all = D.stories.filter(s => s.blindspot);
    const bySide = all.filter(s => !want || s.blindspot === want);
    const list = bySide.filter(s => !sec || s.section === sec).slice().sort((a, b) => b.sources - a.sources || (b.score || 0) - (a.score || 0));
    const loudOf = s => s.blindspot === "pro_government" ? "critical" : "pro_government";
    const label = s => `<span class="bs-label">${EYE}Slepa tačka · <span class="bs-side" style="color:${VAR[s.blindspot]}">0% ${s.blindspot === "pro_government" ? "režimskih" : "kritičkih"}</span> · ${s.sources} ${form(s.sources, "medij")}</span>`;
    const who = s => {
      const names = [...new Set(s.items.filter(i => camp(i.source) === loudOf(s)).map(i => src(i.source).name))];
      return `<div class="who">Objavili: <b>${esc(names.slice(0, 3).join(", "))}</b>${names.length > 3 ? ` i još ${names.length - 3}` : ""}</div>`;
    };
    const covPct = s => `<div class="cov"><span class="pg"><b>${pct(s, "pro_government")}%</b> režimski</span><span class="cr"><b>${pct(s, "critical")}%</b> kritički</span></div>`;
    const card = s => `<a class="bs-card" href="${link(s)}">${photo(s)}<div style="margin-top:12px">${label(s)}</div><div class="hl">${esc(s.headline)}</div>${bar(s)}${covPct(s)}${who(s)}</a>`;
    const tab = (key, text, n) => `<a href="#/slepe-tacke${key ? "/" + key : ""}" class="${(filter || "") === key ? "on" : ""}">${text} <b>${n}</b></a>`;
    const secs = SECTION_ORDER.filter(n => bySide.some(s => s.section === n));
    const base = `#/slepe-tacke${filter ? "/" + filter : ""}`;
    const chips = secs.length > 1 ? `<div class="chips"><a class="chip ${!sec ? "on" : ""}" href="${base}">Sve rubrike</a>${secs.map(n => `<a class="chip ${sec === n ? "on" : ""}" href="${base}?r=${encodeURIComponent(n)}">${n} <b>${bySide.filter(s => s.section === n).length}</b></a>`).join("")}</div>` : "";
    const [hero, ...rest] = list;
    const heroHtml = hero ? `<section class="bs-hero" aria-label="Najveća slepa tačka">
        <a href="${link(hero)}">${photo(hero, "16/10")}</a>
        <div>${label(hero)}<a href="${link(hero)}"><h2 class="hl">${esc(hero.headline)}</h2></a>
          ${hero.summary ? `<p class="dek" style="font-size:16px">${esc(tidy(hero.summary, 200))}</p>` : ""}
          ${bar(hero, 8)}${covPct(hero)}
          <div class="pub-list" style="margin-top:16px"><div class="kicker" style="color:var(--ink2)">Ko je objavio</div>
          ${hero.items.filter(i => camp(i.source) === loudOf(hero)).slice(0, 4).map(i => `<a href="${esc(safe(i.url))}" target="_blank" rel="noopener" data-s="${esc(i.source)}"><div class="meta">${dot(loudOf(hero))}${esc(src(i.source).name)} · ${clock(i.published)}</div><div class="t">${esc(i.title)}</div></a>`).join("")}</div>
        </div></section>` : `<div class="empty">Trenutno nema slepih tačaka u ovom izboru.</div>`;
    // near-blindspots: 6+ outlets, the quieter side has at most 15% and is not zero
    const near = D.stories.filter(s => !s.blindspot && s.sources >= 6).map(s => {
      const p = s.split.pro_government || 0, c = s.split.critical || 0;
      const quiet = p < c ? "pro_government" : "critical", q = Math.min(p, c);
      return {s, quiet, q, share: q / s.sources};
    }).filter(x => x.q > 0 && x.share <= 0.15 && (!want || x.quiet === want) && (!sec || x.s.section === sec))
      .sort((a, b) => a.share - b.share || b.s.sources - a.s.sources).slice(0, 6);
    const nearCard = x => `<a class="bs-card" href="${link(x.s)}">${photo(x.s)}<div style="margin-top:12px"><span class="bs-label" style="background:#eef1f5;color:var(--ink2)">Skoro slepa tačka · <span class="bs-side" style="color:${VAR[x.quiet]}">samo ${Math.round(100 * x.share)}% ${x.quiet === "pro_government" ? "režimskih" : "kritičkih"}</span></span></div><div class="hl">${esc(x.s.headline)}</div>${bar(x.s)}${covPct(x.s)}</a>`;
    return `${header("bs")}<main class="wrap">
      <h1 class="page-h" style="display:flex;align-items:center;gap:12px"><span style="color:var(--amber);display:inline-flex">${EYE.replace('class="eye"', 'style="width:36px;height:36px"')}</span>Slepe tačke</h1>
      <p class="page-p">Vesti koje je objavilo više medija jedne strane, a nijedan medij druge. Računa se samo kada su mediji te strane u to vreme bili praćeni i objavljivali druge vesti.</p>
      <nav class="bs-tabs" aria-label="Filter">${tab("", "Sve", all.length)}${tab("rezimski", "Prećutali režimski", all.filter(s => s.blindspot === "pro_government").length)}${tab("kriticki", "Prećutali kritički", all.filter(s => s.blindspot === "critical").length)}</nav>
      ${chips}
      ${heroHtml}
      ${rest.length ? `<div class="sec-head"><h2>${want ? (want === "pro_government" ? "Prećutali režimski mediji" : "Prećutali kritički mediji") : "Sve slepe tačke"}</h2><span class="meta">${list.length}</span></div><div class="bs-grid">${rest.map(card).join("")}</div>` : ""}
      ${near.length ? `<div class="sec-head"><h2>Skoro slepe tačke</h2><span class="meta">jedna strana je jedva prisutna</span></div><div class="bs-grid">${near.map(nearCard).join("")}</div>` : ""}
      ${newsletter()}
    </main>${footer()}`;
  }
  function sources() {
    const row = s => `<div class="src-row"><div><a href="#/izvor/${encodeURIComponent(s.id)}" style="font-weight:600">${logo(s.id, 18)}${esc(s.name)}</a>${s.paused ? `<small>Pauzirano: ${esc(s.paused)}</small>` : s.owner ? `<small>${esc(tidy(s.owner, 120))}</small>` : s.note ? `<small>${esc(s.note)}</small>` : ""}</div><span class="count">${s.paused ? "pauzirano" : s.stories + " " + form(s.stories, "prica")}</span></div>`;
    const block = k => {
      const list = D.sources.filter(s => s.camp === k).sort((a, b) => b.stories - a.stories);
      if (!list.length) return "";
      const groups = [...new Set(D.sources.filter(s => s.camp === k).map(s => s.group || ""))];   // order as in sources.json
      const body = groups.length > 1
        ? groups.map(g => `<div class="kicker" style="margin:18px 0 2px;color:var(--ink2)">${esc(g || "Ostali")}</div>${list.filter(s => (s.group || "") === g).map(row).join("")}`).join("")
        : list.map(row).join("");
      return `<section style="flex:1 1 400px;min-width:0"><div class="sec-head" style="margin-top:20px;border-top-color:${VAR[k]}"><h2 style="color:${VAR[k]}">${LAB[k]}</h2><span class="meta">${list.length}</span></div>${body}</section>`;
    };
    return `${header("src")}<main class="wrap"><h1 class="page-h">Izvori i vlasništvo</h1>
      <p class="page-p">Pratimo ${D.sources.filter(s => !s.paused).length} medija. Kliknite na medij za njegov profil: vlasnik, izvor podatka, broj vesti i priče u kojima se pojavljuje. Oznake su početne procene zasnovane na javnim analizama medijske scene (CRTA, BIRN Media Ownership Monitor, Raskrikavanje) i podložne su proveri. Međunarodni mediji se prikazuju, ali se ne računaju ni na jednu stranu.</p>
      <div class="two">${block("pro_government")}${block("critical")}</div>
      <div class="two">${block("public")}${block("mixed")}${block("international")}</div></main>${footer()}`;
  }
  // ---------------------------------------------------------------- O nama, metodologija, balans
  function about() {
    const b = D.balance || {};
    const mk = o => ({split: o || {}, sources: Object.values(o || {}).reduce((a, x) => a + x, 0)});
    const row = (label, o) => `<div class="bal-row"><span>${label}</span><div>${bar(o, 12)}</div><span class="pp"><span class="c-pg">${share(o, "pro_government")}% režimski</span> · <span class="c-cr">${share(o, "critical")}% kritički</span></span></div>`;
    const shown = mk(b.shown), coll = mk(b.collected), outl = mk(b.outlets);
    const op = outl.split.pro_government || 0, oc = outl.split.critical || 0;
    const live = D.sources.filter(s => !s.paused).length;
    const u = (href, t) => `<a href="${href}" style="text-decoration:underline">${t}</a>`;
    return `${header("about")}<main class="wrap"><div class="prose">
      <h1 class="page-h">O nama</h1>
      <p class="dek" style="font-size:21px">Obe strane pokazuje kako mediji u Srbiji izveštavaju o istim događajima. Na jednom mestu vidite ko je vest objavio, kako ju je naslovio i šta je ko prećutao.</p>
      <p>U Srbiji ista vest često izgleda potpuno drugačije, u zavisnosti od toga koji medij čitate. Režimski i kritički mediji biraju različite teme, reči i sagovornike, a neke događaje jedna strana uopšte ne objavi. Mi ne pišemo vesti i ne govorimo vam šta da mislite. Povezujemo članke o istom događaju, pokazujemo ih uporedo i uz svaki dajemo link na izvorni tekst.</p>
      <p>Projekat je nezavisan, neprofitan i u fazi prototipa. Kod je javan na ${u("https://github.com/SrdjanKn/obe-strane\" target=\"_blank\" rel=\"noopener", "GitHubu")}, pa svako može da proveri kako radi.</p>
      <h2 id="metodologija">Metodologija</h2>
      <p>Kako prikupljamo vesti, grupišemo ih u priče, razvrstavamo medije i kako možete da osporite oznaku, opisano je na posebnoj stranici: ${u("metodologija/", "Metodologija")}.</p>
      <h2 id="balans">Naš balans</h2>
      <p>Proveravamo i sami sebe. Ovo su brojevi za poslednjih ${D.hours} sati i računaju se automatski pri svakom ažuriranju.</p>
    </div>
    <div style="max-width:900px">${row("Prikazano na sajtu", shown)}${row("Prikupljeni članci", coll)}${row("Mediji koje pratimo", outl)}</div>
    <div class="prose">
      <p>Pratimo ${op} ${form(op, "pro_government")} i ${oc} ${form(oc, "critical")} ${form(oc, "medij")}. Kritičkih medija je više, ali su mnogi manji i objavljuju ređe, pa je broj objava dve strane ujednačeniji od broja medija. U jednoj priči svaki medij se računa samo jednom, koliko god članaka da je objavio.</p>
      <h2>Kontakt</h2>
      <p>Primedbe na oznake, vlasništvo ili grupisanje vesti su dobrodošle: ${u("mailto:knelov@yahoo.com", "knelov@yahoo.com")} ili ${u("https://github.com/SrdjanKn/obe-strane/issues\" target=\"_blank\" rel=\"noopener", "GitHub")}. Kako osporiti oznaku, pročitajte u ${u("metodologija/#osporavanje", "metodologiji")}.</p>
    </div></main>${footer()}`;
  }

  // ---------------------------------------------------------------- jutarnji brifing
  const chkForm = (val = "", big = false) => `<form class="chk-form" novalidate><input type="url" name="u" inputmode="url" autocomplete="off" placeholder="Nalepite link članka" aria-label="Link članka" value="${esc(val)}"><button class="btn dark" type="submit">Proveri</button></form>`;
  const urlKey = u => { try { const x = new URL(u); return (x.hostname.replace(/^(www|m)\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase(); } catch (_) { return ""; } };
  const fold = t => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj");
  function outletFor(u) {
    let h; try { h = new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch (_) { return null; }
    const hosts = [];
    D.sources.forEach(s => { if (s.home) hosts.push([host(s.home).toLowerCase(), s.id]); });
    D.stories.forEach(st => st.items.forEach(i => { const ih = host(i.url).toLowerCase(); if (ih) hosts.push([ih, i.source]); }));
    const hit = hosts.filter(([k]) => h === k || h.endsWith("." + k)).sort((a, b) => b[0].length - a[0].length)[0];
    return hit ? hit[1] : null;
  }
  function checkPage(raw) {
    let u = (raw || "").trim();
    if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
    const head = `${compactHeader()}<main class="wrap chk-page"><h1 class="page-h">Proveri link</h1>
      <p class="page-p" style="margin-bottom:20px">Nalepite link bilo kog članka iz srpskih medija. Pokazaćemo čiji je medij, kojoj strani pripada i kako je istu vest prenela druga strana.</p>${chkForm(raw, true)}`;
    const end = `</main>${footer()}`;
    if (!u) return head + `<p class="meta" style="margin-top:14px">Na primer: link sa N1, Informera, Danasa ili Kurira.</p>` + end;
    let valid = !/\s/.test(raw.trim()); try { const hn = new URL(u).hostname; if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hn)) valid = false; } catch (_) { valid = false; }
    if (!valid) return head + `<p class="chk-err">Ovo ne izgleda kao link. Nalepite ceo link članka, sa https://.</p>` + end;
    const sid = outletFor(u);
    if (!sid) return head + `<div class="chk-res"><div class="chk-out" style="border-top-color:var(--ink)"><div><h2>${esc(host(u))}</h2></div><p>Ovaj sajt ne pratimo, pa ne možemo da kažemo kojoj strani pripada. Pratimo ${D.sources.length} medija. <a href="#/izvori" style="text-decoration:underline">Pogledajte listu izvora</a>.</p></div></div>` + end;
    const o = src(sid), col = VAR[o.camp] || "var(--ink)";
    const outlet = `<div class="chk-out" style="border-top-color:${col}">${logo(sid, 48)}<div><span class="camp" style="background:${col}">${LAB[o.camp] || ""}</span><h2>${esc(o.name)}</h2></div>
      <p>${esc(CAMP_WHY[o.camp] || "")}${o.owner ? " Vlasništvo: " + esc(o.owner) : ""} <a href="#/izvor/${encodeURIComponent(sid)}" style="text-decoration:underline">Profil medija</a></p></div>`;
    const key = urlKey(u);
    let st = D.stories.find(x => x.items.some(i => urlKey(i.url) === key)), exact = !!st;
    if (!st) {
      const words = fold(decodeURIComponent(new URL(u).pathname)).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !/^\d+$/.test(w));
      if (words.length >= 2) {
        const scored = D.stories.map(x => { const t = fold(x.headline + " " + x.items.map(i => i.title).join(" ")); return [x, words.filter(w => t.includes(w)).length]; }).sort((a, b) => b[1] - a[1]);
        if (scored[0] && scored[0][1] >= Math.max(2, Math.ceil(words.length * .4))) st = scored[0][0];
      }
    }
    let story = "";
    if (st) {
      const mineCamp = o.camp, other = mineCamp === "pro_government" ? "critical" : mineCamp === "critical" ? "pro_government" : null;
      const others = other ? st.items.filter(i => src(i.source).camp === other).sort((a, b) => a.published.localeCompare(b.published)) : [];
      const otherBlock = !other ? "" : others.length
        ? `<div class="chk-step"><h3>Kako je to prenela druga strana</h3>${others.slice(0, 3).map(i => `<a class="chk-other" style="border-left-color:${VAR[other]}" ${out(i.url, i.source)}><div class="quote" style="font-size:17px">„${esc(i.title)}“</div><div class="meta" style="margin-top:4px">${logo(i.source, 14)}${esc(src(i.source).name)}</div></a>`).join("")}</div>`
        : `<div class="chk-step"><div class="bs-note"><b>${LAB[other]} mediji ovu vest nisu objavili.</b> To je slepa tačka: vest je videla samo jedna strana.</div></div>`;
      story = `<div class="chk-step"><h3>${exact ? "Ovaj članak je deo priče" : "Verovatno je reč o ovoj priči"}</h3>
        <a class="chk-story" href="vest/${st.id}/">${secKick(st, st.sources + " " + form(st.sources, "medij"))}<div class="hl">${esc(st.headline)}</div>${bar(st, 8)}${cov(st)}</a>
        <a class="btn" href="vest/${st.id}/" style="margin-top:6px">Uporedi sve naslove</a></div>${otherBlock}`;
    } else {
      story = `<div class="chk-step"><h3>Priča</h3><p style="margin:0;color:var(--ink2)">Ovaj članak nije među vestima koje smo prikupili u poslednjih ${D.hours} sati, pa ne možemo da ga uporedimo sa drugom stranom. <a href="#/izvor/${encodeURIComponent(sid)}" style="text-decoration:underline">Najnovije vesti ovog medija</a></p></div>`;
    }
    return head + `<div class="chk-res${MOTION ? " chk-anim" : ""}">${outlet}${story}</div>` + end;
  }

  // ---- ton kroz vreme
  function tonePage() {
    const T = D.tone || {terms: [], days: []}, terms = T.terms;
    const days = T.days.filter(d => (d.c.pro_government || [0])[0] >= 150 && (d.c.critical || [0])[0] >= 100);   // skip thin days (too few headlines to compare)
    const head = `${compactHeader()}<main class="wrap ton"><h1 class="page-h">Kako se menja ton</h1>
      <p class="page-p">Posle izbora 25. oktobra 2026. režimski mediji su počeli da menjaju način na koji pišu o studentima, SNS-u i novoj vlasti. Ovde svakog dana brojimo koliko često se određene reči pojavljuju u naslovima jedne i druge strane, na 1.000 naslova.</p>`;
    if (days.length < 2) return head + `<p class="meta" style="margin:24px 0 60px">Merenje je tek počelo. Prvi grafikoni se pojavljuju posle dva dana podataka.</p></main>${footer()}`;
    const weekly = days.length >= 21;
    const monday = d => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
    const buckets = []; const idx = {};
    days.forEach(day => { const k = weekly ? monday(day.d) : day.d; if (!(k in idx)) { idx[k] = buckets.length; buckets.push({k, c: {}}); }
      const b = buckets[idx[k]]; for (const camp in day.c) { const r = day.c[camp]; b.c[camp] = (b.c[camp] || r.map(() => 0)).map((v, i) => v + r[i]); } });
    const rate = (b, camp, i) => { const r = b.c[camp]; return r && r[0] ? r[i + 1] / r[0] * 1000 : 0; };
    const fmtD = k => { const [y, m, d] = k.split("-"); return `${+d}. ${+m}.`; };
    const W = 340, H = 130, P = {l: 30, r: 10, t: 12, b: 22};
    const chart = (series, maxV, unit) => {
      const n = buckets.length, x = i => P.l + (n === 1 ? 0 : i * (W - P.l - P.r) / (n - 1)), y = v => H - P.b - (maxV ? v / maxV : 0) * (H - P.t - P.b);
      const elec = buckets.findIndex(b => b.k >= "2026-10-25");
      const grid = [0, maxV / 2, maxV].map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e6ea"/><text x="${P.l - 5}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#5f5f66">${Math.round(v)}${unit}</text>`).join("");
      const lines = series.map(([vals, col]) => `<polyline fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" points="${vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/><circle cx="${x(n - 1)}" cy="${y(vals[n - 1])}" r="3.5" fill="${col}"/>`).join("");
      const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}" font-size="10" fill="#5f5f66">${fmtD(buckets[i].k)}</text>`).join("");
      const mark = elec > 0 && buckets[0].k < "2026-10-25" ? `<line x1="${x(elec)}" x2="${x(elec)}" y1="${P.t}" y2="${H - P.b}" stroke="#121212" stroke-dasharray="3 3"/><text x="${x(elec) + 4}" y="${P.t + 9}" font-size="10" fill="#121212">izbori</text>` : "";
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${grid}${mark}${lines}${ticks}</svg>`;
    };
    const last = (camp, i) => Math.round(rate(buckets[buckets.length - 1], camp, i));
    // ključna mera: blokaderi / (blokaderi + studenti)
    const iS = terms.findIndex(t => t[0] === "studenti"), iB = terms.findIndex(t => t[0] === "blokaderi");
    const share = (b, camp) => { const r = b.c[camp]; if (!r) return 0; const s = r[iS + 1], bl = r[iB + 1]; return s + bl ? bl / (s + bl) * 100 : 0; };
    const sh = camp => buckets.map(b => share(b, camp));
    const key = iS >= 0 && iB >= 0 ? `<section class="ton-key"><div><h2>„Blokaderi“ ili „studenti“?</h2>
        <p>Od svih naslova koji pominju studente ili blokadere, koliki deo koristi reč „blokaderi“.</p>
        <div class="ton-big"><span style="color:var(--pg)"><b>${Math.round(sh("pro_government").slice(-1)[0])}%</b> režimski</span><span style="color:var(--cr)"><b>${Math.round(sh("critical").slice(-1)[0])}%</b> kritički</span></div>
        <p class="meta">${weekly ? "Poslednja nedelja" : "Poslednji dan"}, ${fmtD(buckets[buckets.length - 1].k)}</p></div>
        <div>${chart([[sh("pro_government"), "var(--pg)"], [sh("critical"), "var(--cr)"]], 100, "%")}</div></section>` : "";
    const cards = terms.map(([k, label], i) => {
      const pg = buckets.map(b => rate(b, "pro_government", i)), cr = buckets.map(b => rate(b, "critical", i));
      const maxV = Math.max(5, ...pg, ...cr) * 1.1;
      return `<div class="ton-card"><h3>${esc(label)}</h3><div class="ton-now"><span style="color:var(--pg)">${last("pro_government", i)} režimski</span><span style="color:var(--cr)">${last("critical", i)} kritički</span></div>${chart([[pg, "var(--pg)"], [cr, "var(--cr)"]], maxV, "")}</div>`;
    }).join("");
    return head + key + `<div class="sec-head"><h2>Reči u naslovima</h2><span class="meta">na 1.000 naslova, ${weekly ? "po nedeljama" : "po danima"}</span></div>
      <div class="ton-grid">${cards}</div>
      <p class="meta ton-note">Brojimo samo naslove, posle prebacivanja ćirilice u latinicu, sa svim padežima reči. Merenje traje od ${fmtD(days[0].d)} ${days[0].d.slice(0, 4)}. i svakog dana se dopunjuje. Reči ne kažu sve o tonu teksta, ali pokazuju kako se menja rečnik.</p></main>${footer()}`;
  }

  // ---- reči koje biraju
  const CYRL = {"а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"};
  const STOPW = new Set(("ali ili koji koja koje kojeg kojem kojih ovo ova ovaj taj nije nisu nece hoce biti bio bila bilo bili bice samo sve svi svih vise manje kada gde kako zasto prema izmedju preko ispred tokom zbog radi protiv godine godina danas juce sutra ovde tamo video foto vesti srbija srbije srbiji srbiju evra dinara miliona milion milijardi hitno uzivo oglasio oglasila rekao rekla kaze izjavio izjavila naveo navela posle pred kroz nakon ovog ovde njegov njena njihov jedan jedna jedno dana dok sada ipak jos vec evo ovim znaci poznato reci beograd beogradu novi nova novu nove novog novom novim ponovo dve dva tri prvi prva prvo ima imaju sada sad zato posto takodje jer").split(" "));
  const toLat = t => [...String(t).toLowerCase()].map(ch => CYRL[ch] ?? ch).join("");
  const stemOf = w => fold(w).slice(0, 6);
  const wordsOf = title => { const seen = new Map(); toLat(title).split(/[^a-z0-9čćšžđ]+/u).forEach(w => { const k = fold(w); if (k.length < 4 || STOPW.has(k) || /^\d+$/.test(k)) return; const st = stemOf(w); if (!seen.has(st)) seen.set(st, w); }); return seen; };
  function storyWords(s) {
    const by = {pro_government: [], critical: []};
    s.items.forEach(i => { const c = src(i.source).camp; if (by[c]) by[c].push(i); });
    if (by.pro_government.length < 2 || by.critical.length < 2) return null;
    const tally = list => { const m = new Map(); list.forEach(i => wordsOf(i.title).forEach((w, st) => { const e = m.get(st) || {n: 0, forms: {}, items: []}; e.n++; e.forms[w] = (e.forms[w] || 0) + 1; e.items.push(i); m.set(st, e); })); return m; };
    const P = tally(by.pro_government), C = tally(by.critical), np = by.pro_government.length, nc = by.critical.length;
    const pick = (A, B, na, nb) => [...A].filter(([st, e]) => e.n >= 2 && e.n / na - ((B.get(st) || {n: 0}).n / nb) >= 0.5)
      .sort((a, b) => b[1].n / na - a[1].n / na).slice(0, 4).map(([st, e]) => ({st, word: Object.entries(e.forms).sort((a, b) => b[1] - a[1])[0][0], n: e.n, of: na, items: e.items}));
    return {pg: pick(P, C, np, nc), cr: pick(C, P, nc, np), pgItems: by.pro_government, crItems: by.critical};
  }
  const markWord = (title, st) => esc(title).replace(/[\p{L}\d]+/gu, w => stemOf(toLat(w)) === st ? `<b class="w-hit">${w}</b>` : w);
  function wordsPage() {
    const W = D.words;
    const exq = (x, k) => `<div class="w-q" style="border-left-color:${VAR[k]}">„${esc(x.t)}“ <span class="meta">${esc(src(x.s).name)}</span></div>`;
    const list = (rows, camp, other) => rows && rows.length ? rows.slice(0, 20).map(r => {
      const mine = camp === "pro_government" ? r.pg_per : r.cr_per, theirs = camp === "pro_government" ? r.cr_per : r.pg_per;
      const times = theirs ? (mine / theirs) : 0;
      return `<details class="w-row" data-f="${mine}"><summary><span class="w-word" style="color:${VAR[camp]}">${esc(r.w)}</span>
        <span class="meta">${times >= 1.5 ? `${times >= 10 ? Math.round(times) : times.toFixed(1).replace(".", ",")}× češće` : ""}${!theirs ? "samo ova strana" : ""}</span></summary>
        <div class="w-ex"><div class="meta" style="margin-bottom:6px">${String(mine).replace(".", ",")} na 1.000 naslova ove strane · ${String(theirs).replace(".", ",")} kod druge</div>
        ${(r.ex[camp] || []).map(x => exq(x, camp)).join("")}${(r.ex[other] || []).slice(0, 1).map(x => exq(x, other)).join("")}</div></details>`; }).join("")
      : `<p class="meta">Za sada nema dovoljno naslova.</p>`;
    return `${compactHeader()}<main class="wrap reci"><h1 class="page-h">Reči koje biraju</h1>
      <p class="page-p">Reči koje se u naslovima jedne strane pojavljuju mnogo češće nego u naslovima druge, u svim vestima iz poslednjih 14 dana. Kliknite na reč da vidite primere naslova. Za reči jedne priče pogledajte okvir „Reči koje biraju“ na stranici te vesti.</p>
      <div class="chips w-sort" role="group" aria-label="Redosled reči"><button type="button" class="chip on" data-sort="d" aria-pressed="true">Najveća razlika</button><button type="button" class="chip" data-sort="f" aria-pressed="false">Najčešće</button></div>
      <div class="w-cols"><section><h2 style="color:var(--pg)">Režimski pišu</h2>${list(W && W.pg, "pro_government", "critical")}</section>
      <section><h2 style="color:var(--cr)">Kritički pišu</h2>${list(W && W.cr, "critical", "pro_government")}</section></div>
      <p class="meta ton-note">Poredimo koliko često se svaka reč javlja u naslovima režimskih i kritičkih medija, uzimajući u obzir da režimskih naslova ima više. Prikazujemo samo reči sa jasnom razlikom (statistička mera „log-odds“). Različiti oblici iste reči se spajaju, ćirilica se prebacuje u latinicu. Za promene kroz vreme pogledajte <a href="#/ton" style="text-decoration:underline">Kako se menja ton</a>.</p></main>${footer()}`;
  }
  // ---- citati
  const Q_BLOCK = new Set("video foto uzivo blog anketa ekskluzivno hit sok haos drama detalji pogledajte saznaje otkriva novo vesti hronika vreme uzbuna alarm horor jezivo tragedija nesreca najnovije oglasio oglasila stizu stigla upozorenje vazno hitno cena cene rezultati izbori raspored prognoza sport kviz test mapa pitanje odgovor bonus live update dan nedelja jutro vece projekat slucaj afera protest protesti kosovo rusija ukrajina litijum ekspo tema region svet analiza komentar intervju istrazivanje tragom foto-galerija".split(" "));
  const qClean = t => String(t).replace(/\s*[\(\[](video|foto|uživo|uzivo|anketa|galerija)[^\)\]]*[\)\]]\s*/gi, " ").replace(/\s+/g, " ").trim();
  function quoteOf(title) {
    const t = qClean(title), m = t.match(/^([^:„“"”]{2,48}?):\s+(.{12,})$/u);
    if (!m) return null;
    const who = m[1].trim(), words = who.split(/\s+/);
    if (words.length > 4 || /\d/.test(who)) return null;
    if (words.includes("i") || (D.topics || []).some(t => fold(t.name) === fold(who))) return null;
    if (!words.every(w => /^[A-ZČĆŠŽĐА-ЯЂЈЉЊЋЏ]/u.test(w) || /^(de|van|von|al|bin|i)$/.test(w))) return null;
    if (words.some(w => Q_BLOCK.has(fold(toLat(w))))) return null;
    let q = m[2].trim(); const inner = q.match(/[„"“]([^“”"]{12,})[“”"]/u); if (inner) q = inner[1];
    q = q.replace(/^[„"“]+|[“”"]+$/gu, "").trim();
    if (q.split(/\s+/).length < 4) return null;
    if (!/^[„"“A-ZČĆŠŽĐА-ЯЂЈЉЊЋЏ0-9]/u.test(m[2].trim())) return null;   // topic labels ("Litijum: meštani...") continue in lower case
    const last = fold(toLat(words[words.length - 1])).replace(/(a|u|om|e)$/, "");
    const display = words.map(w => w === w.toUpperCase() && w.length > 4 ? w[0] + w.slice(1).toLowerCase() : w).join(" ");
    return {key: last, who: display, q, toks: new Set(toLat(q).split(/[^a-z0-9čćšžđ]+/u).map(w => fold(w).slice(0, 5)).filter(w => w.length >= 4))};
  }
  const jacc = (a, b) => { let i = 0; a.forEach(x => b.has(x) && i++); return i / Math.max(1, Math.min(a.size, b.size)); };
  function storyQuotes(s) {
    const groups = [];
    s.items.forEach(it => { const q = quoteOf(it.title); if (!q) return;
      const g = groups.find(g => g.key === q.key && jacc(g.toks, q.toks) >= 0.5);
      if (g) { g.items.push(it); g.forms.push(q); q.toks.forEach(x => g.toks.add(x)); } else groups.push({key: q.key, toks: new Set(q.toks), items: [it], forms: [q], s}); });
    return groups.filter(g => g.items.length >= 2).map(g => {
      const c = {pro_government: 0, critical: 0, other: 0}; const seen = new Set();
      g.items.forEach(i => { if (seen.has(i.source)) return; seen.add(i.source); const k = src(i.source).camp; c[k in c ? k : "other"]++; });
      const best = g.forms.slice().sort((a, b) => a.q.length - b.q.length)[Math.floor((g.forms.length - 1) / 2)];
      const who = g.forms.map(f => f.who).sort((a, b) => b.length - a.length)[0];
      return {who, q: best.q, n: seen.size, c, s: g.s, items: g.items, first: g.items.slice().sort((a, b) => a.published.localeCompare(b.published))[0]};
    }).sort((a, b) => b.n - a.n);
  }

  // a speaker entry matches by full name first, then by surname (only for single-word keys), so two people with one surname can be told apart
  const speakerInfo = who => { const S = D.speakers || {}, f = t => fold(toLat(t)), full = f(who), last = f(who.split(" ").slice(-1)[0]);
    const keys = Object.keys(S).filter(k => !k.startsWith("_") && k !== "Primer");
    const k = keys.find(k => f(k) === full) || keys.find(k => !/\s/.test(k) && f(k) === last); return k ? S[k] : {}; };
  // which side usually carries a speaker's quotes: over all current quotes, the side with 60%+ of their coverage
  let _lean = null;
  const speakerLean = who => { if (!_lean) { _lean = {}; D.stories.flatMap(storyQuotes).forEach(q => { const k = fold(toLat(q.who.split(" ").slice(-1)[0])), o = _lean[k] = _lean[k] || {pg: 0, cr: 0}; o.pg += q.c.pro_government; o.cr += q.c.critical; }); }
    const o = _lean[fold(toLat(who.split(" ").slice(-1)[0]))]; if (!o || o.pg + o.cr < 4) return ""; const t = o.pg + o.cr; return o.pg / t >= 0.6 ? "pro_government" : o.cr / t >= 0.6 ? "critical" : ""; };
  const qCard = (x, withStory = true) => {
    const one = x.c.pro_government && !x.c.critical ? "pro_government" : x.c.critical && !x.c.pro_government ? "critical" : "";
    const lean = x.c.pro_government > x.c.critical ? "pro_government" : x.c.critical > x.c.pro_government ? "critical" : "";
    const info = speakerInfo(x.who), name = info.name || x.who;
    const ini = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const sl = speakerLean(x.who);
    const ava = info.photo ? `<img class="q-ava" src="${esc(safe(info.photo))}" alt="" loading="lazy">` : `<span class="q-ava" style="background:${sl ? VAR[sl] : "var(--ink2)"}" aria-hidden="true">${esc(ini)}</span>`;
    const credit = info.photo && info.credit ? `<div class="q-credit">Foto: ${info.credit_url ? `<a href="${esc(safe(info.credit_url))}" target="_blank" rel="noopener">${esc(info.credit)}</a>` : esc(info.credit)}</div>` : "";
    const outlets = [...new Set(x.items.map(i => i.source))];
    const tot = x.c.pro_government + x.c.critical + x.c.other || 1;
    return `<article class="q-card2">
      <div class="q-head">${ava}<div><div class="q-name">${esc(name)}</div>${info.role ? `<div class="q-role">${esc(info.role)}</div>` : ""}${credit}</div>${one ? `<span class="q-one" style="background:${VAR[one]}">Samo ${one === "pro_government" ? "režimski" : "kritički"}</span>` : ""}</div>
      <blockquote class="q-big"><span class="q-mark" style="color:${lean ? VAR[lean] : "var(--ink3)"}" aria-hidden="true">“</span>„${esc(x.q)}“</blockquote>
      <div class="q-foot"><span class="q-pill"><span class="q-stack">${outlets.slice(0, 5).map(id => `<span class="q-lg">${logo(id, 18)}</span>`).join("")}</span>${x.n} ${form(x.n, "medij")}</span>
        <span class="q-split" title="${x.c.pro_government} ${form(x.c.pro_government, "pro_government")}, ${x.c.critical} ${form(x.c.critical, "critical")}, ${x.c.other} ${form(x.c.other, "ostali")}"><i style="flex:${x.c.pro_government};background:var(--pg)"></i><i style="flex:${x.c.other};background:var(--mix)"></i><i style="flex:${x.c.critical};background:var(--cr)"></i></span>
        <span class="q-counts"><b style="color:var(--pg)">${x.c.pro_government}</b> režimski · <b style="color:var(--cr)">${x.c.critical}</b> kritički</span></div>
      ${withStory && jac(tokSet(x.q + " " + x.who), tokSet(x.s.headline)) < 0.45 ? `<a class="q-story" href="vest/${x.s.id}/">Iz priče: ${esc(x.s.headline)}</a>` : ""}</article>`; };
  function quotesPage(filter) {
    const all = D.stories.flatMap(storyQuotes).sort((a, b) => b.n - a.n);
    const isOne = (x, k) => x.c[k] >= 2 && !x.c[k === "pro_government" ? "critical" : "pro_government"];
    const list = filter === "rezimski" ? all.filter(x => isOne(x, "pro_government")) : filter === "kriticki" ? all.filter(x => isOne(x, "critical")) : all;
    const tab = (f, label, n) => `<a href="#/citati${f ? "/" + f : ""}" class="chip ${(filter || "") === f ? "on" : ""}">${label} <small>${n}</small></a>`;
    return `${compactHeader()}<main class="wrap citati"><h1 class="page-h">Citati</h1>
      <p class="page-p">Ko je šta rekao i ko je to preneo. Izjave iz naslova svih medija u poslednjih ${D.hours} sati, spojene kad više medija prenosi istu izjavu. Kad izjavu prenosi samo jedna strana, to je slepa tačka na nivou jedne rečenice.</p>
      <div class="chips" style="margin:18px 0 24px">${tab("", "Sve", all.length)}${tab("rezimski", "Prenose samo režimski", all.filter(x => isOne(x, "pro_government")).length)}${tab("kriticki", "Prenose samo kritički", all.filter(x => isOne(x, "critical")).length)}</div>
      <div class="q-grid">${list.slice(0, 60).map(x => qCard(x)).join("") || `<p class="meta">Nema citata za ovaj filter.</p>`}</div>
      <p class="meta ton-note">Citat prepoznajemo po obliku naslova „Ime: izjava“, a izjave istog govornika spajamo kad se reči dovoljno poklapaju. Prikazujemo izjave koje su preneli najmanje dva medija. Govornik može biti i institucija (na primer tužilaštvo ili Batut).</p></main>${footer()}`;
  }

  // ---- podkasti
  const PODLAB = k => LAB[k] || (k === "independent" ? "Nezavisni" : "");
  const PODCOL = k => VAR[k] || "var(--ink3)";
  const epAgo = d => { const h = (Date.now() - new Date(d)) / 36e5; return h < 24 ? `pre ${Math.max(1, Math.round(h))} h` : h < 24 * 7 ? `pre ${Math.round(h / 24)} ${Math.round(h / 24) === 1 ? "dan" : "dana"}` : new Date(d).toLocaleDateString("sr-Latn-RS", {day: "numeric", month: "numeric", year: "numeric"}); };
  const epCard = (e, compact = false) => { const P = D.podcasts, sh = P.shows.find(x => x.id === e.show) || {};
    const st = !compact && e.stories && e.stories.length ? D.stories.find(x => x.id === e.stories[0]) : null;
    return `<article class="ep${compact ? " ep-c" : ""}"><a class="ep-img" href="${esc(safe(e.url))}" target="_blank" rel="noopener">${e.img ? `<img src="${esc(safe(e.img))}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="ep-play" aria-hidden="true">▶</span></a>
      <div><div class="ep-show"><b>${esc(sh.name || "")}</b> · ${esc(sh.by || "")} <span class="ep-lab" style="background:${PODCOL(sh.camp)}">${PODLAB(sh.camp)}</span></div>
      <a class="ep-title" href="${esc(safe(e.url))}" target="_blank" rel="noopener">${esc(e.title)}</a>
      <div class="meta">${e.date ? epAgo(e.date) : ""}</div>${st ? `<a class="q-story" href="vest/${st.id}/">O temi: ${esc(st.headline)}</a>` : ""}</div></article>`; };
  function podcastsPage(show) {
    const P = D.podcasts || {shows: [], episodes: []};
    const eps = show ? P.episodes.filter(e => e.show === show) : P.episodes;
    const chip = (id, label) => `<a href="#/podkasti${id ? "/" + id : ""}" class="chip ${(show || "") === id ? "on" : ""}">${label}</a>`;
    return `${compactHeader()}<main class="wrap pods"><h1 class="page-h">Podkasti i emisije</h1>
      <p class="page-p">Najnovije epizode razgovornih emisija i podkasta o politici i društvu. Uz svaku emisiju piše kojoj strani pripada medij koji je pravi. Klikom se epizoda otvara na izvornoj platformi.</p>
      <div class="chips" style="margin:18px 0 24px">${chip("", "Sve")}${P.shows.map(sh => chip(sh.id, esc(sh.name))).join("")}</div>
      <div class="ep-grid">${eps.slice(0, 40).map(e => epCard(e)).join("") || `<p class="meta">Za sada nema novih epizoda.</p>`}</div>
      <p class="meta ton-note">Epizode preuzimamo iz javnih kanala emisija (YouTube, RSS, Apple Podcasts). Sadržaj i prava pripadaju autorima.</p></main>${footer()}`;
  }

  // ---- za medije
  const CONTACT_EMAIL = "knelov@yahoo.com";   // public contact address (Za medije page)
  const contactLine = () => CONTACT_EMAIL ? `<a href="mailto:${CONTACT_EMAIL}" style="text-decoration:underline">${CONTACT_EMAIL}</a>` : `<b>(kontakt adresa uskoro)</b>`;
  function forPublishers() {
    const top = Object.entries(D.stories.reduce((m, st) => { if (st.image_source) m[st.image_source] = (m[st.image_source] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return `${compactHeader()}<main class="wrap prose-page"><h1 class="page-h">Za medije</h1>
      <p class="page-p">Obe strane ne piše vesti. Povezujemo vaše tekstove sa tekstovima drugih medija o istom događaju i šaljemo čitaoce na vaš sajt. Ovde objašnjavamo šta tačno preuzimamo i kako da nas kontaktirate.</p>
      <section class="pp-grid">
        <div class="pp-card"><h2>Šta preuzimamo</h2><ul><li><b>Naslov</b> i <b>kratak uvod</b> (do 300 znakova) iz vašeg javnog RSS-a ili naslovne strane.</li><li><b>Link</b> na originalni tekst. Svaki naslov vodi na vaš sajt.</li><li><b>Naslovnu fotografiju</b> iz vašeg RSS-a ili oznake za deljenje (og:image), uz potpis „Fotografija: naziv medija“.</li><li>Ne preuzimamo ceo tekst i ne prikazujemo ga na našem sajtu.</li></ul></div>
        <div class="pp-card"><h2>Kako koristimo fotografije</h2><ul><li>Fotografija se prikazuje samo uz priču u kojoj je i vaš tekst, sa vašim imenom.</li><li>Biramo samo oštre fotografije dovoljne veličine. Logotipi i grafike se odbacuju kad ih prepoznamo.</li><li>Fotografije se učitavaju sa vašeg servera; ne čuvamo kopije.</li></ul></div>
        <div class="pp-card"><h2>Uklanjanje ili izmena</h2><p>Ako ne želite da prikazujemo vaše fotografije ili tekstove, ili je oznaka vašeg medija pogrešna, pišite nam na ${contactLine()}. Fotografije uklanjamo u najkraćem roku, a oznake preispitujemo i odgovaramo sa obrazloženjem.</p></div>
        <div class="pp-card"><h2>Saradnja</h2><p>Rado ćemo koristiti fotografije uz vašu dozvolu, ispraviti RSS adresu ili dodati rubriku koju propuštamo. Mediji koje ne pratimo mogu da predlože uključivanje. Pišite na ${contactLine()}.</p></div>
      </section>
      ${top.length ? `<h2 class="h3" style="margin:36px 0 10px">Čije fotografije se trenutno najviše prikazuju</h2>
      <div class="pp-top">${top.map(([id, n]) => `<span class="bd-logo">${logo(id, 16)}${esc(src(id).name)} <b>${n}</b></span>`).join("")}</div>` : ""}
      <p class="meta ton-note">Oznake medija (režimski, kritički, javni servis, između kategorija, međunarodni) objašnjene su na stranici <a href="metodologija/" style="text-decoration:underline">Metodologija</a>, a vlasništvo na stranici <a href="#/izvori" style="text-decoration:underline">Izvori</a>.</p></main>${footer()}`;
  }

  // ---- najrazličitije prenesena vest
  const tokSet = t => new Set(toLat(t).split(/[^a-z0-9čćšžđ]+/u).map(w => fold(w)).filter(w => w.length >= 4 && !STOPW.has(w)).map(w => w.slice(0, 6)));
  const jac = (a, b) => { let i = 0; a.forEach(x => b.has(x) && i++); return i / ((a.size + b.size - i) || 1); };
  function spinScore(st) {
    const pg = st.items.filter(i => camp(i.source) === "pro_government").map(i => tokSet(i.title)), cr = st.items.filter(i => camp(i.source) === "critical").map(i => tokSet(i.title));
    if (pg.length < 2 || cr.length < 2) return null;
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const within = [], across = [];
    [pg, cr].forEach(side => side.forEach((a, i) => side.slice(i + 1).forEach(b => within.push(jac(a, b)))));
    pg.forEach(a => cr.forEach(b => across.push(jac(a, b))));
    return {score: avg(within) - avg(across), within: avg(within), across: avg(across)};
  }
  const spunStories = () => D.stories.map(st => ({st, sp: spinScore(st)})).filter(x => x.sp && x.sp.score > 0.05).sort((a, b) => b.sp.score - a.sp.score);
  function spinCard(st, big = false) {
    const side = k => st.items.filter(i => camp(i.source) === k).slice(0, big ? 4 : 3);
    const w = storyWords(st) || {pg: [], cr: []};
    const hl = (t, arr) => { let h = esc(t), hits = 0; arr.forEach(x => { if (hits >= 3) return; h = h.replace(new RegExp(`(^|[^\\p{L}])(${x.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\p{L}]*)`, "iu"), (m, a, b) => (hits++, `${a}<b class="w-hit">${b}</b>`)); }); return h; };
    const col = (k, label, arr) => `<div class="sp-col"><div class="sp-lab" style="color:${VAR[k]}">${label}</div>${side(k).map(i => `<a class="w-q" style="border-left-color:${VAR[k]}" ${out(i.url, i.source)}>„${hl(i.title, arr)}“ <span class="meta">${esc(src(i.source).name)}</span></a>`).join("")}</div>`;
    return `<div class="sp-cols">${col("pro_government", "Režimski naslovi", w.pg)}${col("critical", "Kritički naslovi", w.cr)}</div>`;
  }
  function homeSpin(used = new Set()) {
    const list = spunStories(), top = list.find(x => !used.has(x.st.id)) || list[0]; if (!top) return "";
    const st = top.st; used.add(st.id);
    return `<section class="home-box" aria-label="Najrazličitije prenesena vest"><div class="hb-head"><h2>Ista vest, različiti naslovi</h2><a class="btn" href="#/najrazlicitije">Još primera</a></div>
      <div class="sp-box"><a class="sp-story" href="${link(st)}"><span class="kicker">${esc(st.section || "")} · ${st.sources} medija</span><span class="sp-h">${esc(st.headline)}</span></a>
      <p class="sp-note">Najrazličitije prenesena vest dana: naslovi jedne strane međusobno se poklapaju ${Math.round(top.sp.within * 100)}%, a sa naslovima druge strane samo ${Math.round(top.sp.across * 100)}%.</p>${spinCard(st, true)}</div></section>`;
  }
  function spinPage() {
    const list = spunStories().slice(0, 8);
    return `${compactHeader()}<main class="wrap spin-page"><h1 class="page-h">Ista vest, različiti naslovi</h1>
      <p class="page-p">Priče u kojima se naslovi režimskih i kritičkih medija najviše razlikuju, iako govore o istom događaju. Merimo koliko se reči u naslovima poklapaju unutar jedne strane, a koliko između strana. Istaknute su reči koje koristi samo jedna strana.</p>
      ${list.map(({st, sp}) => `<section class="sp-box" style="margin-top:22px"><a class="sp-story" href="${link(st)}"><span class="kicker">${esc(st.section || "")} · ${st.sources} medija · razlika ${Math.round(sp.score * 100)}</span><span class="sp-h">${esc(st.headline)}</span></a>${spinCard(st)}</section>`).join("") || `<p class="meta">Za sada nema priča koje su obe strane dovoljno pratile.</p>`}
      </main>${footer()}`;
  }

  // ---- profil priče (radar)
  const PAX = [["doseg", "Doseg", "koliko medija je prenosi"], ["brzina", "Brzina", "koliko brzo su se javili mediji"], ["svezina", "Svežina", "koliko je skoro stigao poslednji članak"], ["trajanje", "Trajanje", "koliko dugo se o njoj piše"], ["jednostranost", "Jednostranost", "koliko pretežno je prati jedna strana"]];
  function profile(st) {
    const t = st.items.map(i => new Date(i.published).getTime()).sort((a, b) => a - b), t0 = t[0], t1 = t[t.length - 1];
    const maxN = Math.max(...D.stories.slice(0, 60).map(x => x.sources), 10);
    const fast = st.items.filter(i => new Date(i.published).getTime() - t0 <= 2 * 36e5).length;
    const pg = st.split.pro_government || 0, cr = st.split.critical || 0;
    const ageH = (Date.now() - t1) / 36e5, spanH = (t1 - t0) / 36e5;
    const v = {doseg: Math.min(1, st.sources / maxN), brzina: st.items.length ? fast / st.items.length : 0, svezina: Math.max(0, 1 - ageH / 24),
      trajanje: Math.min(1, spanH / 30), jednostranost: pg + cr ? Math.abs(pg - cr) / (pg + cr) : 0};
    const txt = {doseg: `${st.sources} ${form(st.sources, "medij")}`, brzina: `${fast} od ${st.items.length} članaka u prva 2 sata`,
      svezina: ageH < 1 ? `poslednji članak pre ${Math.max(1, Math.round(ageH * 60))} min` : `poslednji članak pre ${Math.round(ageH)} h`,
      trajanje: spanH < 1 ? "manje od sat vremena" : `${Math.round(spanH)} h od prvog do poslednjeg članka`,
      jednostranost: pg + cr ? (pg === cr ? "obe strane podjednako" : `${Math.round(Math.max(pg, cr) / (pg + cr) * 100)}% ${pg > cr ? "režimski" : "kritički"}`) : "nijedna strana"};
    return {v, txt, tilt: pg > cr ? "pro_government" : cr > pg ? "critical" : ""};
  }
  function radar(p, size = 220, labels = true) {
    const c = size / 2, R = size / 2 - (labels ? 38 : 8), n = PAX.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, r) => [c + Math.cos(ang(i)) * r, c + Math.sin(ang(i)) * r];
    const ring = f => PAX.map((_, i) => pt(i, R * f).map(x => x.toFixed(1)).join(",")).join(" ");
    const shape = PAX.map(([k], i) => pt(i, R * Math.max(0.06, p.v[k])).map(x => x.toFixed(1)).join(",")).join(" ");
    const col = p.tilt ? VAR[p.tilt] : "var(--ink2)";
    const pad = labels ? 54 : 0;
    return `<svg viewBox="${-pad} 0 ${size + 2 * pad} ${size}" width="${size + 2 * pad}" height="${size}" style="max-width:100%;height:auto" role="img" aria-label="Profil priče: ${PAX.map(([k, l]) => `${l} ${Math.round(p.v[k] * 100)}%`).join(", ")}">
      ${[0.33, 0.66, 1].map(f => `<polygon points="${ring(f)}" fill="none" stroke="#dfe3e9"/>`).join("")}
      ${PAX.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#dfe3e9"/>`; }).join("")}
      <polygon points="${shape}" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
      ${labels ? PAX.map(([, l], i) => { const [x, y] = pt(i, R + 16); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${Math.abs(x - c) < 4 ? "middle" : x < c ? "end" : "start"}" font-size="11" font-weight="600" fill="#454549" font-family="Inter, sans-serif">${l}</text>`; }).join("") : ""}</svg>`;
  }
  function profileBox(st) {
    const p = profile(st);
    return `<div class="pf-box"><div class="pf-chart">${radar(p, 180)}</div><div class="pf-list"><div class="kicker" style="color:var(--ink2)">Profil priče</div>
      ${PAX.map(([k, l, d]) => `<div class="pf-row"><span class="pf-l">${l}</span><span class="pf-bar"><i style="width:${Math.round(p.v[k] * 100)}%;background:${p.tilt && k === "jednostranost" ? VAR[p.tilt] : "var(--ink)"}"></i></span><span class="pf-t">${esc(p.txt[k])}</span></div>`).join("")}
      <p class="meta" style="margin:8px 0 0">Dalje od centra znači više. Doseg se poredi sa najvećim pričama dana.</p></div></div>`;
  }
  function homeProfiles() {
    const top = D.stories.slice(0, 5); if (top.length < 3) return "";
    return `<section class="home-box" aria-label="Profil najvećih priča"><div class="hb-head"><h2>Kako se porede najveće priče</h2></div>
      <div class="pf-grid">${top.map(st => { const p = profile(st); const ks = PAX.slice().sort((a, b) => p.v[b[0]] - p.v[a[0]]);
        return `<a class="pf-card" href="${link(st)}">${radar(p, 150, false)}<div class="pf-h">${esc(st.headline)}</div><div class="meta">${st.sources} ${form(st.sources, "medij")} · ${st.items.length} članaka</div>
          <div class="pf-sw"><span>Najjače: <b>${ks[0][1]}</b></span><span>Najslabije: <b>${ks[ks.length - 1][1]}</b></span></div></a>`; }).join("")}</div>
      <p class="meta" style="margin-top:10px">${PAX.map(([, l, d]) => `<b>${l}</b>: ${d}`).join(" · ")}. Dalje od centra znači više; boja pokazuje stranu koja priču više prati.</p></section>`;
  }
  function briefingPage() {
    const B = D.briefing;
    if (!B) return `${header("brief")}<div class="wrap empty">Prvi brifing stiže sutra u 7 ujutru.</div>${footer()}`;
    const dateStr = new Date(B.day + "T12:00:00").toLocaleDateString("sr-Latn-RS", {weekday: "long", day: "numeric", month: "long"});
    const live = id => D.stories.some(s => s.id === id);
    const q = (i, cls) => i ? `<a class="${cls}" ${out(i.url, i.source)}><div class="quote" style="font-size:16px">„${esc(i.title)}“</div><div class="meta" style="margin-top:3px">${logo(i.source, 14)}${esc(src(i.source).name)}</div></a>` : "";
    const framing = s => [["pro_government", s.ai.provladini], ["critical", s.ai.kriticki]].filter(x => x[1] && s.split[x[0]]).map(([k, t]) =>
      `<div class="ai-side" style="border-left-color:${VAR[k]}"><h3 style="color:${VAR[k]}">${k === "pro_government" ? "Režimski" : "Kritički"}</h3><p style="font-size:15.5px">${esc(t)}</p></div>`).join("");
    const full = id => D.stories.find(x => x.id === id) || {};
    const img = s => s.image || full(s.id).image || "";
    const credit = s => { const k = s.image_source || full(s.id).image_source; return k ? `<div class="brief-credit">Fotografija: ${esc(src(k).name)}</div>` : ""; };
    const pic = (s, ratio) => { const ph = photo(Object.assign({}, s, {image: img(s)}), ratio); return live(s.id) ? `<a href="vest/${s.id}/" tabindex="-1" aria-hidden="true">${ph}</a>` : ph; };
    const item = (s, n) => { const has = !!img(s), lead = n === 1 && has;
      return `<article class="brief-item${lead ? " lead" : has ? "" : " no-img"}">${lead ? `<div class="brief-lead-img">${pic(s, "16/9")}${credit(s)}</div>` : ""}<div class="no">${n}</div><div>
        ${kick([esc(s.section), s.sources + " " + form(s.sources, "medij"), s.blindspot ? EYE + bsLabel(s.blindspot) : ""].filter(Boolean).join(" · "), s.blindspot ? "amber" : "")}
        ${live(s.id) ? `<a href="vest/${s.id}/"><h2 class="hl">${esc(s.headline)}</h2></a>` : `<h2 class="hl">${esc(s.headline)}</h2>`}
        ${s.ai && s.ai.ukratko ? `<p style="margin:0 0 14px">${esc(s.ai.ukratko)}</p>` : s.summary ? `<p style="margin:0 0 14px;color:var(--ink2)">${esc(tidy(s.summary, 240))}</p>` : ""}
        ${s.ai && (s.ai.provladini || s.ai.kriticki) ? `<div class="ai-two" style="margin-bottom:14px">${framing(s)}</div>` : (s.pg || s.cr) ? `<div class="quotes2">${q(s.pg, "q-pg")}${q(s.cr, "q-cr")}</div>` : ""}
        ${bar(s, 6)}${cov(s)}</div>${has && !lead ? `<div class="bi-img">${pic(s, "3/2")}</div>` : ""}</article>`; };
    const list = B.stories || [], bs = B.blindspots || [];
    const mins = Math.max(3, Math.round((list.length + bs.length) * 0.6));
    const anyAi = list.some(s => s.ai);
    return `${header("brief")}<main class="col" style="max-width:820px">
      <div class="brief-head">${kick("Jutarnji brifing · " + esc(dateStr))}<h1>Obe strane u 5 minuta</h1>
        <p class="meta" style="font-size:14px;max-width:560px;margin:0 auto">${list.length} najvažnijih vesti iz poslednja 24 sata i kako ih je koja strana prenela. Izdanje se pravi jednom dnevno, u 7 ujutru. Čitanje: oko ${mins} minuta.</p></div>
      ${list.map((s, i) => item(s, i + 1)).join("")}
      ${bs.length ? `<div class="sec-head" style="border-top-color:var(--sig)"><h2 style="color:var(--amber);display:flex;align-items:center">${EYE}Prećutano</h2><span class="meta">objavila samo jedna strana</span></div>${bs.map((s, i) => item(s, list.length + i + 1)).join("")}` : ""}
      ${anyAi ? `<p class="ai-note" style="margin-top:20px">Sažetke i opise uokviravanja napisao je AI model na osnovu naslova i uvoda članaka. Mogu da sadrže greške. <a href="metodologija/">Kako radimo</a></p>` : ""}
      <div class="brief-end">To je sve za danas. Sledeće izdanje je sutra u 7.<br><a href="#/" class="sans" style="font-size:15px;font-style:normal;text-decoration:underline">Vesti tokom dana su na naslovnoj</a></div>
    </main>${footer()}`;
  }

  // ---------------------------------------------------------------- profil medija
  const CAMP_WHY = {pro_government: "Prema javnim analizama medijske scene, ovaj medij je tokom vladavine SNS-a uglavnom prenosio stavove te vlasti i retko je kritikovao.",
    critical: "Prema javnim analizama medijske scene, ovaj medij je tokom vladavine SNS-a redovno kritički izveštavao o vlasti.",
    public: "Javni medijski servis, finansiran iz takse i budžeta. Ne računa se ni na jednu stranu.",
    mixed: "Ne pripada jasno nijednoj strani: uređivački je hibridan, poslovni ili specijalizovan.",
    international: "Međunarodni medij na srpskom jeziku. Prikazuje se, ali se ne računa ni na jednu stranu."};
  function outletPage(id) {
    const s = D.sources.find(x => x.id === id);
    if (!s) return `${header("src")}<div class="wrap empty">Nepoznat medij. <a href="#/izvori" style="text-decoration:underline">Svi izvori</a></div>${footer()}`;
    const mine = D.stories.filter(x => x.items.some(i => i.source === id));
    const srcLink = u => u ? `<a class="src-link" href="${esc(safe(u))}" target="_blank" rel="noopener">Izvor: ${esc(host(u))}</a>` : "";
    const date = iso => new Date(iso).toLocaleDateString("sr-Latn-RS", {day: "numeric", month: "long"});
    return `${header("src")}<main class="wide">
      <div style="padding-top:28px">${kick(`<a href="#/izvori">Izvori</a> › <span style="color:${VAR[s.camp]}">${LAB[s.camp]}</span>${s.group ? " · " + esc(s.group) : ""}`)}
        <h1 class="page-h" style="display:flex;align-items:center;gap:14px;margin-top:6px">${logo(id, 44)}${esc(s.name)}</h1>
        <a class="meta" href="${esc(safe(s.home))}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(host(s.home))} ↗</a></div>
      ${s.paused ? `<div class="bs-note"><b>Pauzirano.</b> ${esc(s.paused)}</div>` : ""}
      <div class="stats"><div><b>${s.a36}</b><span>članaka u poslednjih ${D.hours} h</span></div><div><b>${s.a7}</b><span>članaka u 7 dana</span></div>
        <div><b>${s.stories}</b><span>${form(s.stories, "prica")} sa 2+ medija</span></div><div><b>${s.blind_loud}</b><span>slepih tačaka u kojima je objavio vest</span></div></div>
      <div class="two" style="gap:24px">
        <section style="flex:1 1 380px;min-width:0"><div class="box"><h2>Vlasništvo</h2>
          ${s.owner ? `<p>${esc(s.owner)}</p>${srcLink(s.owner_src)}` : `<p style="color:var(--ink2)">Podatke o vlasništvu još nismo proverili. Ako imate pouzdan izvor, <a href="https://github.com/SrdjanKn/obe-strane/issues" target="_blank" rel="noopener" style="text-decoration:underline">javite nam</a>.</p>`}
          ${s.public_money ? `<p style="margin-top:14px"><b class="sans" style="font-size:14px">Javni novac:</b> ${esc(s.public_money)}</p>${srcLink(s.public_money_src)}` : ""}
        </div></section>
        <section style="flex:1 1 380px;min-width:0"><div class="box" style="border-top-color:${VAR[s.camp]}"><h2 style="color:${VAR[s.camp]}">Oznaka: ${LAB[s.camp]}</h2>
          <p>${CAMP_WHY[s.camp] || ""} Oznaka je početna procena koju proveravamo.</p>${s.note ? `<p style="color:var(--ink2)">${esc(s.note)}</p>` : ""}
          ${s.sections.length ? `<div class="meta" style="margin-top:10px">Najčešće rubrike</div><div class="chips">${s.sections.map(n => `<a class="chip" href="#/rubrika/${encodeURIComponent(n)}">${esc(n)}</a>`).join("")}</div>` : ""}
        </div></section>
      </div>
      ${mine.length ? `<div class="sec-head"><h2>Priče u kojima se pojavljuje</h2><span class="meta">${mine.length}</span></div><div class="grid3">${mine.slice(0, 12).map(x => listItem(x, true)).join("")}</div>` : ""}
      ${s.recent.length ? `<div class="sec-head"><h2>Najnoviji članci</h2><span class="meta">poslednjih 7 dana</span></div>${s.recent.map(r => `<a class="li" ${out(r.url, id)}><div class="meta">${date(r.published)} u ${clock(r.published)}</div><div class="hl" style="margin-top:4px">${esc(r.title)}</div></a>`).join("")}` : ""}
    </main>${footer()}`;
  }

  // ---------------------------------------------------------------- teme
  function topicPage(slug) {
    const t = (D.topics || []).find(x => x.slug === slug);
    const list = D.stories.filter(s => (s.topics || []).includes(slug));
    if (!t || !list.length) return `${header("topic")}<div class="wrap empty">Trenutno nema vesti na ovu temu. <a href="#/" style="text-decoration:underline">Nazad na naslovnu</a></div>${footer()}`;
    const agg = sumSplit(list), bs = list.filter(s => s.blindspot).length;
    const p = agg.split.pro_government || 0, c = agg.split.critical || 0;
    const who = p && c ? (Math.abs(p - c) <= Math.max(1, (p + c) * .1) ? "Obe strane podjednako prate ovu temu" : p > c ? "Ovu temu više prate režimski mediji" : "Ovu temu više prate kritički mediji") : "Ovu temu prati samo jedna strana";
    const bsWord = bs === 1 ? "slepa tačka" : bs < 5 ? "slepe tačke" : "slepih tačaka";
    return `${header("topic")}<main class="wrap">
      <div style="padding-top:22px">${kick("Tema")}</div><h1 class="page-h" style="margin-top:0">${esc(t.name)}</h1>
      <p class="page-p">${list.length} ${form(list.length, "prica")} u poslednjih ${D.hours} sati. ${who}: ${p} ${form(p, "pro_government")} i ${c} ${form(c, "critical")} ${form(c || p, "medij")}${bs ? `, uz ${bs} ${bsWord}` : ""}.</p>
      <div style="max-width:720px">${bar(agg, 12)}<div class="cov"><span class="pg"><b>${share(agg, "pro_government")}%</b> režimski</span><span>${agg.sources} objava</span><span class="cr"><b>${share(agg, "critical")}%</b> kritički</span></div></div>
      <div class="strip" style="margin-top:30px">${list.slice(0, 4).map(stripCard).join("")}</div>
      ${list.length > 4 ? `<div class="grid3" style="margin-top:28px">${list.slice(4).map(s => listItem(s, true)).join("")}</div>` : ""}
    </main>${footer()}`;
  }

  // ---------------------------------------------------------------- moja medijska ishrana
  function dietPage() {
    const d = diet(), cut = Date.now() - 30 * 864e5;
    const reads = d.reads.filter(r => r.t > cut), views = d.views.filter(r => r.t > cut);
    const split = {}; reads.forEach(r => split[r.c] = (split[r.c] || 0) + 1);
    const o = {split, sources: reads.length};
    const top = Object.entries(reads.reduce((m, r) => (m[r.s] = (m[r.s] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const p = share(o, "pro_government"), c = share(o, "critical");
    const lean = Math.abs(p - c) <= 15 ? "Čitate obe strane približno podjednako." : p > c ? "Više čitate režimske medije." : "Više čitate kritičke medije.";
    const weak = p > c ? "critical" : "pro_government";
    const sugg = D.stories.filter(s => (s.split[weak] || 0) >= 1).slice(0, 6);
    const bsViews = new Set(views.filter(v => v.bs).map(v => v.id)).size;
    const n = reads.length, word = n % 10 === 1 && n % 100 !== 11 ? "otvorenog članka" : "otvorenih članaka";
    const body = !n ? `<div class="box"><h2>Još nema podataka</h2><p>Kada otvorite članke iz priča (naslove koji vode na izvorne medije), ovde ćete videti sa koje strane najviše čitate.</p><a class="btn dark" href="#/">Na naslovnu</a></div>` : `
      <div class="box"><h2>Šta čitate</h2><p style="font-size:20px">${lean} Od ${n} ${word}, ${p}% je iz režimskih, a ${c}% iz kritičkih medija.</p>${bar(o, 14)}
        <div style="margin-top:12px">${ORDER.filter(k => split[k]).map(k => `<div class="src-row"><span>${dot(k)}${LAB[k]}</span><b>${split[k]}</b></div>`).join("")}</div></div>
      <div class="two" style="gap:24px">
        <section style="flex:1 1 360px;min-width:0"><div class="box"><h2>Najčešći izvori</h2>${top.map(([sid, k]) => `<div class="src-row"><a href="#/izvor/${encodeURIComponent(sid)}">${logo(sid, 18)}${esc(src(sid).name)}</a><span class="count">${k}</span></div>`).join("")}</div></section>
        <section style="flex:1 1 360px;min-width:0"><div class="box"><h2>Slepe tačke</h2><p>Otvorili ste ${bsViews} ${bsViews === 1 ? "priču koja je slepa tačka" : "priča koje su slepe tačke"}.</p><a class="src-link" href="#/slepe-tacke">Šta je koja strana prećutala →</a></div></section>
      </div>
      ${sugg.length ? `<div class="sec-head"><h2>Proširite vidike</h2><span class="meta">kako su iste priče preneli ${weak === "critical" ? "kritički" : "režimski"} mediji</span></div><div class="grid3">${sugg.map(s => {
        const i = s.items.find(x => camp(x.source) === weak);
        return `<div class="li"><a href="${link(s)}"><div class="hl">${esc(s.headline)}</div></a>${i ? `<a ${out(i.url, i.source)} class="meta" style="display:block;margin-top:6px">${logo(i.source, 14)}${esc(src(i.source).name)}: „${esc(tidy(i.title, 90))}“ ↗</a>` : ""}</div>`;
      }).join("")}</div>` : ""}
      <p style="margin-top:28px"><button class="btn" id="diet-clear" type="button">Obriši moje podatke</button></p>`;
    return `${header("diet")}<main class="wide"><h1 class="page-h">Moja medijska ishrana</h1>
      <p class="page-p">Koje medije čitate preko Obe strane u poslednjih 30 dana. Podaci se čuvaju samo u ovom pregledaču i nigde se ne šalju.</p>${body}</main>${footer()}`;
  }

  // ---- share row on a story: official brand glyphs from Simple Icons (CC0), the rest drawn here
  const GLYPH = {
    facebook: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
    x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
    reddit: "M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z",
    viber: "M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018z",
    whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
  };
  const sIcon = k => k === "linkedin" ? '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><text x="12" y="18" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="21" letter-spacing="-.5" fill="currentColor">in</text></svg>'
    : k === "mail" ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>'
    : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="${GLYPH[k]}"/></svg>`;
  const SAVED = "obe-strane-sacuvano";
  const saved = () => { try { const a = JSON.parse(localStorage.getItem(SAVED) || "[]"); return Array.isArray(a) ? a : []; } catch (_) { return []; } };
  const putSaved = a => { try { localStorage.setItem(SAVED, JSON.stringify(a.slice(0, 200))); } catch (_) {} };
  function shareRow(s) {
    const u = encodeURIComponent(new URL(`vest/${s.id}/`, document.baseURI).href), t = encodeURIComponent(lat(s.headline));
    const nets = [["Facebook", "facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`], ["X", "x", `https://x.com/intent/post?url=${u}&text=${t}`],
      ["LinkedIn", "linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`], ["Reddit", "reddit", `https://www.reddit.com/submit?url=${u}&title=${t}`],
      ["Viber", "viber", `viber://forward?text=${t}%20${u}`], ["WhatsApp", "whatsapp", `https://wa.me/?text=${t}%20${u}`], ["E-pošta", "mail", `mailto:?subject=${t}&body=${u}`]];
    const on = saved().some(x => x.id === s.id);
    return `<div class="shr" role="group" aria-label="Podeli vest">${nets.map(([n, k, h]) => `<a class="shr-i" href="${h}" ${h.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""} title="Podeli: ${n}" aria-label="Podeli: ${n}">${sIcon(k)}</a>`).join("")}<span class="shr-sep" aria-hidden="true"></span>
      <button class="shr-t" id="copy" type="button" title="Kopiraj link" aria-label="Kopiraj link"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/></svg></button>
      <button class="shr-t" id="save" type="button" aria-pressed="${on}" title="${on ? "Ukloni iz sačuvanih" : "Sačuvaj vest"}" aria-label="Sačuvaj vest"><svg viewBox="0 0 24 24" width="22" height="22" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg></button>
      <span class="shr-msg" id="shr-msg" role="status" aria-live="polite"></span></div>`;
  }
  function savedPage() {
    const L = saved().sort((a, b) => b.at - a.at);
    return `${header("saved")}<main class="wrap"><div class="prose"><h1 class="page-h">Sačuvane vesti</h1>
      ${L.length ? `<ul class="saved-l">${L.map(x => `<li><a href="vest/${esc(x.id)}/">${esc(x.t)}</a><button type="button" class="saved-x" data-unsave="${esc(x.id)}" aria-label="Ukloni: ${esc(x.t)}">Ukloni</button></li>`).join("")}</ul>`
        : `<p>Još nema sačuvanih vesti. Na stranici vesti pritisnite oznaku za čuvanje, pored dugmadi za deljenje.</p>`}
      <p class="meta">Sačuvane vesti pamti samo ovaj pregledač. Stare vesti mogu da nestanu sa sajta posle desetak dana.</p></div></main>${footer()}`;
  }
  // clean address of the page being read: stories have their own URL (vest/<id>/), everything else stays as is
  const shareUrl = () => { const m = location.hash.match(/^#\/vest\/([^/?]+)/) || (window.__ROUTE || "").match(/^vest\/([^/?]+)/); return m ? new URL(`vest/${m[1]}/`, document.baseURI).href : location.href; };
  // story links are real addresses (for search engines and sharing); inside the app a click opens the story without reloading
  document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]"); if (!a || a.target === "_blank") return;
    const h = a.getAttribute("href"), m = h.match(/^vest\/([^/?#]+)\/?$/);
    if (m && D && D.stories.some(x => x.id === m[1])) { e.preventDefault(); location.hash = "#/vest/" + m[1]; return; }
    // on a story's own page, links like #/izvori would resolve against the site root: keep them inside the page
    if (h.startsWith("#/") && document.baseURI.split("#")[0] !== location.href.split("#")[0]) { e.preventDefault(); location.hash = h; }
  });
  function render(nav) {
    if (!D) { app.innerHTML = `<div class="wrap empty">Podaci se još prikupljaju.</div>`; return; }
    const [page, ...rest] = (location.hash.split("?")[0].replace(/^#\/?/, "") || window.__ROUTE || "").split("/");
    const arg = decodeURIComponent(rest.join("/"));
    app.innerHTML = page === "vest" ? story(arg) : page === "rubrika" ? section(arg) : page === "slepe-tacke" ? blindspots(arg)
      : page === "izvori" ? sources() : page === "izvor" ? outletPage(arg) : page === "pretraga" ? search(arg)
      : page === "o-nama" ? about() : page === "sacuvano" ? savedPage() : page === "brifing" ? briefingPage() : page === "tema" ? topicPage(arg)
      : page === "moja-ishrana" ? dietPage() : page === "proveri" ? checkPage(arg) : page === "ton" ? tonePage() : page === "reci" ? wordsPage() : page === "citati" ? quotesPage(arg) : page === "podkasti" ? podcastsPage(arg) : page === "za-medije" ? forPublishers() : page === "najrazlicitije" ? spinPage() : home();
    if (page === "o-nama" && arg) setTimeout(() => { const t = document.getElementById(arg); if (t) t.scrollIntoView(); }, 0);
    const tog = document.querySelector(".s-tog");
    if (tog) tog.addEventListener("click", () => { const on = document.body.classList.toggle("ss"); tog.setAttribute("aria-expanded", on); if (on) { window.scrollTo(0, 0); document.getElementById("q").focus(); } });
    const f = document.getElementById("search");
    if (f) f.addEventListener("submit", e => { e.preventDefault(); const v = document.getElementById("q").value.trim(); if (v) location.hash = "#/pretraga/" + encodeURIComponent(v); });
    document.querySelectorAll(".chk-form").forEach(fm => fm.addEventListener("submit", e => { e.preventDefault(); const v = fm.u.value.trim(); location.hash = "#/proveri/" + encodeURIComponent(v); }));
    const io = document.getElementById("intro-ok");
    if (io) io.addEventListener("click", () => { try { localStorage.setItem(INTRO_KEY, "1"); } catch (_) {} const el = io.closest(".intro"); if (el) el.remove(); });
    const nl = document.getElementById("nl");
    if (nl) nl.addEventListener("submit", e => { e.preventDefault(); nl.innerHTML = '<p class="sans" style="margin:0;font-weight:600">Hvala na interesovanju! Prijava e-poštom još nije uključena, pa adresu nismo sačuvali. Do tada je brifing svako jutro ovde.</p>'; });
    const clr = document.getElementById("diet-clear");
    if (clr) clr.addEventListener("click", () => { try { localStorage.removeItem(DIET); } catch (_) {} render(); });
    const cp = document.getElementById("copy"), msg = document.getElementById("shr-msg");
    const say = m => { if (msg) { msg.textContent = m; clearTimeout(say.t); say.t = setTimeout(() => { msg.textContent = ""; }, 2200); } };
    if (cp) cp.addEventListener("click", async () => {
      try { if (navigator.clipboard) { await navigator.clipboard.writeText(shareUrl()); say("Link kopiran"); } else if (navigator.share) await navigator.share({title: document.title, url: shareUrl()}); } catch (_) {}
    });
    const sv = document.getElementById("save");
    if (sv) sv.addEventListener("click", () => {
      const m = shareUrl().match(/vest\/([^/?]+)/), id = m && m[1], st0 = D.stories.find(x => x.id === id); if (!st0) return;
      const a = saved(), has = a.some(x => x.id === id);
      putSaved(has ? a.filter(x => x.id !== id) : [{id, t: lat(st0.headline), at: Date.now()}, ...a]);
      sv.setAttribute("aria-pressed", String(!has)); sv.title = has ? "Sačuvaj vest" : "Ukloni iz sačuvanih"; sv.querySelector("svg").setAttribute("fill", has ? "none" : "currentColor");
      say(has ? "Uklonjeno iz sačuvanih" : "Sačuvano");
    });
    document.querySelectorAll("[data-unsave]").forEach(b => b.addEventListener("click", () => { putSaved(saved().filter(x => x.id !== b.dataset.unsave)); render(); }));
    document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => { const t = document.getElementById(b.dataset.go); if (t) t.scrollIntoView({behavior: "smooth"}); }));
    const st = page === "vest" && D.stories.find(x => x.id === arg);
    if (nav && st) { const d = diet(); d.views.push({id: st.id, bs: !!st.blindspot, t: Date.now()}); saveDiet(d); }
    document.title = st ? `${st.headline} — Obe strane` : "Obe strane — ista vest, dve strane";
    balanceHome();
    wireBand();
    wireSpread();
    wireWords();
    wireSort();
  }
  function wireSort() {
    const g = document.querySelector(".w-sort"); if (!g) return;
    const lists = [...document.querySelectorAll(".w-cols section")].map(sec => { const rows = [...sec.querySelectorAll(".w-row")]; rows.forEach((r, i) => r.dataset.d = i); return {sec, rows}; });
    g.addEventListener("click", e => { const b = e.target.closest("[data-sort]"); if (!b) return;
      g.querySelectorAll("[data-sort]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
      const key = b.dataset.sort;
      lists.forEach(({sec, rows}) => {
        const first = new Map(rows.map(r => [r, r.getBoundingClientRect().top]));
        rows.slice().sort((a, c) => key === "f" ? c.dataset.f - a.dataset.f : a.dataset.d - c.dataset.d).forEach(r => sec.appendChild(r));
        if (!MOTION) return;
        rows.forEach(r => { const dy = first.get(r) - r.getBoundingClientRect().top; if (!dy) return;
          r.animate([{transform: `translateY(${dy}px)`}, {transform: "none"}], {duration: 420, easing: "cubic-bezier(.2,.7,.2,1)"}); });
      }); });
  }
  // "Reči koje biraju" on a story: a word lights up in every headline that uses it; the rest fade
  function wireWords() {
    const box = document.querySelector(".sides"), chips = [...document.querySelectorAll(".w-story-box .w-chip")]; if (!box || !chips.length) return;
    let pinned = "";
    const light = st => { box.classList.toggle("hl-on", !!st);
      box.querySelectorAll(".wq").forEach(x => x.classList.toggle("lit", x.dataset.w === st));
      box.querySelectorAll(".side a").forEach(a => a.classList.toggle("has", !!st && !!a.querySelector(`.wq[data-w="${st}"]`)));
      chips.forEach(c => { c.classList.toggle("on", c.dataset.w === st); c.setAttribute("aria-pressed", c.dataset.w === pinned); }); };
    document.querySelectorAll(".hh-w").forEach(b => b.addEventListener("click", () => { const c = chips.find(c => c.dataset.w === b.dataset.w);
      if (c) { if (pinned !== c.dataset.w) c.click(); box.scrollIntoView({behavior: MOTION ? "smooth" : "auto", block: "start"}); } }));
    chips.forEach(c => {
      c.addEventListener("mouseenter", () => light(c.dataset.w));
      c.addEventListener("mouseleave", () => light(pinned));
      c.addEventListener("focus", () => light(c.dataset.w));
      c.addEventListener("blur", () => light(pinned));
      c.addEventListener("click", () => { pinned = pinned === c.dataset.w ? "" : c.dataset.w; light(pinned); });
    });
  }
  function balanceHome() {
    const f = document.querySelector(".lv-fill"); if (!f) return;
    const items = [...f.children]; items.forEach(x => x.hidden = false);
    const hero = document.querySelector(".lv-hero"), L = document.querySelector(".lv-left"), R = document.querySelector(".lv-right");
    const top = hero.getBoundingClientRect().top, side = [L, R].filter(e => e && Math.abs(e.getBoundingClientRect().top - top) < 4);
    if (!side.length) { items.forEach((x, i) => x.hidden = i >= 4); return; }
    const target = Math.max(...side.map(e => e.offsetHeight));
    let n = items.length - (items.length > 1 ? items.length % 2 : 0); items.forEach((x, i) => x.hidden = i >= n);
    while (n > 0 && hero.offsetHeight > target + 24) { n -= 2; items.forEach((x, i) => x.hidden = i >= n); }
    f.hidden = n <= 0;
  }
  window.addEventListener("resize", () => { clearTimeout(window.__bt); window.__bt = setTimeout(balanceHome, 120); });
  if (document.fonts) document.fonts.ready.then(balanceHome);
  window.addEventListener("hashchange", () => { window.__ROUTE = ""; render(true); if (!/^#\/o-nama\/./.test(location.hash)) window.scrollTo(0, 0); if (window.obeTrack) window.obeTrack(); });
  setInterval(() => {
    const s = document.createElement("script");
    s.src = "data.js?t=" + Date.now();
    s.onload = () => { const y = window.scrollY; D = prep(window.NEWS_DATA); render(); window.scrollTo(0, y); s.remove(); };
    document.body.appendChild(s);
  }, 5 * 60 * 1000);
  render(true);
  window.__spa = true;
  if (window.obeTrack) window.obeTrack();
})();
