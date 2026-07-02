// hooks/useGoogleMaps.jsx
import { useEffect, useRef } from 'react';
import { loadGoogleMaps, createMap, addMarker } from '../utils/mapUtils.jsx';
import { initAutocomplete } from '../utils/autocompleteMaps.jsx'; // tu helper existente

// Mantuvimos la misma firma que tú tenías para evitar cambiar llamadas:
// useGoogleMaps(fromCoordinates, setFromCoordinates, setFromMarkerPosition, toCoordinates, setToCoordinates, setToMarkerPosition, setFromAddress, setToAddress, setGoogleMapsLoaded, googleMapsLoaded)

const KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.REACT_APP_PLACES_KEY;

const useGoogleMaps = (
  fromCoordinates,
  setFromCoordinates,
  setFromMarkerPosition,
  toCoordinates,
  setToCoordinates,
  setToMarkerPosition,
  setFromAddress,
  setToAddress,
  setGoogleMapsLoaded,
  googleMapsLoaded,
) => {
  const mapRef = useRef(null);
  const fromMarkerRef = useRef(null);
  const toMarkerRef = useRef(null);
  const containerRef = useRef(null); // si quieres usar ref en lugar de id

  // Cargar script de Google Maps (solo una vez)
  useEffect(() => {
    if (!KEY) {
      console.error('useGoogleMaps: falta REACT_APP_GOOGLE_MAPS_KEY en .env');
      return;
    }
    // si ya está en window, marca como cargado
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    let mounted = true;
    loadGoogleMaps(KEY)
      .then(() => {
        if (mounted) setGoogleMapsLoaded(true);
      })
      .catch((err) => {
        console.error('loadGoogleMaps falló:', err);
        // no seteamos false explícito, solo log
      });

    // NO removemos el script en cleanup para evitar recargas múltiples en dev
    return () => { mounted = false; };
  }, [setGoogleMapsLoaded]);

  // Inicializar el mapa y markers cuando google esté listo
  useEffect(() => {
    if (!window.google || !window.google.maps || !googleMapsLoaded) return;

    // Asegurarse de que #map esté presente y tenga altura
    const el = document.getElementById('map');
    if (!el) {
      console.error('useGoogleMaps: #map no encontrado en DOM');
      return;
    }
    // Si el contenedor no tiene altura explícita, asegúralo (evita 0px)
    const computed = window.getComputedStyle(el);
    if ((!computed.height || computed.height === '0px') && !el.style.height) {
      el.style.height = '400px'; // valor seguro por defecto
      console.warn('useGoogleMaps: #map no tenía altura; se asignó 400px para inicializar.');
    }

    // Crear mapa solo si no existe
    if (!mapRef.current) {
      try {
        mapRef.current = createMap(el, fromCoordinates, 14);
        console.log('useGoogleMaps: mapa creado', mapRef.current);
      } catch (err) {
        console.error('useGoogleMaps createMap error:', err);
        return;
      }
    }

    // Markers: crear si no existen
    if (!fromMarkerRef.current) {
      fromMarkerRef.current = addMarker(mapRef.current, fromCoordinates);
    } else {
      fromMarkerRef.current.setPosition(fromCoordinates);
    }

    if (!toMarkerRef.current) {
      toMarkerRef.current = addMarker(mapRef.current, toCoordinates);
    } else {
      toMarkerRef.current.setPosition(toCoordinates);
    }

    // Listener para click en mapa (actualiza coords/markers)
    const clickListener = mapRef.current.addListener('click', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setFromCoordinates({ lat, lng });
      setToCoordinates({ lat, lng });
      setFromMarkerPosition({ lat, lng });
      setToMarkerPosition({ lat, lng });

      if (fromMarkerRef.current) fromMarkerRef.current.setPosition({ lat, lng });
      if (toMarkerRef.current) toMarkerRef.current.setPosition({ lat, lng });
    });

    // Inicializa Autocomplete (tu helper)
    try {
      initAutocomplete({
        fromInputId: 'from-input',
        toInputId: 'to-input',
        onFromChanged: (fromPlace) => {
          if (!fromPlace || !fromPlace.geometry) return;
          const newFromLat = fromPlace.geometry.location.lat();
          const newFromLng = fromPlace.geometry.location.lng();
          setFromCoordinates({ lat: newFromLat, lng: newFromLng });
          setFromMarkerPosition({ lat: newFromLat, lng: newFromLng });
          if (fromMarkerRef.current) fromMarkerRef.current.setPosition({ lat: newFromLat, lng: newFromLng });
          setFromAddress(fromPlace.formatted_address || fromPlace.name || '');
          // centrar mapa
          if (mapRef.current) mapRef.current.setCenter({ lat: newFromLat, lng: newFromLng });
        },
        onToChanged: (toPlace) => {
          if (!toPlace || !toPlace.geometry) return;
          const newToLat = toPlace.geometry.location.lat();
          const newToLng = toPlace.geometry.location.lng();
          setToCoordinates({ lat: newToLat, lng: newToLng });
          setToMarkerPosition({ lat: newToLat, lng: newToLng });
          if (toMarkerRef.current) toMarkerRef.current.setPosition({ lat: newToLat, lng: newToLng });
          setToAddress(toPlace.formatted_address || toPlace.name || '');
        },
      });
    } catch (err) {
      console.warn('useGoogleMaps: initAutocomplete falló o no está presente:', err);
    }

    // cleanup: remover listener del mapa (no removemos script ni markers)
    return () => {
      if (clickListener && clickListener.remove) clickListener.remove();
    };
  }, [
    googleMapsLoaded,
    fromCoordinates,
    toCoordinates,
    setFromCoordinates,
    setToCoordinates,
    setFromMarkerPosition,
    setToMarkerPosition,
    setFromAddress,
    setToAddress,
  ]);

  // retornamos refs por si quieres acceder desde el componente (opcional)
  return {
    mapRef,           // instancia del mapa (ref.current)
    fromMarkerRef,
    toMarkerRef,
    containerRef,     // no usado en este flujo, queda para evolucionar
  };
};

export default useGoogleMaps;
