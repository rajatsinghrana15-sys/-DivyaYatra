import { useState } from "react";
import { Upload } from "lucide-react";
import { popularDestinations } from "../../services/destinations";
import { useApp } from "../../context/AppContext";
import { compressImageFile } from "../../services/images";
import { Check, X } from "lucide-react";

export default function TripFormModal() {
  const { settings, cats, tripForm, setTripForm, busy, saveTrip } = useApp();
  const t = tripForm;
  const [tripType, setTripType] = useState(t.tripType || "general");
  const [tripAudience, setTripAudience] = useState(t.tripAudience || (t.tripType === "family_vacation" || t.tripType === "family" ? "family" : "friends"));
  const [pickupType, setPickupType] = useState(t.pickupType || (t.tripType === "pilgrimage" ? "city_points" : t.tripType === "family_vacation" ? "door_to_door" : "none"));
  const [uploads, setUploads] = useState(() => (t.images || []).filter((image) => image.startsWith("data:image/")).map((data, index) => ({ id: `saved-${index}`, name: `Uploaded image ${index + 1}`, data })));
  const [uploadError, setUploadError] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const addUploads = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (uploads.length + files.length > 6) { setUploadError("You can add up to 6 uploaded photos to a trip."); return; }
    setUploadBusy(true);
    setUploadError("");
    try {
      const next = await Promise.all(files.map(async (file, index) => ({ id: `${Date.now()}-${index}-${file.name}`, name: file.name, data: await compressImageFile(file) })));
      setUploads((current) => [...current, ...next]);
    } catch (error) { setUploadError(error.message || "An image could not be prepared."); }
    finally { setUploadBusy(false); }
  };
  return (
      <div className="modalShade">
        <div className="modal modalWide">
          <button className="modalClose" onClick={() => setTripForm(null)}>
            <X />
          </button>
          <div className="kicker">TRIP MANAGEMENT</div>
          <h2>
            {t._id ? "Edit" : "Add"} a <em>trip.</em>
          </h2>
          <form onSubmit={saveTrip}>
            <div className="formGrid">
              <label>
                Trip title
                <input name="title" required defaultValue={t.title} />
              </label>
              <label>
                Category
                <select
                  name="category"
                  required
                  defaultValue={t.category?._id || t.category || ""}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {cats.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destination
                <input
                  name="destination"
                  required
                  list="admin-destinations"
                  defaultValue={t.destination}
                />
                <datalist id="admin-destinations">{popularDestinations.map((d) => <option key={d} value={d} />)}</datalist>
              </label>
              <label>
                State / region
                <input name="state" defaultValue={t.state} />
              </label>
              <label>
                Starting from
                <input
                  name="origin"
                  defaultValue={t.origin || settings.origin}
                />
              </label>
              <label>
                Duration · days / nights
                <div className="inlineInputs">
                  <input
                    name="days"
                    type="number"
                    min="1"
                    defaultValue={t.durationDays || 3}
                  />
                  <input
                    name="nights"
                    type="number"
                    min="0"
                    defaultValue={t.durationNights || 2}
                  />
                </div>
              </label>
              <label>
                Price per person
                <input
                  name="price"
                  type="number"
                  min="0"
                  required
                  defaultValue={t.price}
                />
              </label>
              <label>
                Previous price
                <input
                  name="oldPrice"
                  type="number"
                  defaultValue={t.compareAtPrice}
                />
              </label>
              <label>Trip type
                <select name="tripType" value={tripType} onChange={(event) => { const next = event.target.value; setTripType(next); if (next === "pilgrimage") setPickupType("city_points"); else if (next === "family_vacation") setPickupType("door_to_door"); else setPickupType("none"); if (next === "family" || next === "family_vacation") setTripAudience("family"); else if (tripAudience === "family") setTripAudience("friends"); }}>
                  <option value="general">General trip</option>
                  <option value="pilgrimage">Pilgrimage / तीर्थ यात्रा</option>
                  <option value="family_vacation">Family vacation package (holiday)</option>
                  <option value="family">Family trip (existing)</option>
                </select>
              </label>
              <label>Designed for
                <select name="tripAudience" value={tripAudience} onChange={(event) => setTripAudience(event.target.value)}>
                  <option value="family">Family</option>
                  <option value="friends">Friends</option>
                  <option value="school_college">School / college groups</option>
                </select>
              </label>
              <label>Pickup arrangement
                {tripType === "pilgrimage" ? <><input value="1–2 fixed pickup points in the city" readOnly /><input type="hidden" name="pickupType" value="city_points" /></> : tripType === "family_vacation" ? <><input value="Door-to-door pickup" readOnly /><input type="hidden" name="pickupType" value="door_to_door" /></> : <select name="pickupType" value={pickupType} onChange={(event) => setPickupType(event.target.value)}><option value="none">No pickup / details later</option><option value="city_points">One or two city pickup points</option><option value="door_to_door">Door-to-door pickup</option></select>}
              </label>
              {pickupType === "city_points" && <>
                <label>City for pickup points<input name="pickupCity" required defaultValue={t.pickupCity || t.origin || settings.origin || ""} placeholder="Ambala" /></label>
                <label className="pickupAdminField">Pickup points · one per line, maximum 2
                  <textarea name="pickupPoints" rows="2" required defaultValue={(t.pickupPoints || []).join("\n")} placeholder="Ambala Cantt Railway Station\nAmbala City Bus Stand" />
                  <small>For pilgrimage trips, travellers select one of these pickup points while booking.</small>
                </label>
                <label className="span2 pickupAdminField">Google Maps links · same order as pickup points, one per line
                  <textarea name="pickupMapUrls" rows="2" defaultValue={(t.pickupMapUrls || []).join("\n")} placeholder="https://maps.app.goo.gl/..." />
                  <small>If left blank, the website creates a Google Maps search from the pickup point and city.</small>
                </label>
              </>}
              {pickupType === "door_to_door" && <label className="span2 pickupAdminField">Door-to-door pickup details
                <textarea name="pickupDetails" rows="2" defaultValue={t.pickupDetails || ""} placeholder="Service area, holiday dates, pickup time and any coverage limits" />
                <small>For family vacation packages, travellers enter their home pickup address while booking.</small>
              </label>}
              <label>Cancellation charge · percent
                <input name="cancellationFeePercent" type="number" min="0" max="100" step="1" defaultValue={t.cancellationFeePercent ?? 0} />
                <small>Shown before booking and cancellation. Set the client-approved rate; default is 0%.</small>
              </label>
              <label>Vehicle type
                <select name="vehicleType" defaultValue={t.vehicleType || "bus"}>
                  <option value="bus">Bus</option>
                  <option value="car">Car</option>
                  <option value="traveller_van">Traveller van</option>
                  <option value="tempo_traveller">Tempo traveller</option>
                  <option value="train">Train</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>Vehicle name / model
                <input name="vehicleName" placeholder="e.g. Volvo AC sleeper bus" defaultValue={t.vehicleName || ""} />
              </label>
              <label className="span2">Vehicle details for travellers
                <textarea name="vehicleDetails" rows="2" placeholder="AC/non-AC, luggage, charging points, pickup notes…" defaultValue={t.vehicleDetails || ""} />
              </label>
              <label>Total seats in vehicle
                <input name="vehicleTotalSeats" type="number" min="1" max="60" required defaultValue={t.vehicleTotalSeats || t.maxGroupSize || 20} />
              </label>
              <div className="vehicleSeatsNote"><b>{t._id ? `${t.seatsAvailable ?? 0} seats currently available` : "All seats start as available"}</b><small>Seat availability updates automatically when travellers book or cancel.</small></div>
              <label>
                {tripType === "family_vacation" ? "Vacation / holiday departure dates · comma separated" : "Departure dates · comma separated"}
                <input
                  name="dates"
                  placeholder="2026-12-05, 2026-12-19"
                  defaultValue={t.departureDates
                    ?.map((d) => new Date(d).toISOString().slice(0, 10))
                    .join(", ")}
                />
              </label>
              <label>
                Image URLs · one per line
                <textarea name="images" rows="3" defaultValue={t.images?.filter((image) => !image.startsWith("data:image/")).join("\n")} placeholder="https://example.com/trip-photo.jpg" />
              </label>
              <div className="tripDeviceImages span2">
                <b>Or upload photos from your device</b>
                <small>Images are resized before saving. Choose up to 6 photos.</small>
                <label className="btn btn-outline btn-sm tripUploadButton"><Upload />{uploadBusy ? "Preparing photos…" : "Choose photos"}<input type="file" accept="image/*" multiple onChange={addUploads} disabled={uploadBusy} /></label>
                {uploadError && <small className="imageUploadError">{uploadError}</small>}
                {uploads.length > 0 && <div className="tripUploadPreviews">{uploads.map((image) => <div key={image.id}><img src={image.data} alt={image.name} /><button type="button" onClick={() => setUploads((current) => current.filter((item) => item.id !== image.id))} aria-label={`Remove ${image.name}`}><X /></button><small>{image.name}</small></div>)}</div>}
                <input type="hidden" name="uploadedImages" value={JSON.stringify(uploads.map(({ data }) => data))} />
              </div>
              <label className="span2">
                Short description
                <input name="summary" required defaultValue={t.summary} />
              </label>
              <label className="span2">
                Full description
                <textarea
                  name="description"
                  rows="3"
                  defaultValue={t.description}
                />
              </label>
              <label>
                Itinerary · Day title | details
                <textarea
                  name="itinerary"
                  rows="4"
                  defaultValue={t.itinerary
                    ?.map((d) => `${d.title} | ${d.details}`)
                    .join("\n")}
                />
              </label>
              <div className="inclusionInputs">
                <label>
                  Included items
                  <textarea
                    name="inclusions"
                    rows="4"
                    defaultValue={t.inclusions?.join("\n")}
                  />
                </label>
                <label>
                  Not included
                  <textarea
                    name="exclusions"
                    rows="4"
                    defaultValue={t.exclusions?.join("\n")}
                  />
                </label>
              </div>
            </div>
            <div className="checkRow">
              <label>
                <input
                  name="featured"
                  type="checkbox"
                  defaultChecked={t.featured}
                />{" "}
                Feature on home page
              </label>
              <label>
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={t.active !== false}
                />{" "}
                Visible to travellers
              </label>
            </div>
            <button className="btn btn-dark full" disabled={busy}>
              {busy ? "Saving..." : "Save trip"} <Check />
            </button>
          </form>
        </div>
      </div>
  );
}
