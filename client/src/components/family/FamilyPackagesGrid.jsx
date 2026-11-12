import { ArrowRight, Home, MapPin } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { cash, dateFmt, fallback } from "../../services/format";
import { tripTypeLabel } from "../../services/trips";

export default function FamilyPackagesGrid({ heading = true }) {
  const { trips, startBooking, go } = useApp();
  const packages = trips.filter((trip) => ["family_vacation", "family"].includes(trip.tripType));
  return (
    <section className="familyPackagesSection"><div className="sectionIntro"><div><span className="kicker">FAMILY PACKAGES <i /></span><h2>Choose your <em>holiday.</em></h2></div><p>Pickup details, dates and per-person prices are shown before you book.</p></div>
      {packages.length ? <div className="familyPackagesGrid">{packages.map((trip) => { const soldOut = Number(trip.seatsAvailable) <= 0; return <article className="familyPackageCard" key={trip._id}><button className="familyPackagePhoto" onClick={() => go("trip", trip)}><img src={trip.images?.[0] || fallback} alt={trip.destination} /><span>{tripTypeLabel(trip.tripType)}</span></button><div className="familyPackageInfo"><small><MapPin /> {trip.destination}{trip.state ? `, ${trip.state}` : ""}</small><h3>{trip.title}</h3><p>{trip.summary || trip.description}</p><div className="familyPackageMeta"><span>{trip.durationDays} days · {trip.durationNights} nights</span><span>{trip.departureDates?.length ? `Next: ${dateFmt(trip.departureDates[0])}` : "Date on request"}</span></div><div className="familyPackagePickup"><Home /><span><b>Door-to-door pickup</b><small>{trip.pickupDetails || "Enter your pickup address during booking."}</small></span></div><div className="familyPackageFooter"><div><small>Starting from</small><b>{cash(trip.price)} <i>/ person</i></b></div><button disabled={soldOut} className="btn btn-dark btn-sm" onClick={() => startBooking(trip)}>{soldOut ? "Seats full" : "Book family trip"} {!soldOut && <ArrowRight />}</button></div></div></article>; })}</div> : <div className="upcomingEmpty">Family vacation packages will appear here when the travel team publishes them.</div>}
    </section>
  );
}
