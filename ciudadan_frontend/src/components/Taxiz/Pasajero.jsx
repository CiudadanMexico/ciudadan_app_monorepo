// src/components/Taxis/Pasajero.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/taxis.css';
import useGoogleMaps from '../../hooks/UseGoogleMaps';
import AcceptTrip from "./AcceptTrip.jsx";
import taxiIcon from '../../assets/taxi_marker.png';

const DEFAULT_FROM = { lat: 19.432608, lng: -99.133209 };
//const DEFAULT_TO = { lat: 19.432608, lng: -99.133209 };

const Pasajero = ({ onFoundDrivers = () => {} }) => {
  const { user } = useAuth0();
  const navigate = useNavigate();

  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');

  const [fromCoordinates, setFromCoordinates] = useState(DEFAULT_FROM);
  const [toCoordinates, setToCoordinates] = useState(DEFAULT_FROM);

  const [fromMarkerPosition, setFromMarkerPosition] = useState(DEFAULT_FROM);
  const [toMarkerPosition, setToMarkerPosition] = useState(DEFAULT_FROM);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const { mapRef, fromMarkerRef, toMarkerRef } = useGoogleMaps(
    fromCoordinates,
    setFromCoordinates,
    setFromMarkerPosition,
    toCoordinates,
    setToCoordinates,
    setToMarkerPosition,
    setFromAddress,
    setToAddress,
    setGoogleMapsLoaded,
    googleMapsLoaded
  );

  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);

  // Socket ref
  const socketRef = useRef(null);

  // Offers state + refs to store marker/infoWindow objects without forcing re-render
  const [offers, setOffers] = useState([]); // [{ id, coordinates, price, timestamp }]
  const offersRef = useRef([]); // same objects + { marker, infoWindow }
  const pendingOffersRef = useRef([]); // offers received before map is ready

  // Selected offer for modal
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Util: stringify safe
  const safeStringify = (obj, max = 2000) => {
    try {
      const s = JSON.stringify(obj, null, 2);
      return s.length > max ? s.slice(0, max) + '... (truncated)' : s;
    } catch (e) {
      return String(obj);
    }
  };

  // Helper to convert socket url ws -> http for fetch
  const socketUrlToHttp = (url = '') => {
    if (!url) return null;
    try {
      return url.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
    } catch (e) {
      return null;
    }
  };

  // Crear marker + infoWindow para una oferta
  const createMarkerForOffer = useCallback(
    (offer) => {
      if (!mapRef || !mapRef.current || !window.google) {
        // guardar en pendientes si el mapa no está listo
        pendingOffersRef.current.push(offer);
        return;
      }

      try {
        const { coordinates, price, id } = offer;
        const position = new window.google.maps.LatLng(coordinates.lat, coordinates.lng);

        // Marker
        const marker = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          icon: {
            url: taxiIcon,
            scaledSize: new window.google.maps.Size(20, 40),
          },
          title: `Oferta $${price}`,
        });

        // InfoWindow pequeño (recuadro) que aparece por defecto
        const infoContent = `
          <div id="offer-info-${id}" style="font-family: Arial, sans-serif; font-size:13px;">
            <div style="font-weight:600; margin-bottom:4px;">Oferta: $${price}</div>
            <div style="font-size:12px; color:#555;">Click para ver opciones</div>
          </div>
        `;

        const infoWindow = new window.google.maps.InfoWindow({
          content: infoContent,
          position,
        });

        // Abrir infoWindow automáticamente
        infoWindow.open(mapRef.current, marker);


         // Aplicar estilos al "globito" amarillo cuando el DOM del InfoWindow esté listo
  window.google.maps.event.addListener(infoWindow, 'domready', () => {
    try {
      const contentEl = document.getElementById(`offer-info-${id}`);
      if (contentEl) {
        contentEl.style.background = '#fff200'; // amarillo del branding
        contentEl.style.color = '#111';
        contentEl.style.padding = '4px 5px';
        contentEl.style.borderRadius = '10px';
        contentEl.style.boxShadow = '0 6px 16px rgba(0,0,0,0.18)';
        contentEl.style.minWidth = '140px';
        contentEl.style.textAlign = 'left';
      }

      // Intentamos suavizar/ocultar el fondo por defecto del InfoWindow para que se vea solo tu chip
      const iwOuter = document.querySelector('.gm-style-iw');
      if (iwOuter) {
        // Hacer transparente el contenedor principal
        iwOuter.style.background = 'transparent';
        // Normalmente, el sibling anterior contiene sombras/fondos; lo ocultamos
        const iwBackground = iwOuter.previousElementSibling;
        if (iwBackground) iwBackground.style.display = 'none';
      }
    } catch (errSty) {
      console.warn('[Pasajero] fallo aplicando estilos InfoWindow:', errSty);
    }
  });

        // Listener en marker: al click abrir modal y seleccionar oferta
        const markerClickListener = marker.addListener('click', () => {
          setSelectedOffer({ id, coordinates, price });
          setIsModalOpen(true);
        });

        // También añadir listener para el contenido del InfoWindow (domready)
        const domReadyListener = window.google.maps.event.addListener(infoWindow, 'domready', () => {
          const elem = document.getElementById(`offer-info-${id}`);
          if (elem) {
            // hacer que click en el recuadro abra modal
            elem.style.cursor = 'pointer';
            if (!elem._hasClick) {
              elem.addEventListener('click', () => {
                setSelectedOffer({ id, coordinates, price });
                setIsModalOpen(true);
              });
              elem._hasClick = true;
            }
          }
        });

        // guardar en refs
        offersRef.current.push({
          ...offer,
          marker,
          infoWindow,
          _listeners: { markerClickListener, domReadyListener },
        });

        // actualizar state (solo metadatos, sin los objetos google para evitar serialización)
        setOffers((prev) => [...prev, { id, coordinates, price, timestamp: offer.timestamp }]);
      } catch (e) {
        console.warn('[Pasajero] error creando marker para oferta', e);
      }
    },
    [mapRef]
  );

  // Procesar ofertas pendientes cuando el mapa esté listo
  useEffect(() => {
    if (!googleMapsLoaded) return;
    if (pendingOffersRef.current.length === 0) return;
    pendingOffersRef.current.forEach((of) => createMarkerForOffer(of));
    pendingOffersRef.current = [];
  }, [googleMapsLoaded, createMarkerForOffer]);

  useEffect(() => {
    console.log('[Pasajero] montaje: intentando conectar socket a', process.env.REACT_APP_SOCKET_URL);
    try {
      socketRef.current = io(process.env.REACT_APP_SOCKET_URL, {
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('[Socket] conectado id=', socketRef.current.id, 'url=', process.env.REACT_APP_SOCKET_URL);
      });

      socketRef.current.on('connect_error', (err) => {
        console.warn('[Socket] connect_error:', err && (err.message || err));
      });

      socketRef.current.on('disconnect', (reason) => {
        console.warn('[Socket] disconnected:', reason);
      });

      socketRef.current.on('drivers-found', (drivers) => {
        console.log('[Socket] evento drivers-found recibido. payload:', safeStringify(drivers, 4000));
        try {
          if (Array.isArray(drivers)) {
            drivers.forEach((d) => {
              if (d.coordinates && mapRef && mapRef.current) {
                // pintar marcadores de drivers (sin infoWindow)
                try {
                  const pos = new window.google.maps.LatLng(d.coordinates.lat, d.coordinates.lng);
                  const marker = new window.google.maps.Marker({
                    position: pos,
                    map: mapRef.current,
                    icon: {
                      url: taxiIcon,
                      scaledSize: new window.google.maps.Size(36, 36),
                    },
                    title: d.name || 'Taxista',
                  });
                  // opcional: no guardamos estos markers en offersRef
                } catch (e) {
                  console.warn('[drivers-found] error creando marker', e);
                }
              }
            });
          }
        } catch (e) {
          console.warn('[Socket] error pintando markers drivers-found', e);
        }
        onFoundDrivers(drivers);
        setLoadingSearch(true);
      });

      socketRef.current.on('search-error', (msg) => {
        console.warn('[Socket] search-error recibido:', msg);
        setError(msg || 'Error en búsqueda via socket');
        setLoadingSearch(true);
      });

      // opcional: ack de server si envia "trip-ack" o similar
      socketRef.current.on('trip-ack', (ack) => {
        console.log('[Socket] trip-ack recibido:', ack);
      });

      // NUEVO: escucha del evento de oferta de viaje
      socketRef.current.on('ofertaviaje', (payload) => {
        // payload esperado: { coordinates: { lat, lng }, price: 123, ... }
        console.log('[Socket] ofertaviaje recibido:', safeStringify(payload, 2000));
        try {
          const coordinates = payload.coordinates || payload.coords || payload.location || null;
          const price = payload.precio ?? payload.price ?? null;
          if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
            console.warn('[ofertaviaje] payload sin coordinates válidas:', payload);
            return;
          }
          const id = `offer-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const offer = {
            id,
            coordinates: { lat: Number(coordinates.lat), lng: Number(coordinates.lng) },
            price,
            timestamp: new Date().toISOString(),
            raw: payload,
          };
          createMarkerForOffer(offer);
        } catch (e) {
          console.warn('[ofertaviaje] error procesando payload', e);
        }
      });
    } catch (e) {
      console.error('[Pasajero] no se pudo inicializar socket:', e);
      socketRef.current = null;
    }

    return () => {
      console.log('[Pasajero] desmontando componente: limpiando socket listeners y markers');
      try {
        if (socketRef.current) {
          socketRef.current.off('drivers-found');
          socketRef.current.off('search-error');
          socketRef.current.off('connect');
          socketRef.current.off('disconnect');
          socketRef.current.off('trip-ack');
          socketRef.current.off('ofertaviaje');
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      } catch (e) {
        console.warn('[Pasajero] error limpiando socket:', e);
      }

      // limpiar markers/infoWindows
      try {
        offersRef.current.forEach((o) => {
          try {
            if (o.infoWindow) {
              o.infoWindow.close();
            }
            if (o.marker) {
              // quitar listeners si existen
              if (o._listeners && o._listeners.markerClickListener) {
                window.google.maps.event.removeListener(o._listeners.markerClickListener);
              }
              if (o._listeners && o._listeners.domReadyListener) {
                window.google.maps.event.removeListener(o._listeners.domReadyListener);
              }
              o.marker.setMap(null);
            }
          } catch (inner) {
            // noop
          }
        });
        offersRef.current = [];
      } catch (e) {
        console.warn('[Pasajero] error limpiando markers al desmontar', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('[Pasajero] geolocalización no disponible');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.log('[Pasajero] geolocation success:', lat, lng);
        setFromCoordinates({ lat, lng });
        setFromMarkerPosition({ lat, lng });
        if (mapRef && mapRef.current && mapRef.current.setCenter) {
          mapRef.current.setCenter({ lat, lng });
        }
        try {
          if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              console.log('[Pasajero] geocoder status:', status);
              if (status === 'OK' && results && results[0]) {
                setFromAddress(results[0].formatted_address);
              }
            });
          }
        } catch (e) {
          console.warn('[Pasajero] geocoder error:', e);
        }
      },
      (err) => {
        console.warn('[Pasajero] geolocation error:', err);
      },
      { maximumAge: 1000 * 60 * 5, timeout: 5000 }
    );
  }, [mapRef]);

  useEffect(() => {
    if (!mapRef || !mapRef.current || !window.google) return;
    if (!directionsServiceRef.current) directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#6d0c5dff',
          strokeWeight: 6,
          strokeOpacity: 0.95,
        },
      });
      directionsRendererRef.current.setMap(mapRef.current);
    }
    return () => {
      if (directionsRendererRef.current) {
        try {
          directionsRendererRef.current.setMap(null);
        } catch (e) {}
      }
    };
  }, [mapRef, googleMapsLoaded]);

  const drawRouteOnMap = useCallback(
    (origin, destination) => {
      if (!window.google || !directionsServiceRef.current || !directionsRendererRef.current) {
        console.warn('[drawRouteOnMap] google/directions no listos');
        return;
      }

      const originParam = typeof origin === 'string' ? origin : { lat: origin.lat, lng: origin.lng };
      const destParam = typeof destination === 'string' ? destination : { lat: destination.lat, lng: destination.lng };

      directionsServiceRef.current.route(
        {
          origin: originParam,
          destination: destParam,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          console.log('[drawRouteOnMap] Directions callback status=', status);
          if (status === window.google.maps.DirectionsStatus.OK || status === 'OK') {
            directionsRendererRef.current.setDirections(result);
            try {
              const leg = result.routes[0].legs[0];
              const start = leg.start_location;
              const end = leg.end_location;
              if (fromMarkerRef && fromMarkerRef.current) fromMarkerRef.current.setPosition(start);
              if (toMarkerRef && toMarkerRef.current) toMarkerRef.current.setPosition(end);
              if (mapRef && mapRef.current && mapRef.current.fitBounds) {
                const bounds = new window.google.maps.LatLngBounds();
                result.routes[0].overview_path.forEach((p) => bounds.extend(p));
                mapRef.current.fitBounds(bounds);
              }
            } catch (e) {
              console.warn('[drawRouteOnMap] error updating markers after route', e);
            }
          } else {
            console.error('[drawRouteOnMap] error', status, result);
          }
        }
      );
    },
    [directionsRendererRef, directionsServiceRef, mapRef, fromMarkerRef, toMarkerRef]
  );

  useEffect(() => {
    if (!mapRef || !mapRef.current) return;
    if (!fromCoordinates || !toCoordinates) return;
    drawRouteOnMap(fromCoordinates, toCoordinates);
  }, [fromCoordinates, toCoordinates, drawRouteOnMap, mapRef]);

  const swapOriginDestination = useCallback(() => {
    const aAddr = fromAddress;
    const bAddr = toAddress;
    setFromAddress(bAddr);
    setToAddress(aAddr);

    const aCoords = fromCoordinates;
    const bCoords = toCoordinates;
    setFromCoordinates(bCoords);
    setToCoordinates(aCoords);

    setFromMarkerPosition(bCoords);
    setToMarkerPosition(aCoords);

    if (fromMarkerRef && fromMarkerRef.current) fromMarkerRef.current.setPosition(bCoords);
    if (toMarkerRef && toMarkerRef.current) toMarkerRef.current.setPosition(aCoords);

    if (mapRef && mapRef.current) mapRef.current.setCenter(bCoords);

    drawRouteOnMap(bCoords, aCoords);
  }, [fromAddress, toAddress, fromCoordinates, toCoordinates, mapRef, fromMarkerRef, toMarkerRef, drawRouteOnMap]);

  // BUSCAR TAXISTAS
  const buscarTaxistas = async () => {
    setError(null);
    setLoadingSearch(true);

    const userEmail = user?.email ?? null;
    const payload = {
      userEmail,
      originCoordinates: fromCoordinates || null,
      destinationCoordinates: toCoordinates || null,
      originAddress: fromAddress || null,
      destinationAddress: toAddress || null,
      timestamp: new Date().toISOString(),
    };

    try {
      // 1) Intentar POST a /test/send-trip (backend)
      const backendBase =
        process.env.REACT_APP_SOCKET_URL ||
        socketUrlToHttp(process.env.REACT_APP_SOCKET_URL) ||
        null;

      if (backendBase) {
        const url = `${backendBase.replace(/\/$/, '')}/test/send-trip`;
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail,
              originCoordinates: payload.originCoordinates,
              destinationCoordinates: payload.destinationCoordinates,
              originAdress: payload.originAddress,
              destinationAdress: payload.destinationAddress,
              broadcast: true
            }),
          });
          const text = await resp.text().catch(() => null);
        } catch (e) {
          console.warn('[buscarTaxistas] error en POST /test/send-trip:', e);
        }
      } else {
        console.warn('[buscarTaxistas] no se pudo determinar backendBase para POST /test/send-trip — revisa env vars');
      }

    } catch (err) {
      console.error('[buscarTaxistas] error general:', err);
      setError(err.message || 'Error buscando taxistas');
    } finally {
      setLoadingSearch(true);
      console.log('[buscarTaxistas] finalizado (loadingSearch=false).');
    }
  };

  const centerOnOrigin = () => {
    if (mapRef && mapRef.current) {
      mapRef.current.setCenter(fromCoordinates);
      if (mapRef.current.setZoom) mapRef.current.setZoom(15);
    }
  };

  // Cerrar modal y limpiar selección
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOffer(null);
  };

  // Aceptar oferta: ahora llama al backend /api/aceptar-viaje y navega a /taxis/viaje/:travelId
  const acceptOffer = async () => {
    console.log('aceptando oferta');
    // construir backend base igual que en buscarTaxistas
    const backendBase =
      process.env.REACT_APP_SOCKET_URL || 'http://localhost:3033';

    if (!selectedOffer) {
      console.warn('[acceptOffer] no hay oferta seleccionada');
      return;
    }

    // Evitar reentradas
    try {
      // Realiza la llamada al backend que creamos: POST /api/aceptar-viaje
      if (!backendBase) {
        console.warn('[acceptOffer] backendBase no configurado. Revisa REACT_APP_SOCKET_URL o env vars.');
        // procedemos con el comportamiento antiguo (cerrar modal y remover marker)
        try {
          const idx = offersRef.current.findIndex((o) => o.id === selectedOffer?.id);
          if (idx !== -1) {
            const o = offersRef.current[idx];
            if (o.infoWindow) o.infoWindow.close();
            if (o.marker) o.marker.setMap(null);
            offersRef.current.splice(idx, 1);
            setOffers((prev) => prev.filter((p) => p.id !== selectedOffer.id));
          }
        } catch (e) {
          console.warn('[acceptOffer] error removiendo marcador', e);
        } finally {
          setSelectedOffer(null);
          setIsModalOpen(false);
        }
        return;
      }

      const url = `${backendBase.replace(/\/$/, '')}/api/aceptar-viaje`;

      // Payload: llenamos los campos que solicitaste en Strapi
      const body = {
        userEmail: user?.email ?? null,
        origencoords: fromCoordinates ?? null,
        destinocoords: toCoordinates ?? null,
        conductorcoords: selectedOffer.coordinates ?? null,
        origendireccion: { label: fromAddress ?? '' },
        destinodireccion: { label: toAddress ?? '' },
        solicitado: new Date().toISOString(),
        travelid: selectedOffer.id ?? undefined,
        observaciones: selectedOffer.raw?.meta?.note ?? '',
        costo: typeof selectedOffer.price === 'number' ? selectedOffer.price : Number(selectedOffer.price) || null
      };

      let respJson = null;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await resp.text();
        try {
          respJson = JSON.parse(text);
        } catch (e) {
          respJson = { ok: resp.ok, rawText: text };
        }
        if (!resp.ok) {
          console.warn('[acceptOffer] respuesta no ok:', resp.status, respJson);
          // mostrar error y no navegar
          setError((respJson && respJson.error) ? respJson.error : `Error server ${resp.status}`);
          return;
        }
      } catch (err) {
        console.error('[acceptOffer] error en fetch aceptar-viaje:', err);
        setError(err.message || 'Error enviando aceptación al backend');
        return;
      }

      // Si llegamos aquí, la creación en Strapi fue (probablemente) exitosa
      const travelIdReturned = (respJson && respJson.travelId) ? respJson.travelId : (respJson && respJson.created && respJson.created.id ? String(respJson.created.id) : null);

      // comportamiento antiguo: remover marcador y cerrar modal
      try {
        const idx = offersRef.current.findIndex((o) => o.id === selectedOffer?.id);
        if (idx !== -1) {
          const o = offersRef.current[idx];
          if (o.infoWindow) o.infoWindow.close();
          if (o.marker) o.marker.setMap(null);
          offersRef.current.splice(idx, 1);
          setOffers((prev) => prev.filter((p) => p.id !== selectedOffer.id));
        }
      } catch (e) {
        console.warn('[acceptOffer] error removiendo marcador', e);
      } finally {
        setSelectedOffer(null);
        setIsModalOpen(false);
      }

      // navegar a la ruta del viaje usando travelId retornado por tu endpoint
      if (travelIdReturned) {
        navigate(`/taxis/viaje/${travelIdReturned}`);
      } else {
        // fallback: si no retornaron travelId, intenta con selectedOffer.id
        navigate(`/taxis/viaje/${selectedOffer.id}`);
      }
    } catch (e) {
      console.error('[acceptOffer] error general:', e);
      setError(e && e.message ? e.message : 'Error aceptando oferta');
    }
  };

  const cancelarBusqueda = () => {
    setLoadingSearch(false)
    };
  

  return (
    <div className="taxis-container">
      <h3 className="trip-title" style={{ textAlign: 'center' }}>Buscar un viaje</h3>

      <div className="inputs-row improved-row">
        <div className="input-wrap">
          <input
            id="from-input"
            type="text"
            placeholder="Origen (tu ubicación por defecto)"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            className="lugar-input pasajero-origen"
          />
        </div>

        <div className="swap-wrap">
          <button
            title="Intercambiar origen/destino"
            onClick={swapOriginDestination}
            className="swap-button"
            aria-label="Intercambiar origen y destino"
          >
            ⇅
          </button>
        </div>

        <div className="input-wrap">
          <input
            id="to-input"
            type="text"
            placeholder="Destino"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            className="lugar-input pasajero-destino"
          />
        </div>
      </div>

      <div className="controls-row">
        <button
          onClick={buscarTaxistas}
          disabled={loadingSearch}
          className="buscar-taxistas formulario-pasajero pasajero-buscar"
          style={{
            flex: 1,
            padding: '12px 16px',
            backgroundColor: '#ff4081',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: loadingSearch ? 'default' : 'pointer',
          }}
        >
          {loadingSearch ? 'Buscando taxistas...' : 'Buscar Conductores'}
          
        </button>
        {loadingSearch && (
  <button
    onClick={cancelarBusqueda}
    className="cancelar-busqueda"
    style={{
      flex: 1,
      padding: "12px 16px",
      backgroundColor: "#5f5a5bff",
      color: "white",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      marginLeft: 8,
    }}
  >
    Cancelar
  </button>
)}
        <button
          onClick={centerOnOrigin}
          className="center-button"
          title="Centrar en origen"
        >
          📍
        </button>
      </div>

      {error && (
        <div className="error-text">
          {typeof error === 'string'
            ? error
            : (error && (error.error || error.message))
            ? String(error.error || error.message)
            : JSON.stringify(error)}
        </div>
      )}
      <div className="taxis-map formulario-pasajero" style={{ width: '100%', height: '60vh', borderRadius: 8, overflow: 'hidden' }}>
        <div id="map" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Modal simple para oferta */}
      {isModalOpen && selectedOffer && (
      <AcceptTrip
          selectedOffer={selectedOffer}
          acceptOffer={acceptOffer}
          closeModal={closeModal}
        />
      )}
    </div>
  );
};

export default Pasajero;
