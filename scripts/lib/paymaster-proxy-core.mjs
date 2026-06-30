/** Shared paymaster proxy security — used by Docker proxy and Vercel handler. */

const MAX_BODY_BYTES = 32_768;
const METHOD_PREFIXES = ["pm_", "eth_"];

const rateBuckets = new Map();

export function getAllowedOrigins() {
  const origins = (process.env.PAYMASTER_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const appUrl = process.env.VITE_APP_URL;
  if (appUrl) origins.push(appUrl.replace(/\/$/, ""));

  origins.push(
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
  );

  return [...new Set(origins)];
}

export function isOriginAllowed(origin) {
  if (!origin) return process.env.PAYMASTER_ALLOW_NO_ORIGIN === "true";
  const normalized = origin.replace(/\/$/, "");
  return getAllowedOrigins().some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
}

export function corsHeaders(origin) {
  const allowed = isOriginAllowed(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function validatePaymasterBody(body) {
  if (!body || typeof body !== "object") return false;
  if (body.jsonrpc !== "2.0") return false;
  if (typeof body.method !== "string") return false;
  return METHOD_PREFIXES.some((prefix) => body.method.startsWith(prefix));
}

export function checkRateLimit(key, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) ?? { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return bucket.count <= limit;
}

export function rateLimitKey(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}
