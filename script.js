// Mobile menu: open/close, and close after tapping a link.
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");

function setMenu(open) {
  nav.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Close" : "Menu";
}

toggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

// Keep the copyright year current.
document.getElementById("year").textContent = new Date().getFullYear();

// Our impact: history from CKNU's recovery spreadsheets, plus live totals from the
// CKNU food tracker (which took over logging in fall 2026). Only totals are public;
// the tracker's database keeps everything else private. If the live numbers can't be
// loaded, the page just shows the history already written in index.html.
const HISTORY = {
  pounds: 10139, // logged in the recovery spreadsheets, fall 2023 to spring 2026
  // 1,946 counted (fall 2025 and winter 2026), plus about 5,068 estimated for the quarters
  // that weren't counted, at the counted quarters' rate: 1,946 meals from 2,813 lbs of
  // food, about 0.69 meals per pound. Meals from fall 2026 on come from the tracker.
  meals: 7014,
  biggestYear: 3942, // 2025-26, for scaling the bars
};
// 2026-27 food recovered but not logged in the tracker, added by hand:
// 3 x (17 + 15 + 10 + 12 + 12 + 14 + 7 + 30) = 351 lbs, the first week of fall 2026.
const THIS_YEAR_EXTRA_POUNDS = 351;
const IMPACT_URL = "https://otsgpdlhjulixxqejkzk.supabase.co/rest/v1/rpc/public_impact";
// The tracker's publishable key. It's designed to be public.
const IMPACT_KEY = "sb_publishable_kUaii2SF5CKZDlovSbuNng_-UVfHbQS";

function formatCount(value) {
  return Math.round(value).toLocaleString("en-US");
}


async function addLiveImpact() {
  try {
    const response = await fetch(IMPACT_URL, {
      method: "POST",
      headers: { apikey: IMPACT_KEY, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) return;
    const live = await response.json();
    const pounds = (Number(live.pounds_rescued) || 0) + THIS_YEAR_EXTRA_POUNDS;
    const meals = Number(live.meals_made) || 0;
    document.getElementById("impact-pounds").textContent = formatCount(HISTORY.pounds + pounds);
    document.getElementById("impact-meals").textContent = formatCount(HISTORY.meals + meals);

    // This school year's bar: the tracker's pounds plus the food added by hand.
    const thisYear = document.getElementById("impact-this-year");
    const biggest = Math.max(HISTORY.biggestYear, pounds);
    thisYear.querySelector(".year-value").textContent = formatCount(pounds);
    thisYear.querySelector(".year-bar span").style.setProperty("--share", `${(pounds / biggest) * 100}%`);
    // If this year overtakes the record, rescale the earlier bars to match.
    if (pounds > HISTORY.biggestYear) {
      for (const bar of document.querySelectorAll("#impact-years li:not(#impact-this-year)")) {
        const value = Number(bar.querySelector(".year-value").textContent.replace(/,/g, ""));
        bar.querySelector(".year-bar span").style.setProperty("--share", `${(value / biggest) * 100}%`);
      }
    }
  } catch {
    // Offline or the tracker is down: the history in index.html stays as it is.
  }
}
addLiveImpact();

// Where we deliver: a map of the five community fridges (Leaflet + OpenStreetMap).
// If the map library can't load, the fridge cards below it still show everything.
const FRIDGES = [
  { name: "The Soul Fridge", address: "1601 Payne Street", host: "Soul & Smoke", lat: 42.05716, lng: -87.69460, map: "1601 Payne St, Evanston, IL" },
  { name: "The CNE Fridge", address: "1335 Dodge Avenue", host: "Childcare Network of Evanston", lat: 42.04247, lng: -87.69888, map: "1335 Dodge Ave, Evanston, IL" },
  { name: "The Sunrise Fridge", address: "620 Madison Street", host: "Reba Place Church", lat: 42.03153, lng: -87.68003, map: "620 Madison St, Evanston, IL" },
  { name: "The Hearts + Hands Fridge", address: "1928 Darrow Avenue", host: "St. Andrew's Church", lat: 42.05316, lng: -87.69777, map: "1928 Darrow Ave, Evanston, IL" },
  { name: "The WCE Fridge", address: "615 Church Street (in the alley)", host: "Woman's Club of Evanston", lat: 42.04812, lng: -87.68062, map: "615 Church St, Evanston, IL" },
];

function showFridgeMap() {
  const box = document.getElementById("fridge-map");
  if (!box || !window.L) return;
  box.hidden = false;
  const map = L.map(box, { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const points = FRIDGES.map((fridge, i) => {
    const icon = L.divIcon({ className: "", html: `<span class="fridge-pin">${i + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fridge.map)}`;
    const popup = document.createElement("div");
    const title = document.createElement("b"); title.textContent = fridge.name;
    const where = document.createElement("div"); where.textContent = `${fridge.address}, ${fridge.host}`;
    const link = document.createElement("a"); link.href = directions; link.rel = "noopener"; link.textContent = "Directions →";
    popup.append(title, where, link);
    L.marker([fridge.lat, fridge.lng], { icon, title: fridge.name, alt: fridge.name }).addTo(map).bindPopup(popup);
    return [fridge.lat, fridge.lng];
  });
  map.fitBounds(points, { padding: [36, 36] });
}
showFridgeMap();
