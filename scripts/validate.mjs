#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dataPath = join(dirname(dirname(fileURLToPath(import.meta.url))), "data", "ships.json");
const data = JSON.parse(await readFile(dataPath, "utf8"));
const errors = [];
const ids = new Set();
const mmsis = new Set();
const counts = { ais: 0, official: 0, homeport: 0, live: 0, plotted: 0, unplotted: 0 };

if (!Array.isArray(data.ships) || data.ships.length === 0) {
  errors.push("ships array is missing");
}

const now = Date.parse(data.seededAt || data.lastCheckedAt || new Date().toISOString());

for (const ship of data.ships || []) {
  if (!ship.id || ids.has(ship.id)) errors.push(`bad or duplicate id ${ship.id}`);
  ids.add(ship.id);
  if (ship.mmsi) {
    if (mmsis.has(ship.mmsi)) errors.push(`duplicate MMSI ${ship.mmsi}`);
    mmsis.add(ship.mmsi);
  }
  for (const field of ["name", "pennant", "shipClass", "role"]) {
    if (!ship[field]) errors.push(`${ship.id || "?"} missing ${field}`);
  }
  const position = ship.position;
  if (!position || !["ais", "official", "homeport"].includes(position.kind)) {
    errors.push(`${ship.id} has no valid position kind`);
    continue;
  }
  counts[position.kind] += 1;
  const hasPoint = Number.isFinite(position.lat) && Number.isFinite(position.lon);
  if (hasPoint) counts.plotted += 1;
  else counts.unplotted += 1;
  if (hasPoint && (Math.abs(position.lat) > 90 || Math.abs(position.lon) > 180)) {
    errors.push(`${ship.id} coordinates out of range`);
  }
  if (!position.summary) errors.push(`${ship.id} has no summary`);
  if (!Array.isArray(position.sources) || position.sources.length === 0) {
    errors.push(`${ship.id} has no sources`);
  } else if (position.sources.some((source) => !source.title || !source.url)) {
    errors.push(`${ship.id} has an incomplete source`);
  }
  if (position.kind !== "homeport" && !position.timestamp) {
    errors.push(`${ship.id} ${position.kind} position has no timestamp`);
  }
  if (position.kind === "homeport" && position.timestamp) {
    errors.push(`${ship.id} home-port default should not carry a fix time`);
  }
  if (position.kind === "ais" && position.timestamp) {
    const age = now - Date.parse(position.timestamp);
    if (age >= 0 && age < 24 * 60 * 60 * 1000) counts.live += 1;
  }
}

const expected = new Set([
  "halifax", "vancouver", "ville-de-quebec", "toronto", "regina", "calgary",
  "montreal", "fredericton", "winnipeg", "charlottetown", "st-johns", "ottawa",
  "harry-dewolf", "margaret-brooke", "max-bernays", "william-hall",
  "frederick-rolette", "robert-hampton-gray", "nanaimo", "edmonton", "moncton",
  "victoria", "windsor", "corner-brook", "chicoutimi", "oriole", "asterix",
]);
for (const id of expected) {
  if (!ids.has(id)) errors.push(`missing roster id ${id}`);
}
for (const id of ["yellowknife", "protecteur", "preserver", "orca"]) {
  if (ids.has(id)) errors.push(`${id} should not be on the commissioned map`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ ships: data.ships.length, ...counts }, null, 2));
