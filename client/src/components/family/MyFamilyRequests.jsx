import { useCallback, useEffect, useState } from "react";
import { Users, CalendarDays, Car, XCircle } from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { cash, dateFmt } from "../../services/format";

const tone = { pending: "wait", confirmed: "ok", completed: "ok", cancelled: "bad" };
export default function MyFamilyRequests() {
  const { notice, go } = useApp();
  const [rows, setRows] = useState(null);
  const load = useCallback(() => api("/family-bookings/mine").then(setRows).catch(() => setRows([])), []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  const cancel = async (id) => {
    if (!window.confirm("Cancel this family trip request?")) return;
    try { await api(`/family-bookings/${id}/cancel`, { method: "PATCH" }); notice("Request cancelled."); load(); } catch (x) { notice(x.message); }
  };
  return <section className="famReqSection">
    <div className="myMemHead"><h3>Your family trip requests</h3><button className="btn btn-outline btn-sm" onClick={() => go("familybooking")}>New request</button></div>
    {rows && !rows.length && <div className="upcomingEmpty">You have not sent a family trip request yet. Plan a private trip with the vehicle you prefer.</div>}
    <div className="famReqGrid">{(rows || []).map((r) => <article key={r._id} className="famReqCard">
      <div className="famReqTop"><div><b>{r.destination}</b><small><CalendarDays />{dateFmt(r.startDate)} to {dateFmt(r.endDate)}</small></div><span className={`memStatus ${tone[r.status] || "wait"}`}>{r.status}</span></div>
      <div className="famReqMeta"><span><Users />{r.members} people</span><span><Car />{r.vehicle ? `${r.vehicle.name} (${r.vehicle.seats} seats)` : "Vehicle to be assigned"}</span></div>
      <div className="famReqQuote"><small>Quote</small><b>{r.quotedAmount ? cash(r.quotedAmount) : "Pending"}</b></div>
      {r.adminNote && <p className="famReqNote"><b>Note from our team:</b> {r.adminNote}</p>}
      {["pending", "confirmed"].includes(r.status) && <button className="memRemove" onClick={() => cancel(r._id)}><XCircle /> Cancel request</button>}
    </article>)}</div>
  </section>;
}
