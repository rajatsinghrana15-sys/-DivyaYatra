# Changes (v4)

## Bugs fixed
- App crashed on load: `useApp` was not imported in `App.jsx`.
- Homepage/Footer/Trip page crashed when the admin phone setting was empty.
- Fonts `Manrope`, `DM Sans`, `Georgia` were never loaded; now use the site fonts.
- Text of 7–11px raised to 11–13px.

## Clean-up
- Removed unused imports and unused context fields in 13 files.
- Removed 68 unused CSS rules and the old loader CSS.

## Destinations
- New shared `DestinationSelect` (with an "Other – type your destination" option) used in the homepage filter and trip request form.
- Empty search result offers "Request a trip to <place>".
- Family request and admin trip form suggest places but accept any text.

## Layout
- `responsive.css`: fluid page width for large screens (up to 2300px+), tablet hamburger menu, phone app shell (compact top bar, bottom tab bar, bottom-sheet modals, 16px inputs, safe areas).
- PWA: `manifest.webmanifest`, Apple meta tags, new icons.

## Brand
- New app icon (sun, peaks, road) in SVG and PNG, used in header, footer and loaders.
- New startup and action loaders (`loaders.css`).

# v5
- Removed the "Destinations and packages" search/filter block from the homepage.
- "Share your journey" moved from the homepage into the client dashboard (Share memories tab) as a 3-step flow: trip + type, media (device upload or pasted link), UPI payment + UTR.
- Instagram, Facebook and YouTube links now render as embeds (new services/media.js and MediaView); direct image/video HTTPS links also work. Admin preview supports them too.
- Client dashboard: greeting, stats cards (upcoming, completed, total spent), tabs.
- polish.css: responsive and app-like layout for the new screens.
- Admin dashboard: permanent grouped sidebar (Main / Operations / Catalogue / Community / Settings) with icons and a pending-bookings badge; horizontal scroll tabs on tablet/phone.
- Bookings: search box and status chips, sticky table header, roomier rows. Overview shows a "bookings need action" alert.
- Action dropdowns (Edit / Delete / View / Call / WhatsApp / Email) on trips, categories, vehicles, bookings, travellers, workers; global "+ Create" menu in the admin header.
- Workers: admin creates worker accounts (Workers section), picks which sections each can manage, can reset password, disable or delete. Workers log in with email/password and get their own dashboard showing only allowed sections. Server enforces the permissions per route; refunds, website settings and worker management stay admin-only.
- Users can remove their own shared photo/video from Dashboard > Share memories > "Your shared memories" (new routes GET /api/gallery/mine, DELETE /api/gallery/mine/:id).
- "Use my current location" button on pickup fields (home trip request, booking door-to-door pickup, family request). Uses the device GPS and OpenStreetMap Nominatim to fill the address.
- Videos: cinematic card with play overlay, duration badge, dark video gallery with a featured first video; embeds show a platform badge.
- Family: users' family requests and the Family packages list now live in the user dashboard (Family trips tab); admin Family requests have Call / WhatsApp / Email / map actions.
- Location button shows a permission popup (Allow / blocked-help steps). Note: phones on a http://192.168.x.x address cannot use GPS; run `npm run dev:https` (client) or deploy on HTTPS.

# V6 completion fixes
- Fixed the HTTPS development command for Windows and forwarded Vite command-line options.
- Moved admin dashboard permission redirects into an effect to avoid scheduling state changes during render.
- Added a traveller dashboard page for tracking custom trip request status, quotes and admin notes, with automatic refresh.
- Made MongoDB startup failures show a direct configuration hint and exit after a bounded connection attempt.
- Matched the admin seed script password minimum to the documented 12-character requirement.
