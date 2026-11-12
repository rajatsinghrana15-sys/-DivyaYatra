import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHmac, timingSafeEqual } from "node:crypto";

const app = express(),
  PORT = process.env.PORT || 5000,
  SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("JWT_SECRET is required. Copy .env.example to server/.env.");
  process.exit(1);
}
app.use(helmet());
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);
app.use(
  cors({
    origin(origin, callback) {
      const isPrivateLanOrigin =
        /^https?:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$/.test(
          origin || "",
        );
      if (!origin || allowedOrigins.has(origin) || isPrivateLanOrigin)
        return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
  }),
);
app.use(
  express.json({
    limit: "16mb",
    verify: (req, _res, buffer) => {
      if (req.originalUrl === "/api/payments/webhook")
        req.rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 900000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    phone: String,
    avatarUrl: String,
    role: { type: String, enum: ["user", "admin", "staff"], default: "user" },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true },
    description: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const tripSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    destination: { type: String, required: true },
    state: String,
    origin: String,
    durationDays: { type: Number, min: 1, required: true },
    durationNights: { type: Number, min: 0, required: true },
    price: { type: Number, min: 0, required: true },
    compareAtPrice: { type: Number, default: 0 },
    images: [String],
    summary: { type: String, required: true },
    description: String,
    itinerary: [{ day: Number, title: String, details: String }],
    inclusions: [String],
    exclusions: [String],
    departureDates: [Date],
    tripType: {
      type: String,
      enum: ["general", "family", "pilgrimage", "family_vacation"],
      default: "general",
    },
    tripAudience: {
      type: String,
      enum: ["family", "friends", "school_college"],
    },
    pickupType: {
      type: String,
      enum: ["none", "city_points", "door_to_door"],
      default: "none",
    },
    pickupCity: String,
    pickupPoints: [String],
    pickupMapUrls: [String],
    pickupDetails: String,
    cancellationFeePercent: { type: Number, min: 0, max: 100, default: 0 },
    vehicleType: {
      type: String,
      enum: [
        "bus",
        "car",
        "traveller_van",
        "tempo_traveller",
        "train",
        "other",
      ],
      default: "bus",
    },
    vehicleName: String,
    vehicleDetails: String,
    vehicleTotalSeats: { type: Number, min: 1, default: 20 },
    maxGroupSize: { type: Number, default: 20 },
    seatsAvailable: { type: Number, default: 20 },
    reservationVersion: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
    featured: Boolean,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    travelers: { type: Number, required: true },
    travelerCounts: {
      men: { type: Number, default: 0 },
      women: { type: Number, default: 0 },
      children: { type: Number, default: 0 },
    },
    seatNumbers: [String],
    pickupLocation: String,
    pickupAddress: String,
    whatsappOptIn: { type: Boolean, default: false },
    travelDate: { type: Date, required: true },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    notes: String,
    totalAmount: Number,
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "refund_pending",
        "refund_processing",
        "refund_initiated",
        "refund_failed",
        "refunded",
      ],
      default: "unpaid",
    },
    paymentOrderId: String,
    paymentId: String,
    paymentExpiresAt: Date,
    paidAt: Date,
    refundId: String,
    refundAmount: { type: Number, default: 0 },
    cancellationCharge: { type: Number, default: 0 },
    refundStatus: String,
    status: {
      type: String,
      enum: [
        "pending_payment",
        "pending",
        "confirmed",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },
    cancelledAt: Date,
    statusUpdatedAt: Date,
  },
  { timestamps: true },
);
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "brand" },
    businessName: { type: String, default: "Yatra Sang Raghuvanshi" },
    tagline: { type: String, default: "India, apne andaaz mein." },
    heroTitle: { type: String, default: "India, apne" },
    heroAccent: { type: String, default: "andaaz mein." },
    heroDescription: {
      type: String,
      default:
        "Big mountains, old stories, new friends. Find your next journey with a travel crew from Ambala.",
    },
    aboutTitle: { type: String, default: "" },
    aboutDescription: { type: String, default: "" },
    quoteText: { type: String, default: "" },
    origin: { type: String, default: "Ambala, Haryana" },
    phone: { type: String, default: "+91 70870 56153" },
    alternatePhone: { type: String, default: "" },
    email: { type: String, default: "" },
    instagram: {
      type: String,
      default: "https://www.instagram.com/subesinghraghuvanshi/",
    },
    facebook: {
      type: String,
      default: "https://www.facebook.com/yatrasangraghuvanshi.raghuvanshi",
    },
    logoUrl: String,
    heroImageUrl: String,
    galleryPaymentQR: String,
    galleryUPIId: String,
    galleryPhotoFee: { type: Number, default: 0, min: 0 },
    galleryVideoFee: { type: Number, default: 0, min: 0 },
    galleryPhotoLimit: { type: Number, default: 12, min: 1, max: 30 },
    galleryVideoLimit: { type: Number, default: 6, min: 1, max: 8 },
    galleryVisibilityDays: { type: Number, default: 30, min: 1, max: 365 },
    galleryEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const galleryItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    mediaType: { type: String, enum: ["photo", "video"], required: true },
    title: { type: String, trim: true, maxlength: 100, default: "" },
    destination: { type: String, trim: true, maxlength: 100, default: "" },
    mediaData: { type: String, required: true, maxlength: 12000000 },
    paymentReference: { type: String, trim: true, default: "" },
    paymentAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    publishedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true },
);
const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true, trim: true, maxlength: 1200 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);
reviewSchema.index({ user: 1, trip: 1 }, { unique: true });
const tripRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    destination: { type: String, required: true, trim: true, maxlength: 100 },
    groupType: {
      type: String,
      enum: ["family", "friends", "school_college"],
      required: true,
    },
    travelers: { type: Number, min: 1, max: 100, required: true },
    pickupLocation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    travelDate: { type: Date, required: true },
    contactName: { type: String, required: true, trim: true, maxlength: 100 },
    contactPhone: { type: String, required: true, trim: true, maxlength: 30 },
    notes: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "contacted", "approved", "declined", "completed"],
      default: "pending",
    },
    adminNote: { type: String, maxlength: 1200 },
    quoteAmount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);
const User = mongoose.model("User", userSchema),
  Category = mongoose.model("Category", categorySchema),
  Trip = mongoose.model("Trip", tripSchema),
  Booking = mongoose.model("Booking", bookingSchema),
  Settings = mongoose.model("Settings", settingsSchema),
  GalleryItem = mongoose.model("GalleryItem", galleryItemSchema),
  Review = mongoose.model("Review", reviewSchema),
  TripRequest = mongoose.model("TripRequest", tripRequestSchema);
