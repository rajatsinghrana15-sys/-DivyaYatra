import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Compass,
  TicketCheck,
  BusFront,
  Settings,
  Trash2,
  Users,
  ShieldCheck,
  Layers,
  Home as HomeIcon,
  Image as ImageIcon,
  UserRound,
  Send,
} from "lucide-react";
import { api, token, local, session } from "./services/api";
import { AppContext, useApp } from "./context/AppContext";
import Header from "./components/layout/Header";
import TripCard from "./components/trips/TripCard";
import HomePage from "./pages/HomePage";
import TripDetailsPage from "./pages/TripDetailsPage";
import LoginPage from "./pages/LoginPage";
import { isTeam } from "./services/access";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import TripFormModal from "./components/admin/TripFormModal";
import CategoryModal from "./components/admin/CategoryModal";
import BookingModal from "./components/booking/BookingModal";
import FamilyBookingPage from "./pages/FamilyBookingPage";
import HelpPage from "./pages/HelpPage";
import BrandMark from "./components/common/BrandMark";

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.dataset.razorpayCheckout = "true";
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Secure payment checkout could not be loaded."));
    document.body.appendChild(script);
  });
}

const processDetails = {
  signin: [Compass, "Signing you in", "Getting your travel dashboard ready."],
  signup: [
    Users,
    "Creating your account",
    "Setting up your traveller profile.",
  ],
  booking: [
    TicketCheck,
    "Saving your seats",
    "Checking availability and sending your booking request.",
  ],
  tripCreate: [
    BusFront,
    "Adding your trip",
    "Preparing the trip page and seat plan.",
  ],
  tripEdit: [
    BusFront,
    "Updating your trip",
    "Refreshing dates, vehicle and available seats.",
  ],
  category: [Layers, "Saving category", "Updating the trip catalogue."],
  tripDelete: [
    Trash2,
    "Removing trip",
    "Updating trips and seat availability.",
  ],
  categoryDelete: [Trash2, "Removing category", "Updating the trip catalogue."],
  bookingStatus: [
    ShieldCheck,
    "Updating booking",
    "Saving the new status and notifying the traveller.",
  ],
  cancel: [TicketCheck, "Cancelling booking", "Releasing the selected seats."],
  payment: [
    ShieldCheck,
    "Preparing secure checkout",
    "Opening the payment provider.",
  ],
  paymentVerify: [
    ShieldCheck,
    "Confirming your payment",
    "Checking the payment securely.",
  ],
  settings: [
    Settings,
    "Saving website settings",
    "Updating the public website.",
  ],
};

function ProcessLoader({ process }) {
  if (!process) return null;
  const [Icon, title, message] =
    processDetails[process] || processDetails.booking;
  return (
    <div
      className={`processLoaderOverlay process-${process}`}
      role="status"
      aria-live="polite"
    >
      <div className="processLoaderCard">
        <div className="processLoaderVisual">
          <i className="plRing" />
          <i className="plRing plRing2" />
          <Icon />
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="processLoaderRoad" aria-hidden="true">
          <b />
        </div>
      </div>
    </div>
  );
}

function StartupLoader({ businessName }) {
  return (
    <div className="startupLoader" role="status" aria-live="polite">
      <div className="startupLoaderCard">
        <div className="startupLoaderLogo">
          <BrandMark size={132} />
          <span className="startupGlow" />
        </div>
        <div className="startupLoaderEyebrow">
          YOUR NEXT JOURNEY STARTS HERE
        </div>
        <h1>{businessName || "Yatra Sang Raghuvanshi"}</h1>
        <p>Finding the right path for you…</p>
        <div className="startupLoaderRoute" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  );
}

