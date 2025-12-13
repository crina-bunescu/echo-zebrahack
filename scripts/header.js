document.addEventListener("DOMContentLoaded", () => {
    // active link
    const links = document.querySelectorAll(".nav-link");
    const current = window.location.pathname.split("/").pop();
  
    links.forEach(link => {
      if (link.getAttribute("href") === current) {
        link.classList.add("active");
      }
    });
  
    // burger menu
    const burger = document.getElementById("burger");
    const nav = document.getElementById("nav");
  
    if (burger) {
      burger.addEventListener("click", () => {
        nav.classList.toggle("open");
      });
    }
  });
  