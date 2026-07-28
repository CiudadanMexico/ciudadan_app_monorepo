// utils/mapUtils.jsx
// Versión compatible: exporta funciones nuevas y mantiene los nombres antiguos (aliases).
// Asegúrate de tener en .env REACT_APP_GOOGLE_MAPS_KEY con la API key correcta.

/////////////////////
// Loader + Helpers
/////////////////////

export function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'));

    if (window.google && window.google.maps) {
      console.log('loadGoogleMaps: window.google ya disponible');
      return resolve(window.google);
    }

    const existing = document.querySelector('script[data-google-maps]');
    if (existing) {
      console.log('loadGoogleMaps: script existente detectado');
      if (window.google && window.google.maps) return resolve(window.google);
      existing.addEventListener('load', () => {
        if (window.google && window.google.maps) resolve(window.google);
        else reject(new Error('Script cargado pero window.google no disponible'));
      });
      existing.addEventListener('error', () => reject(new Error('Error cargando script existente')));
      return;
    }

    if (!apiKey) {
      return reject(new Error('No API key provista a loadGoogleMaps'));
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');

    script.onload = () => {
      if (window.google && window.google.maps) {
        console.log('Google Maps script cargado OK');
        resolve(window.google);
      } else {
        reject(new Error('Script cargado pero window.google.maps no está listo'));
      }
    };

    script.onerror = (e) => {
      reject(new Error('Error cargando Google Maps script'));
    };

    // handler global para errores de key/restricciones - solo logging
    window.gm_authFailure = function() {
      console.error('gm_authFailure: problema con la API key o restricciones de referrer');
    };

    document.head.appendChild(script);
  });
}

export const createMap = (el, center = { lat: 19.432607, lng: -99.133209 }, zoom = 14) => {
  if (!el) throw new Error('createMap: elemento DOM requerido');
  if (!window.google || !window.google.maps) throw new Error('createMap: google.maps no disponible');
  return new window.google.maps.Map(el, { center, zoom });
};

export const addMarker = (map, position, icon = null, title = '') => {
  if (!map || !window.google) return null;
  return new window.google.maps.Marker({
    map,
    position,
    icon: icon ? { url: icon, scaledSize: new window.google.maps.Size(32, 32) } : null,
    title,
  });
};

export const createDirectionsRenderer = (mapRef) => {
  const directionsRenderer = new window.google.maps.DirectionsRenderer({
    polylineOptions: {
      strokeColor: "#c800b7ff", // verde
      strokeWeight: 6,        // grosor de la línea
    },
    suppressMarkers: false,   // si quieres esconder los pines de origen/destino ponlo en true
  });

  directionsRenderer.setMap(mapRef.current);
  return directionsRenderer;
};

// getDirectionsOnce: wrapper para solicitar ruta una sola vez
export const getDirectionsOnce = (origin, destination, callback) => {
  if (!window.google) {
    callback(null, new Error('Google no disponible'));
    return;
  }
  const directionsService = new window.google.maps.DirectionsService();
  directionsService.route(
    { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
    (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK || status === 'OK') {
        callback(result, null);
      } else {
        callback(null, new Error('Directions error: ' + status));
      }
    }
  );
};

/////////////////////
// Funciones legacy / aliases (para compatibilidad con tu código existente)
/////////////////////

// initializeMap  <- alias de createMap (mantiene firma: (mapRef, userCoords) en tu código antiguo)
// Aquí asumimos que initializeMap recibe mapRef (un objeto ref) y las coords, así que lo implementamos en esa forma.
export const initializeMap = (mapRef, userCoords, zoom = 14) => {
  if (!mapRef) throw new Error('initializeMap: mapRef requerido');
  const el = document.getElementById('map');
  if (!el) throw new Error('initializeMap: elemento #map no encontrado en DOM');
  // asegurar altura mínima
  const computed = window.getComputedStyle(el);
  if ((!computed.height || computed.height === '0px') && !el.style.height) {
    el.style.height = '400px';
  }
  mapRef.current = createMap(el, userCoords, zoom);
  return mapRef.current;
};

// addTaxiMarker <- alias de addMarker, con scaledSize 48 (como tenías antes)
export const addTaxiMarker = (mapRef, userCoords, taxiIcon) => {
  const mapInstance = mapRef.current ? mapRef.current : mapRef;
  if (!mapInstance) return null;
  if (!window.google) return null;
  return new window.google.maps.Marker({
    map: mapInstance,
    position: userCoords,
    icon: {
      url: taxiIcon,
      scaledSize: new window.google.maps.Size(48, 48),
    },
  });
};

// getDirections <- alias que crea DirectionsService + DirectionsRenderer y usa callback
// Firma: getDirections(origin, destination, directionsService, directionsRenderer)
export const getDirections = (origin, destination, directionsService, directionsRenderer) => {
  const ds = directionsService || new window.google.maps.DirectionsService();
  const dr = directionsRenderer || new window.google.maps.DirectionsRenderer({
    polylineOptions: { strokeColor: "#00C853", strokeWeight: 6, strokeOpacity: 0.95 },
    suppressMarkers: true
  });
  if (!dr.getMap || !dr.getMap()) dr.setMap(window._CIUDADAN_MAP_INSTANCE || null); // opcional
  ds.route({
    origin,
    destination,
    travelMode: window.google.maps.TravelMode.DRIVING,
  }, (result, status) => {
    if (status === window.google.maps.DirectionsStatus.OK || status === 'OK') {
      dr.setDirections(result);
    } else {
      console.error('getDirections error', status);
    }
  });
};

// updatePickupMarker (mantengo firma similar a la tuya)
export const updatePickupMarker = (startLocation, map, pickupMarkerRef) => {
  if (!window.google) return;
  if (!pickupMarkerRef || !pickupMarkerRef.current) {
    pickupMarkerRef.current = new window.google.maps.Marker({
      position: startLocation,
      map: map,
      title: 'Punto de recogida',
    });
  } else {
    pickupMarkerRef.current.setPosition(startLocation);
    pickupMarkerRef.current.setMap(map);
  }
};

// resetMapZoom (alias)
export const resetMapZoom = (mapRefObj, zoom = 14) => {
  const mapInstance = mapRefObj.current ? mapRefObj.current : mapRefObj;
  if (mapInstance && mapInstance.setZoom) {
    mapInstance.setZoom(zoom);
  }
};

// export default not used; export named

export const normalizeCoord = (c) => {
  if (!c) return null;
  try {
    // si ya es LatLngLiteral
    if (typeof c.lat === 'number' && typeof c.lng === 'number') return { lat: c.lat, lng: c.lng };
    // si vienen como strings
    if (typeof c.lat === 'string' && typeof c.lng === 'string') return { lat: Number(c.lat), lng: Number(c.lng) };
    // si vienen como { latitude, longitude }
    if (typeof c.latitude !== 'undefined' && typeof c.longitude !== 'undefined') return { lat: Number(c.latitude), lng: Number(c.longitude) };
    // si vienen como array [lat, lng]
    if (Array.isArray(c) && c.length >= 2) return { lat: Number(c[0]), lng: Number(c[1]) };
    return null;
  } catch (e) {
    return null;
  }
};
