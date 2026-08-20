"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/zoom/account",
      handler: "zoom.getAccount",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/zoom/meetings",
      handler: "zoom.getMeetings",
      config: {
        auth: false,
      },
    },
  ],
};
