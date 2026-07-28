// src/components/Taxis/AcceptTrip.jsx
import React from "react";

export default function AcceptTrip({ selectedOffer, acceptOffer, closeModal }) {
  if (!selectedOffer) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        zIndex: 99999,
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
      }}
      onClick={closeModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "320px",
          background: "#fff",
          borderRadius: 10,
          padding: 18,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Oferta del conductor</h3>

        <p style={{ fontSize: 18, margin: "8px 0" }}>
          <strong>Precio:</strong> ${selectedOffer.price}
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 12,
          }}
        >
          <button
            onClick={closeModal}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>

          <button
            onClick={acceptOffer}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "#00c853",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
