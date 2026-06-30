import http from "node:http";
import {
  checkRateLimit,
  corsHeaders,
  isOriginAllowed,
  rateLimitKey,
  readBody,
  validatePaymasterBody,
} from "./lib/paymaster-proxy-core.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const CDP_URL = process.env.CDP_PAYMASTER_URL;

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    res.writeHead(isOriginAllowed(origin) ? 204 : 403, headers);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!isOriginAllowed(origin)) {
    res.writeHead(403, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Origin not allowed" }));
    return;
  }

  if (!CDP_URL) {
    res.writeHead(503, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "CDP_PAYMASTER_URL not configured" }));
    return;
  }

  const ip = rateLimitKey(req);
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Rate limit exceeded" }));
    return;
  }

  try {
    const raw = await readBody(req);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      res.writeHead(400, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    if (!validatePaymasterBody(body)) {
      res.writeHead(400, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid paymaster request" }));
      return;
    }

    const response = await fetch(CDP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });
    const text = await response.text();
    res.writeHead(response.status, {
      ...headers,
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    });
    res.end(text);
  } catch (error) {
    if (error instanceof Error && error.message === "body_too_large") {
      res.writeHead(413, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request body too large" }));
      return;
    }
    console.error("Paymaster proxy error:", error);
    res.writeHead(500, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const status = CDP_URL ? "ready" : "CDP_PAYMASTER_URL missing";
  console.log(`Paymaster proxy listening on :${PORT} (${status})`);
});
