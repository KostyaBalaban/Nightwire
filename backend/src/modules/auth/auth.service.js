import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "./user.schema.js";

const COOKIE_NAME = "nightwire_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function attachCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function createAccount({ fullName, email, password, publicKey }) {
  const exists = await User.findOne({ email });
  if (exists) throw { status: 409, message: "Email already in use" };

  if (password.length < 6) throw { status: 400, message: "Password must be at least 6 characters" };

  const hashed = await bcrypt.hash(password, 12);

  // First registered user becomes superAdmin
  const userCount = await User.countDocuments();
  const isAdmin = userCount === 0;

  const user = await User.create({
    fullName,
    email,
    password: hashed,
    publicKey: publicKey || "",
    isAdmin,
  });

  return user;
}

export async function generateVerificationCode(userId) {
  const code = randomInt(100_000, 1_000_000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);
  await User.findByIdAndUpdate(userId, {
    emailVerificationCode: code,
    emailVerificationExpiry: expiry,
  });
  return code;
}

export async function verifyEmailCode(userId, code) {
  const user = await User.findById(userId).select(
    "+emailVerificationCode +emailVerificationExpiry",
  );
  if (!user) throw { status: 404, message: "User not found" };
  if (user.emailVerified) throw { status: 400, message: "Email already verified" };

  if (!user.emailVerificationCode || user.emailVerificationCode !== code)
    throw { status: 400, message: "Invalid verification code" };

  if (user.emailVerificationExpiry < new Date())
    throw { status: 400, message: "Code expired — request a new one" };

  user.emailVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();
  return user;
}

export async function verifyCredentials({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw { status: 401, message: "Invalid email or password" };

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw { status: 401, message: "Invalid email or password" };

  return user;
}

export function issueSession(res, userId) {
  const token = signToken(userId);
  attachCookie(res, token);
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME);
}

export function safeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
}
