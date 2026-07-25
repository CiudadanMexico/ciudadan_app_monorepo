// src/components/Taxis/AcceptTrip.jsx
import React, { useState, useEffect } from "react";

export default function AcceptTrip({ selectedOffer, acceptOffer, closeModal }) {
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const strapiUrl = process.env.REACT_APP_STRAPI_URL || "";
  const strapiToken = process.env.REACT_APP_STRAPI_TOKEN || "";

  //if (!selectedOffer) return null;

  // Obtener datos del conductor desde Strapi por email
  useEffect(() => {
    if (!selectedOffer?.driverId) return;

    const fetchDriverData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!strapiUrl) {
          throw new Error("STRAPI URL no configurado");
        }
        const headers = {
          'Content-Type': 'application/json',
        };
        if (strapiToken) {
          headers.Authorization = `Bearer ${strapiToken}`;
        }

        // Buscar usuario por email (driverId es el email del conductor)
        const driverEmail = selectedOffer.driverId;
        const url = `${strapiUrl}/api/drivers?filters[email][$eq]=${driverEmail}&populate=*`;

        const userResponse = await fetch(url, { headers });
        if (!userResponse.ok) {
          throw new Error("Error buscando usuario en Strapi");
        }

        const userData = await userResponse.json();
        console.log("[AcceptTrip] userData:", userData);

        // Strapi v4 retorna { data: [...] }
        const drivers = userData?.data || userData || [];
        const driver = Array.isArray(drivers) ? drivers[0] : drivers;

        if (!driver) {
          throw new Error("No se encontró conductor");
        }

        // Extraer datos del conductor (en Strapi v4 están en .attributes)
        const driverAttributes = driver?.attributes || driver;
        const driverId = driver?.id;

        // Buscar vehículos asociados al conductor
        let vehiclesData = [];
        try {
          const vehiclesUrl = `${strapiUrl}/api/carros?filters[conductoremail][$eq]=${driverEmail}&populate=*`;
          const vehiclesResponse = await fetch(vehiclesUrl, { headers });
          if (vehiclesResponse.ok) {
            const vData = await vehiclesResponse.json();
            const vehArray = vData?.data || vData || [];
            vehiclesData = Array.isArray(vehArray) ? vehArray : [vehArray];
          }
        } catch (e) {
          console.warn("[AcceptTrip] Error obteniendo vehículos:", e);
        }

        setDriverData({
          id: driverId,
          user: driverAttributes,
          vehicles: vehiclesData,
        });
      } catch (err) {
        console.error("[AcceptTrip] Error obteniendo datos del conductor:", err);
        setError(err.message || "Error cargando datos del conductor");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [selectedOffer?.driverId]);

  // Extraer información del conductor
  const user = driverData?.user;
  const vehicles = driverData?.vehicles || [];
  const vehicle = vehicles[0]?.attributes || vehicles[0] || {};

  const driverName =
    user?.firstname && user?.lastname
      ? `${user.firstname} ${user.lastname}`
      : user?.firstname ||
      user?.username ||
      user?.email?.split("@")[0] ||
      "Conductor";

  // Construir URL de la foto del carro
  let driverPhoto = null;
  const profilePicUrl = user?.profile_pic?.data?.attributes?.url;
  const profilePicThumbnail = user?.profile_pic?.data?.attributes?.formats?.thumbnail?.url;

  if (profilePicThumbnail) {
    // Usar thumbnail si disponible (más pequeño y rápido)
    driverPhoto = `${strapiUrl}${profilePicThumbnail}`;
  } else if (profilePicUrl) {
    // Fallback a la imagen original
    driverPhoto = `${strapiUrl}${profilePicUrl}`;
  }

  const vehicleLabel =
    [user?.vehicle_brand, user?.vehicle_model, user?.license_plate]
      .filter(Boolean)
      .join(" ") || "Vehículo no disponible";

  const vehiclePhotoFields = [
    user?.vehicle_front_photo,
    user?.vehicle_back_photo,
    user?.vehicle_side_photo,
    user?.vehicle_interior_photo,
  ];

  const vehiclePhotos = vehiclePhotoFields
    .flatMap((field) => {
      if (!field) return [];

      const data = field?.data;
      if (Array.isArray(data)) {
        return data
          .map((item) => item?.attributes)
          .filter(Boolean)
          .map((attr) => ({
            url: attr?.url ? `${strapiUrl}${attr.url}` : null,
            thumbnail: attr?.formats?.thumbnail?.url ? `${strapiUrl}${attr.formats.thumbnail.url}` : null,
          }))
          .filter((img) => img.url || img.thumbnail);
      }

      if (data?.attributes) {
        const attr = data.attributes;
        return [{
          url: attr?.url ? `${strapiUrl}${attr.url}` : null,
          thumbnail: attr?.formats?.thumbnail?.url ? `${strapiUrl}${attr.formats.thumbnail.url}` : null,
        }].filter((img) => img.url || img.thumbnail);
      }

      return [];
    })
    .filter((img, index, self) => index === self.findIndex((item) => item.url === img.url));

  const [vehiclePhotoIndex, setVehiclePhotoIndex] = useState(0);
  const vehicleSlides = [];
  for (let i = 0; i < vehiclePhotos.length; i += 2) {
    vehicleSlides.push(vehiclePhotos.slice(i, i + 2));
  }
  const currentVehicleSlide = vehicleSlides[vehiclePhotoIndex] || [];

  useEffect(() => {
    setVehiclePhotoIndex(0);
  }, [selectedOffer?.driverId]);

  const goToPrevVehiclePhotos = () => {
    setVehiclePhotoIndex((prev) => {
      const totalSlides = Math.max(1, vehicleSlides.length);
      return prev === 0 ? totalSlides - 1 : prev - 1;
    });
  };

  const goToNextVehiclePhotos = () => {
    setVehiclePhotoIndex((prev) => {
      const totalSlides = Math.max(1, vehicleSlides.length);
      return prev === totalSlides - 1 ? 0 : prev + 1;
    });
  };

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
          width: "480px",
          height: "auto",
          background: "#fff",
          borderRadius: 10,
          padding: 18,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Oferta del conductor</h3>

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 14, color: "#666" }}>Cargando datos...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "12px", background: "#ffebee", borderRadius: 6, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "#c62828" }}>{error}</div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
            {driverPhoto ? (
              <img
                src={driverPhoto}
                alt={driverName}
                style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {driverName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16 }}>
                <strong>Conductor:</strong> {driverName}
              </div>
              <div style={{ fontSize: 16, marginTop: 5 }}>
                <strong>Vehículo:</strong> {vehicleLabel}
              </div>
              <div style={{ fontSize: 16, marginTop: 5 }}>
                <strong>Precio:</strong> ${selectedOffer.price}
              </div>
            </div>
          </div>
        )}

        {vehiclePhotos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Fotos del vehículo</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {vehiclePhotos.length > 2 && (
                <button
                  onClick={goToPrevVehiclePhotos}
                  style={{
                    border: "none",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    background: "#f1f1f1",
                  }}
                >
                  ←
                </button>)}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, flex: 1 }}>
                {currentVehicleSlide.map((img, index) => (
                  <img
                    key={`${img.url || img.thumbnail}-${index}`}
                    src={img.thumbnail || img.url}
                    alt={`Foto del vehículo ${vehiclePhotoIndex * 2 + index + 1}`}
                    style={{
                      width: "100%",
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #e0e0e0",
                    }}
                  />
                ))}
              </div>

              {vehiclePhotos.length > 2 && (
                <button
                  onClick={goToNextVehiclePhotos}
                  style={{
                    border: "none",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    background: "#f1f1f1",
                  }}
                >
                  →
                </button>)}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "#666", marginTop: 6 }}>
              {vehiclePhotoIndex + 1} / {Math.max(1, vehicleSlides.length)}
            </div>
          </div>
        )}

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
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: loading ? "#ccc" : "#00c853",
              color: "#fff",
              cursor: loading ? "default" : "pointer",
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
