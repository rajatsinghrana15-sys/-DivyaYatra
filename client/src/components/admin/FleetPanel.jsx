import ActionMenu from "../common/ActionMenu";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { cash, dateFmt } from "../../services/format";
import { vehicleLabel, reasonText } from "../family/FamilyTripRequest";

const blank = { name: "", type: "car", seats: 4, registrationNo: "", driverName: "", driverPhone: "", pricePerDay: 0, image: "", features: "", status: "available", notes: "" };

export default function FleetPanel() {
  const { notice } = useApp();
  const [list, setList] = useState([]), [from, setFrom] = useState(""), [to, setTo] = useState(""), [form, setForm] = useState(null);
  const ranged = Boolean(from && to && to >= from);
  const load = () => api(`/admin/vehicles${ranged ? `?from=${from}&to=${to}` : ""}`).then(setList).catch((e) => notice(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [from, to]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const send = async (v, extra = {}) => { try { await api(v._id ? `/admin/vehicles/${v._id}` : "/admin/vehicles", { method: v._id ? "PATCH" : "POST", body: { ...v, ...extra } }); setForm(null); load(); } catch (x) { notice(x.message); } };
  const del = async (v) => { if (!confirm(`Delete ${v.name}?`)) return; try { await api(`/admin/vehicles/${v._id}`, { method: "DELETE" }); load(); } catch (x) { notice(x.message); } };

  return <>
    <div className="adminSectionHead"><div><h2>Vehicles <small>{list.length}</small></h2><p>Your fleet. Families choose from vehicles that are free on their dates.</p></div><button className="btn btn-dark" onClick={() => setForm({ ...blank })}><Plus /> Add vehicle</button></div>
    <div className="fleetBar"><label>Check free vehicles from<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>to<input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} /></label>{ranged && <button className="btn btn-outline btn-sm" onClick={() => { setFrom(""); setTo(""); }}>Clear dates</button>}</div>
    {form && <form className="frCard" onSubmit={(e) => { e.preventDefault(); send(form); }}><div className="frGrid">
      <label>Vehicle name<input required value={form.name} onChange={set("name")} placeholder="Tempo Traveller 12 seater" /></label>
      <label>Type<select value={form.type} onChange={set("type")}>{Object.entries(vehicleLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label>Seats<input type="number" min="1" required value={form.seats} onChange={set("seats")} /></label>
      <label>Price per day (INR)<input type="number" min="0" value={form.pricePerDay} onChange={set("pricePerDay")} /></label>
      <label>Registration number<input value={form.registrationNo || ""} onChange={set("registrationNo")} /></label>
      <label>Driver name<input value={form.driverName || ""} onChange={set("driverName")} /></label>
      <label>Driver phone<input value={form.driverPhone || ""} onChange={set("driverPhone")} /></label>
      <label>Status<select value={form.status} onChange={set("status")}><option value="available">Available</option><option value="maintenance">Under maintenance</option><option value="unavailable">Not available</option></select></label>
      <label className="span">Photo URL<input value={form.image || ""} onChange={set("image")} /></label>
      <label className="span">Features (comma separated)<input value={form.features} onChange={set("features")} placeholder="AC, Pushback seats, Music system" /></label>
      <label className="span">Private notes (only you see this)<textarea rows="2" value={form.notes || ""} onChange={set("notes")} /></label></div>
      <div className="chipRow"><button className="btn btn-dark btn-sm">{form._id ? "Save vehicle" : "Add vehicle"}</button><button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button></div></form>}
    <div className="fleetGrid">{list.map((v) => <article className="fleetCard" key={v._id}>
      <b>{v.name}</b><small>{vehicleLabel[v.type]} · {v.seats} seats{v.pricePerDay ? ` · ${cash(v.pricePerDay)} per day` : ""}</small>
      <small>{v.registrationNo || "No registration added"}{v.driverName ? ` · Driver: ${v.driverName}${v.driverPhone ? ` (${v.driverPhone})` : ""}` : ""}</small>
      {ranged && <span className={"vehTag" + (v.available ? " ok" : "")}>{v.available ? "Free on these dates" : reasonText[v.reason]}</span>}
      <label>Status<select value={v.status} onChange={(e) => send({ ...v, features: v.features }, { status: e.target.value })}><option value="available">Available</option><option value="maintenance">Under maintenance</option><option value="unavailable">Not available</option></select></label>
      <small><b>Upcoming bookings</b></small>
      {v.schedule?.length ? <ul>{v.schedule.map((s) => <li key={s._id}>{dateFmt(s.from)} to {dateFmt(s.to)}: {s.family} to {s.destination} ({s.status})</li>)}</ul> : <small>Nothing booked yet.</small>}
      <div className="chipRow"><button className="btn btn-dark btn-sm" onClick={() => setForm({ ...v, features: (v.features || []).join(", ") })}>Edit</button><ActionMenu items={[{ label: "Edit vehicle", icon: Pencil, onClick: () => setForm({ ...v, features: (v.features || []).join(", ") }) }, { label: "Delete vehicle", icon: Trash2, danger: true, onClick: () => del(v) }]} /></div></article>)}
      {!list.length && <div className="adminEmpty">No vehicles yet. Add your first vehicle.</div>}</div>
  </>;
}
