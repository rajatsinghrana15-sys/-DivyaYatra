import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import DestinationSelect from "../common/DestinationSelect";
import UseLocationButton from "../common/UseLocationButton";
import { OTHER_DESTINATION, uniqueSorted } from "../../services/destinations";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function PlanTripRequest() {
  const { user, trips, notice } = useApp();
  const destinations = useMemo(() => uniqueSorted((trips || []).map((trip) => trip.destination)), [trips]);
  const [form, setForm] = useState({ destination: "", otherDestination: "", tripId: "", groupType: "family", travelers: "1", pickupLocation: "", travelDate: "", contactName: user?.name || "", contactPhone: user?.phone || "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const destination = form.destination === OTHER_DESTINATION ? form.otherDestination.trim() : form.destination;
    try {
      const result = await api("/trip-requests", { method: "POST", body: { ...form, destination, tripId: form.tripId || undefined, travelers: Number(form.travelers) } });
      notice(result.message || "Trip request sent.");
      setForm((current) => ({ ...current, destination: "", otherDestination: "", tripId: "", pickupLocation: "", travelDate: "", notes: "" }));
    } catch (issue) {
      setError(issue.message || "Trip request could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  return <form className="tripRequestDashboardForm" onSubmit={submit}>
    <div className="adminSectionHead"><div><h2>Plan a trip with us</h2><p>Tell us where you want to go. The trip team will contact you with a route, pickup plan and quote.</p></div></div>
    <div className="tripRequestDashboardGrid">
      <DestinationSelect label="Destination" required value={form.destination} otherValue={form.otherDestination} options={destinations} onChange={({ value, otherValue }) => setForm((current) => ({ ...current, destination: value, otherDestination: otherValue, tripId: value === OTHER_DESTINATION ? "" : (trips || []).find((trip) => trip.destination === value)?._id || "" }))} />
      <label>Listed trip (optional)<select value={form.tripId} onChange={(event) => { const trip = (trips || []).find((item) => item._id === event.target.value); setForm((current) => ({ ...current, tripId: trip?._id || "", destination: trip?.destination || current.destination, otherDestination: "", groupType: trip?.tripAudience || current.groupType, pickupLocation: trip?.pickupPoints?.[0] || trip?.pickupCity || current.pickupLocation })); }}><option value="">Custom route</option>{(trips || []).map((trip) => <option key={trip._id} value={trip._id}>{trip.title} · {trip.destination}</option>)}</select></label>
      <label>Travelling as<select required value={form.groupType} onChange={(event) => set("groupType", event.target.value)}><option value="family">Family</option><option value="friends">Friends</option><option value="school_college">School / college</option></select></label>
      <label>Travellers<input type="number" min="1" max="100" required value={form.travelers} onChange={(event) => set("travelers", event.target.value)} /></label>
      <label>Pickup location<input required minLength="3" maxLength="300" value={form.pickupLocation} onChange={(event) => set("pickupLocation", event.target.value)} placeholder="Address, area or city" /><UseLocationButton short onFill={(value) => set("pickupLocation", value)} /></label>
      <label>Preferred travel date<input type="date" required min={today()} value={form.travelDate} onChange={(event) => set("travelDate", event.target.value)} /></label>
      <label>Your name<input required minLength="2" maxLength="100" value={form.contactName} onChange={(event) => set("contactName", event.target.value)} /></label>
      <label>Phone number<input type="tel" required minLength="10" maxLength="30" value={form.contactPhone} onChange={(event) => set("contactPhone", event.target.value)} /></label>
      <label className="tripRequestDashboardNotes">Notes (optional)<textarea rows="3" maxLength="1000" value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Pickup timing, children, accessibility needs or other preferences" /></label>
    </div>
    {error && <p className="memoryError" role="alert">{error}</p>}
    <div className="tripRequestDashboardActions"><small>Sending a request does not confirm a booking or charge you.</small><button className="btn btn-dark" disabled={busy}>{busy ? "Sending…" : "Send trip request"} <ArrowRight /></button></div>
  </form>;
}
