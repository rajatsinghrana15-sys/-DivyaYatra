import { Compass, Settings, Plus, TicketCheck, Users, Star, CalendarDays, Phone, Mail, LayoutDashboard, Inbox, Heart, Tag, Bus, Images, Search, ExternalLink, UserCog, Pencil, Trash2, Eye, MessageCircle, PhoneCall, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { cash, dateFmt, fallback } from "../services/format";
import { tripTypeLabel, pickupLabel } from "../services/trips";
import { can, roleLabel } from "../services/access";
import ActionMenu from "../components/common/ActionMenu";
import StaffPanel from "../components/admin/StaffPanel";
import FleetPanel from "../components/admin/FleetPanel";
import FamilyRequestsPanel from "../components/admin/FamilyRequestsPanel";
import GalleryAdminPanel from "../components/admin/GalleryAdminPanel";
import TripRequestsPanel from "../components/admin/TripRequestsPanel";
import BrandSettingsModal from "../components/admin/BrandSettingsModal";
import { api } from "../services/api";

const sections = [
  ["trips", "Trips"],
  ["upcoming", "Upcoming departures"],
  ["categories", "Categories"],
  ["bookings", "Bookings"], ["family", "Family requests"], ["vehicles", "Vehicles"],
  ["trip-requests", "Trip requests"],
  ["travellers", "Travellers"],
  ["gallery", "Gallery & reviews"],
  ["staff", "Workers"],
  ["site-settings", "Website settings"],
];

const navGroups = [
  ["Main", [["overview", "Overview", LayoutDashboard]]],
  ["Operations", [["bookings", "Bookings", TicketCheck], ["upcoming", "Departures", CalendarDays], ["trip-requests", "Trip requests", Inbox], ["family", "Family requests", Heart]]],
  ["Catalogue", [["trips", "Trips", Compass], ["categories", "Categories", Tag], ["vehicles", "Vehicles", Bus]]],
  ["Community", [["travellers", "Travellers", Users], ["gallery", "Gallery & reviews", Images]]],
  ["Settings", [["staff", "Workers", UserCog], ["site-settings", "Website settings", Settings], ["admin-account", "Admin account", UserCog]]],
];
const statusFilters = [["all", "All"], ["pending", "Needs action"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"]];

export default function AdminDashboardPage() {
  const { user, setUser, trips, cats, allBookings, adminUsers = [], summary, dashboardCounts = {}, adminSection, setAdminSection, setTripForm, setCatForm, go, remove, status, refund, refresh, notice } = useApp();
  const permOf = { upcoming: "departures", staff: "*admin", "site-settings": "*admin", "admin-account": "*admin" };
  const allowed = (id) => id === "overview" || (permOf[id] === "*admin" ? user?.role === "admin" : can(user, permOf[id] || id));
  const isAdmin = user?.role === "admin";
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookingQuery, setBookingQuery] = useState("");
  const [addingDepartureFor, setAddingDepartureFor] = useState("");
  const [departureDateDrafts, setDepartureDateDrafts] = useState({});
  const [departureSaving, setDepartureSaving] = useState(false);
  const pendingCount = allBookings.filter((b) => ["pending", "pending_payment"].includes(b.status)).length;
  const badges = { bookings: dashboardCounts.bookings ?? pendingCount, family: dashboardCounts.family || 0, "trip-requests": dashboardCounts["trip-requests"] || 0, gallery: dashboardCounts.gallery || 0 };
  const visibleBookings = allBookings.filter((b) => (bookingFilter === "all" || (bookingFilter === "pending" ? ["pending", "pending_payment"].includes(b.status) : b.status === bookingFilter))
    && (!bookingQuery.trim() || `${b.contactName || ""} ${b.user?.name || ""} ${b.user?.email || ""} ${b.contactPhone || ""} ${b.user?.phone || ""} ${b.trip?.title || ""}`.toLowerCase().includes(bookingQuery.trim().toLowerCase())));
  const sectionTitles = { staff: "Workers", overview: "Overview", trips: "Trips", upcoming: "Upcoming departures", categories: "Categories", bookings: "Bookings", family: "Family requests", vehicles: "Vehicles", "trip-requests": "Trip requests", travellers: "Travellers", gallery: "Gallery & reviews", "site-settings": "Website settings", "admin-account": "Admin account" };
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "", password: "", confirmPassword: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  useEffect(() => setProfile((current) => ({ ...current, name: user?.name || "", email: user?.email || "" })), [user?.name, user?.email]);
  const saveAdminProfile = async (event) => {
    event.preventDefault();
    if (profile.password !== profile.confirmPassword) return notice("Password and confirmation do not match.");
    setProfileSaving(true);
    try {
      const result = await api("/auth/admin-profile", { method: "PATCH", body: profile });
      localStorage.setItem("yatra_token", result.token);
      setUser(result.user);
      setProfile((current) => ({ ...current, password: "", confirmPassword: "" }));
      notice("Admin account updated.");
    } catch (error) {
      notice(error.message);
    } finally {
      setProfileSaving(false);
    }
  };
  useEffect(() => {
    if (!allowed(adminSection)) setAdminSection("overview");
  }, [adminSection, user?.role, user?.active, user?.permissions]);
  const selectSection = (id) => { setAdminSection(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const addDepartureDate = async (event, trip, cardKey) => {
    event.preventDefault();
    const date = departureDateDrafts[cardKey];
    if (!date || departureSaving) return;
    const dateKey = (value) => new Date(value).toISOString().slice(0, 10);
    if ((trip.departureDates || []).some((value) => dateKey(value) === date)) {
      notice("This departure date already exists.");
      return;
    }
    setDepartureSaving(true);
    try {
      await api(`/trips/${trip._id}`, { method: "PATCH", body: {
        departureDates: [...(trip.departureDates || []), date],
        tripType: trip.tripType || "general",
        pickupType: trip.pickupType || "none",
        pickupCity: trip.pickupCity || "",
        pickupPoints: trip.pickupPoints || [],
        pickupMapUrls: trip.pickupMapUrls || [],
        pickupDetails: trip.pickupDetails || "",
      } });
      notice("Departure date added.");
      setDepartureDateDrafts((current) => ({ ...current, [cardKey]: "" }));
      setAddingDepartureFor("");
      await refresh();
    } catch (error) {
      notice(error.message);
    } finally {
      setDepartureSaving(false);
    }
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayInputValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const manifests = Array.from(trips.reduce((byTrip, trip) => {
    const nextDate = (trip.departureDates || [])
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()) && date >= today)
      .sort((a, b) => a - b)[0];
    const id = String(trip._id);
    if (nextDate && !byTrip.has(id)) byTrip.set(id, { trip, date: nextDate });
    return byTrip;
  }, new Map()).values()).sort((a, b) => a.date - b.date);

  return (
    <main className="dashboardPage adminPage">
      <div className="dashHeading adminDashHeading">
        <div><div className="kicker">{isAdmin ? "YATRA CONTROL ROOM" : "YOUR WORK DASHBOARD"}</div><h1>{sectionTitles[adminSection] || "Overview"}</h1><p>Welcome back, {user?.name?.split(" ")[0]}. {isAdmin ? "Manage your travel website." : `${roleLabel(user)} · you can manage the sections shown in your menu.`}</p></div>
        <div className="adminHeadActions"><ActionMenu className="adminCreateMenu" primary label={<><Plus /> Create</>} items={[
          { label: "Add trip", icon: Compass, hidden: !can(user, "trips"), onClick: () => setTripForm({}) },
          { label: "Add category", icon: Tag, hidden: !can(user, "categories"), onClick: () => setCatForm({}) },
          { label: "Add vehicle", icon: Bus, hidden: !can(user, "vehicles"), onClick: () => selectSection("vehicles") },
          { label: "Add memory", icon: Images, hidden: !can(user, "gallery"), onClick: () => selectSection("gallery") },
          { label: "Add worker", icon: UserCog, hidden: !isAdmin, onClick: () => selectSection("staff") },
        ]} />{isAdmin && <button className="btn btn-outline" onClick={() => selectSection("site-settings")}><Settings /> Website settings</button>}</div>
      </div>
      {adminSection === "overview" && isAdmin && <div className="adminStats">
        {[["Trips", summary.trips ?? trips.length, Compass], ["Bookings", summary.bookings ?? allBookings.length, TicketCheck], ["Travellers", summary.users ?? adminUsers.length, Users], ["Booking value", cash(summary.revenue), Star]].map(([label, value, Icon]) => <div key={label}><span><Icon /></span><small>{label}</small><b>{value}</b></div>)}
      </div>}
      <div className="adminDashboardWorkspace">
      <nav className="adminNav" aria-label="Dashboard pages">
        {navGroups.map(([group, items]) => [group, items.filter(([id]) => allowed(id))]).filter(([, items]) => items.length).map(([group, items]) => <div className="adminNavGroup" key={group}><b>{group}</b><div>{items.map(([id, label, Icon]) => <button key={id} className={adminSection === id ? "active" : ""} aria-current={adminSection === id ? "page" : undefined} onClick={() => selectSection(id)}><Icon /><span>{label}</span>{badges[id] > 0 && <i className="navBadge">{badges[id]}</i>}</button>)}</div></div>)}
        <button className="adminNavSite" onClick={() => go("home")}><ExternalLink /><span>View website</span></button>
      </nav>
      <div className="adminSectionStack">

      {adminSection === "overview" && <section className="adminPanel adminOverviewPanel">
        <div className="adminSectionHead"><div><h2>Manage your website</h2><p>Choose a section to view and manage its details.</p></div></div>
        {pendingCount > 0 && <button className="adminAlert" onClick={() => { setBookingFilter("pending"); selectSection("bookings"); }}><TicketCheck /><div><b>{pendingCount} booking{pendingCount > 1 ? "s" : ""} need your action</b><small>Review and update their status</small></div><span>Review</span></button>}
        <div className="adminQuickLinks">{sections.filter(([id]) => allowed(id)).map(([id, label]) => <button key={id} onClick={() => selectSection(id)}><span>{label}</span><b>{id === "trips" ? trips.length : id === "bookings" ? allBookings.length : id === "travellers" ? adminUsers.length : id === "categories" ? cats.length : ""}</b><small>Open section <Plus /></small></button>)}</div>
      </section>}

      {adminSection === "trips" && <section className="adminPanel" id="trips">
        <div className="adminSectionHead"><div><h2>Trips <small>{trips.length}</small></h2><p>Add, edit or remove journeys shown on the website.</p></div><button className="btn btn-dark" onClick={() => setTripForm({})}><Plus /> Add trip</button></div>
        <div className="adminTripGrid">{trips.map((trip) => <article className="adminTripCard" key={trip._id}>
          <button className="adminTripPhoto" onClick={() => go("trip", trip)} aria-label={`View ${trip.title}`}><img src={trip.images?.[0] || fallback} alt={`${trip.destination} trip`} /><span>{trip.active ? "LIVE ON WEBSITE" : "HIDDEN"}</span></button>
          <div className="adminTripInfo"><small>{trip.category?.name || "Journey"} · {trip.destination}{trip.state ? `, ${trip.state}` : ""}</small><h3>{trip.title}</h3><p>{trip.summary || trip.description || "Add a short trip description."}</p><small className="adminTripTransport">{tripTypeLabel(trip.tripType)} · {trip.vehicleName || ({bus:"Bus",car:"Car",traveller_van:"Traveller van",tempo_traveller:"Tempo traveller",train:"Train",other:"Vehicle"})[trip.vehicleType] || "Vehicle details pending"} · {trip.seatsAvailable} / {trip.vehicleTotalSeats || trip.maxGroupSize || 20} seats available</small>{trip.pickupType && trip.pickupType !== "none" && <small className="adminTripTransport">{pickupLabel(trip.pickupType)}{trip.pickupType === "city_points" ? ` in ${trip.pickupCity || trip.origin}: ${(trip.pickupPoints || []).join(" · ")}` : trip.pickupDetails ? `: ${trip.pickupDetails}` : ""}</small>}<div className="adminTripMeta"><b>{cash(trip.price)} <small>/ person</small></b><span>{trip.durationDays} days</span></div><div className="adminTripActions"><button className="btn btn-dark btn-sm" onClick={() => setTripForm(trip)}><Pencil /> Edit</button><ActionMenu items={[{ label: "View on website", icon: Eye, onClick: () => go("trip", trip) }, { label: "Edit trip", icon: Pencil, onClick: () => setTripForm(trip) }, { label: "Delete trip", icon: Trash2, danger: true, onClick: () => remove(`/trips/${trip._id}`, "Delete this trip? This cannot be undone if it has no active bookings.") }]} /></div></div>
        </article>)}{!trips.length && <div className="adminEmpty">No trips yet. Add your first trip above.</div>}</div>
      </section>}

      {adminSection === "upcoming" && <section className="adminPanel" id="upcoming">
        <div className="adminSectionHead"><div><h2>Upcoming trip manifest <small>{manifests.length}</small></h2><p>Confirmed traveller counts by departure, including women and children.</p></div>{can(user, "trips") && <button className="btn btn-dark" onClick={() => setTripForm({})}><Plus /> Add trip</button>}</div>
        <div className="manifestGrid">{manifests.map(({ trip, date }) => {
          const day = date.toDateString();
          const tripBookings = allBookings.filter((booking) => String(booking.trip?._id || booking.trip) === String(trip._id) && new Date(booking.travelDate).toDateString() === day);
          const confirmed = tripBookings.filter((booking) => booking.status === "confirmed");
          const pendingCount = tripBookings.filter((booking) => ["pending_payment", "pending"].includes(booking.status)).reduce((sum, booking) => sum + Number(booking.travelers || 0), 0);
          const total = confirmed.reduce((sum, booking) => sum + Number(booking.travelers || 0), 0);
          const men = confirmed.reduce((sum, booking) => sum + Number(booking.travelerCounts?.men || 0), 0);
          const women = confirmed.reduce((sum, booking) => sum + Number(booking.travelerCounts?.women || 0), 0);
          const children = confirmed.reduce((sum, booking) => sum + Number(booking.travelerCounts?.children || 0), 0);
          const vehicleTotal = trip.vehicleTotalSeats || trip.maxGroupSize || 20;
          const reserved = tripBookings.filter((booking) => ["pending_payment", "pending", "confirmed"].includes(booking.status)).reduce((sum, booking) => sum + Number(booking.travelers || 0), 0);
          const left = Math.max(0, vehicleTotal - reserved);
          const cardKey = `${trip._id}-${day}`;
          return <article className="manifestCard" key={cardKey}>
            <div className="manifestPhoto"><img src={trip.images?.[0] || fallback} alt="" /></div>
            <div className="manifestContent">
              <small className="manifestDate"><CalendarDays />{dateFmt(date)}</small>
              <h3>{trip.title}</h3>
              <p>{trip.destination} · {tripTypeLabel(trip.tripType)} · {trip.vehicleName || ({bus:"Bus",car:"Car",traveller_van:"Traveller van",tempo_traveller:"Tempo traveller",train:"Train",other:"Vehicle"})[trip.vehicleType] || "Vehicle details pending"}</p>
              {trip.pickupType && trip.pickupType !== "none" && <small className="manifestPickupInfo">{pickupLabel(trip.pickupType)}{trip.pickupType === "city_points" ? ` in ${trip.pickupCity || trip.origin}: ${(trip.pickupPoints || []).join(" · ")}` : trip.pickupDetails ? `: ${trip.pickupDetails}` : ""}</small>}
              <div className="manifestStats"><span><b>{total}</b> going</span><span><b>{men}</b> men</span><span><b>{women}</b> women</span><span><b>{children}</b> children</span><span><b>{pendingCount}</b> pending</span></div>
              <div className="manifestSeatBar"><span>{left} / {vehicleTotal} seats left</span><i><b style={{width:`${Math.min(100,Math.max(0,((vehicleTotal-left)/vehicleTotal)*100))}%`}} /></i></div>
              {can(user, "trips") && <div className="manifestActions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setTripForm(trip)}><Pencil /> Edit trip / dates</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setAddingDepartureFor((current) => current === cardKey ? "" : cardKey)}><Plus /> Add departure</button>
                <button type="button" className="adminDeleteBtn manifestDeleteBtn" onClick={() => remove(`/trips/${trip._id}`, "Delete this trip? This cannot be undone if it has no active bookings.")}><Trash2 /> Delete trip</button>
              </div>}
              {can(user, "trips") && addingDepartureFor === cardKey && <form className="manifestAddDate" onSubmit={(event) => addDepartureDate(event, trip, cardKey)}>
                <label>New departure date<input type="date" min={todayInputValue} value={departureDateDrafts[cardKey] || ""} onChange={(event) => setDepartureDateDrafts((current) => ({ ...current, [cardKey]: event.target.value }))} required /></label>
                <button type="submit" className="btn btn-dark btn-sm" disabled={departureSaving}>{departureSaving ? "Saving…" : "Save date"}</button>
              </form>}
            </div>
          </article>;
        })}{!manifests.length && <div className="adminEmpty">Future departure dates added to trips will appear here.</div>}</div>
      </section>}

      {adminSection === "categories" && <section className="adminPanel" id="categories">
        <div className="adminSectionHead"><div><h2>Categories <small>{cats.length}</small></h2><p>Organise journeys by traveller interests.</p></div><button className="btn btn-outline" onClick={() => setCatForm({})}><Plus /> Add category</button></div>
        <div className="categoryAdminGrid">{cats.map((category) => <div key={category._id}><b>{category.name}</b><small>{category.description || "No description"}</small><ActionMenu items={[{ label: "Edit category", icon: Pencil, onClick: () => setCatForm(category) }, { label: "Delete category", icon: Trash2, danger: true, onClick: () => remove(`/categories/${category._id}`, "Delete this category?") }]} /></div>)}{!cats.length && <div className="adminEmpty">No categories yet.</div>}</div>
      </section>}

      {adminSection === "bookings" && <section className="adminPanel" id="bookings">
        <div className="adminSectionHead"><div><h2>Booking management <small>{allBookings.length}</small></h2><p>Review traveller contact details, seats, notes and update booking status.</p></div></div>
        <div className="adminToolbar"><label className="adminSearch"><Search /><input type="search" value={bookingQuery} onChange={(e) => setBookingQuery(e.target.value)} placeholder="Search name, phone, email or trip" /></label><div className="adminChips" role="group" aria-label="Filter bookings">{statusFilters.map(([v, l]) => <button key={v} className={bookingFilter === v ? "on" : ""} onClick={() => setBookingFilter(v)}>{l}{v === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}</button>)}</div></div>
        <div className="adminTableWrap"><table><thead><tr><th>Traveller</th><th>Contact</th><th>Trip / seats</th><th>Departure</th><th>People</th><th>Total</th><th>Notes</th><th>Status</th><th aria-label="Actions"></th></tr></thead><tbody>
          {visibleBookings.map((booking) => <tr key={booking._id}><td>{booking.contactName || booking.user?.name}<small className="cellSub">{booking.user?.email}</small></td><td>{booking.contactPhone || booking.user?.phone || "—"}<small className="cellSub">{booking.user?.phone && booking.contactPhone !== booking.user.phone ? `Account: ${booking.user.phone}` : ""}</small></td><td>{booking.trip?.title}<small className="cellSub">{booking.seatNumbers?.length ? `Seats ${booking.seatNumbers.join(", ")}` : "Seat not recorded"}</small><small className="cellSub">{booking.pickupLocation ? `Pickup: ${booking.pickupLocation}` : booking.pickupAddress ? `Pickup address: ${booking.pickupAddress}` : "Pickup details not provided"}</small></td><td>{dateFmt(booking.travelDate)}</td><td>{booking.travelers}<small className="cellSub">{booking.travelerCounts ? `${booking.travelerCounts.men || 0} men · ${booking.travelerCounts.women || 0} women · ${booking.travelerCounts.children || 0} children` : "Category counts unavailable"}</small></td><td>{cash(booking.totalAmount)}<small className="cellSub">Payment: {(booking.paymentStatus || "unpaid").replaceAll("_", " ")}</small>{booking.cancellationCharge > 0 && <small className="cellSub">Fee {cash(booking.cancellationCharge)} · refund {cash(booking.refundAmount || 0)}</small>}{["refund_pending", "refund_failed"].includes(booking.paymentStatus) && booking.refundAmount > 0 && <button className="refundActionButton" onClick={() => refund(booking._id)}>Issue refund</button>}</td><td className="bookingNoteCell">{booking.notes || "—"}</td><td><select value={booking.status} onChange={(event) => status(booking._id, event.target.value)}>{[...(booking.status === "pending_payment" ? ["pending_payment"] : []), "pending", "confirmed", "cancelled", "completed"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></td><td>{(() => { const ph = String(booking.contactPhone || booking.user?.phone || "").replace(/[^\d+]/g, ""); return <ActionMenu items={[{ label: "Call traveller", icon: PhoneCall, hidden: !ph, href: `tel:${ph}` }, { label: "WhatsApp", icon: MessageCircle, hidden: !ph, href: `https://wa.me/${ph.replace(/^\+/, "")}` }, { label: "Email", icon: Send, hidden: !booking.user?.email, href: `mailto:${booking.user?.email}` }, { label: "Mark confirmed", icon: Eye, hidden: booking.status === "confirmed", onClick: () => status(booking._id, "confirmed") }, { label: "Mark completed", icon: Eye, hidden: booking.status === "completed", onClick: () => status(booking._id, "completed") }]} />; })()}</td></tr>)}
          {!visibleBookings.length && <tr><td colSpan="9" className="adminEmptyCell">{allBookings.length ? "No bookings match this search or filter." : "No bookings received yet."}</td></tr>}
        </tbody></table></div>
      </section>}

      {adminSection === "family" && <section className="adminPanel" id="family"><FamilyRequestsPanel /></section>}
      {adminSection === "staff" && isAdmin && <section className="adminPanel" id="staff"><StaffPanel /></section>}
      {adminSection === "vehicles" && <section className="adminPanel" id="vehicles"><FleetPanel /></section>}
      {adminSection === "trip-requests" && <section className="adminPanel" id="trip-requests"><TripRequestsPanel /></section>}

      {adminSection === "travellers" && <section className="adminPanel" id="travellers">
        <div className="adminSectionHead"><div><h2>Traveller accounts <small>{adminUsers.length}</small></h2><p>Registered user information available to the admin.</p></div></div>
        <div className="travellerAdminGrid">{adminUsers.map((traveller) => <article key={traveller._id}><span className="travellerAdminAvatar">{traveller.avatarUrl ? <img src={traveller.avatarUrl} alt="" /> : traveller.name?.slice(0, 1)?.toUpperCase() || "T"}</span><div><b>{traveller.name}</b><small><Mail />{traveller.email}</small><small><Phone />{traveller.phone || "Phone not provided"}</small><small><CalendarDays />Joined {dateFmt(traveller.createdAt)}</small></div><ActionMenu items={[{ label: "Call", icon: PhoneCall, hidden: !traveller.phone, href: `tel:${traveller.phone}` }, { label: "Email", icon: Send, href: `mailto:${traveller.email}` }]} /></article>)}{!adminUsers.length && <div className="adminEmpty">No traveller accounts registered yet.</div>}</div>
      </section>}

      {adminSection === "gallery" && <section id="gallery"><GalleryAdminPanel /></section>}

      {adminSection === "site-settings" && <section className="adminPanel" id="site-settings">
        <div className="adminSectionHead"><div><h2>Website settings</h2><p>Manage homepage text, contact details, logo and brand images.</p></div></div>
        <BrandSettingsModal />
      </section>}

      {adminSection === "admin-account" && isAdmin && <section className="adminPanel" id="admin-account">
        <div className="adminSectionHead"><div><h2>Admin account</h2><p>Update the name and email used for your admin account. Leave password blank to keep the current one.</p></div></div>
        <form className="adminProfileForm" onSubmit={saveAdminProfile}>
          <label>Admin name<input required maxLength="100" autoComplete="name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
          <label>Login email<input required type="email" autoComplete="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
          <label>New password <small>(leave blank to keep current)</small><input type="password" minLength="8" autoComplete="new-password" value={profile.password} onChange={(event) => setProfile({ ...profile, password: event.target.value })} /></label>
          <label>Confirm new password<input type="password" minLength="8" autoComplete="new-password" required={Boolean(profile.password)} value={profile.confirmPassword} onChange={(event) => setProfile({ ...profile, confirmPassword: event.target.value })} /></label>
          <div className="adminProfileActions"><button className="btn btn-dark" type="submit" disabled={profileSaving}>{profileSaving ? "Saving…" : "Save account details"}</button></div>
        </form>
      </section>}
      </div>
      </div>
    </main>
  );
}
