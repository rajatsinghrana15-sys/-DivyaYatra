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
                <div className="myBookingHeading">
                  <span className={`status ${b.status}`}>{b.status.replaceAll("_", " ")}</span>
                  <h3>{b.trip?.title || "Journey"}</h3>
                </div>
                <div className="myBookingFacts">
                  <div><MapPin /><span><small>Destination</small><b>{b.trip?.destination || "Details pending"}</b></span></div>
                  <div><CalendarDays /><span><small>Departure</small><b>{dateFmt(b.travelDate)}</b></span></div>
                  <div><Users /><span><small>Travellers</small><b>{b.travelers} {Number(b.travelers) === 1 ? "person" : "people"}</b></span></div>
                </div>
                <div className="myBookingExtras">
                  {b.travelerCounts && <span className="myBookingExtra"><b>Group:</b> {b.travelerCounts.men || 0} men · {b.travelerCounts.women || 0} women · {b.travelerCounts.children || 0} children</span>}
                  {b.seatNumbers?.length > 0 && <span className="myBookingExtra"><b>Seats:</b> {b.seatNumbers.join(", ")}</span>}
                  {b.pickupLocation && <span className="myBookingExtra"><b>Pickup:</b> {b.pickupLocation}</span>}
                  {b.pickupLocation && <a className="pickupMapAction" href={pickupMapUrl(b.trip, b.pickupLocation)} target="_blank" rel="noreferrer">Open pickup map <ArrowRight /></a>}
                  {b.pickupAddress && <span className="myBookingExtra"><b>Door-to-door address:</b> {b.pickupAddress}</span>}
                  {b.paymentStatus && <span className={`myBookingExtra paymentState ${b.paymentStatus}`}><b>Payment:</b> {b.paymentStatus.replaceAll("_", " ")}</span>}
                  {b.status === "cancelled" && b.cancellationCharge > 0 && <span className="myBookingExtra cancellationInfo"><b>Cancellation:</b> {cash(b.cancellationCharge)} charge · {cash(b.refundAmount || 0)} estimated refund</span>}
                </div>
                <small className="bookingUpdateNote" aria-live="polite">Booking status last updated {dateFmt(b.statusUpdatedAt || b.updatedAt)}. This page checks for updates automatically.</small>
              </div>
              <div className="bookingActions">
                <small className="bookingAmountLabel">Trip total</small>
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
