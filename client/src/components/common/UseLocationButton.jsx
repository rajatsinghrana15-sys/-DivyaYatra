import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";

const getPosition = (options) =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options),
  );

async function addressFor(latitude, longitude) {
  try {
    const query = new URLSearchParams({
      format: "jsonv2",
      zoom: "18",
      lat: String(latitude),
      lon: String(longitude),
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${query}`,
      { headers: { Accept: "application/json" } },
    );
    if (response.ok) {
      const data = await response.json();
      if (data?.display_name) return data.display_name;
    }
  } catch {
    // Keep coordinates as a useful exact-location fallback when reverse lookup is unavailable.
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

// The browser prompts for permission from the user's click; web pages cannot bypass it.
export default function UseLocationButton({ onFill, short = false }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const locate = async () => {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("This browser does not support location. Enter your pickup address manually.");
      return;
    }
    if (!window.isSecureContext) {
      setMessage("Location works only on HTTPS. Open this website using its secure address.");
      return;
    }

    setBusy(true);
    try {
      let position;
      try {
        position = await getPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });
      } catch (error) {
        if (error.code === 1) throw error;
        position = await getPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 0,
        });
      }
      const { latitude, longitude } = position.coords;
      const address = await addressFor(latitude, longitude);
      onFill(address.slice(0, 300), { lat: latitude, lng: longitude });
    } catch (error) {
      if (error.code === 1) {
        setMessage("Location permission was denied. Allow it in your browser's site settings, then try again.");
      } else if (error.code === 3) {
        setMessage("Location timed out. Check that GPS / Location services are on and try again.");
      } else {
        setMessage("Your device could not provide a location. Check GPS / Location services or enter the address manually.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="locateWrap">
      <button
        type="button"
        className="locateBtn"
        onClick={locate}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? <Loader2 className="spin" /> : <LocateFixed />}
        {busy ? "Finding you…" : short ? "Use my location" : "Use my current location"}
      </button>
      {message && <small className="locateMsg" role="alert">{message}</small>}
    </span>
  );
}
