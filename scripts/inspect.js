/* =========================
   CONFIG
========================= */
const API_BASE = "https://zebrahack.iqnox.tech/api";
const APP_KEY = "echo"; 

// Heuristici (simple, explicabile)
const WEAK_TRACKING_THRESHOLD = 5;          // < 5 puncte GPS = tracking slab
const UNCERTAIN_MULTIPLIER = 1.5;           // între radius și radius*1.5 = incert
const ROUTE_CHUNK_SIZE = 25;                // desenare în bucăți pt performanță

/* =========================
   STATE
========================= */
const state = {
  role: "emitent",
  search: "",
  companies: [],
  selectedCompany: null,

  routesRaw: [],
  routesComputed: [],
  selectedRouteId: null,

  filters: {
    outside: false,
    weak: false
  },

  // Map
  map: null,
  routesLayer: null,
  circleLayer: null,

  // routeId -> { shadowLayer, mainLayer }
  routeLayerById: new Map()
};

/* =========================
   DOM
========================= */
const roleSelect = document.getElementById("roleSelect");
const searchInput = document.getElementById("searchInput");
const companiesStatus = document.getElementById("companiesStatus");
const companiesList = document.getElementById("companiesList");
const resultsCount = document.getElementById("resultsCount");
const clearBtn = document.getElementById("clearBtn");

const companyBlock = document.getElementById("companyBlock");

const filterOutside = document.getElementById("filterOutside");
const filterWeak = document.getElementById("filterWeak");

const routesStatus = document.getElementById("routesStatus");
const routesList = document.getElementById("routesList");
const routesCount = document.getElementById("routesCount");

const routeDetails = document.getElementById("routeDetails");

const toggleRoutesBtn = document.getElementById("toggleRoutesBtn");
const routesCard = document.getElementById("routesCard");

