document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("health-btn");
  const statusEl = document.getElementById("health-status");
  if (!button || !statusEl) {
    return;
  }

  // Create a temporary client that knows how to talk to the ZebraHack API.
  const zebraApi = ZebraHackApi.createClient({
    // Replace with your team name
    appKey: "REPLACE_WITH_TEAM_NAME",
  });

  // Runs the health-check when the button is clicked, updating the status text.
  const runHealthCheck = async (event) => {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    statusEl.textContent = "Checking health...";
    try {
      const result = await zebraApi.health();
      statusEl.textContent = `Health: ${JSON.stringify(result)}`;
    } catch (err) {
      statusEl.textContent = `Health check failed: ${err.message}`;
    }
  };

  button.addEventListener("click", runHealthCheck);
});
