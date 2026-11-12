import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, UserX, UserCheck, Mail, Phone } from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import ActionMenu from "../common/ActionMenu";

const permLabels = { bookings: "Bookings", departures: "Departures", "trip-requests": "Trip requests", family: "Family requests", trips: "Trips", categories: "Categories", vehicles: "Vehicles", travellers: "Travellers", gallery: "Gallery & reviews" };
const blank = { name: "", email: "", phone: "", password: "", permissions: ["bookings"] };

export default function StaffPanel() {
  const { notice } = useApp();
  const [data, setData] = useState({ staff: [], perms: Object.keys(permLabels) });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api("/admin/staff").then(setData).catch((e) => notice(e.message)), [notice]);
  useEffect(() => { load(); }, [load]);
  const toggle = (p) => setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }));
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { name: form.name, phone: form.phone, permissions: form.permissions, ...(form.password ? { password: form.password } : {}) };
      const r = form._id ? await api(`/admin/staff/${form._id}`, { method: "PATCH", body }) : await api("/admin/staff", { method: "POST", body: { ...body, email: form.email } });
      notice(r.message); setForm(null); load();
    } catch (err) { notice(err.message); } finally { setBusy(false); }
  };
  const patch = async (w, body) => { try { const r = await api(`/admin/staff/${w._id}`, { method: "PATCH", body }); notice(r.message); load(); } catch (e) { notice(e.message); } };
  const del = async (w) => { if (!window.confirm(`Delete ${w.name}'s worker account?`)) return; try { await api(`/admin/staff/${w._id}`, { method: "DELETE" }); notice("Worker deleted."); load(); } catch (e) { notice(e.message); } };
  return <>
    <div className="adminSectionHead"><div><h2>Workers <small>{data.staff.length}</small></h2><p>Create accounts for your team. Each worker sees only the sections you allow.</p></div><button className="btn btn-dark" onClick={() => setForm({ ...blank })}><Plus /> Add worker</button></div>
    {form && <form className="frCard staffForm" onSubmit={save}><div className="frGrid">
      <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label>Email (login){form._id ? <input value={form.email} disabled /> : <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</label>
      <label>Phone<input type="tel" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      <label>{form._id ? "New password (optional)" : "Password (min 8 characters)"}<input type="password" minLength="8" required={!form._id} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <fieldset className="span permBox"><legend>What can this worker manage?</legend><div>{data.perms.map((p) => <label key={p} className={form.permissions.includes(p) ? "on" : ""}><input type="checkbox" checked={form.permissions.includes(p)} onChange={() => toggle(p)} />{permLabels[p] || p}</label>)}</div></fieldset></div>
      <div className="chipRow"><button className="btn btn-dark btn-sm" disabled={busy}>{form._id ? "Save worker" : "Create worker"}</button><button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button></div></form>}
    <div className="staffGrid">{data.staff.map((w) => <article key={w._id} className={`staffCard${w.active ? "" : " off"}`}>
      <div className="staffTop"><span className="travellerAdminAvatar">{w.name?.[0]?.toUpperCase()}</span><div><b>{w.name}</b><small><Mail />{w.email}</small>{w.phone && <small><Phone />{w.phone}</small>}</div>
        <ActionMenu items={[{ label: "Edit details & access", icon: Pencil, onClick: () => setForm({ ...w, password: "" }) }, { label: "Reset password", icon: KeyRound, onClick: () => { const p = window.prompt("New password (min 8 characters)"); if (p) patch(w, { password: p }); } }, { label: w.active ? "Disable account" : "Enable account", icon: w.active ? UserX : UserCheck, onClick: () => patch(w, { active: !w.active }) }, { label: "Delete worker", icon: Trash2, danger: true, onClick: () => del(w) }]} /></div>
      <div className="permChips">{w.permissions.length ? w.permissions.map((p) => <i key={p}>{permLabels[p] || p}</i>) : <i>No access yet</i>}</div>{!w.active && <span className="memStatus rejected">Disabled</span>}</article>)}
      {!data.staff.length && <div className="adminEmpty">No workers yet. Add your first worker to share the workload.</div>}</div>
  </>;
}
