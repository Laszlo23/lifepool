/**
 * Fetches daily OHLCV from Binance and writes to data/prices/{symbol}.json
 * Run: npm run fetch-data
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../data/prices");

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "XRPUSDT",
  "SOLUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "ARBUSDT",
  "OPUSDT",
  "SUIUSDT",
  "INJUSDT",
] as const;

const START_MS = Date.UTC(2022, 0, 1);
const END_MS = Date.now();
const INTERVAL = "1d";

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchKlines(symbol: string): Promise<Candle[]> {
  const candles: Candle[] = [];
  let start = START_MS;

  while (start < END_MS) {
    const url =
      `https://api.binance.com/api/v3/klines?symbol=${symbol}` +
      `&interval=${INTERVAL}&startTime=${start}&limit=1000`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance ${symbol}: ${res.status}`);

    const raw: unknown[][] = await res.json();
    if (raw.length === 0) break;

    for (const k of raw) {
      candles.push({
        date: new Date(k[0] as number).toISOString().slice(0, 10),
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
      });
    }

    const lastOpen = raw[raw.length - 1]![0] as number;
    start = lastOpen + 86_400_000;
    await sleep(120);
  }

  const deduped = new Map<string, Candle>();
  for (const c of candles) deduped.set(c.date, c);
  return [...deduped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const manifest: Record<string, { from: string; to: string; count: number }> = {};

  for (const symbol of SYMBOLS) {
    process.stdout.write(`Fetching ${symbol}... `);
    const candles = await fetchKlines(symbol);
    const file = join(OUT_DIR, `${symbol}.json`);
    writeFileSync(file, JSON.stringify(candles, null, 0));
    manifest[symbol] = {
      from: candles[0]?.date ?? "",
      to: candles[candles.length - 1]?.date ?? "",
      count: candles.length,
    };
    console.log(`${candles.length} candles (${manifest[symbol].from} → ${manifest[symbol].to})`);
  }

  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  const publicDir = join(__dirname, "../public/data/prices");
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  for (const symbol of SYMBOLS) {
    const src = join(OUT_DIR, `${symbol}.json`);
    const dest = join(publicDir, `${symbol}.json`);
    writeFileSync(dest, readFileSync(src));
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
