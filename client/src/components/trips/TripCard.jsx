import { useApp } from "../../context/AppContext";
import { ArrowRight, Clock3, Heart, MapPin, Star } from "lucide-react";import { cash, fallback } from "../../services/format";
import { tripTypeLabel, pickupLabel } from "../../services/trips";

export default function TripCard({t}) {
  const { go } = useApp();
  const View = ({ t }) => (
    <article className="tripCard">
      <button className="tripImage" onClick={() => go("trip", t)}>
        <img src={t.images?.[0] || fallback} alt={t.destination} />
        <span className="categoryPill">
          {t.category?.name || "India journey"}
        </span>
        <span className="heart">
          <Heart />
        </span>
      </button>
      <div className="tripBody">
        <div className="tripLocation">
          <MapPin />
          {t.destination}
          {t.state ? `, ${t.state}` : ""}
        </div>
        <div className="tripBadges">{t.tripType !== "general" && <span className="tripTypeBadge">{tripTypeLabel(t.tripType)}</span>}<span className={`seatAvailabilityBadge ${Number(t.seatsAvailable) <= 0 ? "soldOut" : ""}`}>{Number(t.seatsAvailable) <= 0 ? "Seats full" : `${t.seatsAvailable} seats left`}</span></div>
        <button className="tripTitle" onClick={() => go("trip", t)}>
          {t.title}
        </button>
        <div className="tripMeta">
          <span>
            <Clock3 />
            {t.durationDays} days · {t.durationNights} nights
          </span>
          <span>
            <Star className="star" fill="currentColor" />
            {t.rating || "4.8"}
          </span>
        </div>
        {t.vehicleType && <small className="tripVehicleLine">Travel by {({ bus: "Bus", car: "Car", traveller_van: "Traveller van", tempo_traveller: "Tempo traveller", train: "Train", other: "vehicle" })[t.vehicleType] || t.vehicleType}{t.vehicleName ? ` · ${t.vehicleName}` : ""} · {t.vehicleTotalSeats || t.maxGroupSize || 20} seats total</small>}
        {t.pickupType && t.pickupType !== "none" && <small className="tripPickupLine">{pickupLabel(t.pickupType)}</small>}
        <div className="tripCardBottom">
          <div>
            <small>Starting from</small>
            <b>
              {cash(t.price)}
              <em> / person</em>
            </b>
          </div>
          <button className="roundArrow" onClick={() => go("trip", t)}>
            <ArrowRight />
          </button>
        </div>
      </div>
    </article>
  );
  return View({ t });
}
