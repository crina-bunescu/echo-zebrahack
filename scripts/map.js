
const params = new URLSearchParams(window.location.search);
const company = params.get("company");
const role = params.get("role");

if (!company || !role) {
  alert("Lipsesc parametrii company sau role!");
  throw new Error("Parametri lipsă");
}

//harta prelia cu leaflet setata la coordonatele romaniei
const map = L.map("map").setView([45.9432, 24.9668], 7);

// Tile layer OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Layer grup pentru rute
const routesLayer = L.featureGroup().addTo(map);
const routeLayers = [];

//grosime linii in functie de zoom
function getLineWeight(zoom) {
  if (zoom <= 6) return 0.8;
  if (zoom <= 8) return 1;
  if (zoom <= 10) return 1.3;
  if (zoom <= 12) return 1.8;
  return 2.2; // maxim, niciodată agresiv
}

// Update grosime la zoom
map.on("zoomend", () => {
  const weight = getLineWeight(map.getZoom());
  routeLayers.forEach(layer => layer.setStyle({ weight }));
});

//loading animat
let loadingControl = null;
let loadingInterval = null;
function showLoading() {
  let dots = 0;

  loadingControl = L.control({ position: "topright" });
  loadingControl.onAdd = function () {
    const div = L.DomUtil.create("div", "loading-control");
    div.style.padding = "8px 12px";
    div.style.background = "rgba(255,255,255,0.9)";
    div.style.borderRadius = "6px";
    div.style.fontSize = "14px";
    div.style.fontWeight = "bold";
    div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    div.innerText = "Se încarcă rutele";
    return div;
  };

  loadingControl.addTo(map);

  const container = document.querySelector(".loading-control");

  loadingInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    container.innerText = "Se încarcă rutele" + ".".repeat(dots);
  }, 500);
}

function hideLoading() {
  if (loadingInterval) clearInterval(loadingInterval);
  if (loadingControl) loadingControl.remove();
}

//desenare rute 
function drawRoutesInLines(routes, chunkSize = 20) {
  let index = 0;

  function drawLines() {
    const slice = routes.slice(index, index + chunkSize);

    slice.forEach(route => {
      if (!route.geometry) return;

      const smooth = map.getZoom() < 10 ? 2.5 : 0.8;

      // UMBRĂ DESCHISĂ (efect de drum)
      const shadow = L.geoJSON(route.geometry, {
        interactive: false,
        smoothFactor: smooth,
        style: {
          color: "#e8f5e9",
          weight: getLineWeight(map.getZoom()) + 0.8,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round"
        }
      }).addTo(routesLayer);

      // LINIA PRINCIPALĂ
      const mainLine = L.geoJSON(route.geometry, {
        interactive: false,
        smoothFactor: smooth,
        style: {
          color: "#1b5e20",
          weight: getLineWeight(map.getZoom()),
          opacity: 0.8,
          lineCap: "round",
          lineJoin: "round"
        }
      }).addTo(routesLayer);

      routeLayers.push(shadow, mainLine);
    });

    index += chunkSize;

    if (index < routes.length) {
      requestAnimationFrame(drawLines);
    } else {
      map.fitBounds(routesLayer.getBounds(), {
        padding: [40, 40],
        maxZoom: 12
      });
      hideLoading();
    }
  }

  drawLines();
}

//preluare rute din API ul dat
async function loadRoutes() {
  showLoading();

  try {
    const url = new URL("https://zebrahack.iqnox.tech/api/routes");
    url.searchParams.set("company", company);
    url.searchParams.set("role", role);

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "X-App-Key": "echo"
      }
    });

    if (!response.ok) throw new Error("Eroare API /routes");

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      hideLoading();
      alert("Nu există rute pentru această companie.");
      return;
    }

    drawRoutesInLines(data.routes);

  } catch (err) {
    hideLoading();
    console.error(err);
    alert("Eroare la încărcarea rutelor.");
  }
}

//start incarcare 
loadRoutes();
