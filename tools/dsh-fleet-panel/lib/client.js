// Pestana "Flota" para la sidebar derecha del DSH.
//
// Muestra el estado programatico (sin IA) de los agentes Cline: estado,
// motivo por el que ese estado es el que es, y la URL del frontend de cada
// agente. Los datos vienen del monitor desplegado en polanco, accesible en
// local por el tunel SSH (127.0.0.1:8444).
window.__ModuleLoader__.load({
  id: "@ciudadan/dsh-client-ui-fleet",
  factory: (require) => {
    require("@deepseek-ai/cordis");
    const react = require("react");
    const module = { exports: {} };
    const exports = module.exports;

    const h = react.createElement;
    const { useState, useEffect, useCallback } = react;

    const FLEET_ID = "@ciudadan/dsh-client-ui-fleet";
    const NS = "ciudadanFleet";
    const MONITOR = "http://127.0.0.1:8444";

    const ESTADOS = {
      WORKING: { label: "Trabajando", color: "#4ade80" },
      WAITING: { label: "Esperando", color: "#60a5fa" },
      IDLE: { label: "Inactivo", color: "#94a3b8" },
      SUSPECT: { label: "Sospecha", color: "#fbbf24" },
      STALLED: { label: "Atascado", color: "#fb923c" },
      DOWN: { label: "Caido", color: "#ef4444" },
      FAILED: { label: "Fallo", color: "#f87171" },
      UNOBSERVABLE: { label: "Sin senal", color: "#a855f7" },
      NO_SESSION: { label: "Sin sesion", color: "#64748b" },
    };

    function edad(ms) {
      if (!ms) return "-";
      const s = Math.floor((Date.now() - ms) / 1000);
      if (s < 60) return `hace ${s}s`;
      if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
      if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
      return `hace ${Math.floor(s / 86400)} d`;
    }

    function FleetTitle() {
      return h("span", { className: "dsh-fleet-title" }, "Flota");
    }

    function FleetBody() {
      const [data, setData] = useState(null);
      const [error, setError] = useState(null);
      const [verOtros, setVerOtros] = useState(false);

      const cargar = useCallback(() => {
        fetch(`${MONITOR}/api/v1/overview`, { cache: "no-store" })
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then((j) => {
            setData(j);
            setError(null);
          })
          .catch((e) => setError(String((e && e.message) || e)));
      }, []);

      useEffect(() => {
        cargar();
        const t = setInterval(cargar, 10000);
        return () => clearInterval(t);
      }, [cargar]);

      const estilos = {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: 12,
        color: "#e2e8f0",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        height: "100%",
        overflow: "auto",
      };

      if (error) {
        return h(
          "div",
          { style: estilos },
          h("div", { style: { color: "#f87171" } }, `No se pudo leer el monitor: ${error}`),
          h(
            "div",
            { style: { color: "#94a3b8" } },
            `El tunel SSH al monitor debe estar vivo: ssh -L 8444:127.0.0.1:8444 polanco-lan`
          )
        );
      }
      if (!data) return h("div", { style: estilos }, "Cargando estado de la flota...");

      const todos = data.agents || [];
      const agentes = todos.filter((a) => a.es_agente !== false);
      const otros = todos.filter((a) => a.es_agente === false);
      const cuenta = {};
      for (const a of agentes) {
        const k = a.estado_programatico || "UNOBSERVABLE";
        cuenta[k] = (cuenta[k] || 0) + 1;
      }

      const resumen = h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
        Object.keys(cuenta)
          .sort()
          .map((k) => {
            const e = ESTADOS[k] || { label: k, color: "#64748b" };
            return h(
              "span",
              {
                key: k,
                style: {
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 999,
                  border: `1px solid ${e.color}55`,
                  background: `${e.color}22`,
                  color: e.color,
                },
              },
              `${e.label} ${cuenta[k]}`
            );
          }),
        h(
          "a",
          {
            key: "abrir",
            href: MONITOR,
            target: "_blank",
            rel: "noreferrer",
            style: { marginLeft: "auto", color: "#7dd3fc", fontSize: 11, textDecoration: "none" },
          },
          "panel completo ↗"
        )
      );

      const fila = (a) => {
        const e = ESTADOS[a.estado_programatico] || { label: a.estado_programatico || "-", color: "#64748b" };
        const acc = a.access || {};
        const tarea = a.tarea || {};
        return h(
          "div",
          {
            key: a.id,
            style: {
              border: "1px solid #1e293b",
              borderRadius: 7,
              padding: "7px 9px",
              background: "#0f172a",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            },
          },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 7 } },
            h("b", { style: { fontSize: 12 } }, a.name),
            h(
              "span",
              {
                style: {
                  fontSize: 10,
                  padding: "0 6px",
                  borderRadius: 999,
                  border: `1px solid ${e.color}55`,
                  background: `${e.color}22`,
                  color: e.color,
                },
              },
              e.label
            ),
            acc.front_url
              ? h(
                  "a",
                  {
                    href: acc.front_url,
                    target: "_blank",
                    rel: "noreferrer",
                    style: { marginLeft: "auto", color: "#86efac", fontSize: 11, textDecoration: "none" },
                    title: acc.front_url,
                  },
                  "front ↗"
                )
              : null
          ),
          a.estado_motivo
            ? h("div", { style: { color: "#94a3b8" } }, a.estado_motivo)
            : null,
          h(
            "div",
            { style: { color: "#64748b", fontSize: 11, display: "flex", gap: 10, flexWrap: "wrap" } },
            h("span", null, `tarea: ${tarea.estado || "-"}`),
            h("span", null, `senal: ${edad((a.senal || {}).alive_ts_ms)}`),
            h("span", null, `progreso: ${edad((a.senal || {}).progress_ts_ms)}`)
          )
        );
      };

      return h(
        "div",
        { style: estilos },
        resumen,
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 6 } },
          agentes.map(fila)
        ),
        otros.length > 0
          ? h(
              "button",
              {
                onClick: () => setVerOtros((v) => !v),
                style: {
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  color: "#64748b",
                  fontSize: 11,
                  padding: "2px 8px",
                  cursor: "pointer",
                },
              },
              `otros contenedores (${otros.length})${verOtros ? " - ocultar" : " - ver"}`
            )
          : null,
        verOtros
          ? h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 6, opacity: 0.7 } },
              otros.map(fila)
            )
          : null
      );
    }

    const inject = ["slots", "locale", "sidebarRightTabs", "sidebarRight"];

    function apply(ctx) {
      ctx.effect(
        () =>
          ctx.locale.register(NS, {
            zh: { tab: "Flota" },
            en: { tab: "Fleet" },
          }),
        "ciudadan-fleet: dictionaries"
      );
      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.right.pane.tab", () =>
            ctx.slots.register(
              {
                name: "sidebar.right.pane.tab",
                key: FLEET_ID,
                locale: NS,
              },
              FleetBody
            )
          ),
        "ciudadan-fleet: fleet tab body"
      );
      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.right.pane.tab.title", () =>
            ctx.slots.register(
              {
                name: "sidebar.right.pane.tab.title",
                key: FLEET_ID,
              },
              FleetTitle
            )
          ),
        "ciudadan-fleet: fleet tab title"
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
