import { useEffect, useRef } from 'react';

const UserLocation = ({ onLocation, map }) => {
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    console.log('Iniciando obtención de coordenadas');
    if (!navigator.geolocation || !map) return;
    if (hasRequestedLocation.current) return; // Ya se solicitó la ubicación, evita repetir

    hasRequestedLocation.current = true; // Marca que ya se solicitó la ubicación

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const userCoords = { lat: coords.latitude, lng: coords.longitude };
        onLocation(userCoords);
        console.log(`Coordenadas obtenidas: ${userCoords.lat}, ${userCoords.lng}`);

        // Colocar marcador solo si el mapa está cargado y disponible
        if (map) {
            console.log('sí hay maya !!!😁 ');
          // Crear o actualizar marcador en el mapa
          if (!map.userMarker) {
            console.log('entrando al mapa 😼');
            map.userMarker = new window.google.maps.Marker({
              map: map,
              position: userCoords,
             /*  icon: {
                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Taxi_CDMX.svg/120px-Taxi_CDMX.svg.png', // Icono de taxi rosita CDMX
                scaledSize: new window.google.maps.Size(50, 50),
              }, */
            });
          } else {
            map.userMarker.setPosition(userCoords); // Actualiza la posición del marcador
          }
        }
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
      }
    );
  }, [onLocation, map]);

  return null; // No renderiza nada, solo ejecuta la función
};

export default UserLocation;
