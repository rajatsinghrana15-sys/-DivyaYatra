import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Link2, QrCode, Send, Smartphone, LockKeyhole } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { cash } from "../../services/format";
import { compressImageFile } from "../../services/images";
import { parseMedia } from "../../services/media";
import MediaView from "../common/MediaView";

const readVideo = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result || "")); r.onerror = () => reject(new Error("The video could not be read.")); r.readAsDataURL(file); });

export default function ShareJourney() {
  const { trips, bookings, notice } = useApp();
  const [settings, setSettings] = useState(null);
  const [mediaType, setMediaType] = useState("photo");
  const [source, setSource] = useState("link");
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [tripId, setTripId] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api("/gallery?metadata=1").then((d) => setSettings(d.settings)).catch(() => setSettings({})); }, []);
  const completed = useMemo(() => {
    const ids = new Set(bookings.filter((b) => b.status === "completed").map((b) => String(b.trip?._id || b.trip)));
    return trips.filter((t) => ids.has(String(t._id)));
  }, [bookings, trips]);
  const fee = Number(mediaType === "photo" ? settings?.photoFee : settings?.videoFee) || 0;
  const upi = settings?.upiId && fee > 0 ? `upi://pay?${new URLSearchParams({ pa: settings.upiId, pn: "Yatra Sang Raghuvanshi", am: fee.toFixed(2), cu: "INR", tn: `Trip memory ${mediaType}` })}` : "";
  const media = source === "link" ? link.trim() : file?.mediaData || "";
  const parsed = media ? parseMedia(media) : null;

  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setError("");
    if (mediaType === "video" && f.size > 5.5 * 1024 * 1024) { setError("Video must be under 5.5 MB. For bigger videos paste your Instagram, Facebook or YouTube link instead."); return; }
    try { setFile({ name: f.name, mediaData: mediaType === "photo" ? await compressImageFile(f, 1400, 0.78) : await readVideo(f) }); }
    catch (err) { setFile(null); setError(err.message || "File could not be prepared."); }
  };
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (!media) return setError("Add a photo/video or paste a link first.");
    if (parsed.kind === "invalid") return setError("Please paste a secure link that starts with https://");
    setBusy(true);
    try {
      const r = await api("/gallery", { method: "POST", body: { mediaType, mediaData: media, title, tripId, paymentReference: ref } });
      notice(r.message); setFile(null); setLink(""); setTitle(""); setRef("");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (!settings) return <div className="shareCard"><p className="communityEmpty">Loading…</p></div>;
  if (!settings.enabled) return <div className="shareCard shareClosed"><LockKeyhole /><div><h3>Memory sharing opens soon</h3><p>The trip team is setting up payment details. Check back shortly.</p></div></div>;
  if (!completed.length) return <div className="shareCard shareClosed"><Smartphone /><div><h3>Share after your trip</h3><p>Once a booking is marked completed, you can add photos and videos from that journey here.</p></div></div>;
  return <form className="shareCard" onSubmit={submit}>
    <div className="shareHead"><span className="kicker">SHARE YOUR JOURNEY</span><h3>Add a photo or video</h3><p>Upload from your phone or paste a public link from Instagram, Facebook, YouTube or any HTTPS image/video. The admin verifies payment and approves it before it is published.</p></div>
    <div className="shareSteps">
      <section><b className="stepNo">1</b><div className="stepBody"><h4>Choose trip and type</h4>
        <label>Completed trip<select required value={tripId} onChange={(e) => setTripId(e.target.value)}><option value="">Select a trip</option>{completed.map((t) => <option key={t._id} value={t._id}>{t.title} · {t.destination}</option>)}</select></label>
        <div className="seg" role="tablist">{[["photo", `Photo · ${cash(settings.photoFee || 0)}`], ["video", `Video · ${cash(settings.videoFee || 0)}`]].map(([v, l]) => <button type="button" key={v} className={mediaType === v ? "on" : ""} onClick={() => { setMediaType(v); setFile(null); }}>{l}</button>)}</div>
        <label>Memory title<input value={title} maxLength="100" onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunrise at Triveni Ghat" /></label></div></section>
      <section><b className="stepNo">2</b><div className="stepBody"><h4>Add your media</h4>
        <div className="seg"><button type="button" className={source === "link" ? "on" : ""} onClick={() => setSource("link")}><Link2 /> Paste link</button><button type="button" className={source === "device" ? "on" : ""} onClick={() => setSource("device")}><Smartphone /> From device</button></div>
        {source === "link" ? <label>Instagram / Facebook / YouTube / HTTPS link<input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.instagram.com/reel/…" /></label>
          : <label className="filePick">{mediaType === "photo" ? "Choose photo" : "Choose video (max 5.5 MB)"}<input type="file" accept={mediaType === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"} onChange={pick} /></label>}
        {parsed && parsed.kind !== "invalid" && <div className="sharePreview"><small><Check /> Preview{parsed.platform ? ` · ${parsed.platform}` : ""}</small><MediaView src={media} type={mediaType} /></div>}
        <small className="shareHint">Posts must be public so visitors can view them. Private accounts will show as unavailable.</small></div></section>
      <section><b className="stepNo">3</b><div className="stepBody"><h4>Pay {cash(fee)} and confirm</h4>
        <div className="payRow"><div className="memoryQR">{settings.qr ? <img src={settings.qr} alt="UPI payment QR" /> : <QrCode />}</div><div><small>Scan the QR or tap below, then enter the UTR / transaction reference.</small>{upi && <a className="btn btn-outline btn-sm" href={upi}>Open UPI app <ArrowRight /></a>}</div></div>
        <label>UPI transaction reference (UTR)<input required minLength="8" maxLength="50" value={ref} onChange={(e) => setRef(e.target.value)} inputMode="numeric" autoComplete="off" /></label></div></section>
    </div>
    {error && <p className="memoryError" role="alert">{error}</p>}
    <button className="btn btn-dark shareSubmit" disabled={busy || !media || !tripId || fee <= 0}>{busy ? "Sending for review…" : "Submit for admin approval"} <Send /></button>
    <small className="shareHint">Payment is checked manually by the admin before publication.</small>
  </form>;
}
