import arcjet, { tokenBucket } from "@arcjet/node";
import { fail } from "../helpers/response.js";

let aj;

if (process.env.ARCJET_KEY) {
  aj = arcjet({
    key: process.env.ARCJET_KEY,
    characteristics: ["ip.src"],
    rules: [
      tokenBucket({
        mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN",
        refillRate: 20,
        interval: 10,
        capacity: 50,
      }),
    ],
  });
}

export async function rateLimitGuard(req, res, next) {
  if (!aj) return next();
  try {
    const decision = await aj.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      return fail(res, "Too many requests — please slow down.", 429);
    }
    next();
  } catch {
    next();
  }
}
