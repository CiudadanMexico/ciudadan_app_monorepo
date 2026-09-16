"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/skydropx/test-auth",
      handler: "skydropx.testAuth",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/skydropx/quotation",
      handler: "skydropx.createQuotation",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/skydropx/quotation/:id",
      handler: "skydropx.getQuotation",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/skydropx/consignment-notes",
      handler: "skydropx.getConsignmentNotes",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/skydropx/packagings",
      handler: "skydropx.getPackagings",
      config: {
        auth: false,
      },
    },
  ],
};