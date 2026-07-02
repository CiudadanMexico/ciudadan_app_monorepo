// src/components/Taxis/Conductor.js
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import ConductorRender from './ConductorRender.jsx';
import taxiIcon from '../../assets/taxi_marker.png';

const ZOCALO = { lat: 19.432607, lng: -99.133209 };

const Conductor = ({
  setShowTabs,
  setHideTabs,
  showTabs,
  hideTabs,
  setActiveTab,
  shiftToPasajero,
  setShiftToPasajero,
}) => {
  const { user, isAuthenticated } = useAuth0(); // <-- obtiene email si estás con Auth0
  const [isWaiting, setIsWaiting] = useState(true);
  const [travelData, setTravelData] = useState([]);
  const [userId, setUserId] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [consultedTravel, setConsultedTravel] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const markersRef = useRef([]);
  const pickupMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);

  /* ---------- Load Google Maps (igual) ---------- */
  const loadGoogleMaps = () => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) return resolve();
      const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
      if (!key) {
        console.warn('taxi debug: Falta REACT_APP_GOOGLE_MAPS_API_KEY en .env — se intentará con window.google si ya está cargado.');
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

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (!mounted) return;
        setGoogleMapsLoaded(true);
        const el = document.getElementById('map');
        if (el && !mapRef.current) {
          mapRef.current = new window.google.maps.Map(el, {
            center: ZOCALO,
            zoom: 14,
            gestureHandling: 'greedy',
          });
          console.log('taxi debug: mapa inicializado en #map');
        }
      })
      .catch((err) => {
        console.warn('taxi debug: loadGoogleMaps fallo:', err);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (!directionsServiceRef.current) directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeWeight: 6, strokeOpacity: 0.95 },
      });
      directionsRendererRef.current.setMap(mapRef.current);
      console.log('taxi debug: directionsRenderer creado');
    }
  }, [mapRef.current, googleMapsLoaded]);

  /* ---------- Obtener userId desde Strapi usando email (si existe) ---------- */
  useEffect(() => {
    const fetchUserId = async () => {
      if (!isAuthenticated || !user?.email) {
        console.log('taxi debug: no autenticado o sin email, saltando fetchUserId');
        return;
      }
      try {
        console.log('taxi debug: buscando userId para email', user.email);
        const resp = await axios.get(`${process.env.REACT_APP_STRAPI_URL}/api/users`, {
          params: { 'filters[email]': user.email },
        });
        // Ajuste Strapi: resp.data.data o resp.data según versión
        const usersList = resp.data.data || resp.data;
        if (Array.isArray(usersList) && usersList.length > 0) {
          const resolvedId = usersList[0].id || usersList[0]._id || usersList[0].ID;
          setUserId(resolvedId);
          console.log('taxi debug: userId obtenido ->', resolvedId);
        } else {
          console.warn('taxi debug: no se encontró user en Strapi para', user.email);
        }
      } catch (e) {
        console.error('taxi debug: error fetchUserId', e);
      }
    };
    fetchUserId();
  }, [isAuthenticated, user]);

  /* ---------- Socket: crear con transporte websocket y listeners ---------- */
  useEffect(() => {
    if (socketRef.current) return;
    try {
      console.log('taxi debug: conectando socket ->', process.env.REACT_APP_SOCKET_URL);
      const socket = io(process.env.REACT_APP_SOCKET_URL, {
        transports: ['websocket'], // fuerza websocket para evitar polling/XHR
        path: '/socket.io', // ajuste si usas otro path, sino déjalo
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('taxi debug: Conductor socket conectado', socket.id);
        // si ya tenemos userId al momento de conectar, registramos
        if (userId) {
          socket.emit('register-driver', { driverId: userId });
          console.log('taxi debug: register-driver emitido en connect', userId);
        }
      });

      socket.on('trip-request', (data) => {
        try {
          console.log('taxi debug: trip-request recibido:', data);
          if (!data) return;
          const addressed = data.driverId && userId && data.driverId.toString() === userId.toString();
          const broadcast = data.broadcast === true || data.target === 'nearby';
          const included = Array.isArray(data.candidateDrivers) && userId && data.candidateDrivers.map(String).includes(String(userId));
          if (addressed || broadcast || included) {
            setTravelData(prev => {
              const next = [...prev, data];
              console.log('taxi debug: travelData length ->', next.length);
              return next;
            });
            setIsWaiting(false);

            if (mapRef.current && window.google && data.originCoordinates) {
              try {
                const marker = new window.google.maps.Marker({
                  position: data.originCoordinates,
                  map: mapRef.current,
                  title: data.originAdress || 'Origen',
                  icon: {
                    url: taxiIcon,
                    scaledSize: new window.google.maps.Size(44, 44),
                  },
                });
                markersRef.current.push(marker);
                if (mapRef.current.setCenter) mapRef.current.setCenter(data.originCoordinates);
                console.log('taxi debug: marcador origen añadido');
              } catch (e) {
                console.warn('taxi debug: No se pudo crear pickup marker manual:', e);
              }
            }
          } else {
            console.log('taxi debug: trip-request no dirigido a este conductor, ignorando');
          }
        } catch (e) {
          console.error('taxi debug: Error manejando trip-request', e);
        }
      });

      socket.on('drivers-found', (payload) => {
        console.log('taxi debug: drivers-found (conductor):', payload);
      });

      socket.on('disconnect', (reason) => {
        console.log('taxi debug: Socket desconectado:', reason);
      });

      socket.on('connect_error', (err) => {
        console.warn('taxi debug: Socket connect_error', err);
      });
    } catch (e) {
      console.error('taxi debug: Error creando socket conductor:', e);
    }

    return () => {
      try {
        if (socketRef.current) {
          socketRef.current.off('trip-request');
          socketRef.current.off('drivers-found');
          socketRef.current.disconnect();
          socketRef.current = null;
          console.log('taxi debug: socket limpiado');
        }
      } catch (e) {
        console.warn('taxi debug: Error limpiando socket conductor:', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Si userId llega *después* y socket ya existe: registrar conductor ---------- */
  useEffect(() => {
    try {
      if (userId && socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('register-driver', { driverId: userId });
        console.log('taxi debug: register-driver emitido (userId cambió)', userId);
      }
    } catch (e) {
      console.warn('taxi debug: error emitiendo register-driver en userId effect', e);
    }
  }, [userId]);

  /* ---------- cleanup marcadores ---------- */
  useEffect(() => {
    return () => {
      if (markersRef.current && markersRef.current.length) {
        markersRef.current.forEach(m => { try { m.setMap(null); } catch (e) {} });
        markersRef.current = [];
      }
      if (pickupMarkerRef.current) {
        try { pickupMarkerRef.current.setMap(null); } catch (e) {}
        pickupMarkerRef.current = null;
      }
      console.log('taxi debug: limpiando marcadores en unmount');
    };
  }, []);

  /* ---------- Resto de handlers / lógica (igual que antes) ---------- */
  useEffect(() => {
    if (consultedTravel === null) return;
    const travel = travelData[consultedTravel];
    if (!travel) return;
    if (!window.google || !mapRef.current) return;
    if (!directionsServiceRef.current) directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ suppressMarkers: true });
      directionsRendererRef.current.setMap(mapRef.current);
    }
    const origin = travel.originCoordinates || travel.originAdress;
    const destination = travel.destinationCoordinates || travel.destinationAdress;
    try {
      directionsServiceRef.current.route(
        { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === 'OK' || status === window.google.maps.DirectionsStatus.OK) {
            directionsRendererRef.current.setDirections(result);
            try {
              const leg = result.routes[0].legs[0];
              if (pickupMarkerRef.current) pickupMarkerRef.current.setPosition(leg.start_location);
              else {
                pickupMarkerRef.current = new window.google.maps.Marker({
                  position: leg.start_location,
                  map: mapRef.current,
                  title: 'Origen',
                });
              }
              console.log('taxi debug: directions renderizado');
            } catch (e) {
              console.warn('taxi debug: No se pudo actualizar pickup marker desde directions', e);
            }
          } else {
            console.error('taxi debug: Directions error', status);
          }
        }
      );
    } catch (e) {
      console.warn('taxi debug: Error solicitando directions', e);
    }
  }, [consultedTravel, travelData]);

  // Handlers que ConductorRender espera
  const handleTravelCardClick = (index) => setConsultedTravel(index);
  const handleBackButtonClick = () => setConsultedTravel(null);
  const handleCloseButtonClick = (index) => {
    setTravelData(prev => prev.filter((_, i) => i !== index));
    if (travelData.length <= 1) setIsWaiting(true);
    markersRef.current.forEach(m => { try { m.setMap(null); } catch (e) {} });
    markersRef.current = [];
  };

  const handleAcceptTrip = async (index) => {
    const idx = typeof index === 'number' ? index : consultedTravel;
    const travel = travelData[idx];
    if (!travel) return console.error('taxi debug: No hay viaje para aceptar en index', idx);

    try {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('oferta', {
          driverId: userId,
          travelId: travel.id || travel.travelId,
          originAddress: travel.originAdress,
          destinationAddress: travel.destinationAdress,
          coordinates: userCoords,
        });
        setTravelData(prev => prev.map((t, i) => i === idx ? { ...t, accepted: true } : t));
        setIsWaiting(true);
        console.log('taxi debug: oferta emitida via socket');
      } else {
        try {
          await axios.post(`${process.env.REACT_APP_STRAPI_URL}/api/ofertas`, {
            driverId: userId,
            travelId: travel.id || travel.travelId,
          });
          setTravelData(prev => prev.map((t, i) => i === idx ? { ...t, accepted: true } : t));
          setIsWaiting(true);
          console.log('taxi debug: oferta emitida via HTTP fallback');
        } catch (e) {
          console.warn('taxi debug: Fallback oferta HTTP fallo', e);
        }
      }
    } catch (e) {
      console.error('taxi debug: Error en handleAcceptTrip', e);
    }
  };

  const handlePasajero = () => {
    setShowTabs(true);
    setActiveTab('pasajero');
  };

  const handleConductor = () => {
    setShowTabs(false);
    setActiveTab('conductor');
    setShiftToPasajero(true);
  };

  const ElapsedTimer = ({ startTime }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    useEffect(() => {
      if (!startTime) return;
      const interval = setInterval(() => {
        const now = new Date();
        const start = new Date(startTime);
        const diff = Math.floor((now - start) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
      return () => clearInterval(interval);
    }, [startTime]);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return <span>{minutes}:{seconds < 10 ? '0' : ''}{seconds}</span>;
  };

  return (
    <ConductorRender
      isWaiting={isWaiting}
      googleMapsLoaded={googleMapsLoaded}
      mapRef={mapRef}
      userCoords={userCoords}
      setUserCoords={setUserCoords}
      travelData={travelData}
      consultedTravel={consultedTravel}
      handleTravelCardClick={handleTravelCardClick}
      handleBackButtonClick={handleBackButtonClick}
      handleCloseButtonClick={handleCloseButtonClick}
      handleAcceptTrip={handleAcceptTrip}
      handlePasajero={handlePasajero}
      handleConductor={handleConductor}
      ElapsedTimer={ElapsedTimer}
      showTabs={showTabs}
      hideTabs={hideTabs}
    />
  );
};

export default Conductor;
