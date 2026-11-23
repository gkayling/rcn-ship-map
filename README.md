# RCN Ship Map

Last known positions for commissioned [Royal Canadian Navy](https://www.canada.ca/en/navy.html) ships, plus the leased replenishment ship MV Asterix. Every pin or list entry names the place, the time, and a source. The site is a static GitHub Pages app. A scheduled workflow refreshes AIS where a free, attributable feed can hear the ship.

Live site: <https://gkayling.github.io/rcn-ship-map/>

The map is not for navigation. Warships often turn AIS off, and a broadcast can be wrong, delayed, or carry junk in the static fields.

## Publish

GitHub publishes this site from `main` with [`.github/workflows/pages.yml`](.github/workflows/pages.yml). The first deploy can run only after Pages is turned on once, which needs repository administration:

1. Open [Settings → Pages](https://github.com/gkayling/rcn-ship-map/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Re-run [Deploy GitHub Pages](https://github.com/gkayling/rcn-ship-map/actions/workflows/pages.yml).

After that, every push to `main` updates the site. The six-hour refresh commits new positions and starts that same workflow.

## What is on the map

Twenty-six commissioned ships and one support ship, checked against National Defence and navy pages in November 2026:

| Class | Ships included |
| --- | --- |
| Halifax frigates | All 12: Halifax, Vancouver, Ville de Québec, Toronto, Regina, Calgary, Montréal, Fredericton, Winnipeg, Charlottetown, St. John's, Ottawa |
| Harry DeWolf Arctic and offshore patrol vessels | All 6, including Robert Hampton Gray, commissioned at Esquimalt on 16 November 2026 |
| Kingston coastal defence vessels | The three still in service: Nanaimo, Edmonton, Moncton |
| Victoria submarines | All 4: Victoria, Windsor, Corner Brook, Chicoutimi |
| Sail training | HMCS Oriole, commissioned and based at Halifax |
| Support | MV Asterix, the leased naval replenishment unit. She is not an HMC Ship |

Left off on purpose:

- **HMCS Yellowknife** is not plotted. National Defence said in July 2025 that she was set to be paid off in 2026. The 15 June 2026 Trident reported that her last commanding officer ended his tenure on 29 May 2026, that she was no longer in active service, and that the crew had moved to Nanaimo. The [Kingston-class page](https://www.canada.ca/en/navy/corporate/fleet-units/surface/kingston-class.html) had not yet added a paid-off date beside her name when this roster was built.
- **Eight other Kingston-class ships** were paid off in fall 2025. The class page lists those dates.
- **Orca-class training craft** are not commissioned and do not use the HMCS prefix.
- **HMCS Protecteur and HMCS Preserver** are not commissioned. [Public Services and Procurement Canada](https://www.canada.ca/en/public-services-procurement/services/acquisitions/defence-marine/national-shipbuilding-strategy/projects/large-vessels/joint-support-ships.html) says the first joint support ship is still being fitted out, with delivery planned for 2027. Sea trials were expected in fall 2026. Until a ship is delivered and commissioned, it is not on this map.

Home ports used when nothing else is known are HMC Dockyard Halifax for the Atlantic Fleet and CFB Esquimalt for the Pacific Fleet. Those coordinates come from OpenStreetMap and are labelled as a home-port default.

## How a position is chosen

1. A newer AIS fix from the refresh job, matched only by a MMSI that the dataset already ties to that ship.
2. Otherwise the newest sourced report already in `data/ships.json`.
3. If no report places the ship, the assigned home port, labelled as a default.

The page never drops a pin in the middle of an operating area just because a story says "around Japan" or "European waters". If a source names a port or prints coordinates, that is what is used. If it does not, the ship stays in the list with no pin. MV Asterix is the current example: on 23 November 2026 VesselFinder said she was moored in Busan and that an AIS update had arrived about a minute earlier, but the page did not print latitude and longitude.

An AIS fix under 24 hours old is drawn in green. Older AIS fixes and government or shipyard reports are amber. Home-port defaults are slate. The list can be sorted by name or by the age of the report, and it shows when `data/ships.json` was last checked.

### Seed positions, read on 23 November 2026

These are the positions shipped with the site. The refresh job replaces one only when a feed returns a newer fix for that MMSI.

| Ship | Kind | Place and time | Why this source |
| --- | --- | --- | --- |
| Halifax | Home port | HMC Dockyard Halifax | Docking work period at Irving was expected to finish in summer 2026. No completion notice. A 2022 AIS fix was not reused. |
| Vancouver | AIS, stale | Underway near Esquimalt, 14 Dec 2025 | CDN WARSHIP 331 on MMSI 316160000. Nothing later. |
| Ville de Québec | AIS, stale | Brest, 19 Nov 2026 17:42 UTC | NATO WARSHIP 332. She sailed on 15 July 2026 for SNMG1 until December. Viðey, Iceland, on 20 Aug 2026 is an older report from the same deployment. |
| Toronto | Home port | HMC Dockyard Halifax | Davie docking period was expected to finish in spring 2026. No completion notice. A 2022 AIS fix was not reused. |
| Regina | AIS, stale | Yokosuka, 18 Nov 2026 22:51 UTC | CDN WARSHIP 334 on the MMSI published for Regina. The November Crowsnest places her on KEEN SWORD 27 around Japan, 19–29 Oct, still on Operation HORIZON. The static call sign on that broadcast was not the ship's published call sign. |
| Calgary | AIS, stale | Esquimalt, 28 Aug 2026 | CDN WARSHIP 335, after the 2025 Victoria Shipyards docking period. |
| Montréal | AIS, stale | Chantier Davie, 25 Oct 2025 | CDN WARSHIP 336. Later than the 5 June 2025 return from Operation REASSURANCE. |
| Fredericton | AIS, stale | Halifax, 19 Jul 2024 | CDN WARSHIP 337. No later public fix was found. |
| Winnipeg | Official report | Victoria Shipyards | PSPC still lists her docking period, expected to finish in winter 2026. No trustworthy MMSI: 316147000 was broadcasting as pennant 341. |
| Charlottetown | AIS, stale | Halifax, 18 Nov 2026 14:55 UTC | CDN WARSHIP 339. She had returned from HORIZON and NEON on 17 Aug 2026. |
| St. John's | AIS, stale | Halifax, 2 Nov 2026 18:40 UTC | CDN WARSHIP 340, after Stavanger, Bergen, Aberdeen, Belfast and Leith. The December 2025 REASSURANCE return is older. |
| Ottawa | AIS, stale | Esquimalt, 9 Oct 2026 18:32 UTC | CDNWARSHIP341, the same day National Defence reported the return from HORIZON and LATITUDE. |
| Harry DeWolf | AIS, stale | Halifax, 10 Nov 2026 19:44 UTC | CDN WARSHIP 430, call sign CGBT, IMO 4702503. |
| Margaret Brooke | AIS, stale | Underway off Nova Scotia, 4 Oct 2026 19:43 UTC | Last printed coordinates for CDN WARSHIP 431. The same page lists a Chantier Davie arrival on 9 Oct without coordinates, so that arrival is not pinned. |
| Max Bernays | AIS, stale | Seattle, 20 Nov 2026 18:30 UTC | MMSI 316014550, IMO 4702527, named Max Bernays on the tracker. Arrived from Vancouver. |
| William Hall | AIS, stale | Nassau, 20 Nov 2026 00:52 UTC | CDN WARSHIP 433, IMO 4702539. Halifax, Santo Domingo and Basseterre are earlier calls on that page. No operation name is attached without a defence release. |
| Frédérick Rolette | AIS, stale | Fort-de-France, 21 Nov 2026 14:23 UTC | CDN WARSHIP 434, IMO 4702541. St. John's and Halifax are earlier calls. February ice trials in the Northumberland Strait are older. |
| Robert Hampton Gray | AIS, stale | Esquimalt, 17 Nov 2026 22:22 UTC | CDN WARSHIP 435. Arrived from the Arctic on 6 Nov, commissioned 16 Nov, and this fix is the move from Victoria back to Esquimalt the next evening. |
| Nanaimo | AIS, stale | Halifax, 13 Nov 2026 13:20 UTC | CDN WARSHIP 702, after St. John's. |
| Edmonton | AIS, stale | Halifax, 5 Nov 2026 14:30 UTC | CDN WARSHIP 703, the same afternoon as the National Defence return release. The Crowsnest dated that return 30 Oct. |
| Moncton | AIS, stale | Halifax, 5 Nov 2026 14:04 UTC | NATO WARSHIP 708, same return as Edmonton. |
| Victoria | Official report | Esquimalt Graving Dock | Extended docking work period since May 2023, completion expected in 2027. |
| Windsor | Official report | Fleet Maintenance Facility Cape Scott, Halifax | Babcock described that work period in September 2025. A 3 Nov 2026 report said the maintenance was still underway. |
| Corner Brook | Home port | CFB Esquimalt | She took part in RIMPAC 2026 off Hawaii. No position after the exercise, so she is not left on a Hawaii pin. |
| Chicoutimi | Home port | CFB Esquimalt | Still on the Victoria-class page and assigned to the Pacific Fleet. No pier position was published. A November 2026 report said she had been off front-line duty for five years. |
| Oriole | AIS, stale | Lunenburg area, 20 Oct 2025 | The tracker names HMCS ORIOLE. The coordinates are on the south shore of Nova Scotia. |
| MV Asterix | Live AIS, not plotted | Busan, status read 23 Nov 2026 01:15 UTC | VesselFinder said she was moored there, arrived 10 Nov, and that AIS had updated about a minute before the page was read. No coordinates were printed. |

Counts in that seed: **20 AIS reports** (1 of them live and not plotted, 19 stale and plotted), **3 official-report pins**, **4 home-port defaults**. Twenty-six ships are pinned.

## Data the site will refresh on its own

`scripts/refresh.mjs` runs from [`.github/workflows/refresh-positions.yml`](.github/workflows/refresh-positions.yml) every six hours, and it can be started by hand with "Run workflow". It writes `data/ships.json` and commits only when the file changes. A commit made by the Actions token does not start other workflows, so the refresh job then starts the Pages workflow itself.

Two feeds need no key:

- **[Fintraffic Digitraffic](https://www.digitraffic.fi/en/marine-traffic/) marine AIS** (`https://meri.digitraffic.fi/api/ais/v1/locations`). Open data under [CC BY 4.0](https://www.digitraffic.fi/en/supporting-material/terms-of-service/). Coverage is the Finnish coast and the northern Baltic, not the Atlantic or Pacific.
- **[Norwegian Coastal Administration](https://www.kystverket.no/en/sea-transport-and-ports/ais/access-to-ais-data/) open AIS** via Kystdatahuset (`https://kystdatahuset.kystverket.no/ws/api/ais/realtime/geojson`). [Norwegian Licence for Open Government Data (NLOD)](https://data.norge.no/nlod/en). Coverage is the Norwegian economic zone, including Svalbard. Fishing vessels under 15 metres and recreational craft under 45 metres are omitted by the provider. That does not remove a warship.

A position from either feed is stored with a link to that provider. The job keeps a previous non-AIS summary in the `background` field so a live fix does not erase the last official story.

### Secret that turns on worldwide AIS

Create a free API key at [aisstream.io](https://aisstream.io/) (GitHub sign-in) and add it to this repository as:

**`AISSTREAM_API_KEY`**

Repository **Settings → Secrets and variables → Actions → New repository secret**. The workflow already passes `secrets.AISSTREAM_API_KEY` into the refresh script. Do not put the key in a file, the Pages site, or an issue.

What the key changes: the script opens one server-side WebSocket to `wss://stream.aisstream.io/v0/stream` for 45 seconds, filtered to the MMSIs in `data/ships.json`, and keeps any newer position. The key never goes in the browser. AISStream's own site says browsers must not connect directly.

What the key does not change: the map already works from the seed file and from the Finnish and Norwegian open feeds. AISStream has no published terms of use or data licence (checked November 2026). The workflow uses it only as an optional position source, attributes the provider, and does not republish the raw stream. If that is not acceptable, leave the secret unset.

Commercial AIS sites were not wired into the scheduler. VesselFinder and MyShipTracking pages were read once, on 23 November 2026, to seed coordinates that government releases did not give. Their terms are not an open-data licence, so the job does not scrape them.

## Limits

- A pin is a source's claim about a past moment, shown with its age. It is not a promise the ship is still there.
- AIS on a warship is optional. Silence usually means the transmitter is off, not that the ship is missing.
- Static AIS fields are sometimes nonsense. This dataset ignored a broadcast whose name did not match the pennant, and it notes Regina's non-standard call sign and Ville de Québec's impossible broadcast dimensions.
- Submarines are not queried by MMSI. Their markers are a maintenance report or the home-port default.
- Digitraffic and Kystverket only hear ships near Finland or Norway. Everywhere else stays on the stored report until `AISSTREAM_API_KEY` is set or a later public report is added by hand.
- OpenStreetMap tiles are the background map. Dockyard and shipyard coordinates for non-AIS markers are OpenStreetMap place locations, not a surveyed berth.
- The Crowsnest dated the Moncton and Edmonton return 30 October 2026. The National Defence release and the AIS arrivals use 5 November 2026. The map follows the release and the broadcasts.

## Develop

No install step. The page is static.

```bash
node scripts/validate.mjs
node scripts/refresh.mjs
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`. `refresh.mjs` rewrites `data/ships.json` even when no ship moved, because it records `lastCheckedAt` and the result of each feed.

GitHub Pages is published by [`.github/workflows/pages.yml`](.github/workflows/pages.yml) from the `main` branch. The scheduled refresh also has to live on `main`, which is the branch GitHub uses for `cron`.
