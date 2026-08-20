import { useAuth0 } from "@auth0/auth0-react";
import React, { useState } from "react";
import { useRoles } from "../../Contexts/RolesContext";
//import "../../styles/PagoPorTienda.css";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const PagoPedidoRestaurante = ({ pedido, onPagoSubido, tipoPago = "comida" }) => {
  const { user } = useAuth0();
  const { userData } = useRoles();
  // ---------- DERIVAR ESTADO INICIAL desde pedido.attributes ----------
  // Puede venir en diferentes formas según Strapi. Extraemos con defensiva.
  const initialPagoId = pedido?.attributes?.pago_id ?? pedido?.attributes?.pago ?? null;

  // posible comprobante ya guardado en attributes.comprobante (expanded) o attributes.comprobante (array)
  const existingComprobanteData = pedido?.attributes?.comprobante?.data ?? (Array.isArray(pedido?.attributes?.comprobante) ? pedido.attributes.comprobante[0] : null) ?? null;

  const existingFileId = existingComprobanteData?.id || null;
  const existingFileUrl = existingComprobanteData?.attributes?.url || existingComprobanteData?.url || null;

  // Si el pedido ya tiene pago_id o comprobante o status de pagado/en revisión -> consideramos "uploaded" true
  const initialUploaded = Boolean(initialPagoId) || Boolean(existingFileId) || ["pago_en_revision", "pagado"].includes(pedido?.attributes?.status);

  // Estados locales (inicializados desde pedido para resistir remounts)
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const [uploaded, setUploaded] = useState(initialUploaded);
  const [uploadedFileId, setUploadedFileId] = useState(existingFileId);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(existingFileUrl);
  const [pagoIdState, setPagoIdState] = useState(initialPagoId);

  // ---------- Normalización de la tienda (store) ----------
  const restaurant = pedido?.attributes?.restaurant ?? {
    name: "Tienda sin nombre",
    banco: "—",
    clabe_bancaria: "—",
    nombre_bancario: "—",
  };

  // LOG: estado inicial del componente al renderizarlo
  console.log("cart y emojis - PagoPorTienda render:", {
    pedido,
    restaurant,
    archivo,
    subiendo,
    error,
    uploaded,
    uploadedFileId,
    uploadedFileUrl,
    pagoIdState,
  });

  // Si el pedido ya está en revisión o pagado explicitamente, renderizamos mensaje y no permitimos subir
  if (pedido?.attributes?.status === "pendiente_verificacion" ?? pedido?.attributes?.status === "pendiente_envio") {
    console.log("cart y emojis - PagoPorTienda: pedido ya tiene pago o está en revisión:", pedido?.attributes?.status);
    return (
      <div className="pago-tienda bloque-ok">
        <h4>Pago enviado</h4>
        <p>Tu comprobante está siendo verificado.</p>
      </div>
    );
  }

  // ----------------- Función utilitaria: parsear respuesta (robusta) -----------------
  const parseResponse = async (res) => {
    try {
      const json = await res.clone().json();
      return json;
    } catch (e) {
      try {
        const text = await res.clone().text();
        return text;
      } catch (ee) {
        return null;
      }
    }
  };

  // ----------------- Manejo de subida de comprobante (OPCIÓN 3 mejorado) -----------------
  const handleSubirComprobante = async () => {
    console.log("cart y emojis - handleSubirComprobante llamado", {
      archivo,
      pedidoId: pedido?.id,
      uploaded,
      pagoIdState,
    });

    // Si ya está subido localmente, no hacemos nada
    if (uploaded) {
      console.log("cart y emojis - handleSubirComprobante: ya subido, nothing to do");
      return;
    }

    // Validaciones
    if (!archivo) {
      console.warn("cart y emojis - no hay archivo seleccionado, abortando.");
      setError("Selecciona un archivo antes de subir.");
      return;
    }

    if (!pedido?.id) {
      console.error("cart y emojis - pedido inválido, falta pedido.id", pedido);
      setError("Pedido inválido. Revisa la consola.");
      return;
    }

    setSubiendo(true);
    setError(null);

    console.log("cart y emojis - subiendo archivo SIN ref", {
      archivoName: archivo?.name,
      archivoType: archivo?.type,
      archivoSize: archivo?.size,
    });

    try {
      // ---------------- 1) Reusar pago existente si lo hay ----------------
      let pagoId = pagoIdState;
      if (pagoId) {
        console.log("cart y emojis - reutilizando pago existente:", pagoId);
      } else {
        // ---------------- 2) Crear el recurso 'pago' en Strapi ----------------
        const montoNumeric = Number(pedido?.attributes?.monto_total ?? pedido?.attributes?.monto ?? pedido?.attributes?.total ?? 0);

        const formPedido = new FormData();

        const pagoPayload = {
          tipo: tipoPago,
          fecha_pagado: new Date().toISOString(),
          usuario: userData?.id,
          monto: montoNumeric,
          status: "pendiente_verificacion",
          food_order: pedido.id,
          usuario_email: user?.email,
          food_restaurant: restaurant?.id,
        };

        console.log("cart y emojis - creando pago, payload:", pagoPayload);

        formPedido.append("data", JSON.stringify(pagoPayload));
        formPedido.append("files.comprobante", archivo);
        const pagoRes = await fetch(`${STRAPI_URL}/api/pagos`, {
          method: "POST",
          body: formPedido,
        });

        if (!pagoRes.ok) {
          const errBody = await parseResponse(pagoRes);
          console.groupCollapsed("cart y emojis - ERROR creando pago (detalle)");
          console.warn("cart y emojis - status:", pagoRes.status, pagoRes.statusText);
          console.warn("cart y emojis - headers:", Array.from(pagoRes.headers.entries()));
          console.warn("cart y emojis - body:", errBody);
          console.groupEnd();
          throw new Error(
            `Error creando pago: ${pagoRes.status} ${pagoRes.statusText} — ${JSON.stringify(
              errBody
            )}`
          );
        }

        const pagoJson = await pagoRes.json();
        console.log("cart y emojis - pago creado (raw):", pagoJson);

        pagoId = pagoJson?.data;
        if (!pagoId) {
          console.error("cart y emojis - pago creado sin id:", pagoJson);
          throw new Error("Respuesta inválida al crear pago (sin id).");
        }
        setPagoIdState(pagoId);
      }

      // ---------------- 3) Actualizar pedido asociando pago_id y status ----------------
      const pedidoUpdatePayload = {
        data: {
          pago: pagoId?.id,
        },
      };

      console.log("cart y emojis - actualizando pedido:", pedido?.id, pedidoUpdatePayload);

      const pedidoRes = await fetch(`${STRAPI_URL}/api/food-orders/${pedido.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pedidoUpdatePayload),
      });

      if (!pedidoRes.ok) {
        const pedidoBody = await parseResponse(pedidoRes);
        console.groupCollapsed("cart y emojis - ERROR actualizando pedido (detalle)");
        console.warn("cart y emojis - status:", pedidoRes.status, pedidoRes.statusText);
        console.warn("cart y emojis - headers:", Array.from(pedidoRes.headers.entries()));
        console.warn("cart y emojis - body:", pedidoBody);
        console.groupEnd();
        throw new Error(
          `Error actualizando pedido: ${pedidoRes.status} ${pedidoRes.statusText} — ${JSON.stringify(
            pedidoBody
          )}`
        );
      }

      const pedidoUpdatedJson = await pedidoRes.json();
      console.log("cart y emojis - pedido actualizado (raw):", pedidoUpdatedJson);

      // ----------------- MARCAR ÉXITO EN LA UI Y NOTIFICAR AL PADRE -----------------
      setUploaded(true);
      setArchivo(null); // limpiamos el input visualmente

      // Llamada callback al padre si existe
      if (typeof onPagoSubido === "function") {
        try {
          onPagoSubido(pedido.id, pagoId);
        } catch (cbErr) {
          console.warn("cart y emojis - onPagoSubido lanzó error:", cbErr);
        }
      }

      // Emitir evento global para que el padre (o cualquier listener) pueda actualizar su estado
      try {
        const detail = {
          pedidoId: pedido.id,
          pagoId,
        };
        console.log("cart y emojis - dispatching event cart:paymentUploaded", detail);
        window.dispatchEvent(new CustomEvent("cart:paymentUploaded", { detail }));
      } catch (evErr) {
        console.warn("cart y emojis - error dispatching event:", evErr);
      }
    } catch (err) {
      console.error("cart y emojis - Hubo un error en handleSubirComprobante:", err);
      setError(
        "Hubo un problema al subir el comprobante. Intenta de nuevo. " +
        (err?.message ? `Detalle: ${err.message}` : "")
      );
    } finally {
      console.log("cart y emojis - handleSubirComprobante finalizado, limpiando estado subiendo");
      setSubiendo(false);
    }
  }; // FIN handleSubirComprobante

  // ----------------- Render / JSX -----------------
  return (
    <div className="pago-tienda">
      {/* Estilos responsivos embebidos: evitan depender de una hoja externa
        y resuelven el desborde en pantallas angostas */}
      <style>{`
        .pago-tienda {
          border: 1px solid #e0e0e0;
          padding: 12px;
          border-radius: 8px;
          box-sizing: border-box;
          max-width: 100%;
        }
        .pago-tienda * {
          box-sizing: border-box;
        }
        .pago-tienda .subir-comprobante {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .pago-tienda .subir-comprobante input[type="file"] {
          flex: 1 1 100%;
          max-width: 100%;
          min-width: 0;
        }
        .pago-tienda .subir-comprobante button {
          flex: 1 1 auto;
          min-width: 0;
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .pago-tienda .subir-comprobante input[type="file"] {
            font-size: 13px;
          }
          .pago-tienda .subir-comprobante button {
            flex: 1 1 100%;
            width: 100%;
          }
        }
      `}
      </style>

      <h3 style={{ marginTop: 0 }}>Pago a {restaurant?.attributes?.nombre || "Tienda sin nombre"}</h3>

      <div className="datos-bancarios" style={{ marginBottom: 12 }}>
        <p>
          <strong>Banco:</strong> {restaurant?.attributes?.banco || "—"}
        </p>
        <p>
          <strong>CLABE:</strong> {restaurant?.attributes?.clabe_bancaria || "—"}
        </p>
        <p>
          <strong>Beneficiario:</strong> {restaurant?.attributes?.nombre_bancario || "—"}
        </p>

        <p className="monto" style={{ marginTop: 8 }}>
          Monto a pagar:{" "}
          <strong>
            $
            {Number(
              pedido?.attributes?.monto_total ??
              pedido?.attributes?.monto ??
              pedido?.attributes?.total ??
              0
            ).toFixed(2)}
          </strong>
        </p>
      </div>

      <div className="subir-comprobante">
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            console.log("cart y emojis - archivo seleccionado:", e.target.files[0]);
            setArchivo(e.target.files[0]);
            setError(null);
          }}
          disabled={uploaded || subiendo}
        />

        <button
          disabled={subiendo || uploaded}
          onClick={handleSubirComprobante}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            cursor: subiendo || uploaded ? "not-allowed" : "pointer",
            background: uploaded ? "#2e7d32" : "#1976d2",
            color: "#fff",
            opacity: subiendo ? 0.8 : 1,
          }}
        >
          {uploaded ? "Comprobante subido ✓" : subiendo ? "Subiendo comprobante..." : "Subir comprobante"}
        </button>
        {/* Botón de acción de transferir - falta lógica necesaria
        <button
          disabled
          onClick={() => console.log("Action transferir")}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: "#2e7d32",
            color: "#fff",
            opacity: subiendo ? 0.8 : 1,
          }}
        >
          Pagar pedido
        </button> */}
      </div>

      {uploaded && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, color: "#2e7d32" }}>
            Comprobante subido correctamente.
          </p>
          {uploadedFileUrl && (
            <a href={uploadedFileUrl} target="_blank" rel="noreferrer">
              Ver comprobante
            </a>
          )}
        </div>
      )}

      {error && (
        <p className="error" style={{ color: "#b00020", marginTop: 10 }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default PagoPedidoRestaurante;
