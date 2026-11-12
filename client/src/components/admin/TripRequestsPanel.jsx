import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Phone, Send, Users } from "lucide-react";
import { api } from "../../services/api";
import { dateFmt } from "../../services/format";
import { useApp } from "../../context/AppContext";

const groupLabels = { family: "Family", friends: "Friends", school_college: "School / college" };
const statusOptions = ["pending", "contacted", "approved", "declined", "completed"];

export default function TripRequestsPanel() {
  const { notice } = useApp();
  const [requests, setRequests] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = async () => {
    try { const list = await api("/admin/trip-requests"); setRequests(list); setDrafts(Object.fromEntries(list.map((item) => [item._id, { status: item.status, quoteAmount: item.quoteAmount || 0, adminNote: item.adminNote || "" }]))); setError(""); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);
  const updateDraft = (id, key, value) => setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  const save = async (event, id) => {
    event.preventDefault(); setBusyId(id); setError("");
    try { await api(`/admin/trip-requests/${id}`, { method: "PATCH", body: { ...drafts[id], quoteAmount: Number(drafts[id]?.quoteAmount || 0) } }); notice("Trip request updated."); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(""); }
  };

  return <div className="tripRequestAdmin"><div className="adminSectionHead"><div><h2>Personal trip requests <small>{requests.length}</small></h2><p>Review custom destination, group, traveller count, pickup and requested date. Contact the user, send a quote, then approve or decline.</p></div></div>
    {error && <p className="memoryError" role="alert">{error}</p>}
    {requests.length ? <div className="tripRequestAdminGrid">{requests.map((item) => { const phone = String(item.contactPhone || "").replace(/\D/g, ""); const message = encodeURIComponent(`Hi ${item.contactName}, we received your ${item.destination} trip request for ${dateFmt(item.travelDate)}. ${drafts[item._id]?.adminNote || ""}`); return <form className="tripRequestAdminCard" key={item._id} onSubmit={(event) => save(event, item._id)}>
      <div className="tripRequestAdminTitle"><div><small className={`status ${item.status}`}>{item.status}</small><h3>{item.destination}</h3><p>{item.trip?.title || "Custom route request"}</p></div><span>{groupLabels[item.groupType] || item.groupType}</span></div>
      <div className="tripRequestAdminFacts"><span><Users /> {item.travelers} travellers</span><span><CalendarDays /> {dateFmt(item.travelDate)}</span><span><MapPin /> Pickup: {item.pickupLocation}</span></div>
      <div className="tripRequestAdminContact"><b>{item.contactName}</b><small>{item.user?.email || ""}</small><a href={`tel:${item.contactPhone}`}><Phone /> {item.contactPhone}</a>{phone && <a href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noreferrer"><Send /> Contact on WhatsApp</a>}</div>
      {item.notes && <p className="tripRequestUserNote">Traveller note: {item.notes}</p>}
      <div className="tripRequestAdminControls"><label>Status<select value={drafts[item._id]?.status || item.status} onChange={(event) => updateDraft(item._id, "status", event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label>Quote (₹)<input type="number" min="0" step="1" value={drafts[item._id]?.quoteAmount ?? 0} onChange={(event) => updateDraft(item._id, "quoteAmount", event.target.value)} /></label><label className="tripRequestAdminNote">Message / admin note<textarea rows="3" maxLength="1200" value={drafts[item._id]?.adminNote || ""} onChange={(event) => updateDraft(item._id, "adminNote", event.target.value)} placeholder="Add itinerary, price or follow-up note" /></label></div>
      <button className="btn btn-dark btn-sm" disabled={busyId === item._id}>{busyId === item._id ? "Saving…" : "Save request & status"}</button>
    </form>; })}</div> : <div className="adminEmpty">No personal trip requests received yet.</div>}
  </div>;
}
