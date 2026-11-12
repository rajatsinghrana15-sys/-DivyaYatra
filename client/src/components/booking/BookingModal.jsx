import UseLocationButton from "../common/UseLocationButton";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Monitor, ShieldCheck, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { cash, dateFmt } from "../../services/format";
import { pickupMapUrl } from "../../services/trips";

const makeSeatLabels = (count) => Array.from({ length: count }, (_, index) => `${String.fromCharCode(65 + Math.floor(index / 4))}${(index % 4) + 1}`);

export default function BookingModal() {
  const { user, bookingTrip, setBookingTrip, bookingDate, book, busy, paymentConfig } = useApp();
  const dates = bookingTrip?.departureDates || [];
  const pickupType = bookingTrip?.pickupType || "none";
  const fallbackDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const firstDate = dates.length ? new Date(dates[0]).toISOString().slice(0, 10) : fallbackDate;
  const [travelDate, setTravelDate] = useState(bookingDate && dates.some((date) => new Date(date).toISOString().slice(0, 10) === bookingDate) ? bookingDate : firstDate);
  const [travelerCounts, setTravelerCounts] = useState({ men: 0, women: 0, children: 0 });
  const travellers = travelerCounts.men + travelerCounts.women + travelerCounts.children;
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedPickup, setSelectedPickup] = useState("");
  const [occupied, setOccupied] = useState([]);
  const [remaining, setRemaining] = useState(bookingTrip?.seatsAvailable || 0);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [seatError, setSeatError] = useState("");
  const capacity = Math.max(1, Math.min(60, Number(bookingTrip?.vehicleTotalSeats || bookingTrip?.maxGroupSize || 20)));
  const seats = useMemo(() => makeSeatLabels(capacity), [capacity]);
  const setPassengerCount = (kind, value) => {
    const otherCount = Object.entries(travelerCounts).reduce((sum, [key, count]) => sum + (key === kind ? 0 : count), 0);
    const maximum = Math.max(0, Math.min(20, capacity, remaining) - otherCount);
    setTravelerCounts((current) => ({ ...current, [kind]: Math.max(0, Math.min(maximum, Number(value) || 0)) }));
  };

  useEffect(() => {
    setTravelDate(bookingDate && dates.some((date) => new Date(date).toISOString().slice(0, 10) === bookingDate) ? bookingDate : firstDate);
    setSelectedSeats([]);
    setSelectedPickup("");
    setTravelerCounts({ men: 0, women: 0, children: 0 });
  }, [firstDate, bookingTrip?._id, bookingDate]);

  useEffect(() => {
    if (!bookingTrip?._id || !travelDate) return undefined;
    let current = true;
    setLoadingSeats(true);
    setSeatError("");
    setSelectedSeats([]);
    api(`/trips/${bookingTrip._id}/seats?travelDate=${encodeURIComponent(travelDate)}`)
      .then((result) => {
        if (!current) return;
        setOccupied(result.occupied || []);
        setRemaining(Number(result.available ?? bookingTrip.seatsAvailable ?? 0));
      })
      .catch((error) => { if (current) setSeatError(error.message || "Seats could not be loaded."); })
      .finally(() => { if (current) setLoadingSeats(false); });
    return () => { current = false; };
  }, [bookingTrip?._id, travelDate]);

  useEffect(() => {
    const maxPeople = Math.max(0, Math.min(20, capacity, remaining));
    setTravelerCounts((current) => {
      let over = current.men + current.women + current.children - maxPeople;
      if (over <= 0) return current;
      const next = { ...current };
      for (const kind of ["children", "women", "men"]) {
        const remove = Math.min(next[kind], over);
        next[kind] -= remove;
        over -= remove;
      }
      return next;
    });
  }, [capacity, remaining]);

  const toggleSeat = (seat) => {
    if (occupied.includes(seat)) return;
    setSelectedSeats((current) => current.includes(seat)
      ? current.filter((item) => item !== seat)
      : current.length < travellers ? [...current, seat] : current);
  };

  if (!bookingTrip) return null;
  const canBook = travellers > 0 && selectedSeats.length === travellers && !loadingSeats && !seatError && remaining >= travellers;

  return (
    <div className="modalShade" onMouseDown={(event) => event.target === event.currentTarget && setBookingTrip(null)}>
      <div className="modal theaterModal">
        <button className="modalClose" onClick={() => setBookingTrip(null)} aria-label="Close booking"><X /></button>
        <div className="kicker">ONE STEP CLOSER</div>
        <h2>Choose your <em>seats.</em></h2>
        <p>{bookingTrip.title} · {cash(bookingTrip.price)} per traveller</p>
        <form onSubmit={book}>
          <div className="formGrid">
            <label>Departure date
              <select name="travelDate" required value={travelDate} onChange={(event) => setTravelDate(event.target.value)}>
                {dates.length ? dates.map((date) => {
                  const value = new Date(date).toISOString().slice(0, 10);
                  return <option key={value} value={value}>{dateFmt(date)}</option>;
                }) : <option value={fallbackDate}>{dateFmt(fallbackDate)} (request)</option>}
              </select>
            </label>
            {pickupType === "city_points" && <label className="span2 bookingPickupField">Choose your city pickup point
              <small>{bookingTrip.pickupCity ? `Pickup points in ${bookingTrip.pickupCity}` : "Choose from the listed city points"}</small><select name="pickupLocation" required value={selectedPickup} onChange={(event) => setSelectedPickup(event.target.value)}><option value="" disabled>Select a pickup point</option>{(bookingTrip.pickupPoints || []).map((point) => <option key={point} value={point}>{point}</option>)}</select>{selectedPickup && <a className="pickupMapAction" href={pickupMapUrl(bookingTrip, selectedPickup)} target="_blank" rel="noreferrer">Open selected point in Google Maps</a>}
              <small>For this pilgrimage, pickup is available only from these listed city points.</small>
            </label>}
            {pickupType === "door_to_door" && <div className="span2 bookingPickupField"><b>Door-to-door pickup</b><p>{bookingTrip.pickupDetails || "This family vacation package includes pickup from your address."}</p><label>Your complete pickup address<textarea id="bookingPickupAddress" name="pickupAddress" rows="3" required minLength="8" autoComplete="street-address" placeholder="House/flat, street, locality, city, PIN code" /><UseLocationButton onFill={(t) => { const el = document.getElementById("bookingPickupAddress"); if (el) el.value = t; }} /></label></div>}
            {pickupType === "none" && <div className="span2 bookingPickupNote">Pickup arrangements will be confirmed by the trip team.</div>}
            <div className="passengerCounts span2"><b>Who is travelling?</b><small>Select the passenger groups and quantities.</small><div className="passengerCountGrid">{[["men","Adult men"],["women","Adult women"],["children","Children"]].map(([key,label]) => <label key={key}>{label}<input type="number" min="0" max={Math.max(0,Math.min(20,capacity,remaining))} value={travelerCounts[key]} onChange={(event) => setPassengerCount(key,event.target.value)} /></label>)}</div><small className="passengerTotal">Total travellers: <b>{travellers}</b></small><input type="hidden" name="travelers" value={travellers} /><input type="hidden" name="men" value={travelerCounts.men} /><input type="hidden" name="women" value={travelerCounts.women} /><input type="hidden" name="children" value={travelerCounts.children} />{travellers === 0 && <small className="seatHint">Choose at least one passenger to see seat options.</small>}</div>
          </div>

          <section className="seatPicker" aria-label="Choose seats">
            <div className="seatPickerHead"><div><b>Select seats</b><small>{selectedSeats.length} of {travellers} selected · {remaining} left</small></div><span className="seatLegend"><i className="free" /> Available <i className="chosen" /> Selected <i className="taken" /> Booked</span></div>
            <div className="screenCurve"><Monitor /><span>FRONT / WINDOW SIDE</span></div>
            {loadingSeats ? <p className="seatMessage">Loading seat availability…</p> : seatError ? <p className="seatMessage seatError">{seatError}</p> : remaining < 1 ? <p className="seatMessage">This departure is fully booked.</p> : (
              <div className="seatGrid">
                {seats.map((seat) => {
                  const unavailable = occupied.includes(seat) || remaining < 1;
                  const selected = selectedSeats.includes(seat);
                  return <button key={seat} type="button" disabled={unavailable} aria-pressed={selected} className={`seat ${unavailable ? "taken" : selected ? "chosen" : "free"}`} onClick={() => toggleSeat(seat)}>{seat}</button>;
                })}
              </div>
            )}
            <input type="hidden" name="seatNumbers" value={selectedSeats.join(",")} />
            {selectedSeats.length !== travellers && !loadingSeats && !seatError && remaining > 0 && <small className="seatHint">Select {travellers - selectedSeats.length} more seat{travellers - selectedSeats.length === 1 ? "" : "s"} to continue.</small>}
          </section>

          <label>Booking contact<input name="contactName" defaultValue={user?.name} required /></label>
          <label>Phone number<input name="contactPhone" defaultValue={user?.phone || ""} required placeholder="+91" /></label>
          <label className="whatsappConsent"><input name="whatsappOptIn" type="checkbox" /><span>Send booking and status updates to this number on WhatsApp.</span></label>
          <label>Note for the trip team<textarea name="notes" rows="3" /></label>
          <div className="selectedSeatSummary">Passengers <b>{travelerCounts.men} men · {travelerCounts.women} women · {travelerCounts.children} children</b></div>
          <div className="selectedSeatSummary">Seats <b>{selectedSeats.length ? selectedSeats.join(", ") : "Choose seats above"}</b></div>
          <div className="modalTotal"><span>Total for {travellers} traveller{travellers === 1 ? "" : "s"}</span><b>{cash(bookingTrip.price * travellers)}</b></div>
          <small className="cancellationPolicyLine">If you cancel after paying, the cancellation charge is {Number(bookingTrip.cancellationFeePercent || 0)}%; eligible refunds are reviewed by the admin.</small>
          <button disabled={busy || !canBook} className="btn btn-dark full">{busy ? "Preparing booking…" : paymentConfig.enabled ? "Pay securely & book" : "Request these seats"} <ArrowRight /></button>
          <small className="secureNote"><ShieldCheck /> {paymentConfig.enabled ? "Payment is verified by the server before your booking is confirmed." : "Online payment is not configured; the trip team will follow up about payment."}</small>
        </form>
      </div>
    </div>
  );
}
