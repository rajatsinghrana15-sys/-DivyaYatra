import MediaView from "../common/MediaView";
import { useEffect, useState } from "react";
import { Check, Eye, Image as ImageIcon, Trash2, Upload, Video, X } from "lucide-react";
import { api } from "../../services/api";
import { compressImageFile } from "../../services/images";
import { cash, dateFmt } from "../../services/format";
import { useApp } from "../../context/AppContext";

const defaults = { galleryEnabled: false, galleryPaymentQR: "", galleryUPIId: "", galleryPhotoFee: 0, galleryVideoFee: 0, galleryPhotoLimit: 12, galleryVideoLimit: 6, galleryVisibilityDays: 30 };

function fileData(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error("The video could not be read.")); reader.readAsDataURL(file); });
}

export default function GalleryAdminPanel() {
  const { trips, notice } = useApp();
  const [data, setData] = useState({ items: [], reviews: [], settings: defaults });
  const [form, setForm] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [upload, setUpload] = useState({ mediaType: "photo", title: "", tripId: "", destination: "", otherDestination: false, mediaData: "", filename: "" });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState(null);

  const load = async () => { try { const latest = await api("/admin/gallery"); setData(latest); setForm((current) => ({ ...defaults, ...latest.settings, galleryPaymentQR: latest.settings?.galleryPaymentQR || current.galleryPaymentQR || "" })); } catch (e) { setError(e.message); } };
  useEffect(() => { load(); }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const saveSettings = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const saved = await api("/admin/gallery/settings", { method: "PATCH", body: { ...form, galleryEnabled: Boolean(form.galleryEnabled), galleryPhotoFee: Number(form.galleryPhotoFee), galleryVideoFee: Number(form.galleryVideoFee), galleryPhotoLimit: Number(form.galleryPhotoLimit), galleryVideoLimit: Number(form.galleryVideoLimit), galleryVisibilityDays: Number(form.galleryVisibilityDays) } }); setForm((current) => ({ ...current, ...saved })); notice("Gallery settings saved."); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const setQR = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try { update("galleryPaymentQR", await compressImageFile(file, 900, 0.82)); setError(""); }
    catch (e) { setError(e.message || "QR image could not be loaded."); }
  };
  const selectUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setUploadError("");
    if (upload.mediaType === "video" && file.size > 5.5 * 1024 * 1024) { setUploadError("Video size must be under 5.5 MB."); return; }
    try { const mediaData = upload.mediaType === "photo" ? await compressImageFile(file, 1400, 0.78) : await fileData(file); setUpload((current) => ({ ...current, mediaData, filename: file.name })); }
    catch (e) { setUploadError(e.message || "The file could not be prepared."); }
  };
  const publishAdminMemory = async (event) => {
    event.preventDefault(); setUploadBusy(true); setUploadError("");
    try { await api("/admin/gallery", { method: "POST", body: { ...upload, tripId: upload.tripId || undefined, destination: upload.destination || trips.find((trip) => trip._id === upload.tripId)?.destination || "" } }); setUpload((current) => ({ ...current, title: "", tripId: "", destination: "", otherDestination: false, mediaData: "", filename: "" })); notice("Admin memory published to the gallery."); await load(); }
    catch (e) { setUploadError(e.message); }
    finally { setUploadBusy(false); }
  };
  const moderate = async (item, status) => { setBusy(true); setError(""); try { await api(`/admin/gallery/${item._id}`, { method: "PATCH", body: { status } }); notice(status === "approved" ? "Memory approved and published." : "Memory rejected."); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const openPreview = async (item) => { try { setPreview(await api(`/admin/gallery/${item._id}`)); } catch (e) { setError(e.message); } };
  const removeMemory = async (item) => { if (!confirm("Delete this gallery memory?")) return; try { await api(`/admin/gallery/${item._id}`, { method: "DELETE" }); await load(); notice("Memory deleted."); } catch (e) { setError(e.message); } };
  const reviewStatus = async (review, status) => { try { await api(`/admin/reviews/${review._id}`, { method: "PATCH", body: { status } }); await load(); notice(`Review ${status}.`); } catch (e) { setError(e.message); } };
  const removeReview = async (review) => { if (!confirm("Delete this review?")) return; try { await api(`/admin/reviews/${review._id}`, { method: "DELETE" }); await load(); } catch (e) { setError(e.message); } };

  return <div className="galleryAdmin">
    <form className="adminPanel galleryAdminSettings" onSubmit={saveSettings}>
      <div className="adminSectionHead"><div><h2>Gallery settings</h2><p>Set UPI payment instructions, paid submission fees, public limits and how long approved memories stay visible.</p></div></div>
      <label className="galleryToggle"><input type="checkbox" checked={Boolean(form.galleryEnabled)} onChange={(event) => update("galleryEnabled", event.target.checked)} /> Accept traveller submissions</label>
      <div className="galleryAdminGrid"><label>Photo submission fee (₹)<input type="number" min="0" step="1" value={form.galleryPhotoFee ?? 0} onChange={(event) => update("galleryPhotoFee", event.target.value)} /></label><label>Video submission fee (₹)<input type="number" min="0" step="1" value={form.galleryVideoFee ?? 0} onChange={(event) => update("galleryVideoFee", event.target.value)} /></label><label>Maximum visible photos<input type="number" min="1" max="30" value={form.galleryPhotoLimit ?? 12} onChange={(event) => update("galleryPhotoLimit", event.target.value)} /></label><label>Maximum visible videos<input type="number" min="1" max="8" value={form.galleryVideoLimit ?? 6} onChange={(event) => update("galleryVideoLimit", event.target.value)} /></label><label>Visibility duration (days)<input type="number" min="1" max="365" value={form.galleryVisibilityDays ?? 30} onChange={(event) => update("galleryVisibilityDays", event.target.value)} /></label><label>UPI ID for mobile payments<input value={form.galleryUPIId || ""} onChange={(event) => update("galleryUPIId", event.target.value)} placeholder="business@upi" /></label></div>
      <label className="galleryQRField">Payment QR image URL<input value={String(form.galleryPaymentQR || "").startsWith("data:image/") ? "Device QR image selected" : form.galleryPaymentQR || ""} onChange={(event) => update("galleryPaymentQR", event.target.value)} placeholder="https://... or upload QR image" /></label>
      <label className="galleryFileButton"><Upload /> Upload QR from device<input type="file" accept="image/png,image/jpeg,image/webp" onChange={setQR} /></label>
      {form.galleryPaymentQR && <button type="button" className="galleryClearQR" onClick={() => update("galleryPaymentQR", "")}>Remove payment QR</button>}
      {form.galleryPaymentQR && <img className="galleryQRPreview" src={form.galleryPaymentQR} alt="Gallery UPI QR preview" />}
      <p className="galleryAdminNote">Traveller payments are not auto-verified. Check each UPI reference in the business account before approving media. Only approved memories are published.</p>
      <button className="btn btn-dark" disabled={busy}>{busy ? "Saving…" : "Save gallery controls"}</button>{error && <p className="memoryError" role="alert">{error}</p>}
    </form>

    <form className="adminPanel galleryAdminSettings" onSubmit={publishAdminMemory}>
      <div className="adminSectionHead"><div><h2>Publish an admin memory</h2><p>Admin uploads go live immediately and follow the same type limit and expiry period.</p></div></div>
      <div className="galleryAdminGrid"><label>Media type<select value={upload.mediaType} onChange={(event) => setUpload((current) => ({ ...current, mediaType: event.target.value, mediaData: "", filename: "" }))}><option value="photo">Photo</option><option value="video">Video</option></select></label><label>Trip or destination (optional)<select value={upload.tripId || (upload.otherDestination ? "__other__" : "")} onChange={(event) => { const value = event.target.value; const trip = trips.find((item) => item._id === value); setUpload((current) => ({ ...current, tripId: trip?._id || "", otherDestination: value === "__other__", destination: value === "__other__" ? current.destination : trip?.destination || "" })); }}><option value="">Choose trip</option>{trips.map((trip) => <option key={trip._id} value={trip._id}>{trip.title} · {trip.destination}</option>)}<option value="__other__">Other destination</option></select></label>{upload.otherDestination && <label>Destination name<input value={upload.destination} maxLength="100" onChange={(event) => setUpload((current) => ({ ...current, destination: event.target.value }))} placeholder="Type a destination" /></label>}<label>Caption<input value={upload.title} maxLength="100" onChange={(event) => setUpload((current) => ({ ...current, title: event.target.value }))} /></label><label className="galleryFileButton"><Upload />Upload {upload.mediaType} from device{upload.filename ? ` · ${upload.filename}` : ""}<input type="file" accept={upload.mediaType === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"} onChange={selectUpload} /></label><label>Or paste a {upload.mediaType} URL (HTTPS)<input type="url" maxLength="3000" value={upload.mediaData.startsWith("data:") ? "" : upload.mediaData} onChange={(event) => setUpload((current) => ({ ...current, mediaData: event.target.value, filename: "" }))} placeholder={upload.mediaType === "photo" ? "https://example.com/photo.jpg" : "https://example.com/video.mp4"} /></label></div>
      {uploadError && <p className="memoryError" role="alert">{uploadError}</p>}<button className="btn btn-dark" disabled={uploadBusy || !upload.mediaData}>{uploadBusy ? "Publishing…" : "Publish memory"}</button>
    </form>

    <section className="adminPanel galleryModeration"><div className="adminSectionHead"><div><h2>Traveller submissions <small>{data.items.filter((item) => item.status === "pending").length} pending</small></h2><p>Compare the payment reference with the business UPI account, then approve or reject.</p></div></div>
      <div className="galleryModerationGrid">{data.items.map((item) => <article key={item._id} className="galleryModerationCard"><div className="galleryModerationType">{item.mediaType === "photo" ? <ImageIcon /> : <Video />}<span>{item.mediaType}</span></div><div><small className={`status ${item.status}`}>{item.status}</small><h3>{item.title || item.trip?.title || item.destination || "Trip memory"}</h3><p>{item.user?.name} · {item.trip?.destination || item.destination || "No trip selected"}</p><p>Submitted {dateFmt(item.createdAt)} · Fee {cash(item.paymentAmount || 0)}</p><b>UPI reference: {item.paymentReference || "Admin upload"}</b>{item.expiresAt && <small>Visible until {dateFmt(item.expiresAt)}</small>}</div><div className="galleryModerationActions"><button onClick={() => openPreview(item)}><Eye /> Preview</button>{item.status === "pending" && <><button onClick={() => moderate(item, "approved")} disabled={busy}><Check /> Approve</button><button onClick={() => moderate(item, "rejected")} disabled={busy}><X /> Reject</button></>}<button className="galleryDelete" onClick={() => removeMemory(item)}><Trash2 /> Delete</button></div></article>)}{!data.items.length && <p className="communityEmpty">No traveller submissions are waiting for review.</p>}</div>
    </section>

    <section className="adminPanel galleryModeration"><div className="adminSectionHead"><div><h2>Traveller reviews <small>{data.reviews.filter((review) => review.status === "pending").length} pending</small></h2><p>Approve reviews to show them on the homepage.</p></div></div><div className="reviewAdminList">{data.reviews.map((review) => <article key={review._id}><div><small className={`status ${review.status}`}>{review.status}</small><b>{review.user?.name} · {review.trip?.title}</b><p>{"★".repeat(review.rating)} · {review.text}</p></div><div>{review.status === "pending" && <><button onClick={() => reviewStatus(review, "approved")}><Check /> Approve</button><button onClick={() => reviewStatus(review, "rejected")}><X /> Reject</button></>}<button className="galleryDelete" onClick={() => removeReview(review)}><Trash2 /> Delete</button></div></article>)}{!data.reviews.length && <p className="communityEmpty">No reviews submitted yet.</p>}</div></section>
    {preview && <div className="galleryPreviewOverlay" role="dialog" aria-modal="true" aria-label="Review submitted media"><div className="galleryPreviewDialog"><button className="galleryPreviewClose" onClick={() => setPreview(null)} aria-label="Close preview"><X /></button><MediaView src={preview.mediaData} type={preview.mediaType} alt={preview.title || "Submitted memory"} />{/^https:/.test(preview.mediaData || "") && <a className="btn btn-outline btn-sm" href={preview.mediaData} target="_blank" rel="noreferrer noopener">Open original link</a>}</div></div>}
  </div>;
}
