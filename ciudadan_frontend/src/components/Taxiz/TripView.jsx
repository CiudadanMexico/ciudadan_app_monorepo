// src/components/Trips/TripView.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ViajeConductor from './ViajeConductor.jsx';
import ViajeUsuario from './ViajeUsuario.jsx';
import taxiIcon from '../../assets/taxi_marker.png';
import userIcon from '../../assets/user_marker.png';
import { normalizeCoord } from '../../utils/mapUtils.jsx';

const ZOCALO = { lat: 19.432607, lng: -99.133209 };
const STRAPI_BASE = process.env.REACT_APP_STRAPI_URL || '';
const STRAPI_TOKEN = process.env.REACT_APP_STRAPI_TOKEN || '';

const pushTrackToStrapi = async ({ baseUrl, token, viajeId, payload }) => {
  if (!baseUrl || !viajeId) return;
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/viajes/${viajeId}/tracks`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('pushTrackToStrapi falló', res.status, text);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('pushTrackToStrapi error', e);
    return null;
  }
};

const loadGoogleMaps = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve();
    const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
    if (!key) {
      console.warn('Falta REACT_APP_GOOGLE_MAPS_API_KEY en .env');
      return reject(new Error('No API key'));
    }
    const src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    const exists = Array.from(document.getElementsByTagName('script')).some(s => s.src && s.src.includes(src));
    if (exists) {
      const check = () => {
        if (window.google && window.google.maps) return resolve();
        setTimeout(check, 200);
      };
      return check();
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

const TripView = ({ user, socket: externalSocket, strapiConfig }) => {
  const { travel } = useParams(); // :travel en la ruta (ej. offer-1765...)
  // travelD toma la última parte del path (por seguridad)
  const travelD = (() => {
    try {
      const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
      const clean = pathname.replace(/\/+$/, '');
      const parts = clean.split('/');
      return parts.length ? parts[parts.length - 1] : String(travel || '');
    } catch (e) {
      return String(travel || '');
    }
  })();

  const [viaje, setViaje] = useState(null);
  const [loadingViaje, setLoadingViaje] = useState(false);

  // coordenadas locales / datos del viaje
  const [userCoords, setUserCoords] = useState(null); // posición del conductor (o GPS)
  const [travelData, setTravelData] = useState([]); // array con originCoordinates / destinationCoordinates
  const [consultedTravel, setConsultedTravel] = useState(null);

  // mapa & google refs
  const mapRef = useRef(null);
  const googleLoadedRef = useRef(false);
  const markersRef = useRef([]);
  const pickupMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  // socket ref (prioriza externalSocket)
  const socketRef = useRef(externalSocket || null);

  // Inicializar Google Maps (igual que antes)
  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (!mounted) return;
        googleLoadedRef.current = true;
        const el = document.getElementById('map');
        if (el && !mapRef.current) {
          mapRef.current = new window.google.maps.Map(el, {
            center: ZOCALO,
            zoom: 14,
            gestureHandling: 'greedy',
          });
        }
      })
      .catch((err) => {
        console.warn('loadGoogleMaps fallo:', err);
      });
    return () => { mounted = false; };
  }, []);

  // ----- FETCH único: buscar viaje por travelid (usa travelD) -----
  useEffect(() => {
    const base = (strapiConfig && strapiConfig.baseUrl) ? strapiConfig.baseUrl : STRAPI_BASE;
    const token = (strapiConfig && strapiConfig.token) ? strapiConfig.token : STRAPI_TOKEN;
    if (!base || !travelD) return;

    let mounted = true;
    setLoadingViaje(true);

    (async () => {
      try {
        const encoded = encodeURIComponent(String(travelD));
        // IMPORTANTE: el campo en tu Strapi es `travelid` (minúsculas)
        const url = `${base.replace(/\/$/, '')}/api/viajes?filters[travelid][$eq]=${encoded}&populate=*`;
        console.log('[TripView] consultando Strapi por travelid:', travelD, '->', url);

        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          console.warn('[TripView] fetch viajes por travelid falló', res.status, await res.text());
          if (mounted) setLoadingViaje(false);
          return;
        }

        const json = await res.json();
        if (!mounted) return;

        const found = Array.isArray(json?.data) && json.data.length ? json.data[0] : null;
        if (!found) {
          console.warn(`[TripView] No se encontró viaje con travelid="${travelD}"`);
          setViaje(null);
          setTravelData([]);
          if (mounted) setLoadingViaje(false);
          return;
        }

        // Guardamos el viaje tal como lo devuelve Strapi (objeto data[i])
        setViaje(found);
        console.log('[TripView] viaje (found):', found);

        // Mapear atributos según ejemplo de tu Strapi
        const attrs = found.attributes || {};
        // Coordenadas conductor (si existe)
        if (attrs.conductorcoords) {
          setUserCoords(attrs.conductorcoords);
        } else if (attrs.taxiPosition) {
          setUserCoords(attrs.taxiPosition);
        } else if (attrs.origencoords) {
          // si no hay conductorcoords pero sí origencoords, lo usamos como fallback
          setUserCoords(attrs.origencoords);
        }

        // Crear travelData con origencoords / destinocoords para compatibilidad con la lógica de rutas
        const origin = attrs.origencoords || attrs.pickup || null;
        const destination = attrs.destinocoords || attrs.destination || null;
        const originAdress = (attrs.origendireccion && (attrs.origendireccion.label || attrs.origendireccion)) || null;
        const destinationAdress = (attrs.destinodireccion && (attrs.destinodireccion.label || attrs.destinodireccion)) || null;

        // normalizamos coords para evitar strings y formatos raros
        const originNorm = normalizeCoord(origin);
        const destNorm = normalizeCoord(destination);

        if (originNorm || destNorm) {
        setTravelData([{
            originCoordinates: originNorm,
            destinationCoordinates: destNorm,
            id: found.id,
            originAdress,
            destinationAdress,
            travelid: attrs.travelid || travelD,
        }]);
        } else {
        setTravelData([]);
        }
      } catch (e) {
        console.warn('[TripView] error buscando viaje por travelid', e);
      } finally {
        if (mounted) setLoadingViaje(false);
      }
    })();

    return () => { mounted = false; };
  }, [travelD, strapiConfig]);

  // Inicializar Directions (igual que Conductor.js)
  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (!directionsServiceRef.current) directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeWeight: 6, strokeOpacity: 0.95 },
      });
      directionsRendererRef.current.setMap(mapRef.current);
    } else {
      try { directionsRendererRef.current.setOptions({ suppressMarkers: true }); } catch (e) {}
    }
  }, [mapRef.current, googleLoadedRef.current]);

  // Crear/actualizar driver marker y centrar mapa
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const driverPos = (userCoords && userCoords.lat && userCoords.lng)
      ? { lat: Number(userCoords.lat), lng: Number(userCoords.lng) }
      : (mapRef.current.getCenter ? mapRef.current.getCenter().toJSON() : ZOCALO);

    try {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: driverPos,
          map: mapRef.current,
          title: 'Conductor',
          icon: taxiIcon ? { url: taxiIcon, scaledSize: new window.google.maps.Size(40, 40) } : undefined,
        });
      } else {
        driverMarkerRef.current.setPosition(driverPos);
        driverMarkerRef.current.setMap(mapRef.current);
      }
    } catch (e) {
      console.warn('[TripView] error creando/actualizando driverMarker', e);
    }

    try {
      mapRef.current.setCenter(driverPos);
      if (mapRef.current.setZoom) mapRef.current.setZoom(14);
    } catch (e) {}

    try {
      if (directionsRendererRef.current) directionsRendererRef.current.setOptions({ suppressMarkers: true });
    } catch (e) {}
  }, [mapRef.current, userCoords]);

  // Dibujar ruta cuando se consulte un travel en la lista (misma lógica que pegaste)
  useEffect(() => {
    if (consultedTravel === null) return;
    const travelItem = travelData[consultedTravel];
    if (!travelItem) return;
    if (!window.google || !mapRef.current) return;

    const pickupCoords = travelItem.originCoordinates || null;
    const destinationCoords = travelItem.destinationCoordinates || null;
    const driverCoords = userCoords || (mapRef.current.getCenter ? mapRef.current.getCenter().toJSON() : null);

    if (!pickupCoords || !destinationCoords || !driverCoords) {
      console.warn('[TripView] coords insuficientes para dibujar ruta', { driverCoords, pickupCoords, destinationCoords });
      return;
    }

    if (!directionsServiceRef.current) directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#cc19d2ff',
          strokeWeight: 6,
          strokeOpacity: 0.95,
        },
      });
      directionsRendererRef.current.setMap(mapRef.current);
    }

    try {
        const request = {
        origin: { lat: Number(driverCoords.lat), lng: Number(driverCoords.lng) },
        destination: { lat: Number(destinationCoords.lat), lng: Number(destinationCoords.lng) },
        waypoints: [
            { location: { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) }, stopover: true },
        ],
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
    };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK' || status === window.google.maps.DirectionsStatus.OK) {
          directionsRendererRef.current.setDirections(result);

          // actualizar markers
          try {
            const legs = result.routes?.[0]?.legs || [];

            const driverPos = { lat: Number(driverCoords.lat), lng: Number(driverCoords.lng) };
            if (driverMarkerRef.current) {
              driverMarkerRef.current.setPosition(driverPos);
              driverMarkerRef.current.setMap(mapRef.current);
            } else {
              driverMarkerRef.current = new window.google.maps.Marker({
                position: driverPos,
                map: mapRef.current,
                title: 'Conductor',
                icon: taxiIcon ? { url: taxiIcon, scaledSize: new window.google.maps.Size(40, 40) } : undefined,
              });
            }

            const leg = result.routes?.[0]?.legs?.[0];
            const pickupPos = leg ? leg.start_location : { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) };
            if (pickupMarkerRef.current) {
              pickupMarkerRef.current.setPosition(pickupPos);
              pickupMarkerRef.current.setMap(mapRef.current);
            } else {
              pickupMarkerRef.current = new window.google.maps.Marker({
                position: pickupPos,
                map: mapRef.current,
                title: 'Origen (pickup)',
                icon: userIcon ? { url: userIcon, scaledSize: new window.google.maps.Size(36, 36) } : undefined,
              });
            }

            let destPos;
            if (legs.length >= 1 && legs[legs.length - 1].end_location) {
              destPos = legs[legs.length - 1].end_location;
            } else {
              destPos = { lat: Number(destinationCoords.lat), lng: Number(destinationCoords.lng) };
            }

            if (destMarkerRef.current) {
              destMarkerRef.current.setPosition(destPos);
              destMarkerRef.current.setMap(mapRef.current);
            } else {
              destMarkerRef.current = new window.google.maps.Marker({
                position: destPos,
                map: mapRef.current,
                title: 'Destino',
              });
            }
          } catch (mkErr) {
            console.warn('[TripView] error actualizando markers', mkErr);
          }

          // fitBounds
          try {
            const bounds = new window.google.maps.LatLngBounds();
            const overview = result.routes?.[0]?.overview_path;
            if (overview && overview.length) {
              overview.forEach((p) => bounds.extend(p));
            } else {
              bounds.extend({ lat: Number(driverCoords.lat), lng: Number(driverCoords.lng) });
              bounds.extend({ lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) });
              bounds.extend({ lat: Number(destinationCoords.lat), lng: Number(destinationCoords.lng) });
            }
            mapRef.current.fitBounds(bounds);
          } catch (bErr) {
            console.warn('[TripView] fitBounds error', bErr);
          }
        } else {
          console.error('[TripView] Directions error', status, result);
        }
      });
    } catch (e) {
      console.warn('[TripView] Error solicitando directions', e);
    }
  }, [consultedTravel, travelData, userCoords]);

  // Preferir socket pasado por props
  useEffect(() => {
    if (!externalSocket) return;
    socketRef.current = externalSocket;
  }, [externalSocket]);


  // cuando travelData llega y el mapa + directions están listos, abrimos la vista y forzamos dibujo
useEffect(() => {
  if (!travelData || travelData.length === 0) return;

  // esperar a que mapRef y directionsRenderer existan
  const waitAndOpen = () => {
    if (!mapRef.current || !window.google) return false;
    // asegurar que el renderer esté inicializado
    if (!directionsRendererRef.current) {
      // intentar inicializar si no existe
      try {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#cc19d2ff', strokeWeight: 6, strokeOpacity: 0.95 },
        });
        directionsRendererRef.current.setMap(mapRef.current);
      } catch (e) {
        return false;
      }
    }
    return true;
  };

  if (waitAndOpen()) {
    setConsultedTravel(0);
  } else {
    // reintentar en X ms hasta que esté listo (mínimo 3 reintentos cortos)
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (waitAndOpen()) {
        setConsultedTravel(0);
        clearInterval(t);
      } else if (tries >= 8) {
        clearInterval(t);
      }
    }, 300);
    return () => clearInterval(t);
  }
}, [travelData]);

  // Socket: emitir ubicación si es driver, y push a Strapi cada 60s
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !travelD) return;
    const isDriver = !!user?.isDriver || user?.role === 'driver';
    const driverId = user?.id || user?.sub || user?.email || 'driver-unknown';
    const channel = `trip:${travelD}`;

    const onDriverLocation = (payload) => {
      if (!payload?.coords) return;
      setUserCoords(payload.coords);
    };

    const onTripUpdate = (payload) => {
      if (!payload) return;
      if (payload.pickup || payload.destination || payload.status) {
        setViaje((prev) => {
          const copy = prev ? { ...prev } : { attributes: {} };
          if (!copy.attributes) copy.attributes = {};
          if (payload.pickup) copy.attributes.pickup = payload.pickup;
          if (payload.destination) copy.attributes.destination = payload.destination;
          if (payload.status) copy.attributes.status = payload.status;
          return copy;
        });
      }
    };

    try { socket.emit('join', { channel, client: { id: driverId } }); } catch (e) {}

    socket.on('driver-location', onDriverLocation);
    socket.on('trip-update', onTripUpdate);

    let locInterval = null;
    let trackInterval = null;

    if (isDriver) {
      const emitLocation = () => {
        if (!userCoords) return;
        const payload = {
          travelid: travelD,
          driverId,
          coords: userCoords,
          ts: new Date().toISOString(),
        };
        try {
          socket.emit('actualizandoUbicacion', { channel, payload });
        } catch (e) { console.warn('emit actualizandoUbicacion error', e); }
      };
      emitLocation();
      locInterval = setInterval(emitLocation, 10 * 1000);

      // push a Strapi cada 60s usando el id interno de Strapi si lo tenemos
      trackInterval = setInterval(async () => {
        if (!userCoords) return;
        const internalId = viaje?.id || null; // numeric id de Strapi
        await pushTrackToStrapi({
          baseUrl: (strapiConfig && strapiConfig.baseUrl) ? strapiConfig.baseUrl : STRAPI_BASE,
          token: (strapiConfig && strapiConfig.token) ? strapiConfig.token : STRAPI_TOKEN,
          viajeId: internalId,
          payload: {
            data: {
              driver: driverId,
              coords: userCoords,
              recordedAt: new Date().toISOString(),
            },
          },
        });
      }, 60 * 1000);
    }

    return () => {
      try { socket.emit('leave', { channel, client: { id: driverId } }); } catch (e) {}
      socket.off('driver-location', onDriverLocation);
      socket.off('trip-update', onTripUpdate);
      if (locInterval) clearInterval(locInterval);
      if (trackInterval) clearInterval(trackInterval);
    };
  }, [socketRef.current, travelD, user, userCoords, strapiConfig, viaje]);

  // Handlers UI
  const handleTravelCardClick = (index) => setConsultedTravel(index);
  const handleBackButtonClick = () => {
    try {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    } catch (e) { console.warn('Error limpiando directionsRenderer', e); }
    try { if (pickupMarkerRef.current) { pickupMarkerRef.current.setMap(null); pickupMarkerRef.current = null; } } catch {}
    try { if (destMarkerRef.current) { destMarkerRef.current.setMap(null); destMarkerRef.current = null; } } catch {}
    setConsultedTravel(null);
  };
  const handleCloseButtonClick = (index) => {
    setTravelData(prev => prev.filter((_, i) => i !== index));
    markersRef.current.forEach(m => { try { m.setMap(null); } catch (e) {} });
    markersRef.current = [];
  };

  const handleAcceptTrip = async (index) => {
    const idx = typeof index === 'number' ? index : consultedTravel;
    const t = travelData[idx];
    if (!t) return;
    const socket = socketRef.current;
    const driverId = user?.id || user?.sub || user?.email || 'driver-unknown';
    try {
      if (socket && socket.connected) {
        socket.emit('oferta', {
          driverId,
          travelId: t.id || t.travelid,
          originAddress: t.originAdress,
          destinationAddress: t.destinationAdress,
          coordinates: userCoords,
          destinationCoords: userCoords,
        });
        setTravelData(prev => prev.map((item, i) => i === idx ? { ...item, accepted: true } : item));
      } else {
        await fetch(`${STRAPI_BASE.replace(/\/$/, '')}/api/ofertas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}) },
          body: JSON.stringify({ driverId, travelid: t.id || t.travelid }),
        });
        setTravelData(prev => prev.map((item, i) => i === idx ? { ...item, accepted: true } : item));
      }
    } catch (e) {
      console.error('Error en handleAcceptTrip', e);
    }
  };

  // Render
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div id="map" style={{ width: '100%', height: '60vh' }} />
      { (user?.isDriver || user?.role === 'driver') ? (
        <ViajeConductor
          viaje={viaje}
          socket={socketRef.current}
          strapiConfig={{ baseUrl: (strapiConfig && strapiConfig.baseUrl) ? strapiConfig.baseUrl : STRAPI_BASE, token: (strapiConfig && strapiConfig.token) ? strapiConfig.token : STRAPI_TOKEN }}
          userCoords={userCoords}
          setUserCoords={setUserCoords}
          travelData={travelData}
          consultedTravel={consultedTravel}
          handleTravelCardClick={handleTravelCardClick}
          handleBackButtonClick={handleBackButtonClick}
          handleCloseButtonClick={handleCloseButtonClick}
          handleAcceptTrip={handleAcceptTrip}
          mapRef={mapRef}
        />
      ) : (
        <ViajeUsuario
          viaje={viaje}
          socket={socketRef.current}
          userCoords={userCoords}
          setUserCoords={setUserCoords}
          mapRef={mapRef}
          setConsultedTravel={setConsultedTravel}
        />
      )}
    </div>
  );
};

export default TripView;
