import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const schema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: { type: String, default: "user" },
});
const User = mongoose.model("User", schema);
if (
  !process.env.ADMIN_EMAIL ||
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 8
) {
  console.error(
    "Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters in server/.env.",
  );
  process.exit(1);
}
await mongoose.connect(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/yatra_sang_raghuvanshi",
);
await User.findOneAndUpdate(
  { email: process.env.ADMIN_EMAIL.toLowerCase() },
  {
    name: process.env.ADMIN_NAME || "Yatra Admin",
    email: process.env.ADMIN_EMAIL.toLowerCase(),
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    role: "admin",
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);
console.log(`Admin ready: ${process.env.ADMIN_EMAIL}`);
await mongoose.disconnect();
