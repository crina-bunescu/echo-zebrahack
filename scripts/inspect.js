document.addEventListener("DOMContentLoaded", () => {
    const APP_KEY = "echo";
  
    const map = L.map("map").setView([45.9432, 24.9668], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  
    const routesLayer = L.featureGroup().addTo(map);
  
    const input = document.getElementById("search-input");
    const roleSelect = document.getElementById("role-select");
    const results = document.getElementById("search-results");
    const loading = document.getElementById("loading-overlay");
    const openBtn = document.getElementById("open-transports");
  
    const panel = document.getElementById("inspector-panel");
    const closePanel = document.getElementById("close-panel");
    const companyName = document.getElementById("company-name");
  
    let currentCompany = null;
  
    // logica de search
    input.addEventListener("input", async () => {
      const q = input.value.trim();
      if (q.length < 2) {
        results.innerHTML = "";
        return;
      }
  
      const url = new URL("https://zebrahack.iqnox.tech/api/companies");
      url.searchParams.set("role", roleSelect.value);
      url.searchParams.set("search", q);
  
      try {
        const res = await fetch(url, { headers: { "X-App-Key": APP_KEY }});
        const data = await res.json();
  
        results.innerHTML = "";
        (data.companies || []).forEach(c => {
          const div = document.createElement("div");
          div.className = "search-item";
          div.innerHTML = `<strong>${c.name}</strong><br><small>${c.transport_count} transporturi</small>`;
          div.onclick = () => selectCompany(c);
          results.appendChild(div);
        });
      } catch (e) { console.error(e); }
    });
  
    async function selectCompany(c) {
      currentCompany = c;
      input.value = c.name;
      results.innerHTML = "";
      loading.classList.remove("hidden");
  
      await loadRoutes(c);
  
      loading.classList.add("hidden");
      openBtn.classList.remove("hidden-control");
    }
  
    // calcule
    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      const R = 6371; // Raza pamantului
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
  
    function deg2rad(deg) { return deg * (Math.PI / 180); }
  
    function calculateRouteDistance(geometry) {
        if (!geometry || !geometry.coordinates || geometry.coordinates.length < 2) return 0;
        let totalDist = 0;
        const coords = geometry.coordinates; 
        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i+1];
            totalDist += getDistanceFromLatLonInKm(p1[1], p1[0], p2[1], p2[0]);
        }
        return totalDist;
    }
  
   
    async function loadRoutes(c) {
      routesLayer.clearLayers();
      
      const listGreen = document.getElementById("list-green");
      const listOrange = document.getElementById("list-orange");
      const listRed = document.getElementById("list-red");
      
      // Resetam listele
      listGreen.innerHTML = "";
      listOrange.innerHTML = "";
      listRed.innerHTML = "";
  
      const url = new URL("https://zebrahack.iqnox.tech/api/routes");
      url.searchParams.set("company", c.name);
      url.searchParams.set("role", c.role);
  
      try {
        const res = await fetch(url, { headers: { "X-App-Key": APP_KEY }});
        const data = await res.json();
        
        let counts = { green: 0, orange: 0, red: 0 };
  
        (data.routes || []).forEach(r => {
          if (!r.geometry) return;
  
          // calculam metri/km reali
          const distKm = calculateRouteDistance(r.geometry);
          const points = r.point_count || 1;
  
          // calculam scor suspiciune
          const suspicionScore = (distKm / points).toFixed(2);
          
          let status = "green";
          if (points < 5 || suspicionScore > 5.0) {
              status = "red"; 
          } else if (suspicionScore > 1.5) {
              status = "orange";
          }
  
          // adaugare pe harta
          const color = status === "green" ? "#2e7d32" : status === "orange" ? "#f57c00" : "#c62828";
          const layer = L.geoJSON(r.geometry, { style: { color, weight: 2, opacity: 0.8 }}).addTo(routesLayer);
  
          // creare card in lista
          const li = document.createElement("li");
          li.className = "transport-item";
          
          let scoreLabel = status === 'red' ? 'CRITIC' : status === 'orange' ? 'INCERT' : 'OK';
          
          li.innerHTML = `
              <span class="t-header">Aviz #${r.transport_id}</span>
              <div class="t-stats">
                  <span>📡 ${points} pct</span>
                  <span>📏 ${distKm.toFixed(1)} km</span>
              </div>
              <span class="t-score score-${status === 'red' ? 'high' : status === 'orange' ? 'med' : 'low'}">
                 Scor Suspiciune: ${suspicionScore} (${scoreLabel})
              </span>
          `;
          
          // click pe card face zoom pe ruta
          li.onclick = () => {
             map.fitBounds(layer.getBounds(), { maxZoom: 13 });
             layer.setStyle({ weight: 5 });
             setTimeout(() => layer.setStyle({ weight: 2 }), 1500);
          };
  
          if (status === "green") { listGreen.appendChild(li); counts.green++; }
          if (status === "orange") { listOrange.appendChild(li); counts.orange++; }
          if (status === "red") { listRed.appendChild(li); counts.red++; }
        });
  
        document.getElementById("count-green").textContent = counts.green;
        document.getElementById("count-orange").textContent = counts.orange;
        document.getElementById("count-red").textContent = counts.red;
  
        if (routesLayer.getLayers().length) {
          map.fitBounds(routesLayer.getBounds(), { padding: [40,40] });
        }
      } catch(e) { console.error(e); }
    }
  
    openBtn.onclick = () => {
      companyName.textContent = currentCompany.name;
      panel.classList.remove("hidden");
    };
  
    closePanel.onclick = () => {
      panel.classList.add("hidden");
    };
});