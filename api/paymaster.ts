import type { VercelRequest, VercelResponse } from "@vercel/node";

const PAYMASTER_URL = process.env.CDP_PAYMASTER_URL;
const MAX_BODY_BYTES = 32_768;
const METHOD_PREFIXES = ["pm_", "eth_"];

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getAllowedOrigins(): string[] {
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

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return process.env.PAYMASTER_ALLOW_NO_ORIGIN === "true";
  const normalized = origin.replace(/\/$/, "");
  return getAllowedOrigins().some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
}

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? "";
  const allowed = isOriginAllowed(origin);
  res.setHeader("Access-Control-Allow-Origin", allowed && origin ? origin : "null");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

function validatePaymasterBody(body: unknown): body is { jsonrpc: "2.0"; method: string } {
  if (!body || typeof body !== "object") return false;
  const record = body as Record<string, unknown>;
  if (record.jsonrpc !== "2.0") return false;
  if (typeof record.method !== "string") return false;
  return METHOD_PREFIXES.some((prefix) => record.method.startsWith(prefix));
}

function checkRateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
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

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

/** Proxies EIP-7677 paymaster requests to CDP — keeps the API key server-side. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(isOriginAllowed(req.headers.origin) ? 204 : 403).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isOriginAllowed(req.headers.origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (!PAYMASTER_URL) {
    return res.status(503).json({ error: "CDP_PAYMASTER_URL not configured" });
  }

  const bodySize = JSON.stringify(req.body ?? {}).length;
  if (bodySize > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Request body too large" });
  }

  if (!checkRateLimit(clientIp(req))) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  if (!validatePaymasterBody(req.body)) {
    return res.status(400).json({ error: "Invalid paymaster request" });
  }

  try {
    const response = await fetch(PAYMASTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    res.setHeader("Content-Type", response.headers.get("content-type") ?? "application/json");
    return res.status(response.status).send(text);
  } catch (error) {
    console.error("Paymaster proxy error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
