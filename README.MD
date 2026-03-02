📁 Proiect: ECHO – Vizualizarea inteligentă a transporturilor de lemn

📌 Descriere generală
ECHO este o aplicație web dezvoltată în cadrul hackathonului ZebraHack 3.0 (13 decembrie 2025), premiată cu Premiul de Excelență. Aplicația transformă datele brute din SUMAL 2.0 în semnale vizuale clare, ușor de înțeles. Deoarece pentru un utilizator obișnuit este foarte greu să identifice dacă un transport este normal sau suspect, ECHO interpretează rutele de transport al materialului lemnos și le clasifică pe baza unui algoritm personalizat de detecție a anomaliilor.

🏆 **Echipa Nova:**
* Bunescu Crina Gabriela: Algorithm & Logic Lead (Analiza rutelor și calculul scorului de suspiciune)
* Petre Ana Mihaela: Core Developer & Data Integration (Integrarea API-ului și afișarea datelor pe hartă)
* Anton Maria Alexia: Frontend & UX/UI Designer (Design, interfață și experiența utilizatorului)


▶️ Configurare și Rulare
1. Clonează repository-ul local.
2. Rulează fișierul `index.html` folosind un server local (ex. extensia Live Server din VS Code).
3. Toate apelurile către API-ul ZebraHack (`https://zebrahack.iqnox.tech`) sunt gestionate automat via `zebrahack_client.js`.

📂 Modul 1 – Algoritmul de Analiză a Rutelor (Scor de Suspiciune)

📘 Descriere: Modulul central de logică matematică și algoritmică. Preia coordonatele GPS (GeoJSON) ale rutelor dintr-un transport și calculează distanța reală parcursă vs. numărul de puncte de raportare.

🧪 Funcționalitate: Generează un *Scor de Suspiciune*, împărțind rutele în 3 categorii critice afișate pe hartă:
* 🟢 Destinație plauzibilă: Traseu coerent, puncte suficiente.
* 🟠 Destinație incertă: Discrepanțe moderate în raportare.
* 🔴 Tracking Critic: Lipsă acută de puncte GPS (< 5) sau scor de anomalie ridicat (> 5.0).

📂 Modul 2 – Harta Interactivă & Raza de Acțiune (`map.js`)

📘 Descriere: Integrează biblioteca `Leaflet.js` pentru o vizualizare spațială a datelor. Permite identificarea companiilor (Emitent / Destinatar) și desenarea razei de acțiune specifice pe baza centrului de activitate.

🧪 Funcționalitate:
Căutare live companie -> Afișare poligoane rute -> Afișare cerc (raza de acțiune în km) -> Detalii companie (Lat/Lon, ultima activitate).

📂 Modul 3 – Procesare API & Integrare Date (`zebrahack_client.js`)

📘 Descriere:
Un client personalizat (`ZebraHackClient`) creat pentru a standardiza cererile HTTP `GET` către serverul IQNOX. Folosește `fetch` și pasează cheia aplicației (`X-App-Key: echo`) pentru a obține datele necesare asincron.

🧪 Funcționalitate:
Preluare rute -> Preluare liste companii -> Interogare Health Check (`/api/health`).

📂 Modul 4 – UX/UI & Interfața de Date

📘 Descriere: Transformarea unor date statistice rigide într-o experiență de utilizare fluidă și conștientizatoare. Include animații de încărcare, design responsive și bare grafice de progres care corelează vizual volumul transportat cu limitele maxime identificate.

🧪 Funcționalitate:
Landing page informativ (riscurile defrișărilor) -> Dashboard transporturi cu tabele și calcul volum pe specii (`calculeazaVolum()`).
