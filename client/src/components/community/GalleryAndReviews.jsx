import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Image as ImageIcon, LockKeyhole, Maximize2, MessageSquareText, QrCode, Send, Star, Upload, Video, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { cash, dateFmt } from "../../services/format";
import MediaView from "../common/MediaView";
import { createPortal } from "react-dom";

const initial = { photos: [], videos: [], reviews: [], settings: {} };

export default function GalleryAndReviews() {
  const { user, trips, bookings, go, notice } = useApp();
  const [data, setData] = useState(initial);
  const dataRef = useRef(initial);
  const [mediaType, setMediaType] = useState("photo");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [tripId, setTripId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewTrip, setReviewTrip] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [sending, setSending] = useState(false);
  const [reviewSending, setReviewSending] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const reload = async () => {
    try {
      const latest = await api("/gallery?metadata=1");
      const previous = dataRef.current;
      const previousMedia = new Map([...previous.photos, ...previous.videos].filter((item) => item.mediaData).map((item) => [String(item._id), item.mediaData]));
      const listed = [...latest.photos, ...latest.videos];
      const media = await Promise.all(listed.map(async (item) => {
        if (previousMedia.has(String(item._id))) return [String(item._id), previousMedia.get(String(item._id))];
        try { const full = await api(`/gallery/${item._id}`); return [String(item._id), full.mediaData || ""]; }
        catch { return [String(item._id), ""]; }
      }));
      const mediaMap = new Map(media);
      const next = { ...latest, photos: latest.photos.map((item) => ({ ...item, mediaData: mediaMap.get(String(item._id)) || "" })), videos: latest.videos.map((item) => ({ ...item, mediaData: mediaMap.get(String(item._id)) || "" })), settings: { ...latest.settings, qr: latest.settings.qr || previous.settings.qr || "" } };
      dataRef.current = next;
      setData(next);
    } catch { /* retry on the next refresh */ }
  };
  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!selectedMedia) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === "Escape") setSelectedMedia(null); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedMedia]);
  const completedTrips = useMemo(() => {
    const ids = new Set(bookings.filter((booking) => booking.status === "completed").map((booking) => String(booking.trip?._id || booking.trip)));
    return trips.filter((trip) => ids.has(String(trip._id)));
  }, [bookings, trips]);
  const fee = Number(mediaType === "photo" ? data.settings.photoFee : data.settings.videoFee) || 0;
  const paymentLink = data.settings.upiId && fee > 0 ? `upi://pay?${new URLSearchParams({ pa: data.settings.upiId, pn: "Yatra Sang Raghuvanshi", am: fee.toFixed(2), cu: "INR", tn: `Trip memory ${mediaType}` })}` : "";

  const submitReview = async (event) => {
    event.preventDefault(); setReviewSending(true); setReviewError("");
    try { const result = await api("/reviews", { method: "POST", body: { tripId: reviewTrip, rating: Number(rating), text: reviewText } }); notice(result.message); setReviewText(""); await reload(); }
    catch (e) { setReviewError(e.message); }
    finally { setReviewSending(false); }
  };

  const renderMedia = (items, type) => items.length ? <div className="memoryGrid">{items.map((item) => <article className="memoryCard" key={item._id}>
    <div className="memoryMediaStage" role="group" aria-label={`View ${type} full screen: ${item.title || item.destination || "Trip memory"}`} onClick={() => setSelectedMedia({ item, type })}>
      {type === "video" && selectedMedia ? <div className="videoPausedPlaceholder"><Video /><span>Video is open in the viewer</span></div> : <MediaView src={item.mediaData} type={type} alt={item.title || item.destination || "Trip memory"} />}
      {!(type === "video" && selectedMedia) && <button type="button" className="memoryExpand" aria-label="Open full screen" onClick={(event) => { event.stopPropagation(); setSelectedMedia({ item, type }); }}><Maximize2 /></button>}
    </div>
    <div><small>{item.trip?.destination || item.destination || "Trip memory"}</small><h4>{item.title || item.trip?.title || item.trip?.destination || "A shared journey"}</h4><p>Shared by {item.user?.name || "Traveller"}{item.expiresAt ? ` · visible until ${dateFmt(item.expiresAt)}` : ""}</p></div>
  </article>)}</div> : <p className="communityEmpty">Approved {type === "photo" ? "photos" : "videos"} will appear here.</p>;

  return <div className="communitySection">
    <section className="memoryGallery" id="memories" aria-labelledby="memories-heading">
      <div className="communityHeading"><div><span className="kicker">TRIP MEMORIES <i /></span><h2 id="memories-heading">The moments we <em>bring back.</em></h2><p>Traveller memories are checked by the admin and featured for a limited time.</p></div><span className="memoryExpiry">Featured for {data.settings.visibilityDays || 30} days</span></div>
      <section className="memoryTypeSection"><div className="memoryTypeHeading"><h3><ImageIcon /> Photo gallery</h3><small>{data.photos.length} / {data.settings.photoLimit || 12} visible</small></div>{renderMedia(data.photos, "photo")}</section>
      <section className="memoryTypeSection"><div className="memoryTypeHeading"><h3><Video /> Video gallery</h3><small>{data.videos.length} / {data.settings.videoLimit || 6} visible</small></div>{renderMedia(data.videos, "video")}</section>
      <div className="memoryCta"><div><span className="kicker">SHARE YOUR JOURNEY <i /></span><h3>Travelled with us? Add your memory.</h3><p>Sign in and open your dashboard to share photos and videos from your device or from Instagram, Facebook and YouTube links.</p></div><button className="btn btn-dark" onClick={() => go(user ? (user.role === "admin" ? "admin" : "mybookings") : "auth")}>{user ? "Open my dashboard" : "Sign in to share"} <ArrowRight /></button></div>
    </section>

    <section className="reviewSection" aria-labelledby="reviews-heading"><div className="communityHeading"><div><span className="kicker">TRAVELLER NOTES <i /></span><h2 id="reviews-heading">Stories from the <em>road.</em></h2><p>Only travellers with a completed trip can submit a review. The admin reviews each note before it is published.</p></div></div>
      {data.reviews.length ? <div className="reviewGrid">{data.reviews.map((review) => <article className="reviewCard" key={review._id}><div className="reviewStars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < review.rating ? "currentColor" : "none"} />)}</div><p>“{review.text}”</p><b>{review.user?.name || "Traveller"}</b><small>{review.trip?.title || review.trip?.destination}</small></article>)}</div> : <p className="communityEmpty">Traveller reviews will appear here after admin approval.</p>}
      {user?.role === "user" && completedTrips.length > 0 && <form className="reviewSubmitCard" onSubmit={submitReview}><h3>Leave a trip review</h3><div className="reviewFormGrid"><label>Completed trip<select value={reviewTrip} required onChange={(event) => setReviewTrip(event.target.value)}><option value="">Select a trip</option>{completedTrips.map((trip) => <option key={trip._id} value={trip._id}>{trip.title} · {trip.destination}</option>)}</select></label><label>Rating<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label><label className="reviewTextField">Your review<textarea value={reviewText} required minLength="8" maxLength="1200" rows="3" onChange={(event) => setReviewText(event.target.value)} placeholder="What did you enjoy about the trip?" /></label></div><button className="btn btn-dark" disabled={reviewSending || !reviewTrip}>{reviewSending ? "Sending…" : "Send for review"} <MessageSquareText /></button>{reviewError && <p className="memoryError" role="alert">{reviewError}</p>}</form>}
      {!user && <button className="textArrow" onClick={() => go("auth")}>Sign in to write a review <ArrowRight /></button>}
      {user?.role === "user" && completedTrips.length === 0 && <p className="communityEmpty">Your trip review form will be available after one of your bookings is marked completed.</p>}
    </section>
    {selectedMedia ? createPortal(<div className="memoryLightbox" role="dialog" aria-modal="true" aria-label="Full-screen trip memory" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMedia(null); }}>
      <button type="button" className="memoryLightboxClose" aria-label="Close viewer" onClick={() => setSelectedMedia(null)}><X /></button>
      <div className="memoryLightboxContent"><MediaView src={selectedMedia.item.mediaData} type={selectedMedia.type} alt={selectedMedia.item.title || selectedMedia.item.destination || "Trip memory"} /><p>{selectedMedia.item.title || selectedMedia.item.trip?.destination || selectedMedia.item.destination || "Trip memory"}</p></div>
    </div>, document.body) : null}
  </div>;
}
