import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { dateFmt } from "../../services/format";
import ActionMenu from "../common/ActionMenu";
import { PhoneCall, MessageCircle, Send, MapPin, Copy } from "lucide-react";
import { vehicleLabel } from "../family/FamilyTripRequest";

function Row({ r, reload }) {
  const { notice } = useApp();
  const init = () => ({
    status: r.status,
    vehicle: r.vehicle?._id || "",
    quotedAmount: r.quotedAmount || 0,
    adminNote: r.adminNote || "",
  });
  const [d, setD] = useState(init);
  useEffect(() => {
    setD(init());
  }, [r.updatedAt]);
  const open = ["pending", "confirmed"].includes(r.status);
  const save = async () => {
    try {
      await api(`/admin/family-bookings/${r._id}`, {
        method: "PATCH",
        body: { ...d, vehicle: d.vehicle || null },
      });
      notice("Family request updated.");
      reload();
    } catch (x) {
      notice(x.message);
    }
  };
  return (
    <tr>
      <td data-label="Family">
        <b>{r.contactName || r.user?.name}</b>
        <small className="cellSub">
          <a href={`tel:${r.contactPhone}`}>{r.contactPhone}</a>
        </small>
        <small className="cellSub">{r.user?.email}</small>
      </td>
      <td data-label="Trip">
        <b>{r.destination}</b>
        <small className="cellSub">
          {dateFmt(r.startDate)} to {dateFmt(r.endDate)}
        </small>
        <small className="cellSub">{r.members} people</small>
        <small className="cellSub">Pickup: {r.pickupAddress}</small>
        {r.notes && <small className="cellSub">Note: {r.notes}</small>}
      </td>
      <td data-label="Vehicle chosen">
        {r.requestedVehicle
          ? `${r.requestedVehicle.name} (${r.requestedVehicle.seats} seats)`
          : "No preference"}
        {r.vehicleConflict && (
          <small className="cellSub warnTxt">
            This vehicle is no longer free on these dates. Reassign it.
          </small>
        )}
      </td>
      <td data-label="Free vehicles">
        {open ? (
          <div className="chipRow">
            {r.availableVehicles?.length ? (
              r.availableVehicles.map((v) => (
                <span className="miniChip" key={v._id}>
                  {v.name} · {v.seats} seats
                </span>
              ))
            ) : (
              <small className="warnTxt">
                No free vehicle fits this group on these dates
              </small>
            )}
          </div>
        ) : (
          "-"
        )}
      </td>
      <td data-label="Assign vehicle">
        <select
          className="familyRequestField"
          value={d.vehicle}
          disabled={!open}
          onChange={(e) => setD({ ...d, vehicle: e.target.value })}
        >
          <option value="">Not assigned</option>
          {(r.availableVehicles || []).map((v) => (
            <option key={v._id} value={v._id}>
              {v.name} ({vehicleLabel[v.type]}, {v.seats})
            </option>
          ))}
        </select>
      </td>
      <td data-label="Quote and note">
        <div className="familyQuoteFields">
          <input
            className="familyRequestField"
            aria-label="Quote amount in rupees"
            type="number"
            min="0"
            disabled={!open}
            value={d.quotedAmount}
            onChange={(e) => setD({ ...d, quotedAmount: e.target.value })}
          />
          <input
            className="familyRequestField"
            aria-label="Note for family"
            placeholder="Note for family"
            disabled={!open}
            value={d.adminNote}
            onChange={(e) => setD({ ...d, adminNote: e.target.value })}
          />
        </div>
      </td>
      <td data-label="Status">
        <div className="familyStatusControls">
          <select
            className="familyRequestField"
            aria-label="Request status"
            value={d.status}
            onChange={(e) => setD({ ...d, status: e.target.value })}
          >
            {["pending", "confirmed", "cancelled", "completed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button type="button" className="btn btn-dark btn-sm" onClick={save}>
            Save
          </button>
        </div>
      </td>
      <td data-label="Contact actions">
        {(() => {
          const ph = String(r.contactPhone || r.user?.phone || "").replace(
            /[^\d+]/g,
            "",
          );
          return (
            <ActionMenu
              items={[
                {
                  label: "Call family",
                  icon: PhoneCall,
                  hidden: !ph,
                  href: `tel:${ph}`,
                },
                {
                  label: "WhatsApp",
                  icon: MessageCircle,
                  hidden: !ph,
                  href: `https://wa.me/${ph.replace(/^\+/, "")}?text=${encodeURIComponent(`Hello ${r.contactName || ""}, this is Yatra Sang Raghuvanshi about your trip to ${r.destination}.`)}`,
                },
                {
                  label: "Email",
                  icon: Send,
                  hidden: !r.user?.email,
                  href: `mailto:${r.user?.email}`,
                },
                {
                  label: "Open pickup on map",
                  icon: MapPin,
                  hidden: !r.pickupAddress,
                  href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.pickupAddress || "")}`,
                },
                {
                  label: "Copy pickup address",
                  icon: Copy,
                  hidden: !r.pickupAddress,
                  onClick: () =>
                    navigator.clipboard?.writeText(r.pickupAddress),
                },
              ]}
            />
          );
        })()}
      </td>
    </tr>
  );
}

export default function FamilyRequestsPanel() {
  const { notice } = useApp();
  const [rows, setRows] = useState([]),
    [flt, setFlt] = useState("all");
  const load = () =>
    api("/admin/family-bookings")
      .then(setRows)
      .catch((e) => notice(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  const shown = rows.filter((r) => flt === "all" || r.status === flt);
  return (
    <div className="familyRequestPanel">
      <div className="adminSectionHead">
        <div>
          <h2>
            Family requests <small>{rows.length}</small>
          </h2>
          <p>
            Each request shows which vehicle the family chose and which vehicles
            are free on their dates. Assign one, add a quote, then confirm.
          </p>
        </div>
      </div>
      <div className="chipRow" style={{ marginBottom: ".8rem" }}>
        {["all", "pending", "confirmed", "cancelled", "completed"].map((s) => (
          <button
            key={s}
            className={"btn btn-sm " + (flt === s ? "btn-dark" : "btn-outline")}
            onClick={() => setFlt(s)}
          >
            {s}
            {s === "pending"
              ? ` (${rows.filter((r) => r.status === "pending").length})`
              : ""}
          </button>
        ))}
      </div>
      <div className="adminTableWrap familyRequestTableWrap">
        <table>
          <thead>
            <tr>
              <th>Family</th>
              <th>Trip</th>
              <th>Vehicle chosen</th>
              <th>Free on these dates</th>
              <th>Assign vehicle</th>
              <th>Quote (INR) and note</th>
              <th>Status</th>
              <th aria-label="Contact"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <Row key={r._id} r={r} reload={load} />
            ))}
            {!shown.length && (
              <tr>
                <td colSpan="8" className="adminEmptyCell">
                  No family requests here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
