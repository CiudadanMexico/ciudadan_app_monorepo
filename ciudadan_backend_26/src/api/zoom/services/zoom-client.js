"use strict";

const axios = require("axios");

class ZoomClient {
  constructor() {
    this.baseURL = "https://api.zoom.us/v2";
    this.authURL = "https://zoom.us/oauth/token";

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 8000,
      headers: { "Content-Type": "application/json" },
    });
  }

  async getAccessToken() {
    const cacheKey = "zoom_access_token";

    const cachedToken = await strapi
      .store({ type: "core", name: "zoom" })
      .get({ key: cacheKey });
    if (cachedToken) {
      return cachedToken;
    }

    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      throw new Error(
        "[ZoomService] Faltan variables de entorno para Zoom OAuth."
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    try {
      const { data } = await axios.post(
        `${this.authURL}?grant_type=account_credentials&account_id=${accountId}`,
        null,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const expiresInSeconds = (data.expires_in || 3600) - 300;
      await strapi.store({ type: "core", name: "zoom" }).set({
        key: cacheKey,
        value: data.access_token,
      });

      setTimeout(() => {
        strapi
          .store({ type: "core", name: "zoom" })
          .set({ key: cacheKey, value: null });
      }, expiresInSeconds * 1000);

      return data.access_token;
    } catch (error) {
      strapi.log.error(
        "[ZoomClient] Error al autenticar con Zoom OAuth",
        error.response?.data || error.message
      );
      throw new Error(
        "No se pudo establecer conexión con el proveedor de videollamadas."
      );
    }
  }

  async request(config) {
    const token = await this.getAccessToken();

    try {
      const response = await this.http({
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error(JSON.stringify(error.response.data, null, 2));
      } else {
        console.error("Error sin respuesta HTTP:", error.message);
      }
      strapi.log.error(`[ZoomClient] HTTP Error en ${config.url}`, {
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  async listMeetings(userId = "me", type = "scheduled") {
    return await this.request({
      method: "GET",
      url: `/users/${userId}/meetings`,
      params: {
        type,
        page_size: 30,
      },
    });
  }
}

module.exports = new ZoomClient();
