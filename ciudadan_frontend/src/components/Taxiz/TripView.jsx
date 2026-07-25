// src/components/Trips/TripView.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ViajeConductor from './ViajeConductor.jsx';
import ViajeUsuario from './ViajeUsuario.jsx';
import RatingModal from './RatingModal.jsx';
import SolicitudCancelar from './SolicitudCancelar.jsx';
import ConfirmarCancelar from './ConfirmarCancelar.jsx';
import taxiIcon from '../../assets/taxi_marker.png';
import userIcon from '../../assets/user_marker.png';
import { normalizeCoord } from '../../utils/mapUtils.jsx';
import { PAYMENT_STATES, getTripPaymentFlowState } from '../../utils/tripPaymentFlowUtils.js';
import { calculateDistanceKm } from '../../utils/geo';

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
  //console.log('[TripView] user:', user);
  //console.log('[TripView] strapiConfig:', strapiConfig);
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

  const navigate = useNavigate();
  const [viaje, setViaje] = useState(null);
  const [loadingViaje, setLoadingViaje] = useState(false);
  const [driverPaymentState, setDriverPaymentState] = useState(PAYMENT_STATES.pending);
  const [passengerPaymentState, setPassengerPaymentState] = useState(PAYMENT_STATES.pending);

  // coordenadas locales / datos del viaje
  const [userCoords, setUserCoords] = useState(null); // posición del conductor (o GPS)
  const [routeInfo, setRouteInfo] = useState(null);
  const [travelData, setTravelData] = useState([]); // array con originCoordinates / destinationCoordinates
  const [consultedTravel, setConsultedTravel] = useState(null);
  const [driverData, setDriverData] = useState(null); // datos del conductor (Strapi)
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const tripStatus = String(viaje?.attributes?.status || 'pending').toLowerCase();
  const isDriver = !!user?.isDriver || user?.role === 'driver';
  const isTripInProgress = tripStatus === 'in_progress' || tripStatus === 'started' || tripStatus === 'active';
  const paymentFlowState = getTripPaymentFlowState({
    tripStatus,
    driverPaymentState,
    passengerPaymentState,
  });

  // mapa & google refs
  const mapRef = useRef(null);
  const googleLoadedRef = useRef(false);
  const markersRef = useRef([]);
  const pickupMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const userCoordsRef = useRef(userCoords);

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

        const driverEmail = attrs.conductormail || attrs.driverEmail || null;
        if (driverEmail) {
          console.log('[TripView] conductor email:', driverEmail);
        }
        const driverUrl = `${base.replace(/\/$/, '')}/api/drivers?filters[email][$eq]=${encodeURIComponent(driverEmail)}&populate=*`;

        const userResponse = await fetch(driverUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!userResponse.ok) {
          throw new Error("Error buscando usuario en Strapi");
        }
        const userData = await userResponse.json();
        console.log("[AcceptTrip] userData:", userData);

        const ratingAvg = await getAvgRating();
        // Strapi v4 retorna { data: [...] }
        const drivers = userData?.data || userData || [];
        const driver = Array.isArray(drivers) ? drivers[0] : drivers;

        if (!driver) {
          throw new Error("No se encontró conductor");
        }
        // Extraer datos del conductor (en Strapi v4 están en .attributes)
        const driverAttributes = driver?.attributes || driver;
        const driverId = driver?.id;
        setDriverData({ ...driverAttributes, ratingAvg });
      } catch (e) {
        console.warn('[TripView] error buscando viaje por travelid', e);
      } finally {
        if (mounted) setLoadingViaje(false);
      }
    })();

    return () => { mounted = false; };
  }, [travelD, strapiConfig]);

  const getAvgRating = async () => {
    const base = process.env.REACT_APP_SOCKET_URL;
    const res = await fetch(`${base.replace(/\/$/, '')}/rating-calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userEmail: user?.email,
        isDriver
      }),
    });
    if (!res.ok) {
      throw new Error("Error buscando calificacion de conductor en Strapi");
    }
    const data = await res.json();
    const ratingAvg = data?.ratingAvg;
    console.log("[AcceptTrip] ratingData:", ratingAvg);
    return ratingAvg;
  }

  /*useEffect(() => {
    (async () => {
      const base = process.env.REACT_APP_SOCKET_URL;
      const res = await fetch(`${base.replace(/\/$/, '')}/rating-calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: user?.email,
          isDriver
        }),
      });
      if (!res.ok) {
        throw new Error("Error buscando calificacion de conductor en Strapi");
      }
      const data = await res.json();
      console.log("[AcceptTrip] ratingData:", data?.ratingAvg);
      setDriverData((prev) => {
        return { ...prev, ratingAvg: data?.ratingAvg }
      });
    })();
  }, [user?.email, isDriver]);*/

  useEffect(() => {
    userCoordsRef.current = userCoords;
  }, [userCoords]);

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
      try { directionsRendererRef.current.setOptions({ suppressMarkers: true }); } catch (e) { }
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
    } catch (e) { }

    try {
      if (directionsRendererRef.current) directionsRendererRef.current.setOptions({ suppressMarkers: true });
    } catch (e) { }
  }, [mapRef.current, userCoords]);

  // Dibujar ruta según el estado del viaje
  useEffect(() => {
    if (consultedTravel === null) return;
    const travelItem = travelData[consultedTravel];
    if (!travelItem) return;
    if (!window.google || !mapRef.current) return;

    const pickupCoords = travelItem.originCoordinates || null;
    const destinationCoords = travelItem.destinationCoordinates || null;
    //console.log('[TripView] Dest coords', destinationCoords);
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
        destination: {
          lat: Number(isTripInProgress ? destinationCoords.lat : pickupCoords.lat),
          lng: Number(isTripInProgress ? destinationCoords.lng : pickupCoords.lng),
        },
        travelMode: window.google.maps.TravelMode.DRIVING,
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK' || status === window.google.maps.DirectionsStatus.OK) {
          directionsRendererRef.current.setDirections(result);

          try {
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

            const pickupPos = { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) };
            const passengerPos = isTripInProgress ? driverPos : pickupPos;
            if (pickupMarkerRef.current) {
              pickupMarkerRef.current.setPosition(passengerPos);
              pickupMarkerRef.current.setMap(mapRef.current);
            } else {
              pickupMarkerRef.current = new window.google.maps.Marker({
                position: passengerPos,
                map: mapRef.current,
                title: isTripInProgress ? 'Pasajero' : 'Pasajero (pickup)',
                icon: userIcon ? { url: userIcon, scaledSize: new window.google.maps.Size(36, 36) } : undefined,
              });
            }

            const destPos = {
              lat: Number(destinationCoords.lat),
              lng: Number(destinationCoords.lng),
            };
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

          try {
            const bounds = new window.google.maps.LatLngBounds();
            const overview = result.routes?.[0]?.overview_path;
            if (overview && overview.length) {
              overview.forEach((p) => bounds.extend(p));
            } else {
              bounds.extend({ lat: Number(driverCoords.lat), lng: Number(driverCoords.lng) });
              bounds.extend(isTripInProgress ? { lat: Number(destinationCoords.lat), lng: Number(destinationCoords.lng) } : { lat: Number(pickupCoords.lat), lng: Number(pickupCoords.lng) });
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
  }, [consultedTravel, travelData, userCoords, isTripInProgress]);

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

  useEffect(() => {
    const isDriver = !!user?.isDriver || user?.role === 'driver';
    if (!isDriver || typeof navigator === 'undefined' || !navigator.geolocation || !travelD) return;

    const driverId = user?.id || user?.sub || user?.email || 'driver-unknown';
    const channel = `trip:${travelD}`;

    const handlePosition = (position) => {
      const nextCoords = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
      };

      setUserCoords((prev) => {
        if (!prev) return nextCoords;
        const prevLat = Number(prev.lat);
        const prevLng = Number(prev.lng);
        const moved = Math.abs(prevLat - nextCoords.lat) > 0.00001 || Math.abs(prevLng - nextCoords.lng) > 0.00001;
        return moved ? nextCoords : prev;
      });

      const socket = socketRef.current;
      if (!socket) return;

      try {
        socket.emit('actualizandoUbicacion', {
          channel,
          payload: {
            travelid: travelD,
            driverId,
            coords: nextCoords,
            ts: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.warn('[TripView] error emitiendo ubicación GPS', e);
      }
    };

    const handlePositionError = (err) => {
      console.warn('[TripView] error de geolocalización', err?.message || err);
    };

    const watchId = navigator.geolocation.watchPosition(handlePosition, handlePositionError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    });

    return () => {
      try { navigator.geolocation.clearWatch(watchId); } catch (e) { }
    };
  }, [travelD, user?.id, user?.sub, user?.email, user?.isDriver, user?.role]);

  // Socket: emitir ubicación si es driver, y push a Strapi cada 60s
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !travelD) return;
    const isDriver = !!user?.isDriver || user?.role === 'driver';
    //console.log('[TripView] isDriver:', isDriver, 'userRole:', user?.role);
    const driverId = user?.id || user?.sub || user?.email || 'driver-unknown';
    const channel = `trip:${travelD}`;

    const onDriverLocation = (payload) => {
      //console.log('[TripView] socket onDriverLocation', payload);
      if (!payload) return;
      setUserCoords(payload.coords);
      if (payload.distanceKm) setRouteInfo(payload.distanceKm);
    };

    const onCancelTrip = (payload) => {
      if (payload?.cancelledBy !== user?.role) {
        setShowConfirmCancelModal(true);
      }
    }

    const onTripUpdate = (payload) => {
      //console.log('[TripView] socket onTripUpdate', payload);
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
      if (payload.status === 'partial' || payload.status === 'unpaid') {
        setDriverPaymentState(payload.status);
      }
      if (payload.status === 'paid' && !ratingSubmitted) {
        setShowRatingModal(true);
      }
    };

    try { socket.emit('join', { channel, client: { id: driverId } }); } catch (e) { }

    socket.on('driver-location', onDriverLocation);
    socket.on('trip-update', onTripUpdate);
    socket.on('trip-cancel', onCancelTrip);

    let locInterval = null;
    let trackInterval = null;

    if (isDriver) {
      const emitLocation = () => {
        const currentCoords = userCoordsRef.current;
        const travelItem = travelData[consultedTravel];
        const destinationCoords = travelItem?.destinationCoordinates;

        if (!currentCoords) return;
        const payload = {
          travelid: travelD,
          driverId,
          coords: currentCoords,
          distanceKm: isTripInProgress ? calculateDistanceKm(destinationCoords, currentCoords) : null,
          ts: new Date().toISOString(),
        };
        //console.log('[TripView] emit actualizandoUbicacion', payload);
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
              coords: userCoordsRef.current,
              recordedAt: new Date().toISOString(),
            },
          },
        });
      }, 60 * 1000);
    }

    return () => {
      try { socket.emit('leave', { channel, client: { id: driverId } }); } catch (e) { }
      socket.off('driver-location', onDriverLocation);
      socket.off('trip-update', onTripUpdate);
      socket.off('trip-cancel', onCancelTrip);
      if (locInterval) clearInterval(locInterval);
      if (trackInterval) clearInterval(trackInterval);
    };
  }, [travelD, user?.id, user?.sub, user?.email, user?.isDriver, user?.role, strapiConfig, viaje, isTripInProgress, travelData, consultedTravel]);

  // Handlers UI
  const handleTravelCardClick = (index) => setConsultedTravel(index);
  const handleBackButtonClick = () => {
    try {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    } catch (e) { console.warn('Error limpiando directionsRenderer', e); }
    try { if (pickupMarkerRef.current) { pickupMarkerRef.current.setMap(null); pickupMarkerRef.current = null; } } catch { }
    try { if (destMarkerRef.current) { destMarkerRef.current.setMap(null); destMarkerRef.current = null; } } catch { }
    setConsultedTravel(null);
  };
  const handleCloseButtonClick = (index) => {
    setTravelData(prev => prev.filter((_, i) => i !== index));
    markersRef.current.forEach(m => { try { m.setMap(null); } catch (e) { } });
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

  const handleTripStatusChange = (nextStatus) => {
    setViaje((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attributes: {
          ...(prev.attributes || {}),
          status: nextStatus,
        },
      };
    });

    const socket = socketRef.current;
    if (socket) {
      try {
        socket.emit('trip-update', {
          travelid: travelD,
          status: nextStatus,
          channel: `trip:${travelD}`,
        });
      } catch (e) {
        console.warn('[TripView] error emitiendo trip-update', e);
      }
    }
    setShowConfirmCancelModal(false);
  };

  const handleCancelTrip = () => {
    setShowCancelModal(true);
  }

  useEffect(() => {
    if (!ratingSubmitted && paymentFlowState.shouldOpenRatingModal) {
      setShowRatingModal(true);
    }
  }, [paymentFlowState.shouldOpenRatingModal, ratingSubmitted]);

  const handleDriverPaymentChoice = (nextState) => {
    console.log('[TripView] handleDriverPaymentChoice', nextState);
    setDriverPaymentState(nextState);

    const socket = socketRef.current;
    if (socket) {
      try {
        socket.emit('trip-update', {
          status: nextState
        });
      } catch (e) {
        console.warn('[TripView] error emitiendo trip-update', e);
      }
    }
  };

  const handlePassengerPaymentChoice = (nextState) => {
    console.log('[TripView] handlePassengerPaymentChoice', nextState);
    setPassengerPaymentState(nextState);

    const socket = socketRef.current;
    if (socket) {
      try {
        socket.emit('trip-update', {
          status: nextState
        });
      } catch (e) {
        console.warn('[TripView] error emitiendo trip-update', e);
      }
    }
  };

  const closeRatingFlow = () => {
    setShowRatingModal(false);
    setRatingSubmitted(true);
    navigate('/taxis');
  };

  const handleRatingSubmit = async (value) => {
    const base = (strapiConfig && strapiConfig.baseUrl) ? strapiConfig.baseUrl : STRAPI_BASE;
    const token = (strapiConfig && strapiConfig.token) ? strapiConfig.token : STRAPI_TOKEN;
    const viajeId = viaje?.id;

    if (!base || !viajeId) {
      setShowRatingModal(false);
      setRatingSubmitted(true);
      return;
    }

    try {
      const payload = {
        data: isDriver
          ? { calificacionpasajero: value }
          : { calificacionconductor: value },
      };

      await fetch(`${base.replace(/\/$/, '')}/api/viajes/${viajeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      setViaje((prev) => prev ? {
        ...prev,
        attributes: {
          ...(prev.attributes || {}),
          ...(isDriver ? { calificacionpasajero: value } : { calificacionconductor: value }),
        },
      } : prev);
    } catch (e) {
      console.warn('[TripView] no se pudo guardar la calificación', e);
    } finally {
      closeRatingFlow();
    }
  };

  const handleCancelTripSubmit = async (reason) => {
    const base = process.env.REACT_APP_SOCKET_URL || '';
    const viajeId = viaje?.id;

    try {
      const payload = {
        id: viajeId,
        reason,
        cancelledBy: isDriver ? 'driver' : 'user',
      };

      await fetch(`${base.replace(/\/$/, '')}/test/cancel-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('[TripView] no se pudo cancelar el viaje', e);
    } finally {
      setShowCancelModal(false);
    }
  }

  // Render
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div id="map" style={{ width: '100%', height: '60vh' }} />
      {(user?.isDriver || user?.role === 'driver') ? (
        <ViajeConductor
          viaje={viaje}
          socket={socketRef.current}
          strapiConfig={{ baseUrl: (strapiConfig && strapiConfig.baseUrl) ? strapiConfig.baseUrl : STRAPI_BASE, token: (strapiConfig && strapiConfig.token) ? strapiConfig.token : STRAPI_TOKEN }}
          userCoords={userCoords}
          routeInfo={routeInfo}
          setUserCoords={setUserCoords}
          travelData={travelData}
          consultedTravel={consultedTravel}
          handleTravelCardClick={handleTravelCardClick}
          handleBackButtonClick={handleBackButtonClick}
          handleCloseButtonClick={handleCloseButtonClick}
          handleAcceptTrip={handleAcceptTrip}
          mapRef={mapRef}
          onStatusChange={handleTripStatusChange}
          onCancel={handleCancelTrip}
          paymentFlowState={paymentFlowState}
          paymentAmount={viaje?.attributes?.costo || viaje?.attributes?.price || null}
          onDriverPaymentChoice={handleDriverPaymentChoice}
        />
      ) : (
        <ViajeUsuario
          viaje={viaje}
          driverData={driverData}
          socket={socketRef.current}
          userCoords={userCoords}
          routeInfo={routeInfo}
          setUserCoords={setUserCoords}
          mapRef={mapRef}
          setConsultedTravel={setConsultedTravel}
          paymentFlowState={paymentFlowState}
          paymentAmount={viaje?.attributes?.costo || viaje?.attributes?.price || null}
          onPassengerPaymentChoice={handlePassengerPaymentChoice}
          passengerPaymentState={passengerPaymentState}
          onCancel={handleCancelTrip}
        />
      )}
      <RatingModal
        open={showRatingModal}
        isDriver={isDriver}
        onSubmit={handleRatingSubmit}
        onClose={closeRatingFlow}
      />
      <SolicitudCancelar
        open={showCancelModal}
        isDriver={isDriver}
        onSubmit={handleCancelTripSubmit}
        onClose={() => setShowCancelModal(false)}
      />
      <ConfirmarCancelar
        viajeId={viaje?.id}
        open={showConfirmCancelModal}
        isDriver={isDriver}
        onSubmit={handleTripStatusChange}
        onClose={() => setShowConfirmCancelModal(false)}
        strapiConfig={{ baseUrl: (strapiConfig && strapiConfig.baseUrl) ? strapiConfig.baseUrl : STRAPI_BASE, token: (strapiConfig && strapiConfig.token) ? strapiConfig.token : STRAPI_TOKEN }}
      />
    </div>
  );
};

export default TripView;
