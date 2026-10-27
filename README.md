# The Campus Kitchen at Northwestern University: website

The public website for CKNU. It's a single page with these sections: our impact (live numbers), how it works (recover, prep, deliver), get involved (volunteer, shift lead, partner with us), and contact. There's also a **Team login** button that links to the CKNU food tracker shift leads use (https://cknu-tracker.pages.dev).

- **Live site:** https://cknu.org (also www.cknu.org), once GitHub Pages and the DNS are set up (see below)
- **Hosting:** GitHub Pages. It's free, with no deploy limits, and updates about a minute after each change to `main`.

## Turning on GitHub Pages (one time)

1. In this repo, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose branch **main** and folder **/ (root)**, then tap **Save**.
3. After a minute or two, the site is live. The Pages settings page shows the link once it's ready.

## The cknu.org domain

The domain is registered with **Squarespace** (Domains → cknu.org → DNS). The `CNAME` file in this repo tells GitHub Pages to serve the site at `cknu.org`; don't delete it.

**DNS records in Squarespace (custom records):**

| Type | Host | Data |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `campuskitchen-ops.github.io` |
| TXT | `_github-pages-challenge-campuskitchen-ops` | The verification code from the campuskitchen-ops account's GitHub **Settings → Pages → Verified domains** |

The Squarespace Defaults preset (the A records pointing at Squarespace) must be removed, or cknu.org keeps showing Squarespace.

After the DNS is set, go to this repo's **Settings → Pages**: **Custom domain** should show `cknu.org` with a green tick. Then turn on **Enforce HTTPS** (it can take up to an hour or so to become available).

**cknu.org is verified on the campuskitchen-ops GitHub account**, so only repos owned by that account can use it. If this repo ever moves to another account or organization, verify cknu.org there first (a new TXT record like the one above, with that account's name), remove it from the old account's verified domains, and re-enter `cknu.org` under **Custom domain**. Otherwise cknu.org shows GitHub's "Site not found" page after the next change. That happened in October 2026 when the repo moved here from dylankiellstone-ops.

## Editing the site

Everything is plain HTML and CSS, with no build step:

```
index.html     all the page text and sections
styles.css     colours, fonts and layout
script.js      the phone menu, the live impact numbers and the copyright year
signup.html    the volunteer shift sign-up page (cknu.org/signup.html)
signup.js      loads open shifts from the tracker, signs people up, cancel links
assets/        logos, favicon and phone home-screen icon
```

- **After changing `styles.css` or `script.js`:** bump the `?v=` number on their two lines in `index.html` (any new number, such as today's date and time). Otherwise phones can keep using the old file for a while and the page can look broken.
- **Changing words:** edit `index.html` on GitHub (open the file, tap the ✏️ pencil, then **Commit changes**). The site updates in about a minute.
- **Contact details** appear in two places in `index.html`: the Get involved links and the Say hi section.
- **Our impact numbers:** the history is written into the `#impact` section of `index.html` and the `HISTORY` numbers at the top of the impact code in `script.js`. They come from CKNU's recovery spreadsheets in the campuskitchen@ Google Drive (CKNU Recovery Tracker 2023-2024, 2024-2025 and 2025-2026), fall 2023 to spring 2026:
  - **Pounds rescued:** every logged item's weight added up: 3,397 lbs (2023–24), 2,799 lbs (2024–25), 3,942 lbs (2025–26), 10,139 lbs. Plus 351 lbs from the first week of fall 2026 that wasn't logged in the tracker (3 × (17 + 15 + 10 + 12 + 12 + 14 + 7 + 30)), added by hand as `THIS_YEAR_EXTRA_POUNDS` in `script.js`; it shows in the 2026–27 bar along with the tracker's live pounds. 10,490 lbs in all.
  - **Meals prepped:** 7,014, of which 1,946 were counted and 5,068 are estimated. Meals from fall 2026 on are counted in the tracker and added live.
    - Counted, from the Meal Count tabs: 1,355 (fall 2025) and 591 (winter 2026).
    - Estimated for the quarters nobody counted meals (fall 2023 to spring 2025, and spring 2026): the counted quarters made 1,946 meals from 2,813 lbs of recovered food, about 0.69 meals per pound. The uncounted quarters recovered 7,326 lbs, which works out to about 5,068 meals. (No one logged which food went into which meals, so this uses all the food recovered.)
  - **Food partners (11):** Athletics, Allen Center, Elder, Global Hub, Hillel, Norris Catering, Norris Retail, Sargent, Allison and Plex (from the recovery spreadsheets), plus Meals on Wheels Northeast Illinois. Update the number on the card in `index.html` as partners are added.
  - **Community fridges:** the five Evanston Community Fridges.
  - From fall 2026 on, logging happens in the CKNU food tracker, and the page adds its live totals (its `public_impact` function, which only shares totals) on top of the history and shows this year's bar. If the tracker can't be reached, the history still shows.
  - **Exact numbers:** the cards show exact totals (10,490 lbs and 7,014 meals, plus whatever the tracker adds). The yearly bars are exact pounds too. The opening paragraph at the top of the page says "over 10,000 pounds of food and over 7,000 meals"; update it by hand as the totals grow.
  - **At the end of each school year,** add that year's tracker total to `HISTORY` and as a new bar in `index.html`, or leave it live; just don't do both, or it counts twice.
- **Where we deliver (map):** the five Evanston Community Fridges are listed twice: as cards in the `#fridges` section of `index.html`, and in `FRIDGES` at the bottom of `script.js` (name, address, host, map position, and the address used for directions). Change both if a fridge moves. The map uses Leaflet and OpenStreetMap (free, no account); if they can't load, the cards still show everything.
- **Find our kitchen:** the `#find-us` section of `index.html` has the address (1835 Hinman Ave), walking directions (the same ones as the shift sign-up sheet's "Read this first" tab), and the location map image `assets/hinman-map.jpg`. Update both the site and the sign-up sheet if the entrance changes.
- **Shift sign-up page:** `signup.html` shows every open shift, straight from the tracker's schedule (`open_shifts`). Shifts open two weeks at a time: every other Wednesday at 10:30 AM the next two weeks (Sunday to Saturday) open, and the page says when the next ones open (`signup_window`). That schedule lives in the tracker's database (its `supabase/setup.sql`), not here. If the time changes, also update the intro in `signup.html`, which mentions 10:30 AM. Volunteers pick shifts, enter their name and Northwestern email (any address ending in northwestern.edu, Kellogg included), and get calendar links plus a cancel link. They also need to be in this school year's **Volunteer Directory** (counted from Sep 1). If they aren't, the page asks the directory questions (phone number, anything else for the shift lead) right there: their answers go into the tracker straight away, so they can sign up immediately, and to the Volunteer Directory Google Form, so its response sheet stays complete. If that form's questions are ever replaced, update `DIRECTORY_FORM` and `DIRECTORY_FIELDS` at the top of `signup.js` (the entry numbers come from the form's ⋮ → **Get pre-filled link**). To cancel, volunteers use the cancel link in their confirmation, or **Can't make a shift? Cancel it here** on the same page: they type their email and see their upcoming shifts, each with a Cancel button (`my_signups`). The email is all it takes, so anyone who knows a volunteer's email could cancel their shifts; that was chosen to keep it simple. Shifts, spots per shift and breaks are all edited in the tracker's Shifts tab, not here. After changing `signup.js` or `styles.css`, bump the `?v=` numbers in `signup.html` too.
- **Team login link:** the button at the top and the link in the footer both go to the food tracker at `https://cknu-tracker.pages.dev` (on Cloudflare Pages; it used to be on Netlify). If the tracker moves, search `index.html` for `cknu-tracker.pages.dev` and replace both copies.
- **Photos:** none on the page for now. The stock photos were taken down until CKNU has good photos of its own. Real photos waiting to go up are saved in `assets/photos/` (not shown anywhere yet): `delivery.jpg` (a delivery to a community fridge) and `meal-prep.jpg` (packed meals in the prep kitchen). Still needed: a recover photo. The plan is to add a photo section once there are three (one each for recover, prep and deliver). The old photo section and its tap-to-enlarge pop-up are in the git history (commit `b902cb0`); keep each photo under about 500 KB.

## Brand rules (from the CKNU Brand Guidelines)

The site follows these, so keep them when editing:

- **Logo:** never stretch or distort it. Only recolour it to all black or all white. The logo files in `assets/` came straight from the brand guide; the lockup's off-white background was cleaned to pure white.
- **Backgrounds:** plain white (`#ffffff`), never off-white, because not all of the logos are transparent PNGs.
- **Fonts:** all-caps sans serif for headings (Oswald). Plain, readable sans serif for body text (Arial / Calibri). No serif fonts.
- **Colours:**

  | Name in `styles.css` | Hex | Used for |
  |---|---|---|
  | `--purple` | `#3A1A5B` | Main brand colour: headings, buttons, logo |
  | `--sage` | `#8DB9A5` | "Recover" step |
  | `--periwinkle` | `#8186D9` | Volunteer card, focus outlines |
  | `--rose` | `#CB7C80` | "Deliver" step |
  | `--gold` | `#E8C687` | "Prep" step |
  | `--teal` | `#214D5B` | Labels, button hover |
  | `--slate` | `#67828E` | Available |
  | `--green` | `#86AC7B` | Shift lead card |
  | `--forest` | `#264027` | Available |

- **Tone:** informal, personal, and always positive and encouraging.
- **Wording:**
  - The full name is "The Campus Kitchen at Northwestern University": always "The", everything capitalised except "at".
  - The short names are "CKNU" or "Campus Kitchen". Never "NUCK", "The Campus Kitchen" on its own, or "Campus Kitchens".
  - "shift leads" is always lower case.
  - It's the "Campus Kitchen Executive Board", or just "exec board".

## Contact

- Email: campuskitchen@u.northwestern.edu
- Instagram and Twitter / X: [@NUCampusKitchen](https://www.instagram.com/NUCampusKitchen)
