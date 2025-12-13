(function (global) {
 class ZebraHackClient {
    /**
      @param {{ baseUrl?: string; appKey?: string }} [config]
     */
    constructor({
      baseUrl = "https://zebrahack.iqnox.tech",
      appKey = "",
    } = {}) {
      this.baseUrl = baseUrl.replace(/\/$/, "");
      this.appKey = appKey;
    }

    /**
     
      @param {string} path
      @returns {Promise<any>}
     */
    async request(path) {
      const headers = {
        "Content-Type": "application/json",
      };
      if (this.appKey) {
        headers["X-App-Key"] = this.appKey;
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP error ${response.status}`);
      }

      return response.json();
    }

    /**
     
      @returns {Promise<any>}
     */
    health() {
      return this.request("/api/health");
    }

  companies(role, search = "") {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    params.set("search", search || "");
    return this.request(`/api/companies?${params.toString()}`);
  }

  routes(company, role) {
    const params = new URLSearchParams({ company, role });
    return this.request(`/api/routes?${params.toString()}`);
  }

  }

  global.ZebraHackApi = {
    ZebraHackClient,
    /**
      @param {{ baseUrl?: string; appKey?: string }} [config]
     */
    createClient: (config) => new ZebraHackClient(config || {}),
  };
})(window);