function MobileAppBar() {
  const { page, user, go, goToSection } = useApp();
  const accountPage = user ? (isTeam(user) ? "admin" : "mybookings") : "auth";
  return (
    <nav className="mobileAppBar" aria-label="Quick navigation">
      <button
        className={page === "home" ? "active" : ""}
        onClick={() => go("home")}
      >
        <HomeIcon />
        <span>Explore</span>
      </button>
      <button
        className={page === "familybooking" ? "active" : ""}
        onClick={() => go("familybooking")}
      >
        <Users />
        <span>Family</span>
      </button>
      <button
        className="appBarCta"
        onClick={() =>
          user ? go("mybookings", { dashboardTab: "requests" }) : go("auth")
        }
        aria-label="Request a trip"
      >
        <Send />
        <span>Request</span>
      </button>
      <button onClick={() => goToSection("memories")}>
        <ImageIcon />
        <span>Memories</span>
      </button>
      <button
        className={
          page === "mybookings" || page === "admin" || page === "auth"
            ? "active"
            : ""
        }
        onClick={() => go(accountPage)}
      >
        <UserRound />
        <span>
          {isTeam(user)
            ? user.role === "admin"
              ? "Admin"
              : "Work"
            : user
              ? "My trips"
              : "Account"}
        </span>
      </button>
    </nav>
  );
}

