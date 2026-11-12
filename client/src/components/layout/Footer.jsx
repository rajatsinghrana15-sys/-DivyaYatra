import BrandMark from "../common/BrandMark";
import { useApp } from "../../context/AppContext";
import { Facebook, Instagram, MapPin, Phone } from "lucide-react";

export default function Footer() {
  const { user, settings, setAuthMode, go } = useApp();
  const View = () => (
    <footer id="contact" className="footer">
      <div className="footerMain">
        <div className="footBrand">
          <span className="brandMark">
            <BrandMark size={40} />
          </span>
          <div>
            <b>{settings.businessName}</b>
            <p>{settings.tagline}</p>
          </div>
        </div>
        <div className="footCol">
          <b>Start planning</b>
          <button onClick={() => go("home")}>Browse journeys</button>
          <button
            onClick={() =>
              user ? go("mybookings") : (setAuthMode("login"), go("auth"))
            }
          >
            My bookings
          </button>
        </div>
        <div className="footCol">
          <b>Say hello</b>
          <a href={`tel:${settings.phone}`}>{settings.phone}</a>
          {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
          <span>
            <MapPin />
            {settings.origin}
          </span>
        </div>
        <div className="footSocial">
          <a href={settings.instagram} target="_blank" rel="noreferrer">
            <Instagram />
          </a>
          <a href={settings.facebook} target="_blank" rel="noreferrer">
            <Facebook />
          </a>
          <a
            href={`https://wa.me/${(settings.phone || "").replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            <Phone />
          </a>
        </div>
      </div>
      <div className="footBottom">
        <span>© 2026 {settings.businessName}. All rights reserved.</span>
        <span>Trips that stay with you.</span>
      </div>
    </footer>
  );
  return View();
}
