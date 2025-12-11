(function (global) {
  /**
   * ZebraHackClient encapsulates base URL handling, common headers, and JSON
   * parsing so UI code can call the API consistently.
   */
  class ZebraHackClient {
    /**
     * @param {{ baseUrl?: string; appKey?: string }} [config]
     */
    constructor({
      baseUrl = "https://zebrahack.iqnox.tech",
      appKey = "",
    } = {}) {
      this.baseUrl = baseUrl.replace(/\/$/, "");
      this.appKey = appKey;
    }

    /**
     * Perform a GET request with JSON parsing and error handling.
     * @param {string} path
     * @returns {Promise<any>}
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
        throw new Error(text || "Health check failed");
      }

      return response.json();
    }

    /**
     * Convenience wrapper for `/api/health`.
     * @returns {Promise<any>}
     */
    health() {
      return this.request("/api/health");
    }

    // TODO: add implementations for the other endpoints that you need to implement the challange for your project.
  }

  global.ZebraHackApi = {
    ZebraHackClient,
    /**
     * @param {{ baseUrl?: string; appKey?: string }} [config]
     */
    createClient: (config) => new ZebraHackClient(config || {}),
  };
})(window);
