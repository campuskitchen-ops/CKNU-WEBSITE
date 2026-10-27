// CKNU shift sign-up: lists the open shifts from the food tracker's database (they open
// two weeks at a time, every other Wednesday) and signs volunteers up. Only totals and the
// volunteer's own sign-ups ever come back; nobody else's name or email is public.
const SUPABASE_URL = "https://otsgpdlhjulixxqejkzk.supabase.co";
// The tracker's publishable key. It's designed to be public.
const SUPABASE_KEY = "sb_publishable_kUaii2SF5CKZDlovSbuNng_-UVfHbQS";
const KITCHEN_ADDRESS = "1835 Hinman Ave, Evanston, IL 60201";
const SITE = "https://cknu.org";
// Any Northwestern address: @u.northwestern.edu, @kellogg.northwestern.edu and so on.
const NU_EMAIL = /^[^@\s]+@([a-z0-9-]+\.)*northwestern\.edu$/i;
// The Volunteer Directory Google Form. New volunteers answer its questions on this page, and
// they're sent to the form too so its response sheet stays complete. If the form's questions
// are replaced, get the new entry numbers from its "Get pre-filled link" and update them here.
const DIRECTORY_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSfnrxlcAiUZ7Djp8qQmN8zsRhXvfELrPON_q7XmXcgrRSg3ow/formResponse";
const DIRECTORY_FIELDS = { name: "entry.2076689688", phone: "entry.1758621544", email: "entry.1435115760", notes: "entry.1851840888" };

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children) if (child != null && child !== false) node.append(child);
  return node;
}

async function rpc(name, args = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.hint = data?.hint;
    throw error;
  }
  return data;
}

// ----- Dates and times (shift times are Evanston time) -----

