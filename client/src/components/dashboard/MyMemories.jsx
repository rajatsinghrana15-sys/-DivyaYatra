import { useCallback, useEffect, useState } from "react";
import { Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { dateFmt } from "../../services/format";
import MediaView from "../common/MediaView";

const labels = { pending: ["Awaiting approval", Clock], approved: ["Live on website", CheckCircle2], rejected: ["Not approved", XCircle] };
export default function MyMemories() {
  const { notice } = useApp();
  const [items, setItems] = useState(null);
  const load = useCallback(() => api("/gallery/mine").then(setItems).catch(() => setItems([])), []);
  useEffect(() => { load(); }, [load]);
  const remove = async (item) => {
    if (!window.confirm("Remove this memory from the website? This cannot be undone.")) return;
    try { const r = await api(`/gallery/mine/${item._id}`, { method: "DELETE" }); notice(r.message); setItems((l) => l.filter((x) => x._id !== item._id)); }
    catch (e) { notice(e.message); }
  };
  if (!items?.length) return null;
  return <section className="myMemories"><div className="myMemHead"><h3>Your shared memories</h3><small>{items.length} submitted</small></div>
    <div className="myMemGrid">{items.map((m) => { const [text, Icon] = labels[m.status] || labels.pending; return <article key={m._id} className="myMemCard">
      <MediaView src={m.mediaData} type={m.mediaType} alt={m.title} />
      <div className="myMemBody"><span className={`memStatus ${m.status}`}><Icon />{text}</span><b>{m.title || m.trip?.title || "Trip memory"}</b><small>{m.trip?.destination || m.destination} · {dateFmt(m.createdAt)}{m.expiresAt && m.status === "approved" ? ` · visible until ${dateFmt(m.expiresAt)}` : ""}</small>
        <button className="memRemove" onClick={() => remove(m)}><Trash2 /> Remove</button></div></article>; })}</div></section>;
}
