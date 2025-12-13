// Așteptăm ca întregul DOM să fie încărcat înainte de a rula codul
document.addEventListener("DOMContentLoaded", () => {

  // Endpoint-ul ZebraHack pentru listarea companiilor
  const API_URL = "https://zebrahack.iqnox.tech/api/companies";

  // Cheia API (
  const APP_KEY = "echo";

  //elemente UI
  // Selector pentru tipul companiei (emitent / destinatar)
  const roleEl = document.getElementById("role");

  // Input text pentru căutarea după numele companiei
  const searchEl = document.getElementById("search");

  // Zonă pentru mesaje de status 
  const statusEl = document.getElementById("companies-status");

  // Containerul în care afișăm lista de companii
  const listEl = document.getElementById("companies-list");

  // Verificare de siguranță – dacă lipsesc elemente din HTML
  if (!roleEl || !searchEl || !statusEl || !listEl) {
    console.error("Elemente HTML lipsă pentru Task 3");
    return;
  }

  
//debounce pentru a nu se face request la fiecare tasta scris
  let debounceTimer = null;


  // Setează mesajul de status pentru utilizator
  function setStatus(text) {
    statusEl.textContent = text;
  }

  // Curăță lista de companii afișată
  function clearList() {
    listEl.innerHTML = "";
  }

  // Creează și afișează un element pentru o companie
  function renderCompany(company) {
    const div = document.createElement("div");
    div.className = "company-item";

    // Afișăm numele companiei, rolul, numărul de transporturi
    // și un buton care duce către pagina de hartă (Task4)
    div.innerHTML = `
      <strong>${company.name}</strong><br>
      <small>
        ${company.role} • ${company.transport_count} transporturi
      </small><br><br>

      <a
        href="map.html?company=${encodeURIComponent(company.name)}&role=${company.role}"
        class="view-map-btn"
      >
        Vezi harta
      </a>
    `;

    listEl.appendChild(div);
  }

 //request api pt lista de companii
  async function fetchCompanies() {
    const role = roleEl.value;               // emitent / destinatar
    const search = searchEl.value.trim();    // textul introdus

    // Afișăm mesaj de încărcare
    setStatus("Se încarcă...");
    clearList();

    // Construim parametrii de query
    const params = new URLSearchParams();
    params.set("role", role);
    if (search) params.set("search", search);

    try {
      // Trimitem request GET către API
      const response = await fetch(
        `${API_URL}?${params.toString()}`,
        {
          headers: {
            "Accept": "application/json",
            "X-App-Key": APP_KEY
          }
        }
      );

      // Verificăm dacă răspunsul este valid
      if (!response.ok) {
        throw new Error("Eroare API: " + response.status);
      }

    
      const data = await response.json();
      const companies = data.companies;

      // Dacă nu există rezultate
      if (!companies || companies.length === 0) {
        setStatus("Niciun rezultat");
        return;
      }

      // Afișăm rezultatele
      setStatus(`Rezultate: ${companies.length}`);
      companies.forEach(renderCompany);

    } catch (err) {
      console.error(err);
      setStatus("Eroare la încărcare");
    }
  }

  
  // Evităm request-uri multiple rapide (ex: la tastare)
  function debouncedFetch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchCompanies, 300);
  }

  // Când se schimbă tipul companiei
  roleEl.addEventListener("change", debouncedFetch);

  // Când utilizatorul tastează în câmpul de căutare
  searchEl.addEventListener("input", debouncedFetch);

  // Mesaj inițial
  setStatus("Selectează tipul de companie și caută.");
});
