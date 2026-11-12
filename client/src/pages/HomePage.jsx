import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Heart,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { cash, dateFmt, fallback } from "../services/format";
import { tripTypeLabel } from "../services/trips";
import {
  OTHER_DESTINATION as otherDestination,
  uniqueSorted,
} from "../services/destinations";
import Footer from "../components/layout/Footer";
import GalleryAndReviews from "../components/community/GalleryAndReviews";

export default function HomePage() {
  const { settings, trips, user, go, goToSection } = useApp();
  const [catalogue, setCatalogue] = useState({
    search: "",
    audience: "all",
    destination: "all",
    otherDestination: "",
    vehicle: "all",
    pickup: "all",
    date: "",
  });
  const audienceOf = (trip) =>
    trip.tripAudience ||
    (trip.tripType === "family" || trip.tripType === "family_vacation"
      ? "family"
      : "friends");
  const adminDestinations = uniqueSorted(
    trips.map((trip) => trip.destination).filter(Boolean),
  );
  const catalogueTrips = useMemo(
    () =>
      trips.filter((trip) => {
        const query = catalogue.search.trim().toLocaleLowerCase();
        const pickupMatches = [
          trip.pickupCity,
          ...(trip.pickupPoints || []),
          trip.origin,
        ].filter(Boolean);
        const dates = (trip.departureDates || []).map((date) =>
          new Date(date).toISOString().slice(0, 10),
        );
        return (
          (catalogue.audience === "all" ||
            audienceOf(trip) === catalogue.audience) &&
          (catalogue.destination === "all" ||
            (catalogue.destination === otherDestination
              ? !catalogue.otherDestination.trim() ||
                `${trip.destination} ${trip.state || ""} ${trip.title}`
                  .toLocaleLowerCase()
                  .includes(
                    catalogue.otherDestination.trim().toLocaleLowerCase(),
                  )
              : trip.destination === catalogue.destination)) &&
          (catalogue.vehicle === "all" ||
            trip.vehicleType === catalogue.vehicle) &&
          (catalogue.pickup === "all" ||
            pickupMatches.includes(catalogue.pickup)) &&
          (!catalogue.date || dates.includes(catalogue.date)) &&
          (!query ||
            `${trip.title} ${trip.destination} ${trip.state || ""} ${trip.summary || ""} ${trip.vehicleName || ""}`
              .toLocaleLowerCase()
              .includes(query))
        );
      }),
    [trips, catalogue],
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcomingTrips = Array.from(
    trips.reduce((byTrip, trip) => {
      const nextDate = (trip.departureDates || [])
        .map((date) => new Date(date))
        .filter((date) => !Number.isNaN(date.getTime()) && date >= today)
        .sort((a, b) => a - b)[0];
      const id = String(trip._id);
      if (nextDate && !byTrip.has(id)) byTrip.set(id, { trip, date: nextDate });
      return byTrip;
    }, new Map()).values(),
  ).sort((a, b) => a.date - b.date);
  const selectOfferedDestination = (destination) => {
    setCatalogue((current) => ({
      ...current,
      destination: adminDestinations.includes(destination)
        ? destination
        : "all",
    }));
    goToSection("journeys");
  };
  const View = (
    <>
      <main>
        <section className="hero">
          <div
            className="heroImage"
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(14,26,51,.84),rgba(14,26,51,.1)),url("${settings.heroImageUrl || "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=2200&q=88"}")`,
            }}
          />
          <div className="heroContent">
            <div className="heroTag">
              <span /> JOURNEYS ACROSS INDIA <i />
            </div>
            <h1>
              {settings.heroTitle || "India, apne"}
              <br />
              <em>{settings.heroAccent || "andaaz mein."}</em>
            </h1>
            <p>
              {settings.heroDescription ||
                "Big mountains, old stories, new friends. Find your next journey with a travel crew from Ambala."}
            </p>
            <div className="heroCtas">
              <button
                className="btn btn-lime"
                onClick={() => goToSection("journeys")}
              >
                Find your trip <ArrowRight />
              </button>
              <a
                className="heroCall"
                href={`https://wa.me/${(settings.phone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Phone /> Talk to our trip planner
              </a>
            </div>
            <div className="heroStats">
              <div>
                <b>Across India</b>
                <small>Journeys for every mood</small>
              </div>
              <div>
                <b>Made for you</b>
                <small>Groups and private trips</small>
              </div>
            </div>
          </div>
          <div className="heroStamp">
            <span>
              THE GOOD
              <br />
              TRIP CLUB
            </span>
            <Compass />
          </div>
          <div className="heroCaption">
            Start somewhere wonderful <ArrowUpRight />
          </div>
        </section>
        <section
          className="offeredDestinationRail"
          aria-label="Destinations currently offered"
        >
          <div>
            <span className="kicker">
              PLACES WE CAN TAKE YOU <i />
            </span>
            <p>Choose an offered destination to start a trip request.</p>
          </div>
          <div className="offeredDestinationChips">
            {adminDestinations.length ? (
              adminDestinations.map((destination) => (
                <button
                  key={destination}
                  onClick={() => selectOfferedDestination(destination)}
                >
                  {destination}
                  <ArrowRight />
                </button>
              ))
            ) : (
              <small>Destinations will appear when the admin adds trips.</small>
            )}
          </div>
        </section>
        <section className="upcomingSection" aria-label="Upcoming departures">
          <div className="upcomingHeading">
            <div>
              <span className="kicker">
                COMING UP SOON <i />
              </span>
              <h2>
                Your next trip is <em>on the calendar.</em>
              </h2>
              <p>See upcoming departures, transport and seats in one place.</p>
            </div>
            <button
              className="catalogueBrowse"
              onClick={() => goToSection("journeys")}
            >
              Explore all trips <ArrowRight />
            </button>
          </div>
          {upcomingTrips.length ? (
            <div className="upcomingGrid">
              {upcomingTrips.map(({ trip, date }) => {
                const daysAway = Math.max(
                  0,
                  Math.ceil((date - today) / 86400000),
                );
                const vehicleNames = {
                  bus: "Bus",
                  car: "Car",
                  traveller_van: "Traveller van",
                  tempo_traveller: "Tempo traveller",
                  train: "Train",
                  other: "Vehicle",
                };
                const departureStock = trip.departureAvailability?.find(
                  (entry) =>
                    new Date(entry.date).toISOString().slice(0, 10) ===
                    date.toISOString().slice(0, 10),
                );
                const seatsLeft = Number(
                  departureStock?.seatsAvailable ?? trip.seatsAvailable ?? 0,
                );
                const soldOut = seatsLeft <= 0;
                return (
                  <article
                    className="upcomingCard"
                    key={trip._id}
                  >
                    <button
                      className="upcomingPhoto"
                      onClick={() => go("trip", trip)}
                    >
                      <img
                        src={trip.images?.[0] || fallback}
                        alt={trip.destination}
                      />
                      <span>
                        {daysAway === 0
                          ? "LEAVES TODAY"
                          : `IN ${daysAway} DAYS`}
                      </span>
                    </button>
                    <div className="upcomingInfo">
                      <div className="upcomingMeta">
                        <span>{dateFmt(date)}</span>
                        {trip.tripType !== "general" && (
                          <b>{tripTypeLabel(trip.tripType)}</b>
                        )}
                      </div>
                      <button
                        className="upcomingTitle"
                        onClick={() => go("trip", trip)}
                      >
                        {trip.title}
                      </button>
                      <p>
                        <MapPin />
                        {trip.destination} ·{" "}
                        {vehicleNames[trip.vehicleType] ||
                          "Transport details soon"}
                        {trip.vehicleName ? ` · ${trip.vehicleName}` : ""}
                      </p>
                      <div
                        className={`upcomingSeats ${soldOut ? "soldOut" : ""}`}
                      >
                        {soldOut
                          ? "Seats full"
                          : `${seatsLeft} of ${trip.vehicleTotalSeats || trip.maxGroupSize || 20} seats left`}
                      </div>
                      <b className="upcomingPrice">{cash(trip.price)} <small>/ person</small></b>
                      {!soldOut && (
                        <button
                          className="btn btn-dark btn-sm"
                          onClick={() => go("trip", trip)}
                        >
                          View & book <ArrowRight />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="upcomingEmpty">
              Upcoming departures added by the travel team will appear here.
            </div>
          )}
        </section>
        <section
          className="destinationShowcase"
          id="journeys"
          aria-label="Search and book trips"
        >
          <div className="homepageTripTools">
            <label className="homepageTripSearch">
              <Search />
              <input
                type="search"
                value={catalogue.search}
                onChange={(event) => setCatalogue((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search trips, destinations or places"
                aria-label="Search trips and destinations"
              />
            </label>
            <button className="btn btn-dark" onClick={() => user ? go("mybookings", { dashboardTab: "requests" }) : go("auth")}>
              Plan a trip <ArrowRight />
            </button>
          </div>
          <div className="catalogueResultHead">
            <b>
              {catalogueTrips.length}{" "}
              {catalogueTrips.length === 1 ? "trip" : "trips"} found
            </b>
            <small>
              Prices are shown per person. Family, friends and school/college
              options are managed by the admin.
            </small>
          </div>
          {catalogueTrips.length ? (
            <div className="destinationGrid">
              {catalogueTrips.map((trip) => {
                const dateOptions = (trip.departureDates || [])
                  .map((date) => new Date(date).toISOString().slice(0, 10))
                  .filter((date) => date >= todayKey);
                const pickedDate =
                  catalogue.date && dateOptions.includes(catalogue.date)
                    ? catalogue.date
                    : dateOptions[0] || "";
                return (
                  <article className="destinationCard" key={trip._id}>
                    <button
                      className="destinationPhoto"
                      onClick={() => go("trip", trip)}
                    >
                      <img
                        src={trip.images?.[0] || fallback}
                        alt={trip.destination}
                      />
                    </button>
                    <div className="destinationInfo">
                      <small>
                        {
                          {
                            family: "Family",
                            friends: "Friends",
                            school_college: "School / college",
                          }[audienceOf(trip)]
                        }{" "}
                        trip · {tripTypeLabel(trip.tripType)}
                      </small>
                      <h3>
                        {trip.destination}
                        {trip.state ? `, ${trip.state}` : ""}
                      </h3>
                      <h4>{trip.title}</h4>
                      <div className="destinationFacts">
                        <span>
                          {trip.durationDays} days · {trip.durationNights}{" "}
                          nights
                        </span>
                        <b>{cash(trip.price)} / person</b>
                      </div>
                      <small className="destinationDeparture">
                        {pickedDate
                          ? `Next departure · ${dateFmt(pickedDate)}`
                          : "Departure date to be announced"}
                      </small>
                      <div className="destinationCardActions">
                        <button
                          className="btn btn-dark btn-sm"
                          onClick={() => go("trip", trip)}
                        >
                          View details <ArrowRight />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="upcomingEmpty">
              No trips match these choices. Try a different date or clear one of
              the filters.
            </div>
          )}
        </section>
        <section className="trustStrip">
          {[
            [Phone, "Easy planning", "Everything in one place"],
            [ShieldCheck, "Traveller first", "Clear trip details and support"],
            [MapPin, "Starting from Ambala", "Going all over India"],
            [Heart, "Good people, good trips", "Memories made together"],
          ].map(([I, a, b]) => (
            <div key={a}>
              <I />
              <span>
                <b>{a}</b>
                <small>{b}</small>
              </span>
            </div>
          ))}
        </section>
        <section className="section journeys" id="memories">
          <GalleryAndReviews />
          <div className="aboutBand" id="about">
            <div className="aboutPhoto">
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=85"
                alt="Open road through scenic landscape"
              />
              <span className="photoBadge">
                <MapPin />
                {settings.origin}
              </span>
            </div>
            <div className="aboutCopy">
              <div className="kicker">
                A LITTLE ABOUT US <i />
              </div>
              <h2>
                {settings.aboutTitle || (
                  <>
                    Make room for
                    <br />
                    the <em>unexpected.</em>
                  </>
                )}
              </h2>
              <p>
                {settings.aboutDescription ||
                  `${settings.businessName} brings travellers together for memorable journeys around India. Based in Ambala, we’re here to help you find a route, a crew and a story worth telling.`}
              </p>
              <div className="aboutFacts">
                <div>
                  <span>01</span>
                  <b>Thoughtful routes</b>
                </div>
                <div>
                  <span>02</span>
                  <b>Good company</b>
                </div>
                <div>
                  <span>03</span>
                  <b>Personal support</b>
                </div>
              </div>
              <button
                className="textArrow"
                onClick={() => goToSection("journeys")}
              >
                Meet your next trip <ArrowRight />
              </button>
            </div>
          </div>
          <div className="quoteBand">
            <span>“</span>
            <p>
              {settings.quoteText ||
                "The best souvenirs are the stories you bring back."}
            </p>
            <small>— THE YATRA WAY</small>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
  return View;
}
