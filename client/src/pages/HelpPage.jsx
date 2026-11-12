import {
  ArrowRight,
  CalendarDays,
  CircleHelp,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { cash, dateFmt } from "../services/format";
import { pickupMapUrl } from "../services/trips";
import Footer from "../components/layout/Footer";

export default function HelpPage() {
  const { user, bookings, settings, go, cancel } = useApp();
  const phone = String(settings.phone || "").replace(/\D/g, "");
  const email = String(settings.email || "").trim();
  const helpText = encodeURIComponent(
    `Hi, I need help with a trip booking on ${settings.businessName || "Yatra"}.`,
  );
  const contactHref = phone
    ? `https://wa.me/${phone}?text=${helpText}`
    : email
      ? `mailto:${email}?subject=${encodeURIComponent("Trip booking help")}`
      : "";

  return (
    <>
      <main className="helpPage">
        <section className="helpHero">
          <div className="helpHeroCopy">
            <span className="kicker">WE'RE HERE TO HELP <i /></span>
            <h1>
              Trip help,
              <br />
              <em>all in one place.</em>
            </h1>
            <p>
              Pickup directions, booking updates, emergencies, and clear
              cancellation or refund guidance—all in one place.
            </p>
            {contactHref ? (
              <a
                className="btn btn-dark helpContactButton"
                href={contactHref}
                target={phone ? "_blank" : undefined}
                rel={phone ? "noreferrer" : undefined}
              >
                <MessageCircle />
                {phone ? "Chat with the trip team" : "Email the trip team"}
                <ArrowRight />
              </a>
            ) : (
              <p className="helpContactMissing">
                The travel team has not added contact details yet.
              </p>
            )}
          </div>
          <div className="helpHeroBenefits" aria-label="Help available">
            <span><MapPin /> Pickup directions</span>
            <span><CalendarDays /> Booking updates</span>
            <span><Wallet /> Refund guidance</span>
          </div>
        </section>

        {user?.role === "user" && (
          <section className="helpBookings">
            <div className="sectionIntro">
              <div>
                <span className="kicker">YOUR TRIPS <i /></span>
                <h2>Help with a <em>booking.</em></h2>
                <p>Pickup details and payment guidance for your trips.</p>
              </div>
              <button className="textLink" onClick={() => go("mybookings")}>
                My bookings <ArrowRight />
              </button>
            </div>
            {bookings.length ? (
              <div className="helpBookingGrid">
                {bookings.map((booking) => {
                  const point = booking.pickupLocation;
                  const mapUrl = point
                    ? pickupMapUrl(booking.trip, point)
                    : booking.pickupAddress
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.pickupAddress)}`
                      : "";
                  const percent = Number(
                    booking.trip?.cancellationFeePercent || 0,
                  );
                  const fee = Math.round(
                    Number(booking.totalAmount || 0) * percent / 100,
                  );
                  const refund = Math.max(
                    0,
                    Number(booking.totalAmount || 0) - fee,
                  );

                  return (
                    <article className="helpBookingCard" key={booking._id}>
                      <header className="helpBookingHeader">
                        <span className={`status ${booking.status}`}>
                          {booking.status.replaceAll("_", " ")}
                        </span>
                        <h3>{booking.trip?.title || "Trip"}</h3>
                        <p>{booking.trip?.destination || "Destination pending"}</p>
                      </header>
                      <div className="helpBookingDate">
                        <CalendarDays />
                        <span><small>Departure</small><b>{dateFmt(booking.travelDate)}</b></span>
                      </div>
                      {(point || booking.pickupAddress) && (
                        <div className="helpPickupPanel">
                          <MapPin />
                          <span>
                            <small>{point ? "Your pickup point" : "Door-to-door pickup address"}</small>
                            <b>{point || booking.pickupAddress}</b>
                          </span>
                          {mapUrl && (
                            <a href={mapUrl} target="_blank" rel="noreferrer">
                              Open map <ArrowRight />
                            </a>
                          )}
                        </div>
                      )}
                      <div className="helpRefundInfo">
                        <div><Wallet /><b>Cancellation & refund estimate</b></div>
                        <p>{percent}% cancellation charge <strong>{cash(fee)}</strong></p>
                        <small>
                          Estimated refund if payment was collected: {cash(refund)}.
                          An eligible refund is reviewed by the admin.
                        </small>
                      </div>
                      {booking.status === "cancelled" && booking.paymentStatus?.startsWith("refund") && (
                        <div className="helpRefundStatus">
                          Refund status: {booking.paymentStatus.replaceAll("_", " ")}
                        </div>
                      )}
                      {[
                        "pending",
                        "pending_payment",
                        "confirmed",
                      ].includes(booking.status) &&
                        new Date(booking.travelDate) > new Date() && (
                          <button
                            className="helpCancelButton"
                            onClick={() => cancel(booking._id)}
                          >
                            Cancel this booking
                          </button>
                        )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="upcomingEmpty">
                Sign in and make a booking to see trip-specific pickup and
                cancellation help here.
              </p>
            )}
          </section>
        )}

        <section className="helpTopics">
          <article>
            <span><MapPin /></span>
            <h2>Can't reach your pickup point?</h2>
            <p>
              Open the map link saved with your booking. If you still cannot
              get there, contact the trip team on WhatsApp and share your trip
              name, departure date, and current location. They can advise
              whether another pickup can be arranged.
            </p>
          </article>
          <article>
            <span><CircleHelp /></span>
            <h2>Need help with a booking?</h2>
            <p>
              Open My bookings to see your status, selected pickup, and
              passenger details. For an urgent change, message the trip team
              with your booking and travel date.
            </p>
            <button
              className="textLink"
              onClick={() => user ? go("mybookings") : go("auth")}
            >
              Open bookings <ArrowRight />
            </button>
          </article>
          <article>
            <span><Wallet /></span>
            <h2>Cancellation and refunds</h2>
            <p>
              The trip page shows the cancellation charge set for that package
              before you book. When you cancel a paid booking, the site
              calculates the estimated refund and sends it to the admin for
              review. Refund progress appears in My bookings.
            </p>
          </article>
          <article>
            <span><LifeBuoy /></span>
            <h2>Emergency support</h2>
            <p>
              For pickup delays, address changes, or a last-minute emergency,
              contact the trip coordinator directly. Cancellation and refund
              requests are tracked against your booking.
            </p>
            {contactHref && (
              <a
                className="textLink"
                href={contactHref}
                target={phone ? "_blank" : undefined}
                rel={phone ? "noreferrer" : undefined}
              >
                Contact support <ArrowRight />
              </a>
            )}
          </article>
        </section>

        {!user && (
          <section className="helpSignIn">
            <p>Sign in to view your pickup maps, cancellation amount, and refund updates.</p>
            <button className="btn btn-outline" onClick={() => go("auth")}>
              Sign in to bookings <ArrowRight />
            </button>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
