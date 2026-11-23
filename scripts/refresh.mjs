#!/usr/bin/env node
/**
 * Refresh data/ships.json from open AIS feeds.
 *
 * Always safe to run without secrets. A missing AISSTREAM_API_KEY skips
 * that feed and leaves official, home-port, and previously stored positions
 * in place. A feed error is recorded and does not fail the process.
 *
 * A newer AIS fix replaces the stored position for the same MMSI. An older
 * fix never overwrites a newer one. Coordinates of 0,0 and out-of-range
 * values are ignored.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, "data", "ships.json");
const LISTEN_MS = 45_000;

const PROVIDERS = {
  digitraffic: {
    name: "Fintraffic Digitraffic",
    url: "https://www.digitraffic.fi/en/marine-traffic/",
    publisher: "Fintraffic",
    licence: "CC BY 4.0",
  },
  kystverket: {
    name: "Norwegian Coastal Administration AIS",
    url: "https://www.kystverket.no/en/sea-transport-and-ports/ais/access-to-ais-data/",
    publisher: "Kystverket",
    licence: "NLOD",
  },
  aisstream: {
    name: "AISStream",
    url: "https://aisstream.io/",
    publisher: "AISStream",
    licence: "Provider account; no separate data licence is published",
  },
};

function validCoord(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

function epochToIso(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" && value.includes("T")) {
    const parsed = Date.parse(value.endsWith("Z") ? value : `${value}Z`);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  const date = new Date(ms);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function applyAis(ship, fix) {
  if (!validCoord(fix.lat, fix.lon) || !fix.timestamp) return false;
  const next = Date.parse(fix.timestamp);
  const prev = Date.parse(ship.position?.timestamp || "");
  if (!Number.isFinite(next)) return false;
  if (Number.isFinite(prev) && next <= prev) return false;

  const provider = PROVIDERS[fix.provider];
  const speed =
    fix.sog == null || Number.isNaN(Number(fix.sog))
      ? "not reported"
      : `${Number(fix.sog)} kn`;
  const course =
    fix.cog == null || Number.isNaN(Number(fix.cog))
      ? "not reported"
      : `${Number(fix.cog)}°`;
  const previous = ship.position || {};
  const background =
    previous.background ||
    (previous.kind && previous.kind !== "ais" ? previous.summary : null);

  ship.position = {
    kind: "ais",
    accuracy: "gps",
    lat: round6(fix.lat),
    lon: round6(fix.lon),
    place: "AIS position",
    timestamp: new Date(next).toISOString(),
    summary: `Automatic Identification System fix from ${provider.name} for MMSI ${ship.mmsi}. Speed ${speed}, course ${course}. This is a radio broadcast, not a government sighting.`,
    background,
    sources: [
      {
        title: provider.name,
        url: provider.url,
        publisher: `${provider.publisher} (${provider.licence})`,
      },
    ],
  };
  return true;
}

async function fromDigitraffic(byMmsi) {
  const response = await fetch("https://meri.digitraffic.fi/api/ais/v1/locations", {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; rcn-ship-map/1.0; +https://github.com/gkayling/rcn-ship-map)",
      "Digitraffic-User": "rcn-ship-map/1.0",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  const features = Array.isArray(body.features) ? body.features : [];
  let matches = 0;
  for (const feature of features) {
    const mmsi = String(feature.mmsi ?? feature.properties?.mmsi ?? "");
    const ship = byMmsi.get(mmsi);
    if (!ship) continue;
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lon, lat] = coords;
    const props = feature.properties || {};
    const timestamp = epochToIso(props.timestampExternal ?? props.timestamp);
    if (
      applyAis(ship, {
        lat,
        lon,
        timestamp,
        sog: props.sog,
        cog: props.cog,
        provider: "digitraffic",
      })
    ) {
      matches += 1;
    }
  }
  return { id: "digitraffic", ok: true, skipped: false, heard: features.length, matches };
}

async function fromKystverket(byMmsi) {
  const response = await fetch(
    "https://kystdatahuset.kystverket.no/ws/api/ais/realtime/geojson",
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "rcn-ship-map/1.0 (+https://github.com/gkayling/rcn-ship-map)",
      },
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  const features = Array.isArray(body.features) ? body.features : [];
  let matches = 0;
  for (const feature of features) {
    const props = feature.properties || {};
    const mmsi = String(props.mmsi ?? "");
    const ship = byMmsi.get(mmsi);
    if (!ship) continue;
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) continue;
    const last = Array.isArray(coords[0]) ? coords[coords.length - 1] : coords;
    if (!Array.isArray(last) || last.length < 2) continue;
    const [lon, lat] = last;
    if (
      applyAis(ship, {
        lat,
        lon,
        timestamp: epochToIso(props.date_time_utc),
        sog: props.speed,
        cog: props.cog,
        provider: "kystverket",
      })
    ) {
      matches += 1;
    }
  }
  return { id: "kystverket", ok: true, skipped: false, heard: features.length, matches };
}

function aisstreamFix(message) {
  const meta = message.MetaData || {};
  const report = message.Message?.PositionReport || message.Message?.StandardClassBPositionReport || {};
  const mmsi = String(meta.MMSI || report.UserID || "");
  const lat = Number(report.Latitude ?? meta.latitude);
  const lon = Number(report.Longitude ?? meta.longitude);
  return {
    mmsi,
    lat,
    lon,
    timestamp: epochToIso(meta.time_utc),
    sog: report.Sog,
    cog: report.Cog,
  };
}

async function fromAisstream(byMmsi) {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) {
    return {
      id: "aisstream",
      ok: true,
      skipped: true,
      reason: "AISSTREAM_API_KEY is not set",
      heard: 0,
      matches: 0,
    };
  }
  if (typeof WebSocket !== "function") {
    return {
      id: "aisstream",
      ok: false,
      skipped: false,
      error: "This Node runtime has no WebSocket client",
      heard: 0,
      matches: 0,
    };
  }

  const mmsis = [...byMmsi.keys()];
  const hits = new Map();
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    const timer = setTimeout(() => {
      ws.close();
      finish(resolve);
    }, LISTEN_MS);
    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          APIKey: key,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FiltersShipMMSI: mmsis,
          FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport"],
        }),
      );
    });
    ws.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.error) {
        finish(reject, new Error("AISStream rejected the subscription"));
        ws.close();
        return;
      }
      const fix = aisstreamFix(message);
      if (!fix.mmsi || !byMmsi.has(fix.mmsi) || !validCoord(fix.lat, fix.lon)) return;
      const previous = hits.get(fix.mmsi);
      if (!previous || Date.parse(fix.timestamp) >= Date.parse(previous.timestamp)) {
        hits.set(fix.mmsi, fix);
      }
    });
    ws.addEventListener("error", () => {
      finish(reject, new Error("AISStream connection failed"));
    });
    ws.addEventListener("close", () => finish(resolve));
  });

  let matches = 0;
  for (const fix of hits.values()) {
    const ship = byMmsi.get(fix.mmsi);
    if (applyAis(ship, { ...fix, provider: "aisstream" })) matches += 1;
  }
  return { id: "aisstream", ok: true, skipped: false, heard: hits.size, matches };
}

async function runFeed(name, fn) {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feed failed";
    console.error(`${name} failed: ${message}`);
    return { id: name, ok: false, skipped: false, error: message, heard: 0, matches: 0 };
  }
}

const data = JSON.parse(await readFile(dataPath, "utf8"));
if (!Array.isArray(data.ships)) {
  console.error("data/ships.json has no ships array");
  process.exit(1);
}

const byMmsi = new Map(
  data.ships.filter((ship) => ship.mmsi).map((ship) => [String(ship.mmsi), ship]),
);

const feeds = [];
feeds.push(await runFeed("digitraffic", () => fromDigitraffic(byMmsi)));
feeds.push(await runFeed("kystverket", () => fromKystverket(byMmsi)));
feeds.push(await runFeed("aisstream", () => fromAisstream(byMmsi)));

data.lastCheckedAt = new Date().toISOString();
data.feeds = feeds;
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);

const updated = feeds.reduce((sum, feed) => sum + (feed.matches || 0), 0);
console.log(
  JSON.stringify(
    { lastCheckedAt: data.lastCheckedAt, updated, feeds },
    null,
    2,
  ),
);
