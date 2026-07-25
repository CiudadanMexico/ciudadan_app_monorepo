// src/components/Taxis/Conductor.js
import React, { useEffect, useRef, useState } from 'react';
import { Button, Typography, Box } from '@mui/material';
import io from 'socket.io-client';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import BottomSheet from '../BottomSheet.jsx';
import ConductorRender from './ConductorRender.jsx'; // tu render (el UI que pegaste)
import taxiIcon from '../../assets/taxi_marker.png'; // si está en otra ruta ajusta
import userIcon from '../../assets/user_marker.png'; // si está en otra ruta ajusta
// NOTA: asegúrate de tener REACT_APP_GOOGLE_MAPS_API_KEY y REACT_APP_SOCKET_URL en .env

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
  const { user, isAuthenticated } = useAuth0();
  const [isWaiting, setIsWaiting] = useState(true);
  const [travelData, setTravelData] = useState([]);
  const [userId, setUserId] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [consultedTravel, setConsultedTravel] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  const mapRef = useRef(null); // guardamos instancia Map en .current
  const socketRef = useRef(null);
  const markersRef = useRef([]); // array de marcadores añadidos (para limpiar)
  const pickupMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const [sheetState, setSheetState] = useState('collapsed');

  /* --------------------------
     Helpers: cargar Google Maps
     -------------------------- */
  const loadGoogleMaps = () => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        return resolve();
      }
      const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
      if (!key) {
        console.warn(
          'Falta REACT_APP_GOOGLE_MAPS_API_KEY en .env — se intentará con window.google si ya está cargado.',
        );
        return reject(new Error('No API key'));
      }
      const src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      // si ya existe un script con esa src, esperar su carga
      const exists = Array.from(document.getElementsByTagName('script')).some(
        (s) => s.src && s.src.includes(src),
      );
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

  const getSheetContent = () => {
    if (consultedTravel !== null && travelData[consultedTravel]) {
      const travel = travelData[consultedTravel];
      return (
        <>
          <Typography variant='h6'>Viaje solicitado</Typography>
          <Typography>
            Origen: {travel.originAdress || 'No especificado'}
          </Typography>
          <Typography>
            Destino: {travel.destinationAdress || 'No especificado'}
          </Typography>
          <Typography>Ganancia estimada: $150 MXN</Typography>
          {sheetState === 'full' && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant='contained'
                color='primary'
                fullWidth
                onClick={() => handleAcceptTrip(consultedTravel)}
              >
                Aceptar viaje
              </Button>
              <Button
                variant='outlined'
                color='error'
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => handleReject(consultedTravel)}
              >
                Rechazar
              </Button>
            </Box>
          )}
        </>
      );
    } else if (!isWaiting) {
      // Hay viajes disponibles pero ninguno seleccionado
      return (
        <>
          <Typography variant='h6'>Viajes disponibles</Typography>
          <Typography>
            {travelData.length} solicitud(es) pendiente(s)
          </Typography>
          <Typography>
            Desliza hacia arriba y selecciona una tarjeta para ver más detalles.
          </Typography>
        </>
      );
    } else {
      return (
        <>
          <Typography variant='h6'>Esperando solicitudes</Typography>
          <Typography>
            Estás en línea. Aparecerán aquí los viajes cercanos.
          </Typography>
        </>
      );
    }
  };

  /* --------------------------
     Inicializa mapa (no bloquear UI)
     -------------------------- */
  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (!mounted) return;
        setGoogleMapsLoaded(true);
        // si el div #map ya existe, inicializamos la instancia del mapa
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
        // Si falla la carga por clave o bloqueo, intentamos marcar como cargado
        console.warn('loadGoogleMaps fallo:', err);
        // No forzamos que mapRef exista; el UI seguirá mostrando esperando y demás.
      });
    return () => {
      mounted = false;
    };
    // NOTE: intencionalmente no ponemos dependencia para que solo se intente al montar
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Posición preferida: userCoords si la tienes, si no el centro actual del mapa
    const driverPos =
      userCoords && userCoords.lat && userCoords.lng
        ? { lat: Number(userCoords.lat), lng: Number(userCoords.lng) }
        : mapRef.current.getCenter
          ? mapRef.current.getCenter().toJSON()
          : ZOCALO;

    // Crear o actualizar marker del conductor (usa taxiIcon)
    try {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: driverPos,
          map: mapRef.current,
          title: 'Conductor',
          icon: taxiIcon
            ? { url: taxiIcon, scaledSize: new window.google.maps.Size(40, 40) }
            : undefined,
        });
      } else {
        driverMarkerRef.current.setPosition(driverPos);
        driverMarkerRef.current.setMap(mapRef.current);
      }
    } catch (e) {
      console.warn('[Conductor] error creando/actualizando driverMarker', e);
    }

    // Centrar el mapa en el conductor (puedes ajustar zoom)
    try {
      mapRef.current.setCenter(driverPos);
      if (mapRef.current.setZoom) mapRef.current.setZoom(14);
    } catch (e) {
      // noop
    }

    // Asegurar que DirectionsRenderer NO pinte markers "por su cuenta"
    try {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setOptions({ suppressMarkers: true });
      }
    } catch (e) {
      // noop
    }

    // Evitar crear markers duplicados: NO hagas markersRef.current.push(marker) aquí
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef.current, userCoords]);

  /* --------------------------
     Inicializar Directions (cuando esté el mapa)
     -------------------------- */
  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (!directionsServiceRef.current)
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer(
        {
          suppressMarkers: true,
          polylineOptions: { strokeWeight: 6, strokeOpacity: 0.95 },
        },
      );
      directionsRendererRef.current.setMap(mapRef.current);
    } else {
      // reafirmar la opción para evitar que Google dibuje markers por su cuenta
      try {
        directionsRendererRef.current.setOptions({ suppressMarkers: true });
      } catch (e) {
        /* noop */
      }
    }
  }, [mapRef.current, googleMapsLoaded]);

  /* --------------------------
     Obtener userId desde Strapi (si usas autenticación)
     Aquí intento buscar por email en /api/users. Ajusta si tu API responde distinto.
     -------------------------- */
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setUserId(user.email); // ← AQUÍ queda tu driverId real
      console.log('taxi debug: driverId asignado ->', user.email);
    }
  }, [isAuthenticated, user]);

  /* --------------------------
     SOCKET: conectar y listeners (siempre que no haya otro socket)
     -------------------------- */
  useEffect(() => {
    if (socketRef.current) return; // ya conectado
    try {
      const socket = io(process.env.REACT_APP_SOCKET_URL, {
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Conductor socket conectado', socket.id);
        if (userId) {
          socket.emit('register-driver', { driverId: userId });
        }
      });

      // Llega un request de viaje (targeted o broadcast)
      socket.on('trip-request', (data) => {
        try {
          console.log('trip-request recibido:', data);
          if (!data) return;
          // criterio: si viene driverId y coincide, o viene broadcast/nearby o candidateDrivers incluye userId
          const addressed =
            data.driverId ||
            userId ||
            data.driverId.toString() === userId.toString();
          console.log('trip-request addressed:', addressed);
          const broadcast = data.broadcast === true || data.target === 'nearby';
          const included =
            Array.isArray(data.candidateDrivers) ||
            userId ||
            data.candidateDrivers.map(String).includes(String(userId));
          console.log('trip-request broadcast:', broadcast, 'included:', included);
          if (addressed || broadcast || included) {
            // añadir al arreglo de viajes
            console.log('[Conductor] trip-request dirigido a este conductor, agregando a travelData');
            setTravelData((prev) => {
              const next = [...prev, userId ? { ...data, userEmail: userId } : data];
              return next;
            });
            console.log('[Conductor] trip-request agregado a travelData, total:', travelData.length + 1);
            console.log('[Conductor] conductores:', travelData);
            setIsWaiting(false);

            // Añadir marcador del origen al mapa (si vienen coords)
            if (mapRef.current && window.google && data.originCoordinates) {
              try {
                // crear marcador y guardarlo para limpiar después
                const marker = new window.google.maps.Marker({
                  position: data.originCoordinates,
                  map: mapRef.current,
                  title: data.originAdress || 'Origen',
                  icon: {
                    url: userIcon,
                    scaledSize: new window.google.maps.Size(44, 44),
                  },
                });
                markersRef.current.push(marker);
                // centrar suavemente
                if (mapRef.current.setCenter)
                  mapRef.current.setCenter(data.originCoordinates);
              } catch (e) {
                console.warn('No se pudo crear pickup marker manual:', e);
              }
            }
          } else {
            // mensaje no dirigido a este conductor: ignorarlo
            // console.log('trip-request no dirigido a este conductor, ignorando');
          }
        } catch (e) {
          console.error('Error manejando trip-request', e);
        }
      });

      // Listener opcional cuando pasajero obtiene conductores
      socket.on('drivers-found', (payload) => {
        // normalmente interesa al pasajero, pero lo dejo por debug
        console.log('drivers-found (conductor):', payload);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket desconectado:', reason);
      });

      socket.on('connect_error', (err) => {
        console.warn('Socket connect_error', err);
      });
    } catch (e) {
      console.error('Error creando socket conductor:', e);
    }

    return () => {
      // cleanup
      try {
        if (socketRef.current) {
          socketRef.current.off('trip-request');
          socketRef.current.off('drivers-found');
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      } catch (e) {
        console.warn('Error limpiando socket conductor:', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // reconectará si cambia userId

  /* --------------------------
     Limpiar marcadores cuando se desmonta o cuando se vacía travelData
     -------------------------- */
  useEffect(() => {
    return () => {
      // al desmontar limpiamos marcadores
      if (markersRef.current && markersRef.current.length) {
        markersRef.current.forEach((m) => {
          try {
            m.setMap(null);
          } catch (e) { }
        });
        markersRef.current = [];
      }
      if (pickupMarkerRef.current) {
        try {
          pickupMarkerRef.current.setMap(null);
        } catch (e) { }
        pickupMarkerRef.current = null;
      }
    };
  }, []);

  /* --------------------------
   Mostrar ruta: conductor -> pickup (origen) -> destino
   Reemplaza el useEffect antiguo con este
   -------------------------- */
  useEffect(() => {
    if (consultedTravel === null) return;
    const travel = travelData[consultedTravel];
    if (!travel) return;
    if (!window.google || !mapRef.current) return;

    const pickupCoords =
      travel.originCoordinates || travel.originAdress || null;
    const destinationCoords =
      travel.destinationCoordinates || travel.destinationAdress || null;
    const driverCoords =
      userCoords ||
      (mapRef.current.getCenter ? mapRef.current.getCenter().toJSON() : null);

    if (!pickupCoords || !destinationCoords || !driverCoords) {
      console.warn('[Conductor] coords insuficientes para dibujar ruta', {
        driverCoords,
        pickupCoords,
        destinationCoords,
      });
      return;
    }

    if (!directionsServiceRef.current)
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer(
        {
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#cc19d2ff',
            strokeWeight: 6,
            strokeOpacity: 0.95,
          },
        },
      );
      directionsRendererRef.current.setMap(mapRef.current);
    }

    try {
      const request = {
        origin: {
          lat: Number(driverCoords.lat),
          lng: Number(driverCoords.lng),
        },
        destination: {
          lat: Number(destinationCoords.lat),
          lng: Number(destinationCoords.lng),
        },
        waypoints: [
          {
            location: {
              lat: Number(pickupCoords.lat),
              lng: Number(pickupCoords.lng),
            },
            stopover: true,
          },
        ],
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (
          status === 'OK' ||
          status === window.google.maps.DirectionsStatus.OK
        ) {
          directionsRendererRef.current.setDirections(result);

          // actualizar/crear markers: driver, pickup, destination
          try {
            const legs = result.routes?.[0]?.legs || [];
            // driver marker (usa taxiIcon si existe)
            const driverPos = {
              lat: Number(driverCoords.lat),
              lng: Number(driverCoords.lng),
            };
            if (driverMarkerRef.current) {
              driverMarkerRef.current.setPosition(driverPos);
              driverMarkerRef.current.setMap(mapRef.current);
            } else {
              driverMarkerRef.current = new window.google.maps.Marker({
                position: driverPos,
                map: mapRef.current,
                title: 'Conductor',
                icon: taxiIcon
                  ? {
                    url: taxiIcon,
                    scaledSize: new window.google.maps.Size(40, 40),
                  }
                  : undefined,
              });
            }

            // pickup marker (origen) — usa userIcon si disponible, si no default
            const leg = result.routes?.[0]?.legs?.[0];
            const pickupPos = leg
              ? leg.start_location
              : {
                lat: Number(pickupCoords.lat),
                lng: Number(pickupCoords.lng),
              };
            if (pickupMarkerRef.current) {
              pickupMarkerRef.current.setPosition(pickupPos);
              pickupMarkerRef.current.setMap(mapRef.current);
            } else {
              pickupMarkerRef.current = new window.google.maps.Marker({
                position: pickupPos,
                map: mapRef.current,
                title: 'Origen (pickup)',
                icon: {
                  url: taxiIcon,
                  scaledSize: new window.google.maps.Size(36, 36),
                },
              });
            }

            // destination marker — marcador normal (sin icono custom)
            // destination marker: END del último leg
            let destPos;
            if (legs.length >= 1 && legs[legs.length - 1].end_location) {
              destPos = legs[legs.length - 1].end_location;
            } else {
              destPos = {
                lat: Number(destinationCoords.lat),
                lng: Number(destinationCoords.lng),
              };
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
            console.warn('[Conductor] error actualizando markers', mkErr);
          }

          // ajustar viewport al recorrido completo
          try {
            const bounds = new window.google.maps.LatLngBounds();
            const overview = result.routes?.[0]?.overview_path;
            if (overview && overview.length) {
              overview.forEach((p) => bounds.extend(p));
            } else {
              bounds.extend({
                lat: Number(driverCoords.lat),
                lng: Number(driverCoords.lng),
              });
              bounds.extend({
                lat: Number(pickupCoords.lat),
                lng: Number(pickupCoords.lng),
              });
              bounds.extend({
                lat: Number(destinationCoords.lat),
                lng: Number(destinationCoords.lng),
              });
            }
            mapRef.current.fitBounds(bounds);
          } catch (bErr) {
            console.warn('[Conductor] fitBounds error', bErr);
          }
        } else {
          console.error('[Conductor] Directions error', status, result);
        }
      });
    } catch (e) {
      console.warn('[Conductor] Error solicitando directions', e);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultedTravel, travelData, userCoords]);

  /* --------------------------
     Handlers que el UI (ConductorRender) espera
     -------------------------- */
  const handleTravelCardClick = (index) => {
    setConsultedTravel(index);
  };

  const handleBackButtonClick = () => {
    // quitar la ruta dibujada
    try {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    } catch (e) {
      console.warn('Error limpiando directionsRenderer', e);
    }

    // quitar markers relacionados con la ruta (pickup, dest)
    try {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setMap(null);
        pickupMarkerRef.current = null;
      }
    } catch (e) {
      /* noop */
    }

    try {
      if (destMarkerRef.current) {
        destMarkerRef.current.setMap(null);
        destMarkerRef.current = null;
      }
    } catch (e) {
      /* noop */
    }

    // opcional: mantener driverMarker (conductor) visible — no lo removemos
    // si quieres recenter al driver:
    try {
      if (
        driverMarkerRef.current &&
        driverMarkerRef.current.getPosition &&
        mapRef.current
      ) {
        const pos = driverMarkerRef.current.getPosition().toJSON();
        mapRef.current.setCenter(pos);
      }
    } catch (e) { }

    // finalmente limpiar la vista de "detalle"
    setConsultedTravel(null);
  };

  const handleCloseButtonClick = (index) => {
    setTravelData((prev) => prev.filter((_, i) => i !== index));
    if (travelData.length <= 1) setIsWaiting(true);
    // limpiar markers asociados: aquí podríamos quitar marker por índice si los relaciones
    // para simplicidad limpiamos todos los markers y los volveremos a dibujar cuando sea necesario
    markersRef.current.forEach((m) => {
      try {
        m.setMap(null);
      } catch (e) { }
    });
    markersRef.current = [];
  };

  // NUEVO: handleReject — elimina el viaje, quita marker del origen si existe y emite por socket
  const coordsEqual = (pos1, coords) => {
    if (!pos1 || !coords) return false;
    try {
      const p = pos1.toJSON ? pos1.toJSON() : pos1;
      return (
        Number(p.lat).toFixed(6) === Number(coords.lat).toFixed(6) &&
        Number(p.lng).toFixed(6) === Number(coords.lng).toFixed(6)
      );
    } catch (e) {
      return false;
    }
  };

  const handleReject = (index) => {
    alert('iniciando !!');

    // quitar la card / viaje del estado
    setTravelData((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // si ya no quedan viajes, actualiza isWaiting
      if (next.length === 0) setIsWaiting(true);
      return next;
    });

    setConsultedTravel((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });

    // si ya no quedan viajes, volver a estado waiting
    if (travelData.length <= 1) setIsWaiting(true);

    markersRef.current.forEach((m) => {
      try {
        m.setMap(null);
      } catch (e) { }
    });
    markersRef.current = [];
  };

  const handleAcceptTrip = async (index) => {
    const idx = typeof index === 'number' ? index : consultedTravel;
    const travel = travelData[idx];
    console.log('handleAcceptTrip idx:', index, consultedTravel, 'travel:', travel);
    if (!travel)
      return console.error('No hay viaje para aceptar en index', idx);

    // Emitir oferta via socket
    try {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('oferta', {
          driverId: userId,
          travelId: travel.id || travel.travelId,
          originAddress: travel.originAdress,
          destinationAddress: travel.destinationAdress,
          coordinates: userCoords,
          destinationCoords: userCoords,
        });
        // marcar localmente como aceptado
        setTravelData((prev) =>
          prev.map((t, i) => (i === idx ? { ...t, accepted: true } : t)),
        );
        // opcional: ocultar lista y mostrar viaje en curso
        setIsWaiting(true);
      } else {
        // fallback HTTP (si tu backend dispone)
        try {
          await axios.post(`${process.env.REACT_APP_STRAPI_URL}/api/ofertas`, {
            driverId: userId,
            travelId: travel.id || travel.travelId,
          });
          setTravelData((prev) =>
            prev.map((t, i) => (i === idx ? { ...t, accepted: true } : t)),
          );
          setIsWaiting(true);
        } catch (e) {
          console.warn('Fallback oferta HTTP fallo', e);
        }
      }
    } catch (e) {
      console.error('Error en handleAcceptTrip', e);
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
    return (
      <span>
        {minutes}:{seconds < 10 ? '0' : ''}
        {seconds}
      </span>
    );
  };

  return (
    <>
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
        handleReject={handleReject}
        handleAcceptTrip={handleAcceptTrip}
        handlePasajero={handlePasajero}
        handleConductor={handleConductor}
        ElapsedTimer={ElapsedTimer}
        showTabs={showTabs}
        hideTabs={hideTabs}
      />
      <BottomSheet
        initialState='collapsed'
        onStateChange={setSheetState}
        collapsedHeight={150}
        mediumHeight={350}
        fullHeight={window.innerHeight - 50}
      >
        {getSheetContent()}
      </BottomSheet>
    </>
  );
};

export default Conductor;
