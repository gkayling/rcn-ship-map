const LIVE_MS = 24 * 60 * 60 * 1000;

function dataUrl() {
  let path = window.location.pathname;
  if (!path.endsWith("/")) {
    path = path.endsWith(".html") ? path.replace(/[^/]*$/, "") : `${path}/`;
  }
  return `${path}data/ships.json`;
}

const map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView([54, -90], 3);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const markers = L.layerGroup().addTo(map);
const state = {
  ships: [],
  seededAt: null,
  lastCheckedAt: null,
  filter: "all",
  sort: "freshness",
  query: "",
  selected: null,
  now: Date.now(),
};

const listEl = document.querySelector("#list");
const countsEl = document.querySelector("#counts");
const checkedEl = document.querySelector("#checked");
const searchEl = document.querySelector("#search");
const sortEl = document.querySelector("#sort");
const panelEl = document.querySelector("#panel");
const sheetButton = document.querySelector("#sheet-toggle");

function category(ship) {
  const position = ship.position;
  if (position.kind === "homeport") return "homeport";
  if (position.kind === "official") return "stale";
  const age = state.now - Date.parse(position.timestamp || "");
  if (position.kind === "ais" && Number.isFinite(age) && age >= 0 && age < LIVE_MS) return "live";
  return "stale";
}

function plotted(ship) {
  return Number.isFinite(ship.position.lat) && Number.isFinite(ship.position.lon);
}

function ageLabel(timestamp) {
  if (!timestamp) return "No dated fix";
  const ms = state.now - Date.parse(timestamp);
  if (!Number.isFinite(ms)) return "Time unknown";
  if (ms < 0) return "Timestamp is in the future";
  const minutes = Math.round(ms / 60000);
  if (minutes < 90) return `${minutes} min old`;
  const hours = Math.round(ms / 3600000);
  if (hours < 48) return `${hours} hr old`;
  return `${Math.round(ms / 86400000)} days old`;
}

function formatTime(timestamp) {
  if (!timestamp) return "Not a dated fix";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: timestamp.endsWith("T00:00:00Z") ? undefined : "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

function badge(ship) {
  const kind = category(ship);
  const labels = {
    live: plotted(ship) ? "Live AIS" : "Live AIS, not plotted",
    stale: ship.position.kind === "official" ? "Official report" : "Stale AIS",
    homeport: "Home port",
  };
  return `<span class="badge ${kind}">${labels[kind]}</span>`;
}

function sourceLinks(sources) {
  return (sources || [])
    .map(
      (source) =>
        `<li><a href="${escapeAttr(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a> <span class="meta">(${escapeHtml(source.publisher || "source")})</span></li>`,
    )
    .join("");
}

function popupHtml(ship, display) {
  const position = ship.position;
  const offsetNote = display.offset
    ? "<p>The pin is nudged slightly so ships at the same harbour can be tapped. The coordinates in this card are the reported ones.</p>"
    : "";
  const unplotted = plotted(ship)
    ? ""
    : "<p>No coordinates were published, so this ship is not pinned on the map.</p>";
  return `
    <h2>${escapeHtml(ship.name)}</h2>
    <p>${escapeHtml(ship.shipClass)} · ${escapeHtml(ship.pennant)} · ${escapeHtml(ship.role)}</p>
    ${badge(ship)}
    <p><strong>${escapeHtml(position.place || "Place not stated")}</strong><br>
    ${escapeHtml(formatTime(position.timestamp))} · ${escapeHtml(ageLabel(position.timestamp))}</p>
    <p>${escapeHtml(position.summary)}</p>
    ${position.background ? `<p>${escapeHtml(position.background)}</p>` : ""}
    ${offsetNote}
    ${unplotted}
    <ul>${sourceLinks(position.sources)}</ul>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function visibleShips() {
  const query = state.query.trim().toLowerCase();
  let ships = state.ships.filter((ship) => {
    if (state.filter === "all") return true;
    if (state.filter === "unplotted") return !plotted(ship);
    return category(ship) === state.filter;
  });
  if (query) {
    ships = ships.filter((ship) => {
      const haystack = [
        ship.name,
        ship.pennant,
        ship.shipClass,
        ship.position.place,
        ship.homePort?.name,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }
  ships.sort((a, b) => {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    const at = Date.parse(a.position.timestamp || "");
    const bt = Date.parse(b.position.timestamp || "");
    const aTime = Number.isFinite(at) ? at : -Infinity;
    const bTime = Number.isFinite(bt) ? bt : -Infinity;
    return bTime - aTime || a.name.localeCompare(b.name);
  });
  return ships;
}

function renderList() {
  const ships = visibleShips();
  const totals = { live: 0, aisStale: 0, official: 0, homeport: 0, unplotted: 0 };
  for (const ship of state.ships) {
    if (ship.position.kind === "official") totals.official += 1;
    else if (ship.position.kind === "homeport") totals.homeport += 1;
    else if (category(ship) === "live") totals.live += 1;
    else totals.aisStale += 1;
    if (!plotted(ship)) totals.unplotted += 1;
  }
  countsEl.textContent = `${state.ships.length} ships · ${totals.live} live AIS · ${totals.aisStale} older AIS · ${totals.official} official reports · ${totals.homeport} home port · ${totals.unplotted} not plotted`;
  listEl.innerHTML = ships
    .map((ship) => {
      const current = ship.id === state.selected ? 'aria-current="true"' : "";
      const detail = ship.id === state.selected ? detailHtml(ship) : "";
      return `<button class="ship" type="button" data-id="${escapeAttr(ship.id)}" ${current}>
        <span class="ship-name"><strong>${escapeHtml(ship.name)}</strong>${badge(ship)}</span>
        <span class="meta">${escapeHtml(ship.pennant)} · ${escapeHtml(ship.shipClass)}${ship.auxiliary ? " · not commissioned" : ""}</span>
        <span class="place">${escapeHtml(ship.position.place || "Coordinates not published")} · ${escapeHtml(ageLabel(ship.position.timestamp))}</span>
      </button>${detail}`;
    })
    .join("");
  if (!ships.length) {
    listEl.innerHTML = `<p class="fine">No ships match this filter.</p>`;
  }
}

function displayPoints(ships) {
  const groups = new Map();
  for (const ship of ships) {
    if (!plotted(ship)) continue;
    const key = `${ship.position.lat.toFixed(3)},${ship.position.lon.toFixed(3)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ship);
  }
  const points = [];
  for (const group of groups.values()) {
    group.forEach((ship, index) => {
      const angle = (index / group.length) * Math.PI * 2;
      const radius = group.length === 1 ? 0 : 0.0035;
      points.push({
        ship,
        lat: ship.position.lat + Math.sin(angle) * radius,
        lon: ship.position.lon + Math.cos(angle) * radius,
        offset: group.length > 1,
      });
    });
  }
  return points;
}

