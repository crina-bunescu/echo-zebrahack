📁 Project: ECHO – Intelligent Visualization of Timber Transports

📌 General Description
ECHO is a web application developed during the ZebraHack 3.0 hackathon (December 13, 2025), which won the Award of Excellence. The application transforms raw data from SUMAL 2.0 into clear, easy-to-understand visual signals. Because it is very difficult for a regular user to identify whether a transport is normal or suspicious, ECHO interprets the timber transport routes and classifies them based on a custom anomaly detection algorithm.

🏆 Team Nova:
* Bunescu Crina Gabriela: Algorithm & Logic Lead (Route analysis and suspicion score calculation)
* Petre Ana Mihaela: Core Developer & Data Integration (API integration and map data visualization)
* Anton Maria Alexia: Frontend & UX/UI Designer (Design, interface and user experience)

▶️ Setup and Run
1. Clone the local repository.
2. Run the `index.html` file using a local server (e.g., Live Server extension in VS Code).
3. All calls to the ZebraHack API (`https://zebrahack.iqnox.tech`) are handled automatically via `zebrahack_client.js`.

📂 Module 1 – Route Analysis Algorithm (Suspicion Score)

📘 Description: 
The core mathematical and algorithmic logic module. It takes the GPS coordinates (GeoJSON) of a transport's routes and calculates the actual distance traveled vs. the number of reporting points.

🧪 Functionality: 
Generates a *Suspicion Score*, dividing the routes into 3 critical categories displayed on the map:
* 🟢 Plausible destination: Coherent route, sufficient points.
* 🟠 Uncertain destination: Moderate discrepancies in reporting.
* 🔴 Critical Tracking: Acute lack of GPS points (< 5) or high anomaly score (> 5.0).

📂 Module 2 – Interactive Map & Radius of Action (`map.js`)

📘 Description: 
Integrates the `Leaflet.js` library for spatial data visualization. It allows the identification of companies (Issuer / Receiver) and the drawing of specific action radii based on their activity center.

🧪 Functionality:
Live company search -> Display route polygons -> Display circle (action radius in km) -> Company details (Lat/Lon, last activity).

📂 Module 3 – API Processing & Data Integration (`zebrahack_client.js`)

📘 Description:
A custom client (`ZebraHackClient`) created to standardize `GET` HTTP requests to the IQNOX server. It uses `fetch` and passes the application key (`X-App-Key: echo`) to fetch the necessary data asynchronously.

🧪 Functionality:
Fetch routes -> Fetch company lists -> Health Check query (`/api/health`).

📂 Module 4 – UX/UI & Data Interface

📘 Description: 
Transforming rigid statistical data into a fluid and awareness-raising user experience. Includes loading animations, responsive design and progress bars that visually correlate the transported volume with the identified maximum limits.

🧪 Functionality:
Informative landing page (deforestation risks) -> Transports dashboard with tables and volume calculation by species (`calculeazaVolum()`).

