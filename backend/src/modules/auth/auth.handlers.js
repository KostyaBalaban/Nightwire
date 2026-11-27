import { ok, fail } from "../../helpers/response.js";
import { sendWelcomeEmail, sendVerificationEmail } from "../../mailer/mailer.js";
import {
  createAccount,
  verifyCredentials,
  issueSession,
  clearSession,
  safeUser,
  generateVerificationCode,
  verifyEmailCode,
} from "./auth.service.js";
import { uploadToVault } from "../../vault/vault.js";
import { User } from "./user.schema.js";

export async function signup(req, res) {
  try {
    const { fullName, email, password, publicKey } = req.body;

    if (!fullName || !email || !password) return fail(res, "All fields are required", 400);

    const user = await createAccount({ fullName, email, password, publicKey });
    issueSession(res, user._id);

    // Send verification code
    const code = await generateVerificationCode(user._id);
    sendVerificationEmail(user.email, user.fullName, code);
    sendWelcomeEmail(user.email, user.fullName);

    return ok(res, { user: safeUser(user) }, 201);
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function verifyEmail(req, res) {
  try {
    const { code } = req.body;
    if (!code) return fail(res, "Code is required", 400);

    const user = await verifyEmailCode(req.user._id, code);
    return ok(res, { user: safeUser(user) });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function resendVerification(req, res) {
  try {
    if (req.user.emailVerified) return fail(res, "Email already verified", 400);
    const code = await generateVerificationCode(req.user._id);
    sendVerificationEmail(req.user.email, req.user.fullName, code);
    return ok(res, { sent: true });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) return fail(res, "Email and password are required", 400);

    const user = await verifyCredentials({ email, password });
    issueSession(res, user._id);

    return ok(res, { user: safeUser(user) });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export function logout(req, res) {
  clearSession(res);
  return ok(res, { message: "Logged out" });
}

export function checkSession(req, res) {
  return ok(res, { user: safeUser(req.user) });
}

export async function updateProfile(req, res) {
  try {
    const { profilePic, bio, settings } = req.body;
    const updates = {};

    if (typeof bio !== "undefined") {
      if (bio.length > 150) return fail(res, "Bio must be under 150 characters", 400);
      updates.bio = bio;
    }

    if (settings && typeof settings === "object") {
      // Merge only provided settings fields (dot-notation for nested update)
      Object.entries(settings).forEach(([key, val]) => {
        updates[`settings.${key}`] = val;
      });
    }

    if (profilePic) {
      const uploaded = await uploadToVault(profilePic, {
        folder: "nightwire/avatars",
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      });
      updates.profilePic = uploaded.secure_url;
    }

    if (req.body.publicKey) {
      updates.publicKey = req.body.publicKey;
    }

    if (Object.keys(updates).length === 0) return fail(res, "No update fields provided", 400);

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    });

    return ok(res, { user: safeUser(updated) });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}