function renderMarkers() {
  markers.clearLayers();
  const points = displayPoints(state.ships);
  const bounds = [];
  for (const point of points) {
    const kind = category(point.ship);
    const icon = L.divIcon({
      className: "ship-pin",
      html: `<span class="pin ${kind}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10],
    });
    const marker = L.marker([point.lat, point.lon], {
      icon,
      title: point.ship.name,
      zIndexOffset: kind === "live" ? 400 : kind === "stale" ? 200 : 0,
    });
    marker.bindPopup(popupHtml(point.ship, point), { maxWidth: 320 });
    marker.on("click", () => {
      state.selected = point.ship.id;
      renderList();
    });
    marker.shipId = point.ship.id;
    markers.addLayer(marker);
    bounds.push([point.lat, point.lon]);
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 4 });
  return points;
}

function detailHtml(ship) {
  const position = ship.position;
  return `<div class="detail">
    <p>${escapeHtml(position.summary)}</p>
    ${position.background ? `<p>${escapeHtml(position.background)}</p>` : ""}
    ${plotted(ship) ? "" : "<p>No coordinates were published, so this ship is listed here and not pinned.</p>"}
    <ul>${sourceLinks(position.sources)}</ul>
  </div>`;
}

function selectShip(id) {
  state.selected = id;
  renderList();
  const ship = state.ships.find((item) => item.id === id);
  if (!ship) return;
  if (!plotted(ship)) {
    panelEl.classList.add("open");
    sheetButton.setAttribute("aria-expanded", "true");
    return;
  }
  let found = null;
  markers.eachLayer((layer) => {
    if (layer.shipId === id) found = layer;
  });
  if (!found) return;
  map.flyTo(found.getLatLng(), Math.max(map.getZoom(), 8), { duration: 0.6 });
  found.openPopup();
}

function renderChecked() {
  const checked = state.lastCheckedAt
    ? `Last data refresh ${formatTime(state.lastCheckedAt)}`
    : "Automatic refresh has not run yet";
  const seeded = state.seededAt ? `Seeded ${formatTime(state.seededAt)}` : "";
  checkedEl.innerHTML = `<strong>${escapeHtml(checked)}</strong>${escapeHtml(seeded)}`;
}

async function load() {
  const response = await fetch(dataUrl());
  if (!response.ok) throw new Error(`Could not load ship data (${response.status})`);
  const data = await response.json();
  state.ships = data.ships;
  state.seededAt = data.seededAt;
  state.lastCheckedAt = data.lastCheckedAt;
  state.now = Date.now();
  renderChecked();
  map.invalidateSize();
  renderMarkers();
  renderList();
}

listEl.addEventListener("click", (event) => {
  const button = event.target.closest(".ship");
  if (!button) return;
  selectShip(button.dataset.id);
  const ship = state.ships.find((item) => item.id === button.dataset.id);
  if (window.matchMedia("(max-width: 860px)").matches && ship && plotted(ship)) {
    panelEl.classList.remove("open");
  }
});

document.querySelector(".filters").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  state.filter = button.dataset.filter;
  for (const item of document.querySelectorAll(".filters button")) {
    item.setAttribute("aria-pressed", String(item === button));
  }
  renderList();
});

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  renderList();
});

sortEl.addEventListener("change", () => {
  state.sort = sortEl.value;
  renderList();
});

sheetButton.addEventListener("click", () => {
  panelEl.classList.toggle("open");
  sheetButton.setAttribute("aria-expanded", String(panelEl.classList.contains("open")));
});

window.addEventListener("resize", () => map.invalidateSize());

load().catch((error) => {
  document.querySelector("#map").insertAdjacentHTML(
    "beforeend",
    `<p class="error">${escapeHtml(error.message)}. The map could not read data/ships.json.</p>`,
  );
});
