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
  
    const listGreen = document.getElementById("list-green");
    const listOrange = document.getElementById("list-orange");
    const listRed = document.getElementById("list-red");
    const companyName = document.getElementById("company-name");
  
    let currentCompany = null;
  
    // SEARCH
    input.addEventListener("input", async () => {
      const q = input.value.trim();
      if (q.length < 2) {
        results.innerHTML = "";
        return;
      }
  
      const url = new URL("https://zebrahack.iqnox.tech/api/companies");
      url.searchParams.set("role", roleSelect.value);
      url.searchParams.set("search", q);
  
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
  
    async function loadRoutes(c) {
      routesLayer.clearLayers();
      listGreen.innerHTML = "";
      listOrange.innerHTML = "";
      listRed.innerHTML = "";
  
      const url = new URL("https://zebrahack.iqnox.tech/api/routes");
      url.searchParams.set("company", c.name);
      url.searchParams.set("role", c.role);
  
      const res = await fetch(url, { headers: { "X-App-Key": APP_KEY }});
      const data = await res.json();
  
      (data.routes || []).forEach(r => {
        if (!r.geometry) return;
  
        const status = r.point_count < 5 ? "red" : "green";
        const color =
          status === "green" ? "#2e7d32" :
          status === "orange" ? "#f57c00" : "#c62828";
  
        L.geoJSON(r.geometry, { style: { color, weight: 1.4 }}).addTo(routesLayer);
  
        const li = document.createElement("li");
        li.textContent = `Transport ${r.transport_id} – puncte GPS: ${r.point_count}`;
  
        if (status === "green") listGreen.appendChild(li);
        if (status === "orange") listOrange.appendChild(li);
        if (status === "red") listRed.appendChild(li);
      });
  
      if (routesLayer.getLayers().length) {
        map.fitBounds(routesLayer.getBounds(), { padding: [40,40] });
      }
    }
  
    openBtn.onclick = () => {
      companyName.textContent = currentCompany.name;
      panel.classList.remove("hidden");
    };
  
    closePanel.onclick = () => {
      panel.classList.add("hidden");
    };
  });
  