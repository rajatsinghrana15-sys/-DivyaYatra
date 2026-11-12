import { useEffect, useState } from "react";
import { CalendarDays, Inbox, MapPin, Users } from "lucide-react";
import { api } from "../../services/api";
import { cash, dateFmt } from "../../services/format";
import { useApp } from "../../context/AppContext";

const groupName = { family: "Family", friends: "Friends", school_college: "School / college" };

export default function MyTripRequests() {
  const { notice } = useApp();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let previous = null;
    const load = async () => {
      try {
        const latest = await api("/trip-requests/mine");
        if (!active) return;
        const statuses = new Map(latest.map((item) => [String(item._id), item.status]));
        if (previous) latest.forEach((item) => {
          const oldStatus = previous.get(String(item._id));
          if (oldStatus && oldStatus !== item.status) notice(`Trip request update: ${item.destination} is ${item.status}.`);
        });
        previous = statuses;
        setRequests(latest);
        setError("");
      } catch (issue) {
        if (active) setError(issue.message || "Could not load your trip requests.");
      }
    };
    load();
    const timer = setInterval(load, 20000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  if (error && !requests.length) return <div className="emptyState"><Inbox /><h3>Trip requests could not load</h3><p>{error}</p></div>;
  if (!requests.length) return <div className="emptyState"><Inbox /><h3>No custom trip requests yet</h3><p>Send a request using the form above and check back here for updates.</p></div>;

  return <div className="bookingList myTripRequestList">{requests.map((item) => <article className="myBooking myTripRequest" key={item._id}>
    <div className="myBookingInfo"><span className={`status ${item.status}`}>{item.status.replaceAll("_", " ")}</span><h3>{item.destination}</h3><p><MapPin />{item.trip?.title || "Custom trip request"}<CalendarDays />{dateFmt(item.travelDate)}</p>
      <small><Users /> {item.travelers} travellers · {groupName[item.groupType] || item.groupType}</small><small>Pickup requested: {item.pickupLocation}</small>
      {item.quoteAmount > 0 && <b className="tripRequestQuote">Admin quote: {cash(item.quoteAmount)}</b>}
      {item.adminNote && <p className="tripRequestAdminUpdate">Update from the trip team: {item.adminNote}</p>}
      {item.status === "approved" && <small>Your trip request is approved. Contact the trip team to complete the booking details.</small>}
      <small className="bookingUpdateNote">Last updated {dateFmt(item.updatedAt)} · checks for updates automatically</small>
    </div>
  </article>)}</div>;
}
