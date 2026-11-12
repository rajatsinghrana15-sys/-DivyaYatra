import { useRef, useState } from "react";
import { api } from "../../services/api";
import { compressImageFile } from "../../services/images";
import { isTeam, roleLabel } from "../../services/access";
import BrandMark from "../common/BrandMark";
import { useApp } from "../../context/AppContext";
import { ArrowUpRight, Camera, LayoutDashboard, Menu, TicketCheck, Trash2, X } from "lucide-react";

export default function Header() {
  const [accountOpen, setAccountOpen] = useState(false);
  const { page, user, setUser, settings, setAuthMode, menu, setMenu, notice, go, logout } = useApp();
  const fileRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const changePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const avatarUrl = await compressImageFile(file, 400, 0.82);
      const r = await api("/auth/avatar", { method: "PATCH", body: { avatarUrl } });
      setUser(r.user);
      notice("Profile photo updated.");
    } catch (error) { notice(error.message || "Photo could not be saved."); }
    finally { setPhotoBusy(false); }
  };
  const removePhoto = async () => {
    try { const r = await api("/auth/avatar", { method: "PATCH", body: { avatarUrl: "" } }); setUser(r.user); notice("Profile photo removed."); }
    catch (error) { notice(error.message); }
  };
  const View = () => (
    <header className="topbar siteTopbar">
      <div className="navwrap">
        <button className="brand" onClick={() => go("home")}>
          <span className="brandMark">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="" />
            ) : (
              <BrandMark size={40} />
            )}
          </span>
          <span>
            <b>{settings.businessName}</b>
            <small>{settings.origin}</small>
          </span>
        </button>
        <nav id="primary-navigation" aria-label="Main navigation" className={menu ? "navlinks open" : "navlinks"}>
          <button className={page === "home" ? "current" : ""} aria-current={page === "home" ? "page" : undefined} onClick={() => { setMenu(false); go("home"); }}>Explore trips</button>
          <button className={page === "familybooking" ? "current" : ""} aria-current={page === "familybooking" ? "page" : undefined} onClick={() => { setMenu(false); go("familybooking"); }}>Family holidays</button>
          <button className={page === "help" ? "current" : ""} aria-current={page === "help" ? "page" : undefined} onClick={() => { setMenu(false); go("help"); }}>Trip help</button>
          <a href="#about" onClick={(e) => { setMenu(false); if (page !== "home") { e.preventDefault(); go("home"); setTimeout(() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }), 150); } }}>
            About us
          </a>
          <a href="#contact" onClick={() => setMenu(false)}>
            Contact
          </a>
          {!user && (
            <div className="mobileMenuAuth">
              <button onClick={() => { setAuthMode("login"); go("auth"); }}>Sign in</button>
              <button className="btn btn-dark btn-sm" onClick={() => { setAuthMode("signup"); go("auth"); }}>Create account <ArrowUpRight /></button>
            </div>
          )}
        </nav>
        <div className="navActions">
          {user ? (
            <>
              <button
                className="accountBtn"
                onClick={() =>
                  go(isTeam(user) ? "admin" : "mybookings")
                }
              >
                {isTeam(user) ? <LayoutDashboard /> : <TicketCheck />}
                {isTeam(user) ? (user.role === "admin" ? "Admin" : "Work") : "My trips"}
              </button>
              <button className="avatar" onClick={() => setAccountOpen((open) => !open)} title="Open account menu" aria-label="Open account menu" aria-expanded={accountOpen}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name?.[0]?.toUpperCase()}
              </button>
              {accountOpen && (
                <div className="accountMenu">
                  <div className="accountMenuUser">
                    <button type="button" className={`avatarLarge ${photoBusy ? "uploading" : ""}`} onClick={() => fileRef.current?.click()} aria-label="Change profile photo">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name?.[0]?.toUpperCase()}</button>
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                    <span>{roleLabel(user)}</span>
                  </div>
                  <input ref={fileRef} className="visuallyHiddenFile" type="file" accept="image/*" onChange={changePhoto} />
                  <button className="accountPhotoBtn" disabled={photoBusy} onClick={() => fileRef.current?.click()}><Camera />{photoBusy ? "Saving photo…" : user.avatarUrl ? "Change photo" : "Upload photo"}</button>
                  {user.avatarUrl && <button className="accountPhotoBtn" onClick={removePhoto}><Trash2 />Remove photo</button>}
                  <button onClick={() => { setAccountOpen(false); go(isTeam(user) ? "admin" : "mybookings"); }}>
                    {isTeam(user) ? "Open dashboard" : "View my trips"}
                  </button>
                  <button className="accountSignOut" onClick={() => { setAccountOpen(false); logout(); }}>Sign out</button>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                className="signIn"
                onClick={() => {
                  setAuthMode("login");
                  go("auth");
                }}
              >
                Sign in
              </button>
              <button
                className="btn btn-dark btn-sm"
                onClick={() => {
                  setAuthMode("signup");
                  go("auth");
                }}
              >
                Create account
                <ArrowUpRight />
              </button>
            </>
          )}
          <button type="button" className={`hamburger${menu ? " open" : ""}`} onClick={() => setMenu(!menu)} aria-label={menu ? "Close navigation" : "Open navigation"} aria-expanded={menu} aria-controls="primary-navigation">
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
  return View();
}
