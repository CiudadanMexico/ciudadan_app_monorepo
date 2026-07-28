// src/utils/useTravelRoute.js
import { useEffect } from 'react';
import { createDirectionsRenderer, resetMapZoom } from './mapUtils';

const useTravelRoute = (
    userCoords,
    consultedTravel,
    acceptedTravel,  // parámetro para viaje aceptado
    googleMapsLoaded,
    travelData,
    mapRef,
    directionsRendererRef,
    pickupMarkerRef
  ) => {
    useEffect(() => {
      if (
        consultedTravel !== null &&
        googleMapsLoaded &&
        window.google &&
        mapRef.current
      ) {
        const travel = travelData[consultedTravel];
  
        if (travel) {
          const driverCoords = { lat: userCoords.lat, lng: userCoords.lng };
          let request = null;
  
          if (acceptedTravel !== null) {
            // Modo "viaje aceptado": solo se traza la ruta del conductor al pickup.
            if (travel.origin) {
              request = {
                origin: driverCoords,
                destination: travel.origin, // pickup
                travelMode: window.google.maps.TravelMode.DRIVING,
              };
              console.log("Ruta aceptada: conductor -> pickup");
            }
          } else {
            // Modo "consulta": ruta completa (conductor -> pickup -> destino)
            if (travel.origin && travel.destination) {
              request = {
                origin: driverCoords,
                destination: travel.destination,
                waypoints: [{ location: travel.origin, stopover: true }],
                travelMode: window.google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false,
              };
              console.log("Ruta completa: conductor -> pickup -> destino");
            }
          }
  
          if (request) {
            const directionsService = new window.google.maps.DirectionsService();
            if (!directionsRendererRef.current) {
              directionsRendererRef.current = createDirectionsRenderer(mapRef);
              console.log("Se creó un nuevo DirectionsRenderer.");
            }
            directionsService.route(request, (response, status) => {
              if (status === window.google.maps.DirectionsStatus.OK) {
                directionsRendererRef.current.setDirections(response);
                let totalDistance = 0;
                response.routes[0].legs.forEach((leg) => {
                  totalDistance += leg.distance.value;
                });
                console.log(`Distancia total: ${(totalDistance / 1000).toFixed(2)} km`);
              } else {
                console.error("Error en la solicitud de direcciones:", status);
              }
            });
          } else {
            console.warn("No se pudo formar el request de ruta.");
            // Si no se puede calcular la ruta, limpiar la existente (si hay)
            if (directionsRendererRef.current) {
              directionsRendererRef.current.setMap(null);
              directionsRendererRef.current = null;
              console.log("Ruta eliminada del mapa.");
            }
            if (pickupMarkerRef.current) {
              pickupMarkerRef.current.setMap(null);
              pickupMarkerRef.current = null;
              console.log("Marcador de pickup eliminado.");
            }
            resetMapZoom(mapRef, 14);
          }
        } else {
          console.warn("No hay datos del viaje para calcular la ruta.");
        }
      } else {
        console.warn("No hay un viaje seleccionado o Google Maps no está listo.");
      }
    }, [
      consultedTravel,
      acceptedTravel,
      googleMapsLoaded,
      travelData,
      mapRef,
      directionsRendererRef,
      pickupMarkerRef,
      userCoords,
    ]);
  };
  
  export default useTravelRoute;
  