const slug = (s) =>
  `${s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const seatLabels = (count) =>
  Array.from(
    { length: Math.max(0, count) },
    (_, i) => `${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}`,
  );
const safe = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  avatarUrl: u.avatarUrl || "",
  role: u.role,
  permissions: u.permissions || [],
  active: u.active !== false,
});
const sendError = (res, e) =>
  res
    .status(e.status || 400)
    .json({ message: e.message || "Something went wrong." });
const paymentEnabled = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
async function razorpayApi(path, options = {}) {
  if (!paymentEnabled())
    throw Object.assign(new Error("Online payment is not configured."), {
      status: 503,
    });
  const authHeader = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(
      new Error(data.error?.description || "Payment provider request failed."),
      { status: 502 },
    );
  return data;
}
function verifyHmac(expected, received) {
  if (
    !received ||
    !expected ||
    received.length !== expected.length ||
    !/^[a-f0-9]+$/i.test(received)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex"),
  );
}
function cancellationAmounts(booking, trip) {
  const percent = Math.min(
    100,
    Math.max(0, Number(trip?.cancellationFeePercent) || 0),
  );
  const charge = Math.round((Number(booking.totalAmount || 0) * percent) / 100);
  return {
    cancellationCharge: charge,
    refundAmount: Math.max(0, Number(booking.totalAmount || 0) - charge),
    cancellationFeePercent: percent,
  };
}
async function applyCancellation(booking, session) {
  const query = Trip.findById(booking.trip);
  if (session) query.session(session);
  const trip = await query;
  const amounts = cancellationAmounts(booking, trip);
  booking.cancellationCharge = amounts.cancellationCharge;
  booking.refundAmount =
    booking.paymentStatus === "paid" ? amounts.refundAmount : 0;
  if (booking.paymentStatus === "paid" && booking.refundAmount > 0)
    booking.paymentStatus = "refund_pending";
  else if (booking.paymentStatus === "pending")
    booking.paymentStatus = "unpaid";
  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.statusUpdatedAt = new Date();
  await booking.save(session ? { session } : {});
  const updateOptions = session ? { session } : {};
  await Trip.findByIdAndUpdate(
    booking.trip,
    { $inc: { seatsAvailable: booking.travelers } },
    updateOptions,
  );
  return amounts;
}
function validateTripPickup(data) {
  const type = data.tripType || "general";
  if (type === "pilgrimage") data.pickupType = "city_points";
  if (type === "family_vacation") data.pickupType = "door_to_door";
  data.pickupType = data.pickupType || "none";
  if (!["none", "city_points", "door_to_door"].includes(data.pickupType))
    throw Object.assign(new Error("Choose a valid pickup arrangement."), {
      status: 400,
    });
  if (data.pickupType === "city_points") {
    data.pickupCity = String(data.pickupCity || "").trim();
    if (!data.pickupCity)
      throw Object.assign(
        new Error("Enter the city where pickup points are located."),
        { status: 400 },
      );
    data.pickupPoints = (
      Array.isArray(data.pickupPoints) ? data.pickupPoints : []
    )
      .map((point) => String(point).trim())
      .filter(Boolean);
    if (data.pickupPoints.length < 1 || data.pickupPoints.length > 2)
      throw Object.assign(new Error("Set one or two city pickup points."), {
        status: 400,
      });
    data.pickupMapUrls = (
      Array.isArray(data.pickupMapUrls) ? data.pickupMapUrls : []
    ).map((url) => String(url || "").trim());
    if (data.pickupMapUrls.length > data.pickupPoints.length)
      throw Object.assign(
        new Error("Enter no more map links than pickup points."),
        { status: 400 },
      );
    while (data.pickupMapUrls.length < data.pickupPoints.length)
      data.pickupMapUrls.push("");
    if (
      data.pickupMapUrls.some(
        (url) =>
          url &&
          !/^https:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|www\.google\.[a-z.]+\/maps\/|maps\.google\.com\/)/i.test(
            url,
          ),
      )
    )
      throw Object.assign(
        new Error("Pickup map links must be Google Maps links."),
        { status: 400 },
      );
  } else {
    data.pickupPoints = [];
    data.pickupMapUrls = [];
  }
  return data;
}
const dayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};
async function seatsLeftForDate(trip, date) {
  const { start, end } = dayRange(date),
    active = await Booking.find({
      trip: trip._id,
      travelDate: { $gte: start, $lt: end },
      status: { $in: ["pending_payment", "pending", "confirmed"] },
    }).select("travelers");
  const capacity = trip.vehicleTotalSeats || trip.maxGroupSize || 20;
  return Math.max(
    0,
    capacity -
      active.reduce((sum, booking) => sum + Number(booking.travelers || 0), 0),
  );
}
async function addNextDepartureAvailability(trip) {
  const data = trip.toObject();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = (trip.departureDates || [])
    .map((date) => new Date(date))
    .filter((date) => date >= today)
    .sort((a, b) => a - b);
  const availability = await Promise.all(
    future.map(async (date) => ({
      date,
      seatsAvailable: await seatsLeftForDate(trip, date),
    })),
  );
  const nextAvailable = availability.find((item) => item.seatsAvailable > 0);
  let fallbackDeparture = null;
  if (!future.length) {
    const existing = await Booking.findOne({
      trip: trip._id,
      status: { $in: ["pending_payment", "pending", "confirmed"] },
      travelDate: { $gte: today },
    })
      .sort({ travelDate: 1 })
      .select("travelDate");
    fallbackDeparture = existing?.travelDate || null;
  }
  data.departureAvailability = availability;
  data.nextAvailableDeparture =
    nextAvailable?.date || future[0] || fallbackDeparture;
  data.seatsAvailable =
    nextAvailable?.seatsAvailable ??
    (future.length
      ? 0
      : fallbackDeparture
        ? await seatsLeftForDate(trip, fallbackDeparture)
        : trip.vehicleTotalSeats || trip.maxGroupSize || 20);
  return data;
}
async function sendWhatsAppUpdate({ phone, name, trip, status, departure }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN,
    phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID,
    template = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneId || !template || !phone) return;
  let to = String(phone).replace(/\D/g, "");
  if (to.length === 10) to = `91${to}`;
  if (to.length < 11) return;
  try {
    const response = await fetch(
      `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v23.0"}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: String(name || "Traveller").slice(0, 80),
                  },
                  { type: "text", text: String(trip || "Trip").slice(0, 100) },
                  {
                    type: "text",
                    text: String(status || "updated").slice(0, 100),
                  },
                  {
                    type: "text",
                    text: String(departure || "To be confirmed").slice(0, 60),
                  },
                ],
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      console.warn(
        `WhatsApp notification could not be delivered (HTTP ${response.status}).`,
      );
  } catch (error) {
    console.warn(
      `WhatsApp notification could not be delivered (${error.name || "network error"}).`,
    );
  }
}
async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer "))
      return res.status(401).json({ message: "Sign in to continue." });
    const data = jwt.verify(h.slice(7), SECRET);
    req.user = await User.findById(data.id);
    if (!req.user)
      return res.status(401).json({ message: "Account not found." });
    if (req.user.active === false)
      return res.status(403).json({
        message: "This account has been disabled. Contact the administrator.",
      });
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired. Please sign in again." });
  }
}
const PERMS = [
  "bookings",
  "departures",
  "trip-requests",
  "family",
  "trips",
  "categories",
  "vehicles",
  "travellers",
  "gallery",
];
const perm = (p) => (req, res, next) => {
  const u = req.user;
  if (u?.role === "admin") return next();
  if (
    u?.role === "staff" &&
    u.active !== false &&
    (p === "*" ? true : (u.permissions || []).includes(p))
  )
    return next();
  res
    .status(403)
    .json({ message: "You do not have permission for this action." });
};
const admin = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ message: "Admin access required." });
app.get("/api/health", (_, res) =>
  res.json({ ok: true, service: "Yatra API" }),
);
app.get("/api/payments/config", (_, res) =>
  res.json({
    enabled: paymentEnabled(),
    keyId: paymentEnabled() ? process.env.RAZORPAY_KEY_ID : "",
    currency: "INR",
  }),
);
app.post("/api/payments/order", auth, async (req, res) => {
  try {
    if (!paymentEnabled())
      return res
        .status(503)
        .json({ message: "Online payment is not configured yet." });
    const booking = await Booking.findById(req.body.bookingId).populate(
      "trip",
      "title",
    );
    if (!booking || String(booking.user) !== String(req.user._id))
      return res.status(404).json({ message: "Booking not found." });
    if (
      !["pending_payment", "pending"].includes(booking.status) ||
      booking.paymentStatus === "paid"
    )
      return res
        .status(409)
        .json({ message: "This booking is not waiting for payment." });
    if (booking.paymentOrderId && booking.paymentStatus === "pending")
      return res.json({
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: booking.paymentOrderId,
        amount: Math.round(booking.totalAmount * 100),
        currency: "INR",
        businessName: booking.trip?.title,
      });
    const amount = Math.round(Number(booking.totalAmount) * 100);
    if (!Number.isSafeInteger(amount) || amount < 100)
      return res.status(400).json({
        message: "The booking amount is not valid for online payment.",
      });
    const order = await razorpayApi("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: String(booking._id),
        notes: { bookingId: String(booking._id) },
      }),
    });
    booking.paymentOrderId = order.id;
    booking.paymentStatus = "pending";
    booking.status = "pending_payment";
    await booking.save();
    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      businessName: booking.trip?.title,
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/payments/verify", auth, async (req, res) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;
    const booking = await Booking.findOne({ paymentOrderId: orderId });
    if (!booking || String(booking.user) !== String(req.user._id))
      return res.status(404).json({ message: "Payment booking not found." });
    const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${booking.paymentOrderId}|${paymentId}`)
      .digest("hex");
    if (!verifyHmac(expected, signature))
      return res.status(400).json({
        message:
          "Payment verification failed. Contact the trip team before trying again.",
      });
    const payment = await razorpayApi(
      `/payments/${encodeURIComponent(paymentId)}`,
    );
    const expectedAmount = Math.round(Number(booking.totalAmount) * 100);
    if (
      payment.order_id !== booking.paymentOrderId ||
      payment.amount !== expectedAmount ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    )
      return res.status(409).json({
        message:
          "Payment is not captured yet. Your booking will update after confirmation.",
      });
    booking.paymentId = paymentId;
    booking.paidAt = new Date();
    if (booking.status === "cancelled") {
      booking.cancellationCharge = 0;
      booking.refundAmount = Number(booking.totalAmount || 0);
      booking.paymentStatus = "refund_pending";
    } else {
      booking.paymentStatus = "paid";
      if (booking.status === "pending_payment") booking.status = "pending";
    }
    booking.statusUpdatedAt = new Date();
    await booking.save();
    res.json({
      bookingId: booking._id,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/payments/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !req.rawBody)
      return res
        .status(400)
        .json({ message: "Webhook verification is unavailable." });
    const expected = createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");
    if (!verifyHmac(expected, req.headers["x-razorpay-signature"]))
      return res.status(400).json({ message: "Invalid webhook signature." });
    const event = req.body?.event,
      payment = req.body?.payload?.payment?.entity,
      refund = req.body?.payload?.refund?.entity;
    if (
      ["payment.captured", "order.paid"].includes(event) &&
      payment?.order_id &&
      payment.status === "captured"
    ) {
      const booking = await Booking.findOne({
        paymentOrderId: payment.order_id,
      });
      if (
        booking &&
        payment.amount === Math.round(Number(booking.totalAmount || 0) * 100) &&
        payment.currency === "INR"
      ) {
        booking.paymentId = payment.id;
        booking.paidAt = booking.paidAt || new Date();
        if (booking.status === "cancelled") {
          booking.cancellationCharge = 0;
          booking.refundAmount = Number(booking.totalAmount || 0);
          booking.paymentStatus = "refund_pending";
        } else {
          booking.paymentStatus = "paid";
          if (booking.status === "pending_payment") booking.status = "pending";
        }
        booking.statusUpdatedAt = new Date();
        await booking.save();
      }
    }
    if (refund?.id) {
      const booking = await Booking.findOne({ refundId: refund.id });
      if (booking) {
        if (event === "refund.processed") {
          booking.paymentStatus = "refunded";
          booking.refundStatus = "processed";
        } else if (event === "refund.failed") {
          booking.paymentStatus = "refund_failed";
          booking.refundStatus = "failed";
        }
        await booking.save();
      }
    }
    res.json({ received: true });
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email and password are required." });
    if (password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    if (await User.exists({ email: email.toLowerCase() }))
      return res.status(409).json({ message: "Account already exists." });
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      phone,
      role: "user",
    });
    res.status(201).json({
      token: jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" }),
      user: safe(user),
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await User.findOne({
      email: String(req.body.email || "").toLowerCase(),
    }).select("+password");
    if (
      !user ||
      !(await bcrypt.compare(req.body.password || "", user.password))
    )
      return res
        .status(401)
        .json({ message: "Email or password is incorrect." });
    if (user.active === false)
      return res.status(403).json({
        message: "This account has been disabled. Contact the administrator.",
      });
    res.json({
      token: jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" }),
      user: safe(user),
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/auth/me", auth, (req, res) => res.json({ user: safe(req.user) }));
app.patch("/api/auth/admin-profile", auth, admin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    if (!name || !email)
      return res.status(400).json({ message: "Name and email are required." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Enter a valid email address." });
    if (await User.exists({ email, _id: { $ne: req.user._id } }))
      return res.status(409).json({ message: "That email is already in use." });
    const updates = { name, email };
    if (password) {
      if (password.length < 8)
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters." });
      if (password !== confirmPassword)
        return res
          .status(400)
          .json({ message: "Password and confirmation do not match." });
      updates.password = await bcrypt.hash(password, 12);
    } else if (confirmPassword) {
      return res
        .status(400)
        .json({ message: "Enter a new password to confirm it." });
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({
      token: jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" }),
      user: safe(user),
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/auth/avatar", auth, async (req, res) => {
  try {
    const v = req.body.avatarUrl;
    if (
      v !== "" &&
      !(
        typeof v === "string" &&
        v.length < 400000 &&
        /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v)
      )
    )
      return res.status(400).json({ message: "Choose a valid image file." });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: v },
      { new: true },
    );
    res.json({ user: safe(user) });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/settings", async (_, res) => {
  try {
    res.json(
      await Settings.findOneAndUpdate(
        { key: "brand" },
        { $setOnInsert: { businessName: "Yatra Sang Raghuvanshi" } },
        { new: true, upsert: true },
      ),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/settings", auth, admin, async (req, res) => {
  try {
    const allowed = [
        "businessName",
        "tagline",
        "heroTitle",
        "heroAccent",
        "heroDescription",
        "aboutTitle",
        "aboutDescription",
        "quoteText",
        "origin",
        "phone",
        "alternatePhone",
        "email",
        "instagram",
        "facebook",
        "logoUrl",
        "heroImageUrl",
      ],
      update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    res.json(
      await Settings.findOneAndUpdate(
        { key: "brand" },
        { $set: update },
        { new: true, upsert: true, runValidators: true },
      ),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/gallery", async (req, res) => {
  try {
    const config = await Settings.findOne({ key: "brand" }).select(
      "galleryPaymentQR galleryUPIId galleryPhotoFee galleryVideoFee galleryPhotoLimit galleryVideoLimit galleryVisibilityDays galleryEnabled",
    );
    const now = new Date(),
      photoLimit = Math.max(1, Math.min(30, config?.galleryPhotoLimit || 12)),
      videoLimit = Math.max(1, Math.min(8, config?.galleryVideoLimit || 6)),
      metadataOnly = req.query.metadata === "1";
    const [photos, videos, reviews] = await Promise.all([
      GalleryItem.find({
        mediaType: "photo",
        status: "approved",
        expiresAt: { $gt: now },
      })
        .select(metadataOnly ? "-mediaData" : "")
        .populate("user", "name avatarUrl")
        .populate("trip", "title destination")
        .sort({ publishedAt: -1 })
        .limit(photoLimit),
      GalleryItem.find({
        mediaType: "video",
        status: "approved",
        expiresAt: { $gt: now },
      })
        .select(metadataOnly ? "-mediaData" : "")
        .populate("user", "name avatarUrl")
        .populate("trip", "title destination")
        .sort({ publishedAt: -1 })
        .limit(videoLimit),
      Review.find({ status: "approved" })
        .populate("user", "name avatarUrl")
        .populate("trip", "title destination")
        .sort({ createdAt: -1 })
        .limit(30),
    ]);
    res.json({
      photos,
      videos,
      reviews,
      settings: {
        enabled: !!config?.galleryEnabled,
        qr: config?.galleryPaymentQR || "",
        upiId: config?.galleryUPIId || "",
        photoFee: config?.galleryPhotoFee || 0,
        videoFee: config?.galleryVideoFee || 0,
        photoLimit,
        videoLimit,
        visibilityDays: config?.galleryVisibilityDays || 30,
      },
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/gallery/mine", auth, async (req, res) => {
  try {
    res.json(
      await GalleryItem.find({ user: req.user._id })
        .populate("trip", "title destination")
        .sort({ createdAt: -1 })
        .limit(60),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.delete("/api/gallery/mine/:id", auth, async (req, res) => {
  try {
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!item) throw fail("Memory not found.", 404);
    await item.deleteOne();
    res.json({
      ok: true,
      message:
        "Your memory has been removed. Any payment already made is not refunded automatically; contact the trip team if needed.",
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/admin/staff", auth, admin, async (_, res) => {
  try {
    res.json({
      perms: PERMS,
      staff: await User.find({ role: "staff" })
        .select("name email phone permissions active createdAt")
        .sort({ createdAt: -1 }),
    });
  } catch (e) {
    sendError(res, e);
  }
});
const cleanPerms = (a) => [
  ...new Set((Array.isArray(a) ? a : []).filter((p) => PERMS.includes(p))),
];
app.post("/api/admin/staff", auth, admin, async (req, res) => {
  try {
    const { name, email, password, phone, permissions } = req.body || {};
    if (!name || !email || !password)
      throw fail("Name, email and password are required.");
    if (String(password).length < 8)
      throw fail("Password must be at least 8 characters.");
    if (await User.exists({ email: String(email).toLowerCase() }))
      throw fail("An account with this email already exists.", 409);
    const u = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone || "").trim(),
      password: await bcrypt.hash(String(password), 12),
      role: "staff",
      permissions: cleanPerms(permissions),
      active: true,
    });
    res
      .status(201)
      .json({ message: "Worker account created.", staff: safe(u) });
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/admin/staff/:id", auth, admin, async (req, res) => {
  try {
    const u = await User.findOne({ _id: req.params.id, role: "staff" });
    if (!u) throw fail("Worker not found.", 404);
    const b = req.body || {};
    if (b.name !== undefined) u.name = String(b.name).trim();
    if (b.phone !== undefined) u.phone = String(b.phone).trim();
    if (b.permissions !== undefined) u.permissions = cleanPerms(b.permissions);
    if (b.active !== undefined) u.active = b.active === true;
    if (b.password) {
      if (String(b.password).length < 8)
        throw fail("Password must be at least 8 characters.");
      u.password = await bcrypt.hash(String(b.password), 12);
    }
    await u.save();
    res.json({ message: "Worker updated." });
  } catch (e) {
    sendError(res, e);
  }
});
app.delete("/api/admin/staff/:id", auth, admin, async (req, res) => {
  try {
    const r = await User.deleteOne({ _id: req.params.id, role: "staff" });
    if (!r.deletedCount) throw fail("Worker not found.", 404);
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/gallery/:id", async (req, res) => {
  try {
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      status: "approved",
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "name avatarUrl")
      .populate("trip", "title destination");
    if (!item) throw fail("Memory not found.", 404);
    res.json(item);
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/gallery", auth, async (req, res) => {
  try {
    const mediaType = req.body.mediaType,
      settings = await Settings.findOne({ key: "brand" });
    if (!settings?.galleryEnabled || !settings.galleryPaymentQR)
      throw fail(
        "Memory submissions are not open yet. Contact the trip team.",
        409,
      );
    if (!["photo", "video"].includes(mediaType))
      throw fail("Choose a photo or video.");
    if (
      (await GalleryItem.countDocuments({
        user: req.user._id,
        status: "pending",
      })) >= 3
    )
      throw fail(
        "You already have three memories waiting for approval. Please wait for the admin to review them.",
        429,
      );
    const data = String(req.body.mediaData || "");
    const pattern =
      mediaType === "photo"
        ? /^data:image\/(jpeg|png|webp);base64,/
        : /^data:video\/(mp4|webm);base64,/;
    const inline = pattern.test(data) && data.length <= 8000000;
    let isHttps = false;
    if (!inline && data.length <= 3000) {
      try {
        const parsed = new URL(data);
        isHttps =
          parsed.protocol === "https:" && !parsed.username && !parsed.password;
      } catch {}
    }
    if (!inline && !isHttps)
      throw fail(
        "Choose a supported local photo or MP4/WebM video under 5.5 MB, or a secure HTTPS media URL.",
      );
    const fee = Number(
      mediaType === "photo"
        ? settings.galleryPhotoFee
        : settings.galleryVideoFee,
    );
    if (!Number.isFinite(fee) || fee <= 0)
      throw fail("The admin has not configured this submission fee.", 409);
    const ref = String(req.body.paymentReference || "").trim();
    if (ref.length < 8 || ref.length > 50)
      throw fail(
        "Enter the UPI transaction reference after paying with the QR code.",
      );
    if (await GalleryItem.exists({ paymentReference: ref }))
      throw fail(
        "That UPI transaction reference has already been submitted.",
        409,
      );
    const trip = req.body.tripId
      ? await Trip.findOne({ _id: req.body.tripId, active: true })
      : null;
    if (req.body.tripId && !trip) throw fail("Choose a valid trip.");
    const item = await GalleryItem.create({
      user: req.user._id,
      trip: trip?._id,
      mediaType,
      title: String(req.body.title || "")
        .trim()
        .slice(0, 100),
      destination: String(req.body.destination || trip?.destination || "")
        .trim()
        .slice(0, 100),
      mediaData: data,
      paymentReference: ref,
      paymentAmount: fee,
      status: "pending",
    });
    res.status(201).json({
      message:
        "Submission received. It will appear in the gallery after the admin verifies the UPI payment and approves it.",
      item: { _id: item._id, status: item.status },
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/reviews", async (_, res) => {
  try {
    res.json(
      await Review.find({ status: "approved" })
        .populate("user", "name avatarUrl")
        .populate("trip", "title destination")
        .sort({ createdAt: -1 })
        .limit(30),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/reviews", auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.body.tripId, active: true });
    if (!trip) throw fail("Choose a valid trip.");
    if (
      !(await Booking.exists({
        user: req.user._id,
        trip: trip._id,
        status: "completed",
      }))
    )
      throw fail(
        "You can review a trip after the admin marks your booking completed.",
        403,
      );
    if (await Review.exists({ user: req.user._id, trip: trip._id }))
      throw fail("You have already submitted a review for this trip.", 409);
    const rating = Number(req.body.rating),
      text = String(req.body.text || "").trim();
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      text.length < 8 ||
      text.length > 1200
    )
      throw fail("Choose 1–5 stars and write at least 8 characters.");
    const review = await Review.create({
      user: req.user._id,
      trip: trip._id,
      rating,
      text,
      status: "pending",
    });
    res
      .status(201)
      .json({ message: "Review sent to the admin for approval.", review });
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/trip-requests", auth, async (req, res) => {
  try {
    const body = req.body || {},
      destination = String(body.destination || "").trim(),
      pickupLocation = String(body.pickupLocation || "").trim(),
      contactName = String(body.contactName || req.user.name).trim(),
      contactPhone = String(body.contactPhone || "").trim(),
      groupType = String(body.groupType || ""),
      travelers = Number(body.travelers),
      travelDate = new Date(body.travelDate);
    if (destination.length < 2 || destination.length > 100)
      throw fail("Enter a destination.");
    if (!["family", "friends", "school_college"].includes(groupType))
      throw fail("Choose family, friends, or school/college.");
    if (!Number.isInteger(travelers) || travelers < 1 || travelers > 100)
      throw fail("Enter between 1 and 60 travellers.");
    if (pickupLocation.length < 3 || pickupLocation.length > 300)
      throw fail("Enter the place where the travellers should be picked up.");
    if (
      Number.isNaN(travelDate.valueOf()) ||
      travelDate < new Date(new Date().toDateString())
    )
      throw fail("Choose a future travel date.");
    if (contactName.length < 2 || contactPhone.replace(/\D/g, "").length < 10)
      throw fail("Enter a contact name and valid phone number.");
    const trip = body.tripId
      ? await Trip.findOne({ _id: body.tripId, active: true })
      : null;
    if (body.tripId && !trip)
      throw fail("Choose an available trip or select a custom trip request.");
    const request = await TripRequest.create({
      user: req.user._id,
      trip: trip?._id,
      destination,
      groupType,
      travelers,
      pickupLocation,
      travelDate,
      contactName,
      contactPhone,
      notes: String(body.notes || "").slice(0, 1000),
      status: "pending",
    });
    res.status(201).json({
      message:
        "Your trip request was sent. The admin will contact you to confirm the route, pickup and price.",
      request,
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/trip-requests/mine", auth, async (req, res) => {
  try {
    res.json(
      await TripRequest.find({ user: req.user._id })
        .populate("trip", "title destination")
        .sort({ createdAt: -1 }),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.get(
  "/api/admin/trip-requests",
  auth,
  perm("trip-requests"),
  async (_, res) => {
    try {
      res.json(
        await TripRequest.find()
          .populate("user", "name email phone")
          .populate("trip", "title destination")
          .sort({ createdAt: -1 })
          .limit(500),
      );
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.patch(
  "/api/admin/trip-requests/:id",
  auth,
  perm("trip-requests"),
  async (req, res) => {
    try {
      const status = String(req.body.status || ""),
        update = {};
      if (
        !["pending", "contacted", "approved", "declined", "completed"].includes(
          status,
        )
      )
        throw fail("Choose a valid request status.");
      update.status = status;
      if (req.body.adminNote !== undefined)
        update.adminNote = String(req.body.adminNote).slice(0, 1200);
      if (req.body.quoteAmount !== undefined) {
        const quote = Number(req.body.quoteAmount);
        if (!Number.isFinite(quote) || quote < 0 || quote > 10000000)
          throw fail("Enter a valid quote amount.");
        update.quoteAmount = quote;
      }
      const request = await TripRequest.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true },
      )
        .populate("user", "name email phone")
        .populate("trip", "title destination");
      if (!request) throw fail("Trip request not found.", 404);
      res.json(request);
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.delete(
  "/api/admin/trip-requests/:id",
  auth,
  perm("trip-requests"),
  async (req, res) => {
    try {
      await TripRequest.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.get("/api/admin/gallery", auth, perm("gallery"), async (_, res) => {
  try {
    const [items, reviews, settings] = await Promise.all([
      GalleryItem.find()
        .select("-mediaData")
        .populate("user", "name email")
        .populate("trip", "title destination")
        .sort({ createdAt: -1 })
        .limit(100),
      Review.find()
        .populate("user", "name email")
        .populate("trip", "title destination")
        .sort({ createdAt: -1 })
        .limit(250),
      Settings.findOne({ key: "brand" }).select(
        "galleryPaymentQR galleryUPIId galleryPhotoFee galleryVideoFee galleryPhotoLimit galleryVideoLimit galleryVisibilityDays galleryEnabled",
      ),
    ]);
    res.json({ items, reviews, settings: settings || {} });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/admin/gallery/:id", auth, perm("gallery"), async (req, res) => {
  try {
    const item = await GalleryItem.findById(req.params.id)
      .populate("user", "name email")
      .populate("trip", "title destination");
    if (!item) throw fail("Memory not found.", 404);
    res.json(item);
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/admin/gallery/settings", auth, admin, async (req, res) => {
  try {
    const body = req.body || {},
      update = {};
    if (body.galleryEnabled !== undefined)
      update.galleryEnabled = body.galleryEnabled === true;
    if (body.galleryPaymentQR !== undefined) {
      const qr = String(body.galleryPaymentQR || "");
      if (qr && qr.length > 400000) throw fail("QR image is too large.");
      if (
        qr &&
        !/^https:\/\//i.test(qr) &&
        !/^data:image\/(png|jpeg|webp);base64,/i.test(qr)
      )
        throw fail("Use a secure image URL or PNG/JPEG/WebP QR image.");
      update.galleryPaymentQR = qr;
    }
    if (body.galleryUPIId !== undefined) {
      const id = String(body.galleryUPIId || "").trim();
      if (id && id.length > 100) throw fail("UPI ID is too long.");
      update.galleryUPIId = id;
    }
    for (const [key, min, max] of [
      ["galleryPhotoFee", 0, 100000],
      ["galleryVideoFee", 0, 100000],
      ["galleryPhotoLimit", 1, 30],
      ["galleryVideoLimit", 1, 8],
      ["galleryVisibilityDays", 1, 365],
    ])
      if (body[key] !== undefined) {
        const n = Number(body[key]);
        if (!Number.isInteger(n) || n < min || n > max)
          throw fail(`${key} is outside its allowed range.`);
        update[key] = n;
      }
    const current = await Settings.findOne({ key: "brand" });
    if (body.galleryEnabled === true) {
      const qr = update.galleryPaymentQR ?? current?.galleryPaymentQR,
        photoFee = update.galleryPhotoFee ?? current?.galleryPhotoFee,
        videoFee = update.galleryVideoFee ?? current?.galleryVideoFee;
      if (!qr || !(Number(photoFee) > 0) || !(Number(videoFee) > 0))
        throw fail(
          "Add a payment QR and set positive photo and video fees before opening traveller submissions.",
        );
    }
    res.json(
      await Settings.findOneAndUpdate(
        { key: "brand" },
        { $set: update },
        { new: true, upsert: true, runValidators: true },
      ),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/admin/gallery", auth, perm("gallery"), async (req, res) => {
  try {
    const type = req.body.mediaType,
      media = String(req.body.mediaData || "").trim();
    if (!["photo", "video"].includes(type))
      throw fail("Choose a photo or video.");
    const pattern =
      type === "photo"
        ? /^data:image\/(jpeg|png|webp);base64,/
        : /^data:video\/(mp4|webm);base64,/;
    const isInline = pattern.test(media) && media.length <= 8000000;
    let isHttps = false;
    if (!isInline && media.length <= 3000) {
      try {
        const parsed = new URL(media);
        isHttps =
          parsed.protocol === "https:" && !parsed.username && !parsed.password;
      } catch {}
    }
    if (!isInline && !isHttps)
      throw fail(
        "Choose a supported local photo/video under 5.5 MB or a secure HTTPS media URL.",
      );
    const settings = await Settings.findOne({ key: "brand" }),
      limit =
        type === "photo"
          ? settings?.galleryPhotoLimit || 12
          : settings?.galleryVideoLimit || 6,
      now = new Date(),
      active = await GalleryItem.countDocuments({
        mediaType: type,
        status: "approved",
        expiresAt: { $gt: now },
      });
    if (active >= limit)
      throw fail(
        `The visible ${type} gallery has reached its limit. Increase the limit or wait for older memories to expire.`,
        409,
      );
    const trip = req.body.tripId ? await Trip.findById(req.body.tripId) : null;
    const days = Math.max(
      1,
      Math.min(365, settings?.galleryVisibilityDays || 30),
    );
    const item = await GalleryItem.create({
      user: req.user._id,
      trip: trip?._id,
      mediaType: type,
      title: String(req.body.title || "")
        .trim()
        .slice(0, 100),
      destination: String(req.body.destination || trip?.destination || "")
        .trim()
        .slice(0, 100),
      mediaData: media,
      status: "approved",
      publishedAt: now,
      expiresAt: new Date(now.getTime() + days * 86400000),
    });
    res.status(201).json(item);
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/admin/gallery/:id", auth, perm("gallery"), async (req, res) => {
  try {
    const item = await GalleryItem.findById(req.params.id);
    if (!item) throw fail("Memory not found.", 404);
    const next = String(req.body.status || "");
    if (!["approved", "rejected"].includes(next))
      throw fail("Choose approve or reject.");
    if (next === "approved" && item.status !== "approved") {
      const settings = await Settings.findOne({ key: "brand" }),
        limit =
          item.mediaType === "photo"
            ? settings?.galleryPhotoLimit || 12
            : settings?.galleryVideoLimit || 6,
        active = await GalleryItem.countDocuments({
          mediaType: item.mediaType,
          status: "approved",
          expiresAt: { $gt: new Date() },
          _id: { $ne: item._id },
        });
      if (active >= limit)
        throw fail(
          `The visible ${item.mediaType} gallery is at its limit. Increase it or wait for an item to expire.`,
          409,
        );
      const days = Math.max(
        1,
        Math.min(365, settings?.galleryVisibilityDays || 30),
      );
      item.publishedAt = new Date();
      item.expiresAt = new Date(Date.now() + days * 86400000);
    }
    item.status = next;
    await item.save();
    res.json(item);
  } catch (e) {
    sendError(res, e);
  }
});
app.delete(
  "/api/admin/gallery/:id",
  auth,
  perm("gallery"),
  async (req, res) => {
    try {
      await GalleryItem.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.patch("/api/admin/reviews/:id", auth, perm("gallery"), async (req, res) => {
  try {
    const status = String(req.body.status || "");
    if (!["approved", "rejected"].includes(status))
      throw fail("Choose approve or reject.");
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("user", "name email")
      .populate("trip", "title destination");
    if (!review) throw fail("Review not found.", 404);
    res.json(review);
  } catch (e) {
    sendError(res, e);
  }
});
app.delete(
  "/api/admin/reviews/:id",
  auth,
  perm("gallery"),
  async (req, res) => {
    try {
      await Review.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.post(
  "/api/translate",
  rateLimit({
    windowMs: 60000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  async (req, res) => {
    try {
      const key = process.env.GOOGLE_TRANSLATE_API_KEY,
        { target, texts } = req.body || {};
      if (!Array.isArray(texts))
        return res.status(400).json({ message: "Nothing to translate." });
      const list = texts.slice(0, 100).map((x) => String(x).slice(0, 1000));
      if (!key || !/^[a-zA-Z-]{2,10}$/.test(target || ""))
        return res.json({ translations: list });
      const r = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: list, target, format: "text" }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const d = await r.json();
      if (!r.ok) throw new Error("Translation is unavailable right now.");
      res.json({
        translations: d.data.translations.map((t) => t.translatedText),
      });
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.get("/api/categories", async (_, res) => {
  try {
    res.json(await Category.find({ active: true }).sort("name"));
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/categories", auth, perm("categories"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name)
      return res.status(400).json({ message: "Category name is required." });
    if (
      await Category.exists({ name: new RegExp(`^${escapeRegex(name)}$`, "i") })
    )
      return res
        .status(409)
        .json({ message: "A category with this name already exists." });
    res
      .status(201)
      .json(await Category.create({ ...req.body, name, slug: slug(name) }));
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/categories/:id", auth, perm("categories"), async (req, res) => {
  try {
    const d = { ...req.body };
    if (d.name !== undefined) {
      d.name = String(d.name).trim();
      if (!d.name)
        return res.status(400).json({ message: "Category name is required." });
      if (
        await Category.exists({
          _id: { $ne: req.params.id },
          name: new RegExp(`^${escapeRegex(d.name)}$`, "i"),
        })
      )
        return res
          .status(409)
          .json({ message: "A category with this name already exists." });
      d.slug = slug(d.name);
    }
    if (!(await Category.exists({ _id: req.params.id })))
      return res.status(404).json({ message: "Category not found." });
    res.json(
      await Category.findByIdAndUpdate(req.params.id, d, {
        new: true,
        runValidators: true,
      }),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.delete(
  "/api/categories/:id",
  auth,
  perm("categories"),
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ message: "Category not found." });
      const tripCount = await Trip.countDocuments({ category: req.params.id });
      if (tripCount)
        return res.status(409).json({
          message: `This category is used by ${tripCount} trip${tripCount === 1 ? "" : "s"}. Move those trips to another category before deleting it.`,
        });
      await category.deleteOne();
      res.json({ message: "Category deleted." });
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.get("/api/trips", async (req, res) => {
  try {
    const q = { active: true };
    if (req.query.category) q.category = req.query.category;
    if (req.query.search)
      q.$or = ["title", "destination", "state"].map((k) => ({
        [k]: new RegExp(
          String(req.query.search)
            .slice(0, 60)
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      }));
    if (req.query.featured === "true") q.featured = true;
    const trips = await Trip.find(q)
      .populate("category", "name slug")
      .sort({ featured: -1, createdAt: -1 });
    res.json(await Promise.all(trips.map(addNextDepartureAvailability)));
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/trips/:id/seats", async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, active: true });
    if (!trip) return res.status(404).json({ message: "Trip not found." });
    const date = new Date(req.query.travelDate);
    if (Number.isNaN(date.valueOf()))
      return res.status(400).json({ message: "Choose a departure date." });
    const { start, end } = dayRange(date);
    const active = await Booking.find({
      trip: trip._id,
      travelDate: { $gte: start, $lt: end },
      status: { $in: ["pending_payment", "pending", "confirmed"] },
    }).select("seatNumbers travelers");
    const occupied = active.flatMap((b) => b.seatNumbers || []);
    let legacy = active.reduce(
      (sum, b) => sum + (!b.seatNumbers?.length ? b.travelers : 0),
      0,
    );
    const capacity = trip.vehicleTotalSeats || trip.maxGroupSize || 20;
    for (const seat of seatLabels(capacity)) {
      if (legacy <= 0) break;
      if (!occupied.includes(seat)) {
        occupied.push(seat);
        legacy--;
      }
    }
    res.json({
      seats: seatLabels(capacity),
      occupied,
      available: Math.max(
        0,
        capacity - active.reduce((sum, b) => sum + Number(b.travelers || 0), 0),
      ),
      totalSeats: capacity,
    });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/trips/:id", async (req, res) => {
  try {
    const cond = mongoose.isValidObjectId(req.params.id)
      ? { _id: req.params.id }
      : { slug: req.params.id };
    const t = await Trip.findOne({ ...cond, active: true }).populate(
      "category",
      "name slug",
    );
    if (!t) return res.status(404).json({ message: "Trip not found." });
    res.json(await addNextDepartureAvailability(t));
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/admin/trips", auth, perm("trips"), async (_, res) => {
  try {
    const trips = await Trip.find()
      .populate("category", "name")
      .sort({ createdAt: -1 });
    res.json(await Promise.all(trips.map(addNextDepartureAvailability)));
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/trips", auth, perm("trips"), async (req, res) => {
  try {
    const data = validateTripPickup({ ...req.body });
    const trip = await (
      await Trip.create({ ...data, slug: slug(data.title) })
    ).populate("category", "name");
    res.status(201).json(await addNextDepartureAvailability(trip));
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/trips/:id", auth, perm("trips"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res
        .status(400)
        .json({ message: "A valid trip ID is required to edit a trip." });
    const d = validateTripPickup({ ...req.body });
    if (d.title) d.slug = slug(d.title);
    const trip = await Trip.findByIdAndUpdate(req.params.id, d, {
      new: true,
      runValidators: true,
    }).populate("category", "name");
    res.json(await addNextDepartureAvailability(trip));
  } catch (e) {
    sendError(res, e);
  }
});
app.delete("/api/trips/:id", auth, perm("trips"), async (req, res) => {
  try {
    if (
      await Booking.exists({
        trip: req.params.id,
        status: { $in: ["pending_payment", "pending", "confirmed"] },
      })
    )
      return res.status(409).json({
        message: "This trip has active bookings. Deactivate it instead.",
      });
    await Trip.findByIdAndDelete(req.params.id);
    res.json({ message: "Trip deleted." });
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/bookings/mine", auth, async (req, res) => {
  try {
    res.json(
      await Booking.find({ user: req.user._id })
        .populate(
          "trip",
          "title destination images durationDays durationNights pickupType pickupCity pickupPoints pickupMapUrls cancellationFeePercent",
        )
        .sort({ createdAt: -1 }),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/bookings", auth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { tripId, travelers, travelDate, contactName, contactPhone, notes } =
        req.body,
      n = Number(travelers),
      chosen = Array.isArray(req.body.seatNumbers) ? req.body.seatNumbers : [],
      counts = req.body.travelerCounts || {},
      travelerCounts = {
        men: Number(counts.men || 0),
        women: Number(counts.women || 0),
        children: Number(counts.children || 0),
      },
      countTotal =
        travelerCounts.men + travelerCounts.women + travelerCounts.children;
    if (!Number.isInteger(n) || n < 1 || n > 20)
      throw Object.assign(new Error("Select between 1 and 20 travellers."), {
        status: 400,
      });
    if (
      Object.values(travelerCounts).some(
        (count) => !Number.isInteger(count) || count < 0,
      ) ||
      countTotal !== n
    )
      throw Object.assign(
        new Error("Choose the number of adult men, adult women and children."),
        { status: 400 },
      );
    if (chosen.length !== n || new Set(chosen).size !== n)
      throw Object.assign(
        new Error("Select one different seat for each traveller."),
        { status: 400 },
      );
    let id;
    await session.withTransaction(async () => {
      const t = await Trip.findOne({ _id: tripId, active: true }).session(
        session,
      );
      if (!t)
        throw Object.assign(new Error("Trip is unavailable."), { status: 404 });
      const pickupLocation = String(req.body.pickupLocation || "").trim(),
        pickupAddress = String(req.body.pickupAddress || "").trim();
      if (
        t.pickupType === "city_points" &&
        !(t.pickupPoints || []).includes(pickupLocation)
      )
        throw Object.assign(
          new Error("Choose one of this trip’s listed pickup points."),
          { status: 400 },
        );
      if (t.pickupType === "door_to_door" && pickupAddress.length < 8)
        throw Object.assign(
          new Error(
            "Enter the complete pickup address for door-to-door pickup.",
          ),
          { status: 400 },
        );
      const d = new Date(travelDate);
      if (Number.isNaN(d.valueOf()) || d < new Date(new Date().toDateString()))
        throw Object.assign(new Error("Choose an upcoming travel date."), {
          status: 400,
        });
      if (
        t.departureDates.length &&
        !t.departureDates.some(
          (x) => new Date(x).toDateString() === d.toDateString(),
        )
      )
        throw Object.assign(new Error("Choose a listed departure date."), {
          status: 400,
        });
      await Trip.updateOne(
        { _id: t._id },
        { $inc: { reservationVersion: 1 } },
        { session },
      );
      const { start, end } = dayRange(d);
      const existing = await Booking.find({
        trip: t._id,
        travelDate: { $gte: start, $lt: end },
        status: { $in: ["pending_payment", "pending", "confirmed"] },
      })
        .select("seatNumbers travelers")
        .session(session);
      const occupied = existing.flatMap((b) => b.seatNumbers || []);
      let legacy = existing.reduce(
        (sum, b) => sum + (!b.seatNumbers?.length ? b.travelers : 0),
        0,
      );
      const capacity = t.vehicleTotalSeats || t.maxGroupSize || 20;
      for (const seat of seatLabels(capacity)) {
        if (legacy <= 0) break;
        if (!occupied.includes(seat)) {
          occupied.push(seat);
          legacy--;
        }
      }
      const bookedCount = existing.reduce(
        (sum, b) => sum + Number(b.travelers || 0),
        0,
      );
      if (bookedCount + n > capacity)
        throw Object.assign(
          new Error("Not enough seats remain for this departure."),
          { status: 409 },
        );
      const valid = seatLabels(capacity);
      if (
        chosen.some((seat) => !valid.includes(seat) || occupied.includes(seat))
      )
        throw Object.assign(
          new Error(
            "One or more selected seats are no longer available. Please choose again.",
          ),
          { status: 409 },
        );
      const [b] = await Booking.create(
        [
          {
            user: req.user._id,
            trip: t._id,
            travelers: n,
            travelerCounts,
            seatNumbers: chosen,
            pickupLocation: pickupLocation || undefined,
            pickupAddress: pickupAddress || undefined,
            whatsappOptIn: req.body.whatsappOptIn === true,
            travelDate: d,
            contactName,
            contactPhone,
            notes,
            totalAmount: t.price * n,
            status: paymentEnabled() ? "pending_payment" : "pending",
            paymentStatus: paymentEnabled() ? "pending" : "unpaid",
          },
        ],
        { session },
      );
      id = b._id;
    });
    const booking = await Booking.findById(id).populate(
      "trip",
      "title destination images",
    );
    if (booking.whatsappOptIn)
      void sendWhatsAppUpdate({
        phone: booking.contactPhone,
        name: booking.contactName,
        trip: booking.trip?.title,
        status: "Booking request received - pending confirmation",
        departure: new Date(booking.travelDate).toLocaleDateString("en-IN"),
      });
    res.status(201).json(booking);
  } catch (e) {
    sendError(res, e);
  } finally {
    await session.endSession();
  }
});
app.patch("/api/bookings/:id/cancel", auth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let id;
    await session.withTransaction(async () => {
      const b = await Booking.findById(req.params.id).session(session);
      if (!b) return;
      if (String(b.user) !== String(req.user._id))
        throw Object.assign(
          new Error("You can only cancel your own booking."),
          { status: 403 },
        );
      if (
        !["pending_payment", "pending", "confirmed"].includes(b.status) ||
        new Date(b.travelDate) <= new Date()
      )
        throw Object.assign(
          new Error("This booking cannot be cancelled online."),
          { status: 409 },
        );
      await applyCancellation(b, session);
      id = b._id;
    });
    if (!id) return res.status(404).json({ message: "Booking not found." });
    const booking = await Booking.findById(id).populate(
      "trip",
      "title destination images",
    );
    if (booking.whatsappOptIn)
      void sendWhatsAppUpdate({
        phone: booking.contactPhone,
        name: booking.contactName,
        trip: booking.trip?.title,
        status: "Booking cancelled",
        departure: new Date(booking.travelDate).toLocaleDateString("en-IN"),
      });
    res.json(booking);
  } catch (e) {
    sendError(res, e);
  } finally {
    await session.endSession();
  }
});
app.get("/api/admin/bookings", auth, perm("bookings"), async (_, res) => {
  try {
    res.json(
      await Booking.find()
        .populate("user", "name email phone")
        .populate("trip", "title destination")
        .sort({ createdAt: -1 }),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/admin/users", auth, perm("travellers"), async (_, res) => {
  try {
    res.json(
      await User.find({ role: "user" })
        .select("name email phone avatarUrl createdAt")
        .sort({ createdAt: -1 }),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.patch(
  "/api/admin/bookings/:id/status",
  auth,
  perm("bookings"),
  async (req, res) => {
    try {
      const b = await Booking.findById(req.params.id),
        s = req.body.status;
      if (!b) return res.status(404).json({ message: "Booking not found." });
      if (!["pending", "confirmed", "cancelled", "completed"].includes(s))
        return res.status(400).json({ message: "Invalid status." });
      if (
        s === "cancelled" &&
        ["pending_payment", "pending", "confirmed"].includes(b.status)
      ) {
        if (new Date(b.travelDate) <= new Date())
          return res
            .status(409)
            .json({ message: "Past trips cannot be cancelled." });
        await applyCancellation(b);
      }
      b.status = s;
      b.statusUpdatedAt = new Date();
      await b.save();
      const updated = await Booking.findById(b._id)
        .populate("user", "name email phone")
        .populate("trip", "title destination");
      if (updated.whatsappOptIn)
        void sendWhatsAppUpdate({
          phone: updated.contactPhone,
          name: updated.contactName,
          trip: updated.trip?.title,
          status: `Booking ${s}`,
          departure: new Date(updated.travelDate).toLocaleDateString("en-IN"),
        });
      res.json(updated);
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.post("/api/admin/bookings/:id/refund", auth, admin, async (req, res) => {
  let booking;
  try {
    booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        paymentStatus: { $in: ["refund_pending", "refund_failed"] },
      },
      { $set: { paymentStatus: "refund_processing" } },
      { new: true },
    );
    if (!booking)
      return res
        .status(409)
        .json({ message: "This booking has no refund ready to issue." });
    if (!booking.paymentId || booking.refundAmount <= 0)
      throw Object.assign(
        new Error(
          "A captured payment and a positive refund amount are required.",
        ),
        { status: 409 },
      );
    const refund = await razorpayApi(
      `/payments/${encodeURIComponent(booking.paymentId)}/refund`,
      {
        method: "POST",
        body: JSON.stringify({
          amount: Math.round(booking.refundAmount * 100),
          notes: {
            bookingId: String(booking._id),
            cancellationCharge: String(booking.cancellationCharge || 0),
          },
        }),
      },
    );
    booking.refundId = refund.id;
    booking.refundStatus = refund.status || "pending";
    booking.paymentStatus =
      refund.status === "processed" ? "refunded" : "refund_initiated";
    await booking.save();
    res.json(booking);
  } catch (e) {
    if (booking) {
      booking.paymentStatus = "refund_pending";
      await booking.save().catch(() => {});
    }
    sendError(res, e);
  }
});
app.get("/api/admin/summary", auth, perm("*"), async (_, res) => {
  try {
    const [trips, bookings, users, categories, rev] = await Promise.all([
      Trip.countDocuments(),
      Booking.countDocuments(),
      User.countDocuments({ role: "user" }),
      Category.countDocuments(),
      Booking.aggregate([
        { $match: { status: { $in: ["pending", "confirmed", "completed"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);
    res.json({
      trips,
      bookings,
      users,
      categories,
      revenue: rev[0]?.total || 0,
    });
  } catch (e) {
    sendError(res, e);
  }
});
async function seedExamples() {
  if (!(await Category.countDocuments()))
    await Category.insertMany([
      {
        name: "Mountains",
        slug: "mountains",
        description: "Fresh air and Himalayan escapes",
      },
      {
        name: "Heritage",
        slug: "heritage",
        description: "History, culture and architecture",
      },
      {
        name: "Coastal",
        slug: "coastal",
        description: "Relaxed beach and island breaks",
      },
      {
        name: "Adventure",
        slug: "adventure",
        description: "Active trips and outdoor experiences",
      },
    ]);
  if (!(await Trip.countDocuments())) {
    const c = Object.fromEntries(
      (await Category.find()).map((x) => [x.name, x._id]),
    );
    const sample = [
      {
        title: "Manali & Solang Valley Escape",
        category: c.Mountains,
        destination: "Manali",
        state: "Himachal Pradesh",
        durationDays: 5,
        durationNights: 4,
        price: 12999,
        compareAtPrice: 15999,
        summary:
          "A mountain getaway with cedar forests, valley views and time to slow down.",
        description:
          "A sample Himachal itinerary from Ambala, with scenic drives and a free day in the mountains.",
        images: [
          "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=85",
        ],
        itinerary: [
          {
            day: 1,
            title: "Travel to Manali",
            details: "Depart from Ambala and check in after arrival.",
          },
          {
            day: 2,
            title: "Old Manali",
            details: "Explore the riverside lanes, cafes and local market.",
          },
          {
            day: 3,
            title: "Solang Valley",
            details: "Enjoy mountain scenery and optional activities.",
          },
          {
            day: 4,
            title: "Free day",
            details: "Choose a relaxed local day or an optional excursion.",
          },
          {
            day: 5,
            title: "Return home",
            details: "Breakfast and return journey.",
          },
        ],
        inclusions: [
          "Accommodation for 4 nights",
          "Breakfast",
          "Trip coordinator",
        ],
        exclusions: [
          "Transport from Ambala",
          "Adventure activity fees",
          "Personal expenses",
        ],
        categoryId: "Mountains",
      },
      {
        title: "Jaipur Royal Weekend",
        category: c.Heritage,
        destination: "Jaipur",
        state: "Rajasthan",
        durationDays: 3,
        durationNights: 2,
        price: 8999,
        compareAtPrice: 10999,
        summary:
          "Pink City landmarks, colourful bazaars and a taste of Rajasthan.",
        description:
          "A sample short break for travellers who want architecture, food and local colour.",
        images: [
          "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1200&q=85",
        ],
        itinerary: [
          {
            day: 1,
            title: "Arrive in Jaipur",
            details: "Check in and enjoy an easy evening.",
          },
          {
            day: 2,
            title: "Fort and old city",
            details: "Visit Amber Fort and explore the historic centre.",
          },
          {
            day: 3,
            title: "Local market and return",
            details: "Pick up souvenirs before your return.",
          },
        ],
        inclusions: [
          "Accommodation for 2 nights",
          "Breakfast",
          "Local trip coordination",
        ],
        exclusions: [
          "Travel to Jaipur",
          "Monument tickets",
          "Lunch and dinner",
        ],
        categoryId: "Heritage",
      },
      {
        title: "Goa Coast & Culture",
        category: c.Coastal,
        destination: "North Goa",
        state: "Goa",
        durationDays: 5,
        durationNights: 4,
        price: 18999,
        compareAtPrice: 21999,
        summary:
          "Beach time, Portuguese-era neighbourhoods and relaxed coastal evenings.",
        description:
          "A sample Goa break with room for beaches, heritage and local cafes.",
        images: [
          "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=85",
        ],
        itinerary: [
          {
            day: 1,
            title: "Arrive in Goa",
            details: "Check in and settle into the coast.",
          },
          {
            day: 2,
            title: "North Goa beaches",
            details: "Explore the shoreline at your own pace.",
          },
          {
            day: 3,
            title: "Old Goa",
            details: "Discover heritage churches and local history.",
          },
          {
            day: 4,
            title: "Free coastal day",
            details: "Choose a beach day or an optional activity.",
          },
          { day: 5, title: "Departure", details: "Breakfast and check out." },
        ],
        inclusions: [
          "Accommodation for 4 nights",
          "Breakfast",
          "Local host support",
        ],
        exclusions: [
          "Flights or train",
          "Water activities",
          "Personal expenses",
        ],
        categoryId: "Coastal",
      },
      {
        title: "Rishikesh Riverside Reset",
        category: c.Adventure,
        destination: "Rishikesh",
        state: "Uttarakhand",
        durationDays: 3,
        durationNights: 2,
        price: 7499,
        compareAtPrice: 8999,
        summary: "River views, foothill walks and a peaceful change of pace.",
        description:
          "A sample weekend close to the Himalayas, departing from Ambala.",
        images: [
          "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&q=85",
        ],
        itinerary: [
          {
            day: 1,
            title: "Arrive by the Ganga",
            details: "Check in and enjoy the riverfront.",
          },
          {
            day: 2,
            title: "Explore Rishikesh",
            details:
              "Visit local landmarks and choose an optional rafting experience.",
          },
          {
            day: 3,
            title: "Morning by the river",
            details: "Relax before the return drive.",
          },
        ],
        inclusions: [
          "Accommodation for 2 nights",
          "Breakfast",
          "Trip coordinator",
        ],
        exclusions: [
          "Transport",
          "Rafting or activity fees",
          "Personal expenses",
        ],
        categoryId: "Adventure",
      },
    ];
    for (const x of sample) {
      const { categoryId, ...data } = x;
      await Trip.create({
        ...data,
        category: c[categoryId],
        slug: slug(data.title),
        origin: "Ambala, Haryana",
        departureDates: [new Date("2027-01-15"), new Date("2027-02-12")],
        maxGroupSize: 20,
        seatsAvailable: 20,
        featured: true,
        active: true,
        rating: 4.8,
      });
    }
  }
}

// ---------- Vehicles and private family bookings ----------
const OID = mongoose.Schema.Types.ObjectId;
const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "car",
        "suv",
        "traveller_van",
        "tempo_traveller",
        "mini_bus",
        "bus",
        "other",
      ],
      default: "car",
    },
    seats: { type: Number, min: 1, required: true },
    registrationNo: String,
    driverName: String,
    driverPhone: String,
    pricePerDay: { type: Number, default: 0 },
    image: String,
    features: [String],
    status: {
      type: String,
      enum: ["available", "maintenance", "unavailable"],
      default: "available",
    },
    notes: String,
  },
  { timestamps: true },
);
const familyBookingSchema = new mongoose.Schema(
  {
    user: { type: OID, ref: "User", required: true },
    destination: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    members: { type: Number, min: 1, required: true },
    contactName: String,
    contactPhone: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    notes: String,
    requestedVehicle: { type: OID, ref: "Vehicle", default: null },
    vehicle: { type: OID, ref: "Vehicle", default: null },
    quotedAmount: { type: Number, default: 0 },
    adminNote: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);
const Vehicle = mongoose.model("Vehicle", vehicleSchema),
  FamilyBooking = mongoose.model("FamilyBooking", familyBookingSchema);
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const dayStart = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};
const parseRange = (a, b) => {
  const from = new Date(a),
    to = new Date(b);
  return isNaN(from) || isNaN(to) || to < from ? null : { from, to };
};
// A vehicle is blocked only by CONFIRMED family bookings that overlap the dates (pending requests do not block it).
async function fleetFor(from, to, members = 1, excludeId) {
  const q = {
    status: "confirmed",
    vehicle: { $ne: null },
    startDate: { $lte: to },
    endDate: { $gte: from },
  };
  if (excludeId) q._id = { $ne: excludeId };
  const [vs, busy] = await Promise.all([
    Vehicle.find().sort({ seats: 1 }),
    FamilyBooking.find(q).select("vehicle"),
  ]);
  const busySet = new Set(busy.map((b) => String(b.vehicle)));
  return vs.map((v) => {
    const o = v.toObject();
    o.reason =
      v.status !== "available"
        ? v.status
        : busySet.has(String(v._id))
          ? "booked"
          : v.seats < members
            ? "too_small"
            : "";
    o.available = !o.reason;
    return o;
  });
}
const publicVehicle = ({
  registrationNo,
  driverName,
  driverPhone,
  notes,
  ...v
}) => v;
const vehicleBody = (b) =>
  Object.fromEntries(
    Object.entries({
      name: b.name,
      type: b.type,
      seats: b.seats === undefined ? undefined : Number(b.seats),
      registrationNo: b.registrationNo,
      driverName: b.driverName,
      driverPhone: b.driverPhone,
      pricePerDay:
        b.pricePerDay === undefined ? undefined : Number(b.pricePerDay) || 0,
      image: b.image,
      features: Array.isArray(b.features)
        ? b.features
        : b.features === undefined
          ? undefined
          : String(b.features)
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
      status: b.status,
      notes: b.notes,
    }).filter(([, v]) => v !== undefined),
  );

app.get("/api/vehicles", async (req, res) => {
  try {
    const r = parseRange(req.query.from, req.query.to);
    if (!r)
      return res.json(
        (
          await Vehicle.find({ status: { $ne: "unavailable" } }).sort({
            seats: 1,
          })
        ).map((v) => publicVehicle(v.toObject())),
      );
    res.json(
      (await fleetFor(r.from, r.to, Number(req.query.members) || 1)).map(
        publicVehicle,
      ),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/admin/vehicles", auth, perm("vehicles"), async (req, res) => {
  try {
    const r = parseRange(req.query.from, req.query.to);
    const [vs, sched] = await Promise.all([
      r
        ? fleetFor(r.from, r.to)
        : Vehicle.find()
            .sort({ seats: 1 })
            .then((a) => a.map((v) => v.toObject())),
      FamilyBooking.find({
        status: { $in: ["pending", "confirmed"] },
        endDate: { $gte: dayStart(new Date()) },
        vehicle: { $ne: null },
      })
        .populate("user", "name")
        .sort({ startDate: 1 }),
    ]);
    res.json(
      vs.map((v) => ({
        ...v,
        schedule: sched
          .filter((b) => String(b.vehicle) === String(v._id))
          .map((b) => ({
            _id: b._id,
            from: b.startDate,
            to: b.endDate,
            status: b.status,
            family: b.user?.name || "Family",
            destination: b.destination,
          })),
      })),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.post("/api/admin/vehicles", auth, perm("vehicles"), async (req, res) => {
  try {
    res.status(201).json(await Vehicle.create(vehicleBody(req.body)));
  } catch (e) {
    sendError(res, e);
  }
});
app.patch(
  "/api/admin/vehicles/:id",
  auth,
  perm("vehicles"),
  async (req, res) => {
    try {
      const v = await Vehicle.findByIdAndUpdate(
        req.params.id,
        vehicleBody(req.body),
        { new: true, runValidators: true },
      );
      if (!v) throw fail("Vehicle not found.", 404);
      res.json(v);
    } catch (e) {
      sendError(res, e);
    }
  },
);
app.delete(
  "/api/admin/vehicles/:id",
  auth,
  perm("vehicles"),
  async (req, res) => {
    try {
      if (
        await FamilyBooking.exists({
          vehicle: req.params.id,
          status: { $in: ["pending", "confirmed"] },
          endDate: { $gte: dayStart(new Date()) },
        })
      )
        throw fail(
          "This vehicle has upcoming bookings. Reassign them first, or mark it as not available.",
          409,
        );
      await Vehicle.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      sendError(res, e);
    }
  },
);

app.post("/api/family-bookings", auth, async (req, res) => {
  try {
    const b = req.body,
      r = parseRange(b.startDate, b.endDate),
      members = Number(b.members);
    if (!r || r.from < dayStart(new Date()))
      throw fail("Choose valid travel dates, starting today or later.");
    if ((r.to - r.from) / 864e5 > 60)
      throw fail(
        "Trips longer than 60 days need a custom plan. Please contact us.",
      );
    if (
      !String(b.destination || "").trim() ||
      !String(b.contactPhone || "").trim() ||
      !String(b.pickupAddress || "").trim() ||
      !Number.isInteger(members) ||
      members < 1 ||
      members > 60
    )
      throw fail(
        "Destination, phone, pickup address and number of family members are required.",
      );
    let vehicle = null;
    if (b.vehicleId) {
      const v = (await fleetFor(r.from, r.to, members)).find(
        (x) => String(x._id) === String(b.vehicleId),
      );
      if (!v || !v.available)
        throw fail(
          "That vehicle is not available for these dates and group size. Please pick another.",
          409,
        );
      vehicle = v._id;
    }
    res.status(201).json(
      await FamilyBooking.create({
        user: req.user._id,
        destination: String(b.destination).trim(),
        startDate: r.from,
        endDate: r.to,
        members,
        contactName: String(b.contactName || req.user.name).trim(),
        contactPhone: String(b.contactPhone).trim(),
        pickupAddress: String(b.pickupAddress).trim(),
        notes: b.notes,
        requestedVehicle: vehicle,
        vehicle,
      }),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/family-bookings/mine", auth, async (req, res) => {
  try {
    res.json(
      await FamilyBooking.find({ user: req.user._id })
        .populate("vehicle", "name type seats")
        .sort({ createdAt: -1 }),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.patch("/api/family-bookings/:id/cancel", auth, async (req, res) => {
  try {
    const b = await FamilyBooking.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!b || !["pending", "confirmed"].includes(b.status))
      throw fail("This request cannot be cancelled.");
    b.status = "cancelled";
    await b.save();
    res.json(b);
  } catch (e) {
    sendError(res, e);
  }
});
app.get("/api/admin/family-bookings", auth, perm("family"), async (_, res) => {
  try {
    const rows = await FamilyBooking.find()
      .populate("user", "name email phone")
      .populate("requestedVehicle vehicle", "name type seats")
      .sort({ createdAt: -1 });
    res.json(
      await Promise.all(
        rows.map(async (r) => {
          const o = r.toObject();
          if (["pending", "confirmed"].includes(r.status)) {
            const fleet = await fleetFor(
              r.startDate,
              r.endDate,
              r.members,
              r._id,
            );
            o.availableVehicles = fleet
              .filter(
                (v) => v.available || String(v._id) === String(r.vehicle?._id),
              )
              .map((v) => ({
                _id: v._id,
                name: v.name,
                type: v.type,
                seats: v.seats,
              }));
            o.vehicleConflict =
              Boolean(r.vehicle) &&
              !fleet.find((v) => String(v._id) === String(r.vehicle._id))
                ?.available;
          }
          return o;
        }),
      ),
    );
  } catch (e) {
    sendError(res, e);
  }
});
app.patch(
  "/api/admin/family-bookings/:id",
  auth,
  perm("family"),
  async (req, res) => {
    try {
      const b = await FamilyBooking.findById(req.params.id);
      if (!b) throw fail("Request not found.", 404);
      const { status, vehicle, quotedAmount, adminNote } = req.body,
        nextStatus = status || b.status,
        nextVehicle = vehicle === undefined ? b.vehicle : vehicle || null;
      if (nextStatus === "confirmed") {
        if (!nextVehicle)
          throw fail("Assign a vehicle before confirming.", 409);
        const v = (
          await fleetFor(b.startDate, b.endDate, b.members, b._id)
        ).find((x) => String(x._id) === String(nextVehicle));
        if (!v || !v.available)
          throw fail(
            "That vehicle is not free on these dates. Choose another vehicle.",
            409,
          );
      }
      b.status = nextStatus;
      b.vehicle = nextVehicle;
      if (quotedAmount !== undefined)
        b.quotedAmount = Number(quotedAmount) || 0;
      if (adminNote !== undefined) b.adminNote = adminNote;
      await b.save();
      res.json(b);
    } catch (e) {
      sendError(res, e);
    }
  },
);
async function seedVehicles() {
  if (await Vehicle.countDocuments()) return;
  await Vehicle.insertMany([
    // sample fleet: replace with the client's real vehicles from Admin > Vehicles
    {
      name: "Swift Dzire",
      type: "car",
      seats: 4,
      pricePerDay: 3500,
      features: ["AC", "Luggage space"],
    },
    {
      name: "Toyota Innova Crysta",
      type: "suv",
      seats: 7,
      pricePerDay: 5500,
      features: ["AC", "Pushback seats"],
    },
    {
      name: "Tempo Traveller (12 seater)",
      type: "tempo_traveller",
      seats: 12,
      pricePerDay: 9000,
      features: ["AC", "Music system"],
    },
    {
      name: "Mini Bus (17 seater)",
      type: "mini_bus",
      seats: 17,
      pricePerDay: 12000,
      features: ["AC", "Luggage carrier"],
    },
    {
      name: "Luxury Bus (35 seater)",
      type: "bus",
      seats: 35,
      pricePerDay: 18000,
      features: ["AC", "Pushback seats", "Charging points"],
    },
  ]);
}

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment variables.");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully.");

    await seedExamples();
    await seedVehicles();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Yatra API listening on ${PORT}`);
    });
  } catch (error) {
    console.error("Could not start the Yatra API:", error.message);
    process.exit(1);
  }
}

startServer();
