import UseLocationButton from "../common/UseLocationButton";
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { cash, dateFmt } from "../../services/format";
import { OTHER_DESTINATION, uniqueSorted } from "../../services/destinations";

export const vehicleLabel = { car: "Car", suv: "SUV", traveller_van: "Traveller van", tempo_traveller: "Tempo traveller", mini_bus: "Mini bus", bus: "Bus", other: "Other" };
export const reasonText = { booked: "Booked on these dates", maintenance: "Under maintenance", unavailable: "Not available", too_small: "Too small for your group" };
const today = () => new Date().toISOString().slice(0, 10);

export default function FamilyTripRequest() {
  const { user, trips, go, setAuthMode, notice } = useApp();
  const [f, setF] = useState({ destination: "", startDate: "", endDate: "", members: 4, contactName: user?.name || "", contactPhone: user?.phone || "", pickupAddress: "", notes: "" });
  const [otherDestination, setOtherDestination] = useState(false);
  const destinations = uniqueSorted((trips || []).map((trip) => trip.destination));
  const [fleet, setFleet] = useState([]), [pick, setPick] = useState(""), [mine, setMine] = useState([]), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ready = Boolean(f.startDate && f.endDate && f.endDate >= f.startDate);
  const loadMine = () => { if (user) api("/family-bookings/mine").then(setMine).catch(() => {}); };
  useEffect(loadMine, [user]);
  useEffect(() => {
    setPick("");
    if (!ready) { setFleet([]); return; }
    api(`/vehicles?from=${f.startDate}&to=${f.endDate}&members=${f.members || 1}`).then(setFleet).catch(() => setFleet([]));
  }, [f.startDate, f.endDate, f.members]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api("/family-bookings", { method: "POST", body: { ...f, vehicleId: pick || undefined } });
      notice("Request sent. We will confirm your vehicle and send a quote soon.");
      setF({ ...f, destination: "", notes: "" }); setOtherDestination(false); setPick(""); loadMine();
    } catch (x) { notice(x.message); } finally { setBusy(false); }
  };
  const cancel = async (id) => {
    if (!confirm("Cancel this family trip request?")) return;
    try { await api(`/family-bookings/${id}/cancel`, { method: "PATCH" }); loadMine(); } catch (x) { notice(x.message); }
  };

  return <section className="familyRequest" id="private-family-trip">
    <span className="kicker">PRIVATE FAMILY TRIP <i /></span><h2>Plan your own trip, with your own vehicle.</h2>
    <p>Travel with only your family. Choose your dates, see which vehicles are free, and pick the one you want. We confirm and send you a quote.</p>
    {!user ? <div className="frCard"><p>Please log in to request a private family trip.</p><button className="btn btn-dark" onClick={() => { setAuthMode("login"); go("auth"); }}>Log in or sign up</button></div>
      : <form className="frCard" onSubmit={submit}>
        <div className="frGrid">
          <label>Where do you want to go?<select required value={otherDestination ? OTHER_DESTINATION : f.destination} onChange={(event) => { const isOther = event.target.value === OTHER_DESTINATION; setOtherDestination(isOther); setF((current) => ({ ...current, destination: isOther ? "" : event.target.value })); }}><option value="">Choose an admin-listed destination</option>{destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}<option value={OTHER_DESTINATION}>Other — enter a destination</option></select></label>
          {otherDestination && <label>Your destination<input required maxLength="100" value={f.destination} onChange={set("destination")} placeholder="Type any place" /></label>}
          <label>Start date<input type="date" required min={today()} value={f.startDate} onChange={set("startDate")} /></label>
          <label>End date<input type="date" required min={f.startDate || today()} value={f.endDate} onChange={set("endDate")} /></label>
          <label>Family members traveling<input type="number" min="1" max="60" required value={f.members} onChange={set("members")} /></label>
          <label>Contact name<input required value={f.contactName} onChange={set("contactName")} /></label>
          <label>Phone number<input required value={f.contactPhone} onChange={set("contactPhone")} /></label>
          <label className="span">Pickup address<input required value={f.pickupAddress} onChange={set("pickupAddress")} placeholder="House number, area, city" /><UseLocationButton onFill={(t) => setF((c) => ({ ...c, pickupAddress: t }))} /></label>
          <label className="span">Anything we should know<textarea rows="2" value={f.notes} onChange={set("notes")} placeholder="Elders or kids, budget, hotel preference, stops you want" /></label>
        </div>
        <h3>Choose your vehicle</h3>
        {!ready ? <p className="muted">Pick your travel dates to see which vehicles are free.</p> : <div className="vehGrid">
          <label className={"vehCard" + (pick === "" ? " on" : "")}><input type="radio" name="veh" checked={pick === ""} onChange={() => setPick("")} /><b>Let the team suggest</b><small>We will assign the best free vehicle for your group.</small></label>
          {fleet.map((v) => <label key={v._id} className={"vehCard" + (pick === v._id ? " on" : "") + (v.available ? "" : " off")}>
            <input type="radio" name="veh" disabled={!v.available} checked={pick === v._id} onChange={() => setPick(v._id)} />
            {v.image && <img src={v.image} alt="" />}<b>{v.name}</b>
            <small>{vehicleLabel[v.type]} · {v.seats} seats{v.pricePerDay ? ` · ${cash(v.pricePerDay)} per day` : ""}</small>
            {v.features?.length > 0 && <small>{v.features.join(" · ")}</small>}
            <span className={"vehTag" + (v.available ? " ok" : "")}>{v.available ? "Available" : reasonText[v.reason] || "Not available"}</span></label>)}
        </div>}
        <button className="btn btn-dark" disabled={busy}>{busy ? "Sending..." : "Send request"}</button>
      </form>}
    {user && <p className="familyReqHint">Track your requests, quotes and notes from our team in your <button type="button" className="linkBtn" onClick={() => go("mybookings")}>dashboard</button>.</p>}
  </section>;
}