export default function App() {
  const [page, setPage] = useState(() => {
      const savedPage = session.get("yatra_current_page");
      return token() && ["admin", "mybookings"].includes(savedPage)
        ? savedPage
        : "home";
    }),
    [adminSection, setAdminSectionState] = useState(
      () => session.get("yatra_admin_section") || "overview",
    ),
    [initialLoading, setInitialLoading] = useState(true),
    [paymentConfig, setPaymentConfig] = useState({
      enabled: false,
      keyId: "",
      currency: "INR",
    }),
    [user, setUser] = useState(null),
    [settings, setSettings] = useState({
      businessName: "Yatra Sang Raghuvanshi",
      tagline: "India, apne andaaz mein.",
      heroTitle: "India, apne",
      heroAccent: "andaaz mein.",
      heroDescription:
        "Big mountains, old stories, new friends. Find your next journey with a travel crew from Ambala.",
      aboutTitle: "",
      aboutDescription: "",
      quoteText: "",
      origin: "Ambala, Haryana",
      phone: "+91 70870 56153",
      alternatePhone: "",
      email: "",
      instagram: "https://instagram.com/subesinghraghuvanshi",
      facebook: "https://facebook.com/yatrasangraghuvanshi.raghuvanshi",
    }),
    [trips, setTrips] = useState([]),
    [cats, setCats] = useState([]),
    [chosen, setChosen] = useState(null),
    [bookings, setBookings] = useState([]),
    [allBookings, setAllBookings] = useState([]),
    [adminUsers, setAdminUsers] = useState([]),
    [summary, setSummary] = useState({}),
    [dashboardCounts, setDashboardCounts] = useState({}),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [authMode, setAuthMode] = useState("login"),
    [bookingTrip, setBookingTrip] = useState(null),
    [bookingDate, setBookingDate] = useState(""),
    [tripForm, setTripForm] = useState(null),
    [catForm, setCatForm] = useState(null),
    [brandForm, setBrandForm] = useState(false),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [process, setProcess] = useState(null),
    [menu, setMenu] = useState(false);
  const seenUpdates = useRef({
    identity: null,
    bookings: null,
    family: null,
    tripRequests: null,
    gallery: null,
  });
  const notice = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 3500);
  };
  const load = useCallback(async () => {
    try {
      const [s, c, t, payment] = await Promise.all([
        api("/settings"),
        api("/categories"),
        api("/trips"),
        api("/payments/config").catch(() => ({
          enabled: false,
          keyId: "",
          currency: "INR",
        })),
      ]);
      setSettings(s);
      setCats(c);
      setTrips(t);
      setPaymentConfig(payment);
      setChosen((current) =>
        current
          ? t.find((trip) => String(trip._id) === String(current._id)) ||
            current
          : current,
      );
    } catch (e) {
      notice(e.message);
    }
  }, []);
  useEffect(() => {
    const loaderFailsafe = setTimeout(() => setInitialLoading(false), 12000);
    load().finally(() => {
      clearTimeout(loaderFailsafe);
      setInitialLoading(false);
    });
    if (token())
      api("/auth/me")
        .then((r) => {
          setUser(r.user);
          if (
            session.get("yatra_current_page") === "admin" &&
            !isTeam(r.user)
          ) {
            session.remove("yatra_current_page");
            setPage("home");
          }
        })
        .catch(() => {
          removeToken();
          session.remove("yatra_current_page");
          setPage("home");
        });
    return () => clearTimeout(loaderFailsafe);
  }, [load]);
  useEffect(() => {
    const currentState = () => ({
      yatraNavigation: true,
      page,
      adminSection,
      tripId: chosen?._id || null,
      dashboardTab: chosen?.dashboardTab || null,
    });
    if (!window.history.state?.yatraNavigation)
      window.history.replaceState(currentState(), "", window.location.href);
    const restore = (event) => {
      const state = event.state;
      const nextPage = state?.yatraNavigation ? state.page || "home" : "home";
      const nextSection = state?.adminSection || "overview";
      setPage(nextPage);
      setAdminSectionState(nextSection);
      setChosen(
        state?.tripId
          ? trips.find((trip) => String(trip._id) === String(state.tripId)) ||
              null
          : state?.dashboardTab
            ? { dashboardTab: state.dashboardTab }
            : null,
      );
      if (["admin", "mybookings"].includes(nextPage))
        session.set("yatra_current_page", nextPage);
      else session.remove("yatra_current_page");
      session.set("yatra_admin_section", nextSection);
      window.scrollTo({ top: Number(state?.scrollY || 0), behavior: "smooth" });
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [page, adminSection, chosen, trips]);
  useEffect(() => {
    document.title = `${settings.businessName || "Yatra"} | India, apne andaaz mein`;
  }, [settings.businessName]);
  useEffect(() => {
    let active = true;
    const syncTrips = async () => {
      try {
        const latest = await api("/trips");
        if (!active) return;
        setTrips(latest);
        setChosen((current) =>
          current
            ? latest.find((trip) => String(trip._id) === String(current._id)) ||
              current
            : current,
        );
        setBookingTrip((current) =>
          current
            ? latest.find((trip) => String(trip._id) === String(current._id)) ||
              current
            : current,
        );
      } catch {
        /* Retry on the next poll. */
      }
    };
    const timer = setInterval(syncTrips, 12000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      if (isTeam(user)) {
        const get = (path, fallbackValue) =>
          user.role === "admin"
            ? api(path)
            : api(path).catch(() => fallbackValue);
        const [s, b, t, c, u] = await Promise.all([
          get("/admin/summary", {}),
          get("/admin/bookings", []),
          get("/admin/trips", []),
          get("/categories", []),
          get("/admin/users", []),
        ]);
        setSummary(s);
        setAllBookings(b);
        setTrips(t);
        setCats(c);
        setAdminUsers(u);
      } else setBookings(await api("/bookings/mine"));
    } catch (e) {
      notice(e.message);
    }
  }, [user]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!user) {
      seenUpdates.current = {
        identity: null,
        bookings: null,
        family: null,
        tripRequests: null,
        gallery: null,
      };
      setDashboardCounts({});
      return;
    }
    const identity = String(user._id || user.email);
    if (seenUpdates.current.identity !== identity)
      seenUpdates.current = {
        identity,
        bookings: null,
        family: null,
        tripRequests: null,
        gallery: null,
      };
    let active = true;
    const poll = async () => {
      try {
        if (user.role === "admin") {
          const [latest, users, family, tripRequests, gallery] =
            await Promise.all([
              api("/admin/bookings"),
              api("/admin/users"),
              api("/admin/family-bookings"),
              api("/admin/trip-requests"),
              api("/admin/gallery"),
            ]);
          if (!active) return;
          const previous = seenUpdates.current.bookings;
          if (previous) {
            const known = new Set(previous);
            const added = latest.find(
              (booking) => !known.has(String(booking._id)),
            );
            if (added)
              notice(
                `New booking from ${added.user?.name || "a traveller"}: ${added.trip?.title || "trip"}.`,
              );
          }
          seenUpdates.current.bookings = latest.map((booking) =>
            String(booking._id),
          );
          const announceNew = (key, records, label) => {
            const ids = records.map((record) => String(record._id));
            const previousIds = seenUpdates.current[key];
            if (previousIds) {
              const added = records.find(
                (record) => !previousIds.includes(String(record._id)),
              );
              if (added) notice(`New ${label} request received.`);
            }
            seenUpdates.current[key] = ids;
          };
          announceNew("family", family, "family");
          announceNew("tripRequests", tripRequests, "trip");
          announceNew(
            "gallery",
            [...(gallery.items || []), ...(gallery.reviews || [])],
            "gallery",
          );
          setDashboardCounts({
            bookings: latest.filter((booking) =>
              ["pending", "pending_payment"].includes(booking.status),
            ).length,
            family: family.filter((request) => request.status === "pending")
              .length,
            "trip-requests": tripRequests.filter(
              (request) => request.status === "pending",
            ).length,
            gallery:
              (gallery.items || []).filter((item) => item.status === "pending")
                .length +
              (gallery.reviews || []).filter(
                (review) => review.status === "pending",
              ).length,
          });
          setAllBookings(latest);
          setAdminUsers(users);
        } else {
          const latest = await api("/bookings/mine");
          if (!active) return;
          const previous = seenUpdates.current.bookings;
          if (previous)
            latest.forEach((booking) => {
              const oldStatus = previous.get(String(booking._id));
              if (oldStatus && oldStatus !== booking.status)
                notice(
                  `Booking update: ${booking.trip?.title || "your trip"} is ${booking.status}.`,
                );
            });
          seenUpdates.current.bookings = new Map(
            latest.map((booking) => [String(booking._id), booking.status]),
          );
          setBookings(latest);
        }
      } catch {
        /* The next interval will retry temporary network errors. */
      }
    };
    poll();
    const timer = setInterval(poll, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);
  const go = (p, item = null) => {
    window.history.replaceState(
      { ...(window.history.state || {}), scrollY: window.scrollY },
      "",
      window.location.href,
    );
    window.history.pushState(
      {
        yatraNavigation: true,
        page: p,
        adminSection,
        tripId: item?._id || null,
        dashboardTab: item?.dashboardTab || null,
        scrollY: 0,
      },
      "",
      window.location.href,
    );
    setChosen(item);
    setPage(p);
    if (["admin", "mybookings"].includes(p))
      session.set("yatra_current_page", p);
    else session.remove("yatra_current_page");
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setAdminSection = (section) => {
    window.history.replaceState(
      { ...(window.history.state || {}), scrollY: window.scrollY },
      "",
      window.location.href,
    );
    window.history.pushState(
      {
        yatraNavigation: true,
        page,
        adminSection: section,
        tripId: chosen?._id || null,
        dashboardTab: chosen?.dashboardTab || null,
        scrollY: 0,
      },
      "",
      window.location.href,
    );
    setAdminSectionState(section);
    session.set("yatra_admin_section", section);
  };
  const goToSection = (id) => {
    const recordAndScroll = () => {
      window.history.replaceState(
        { ...(window.history.state || {}), scrollY: window.scrollY },
        "",
        window.location.href,
      );
      window.history.pushState(
        {
          ...(window.history.state || {}),
          yatraNavigation: true,
          page: "home",
          adminSection,
          tripId: null,
          dashboardTab: null,
          sectionAnchor: id,
          scrollY: window.scrollY,
        },
        "",
        window.location.href,
      );
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (page !== "home") {
      go("home");
      setTimeout(recordAndScroll, 220);
      return;
    }
    recordAndScroll();
  };
  const logout = () => {
    local.remove("yatra_token");
    session.remove("yatra_current_page");
    setUser(null);
    go("home");
    notice("Signed out");
  };
  const authSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProcess(authMode === "signup" ? "signup" : "signin");
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      const r = await api(
        `/auth/${authMode === "signup" ? "register" : "login"}`,
        { method: "POST", body },
      );
      local.set("yatra_token", r.token);
      setUser(r.user);
      go(isTeam(r.user) ? "admin" : "home");
      notice(`Welcome, ${r.user.name.split(" ")[0]}!`);
    } catch (e) {
      notice(e.message);
    } finally {
      setBusy(false);
      setProcess(null);
    }
  };
  const filtered = useMemo(
    () =>
      trips.filter(
        (t) =>
          (filter === "all" || (t.category?._id || t.category) === filter) &&
          (!search ||
            `${t.title} ${t.destination} ${t.state} ${t.category?.name || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [trips, filter, search],
  );
  const payBooking = async (bookingId) => {
    setBusy(true);
    setProcess("payment");
    try {
      const order = await api("/payments/order", {
        method: "POST",
        body: { bookingId },
      });
      await loadRazorpayCheckout();
      setProcess(null);
      setBusy(false);
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: settings.businessName,
        description: order.businessName || "Trip booking",
        order_id: order.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#344b8d" },
        handler: async (response) => {
          setProcess("paymentVerify");
          try {
            const result = await api("/payments/verify", {
              method: "POST",
              body: response,
            });
            notice(
              result.paymentStatus === "refund_pending"
                ? "Payment received after cancellation; admin refund review is pending."
                : "Payment confirmed. Your booking is awaiting trip-team confirmation.",
            );
            await refresh();
            if (user?.role === "user") setBookings(await api("/bookings/mine"));
          } catch (error) {
            notice(
              error.message ||
                "Payment confirmation is still pending. Check My bookings or contact support.",
            );
          } finally {
            setProcess(null);
          }
        },
        modal: {
          ondismiss: () =>
            notice(
              "Checkout closed. You can retry or cancel this booking from My bookings.",
            ),
        },
      });
      checkout.on("payment.failed", () =>
        notice("Payment did not complete. You can retry from My bookings."),
      );
      checkout.open();
    } catch (error) {
      notice(error.message || "Could not start online payment.");
      setProcess(null);
      setBusy(false);
    }
  };
  const book = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProcess("booking");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const created = await api("/bookings", {
        method: "POST",
        body: {
          tripId: bookingTrip._id,
          travelers: Number(f.travelers),
          travelDate: f.travelDate,
          contactName: f.contactName,
          contactPhone: f.contactPhone,
          pickupLocation: f.pickupLocation || "",
          pickupAddress: f.pickupAddress || "",
          notes: f.notes,
          seatNumbers: f.seatNumbers
            ? f.seatNumbers.split(",").filter(Boolean)
            : [],
          travelerCounts: {
            men: Number(f.men || 0),
            women: Number(f.women || 0),
            children: Number(f.children || 0),
          },
          whatsappOptIn: f.whatsappOptIn === "on",
        },
      });
      setBookingTrip(null);
      if (paymentConfig.enabled) {
        notice("Booking saved. Complete payment in the secure checkout.");
        await payBooking(created._id);
      } else
        notice(
          "Booking request received. Online payment is not configured yet.",
        );
      await load();
      if (user?.role === "user") setBookings(await api("/bookings/mine"));
    } catch (e) {
      notice(e.message);
    } finally {
      setBusy(false);
      setProcess(null);
    }
  };
  const cancel = async (id) => {
    const booking = [...bookings, ...allBookings].find(
      (item) => String(item._id) === String(id),
    );
    const percent = Number(booking?.trip?.cancellationFeePercent || 0);
    const fee = Math.round((Number(booking?.totalAmount || 0) * percent) / 100);
    const refund = Math.max(0, Number(booking?.totalAmount || 0) - fee);
    const detail =
      booking?.paymentStatus === "paid"
        ? `\nCancellation charge: ${percent}% (₹${fee}). Estimated refund: ₹${refund}. Admin will review and issue eligible refunds.`
        : `\nCancellation charge: ${percent}% of the trip amount if payment was collected.`;
    if (!confirm(`Cancel this booking?${detail}`)) return;
    setProcess("cancel");
    try {
      await api(`/bookings/${id}/cancel`, { method: "PATCH" });
      notice("Booking cancelled.");
      await refresh();
      await load();
    } catch (e) {
      notice(e.message);
    } finally {
      setProcess(null);
    }
  };
  const saveTrip = async (e) => {
    e.preventDefault();
    const editingTrip = Boolean(tripForm?._id);
    setBusy(true);
    setProcess(editingTrip ? "tripEdit" : "tripCreate");
    const f = new FormData(e.currentTarget),
      lines = (k) =>
        String(f.get(k) || "")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
    const body = {
      title: f.get("title"),
      category: f.get("category"),
      destination: f.get("destination"),
      state: f.get("state"),
      origin: f.get("origin"),
      durationDays: +f.get("days"),
      durationNights: +f.get("nights"),
      price: +f.get("price"),
      compareAtPrice: +f.get("oldPrice") || 0,
      summary: f.get("summary"),
      description: f.get("description"),
      images: [
        ...lines("images"),
        ...JSON.parse(f.get("uploadedImages") || "[]"),
      ],
      inclusions: lines("inclusions"),
      exclusions: lines("exclusions"),
      itinerary: lines("itinerary").map((x, i) => ({
        day: i + 1,
        title: x.split("|")[0]?.trim(),
        details: x.split("|").slice(1).join("|").trim(),
      })),
      departureDates: String(f.get("dates") || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      tripType: f.get("tripType") || "general",
      tripAudience: f.get("tripAudience") || "friends",
      pickupType: f.get("pickupType") || "none",
      pickupCity: f.get("pickupCity") || "",
      pickupPoints: lines("pickupPoints"),
      pickupMapUrls: String(f.get("pickupMapUrls") || "")
        .split("\n")
        .map((x) => x.trim()),
      pickupDetails: f.get("pickupDetails") || "",
      cancellationFeePercent: Math.max(
        0,
        Math.min(100, Number(f.get("cancellationFeePercent") || 0)),
      ),
      vehicleType: f.get("vehicleType") || "bus",
      vehicleName: f.get("vehicleName"),
      vehicleDetails: f.get("vehicleDetails"),
      vehicleTotalSeats: +f.get("vehicleTotalSeats") || 20,
      maxGroupSize: +f.get("vehicleTotalSeats") || 20,
      seatsAvailable: tripForm?._id
        ? Math.max(
            0,
            Math.min(
              +f.get("vehicleTotalSeats") || 20,
              (tripForm.seatsAvailable || 0) +
                ((+f.get("vehicleTotalSeats") || 20) -
                  (tripForm.vehicleTotalSeats || tripForm.maxGroupSize || 20)),
            ),
          )
        : +f.get("vehicleTotalSeats") || 20,
      featured: f.get("featured") === "on",
      active: f.get("active") === "on",
    };
    try {
      await api(editingTrip ? `/trips/${tripForm._id}` : "/trips", {
        method: editingTrip ? "PATCH" : "POST",
        body,
      });
      setTripForm(null);
      notice("Trip saved.");
      await refresh();
    } catch (e) {
      notice(e.message);
    } finally {
      setBusy(false);
      setProcess(null);
    }
  };
  const saveCat = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProcess("category");
    const f = new FormData(e.currentTarget);
    try {
      const editingCategory = Boolean(catForm?._id);
      await api(
        editingCategory ? `/categories/${catForm._id}` : "/categories",
        {
          method: editingCategory ? "PATCH" : "POST",
          body: {
            name: f.get("name"),
            description: f.get("description"),
            active: true,
          },
        },
      );
      setCatForm(null);
      notice("Category saved.");
      await refresh();
    } catch (e) {
      notice(e.message);
    } finally {
      setBusy(false);
      setProcess(null);
    }
  };
  const remove = async (path, msg) => {
    if (!confirm(msg)) return;
    setProcess(path.includes("/trips/") ? "tripDelete" : "categoryDelete");
    try {
      await api(path, { method: "DELETE" });
      notice("Deleted.");
      await refresh();
    } catch (e) {
      notice(e.message);
    } finally {
      setProcess(null);
    }
  };
  const status = async (id, value) => {
    setProcess("bookingStatus");
    try {
      await api(`/admin/bookings/${id}/status`, {
        method: "PATCH",
        body: { status: value },
      });
      await refresh();
      notice("Booking updated.");
    } catch (e) {
      notice(e.message);
    } finally {
      setProcess(null);
    }
  };
  const saveBrand = async (e) => {
    e.preventDefault();
    setProcess("settings");
    try {
      const r = await api("/settings", {
        method: "PATCH",
        body: Object.fromEntries(new FormData(e.currentTarget)),
      });
      setSettings(r);
      setBrandForm(false);
      notice("Brand settings saved.");
    } catch (e) {
      notice(e.message);
    } finally {
      setProcess(null);
    }
  };
  const startBooking = (t, date = "") => {
    setBookingDate(date || "");
    if (!user) {
      setBookingTrip(t);
      setAuthMode("login");
      go("auth");
      return;
    }
    setBookingTrip(t);
  };
  const contextValue = {
    page,
    setPage,
    adminSection,
    setAdminSection,
    user,
    setUser,
    settings,
    setSettings,
    trips,
    setTrips,
    cats,
    setCats,
    chosen,
    setChosen,
    bookings,
    setBookings,
    allBookings,
    setAllBookings,
    adminUsers,
    setAdminUsers,
    summary,
    setSummary,
    dashboardCounts,
    filter,
    setFilter,
    search,
    setSearch,
    authMode,
    setAuthMode,
    bookingTrip,
    setBookingTrip,
    bookingDate,
    setBookingDate,
    tripForm,
    setTripForm,
    catForm,
    setCatForm,
    brandForm,
    setBrandForm,
    toast,
    setToast,
    busy,
    setBusy,
    menu,
    setMenu,
    notice,
    load,
    refresh,
    go,
    goToSection,
    logout,
    authSubmit,
    filtered,
    book,
    cancel,
    saveTrip,
    saveCat,
    remove,
    status,
    refund: async (id) => {
      setProcess("bookingStatus");
      try {
        await api(`/admin/bookings/${id}/refund`, { method: "POST" });
        notice("Refund submitted to the payment provider.");
        await refresh();
      } catch (error) {
        notice(error.message);
      } finally {
        setProcess(null);
      }
    },
    saveBrand,
    startBooking,
    paymentConfig,
    payBooking,
    Card: TripCard,
  };
  return (
    <AppContext.Provider value={contextValue}>
      <Header />
      <MobileAppBar />
      {initialLoading && <StartupLoader businessName={settings.businessName} />}
      {page === "home" && <HomePage />}
      {page === "trip" && <TripDetailsPage />}
      {page === "familybooking" && <FamilyBookingPage />}
      {page === "help" && <HelpPage />}
      {page === "auth" && <LoginPage />}
      {page === "mybookings" && <MyBookingsPage />}
      {page === "admin" &&
        (isTeam(user) ? <AdminDashboardPage /> : <HomePage />)}
      {bookingTrip && <BookingModal />}
      {tripForm && <TripFormModal />}
      {catForm && <CategoryModal />}
      {toast && (
        <div className="toast">
          <Check />
          {toast}
        </div>
      )}
      <ProcessLoader process={process} />
    </AppContext.Provider>
  );
}
