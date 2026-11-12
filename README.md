# Yatra Sang Raghuvanshi — simple local setup

This project has two independent apps. Install and run each from its own folder; the project root does not need npm commands or dependencies.

- `client/` — React + Vite website
- `server/` — Express + MongoDB API

## One-time setup

Install Node.js 18 or newer and connect MongoDB Atlas (recommended) or a local MongoDB replica set. Bookings use MongoDB transactions, so a standalone local MongoDB server is not sufficient.

### Configure the backend

1. Open `server/.env.example`, make a copy in the same folder, and name the copy `.env`.
2. In `server/.env`, set `MONGODB_URI`, a long random `JWT_SECRET`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters.
3. Open a terminal in the `server` folder and run these commands one at a time:

```powershell
npm install
npm run seed:admin
npm run dev
```

Leave this terminal running. The API starts at `http://localhost:5000`.

### Run the website

Open a **second** terminal in the `client` folder and run:

```powershell
npm install
npm run dev
```

Leave this terminal running too. Open `http://localhost:5173` in your browser. Vite forwards `/api` requests to the backend at port 5000; this proxy is configured in `client/vite.config.js`, so there is no separate proxy command.

## Sample trips

The API adds four illustrative journeys to an empty database. Destinations, dates, itineraries, prices, and included services are samples. Confirm them with the client and edit them from the Admin dashboard before launch.

## Roles and features

- Visitors can browse/search trips and see trip details.
- Users can create an account, request bookings, see their bookings, and cancel eligible trips.
- Admins can manage trips, categories, bookings, vehicles, family trip requests, and business settings.
- Families can request a private trip and choose a vehicle that is free on their dates (see CHANGES.md, Update 4).

From the admin dashboard, admins can add, edit, or delete trips and categories, review trip photos and details, update booking statuses, and edit the homepage title, intro, About text, quote, brand images, and contact links. The avatar opens the account menu; sign-out is a separate menu action.

Use the admin email and password set in `server/.env` to sign in to the admin account. Never share or publish the `.env` file.

## WhatsApp booking updates

The backend can send WhatsApp messages for booking requests, cancellations, and admin booking status changes. The traveller must tick the WhatsApp consent box in the booking form. To enable delivery:

1. Configure a WhatsApp Business Platform Cloud API sender in Meta and get its access token and phone number ID.
2. Create and get approval for the `trip_booking_update` Utility message template in the selected language. It needs four body placeholders in this order: traveller name, trip title, booking status/update, departure date.
3. Put `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, and optionally `WHATSAPP_API_VERSION` in `server/.env`, then restart the backend.

The matching blank variables are in `server/.env.example`. Keep the access token private. If these credentials are blank, bookings still work and no WhatsApp messages are sent.

The booking form records passenger totals by adult men, adult women, and children; it does not ask for individual passenger names. Admins can review these counts, contact details, seats, and trip in the dashboard. The dashboard sidebar jumps to Overview, Trips, Upcoming departures, Categories, Bookings, Travellers, and Website settings.

## Trip and brand photos

In the admin trip editor, paste image URLs or choose up to six photos from the device. Brand settings also accept device uploads for the logo and homepage hero image. Uploaded files are resized in the browser and saved with their trip or brand settings in MongoDB; the API accepts JSON requests up to 16 MB to support small memory videos. The website shows an animated startup screen and uses a custom mountain favicon in the browser tab.

## Trip types and pickup plans

Admins can choose General trip, Pilgrimage, or Family vacation package. Pilgrimage trips require one or two pickup points in a named city; travellers select one when booking. Family vacation packages use door-to-door pickup; travellers enter their address during booking, and admins can review it with the booking. Admins can set vacation/holiday departure dates and pickup coverage notes. Trip type and pickup information appear in trip cards and on the trip details page.

The homepage catalogue shows destination, trip details, next departure, pickup plan, and per-person price. The Family holidays page lists only family vacation packages. Users also have a Trip help page with their pickup map, booking status, cancellation amount, and refund status. Pickup point changes made by an admin are refreshed on the website about every 12 seconds. A custom pickup map link may be added for each point; otherwise the page builds a Google Maps search link from the pickup name and city.

## Online payments and cancellations

Online checkout uses Razorpay. To enable it, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the business's Razorpay account to `server/.env`, then restart the API. Keep the keys private and use Razorpay test keys before enabling live payments. Configure the webhook URL `https://your-domain/api/payments/webhook` in the Razorpay dashboard, subscribe to `payment.captured`, `refund.processed`, and `refund.failed`, and set the webhook signing secret as `RAZORPAY_WEBHOOK_SECRET`. When the payment keys are blank, the site accepts a booking request without collecting a payment.

The backend creates the payment order using the saved booking total, verifies the checkout signature, and confirms the payment status with Razorpay before updating the booking. Each trip has an admin-editable cancellation charge percentage, shown to the traveller before booking and cancellation; it defaults to 0% until the client sets a policy. Paid cancellations are marked for admin review. The admin dashboard's Issue refund action sends the eligible refund through Razorpay; configure the webhook to receive final refund status updates. Refund requests are not automatically issued when a traveller cancels.

## Homepage catalogue, gallery and reviews

The “Your next trip is on the calendar” strip displays every future departure date entered in Admin > Trips. Set each trip's “Designed for” field to Family, Friends, or School / college to classify it in the destination catalogue. Users can search trips and filter by group type, destination, vehicle, pickup location and departure date. Booking from a result carries the selected date to the booking form.

Admin > Gallery & reviews manages public trip memories. Add the business UPI QR and optional UPI ID, set separate photo/video submission fees, visible item caps and the number of days a memory stays featured, then enable submissions. Users select a trip they have completed, upload a photo or MP4/WebM video up to 5.5 MB, pay the displayed fee and enter their UPI transaction reference. The admin must manually verify payment and preview the content before approval; pending memories remain private. Admin uploads can be published directly. Photos and videos have separate limits (maximum 30 photos and 8 videos) and disappear from the public gallery after their configured expiry.

Reviews are limited to users with a completed booking. They remain private until the admin approves them in Gallery & reviews. UPI references are not payment verification by themselves; always check the business account before publishing paid submissions.

The homepage now has quick destination buttons for the places currently listed in Admin > Trips. Selecting one pre-fills a trip request. Destination selectors list admin-managed trip destinations and include an “Other” choice for a traveller's custom destination. Travellers add family/friends/school-college group type, traveller count, pickup location, date and contact details. Requests are sent to Admin > Trip requests, where the admin can contact the traveller, add a quote/note, and mark the request contacted, approved, declined or completed. Sending a request does not confirm a booking or collect payment.

Travellers can follow request status, admin quotes and notes in My trips > Trip requests; the page checks for updates every 20 seconds. Device location requires the browser's location permission and an HTTPS website (localhost is also trusted). For phone testing, run `npm run dev:https` in `client/`, open the HTTPS network address Vite prints, accept its development certificate, and keep the client terminal open. The browser permission prompt appears after the traveller taps the location button; websites cannot read exact GPS location without that permission.

In Admin > Gallery & reviews, direct admin memories can be uploaded from the device or supplied as a secure HTTPS media URL. On phones, a fixed quick-navigation bar links to Explore, Request, Memories and the traveller/admin account pages.
