// src/components/MiUbicacion.jsx
import React from "react";
import { useUbicacion } from "../hooks/useUbicacion";

export default function MiUbicacion() {
  const { ubicacion, errorUbicacion, cargando } = useUbicacion();

  if (cargando) return <p>Obteniendo ubicación...</p>;
  if (errorUbicacion) return <p>{errorUbicacion}</p>;

  return (
    <div>
      <h3>Ubicación actual</h3>
      <p><strong>Ciudad/Municipio:</strong> {ubicacion.ciudad}</p>
      <p><strong>Código Postal:</strong> {ubicacion.codigoPostal}</p>
      <p><strong>Dirección:</strong> {ubicacion.direccion}</p>
      <p><strong>Coordenadas:</strong> {ubicacion.lat}, {ubicacion.lng}</p>
    </div>
  );
}
