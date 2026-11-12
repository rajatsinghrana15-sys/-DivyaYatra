import { useApp } from "../context/AppContext";
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Star, Users, X } from "lucide-react";import { cash, dateFmt, fallback } from "../services/format";
import HomePage from "./HomePage";
import Footer from "../components/layout/Footer";
import { tripTypeLabel, pickupLabel, pickupMapUrl } from "../services/trips";

export default function TripDetailsPage() {
  const { settings, chosen, go, startBooking, paymentConfig } = useApp();
  const View = () => {
    const t = chosen;
    if (!t) return <HomePage />;
    const days = t.itinerary?.length
      ? t.itinerary
      : [
          {
            day: 1,
            title: "Arrival & get settled",
            details: `Arrive in ${t.destination}, meet your group and settle in.`,
          },
          {
            day: 2,
            title: "Explore the destination",
            details:
              "Discover local highlights with time to enjoy the place at your own pace.",
          },
          {
            day: 3,
            title: "A memorable goodbye",
            details: "Enjoy a final morning before your return journey.",
          },
        ];
    return (
      <>
        <main className="detailPage">
          <button className="backLink" onClick={() => go("home")}>
            ← All journeys
          </button>
          <div className="detailHero">
            <img src={t.images?.[0] || fallback} alt={t.destination} />
            <div className="detailHeroShade" />
            <div className="detailHeroContent">
              <span className="categoryPill">
                {t.category?.name || "India journey"}
              </span>
              <h1>{t.title}</h1>
              <div>
                <span>
                  <MapPin />
                  {t.destination}
                  {t.state ? `, ${t.state}` : ""}
                </span>
                <span>
                  <Clock3 />
                  {t.durationDays} days · {t.durationNights} nights
                </span>
                <span>
                  <Star fill="currentColor" />
                  {t.rating || "4.8"} traveller rating
                </span>
              </div>
            </div>
          </div>
          <div className="detailLayout">
            <div className="detailMain">
              <div className="detailChips">
                <span>
                  <MapPin />
                  {t.origin || settings.origin}
                </span>
                <span>
                  <Users />
                  Group up to {t.vehicleTotalSeats || t.maxGroupSize}
                </span>
                <span>
                  <Check />
                  {Number(t.seatsAvailable) <= 0 ? "Seats full" : `${t.seatsAvailable} seats left`}
                </span>
                {t.tripType !== "general" && <span className="tripTypeBadge">{tripTypeLabel(t.tripType)}</span>}
              </div>
              <div className="vehicleInfoPanel"><div className="kicker">YOUR RIDE <i /></div><h2>{({ bus: "Bus", car: "Car", traveller_van: "Traveller van", tempo_traveller: "Tempo traveller", train: "Train", other: "Vehicle" })[t.vehicleType] || "Vehicle details"}{t.vehicleName ? ` · ${t.vehicleName}` : ""}</h2><p>{t.vehicleTotalSeats || t.maxGroupSize || 20} total seats · {Math.max(0, t.seatsAvailable || 0)} available · {Math.max(0, (t.vehicleTotalSeats || t.maxGroupSize || 20) - (t.seatsAvailable || 0))} booked</p>{t.vehicleDetails && <div className="vehicleExtraDetails">{t.vehicleDetails}</div>}</div>
              <div className="pickupPlanCard"><div className="kicker">PICKUP PLAN <i /></div><h2>{pickupLabel(t.pickupType)}</h2>{t.pickupType === "city_points" ? <><p>For this pilgrimage, pickup is available at these points in {t.pickupCity || t.origin || settings.origin}:</p><ul className="pickupMapList">{(t.pickupPoints || []).map((point) => <li key={point}><span>{point}</span><a href={pickupMapUrl(t, point)} target="_blank" rel="noreferrer">Open in Google Maps <MapPin /></a></li>)}</ul></> : t.pickupType === "door_to_door" ? <><p>{t.tripType === "family_vacation" ? "Door-to-door pickup is available for this family holiday package." : "Door-to-door pickup is available for this package."}</p>{t.pickupDetails && <div className="vehicleExtraDetails">{t.pickupDetails}</div>}<small>Enter your complete pickup address while booking.</small></> : <p>Contact the trip team to confirm the pickup arrangement.</p>}</div>
              <h2>Your journey, at a glance</h2>
              <p>{t.description || t.summary}</p>
              <h2>What makes it special</h2>
              <p>{t.summary}</p>
              <h2>The itinerary</h2>
              <div className="itinerary">
                {days.map((d) => (
                  <div className="dayRow" key={d.day}>
                    <span>DAY {String(d.day).padStart(2, "0")}</span>
                    <div>
                      <b>{d.title}</b>
                      <p>{d.details}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="includeGrid">
                <div>
                  <h3>Included</h3>
                  {(t.inclusions?.length
                    ? t.inclusions
                    : [
                        "Trip coordination",
                        "Accommodation as per final itinerary",
                      ]
                  ).map((x) => (
                    <span key={x}>
                      <Check />
                      {x}
                    </span>
                  ))}
                </div>
                <div>
                  <h3>Not included</h3>
                  {(t.exclusions?.length
                    ? t.exclusions
                    : [
                        "Personal expenses",
                        "Anything not listed under inclusions",
                      ]
                  ).map((x) => (
                    <span key={x}>
                      <X />
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <aside className="bookingBox">
              <small>PER PERSON FROM</small>
              <b>{cash(t.price)}</b>
              {t.compareAtPrice > t.price && (
                <del>{cash(t.compareAtPrice)}</del>
              )}
              <hr />
              <span>
                <CalendarDays />
                Departure dates
              </span>
              <p>
                {t.departureDates?.length
                  ? t.departureDates.map(dateFmt).join(" · ")
                  : "Choose your preferred date"}
              </p>
              <span>
                <Users />
                Available spots
              </span>
              <p>{t.seatsAvailable} of {t.vehicleTotalSeats || t.maxGroupSize || 20} seats remaining</p>
              <small className="cancellationPolicyLine">Cancellation charge: {Number(t.cancellationFeePercent || 0)}% of the trip amount.</small>
              {Number(t.seatsAvailable) > 0 ? <button className="btn btn-dark full" onClick={() => startBooking(t)}>Book this trip <ArrowRight /></button> : <div className="fullSeatNotice">Seats full</div>}
              <small className="secureNote">
                <ShieldCheck />
                {paymentConfig.enabled ? "Secure online payment is available" : "Online payment will be enabled after gateway setup"}
              </small>
              <a
                href={`https://wa.me/${(settings.phone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                Questions? Talk to us
              </a>
            </aside>
          </div>
        </main>
        <Footer />
      </>
    );
  };
  return View();
}
