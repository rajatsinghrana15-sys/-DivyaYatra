import { useState } from "react";
import { useApp } from "../context/AppContext";
import ShareJourney from "../components/dashboard/ShareJourney";
import MyFamilyRequests from "../components/family/MyFamilyRequests";
import FamilyPackagesGrid from "../components/family/FamilyPackagesGrid";
import MyMemories from "../components/dashboard/MyMemories";
import MyTripRequests from "../components/dashboard/MyTripRequests";
import PlanTripRequest from "../components/dashboard/PlanTripRequest";
import { ArrowRight, CalendarDays, MapPin, TicketCheck, Camera, Users, Wallet, Plane, CheckCircle2, Inbox } from "lucide-react";import { cash, dateFmt, fallback } from "../services/format";
import { pickupMapUrl } from "../services/trips";

export default function MyBookingsPage() {
  const { bookings, go, cancel, paymentConfig, payBooking, user, chosen } = useApp();
  const [tab, setTab] = useState(() => chosen?.dashboardTab || "bookings");
  const now = new Date();
  const live = bookings.filter((b) => b.status !== "cancelled");
  const stats = [[Plane, "Upcoming", live.filter((b) => new Date(b.travelDate) > now && b.status !== "completed").length], [CheckCircle2, "Completed", bookings.filter((b) => b.status === "completed").length], [Wallet, "Total spent", cash(live.reduce((n, b) => n + (b.totalAmount || 0), 0))]];
  const View = () => (
    <main className="dashboardPage">
      <div className="dashHeading">
        <div>
          <div className="kicker">YOUR TRAVEL DASHBOARD</div>
          <h1>Namaste, <em>{(user?.name || "traveller").split(" ")[0]}.</em></h1>
          <p>Your trips, payments and travel memories in one place.</p>
        </div>
        <button className="btn btn-dark" onClick={() => go("home")}>
          Find another trip <ArrowRight />
        </button>
      </div>
      <div className="dashStats">{stats.map(([Icon, label, value]) => <div key={label}><Icon /><span>{label}</span><b>{value}</b></div>)}</div>
      <div className="dashTabs" role="tablist"><button role="tab" aria-selected={tab === "bookings"} className={tab === "bookings" ? "on" : ""} onClick={() => setTab("bookings")}><TicketCheck /> My bookings</button><button role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "on" : ""} onClick={() => setTab("requests")}><Inbox /> Trip requests</button><button role="tab" aria-selected={tab === "family"} className={tab === "family" ? "on" : ""} onClick={() => setTab("family")}><Users /> Family trips</button><button role="tab" aria-selected={tab === "memories"} className={tab === "memories" ? "on" : ""} onClick={() => setTab("memories")}><Camera /> Share memories</button></div>
      {tab === "requests" ? <><PlanTripRequest /><MyTripRequests /></> : tab === "family" ? <><MyFamilyRequests /><FamilyPackagesGrid /></> : tab === "memories" ? <><ShareJourney /><MyMemories /></> : bookings.length ? (
        <div className="bookingList">
          {bookings.map((b) => (
            <article className="myBooking" key={b._id}>
              <img src={b.trip?.images?.[0] || fallback} alt="" />
              <div className="myBookingInfo">
                <span className={`status ${b.status}`}>{b.status}</span>
                <h3>{b.trip?.title || "Journey"}</h3>
                <p>
                  <MapPin />
                  {b.trip?.destination}
                  <CalendarDays />
                  {dateFmt(b.travelDate)}
                </p>
                <small>
                  {b.travelers} traveller(s) · {cash(b.totalAmount)}
                </small>
                {b.travelerCounts && <small className="myBookingSeats">{b.travelerCounts.men || 0} adult men · {b.travelerCounts.women || 0} adult women · {b.travelerCounts.children || 0} children</small>}
                {b.seatNumbers?.length > 0 && <small className="myBookingSeats">Seats: {b.seatNumbers.join(", ")}</small>}
                {b.pickupLocation && <small className="myBookingSeats">Pickup point: {b.pickupLocation}</small>}
                {b.pickupLocation && <a className="pickupMapAction" href={pickupMapUrl(b.trip, b.pickupLocation)} target="_blank" rel="noreferrer">Open pickup map</a>}
                {b.pickupAddress && <small className="myBookingSeats">Door-to-door address: {b.pickupAddress}</small>}
                {b.paymentStatus && <small className="myBookingSeats">Payment: {b.paymentStatus.replaceAll("_", " ")}</small>}
                {b.status === "cancelled" && b.cancellationCharge > 0 && <small className="myBookingSeats">Cancellation charge: {cash(b.cancellationCharge)} · Estimated refund: {cash(b.refundAmount || 0)}</small>}
                <small className="bookingUpdateNote" aria-live="polite">Booking status last updated {dateFmt(b.statusUpdatedAt || b.updatedAt)}. This page checks for updates automatically.</small>
              </div>
              <div className="bookingActions">
                <b>{cash(b.totalAmount)}</b>
                {paymentConfig.enabled && b.status === "pending_payment" && <button onClick={() => payBooking(b._id)}>Retry payment</button>}
                {["pending_payment", "pending", "confirmed"].includes(b.status) &&
                  new Date(b.travelDate) > new Date() && (
                    <button onClick={() => cancel(b._id)}>
                      Cancel booking
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="emptyState">
          <TicketCheck />
          <h3>Your next adventure starts here</h3>
          <p>You haven’t booked a trip yet. Let’s change that.</p>
          <button className="btn btn-dark" onClick={() => go("home")}>
            Browse journeys <ArrowRight />
          </button>
        </div>
      )}
    </main>
  );
  return View();
}
