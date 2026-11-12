import { useEffect, useState } from "react";
import { CalendarDays, Inbox, Users, Wallet, CarFront, Info } from "lucide-react";
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

  return <div className="myTripRequestList">{requests.map((item) => <article className="myTripRequest" key={item._id}>
    <div className="myTripRequestHeader"><div><span className={`status ${item.status}`}>{item.status.replaceAll("_", " ")}</span><h3>{item.destination || "Custom trip request"}</h3></div><span className="myTripRequestType">{item.trip?.title || "Trip planned with our team"}</span></div>
    <div className="myTripRequestFacts">
      <div><CalendarDays /><span><small>Preferred departure</small><b>{dateFmt(item.travelDate)}</b></span></div>
      <div><Users /><span><small>Group</small><b>{item.travelers} {Number(item.travelers) === 1 ? "traveller" : "travellers"} · {groupName[item.groupType] || item.groupType}</b></span></div>
      <div><CarFront /><span><small>Pickup requested</small><b>{item.pickupLocation || "Not provided"}</b></span></div>
    </div>
    {item.quoteAmount > 0 && <div className="myTripRequestQuote"><Wallet /><span><small>Quote from the trip team</small><b>{cash(item.quoteAmount)}</b></span></div>}
    {item.adminNote && <div className="myTripRequestAdminUpdate"><Info /><span><b>Update from the trip team</b><small>{item.adminNote}</small></span></div>}
    {item.status === "approved" && <p className="myTripRequestApproved">Your request is approved. Contact the trip team to complete the booking details.</p>}
    <small className="myTripRequestUpdated">Last updated {dateFmt(item.updatedAt)} · this page checks for updates automatically</small>
  </article>)}</div>;
}
