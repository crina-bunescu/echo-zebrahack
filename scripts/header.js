(async function injectHeader() {
    const mount = document.getElementById("site-header");
    if (!mount) return;
  
    try {
      // Fetch header.html relative to the site root
      // (works on GitHub Pages if files are served normally)
      const res = await fetch("header.html", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load header.html (${res.status})`);
  
      const html = await res.text();
      mount.innerHTML = html;
  
      // After injection, wire up active state + hamburger toggle
      setActiveNavLink();
      wireMobileMenu();
    } catch (err) {
      console.error(err);
      // Fallback minimal header (so the site still navigates)
      mount.innerHTML = `
        <header class="site-header" role="banner">
          <div class="header-inner">
            <a class="brand" href="index.html">ZebraHack 3.0</a>
            <nav class="site-nav" aria-label="Navigație principală">
              <a class="nav-link" href="index.html">Introducere</a>
              <a class="nav-link" href="app.html">Hartă / Rază</a>
            </nav>
          </div>
        </header>
      `;
      setActiveNavLink();
    }
  
    function normalizePageName(pathname) {
      const file = pathname.split("/").pop() || "index.html";
      // If served at root with no filename, treat as index.html
      return file === "" ? "index.html" : file;
    }
  
    function setActiveNavLink() {
      const current = normalizePageName(window.location.pathname);
  
      const links = mount.querySelectorAll(".nav-link");
      links.forEach((a) => {
        a.classList.remove("active");
        a.removeAttribute("aria-current");
      });
  
      // Map file -> route key
      let routeKey = "index";
      if (current.toLowerCase().includes("app")) routeKey = "app";
      if (current.toLowerCase().includes("map")) routeKey = "app";
  
      const active = mount.querySelector(`.nav-link[data-route="${routeKey}"]`);
      if (active) {
        active.classList.add("active");
        active.setAttribute("aria-current", "page");
      }
    }
  
    function wireMobileMenu() {
      const toggle = mount.querySelector(".nav-toggle");
      const menu = mount.querySelector("#nav-menu");
      if (!toggle || !menu) return;
  
      // Ensure initial closed state
      toggle.setAttribute("aria-expanded", "false");
  
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        menu.classList.toggle("open", !expanded);
      });
  
      menu.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          toggle.setAttribute("aria-expanded", "false");
          menu.classList.remove("open");
        });
      });
  
      // Close menu on ESC
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          toggle.setAttribute("aria-expanded", "false");
          menu.classList.remove("open");
        }
      });
    }
  })();
  