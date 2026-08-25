"use strict";

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    const path = require("path");
    const fs = require("fs");

    if (!strapi.dirs?.static?.public) {
      const appDir = strapi.dirs?.app?.root || process.cwd();
      strapi.dirs.static = strapi.dirs.static || {};
      strapi.dirs.static.public = path.resolve(appDir, "public");
    }

    const uploadsDir = path.join(strapi.dirs.static.public, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  },
};