/* =========================
   HELPERS
========================= */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatKm(meters) {
  if (meters == null || isNaN(meters)) return "–";
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatLatLon(center) {
  if (!center) return "–";
  const { lat, lon } = center;
  if (lat == null || lon == null) return "–";
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function formatDateTime(iso) {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleString("ro-RO");
  } catch {
    return iso;
  }
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function debounce(fn, ms=300){
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* Haversine distance (meters) */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function geojsonFirstLast(geometry){
  // Supports LineString and MultiLineString (common)
  if (!geometry) return null;

  const type = geometry.type;
  const coords = geometry.coordinates;

  if (type === "LineString" && Array.isArray(coords) && coords.length >= 2) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    return {
      first: { lon: first[0], lat: first[1] },
      last: { lon: last[0], lat: last[1] }
    };
  }

  if (type === "MultiLineString" && Array.isArray(coords) && coords.length) {
    // first point = first point of first line
    // last point = last point of last line
    const firstLine = coords[0];
    const lastLine = coords[coords.length - 1];
    if (!firstLine?.length || !lastLine?.length) return null;
    const first = firstLine[0];
    const last = lastLine[lastLine.length - 1];
    return {
      first: { lon: first[0], lat: first[1] },
      last: { lon: last[0], lat: last[1] }
    };
  }

  return null;
}

function statusForDistance(distance, radius){
  if (distance == null || radius == null) return "no-geometry";
  if (distance <= radius) return "plausible";
  if (distance <= radius * UNCERTAIN_MULTIPLIER) return "uncertain";
  return "outside";
}

function trackingStatus(pointCount){
  if (pointCount == null) return "unknown";
  return pointCount < WEAK_TRACKING_THRESHOLD ? "weak" : "ok";
}

function routeScore({ destination_status, point_count }){
  let score = 0;

  if (destination_status === "outside") score += 50;
  else if (destination_status === "uncertain") score += 25;

  if (point_count != null) {
    if (point_count < 5) score += 25;
    if (point_count < 3) score += 15;
  }

  return clamp(score, 0, 100);
}

function companyScore(routes){
  if (!routes.length) return 0;

  // medie ponderată simplă (și explicabilă)
  const avg = routes.reduce((s, r) => s + (r.suspicion_score ?? 0), 0) / routes.length;
  return Math.round(avg);
}

function scoreLevel(score){
  if (score >= 75) return "Ridicat";
  if (score >= 45) return "Mediu";
  return "Scăzut";
}

function statusLabel(status){
  if (status === "plausible") return "🟢 plauzibil";
  if (status === "uncertain") return "🟠 incert";
  if (status === "outside") return "🔴 în afara razei";
  return "⚪ fără geometrie";
}

function statusTagClass(status){
  if (status === "plausible") return "green";
  if (status === "uncertain") return "orange";
  if (status === "outside") return "red";
  return "gray";
}

/* =========================
   API
========================= */
async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "X-App-Key": APP_KEY
    }
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API error ${res.status} for ${path}: ${txt}`);
  }
  return res.json();
}

/* =========================
   MAP (Leaflet)
========================= */
function initMap(){
  state.map = L.map("map").setView([45.9432, 24.9668], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(state.map);

  state.routesLayer = L.featureGroup().addTo(state.map);

  // Grosime linii în funcție de zoom (ca la colegă)
  state.map.on("zoomend", () => {
    const weight = getLineWeight(state.map.getZoom());
    for (const { shadowLayer, mainLayer } of state.routeLayerById.values()) {
      shadowLayer.setStyle({ weight: weight + 0.8 });
      mainLayer.setStyle({ weight });
    }
  });
}

function getLineWeight(zoom) {
  if (zoom <= 6) return 0.8;
  if (zoom <= 8) return 1;
  if (zoom <= 10) return 1.3;
  if (zoom <= 12) return 1.8;
  return 2.2;
}

function clearMapRoutes(){
  state.routesLayer.clearLayers();
  state.routeLayerById.clear();
  if (state.circleLayer) {
    state.circleLayer.remove();
    state.circleLayer = null;
  }
}

function drawCompanyCircle(company){
  if (!company?.center || !company?.radius_meters) return;

  const { lat, lon } = company.center;
  const r = company.radius_meters;

  state.circleLayer = L.circle([lat, lon], {
    radius: r,
    color: "rgba(124,58,237,0.75)",
    weight: 2,
    fillColor: "rgba(124,58,237,0.18)",
    fillOpacity: 0.6
  }).addTo(state.map);
}

function lineColorForStatus(status){
  if (status === "plausible") return "#22c55e";
  if (status === "uncertain") return "#f59e0b";
  if (status === "outside") return "#ef4444";
  return "#94a3b8";
}

function drawRoutesChunked(routes, chunkSize = ROUTE_CHUNK_SIZE){
  let index = 0;

  const draw = () => {
    const slice = routes.slice(index, index + chunkSize);

    slice.forEach(route => {
      if (!route.geometry) return;

      const smooth = state.map.getZoom() < 10 ? 2.5 : 0.8;
      const color = lineColorForStatus(route.destination_status);

      // shadow
      const shadowLayer = L.geoJSON(route.geometry, {
        interactive: false,
        smoothFactor: smooth,
        style: {
          color: "rgba(255,255,255,0.18)",
          weight: getLineWeight(state.map.getZoom()) + 0.8,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round"
        }
      }).addTo(state.routesLayer);

      // main line (interactive)
      const mainLayer = L.geoJSON(route.geometry, {
        interactive: true,
        smoothFactor: smooth,
        style: {
          color,
          weight: getLineWeight(state.map.getZoom()),
          opacity: 0.85,
          lineCap: "round",
          lineJoin: "round"
        }
      }).addTo(state.routesLayer);

      // click
      mainLayer.on("click", () => selectRoute(route.transport_id));

      state.routeLayerById.set(route.transport_id, { shadowLayer, mainLayer });
    });

    index += chunkSize;

    if (index < routes.length) {
      requestAnimationFrame(draw);
    } else {
      // Fit bounds: include circle + routes
      const bounds = state.routesLayer.getBounds();
      if (state.circleLayer) bounds.extend(state.circleLayer.getBounds());

      if (bounds.isValid()) {
        state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    }
  };

  draw();
}

function highlightRoute(transportId){
  // reset all
  for (const [id, layers] of state.routeLayerById.entries()) {
    const route = state.routesComputed.find(r => r.transport_id === id);
    const baseColor = lineColorForStatus(route?.destination_status);
    layers.mainLayer.setStyle({ color: baseColor, opacity: 0.75 });
  }

  const found = state.routeLayerById.get(transportId);
  if (!found) return;

  found.mainLayer.setStyle({ opacity: 1.0 });

  // bring to front
  try { found.mainLayer.bringToFront(); } catch {}
}

/* =========================
   RENDER: Companies list
========================= */
function renderCompanies(){
  resultsCount.textContent = String(state.companies.length);
  companiesList.innerHTML = "";

  if (!state.companies.length) {
    companiesList.innerHTML = `<div class="muted" style="padding:10px;">Niciun rezultat.</div>`;
    return;
  }

  state.companies.forEach(c => {
    const div = document.createElement("div");
    div.className = "item" + (state.selectedCompany?.id === c.id ? " active" : "");
    div.innerHTML = `
      <div class="item-top">
        <div>
          <div class="item-title">${escapeHtml(c.name)}</div>
          <div class="item-sub">
            <span class="badge">${escapeHtml(c.role)}</span>
            <span>${escapeHtml(String(c.transport_count ?? 0))} transporturi</span>
          </div>
        </div>
        <button class="btn" type="button" style="padding:8px 10px; font-size:12px;">Inspectează</button>
      </div>
    `;

    div.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      selectCompany(c);
    });

    div.addEventListener("click", () => selectCompany(c));
    companiesList.appendChild(div);
  });
}

/* =========================
   RENDER: Company panel
========================= */
function renderCompanyPanel(company, score = null){
  if (!company) {
    companyBlock.innerHTML = `<div class="muted">Selectează o companie din listă.</div>`;
    return;
  }

  const radiusKm = formatKm(company.radius_meters);
  const centerStr = formatLatLon(company.center);
  const lastAct = formatDateTime(company.last_activity);

  const lvl = score != null ? scoreLevel(score) : "–";

  companyBlock.innerHTML = `
    <div class="company-name">${escapeHtml(company.name)}</div>

    <div class="grid">
      <div class="kv">
        <div class="k">Rol</div>
        <div class="v">${escapeHtml(company.role)}</div>
      </div>
      <div class="kv">
        <div class="k">Rază</div>
        <div class="v">${escapeHtml(radiusKm)}</div>
      </div>
      <div class="kv">
        <div class="k">Centru</div>
        <div class="v">${escapeHtml(centerStr)}</div>
      </div>
      <div class="kv">
        <div class="k">Ultima activitate</div>
        <div class="v">${escapeHtml(lastAct)}</div>
      </div>
    </div>

    <div class="score">
      <div>
        <div class="k">Scor suspiciune</div>
        <div class="lvl">${escapeHtml(lvl)}</div>
      </div>
      <strong>${score != null ? escapeHtml(String(score)) : "–"}</strong>
    </div>
  `;
}

/* =========================
   RENDER: Routes list + details
========================= */
function applyRouteFilters(routes){
  return routes.filter(r => {
    if (state.filters.outside && r.destination_status !== "outside") return false;
    if (state.filters.weak && r.tracking_status !== "weak") return false;
    return true;
  });
}

function renderRoutes(){
  const filtered = applyRouteFilters(state.routesComputed);

  routesCount.textContent = String(filtered.length);
  routesList.innerHTML = "";

  if (!state.selectedCompany) {
    routesStatus.textContent = "Alege o companie…";
    routesStatus.classList.add("muted");
    return;
  }

  if (!state.routesComputed.length) {
    routesStatus.textContent = "Nu există rute.";
    routesStatus.classList.add("muted");
    return;
  }

  if (!filtered.length) {
    routesStatus.textContent = "Niciun rezultat cu filtrele curente.";
    routesStatus.classList.add("muted");
    return;
  }

  routesStatus.textContent = "";
  routesStatus.classList.remove("muted");

  filtered.forEach(r => {
    const row = document.createElement("div");
    row.className = "route-row" + (state.selectedRouteId === r.transport_id ? " active" : "");

    const tagClass = statusTagClass(r.destination_status);
    const statusText = statusLabel(r.destination_status);

    const tracking = r.tracking_status === "weak" ? "⚠️ tracking slab" : "tracking ok";
    const volume = r.total_volume != null ? `${r.total_volume.toFixed(2)} m³` : "–";
    const dist = r.distance_to_center != null ? formatKm(r.distance_to_center) : "–";

    row.innerHTML = `
      <div class="route-top">
        <div>
          <div class="route-title">Transport #${escapeHtml(String(r.transport_id))}</div>
          <div class="route-meta">
            <span class="tag ${tagClass}">${escapeHtml(statusText)}</span>
            <span class="tag gray">${escapeHtml(tracking)}</span>
          </div>
        </div>
        <div class="pill">${escapeHtml(String(r.suspicion_score))}</div>
      </div>

      <div class="route-meta" style="margin-top:10px;">
        <span>Aviz: <strong>${escapeHtml(String(r.notice_id ?? "–"))}</strong></span>
        <span>Puncte: <strong>${escapeHtml(String(r.point_count ?? "–"))}</strong></span>
        <span>Distanță: <strong>${escapeHtml(dist)}</strong></span>
        <span>Volum: <strong>${escapeHtml(volume)}</strong></span>
      </div>
    `;

    row.addEventListener("click", () => selectRoute(r.transport_id));
    routesList.appendChild(row);
  });
}

function renderRouteDetails(route){
  if (!route) {
    routeDetails.classList.add("muted");
    routeDetails.innerHTML = `Click pe o rută de pe hartă sau din listă.`;
    return;
  }

  const trackingTxt = route.tracking_status === "weak"
    ? `⚠️ Slab (${route.point_count ?? "–"} puncte)`
    : `OK (${route.point_count ?? "–"} puncte)`;

  const speciesTxt = (route.species || [])
    .slice(0, 4)
    .map(s => `${s?.name ?? s?.species ?? "Specie"}: ${s?.volume ?? s?.volum ?? "?"}`)
    .join(" · ");

  routeDetails.classList.remove("muted");
  routeDetails.innerHTML = `
    <div class="row"><strong>Transport ID</strong><span>${escapeHtml(String(route.transport_id))}</span></div>
    <div class="row"><strong>Aviz</strong><span>${escapeHtml(String(route.notice_id ?? "–"))}</span></div>
    <div class="row"><strong>Status</strong><span>${escapeHtml(statusLabel(route.destination_status))}</span></div>
    <div class="row"><strong>Distanță la centru</strong><span>${escapeHtml(route.distance_to_center != null ? formatKm(route.distance_to_center) : "–")}</span></div>
    <div class="row"><strong>Tracking</strong><span>${escapeHtml(trackingTxt)}</span></div>
    <div class="row"><strong>Volum</strong><span>${escapeHtml(route.total_volume != null ? `${route.total_volume.toFixed(2)} m³` : "–")}</span></div>
    <div class="row"><strong>Ultima actualizare</strong><span>${escapeHtml(formatDateTime(route.updated_at))}</span></div>
    <div class="row"><strong>Scor suspiciune</strong><span>${escapeHtml(String(route.suspicion_score))}/100</span></div>
    ${speciesTxt ? `<div class="row"><strong>Specii</strong><span style="text-align:right; max-width: 220px;">${escapeHtml(speciesTxt)}</span></div>` : ``}
  `;
}

/* =========================
   ACTIONS
========================= */
async function loadCompanies(){
  const role = state.role;
  const search = state.search.trim();

  if (!search) {
    state.companies = [];
    companiesStatus.textContent = "Tastează pentru a căuta…";
    renderCompanies();
    return;
  }

  companiesStatus.textContent = "Se încarcă…";
  try {
    const data = await apiGet("/companies", { role, search });
    state.companies = data.companies || [];
    companiesStatus.textContent = state.companies.length ? "" : "Niciun rezultat.";
    renderCompanies();
  } catch (e) {
    console.error(e);
    companiesStatus.textContent = "Eroare la încărcare.";
    state.companies = [];
    renderCompanies();
  }
}

async function selectCompany(company){
  state.selectedCompany = company;
  state.selectedRouteId = null;

  // UI highlight
  renderCompanies();

  // reset route UI
  routesStatus.textContent = "Se încarcă rutele…";
  routesList.innerHTML = "";
  routesCount.textContent = "0";
  renderRouteDetails(null);

  // map reset
  clearMapRoutes();
  drawCompanyCircle(company);

  // company panel (score later after compute)
  renderCompanyPanel(company, null);

  try {
    const data = await apiGet("/routes", { company: company.name, role: company.role });
    const routes = data.routes || [];
    state.routesRaw = routes;

    if (!routes.length) {
      state.routesComputed = [];
      routesStatus.textContent = "Nu există rute pentru această companie.";
      renderRoutes();
      return;
    }

    // compute derived fields
    const computed = routes.map(r => computeRoute(r, company));
    state.routesComputed = computed;

    // company score
    const compScore = companyScore(computed);
    renderCompanyPanel(company, compScore);

    // render list (filtered)
    renderRoutes();

    // draw only routes that have geometry (for map)
    drawRoutesChunked(computed.filter(r => !!r.geometry));

    // fit also circle (done in draw complete)
  } catch (e) {
    console.error(e);
    routesStatus.textContent = "Eroare la încărcarea rutelor.";
    state.routesRaw = [];
    state.routesComputed = [];
    renderRoutes();
  }
}

function computeRoute(route, company){
  const extracted = geojsonFirstLast(route.geometry);
  const center = company.center;
  const radius = company.radius_meters;

  let distance = null;
  let destStatus = "no-geometry";

  if (extracted && center?.lat != null && center?.lon != null) {
    distance = haversineMeters(extracted.last.lat, extracted.last.lon, center.lat, center.lon);
    destStatus = statusForDistance(distance, radius);
  }

  const tStatus = trackingStatus(route.point_count);
  const score = routeScore({ destination_status: destStatus, point_count: route.point_count });

  return {
    ...route,
    first_point: extracted?.first ?? null,
    last_point: extracted?.last ?? null,
    distance_to_center: distance,
    destination_status: destStatus,
    tracking_status: tStatus,
    suspicion_score: score
  };
}

function selectRoute(transportId){
  state.selectedRouteId = transportId;

  // route details + highlight
  const route = state.routesComputed.find(r => r.transport_id === transportId);
  renderRouteDetails(route);

  // highlight map
  highlightRoute(transportId);

  // focus map a bit on route bounds
  const layers = state.routeLayerById.get(transportId);
  if (layers) {
    const b = layers.mainLayer.getBounds?.();
    if (b?.isValid?.()) {
      state.map.fitBounds(b, { padding: [40, 40], maxZoom: 13 });
    }
  }

  // highlight list
  renderRoutes();
}

/* =========================
   EVENTS
========================= */
roleSelect.addEventListener("change", () => {
  state.role = roleSelect.value;
  state.selectedCompany = null;
  state.routesRaw = [];
  state.routesComputed = [];
  state.selectedRouteId = null;
  companyBlock.innerHTML = `<div class="muted">Selectează o companie din listă.</div>`;
  renderRouteDetails(null);
  clearMapRoutes();
  loadCompanies();
});

searchInput.addEventListener("input", debounce(() => {
  state.search = searchInput.value;
  loadCompanies();
}, 350));

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  state.search = "";
  state.companies = [];
  state.selectedCompany = null;
  state.routesRaw = [];
  state.routesComputed = [];
  state.selectedRouteId = null;

  companiesStatus.textContent = "Tastează pentru a căuta…";
  renderCompanies();

  renderCompanyPanel(null);
  routesStatus.textContent = "Alege o companie…";
  routesList.innerHTML = "";
  routesCount.textContent = "0";
  renderRouteDetails(null);

  clearMapRoutes();
});

filterOutside.addEventListener("change", () => {
  state.filters.outside = filterOutside.checked;
  renderRoutes();
});
filterWeak.addEventListener("change", () => {
  state.filters.weak = filterWeak.checked;
  renderRoutes();
});

toggleRoutesBtn.addEventListener("click", () => {
  const hidden = routesCard.style.display === "none";
  routesCard.style.display = hidden ? "" : "none";
  toggleRoutesBtn.textContent = hidden ? "Ascunde lista" : "Arată lista";
});

/* =========================
   INIT
========================= */
(function init(){
  // Defaults
  roleSelect.value = state.role;

  initMap();
  renderCompanies();
  renderCompanyPanel(null);
})();
