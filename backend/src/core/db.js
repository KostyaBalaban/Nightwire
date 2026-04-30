import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("[DB] MONGO_URI is not set in .env");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DB] Connected → ${conn.connection.host}`);
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1);
  }
}
