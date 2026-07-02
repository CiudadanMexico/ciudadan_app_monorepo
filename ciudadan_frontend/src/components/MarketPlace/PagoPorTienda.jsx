import React, { useState } from "react";
//import "../../styles/PagoPorTienda.css";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

/**
 * PagoPorTienda (mejorado)
 * - Deriva estado inicial desde `pedido.attributes` (si ya existe pago/comprobante/status).
 * - Evita crear pagos duplicados: si `pedido.attributes.pago_id` existe -> reutiliza.
 * - Flujo OP.3: crear pago (si no existe) -> upload SIN ref -> asociar al pago -> actualizar pedido.
 * - Limpia UI: desactiva input/boton cuando ya subido, cambia texto/color, muestra link si hay url.
 * - Emite evento global "cart:paymentUploaded" y llama onPagoSubido(...) si existe.
 * - Muchos logs "cart y emojis".
 */
const PagoPorTienda = ({ pedido, onPagoSubido }) => {
  // ---------- DERIVAR ESTADO INICIAL desde pedido.attributes ----------
  // Puede venir en diferentes formas según Strapi. Extraemos con defensiva.
  const initialPagoId =
    pedido?.attributes?.pago_id ||
    pedido?.attributes?.pagoId ||
    pedido?.attributes?.pago ||
    null;

  // posible comprobante ya guardado en attributes.comprobante (expanded) o attributes.comprobante (array)
  const existingComprobanteData =
    pedido?.attributes?.comprobante?.data ||
    (Array.isArray(pedido?.attributes?.comprobante) ? pedido.attributes.comprobante[0] : null) ||
    null;

  const existingFileId = existingComprobanteData?.id || null;
  const existingFileUrl =
    existingComprobanteData?.attributes?.url ||
    existingComprobanteData?.url ||
    null;

  // Si el pedido ya tiene pago_id o comprobante o status de pagado/en revisión -> consideramos "uploaded" true
  const initialUploaded =
    Boolean(initialPagoId) ||
    Boolean(existingFileId) ||
    ["pago_en_revision", "pagado"].includes(pedido?.attributes?.status);

  // Estados locales (inicializados desde pedido para resistir remounts)
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const [uploaded, setUploaded] = useState(initialUploaded);
  const [uploadedFileId, setUploadedFileId] = useState(existingFileId);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(existingFileUrl);
  const [pagoIdState, setPagoIdState] = useState(initialPagoId);

  // ---------- Normalización de la tienda (store) ----------
  const store =
    pedido?.attributes?.store || {
      name: "Tienda sin nombre",
      banco: "—",
      clabe_bancaria: "—",
      nombre_bancario: "—",
    };

  // LOG: estado inicial del componente al renderizarlo
  console.log("cart y emojis - PagoPorTienda render:", {
    pedido,
    store,
    archivo,
    subiendo,
    error,
    uploaded,
    uploadedFileId,
    uploadedFileUrl,
    pagoIdState,
  });

  // Si el pedido ya está en revisión o pagado explicitamente, renderizamos mensaje y no permitimos subir
  if (
    pedido?.attributes?.status === "pago_en_revision" ||
    pedido?.attributes?.status === "pagado"
  ) {
    console.log(
      "cart y emojis - PagoPorTienda: pedido ya tiene pago o está en revisión:",
      pedido?.attributes?.status
    );
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

    try {
      // ---------------- 0) Reusar pago existente si lo hay ----------------
      let pagoId = pagoIdState;
      if (pagoId) {
        console.log("cart y emojis - reutilizando pago existente:", pagoId);
      } else {
        // ---------------- 1) Crear el recurso 'pago' en Strapi ----------------
        const montoNumeric = Number(
          pedido?.attributes?.monto_total ??
            pedido?.attributes?.monto ??
            pedido?.attributes?.total ??
            0
        );

        const pagoPayload = {
          data: {
            pedido: pedido.id,
            monto: montoNumeric,
            tipo: "carrito",
            status: "pendiente_verificacion",
          },
        };

        console.log("cart y emojis - creando pago, payload:", pagoPayload);

        const pagoRes = await fetch(`${STRAPI_URL}/api/pagos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pagoPayload),
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

        pagoId = pagoJson?.data?.id;
        if (!pagoId) {
          console.error("cart y emojis - pago creado sin id:", pagoJson);
          throw new Error("Respuesta inválida al crear pago (sin id).");
        }
        setPagoIdState(pagoId);
      }

      // ---------------- 2) Subir archivo SIN ref (upload "independiente") ----------------
      console.log("cart y emojis - subiendo archivo SIN ref", {
        archivoName: archivo?.name,
        archivoType: archivo?.type,
        archivoSize: archivo?.size,
        pagoId,
      });

      const formData = new FormData();
      formData.append("files", archivo);

      const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadBody = await parseResponse(uploadRes);
        console.groupCollapsed("cart y emojis - ERROR subiendo comprobante SIN ref (detalle)");
        console.warn("cart y emojis - status:", uploadRes.status, uploadRes.statusText);
        console.warn("cart y emojis - headers:", Array.from(uploadRes.headers.entries()));
        console.warn("cart y emojis - body:", uploadBody);
        console.groupEnd();
        throw new Error(
          `Error subiendo comprobante (sin ref): ${uploadRes.status} ${uploadRes.statusText} — ${JSON.stringify(
            uploadBody
          )}`
        );
      }

      const uploadJson = await uploadRes.json();
      console.log("cart y emojis - comprobante subido SIN ref (raw):", uploadJson);

      // Extraer id y url si están presentes
      const firstFile =
        (Array.isArray(uploadJson) && uploadJson[0]) ||
        (uploadJson?.data && uploadJson.data[0]) ||
        null;

      const fileId = firstFile?.id || null;
      const fileUrl =
        firstFile?.attributes?.url ||
        firstFile?.url ||
        (firstFile?.formats && firstFile.formats?.thumbnail?.url) ||
        null;

      if (!fileId) {
        console.error("cart y emojis - no se obtuvo file.id tras upload:", uploadJson);
        throw new Error("No se obtuvo file.id tras subir archivo.");
      }

      console.log("cart y emojis - archivo subido con id, url:", { fileId, fileUrl });
      setUploadedFileId(fileId);
      setUploadedFileUrl(fileUrl);

      // ---------------- 3) Asociar el archivo al pago (PUT /api/pagos/:pagoId) ----------------
      let pagoUpdateSuccess = false;

      const tryAssociateToPago = async () => {
        // Forma A: comprobante: fileId (campo single media)
        try {
          console.log("cart y emojis - intentando asociar archivo al pago (A: single id)", {
            pagoId,
            fileId,
          });
          const updA = await fetch(`${STRAPI_URL}/api/pagos/${pagoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { comprobante: fileId } }),
          });
          if (updA.ok) {
            const js = await updA.json().catch(() => null);
            console.log("cart y emojis - asociacion al pago OK (A):", js);
            pagoUpdateSuccess = true;
            return;
          } else {
            const body = await parseResponse(updA);
            console.warn("cart y emojis - asociacion A falló:", updA.status, body);
          }
        } catch (e) {
          console.warn("cart y emojis - excepción asociando A:", e);
        }

        // Forma B: comprobante: [fileId] (campo multiple media)
        try {
          console.log("cart y emojis - intentando asociar archivo al pago (B: array)", {
            pagoId,
            fileId,
          });
          const updB = await fetch(`${STRAPI_URL}/api/pagos/${pagoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { comprobante: [fileId] } }),
          });
          if (updB.ok) {
            const js = await updB.json().catch(() => null);
            console.log("cart y emojis - asociacion al pago OK (B):", js);
            pagoUpdateSuccess = true;
            return;
          } else {
            const body = await parseResponse(updB);
            console.warn("cart y emojis - asociacion B falló:", updB.status, body);
          }
        } catch (e) {
          console.warn("cart y emojis - excepción asociando B:", e);
        }

        // Forma C: comprobante: { connect: fileId }
        try {
          console.log("cart y emojis - intentando asociar archivo al pago (C: connect)", {
            pagoId,
            fileId,
          });
          const updC = await fetch(`${STRAPI_URL}/api/pagos/${pagoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: { comprobante: { connect: fileId } } }),
          });
          if (updC.ok) {
            const js = await updC.json().catch(() => null);
            console.log("cart y emojis - asociacion al pago OK (C):", js);
            pagoUpdateSuccess = true;
            return;
          } else {
            const body = await parseResponse(updC);
            console.warn("cart y emojis - asociacion C falló:", updC.status, body);
          }
        } catch (e) {
          console.warn("cart y emojis - excepción asociando C:", e);
        }
      };

      await tryAssociateToPago();

      if (!pagoUpdateSuccess) {
        console.warn(
          "cart y emojis - no se pudo asociar el archivo al pago (ninguna forma funcionó).",
          { pagoId, fileId }
        );
      } else {
        console.log("cart y emojis - archivo asociado al pago con éxito");
      }

      // ---------------- 4) Actualizar pedido asociando pago_id y status ----------------
      const pedidoUpdatePayload = {
        data: {
          status: "enviar",
          pago_id: pagoId,
        },
      };

      console.log("cart y emojis - actualizando pedido:", pedido?.id, pedidoUpdatePayload);

      const pedidoRes = await fetch(`${STRAPI_URL}/api/pedidos/${pedido.id}`, {
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
      console.log("cart y emojis - flujo completado correctamente para pedido:", pedido.id, {
        pagoId,
        fileId,
        fileUrl,
        pagoUpdateSuccess,
      });

      // Llamada callback al padre si existe
      if (typeof onPagoSubido === "function") {
        try {
          console.log("cart y emojis - llamando onPagoSubido callback:", {
            pedidoId: pedido.id,
            pagoId,
            fileId,
            fileUrl,
            pagoUpdateSuccess,
          });
          onPagoSubido(pedido.id, pagoId, fileId, pagoUpdateSuccess);
        } catch (cbErr) {
          console.warn("cart y emojis - onPagoSubido lanzó error:", cbErr);
        }
      }

      // Emitir evento global para que el padre (o cualquier listener) pueda actualizar su estado
      try {
        const detail = {
          pedidoId: pedido.id,
          pagoId,
          fileId,
          fileUrl,
          pagoUpdateSuccess,
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
    <div className="pago-tienda" style={{ border: "1px solid #e0e0e0", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Pago a {store?.name || "Tienda sin nombre"}</h3>

      <div className="datos-bancarios" style={{ marginBottom: 12 }}>
        <p>
          <strong>Banco:</strong> {store?.banco || "—"}
        </p>
        <p>
          <strong>CLABE:</strong> {store?.clabe_bancaria || "—"}
        </p>
        <p>
          <strong>Beneficiario:</strong> {store?.nombre_bancario || "—"}
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

      <div className="subir-comprobante" style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
      </div>

      {uploaded && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, color: "#2e7d32" }}>
            Comprobante subido correctamente.
          </p>
          {uploadedFileUrl ? (
            <a href={uploadedFileUrl} target="_blank" rel="noreferrer">
              Ver comprobante
            </a>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
              Archivo registrado en Strapi (ID: {uploadedFileId})
            </p>
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

export default PagoPorTienda;
