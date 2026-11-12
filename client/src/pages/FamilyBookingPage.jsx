import { ArrowRight, CalendarDays, Home, MapPin, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import { cash, dateFmt, fallback } from "../services/format";
import { tripTypeLabel } from "../services/trips";
import Footer from "../components/layout/Footer";
import FamilyPackagesGrid from "../components/family/FamilyPackagesGrid";
import FamilyTripRequest from "../components/family/FamilyTripRequest";

export default function FamilyBookingPage() {
  const { trips, startBooking, go } = useApp();
  const packages = trips.filter((trip) => ["family_vacation", "family"].includes(trip.tripType));
  return <><main className="familyBookingPage">
    <section className="familyBookingHero"><span className="kicker">TRAVEL TOGETHER <i /></span><h1>Family holidays,<br /><em>made easier.</em></h1><p>Book a ready-made holiday package, or plan a private trip for your family and choose the vehicle you want to travel in.</p><div className="familyBookingPromise"><span><Home /> Door-to-door pickup</span><span><Users /> Share passenger counts</span><span><CalendarDays /> Holiday departures</span></div></section>
    <FamilyTripRequest />
    <FamilyPackagesGrid />
    <section className="familyHelpCallout"><div><span className="kicker">NEED A HAND? <i /></span><h2>Planning a family trip?</h2><p>Get help with pickup coverage, passenger counts, bookings or cancellations.</p></div><button className="btn btn-outline" onClick={() => go("help")}>Open trip help <ArrowRight /></button></section>
  </main><Footer /></>;
}
