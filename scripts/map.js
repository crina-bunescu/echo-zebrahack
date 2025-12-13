document.addEventListener("DOMContentLoaded", () => {
  const APP_KEY = "echo";

//setare harta la coordonatele Romaniei
  const map = L.map("map").setView([45.9432, 24.9668], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const routesLayer = L.featureGroup().addTo(map);
  let radiusCircle = null;
  let currentCompany = null;
  let routeLayers = []; // sincronizare rute cu casute tabel
  let highlightedLayer = null;

  //elemente UI
  const input = document.getElementById("search-input");
  const roleSelect = document.getElementById("role-select");
  const results = document.getElementById("search-results");
  const clearBtn = document.getElementById("clear-search");
  const toggleRadiusBtn = document.getElementById("toggle-radius");
  const openDetailsBtn = document.getElementById("open-details");

  const detailsPanel = document.getElementById("company-details");
  const closeDetailsBtn = document.getElementById("close-details");

  const dName = document.getElementById("details-name");
  const dRole = document.getElementById("details-role");
  const dRadius = document.getElementById("details-radius");
  const dLat = document.getElementById("details-lat");
  const dLon = document.getElementById("details-lon");
  const dLast = document.getElementById("details-last");

  const toggleTransportsBtn = document.getElementById("toggle-transports");
  const transportsContainer = document.getElementById("transports-container");
  const transportsTableBody = document.querySelector("#transports-table tbody");

  // ascundem butoanele details până când rutele sunt gata
  toggleRadiusBtn.classList.add("hidden-control");
  openDetailsBtn.classList.add("hidden-control");

  const loadingOverlay = document.getElementById("loading-overlay");
  const loadingTitle = document.getElementById("loading-title");
  const loadingSubtitle = document.getElementById("loading-subtitle");

  const loadingMessages = [
    "Analizăm datele SUMAL…",
    "Verificăm transporturile raportate…",
    "Calculăm traseele GPS…",
    "Pregătim vizualizarea pe hartă…",
    "Aproape gata…"
  ];
  let loadingInterval = null;

  function showLoading(title) {
    loadingTitle.textContent = title;
    let i = 0;
    loadingSubtitle.textContent = loadingMessages[0];
    loadingOverlay.classList.remove("hidden");
    clearInterval(loadingInterval);
    loadingInterval = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      loadingSubtitle.textContent = loadingMessages[i];
    }, 1200);
  }

  function hideLoading() {
    loadingOverlay.classList.add("hidden");
    clearInterval(loadingInterval);
  }

  function calculeazaVolum(route) {
    if (!route.species || !Array.isArray(route.species)) return 0;
    return route.species.reduce((sum, s) => sum + (s.volume || 0), 0);
  }

  function formatSpecies(route) {
    if (!route.species || !route.species.length) return "-";
    return route.species
      .slice(0, 3)
      .map(s => `${s.name || s.nume_sortiment || "Specie"}: ${(s.volume || 0).toFixed(1)} mc`)
      .join(", ") + (route.species.length > 3 ? "…" : "");
  }

  function resetHighlight() {
    if (highlightedLayer) {
      highlightedLayer.setStyle({ color: "#1b5e20", weight: 1.5 });
      highlightedLayer = null;
    }
  }

  // cautam compania
  let searchTimer = null;

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(searchCompanies, 250);
  });

  roleSelect.addEventListener("change", () => {
    results.innerHTML = "";
  });

  async function searchCompanies() {
    const q = input.value.trim();
    if (q.length < 2) {
      results.innerHTML = "";
      return;
    }

    const url = new URL("https://zebrahack.iqnox.tech/api/companies");
    url.searchParams.set("role", roleSelect.value);
    url.searchParams.set("search", q);

    try {
      const res = await fetch(url, { headers: { "X-App-Key": APP_KEY } });
      const data = await res.json();

      results.innerHTML = "";
      const companies = data.companies || [];

      if (companies.length === 0) {
        results.innerHTML = `<div class="search-item"><small>Niciun rezultat</small></div>`;
        return;
      }

      companies.forEach(c => {
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `
          <strong>${c.name}</strong><br>
          <small>${c.transport_count} transporturi</small>
        `;
        div.onclick = () => selectCompany(c);
        results.appendChild(div);
      });
    } catch (e) {
      console.error(e);
      results.innerHTML = `<div class="search-item"><small>Eroare la căutare</small></div>`;
    }
  }

  // selectam compania
  async function selectCompany(c) {
    currentCompany = c;
    input.value = c.name;
    results.innerHTML = "";

    // nu afișăm nimic doar rutele
    showLoading("Se încarcă rutele");
    await loadRoutes(c.name, c.role);
    hideLoading();

    // apar butoanele
    toggleRadiusBtn.classList.remove("hidden-control");
    openDetailsBtn.classList.remove("hidden-control");

    // reset UI detalii / transporturi 
    detailsPanel.classList.add("hidden");
    transportsContainer.classList.add("hidden");
    toggleTransportsBtn.textContent = "Arată transporturile";
  }

  // incarca rutele + tabel
  async function loadRoutes(name, role) {
    routesLayer.clearLayers();
    transportsTableBody.innerHTML = "";
    routeLayers = [];
    resetHighlight();

    // dacă există cerc, îl resetăm 
    if (radiusCircle) {
      map.removeLayer(radiusCircle);
      radiusCircle = null;
    }

    const url = new URL("https://zebrahack.iqnox.tech/api/routes");
    url.searchParams.set("company", name);
    url.searchParams.set("role", role);

    const res = await fetch(url, { headers: { "X-App-Key": APP_KEY } });
    const data = await res.json();

    const routes = data.routes || [];

    // pentru evidențiere volum
    const volumes = routes.map(calculeazaVolum);
    const maxVolume = Math.max(...volumes, 1);

    routes.forEach((route, idx) => {
      if (!route.geometry) return;

      // ruta pe harta
      const layer = L.geoJSON(route.geometry, {
        style: { color: "#1b5e20", weight: 1.5, opacity: 0.85 }
      }).addTo(routesLayer);

      routeLayers.push(layer);

      layer.on("click", () => {
        resetHighlight();
        layer.setStyle({ color: "#d32f2f", weight: 15 });
        highlightedLayer = layer;
      });

      // calculam volumul
      const volume = calculeazaVolum(route);
      const barWidth = Math.round((volume / maxVolume) * 100);

      //rand tabel
      const tr = document.createElement("tr");
      tr.className = "transport-row";

      const updatedLocal = route.updated_at
        ? new Date(route.updated_at).toLocaleString("ro-RO")
        : "-";

      tr.innerHTML = `
        <td>
          <div><strong>${route.notice_id || "-"}</strong></div>
          <div style="font-size:12px;color:#666;">ID: ${route.transport_id || "-"}</div>
        </td>

        <td>
          ${volume.toFixed(1)} mc
          <div class="transport-bar" style="width:${barWidth}%"></div>
          <div style="font-size:12px;color:#666;margin-top:4px;">
            ${formatSpecies(route)}
          </div>
        </td>

        <td>${route.point_count ?? "-"}</td>
        <td>${updatedLocal}</td>
      `;

      // click pe rând duce la highlight pe ruta si zoom
      tr.onclick = () => {
        resetHighlight();
        layer.setStyle({ color: "#d32f2f", weight: 3 });
        highlightedLayer = layer;
        map.fitBounds(layer.getBounds(), { padding: [40, 40] });
      };

      transportsTableBody.appendChild(tr);
    });

    if (routesLayer.getLayers().length) {
      map.fitBounds(routesLayer.getBounds(), { padding: [40, 40] });
    }
  }

  // buton raza
  toggleRadiusBtn.onclick = () => {
    if (!currentCompany) return;

    if (radiusCircle) {
      map.removeLayer(radiusCircle);
      radiusCircle = null;
      return;
    }

    if (!currentCompany.center || !currentCompany.radius_meters) return;

    radiusCircle = L.circle(
      [currentCompany.center.latitude, currentCompany.center.longitude],
      {
        radius: currentCompany.radius_meters,
        color: "#2e7d32",
        fillColor: "#81c784",
        fillOpacity: 0.25,
        weight: 2
      }
    ).addTo(map);

    map.fitBounds(radiusCircle.getBounds(), { padding: [40, 40] });
  };

  //detalii doar la click
  openDetailsBtn.onclick = () => {
    if (!currentCompany) return;

    dName.textContent = currentCompany.name;
    dRole.textContent = currentCompany.role;
    dRadius.textContent = (currentCompany.radius_meters / 1000).toFixed(1) + " km";
    dLat.textContent = currentCompany.center.latitude.toFixed(4);
    dLon.textContent = currentCompany.center.longitude.toFixed(4);

    //ultima activitate local
    dLast.textContent = new Date(currentCompany.last_activity).toLocaleString("ro-RO");

    detailsPanel.classList.remove("hidden");
  };

  closeDetailsBtn.onclick = () => {
    detailsPanel.classList.add("hidden");
  };

 
  toggleTransportsBtn.onclick = () => {
    transportsContainer.classList.toggle("hidden");
    toggleTransportsBtn.textContent =
      transportsContainer.classList.contains("hidden")
        ? "Arată transporturile"
        : "Ascunde transporturile";
  };

  // reset
  clearBtn.onclick = () => {
    input.value = "";
    results.innerHTML = "";

    routesLayer.clearLayers();
    transportsTableBody.innerHTML = "";
    routeLayers = [];
    resetHighlight();

    if (radiusCircle) {
      map.removeLayer(radiusCircle);
      radiusCircle = null;
    }

    map.setView([45.9432, 24.9668], 7);

    detailsPanel.classList.add("hidden");
    transportsContainer.classList.add("hidden");
    toggleTransportsBtn.textContent = "Arată transporturile";

    toggleRadiusBtn.classList.add("hidden-control");
    openDetailsBtn.classList.add("hidden-control");

    currentCompany = null;
    hideLoading();
  };

  const params = new URLSearchParams(window.location.search);
  const companyFromUrl = params.get("company");
  const roleFromUrl = params.get("role");
  if (companyFromUrl && roleFromUrl) {
    // simulăm selectarea: fără search overlay
    const c = { name: companyFromUrl, role: roleFromUrl };
    input.value = companyFromUrl;
  }
});