function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDay(iso) {
  return parseDate(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

function shiftLabel(shift) {
  return `${shift.kind}, ${formatTime(shift.starts_at)}–${formatTime(shift.ends_at)}`;
}

// The UTC instant of a date + time in Chicago, for calendar invites.
function chicagoToUTC(iso, time) {
  const [y, m, d] = iso.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  const offsetText = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", timeZoneName: "shortOffset" })
    .formatToParts(guess).find((part) => part.type === "timeZoneName")?.value || "GMT-6";
  const offsetHours = Number(offsetText.replace("GMT", "") || 0);
  return new Date(guess.getTime() - offsetHours * 3600000);
}

function calendarStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function cancelLink(token) {
  return `${SITE}/signup.html?cancel=${token}`;
}

// ----- Remembering the volunteer's details on this device -----

function remember(name, email) {
  try { localStorage.setItem("cknu-volunteer", JSON.stringify({ name, email })); } catch {}
}

function recall() {
  try { return JSON.parse(localStorage.getItem("cknu-volunteer") || "null"); } catch { return null; }
}

// ----- Picking shifts -----

let openShifts = [];

// "Nov 15–28", or "Nov 29–Dec 12" across two months.
function formatRange(fromIso, toIso) {
  const from = parseDate(fromIso);
  const to = parseDate(toIso);
  const month = (date) => date.toLocaleDateString("en-US", { month: "short" });
  return from.getMonth() === to.getMonth()
    ? `${month(from)} ${from.getDate()}–${to.getDate()}`
    : `${month(from)} ${from.getDate()}–${month(to)} ${to.getDate()}`;
}

// "Wednesday, Nov 11 at 10:30 AM", in Evanston time.
function formatOpening(dates) {
  if (!dates.next_opens_at) return formatDay(dates.next_opens_on);
  const time = new Date(dates.next_opens_at)
    .toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
  return `${formatDay(dates.next_opens_on)} at ${time}`;
}

// Shifts open two weeks at a time (the tracker's signup_window). Empty when nothing more is
// scheduled, e.g. at the end of the quarter.
function nextBatchText(dates) {
  return dates?.next_opens_on
    ? `The next two weeks (${formatRange(dates.next_open_from, dates.next_open_until)}) open on ${formatOpening(dates)}.`
    : "";
}

async function loadShifts() {
  const picker = $("shift-picker");
  let dates = null;
  try {
    // The page still works if signup_window isn't in the database yet; it just skips the dates.
    [openShifts, dates] = await Promise.all([
      rpc("open_shifts"),
      rpc("signup_window").then((rows) => rows?.[0] || null).catch(() => null),
    ]);
  } catch {
    picker.replaceChildren(el("p", { class: "signup-error" },
      "Sign-ups aren't working right now. Email campuskitchen@u.northwestern.edu and we'll get you on a shift."));
    return;
  }
  const next = nextBatchText(dates);
  if (openShifts.length === 0) {
    picker.replaceChildren(el("p", {}, `No shifts are open right now. ${next || "Check back soon!"}`));
    return;
  }
  $("signup-window").textContent = next;
  $("signup-window").hidden = !next;
  let day = "";
  const parts = [];
  for (const shift of openShifts) {
    if (shift.shift_date !== day) {
      day = shift.shift_date;
      parts.push(el("h2", { class: "picker-day" }, formatDay(day)));
    }
    const left = Math.max(0, shift.capacity - shift.taken);
    const box = el("input", { type: "checkbox", value: `${shift.slot_id}|${shift.shift_date}`, disabled: left === 0 });
    box.addEventListener("change", updateButton);
    parts.push(el("label", { class: `pick ${left === 0 ? "full" : ""}` },
      box,
      el("span", { class: "pick-name" }, el("b", {}, shift.kind), ` ${formatTime(shift.starts_at)}–${formatTime(shift.ends_at)}`),
      el("span", { class: `pick-spots ${left === 0 ? "none" : left === 1 ? "last" : ""}` },
        left === 0 ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`)));
  }
  picker.replaceChildren(...parts);
  updateButton();
}

function chosenShifts() {
  return [...document.querySelectorAll("#shift-picker input:checked")].map((box) => {
    const [slotId, date] = box.value.split("|");
    return { slot_id: Number(slotId), shift_date: date };
  });
}

function updateButton() {
  const count = chosenShifts().length;
  const button = $("signup-btn");
  const joining = !$("directory").hidden;
  button.disabled = count === 0;
  button.textContent = count === 0 ? "Pick a shift"
    : `${joining ? "Join and sign up" : "Sign up"} for ${count} shift${count === 1 ? "" : "s"}`;
}

// The tracker turns away anyone not in this school year's Volunteer Directory; ask its
// questions right here instead of sending them off to the Google Form.
function showDirectory() {
  const directory = $("directory");
  directory.hidden = false;
  updateButton();
  directory.scrollIntoView({ behavior: "smooth", block: "center" });
  $("signup-form").phone.focus({ preventScroll: true });
}

// Google Forms doesn't let another site read its reply, so this can't confirm the answers
// landed in the sheet; the tracker keeps its own copy either way.
function addToDirectoryForm(answers) {
  const body = new URLSearchParams();
  for (const [key, field] of Object.entries(DIRECTORY_FIELDS)) body.append(field, answers[key] || "");
  return fetch(DIRECTORY_FORM, { method: "POST", mode: "no-cors", keepalive: true, body }).catch(() => {});
}

async function submit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = $("signup-error");
  error.textContent = "";
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const shifts = chosenShifts();
  const joining = !$("directory").hidden;
  const phone = form.phone.value.trim();
  const notes = form.notes.value.trim();
  if (!shifts.length) return void (error.textContent = "Pick at least one shift.");
  if (!name) return void (error.textContent = "Enter your name.");
  if (!NU_EMAIL.test(email)) return void (error.textContent = "Use your Northwestern email (it ends in northwestern.edu).");
  if (joining && phone.replace(/\D/g, "").length < 7) {
    error.textContent = "Add your phone number so your shift lead can reach you.";
    return void form.phone.focus();
  }

  const button = $("signup-btn");
  button.disabled = true;
  button.textContent = "Signing you up…";
  let results;
  try {
    if (joining) {
      await rpc("join_volunteer_directory", { p_name: name, p_email: email, p_phone: phone, p_notes: notes });
      addToDirectoryForm({ name, email, phone, notes });
      $("directory").hidden = true; // they're in now, so trying again won't add them twice
    }
    results = await rpc("sign_up_for_shifts", { p_name: name, p_email: email, p_shifts: shifts });
  } catch (err) {
    if (err.hint === "not_in_directory") return void showDirectory();
    error.textContent = err.status === 400 && err.message ? err.message : "Couldn't sign you up. Check your connection and try again.";
    updateButton();
    return;
  }
  remember(name, email);
  showDone(results.map((result) => ({ ...result, shift: openShifts.find((s) => s.slot_id === result.slot_id && s.shift_date === result.shift_date) })));
}

// ----- Confirmation, calendar invites and cancel links -----

function showDone(results) {
  const ok = results.filter((r) => r.result === "ok" && r.shift);
  const words = { full: "That shift just filled up. Pick another one?", already: "You were already signed up for this one.", closed: "Sign-up for this shift has closed." };
  const done = $("signup-done");
  done.replaceChildren(
    el("h2", {}, ok.length ? "You're signed up! 🎉" : "No new shifts this time"),
    el("ul", { class: "done-list" }, ...results.map((r) => el("li", { class: r.result },
      el("b", {}, r.shift ? `${formatDay(r.shift.shift_date)} · ${shiftLabel(r.shift)}` : "A shift"),
      r.result === "ok"
        ? el("span", {}, " ✅ ",
            el("a", { href: googleCalendarLink(r), target: "_blank", rel: "noopener" }, "Google Calendar"), " · ",
            el("a", { href: cancelLink(r.cancel_token) }, "Can't make it? Cancel"))
        : el("span", { class: "muted" }, ` ${words[r.result] || ""}`)))),
    ok.length > 0 && el("p", {}, el("button", { type: "button", class: "button", onclick: () => downloadCalendar(ok) }, "Add to my calendar")),
    ok.length > 0 && el("p", { class: "signup-warning" }, "Add it to your calendar or save this page: the invite has your cancel link, in case you can't make it."),
    el("p", {}, "See you at 1835 Hinman! ", el("a", { href: "./#find-us" }, "How to find us"), "."),
    el("p", {}, el("button", { type: "button", class: "button button-outline", onclick: () => location.reload() }, "Sign up for more shifts")),
  );
  $("signup-form").hidden = true;
  done.hidden = false;
  done.scrollIntoView({ behavior: "smooth", block: "start" });
}

function eventDetails(r) {
  return `Your CKNU ${r.shift.kind.toLowerCase()} shift at 1835 Hinman Ave. Wear long pants and closed-toe shoes. ` +
    `How to find us: ${SITE}/#find-us\nCan't make it? Cancel your spot: ${cancelLink(r.cancel_token)}`;
}

function googleCalendarLink(r) {
  const start = chicagoToUTC(r.shift.shift_date, r.shift.starts_at);
  const end = chicagoToUTC(r.shift.shift_date, r.shift.ends_at);
  const params = new URLSearchParams({
    action: "TEMPLATE", text: `CKNU ${r.shift.kind} shift`, dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    location: KITCHEN_ADDRESS, details: eventDetails(r),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function icsText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

function downloadCalendar(ok) {
  const now = calendarStamp(new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CKNU//Shift sign-up//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const r of ok) {
    lines.push("BEGIN:VEVENT",
      `UID:${r.cancel_token}@cknu.org`,
      `DTSTAMP:${now}`,
      `DTSTART:${calendarStamp(chicagoToUTC(r.shift.shift_date, r.shift.starts_at))}`,
      `DTEND:${calendarStamp(chicagoToUTC(r.shift.shift_date, r.shift.ends_at))}`,
      `SUMMARY:${icsText(`CKNU ${r.shift.kind} shift`)}`,
      `LOCATION:${icsText(KITCHEN_ADDRESS)}`,
      `DESCRIPTION:${icsText(eventDetails(r))}`,
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:CKNU shift in an hour", "END:VALARM",
      "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = el("a", { href: URL.createObjectURL(blob), download: "cknu-shifts.ics" });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

// ----- Cancelling from a confirmation link -----

function showCancel(token) {
  $("signup").hidden = true;
  $("cancel").hidden = false;
  $("cancel-btn").addEventListener("click", async () => {
    $("cancel-error").textContent = "";
    $("cancel-btn").disabled = true;
    try {
      const [result] = await rpc("cancel_signup", { p_token: token });
      $("cancel-text").textContent = result.already_cancelled
        ? `You'd already cancelled ${result.kind} on ${formatDay(result.shift_date)}. You're all set.`
        : `You're off ${result.kind} on ${formatDay(result.shift_date)} at ${formatTime(result.starts_at)}. Thanks for letting us know!`;
      $("cancel-btn").hidden = true;
    } catch (err) {
      $("cancel-error").textContent = err.status === 400 || err.status === 404
        ? "That cancel link isn't valid. Email campuskitchen@u.northwestern.edu and we'll take you off."
        : "Couldn't cancel. Check your connection and try again.";
      $("cancel-btn").disabled = false;
    }
  });
}

const cancelToken = new URLSearchParams(location.search).get("cancel");
if (cancelToken && /^[0-9a-f-]{36}$/i.test(cancelToken)) {
  showCancel(cancelToken);
} else {
  const saved = recall();
  if (saved) {
    $("signup-form").name.value = saved.name || "";
    $("signup-form").email.value = saved.email || "";
  }
  $("signup-form").addEventListener("submit", submit);
  loadShifts();
}
