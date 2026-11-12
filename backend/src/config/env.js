const required = ["MONGO_URI", "CLIENT_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

export function validateEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  if (process.env.NODE_ENV === "production") {
    for (const k of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
      const v = process.env[k];
      if (v.length < 32 || v.startsWith("replace_this")) throw new Error(`${k} must be a random string of at least 32 characters.`);
    }
  }
}

export const clientOrigins = () =>
  (process.env.CLIENT_URL || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

export const cookieSecure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";
