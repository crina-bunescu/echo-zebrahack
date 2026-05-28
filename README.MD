# ECHO — Timber Transport Anomaly Detector

A web application built at **ZebraHack 3.0** (December 2025) that transforms raw data from Romania's SUMAL 2.0 timber tracking platform into actionable visual intelligence. ECHO applies a custom anomaly detection algorithm to GPS route data and classifies each transport into a risk tier, enabling inspectors to instantly identify suspicious activity.

> 🏆 **Award of Excellence** — ZebraHack 3.0, Team Nova

**Team Nova:**
| Member | Role |
|---|---|
| Bunescu Crina-Gabriela | Algorithm & Logic Lead — Suspicion Score model, route analysis |
| Petre Ana Mihaela | Core Developer & Data Integration — API integration, map rendering |
| Anton Maria Alexia | Frontend & UX/UI Designer — interface, animations, user experience |

---

## How It Works

Each timber transport in SUMAL 2.0 has a GeoJSON route and a GPS point count. ECHO computes a **Suspicion Score** for each route:

```
suspicionScore = totalDistanceKm / pointCount
```

The Haversine formula is used to calculate the actual geodesic distance between consecutive GPS coordinates. The score is then classified:

| Score | Tier | Meaning |
|---|---|---|
| points &lt; 5 or score &gt; 5.0 | 🔴 Critical | Severe GPS tracking gaps — likely route manipulation |
| score &gt; 1.5 | 🟠 Uncertain | Sparse reporting relative to distance traveled |
| otherwise | 🟢 Plausible | Coherent route with sufficient tracking points |

Routes are color-coded on the map in real time as data loads.

---

## Pages & Features

| Page | File | Description |
|---|---|---|
| Landing | `index.html` | Informational page on deforestation risks + API health check |
| Map Explorer | `map.html` | Search companies, view all routes, toggle action radius, transport table with volume bars |
| Route Inspector | `inspect.html` | Search a company, compute Suspicion Score per route, display triage panel (green / orange / red) with click-to-zoom |
| Dashboard | `app.html` | Transport volume dashboard with species breakdown |

---

## Project Structure

```
.
├── index.html / map.html / inspect.html / app.html
├── scripts/
│   ├── zebrahack_client.js   # ZebraHackClient — standardized GET wrapper (X-App-Key auth)
│   ├── map.js                # Company search, route rendering, radius overlay, transport table
│   ├── inspect.js            # Suspicion Score computation + triage panel
│   └── index.js              # Landing page health-check button
└── styles/
    ├── style.css             # Landing page
    ├── style_map_lc.css      # Map page
    ├── inspect.css           # Inspector page
    └── app.css               # Dashboard
```

---

## Setup & Run

No build step required — plain HTML/CSS/Vanilla JS.

1. Clone the repository.
2. Open with a local server (e.g. **Live Server** in VS Code).
3. All API calls to `https://zebrahack.iqnox.tech` are handled automatically via `zebrahack_client.js` using `X-App-Key: echo`.

> The ZebraHack API was provided by the hackathon organizers (IQNOX) and may not be publicly available outside the event.

---

## Technical Notes

- **No frameworks** — pure Vanilla JS with ES module patterns (`ZebraHackApi` global) and async/await throughout.
- **Leaflet.js** for interactive map rendering, GeoJSON polygon drawing and dynamic style updates on hover/click.
- **Haversine distance** computed client-side from raw GeoJSON coordinates — no server processing needed.
- **Debounced search** (250ms) on company input to avoid flooding the API.
- Loading overlay with rotating status messages masks async fetch latency.
