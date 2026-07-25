// src/routes/Rutas.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import io from 'socket.io-client';
import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import { useRoles } from '../Contexts/RolesContext';

import Probador from '../components/Testers/Probador.jsx';

// ---------- Páginas principales ----------
import HomeRoute from '../Pages/HomeRoute.jsx';
import GanaRoute from '../Pages/GanaRoute.jsx';
import TaxisRoute from '../Pages/TaxisRoute.jsx';
import RestaurantesRoute from '../Pages/RestaurantesRoute.jsx';
import MarketRoute from '../Pages/MarketRoute.jsx';
import Rompecabezas from '../components/Academia/Rompecabezas.jsx';
import ComunidadRoute from '../Pages/ComunidadRoute.jsx';
import GenRoute from '../Pages/GenRoute.jsx';
import OpWalletRoute from '../Pages/OpWalletRoute.jsx';
import CallbackPage from '../Pages/CallbackPage.jsx';
import RegistroPasajero from '../Pages/RegistroPasajero.jsx';
import RegistroConductor from '../Pages/RegistroConductor.jsx';
import PreRegistroConductor from '../Pages/PreRegistroConductor.jsx';

import Membresias from '../Pages/Membresias.jsx';
import MiMembresia from '../Pages/MiMembresia.jsx';
import MarketPlace from '../Pages/MarketPlace/MarketPlace.jsx';
import ProductosPage from '../Pages/MarketPlace/ProductosPage.jsx';
import CursosPage from '../Pages/Cursos/Cursos.jsx';
import Curso from '../Pages/Cursos/Curso.jsx';
import ContenidosPage from '../Pages/Blog/Contenidos.jsx';
import Contenido from '../Pages/Blog/Contenido.jsx';
import AgregarCurso from '../Pages/Blog/AgregarCurso.jsx';
import EditarContenido from '../Pages/Blog/EditarContenido.jsx';
import EliminarContenido from '../Pages/Blog/EliminarContenido.jsx';
import EditarCurso from '../Pages/Cursos/EditarCurso.jsx';
import EliminarCurso from '../Pages/Cursos/EliminarCurso.jsx';
//import Wiki from '../Pages/Wiki.jsx'; // si lo usas en algún lado
import WikiViewer from '../components/Wiki/WikiViewer.jsx';
import WikiHome from '../Pages/Wiki/WikiHome.jsx';

// ---------- Componentes / Pages adicionales ----------
import Perfil from '../components/Usuarios/Perfil.jsx';
import Favoritos from '../components/Usuarios/Favoritos.jsx';
import Food from '../Pages/Food/Food.jsx';
import AgregarTarea from '../Pages/Coowork/AgregarTarea.jsx';

import NavBar from '../components/NavBar/NavBar.jsx';
import RequisitosConductor from '../components/Taxiz/RequisitosConductor.jsx';
import Academia from '../components/Academia/Academia.jsx';
import LmAi from '../components/Asistente/LmAi.jsx';
import TTS from '../components/Tts.jsx';
import TextToSpeech from '../components/TextToSpeech.jsx';
import StripeSuccessRedirect from '../components/StripeSuccessRedirect.jsx';
//import AgregarClubWrapper from '../components/Clubs/AgregarClubWrapper.jsx';

import RegistroTienda from '../Pages/MarketPlace/RegistroTienda.jsx';
import AgregarProducto from '../Pages/MarketPlace/AgregarProducto.jsx';
import Tienda from '../Pages/MarketPlace/Tienda.jsx';
import Producto from '../Pages/MarketPlace/Producto.jsx';
import MiUbicacion from '../components/MiUbicacion.jsx';
import Carrito from '../Pages/MarketPlace/Carrito.jsx';
import MisProductos from '../Pages/MarketPlace/MisProductos.jsx';
import PedidosEntregados from '../Pages/MarketPlace/PedidosEntregados.jsx';
import PagosTienda from '../Pages/MarketPlace/PagosTienda.jsx';
import ConfiguracionTienda from '../Pages/MarketPlace/ConfiguracionTienda.jsx';
import EliminarProducto from '../Pages/MarketPlace/EliminarProducto.jsx';

import QuienesSomos from '../Pages/Info/QuienesSomos.jsx';
import PreguntasFrecuentes from '../Pages/Info/PreguntasFrecuentes.jsx';
import EventosPage from '../components/Eventos/index.jsx';
import Evento from '../Pages/Eventos/Evento.jsx';
import CrearEvento from '../Pages/Eventos/CrearEvento.jsx';

import Prueba from '../Pages/Prueba.jsx';

// Cartera / Coowork / Academia
import ITokens from '../Pages/Cartera/ITokens.jsx';
import Catalogo from '../Pages/Cartera/FreeBoocks/Catalogo.jsx';
import Coowork from '../Pages/Coowork/Coowork.jsx';
import Agencia from '../Pages/Coowork/Agencia.jsx';

// Taxis (pasajero / conductor / trip)
import Pasajero from '../components/Taxiz/Pasajero.jsx';
import Conductor from '../components/Taxiz/ConductorDebug.jsx';
import TripView from '../components/Taxiz/TripView.jsx';

//import QrScanner from '../components/Agencias/QrScanner.jsx';

// Membresías extras
import MembershipCheckout from '../components/Membresias/MembershipCheckout.jsx';
import ProbarMembresia from '../components/Membresias/ProbarMembresia.jsx';
import ActivaTuMembresia from '../components/Membresias/ActivaTuMembresia.jsx';

// Anuncios / Comunidad
import Anuncios from '../Pages/Anuncios/Anuncios.jsx';
import ComunidadPage from '../Pages/ComunidadPage.jsx';
import Referir from '../Pages/Comunidad/Referir.jsx';

// Contenidos / Blog
//import ContenidosPage from '../Pages/Blog/Contenidos.jsx';
import AgregarContenido from '../Pages/Blog/AgregarContenido.jsx';
//import EditarContenido from '../Pages/Blog/EditarContenido.jsx';
//import EliminarContenido from '../Pages/Blog/EliminarContenido.jsx';

// Notificaciones / Testers
import NotificationTester from '../components/Testers/NotificationTester.jsx';
import AllNotificaciones from '../Pages/Notificacions.jsx';
import Notificacion from '../Pages/Notificacion.jsx';

// Misc
import PreCargador from '../components/PreCargador.jsx';
import RegistroTiendaPage from '../Pages/MarketPlace/RegistroTienda.jsx';
import ReferirAlias from '../Pages/Comunidad/Referir.jsx';

import FinalizarCompra from '../Pages/MarketPlace/FinalizarCompra.jsx';

import Compras from '../Pages/MarketPlace/Compras.jsx';
import UsuarioPage from '../Pages/Usuarios/UsuarioPage';

import PreRegistroConductor2 from '../components/Taxiz/PreRegistroConductor2.jsx';
import ConductoresAgencia from '../components/Cowork/ConductoresAgencia.jsx';
import TestToken from '../components/TestToken.jsx';

// ---------- Wrappers (usar useParams) ----------
const EditarContenidoWrapper = () => {
  const { slug } = useParams();
  return (
    <EditarContenido
      filtros='editar'
      parametros={slug}
    />
  );
};
const EliminarContenidoWrapper = () => {
  const { slug } = useParams();
  return (
    <EliminarContenido
      filtros='eliminar'
      parametros={slug}
    />
  );
};
const EditarCursoWrapper = () => {
  const { slug } = useParams();
  return (
    <EditarCurso
      filtros='editar'
      parametros={slug}
    />
  );
};
const EliminarCursoWrapper = () => {
  const { slug } = useParams();
  return (
    <EliminarCurso
      filtros='eliminar'
      parametros={slug}
    />
  );
};
const EliminarProductoWrapper = () => {
  const { slug } = useParams();
  return (
    <EliminarProducto
      filtros='eliminar'
      parametros={slug}
    />
  );
};
const WikiWrapper = () => {
  const { slug } = useParams();
  return <WikiViewer slug={slug} />;
};

// Layout para Wiki
const WikiLayout = ({ children }) => (
  <>
    <div style={{ paddingTop: '64px' }}>{children}</div>
  </>
);

const TripViewRoute = () => {
  const { user } = useAuth0();
  const location = useLocation();
  const { roles: roleNames = [] } = useRoles();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL;
    if (!socketUrl) return undefined;

    const client = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    setSocket(client);

    return () => {
      client.disconnect();
      setSocket(null);
    };
  }, []);

  const strapiConfig = useMemo(() => ({
    baseUrl: process.env.REACT_APP_STRAPI_URL || '',
    token: process.env.REACT_APP_STRAPI_TOKEN || '',
  }), []);

  const tripUser = useMemo(() => {
    const normalizedRoles = Array.isArray(roleNames) ? roleNames : [];
    const roleValues = normalizedRoles.map((role) => String(role || '').toLowerCase());
    console.log('TripViewRoute: isDriver', location?.state?.isDriver);
    const explicitDriver = Boolean(
      location?.state?.isDriver
    );

    return {
      ...(user || {}),
      role: user?.role || (explicitDriver ? 'driver' : 'user'),
      isDriver: explicitDriver,
    };
  }, [location?.state?.isDriver, roleNames, user]);

  return (
    <TripView
      user={tripUser}
      socket={socket}
      strapiConfig={strapiConfig}
    />
  );
};

const Rutas = () => (
  <Routes>
    {/* RUTAS NORMALES */}
    <Route
      path='/'
      element={<HomeRoute />}
    />
    <Route
      path='/probador'
      element={<Probador />}
    />
    <Route
      path='/registrar'
      element={<ReferirAlias />}
    />

    {/* Callback / Auth */}
    <Route
      path='/callback'
      element={<CallbackPage />}
    />

    {/* Notificaciones */}
    <Route
      path='/notificaciones'
      element={<AllNotificaciones />}
    />
    <Route
      path='/notificacion/:id'
      element={<Notificacion />}
    />

    {/* Gana / GanaRoute */}
    <Route
      path='/gana'
      element={<GanaRoute />}
    />

    {/* Taxis */}
    <Route
      path='/taxis'
      element={<TaxisRoute />}
    />
    <Route
      path='/taxis/conductor/registro'
      element={<RegistroConductor />}
    />
    <Route
      path='/taxis/conductor/preregistro'
      element={<PreRegistroConductor />}
    />
    <Route
      path='/taxis/conductor/esperando'
      element={<Conductor />}
    />
    <Route
      path='/taxis/conductor/requisitos'
      element={<RequisitosConductor />}
    />
    <Route
      path='/taxis/pasajero/registro'
      element={<RegistroPasajero />}
    />
    <Route
      path='/taxis/pasajero/viaje'
      element={<Pasajero />}
    />
    <Route
      path='/taxis/viaje/:travelId'
      element={<TripViewRoute />}
    />

    <Route
      path='/herramientas/agencia/conductores'
      element={<ConductoresAgencia />}
    />

    {/* Food / Restaurantes */}
    <Route
      path='/food'
      element={<RestaurantesRoute />}
    />
    <Route
      path='/comida'
      element={<Food />}
    />
    <Route
      path='/restaurantes'
      element={<RestaurantesRoute />}
    />

    {/* Market / Marketplace / MarketRoute */}
    <Route
      path='/market'
      element={<MarketPlace />}
    />
    <Route
      path='/marketplaces'
      element={<MarketPlace />}
    />
    <Route
      path='/market/producto/:slug'
      element={<Producto />}
    />
    <Route
      path='/market/store/:slug'
      element={<Tienda />}
    >
      <Route
        path='agregar-producto'
        element={<AgregarProducto />}
      />
      <Route
        path='pedidos'
        element={<MisProductos />}
      />
      <Route
        path='entregados'
        element={<PedidosEntregados />}
      />
      <Route
        path='productos'
        element={<AgregarProducto />}
      />
      <Route
        path='preguntas-producto'
        element={<MisProductos />}
      />
      <Route
        path='pagos'
        element={<PagosTienda />}
      />
      <Route
        path='configuracion'
        element={<ConfiguracionTienda />}
      />
    </Route>
    <Route
      path='/registro-vendedor'
      element={<RegistroTienda />}
    />
    <Route
      path='/agregar-producto'
      element={<AgregarProducto />}
    />
    <Route
      path='/carrito'
      element={<Carrito />}
    />
    <Route
      path='/carrito/finalizar'
      element={<FinalizarCompra />}
    />
    <Route
      path='/market/compras/*'
      element={<Compras />}
    />
    <Route
      path='/productos/*'
      element={<ProductosPage />}
    />
    <Route
      path='/productos/eliminar/:slug'
      element={<EliminarProductoWrapper />}
    />
    <Route
      path='/productos/eliminar/:slug'
      element={<EliminarProductoWrapper />}
    />

    {/* Cartera / OpWallet */}
    <Route
      path='/cartera/itokens'
      element={<ITokens />}
    />
    <Route
      path='/cartera/FreeBoocks'
      element={<Catalogo />}
    />
    <Route
      path='/cartera/:moneda'
      element={<OpWalletRoute />}
    />
    <Route
      path='/cartera'
      element={<OpWalletRoute />}
    />
    <Route
      path='/comprar-tokens'
      element={<OpWalletRoute />}
    />

    <Route
      path='/taxis/preregistrar'
      element={<PreRegistroConductor2 />}
    />

    {/* Academia / Coowork */}
    <Route
      path='/academia'
      element={<Rompecabezas />}
    />
    <Route
      path='/academias'
      element={<Academia />}
    />
    <Route
      path='/academia/taxis'
      element={<Academia />}
    />
    <Route
      path='/coowork'
      element={<Coowork />}
    />
    <Route
      path='/herramientas/mi-agencia'
      element={<Agencia />}
    />
    <Route
      path='/herramientas/agregar-tarea'
      element={<AgregarTarea />}
    />

    {/* Perfil / Usuario */}
    <Route
      path='/perfil/:username'
      element={<Perfil />}
    />
    <Route
      path='/favoritos'
      element={<Favoritos />}
    />
    <Route
      path='/favoritos/*'
      element={<Favoritos />}
    />
    <Route
      path='/miqr'
      element={<UsuarioPage />}
    />

    {/* Ubicación */}
    <Route
      path='/ubicacion'
      element={<MiUbicacion />}
    />

    {/* Info / Wiki / Help */}
    <Route
      path='/wiki'
      element={<WikiHome />}
    />
    <Route
      path='/wiki/:slug'
      element={<WikiWrapper />}
    />
    <Route
      path='/quienes-somos'
      element={<WikiWrapper />}
    />
    <Route
      path='/ayuda'
      element={<WikiWrapper />}
    />
    <Route
      path='/documentacion-transparencia'
      element={<WikiWrapper />}
    />
    <Route
      path='/info/quienes'
      element={<QuienesSomos />}
    />
    <Route
      path='/info/faq'
      element={<PreguntasFrecuentes />}
    />
    <Route
      path='/preguntas-frecuentes'
      element={<PreguntasFrecuentes />}
    />
    <Route
      path='/ayuda'
      element={<WikiWrapper />}
    />

    {/* Eventos */}
    <Route
      path='/evento/:slug'
      element={<Evento />}
    />
    <Route
      path='/eventos/crear-evento'
      element={<CrearEvento />}
    />
    <Route
      path='/eventos'
      element={<EventosPage />}
    />

    {/* Clubs / Bitácoras */}

    {/* Contenidos / Cursos */}
    <Route
      path='/contenidos/agregar-contenido'
      element={<AgregarContenido />}
    />
    <Route
      path='/cursos/agregar-curso'
      element={<AgregarCurso />}
    />
    <Route
      path='/cursos/editar/:slug'
      element={<EditarCursoWrapper />}
    />
    <Route
      path='/cursos/eliminar/:slug'
      element={<EliminarCursoWrapper />}
    />
    <Route
      path='/cursos/*'
      element={<CursosPage />}
    />
    <Route
      path='/curso/:slug/*'
      element={<Curso />}
    />
    <Route
      path='/contenidos/editar/:slug'
      element={<EditarContenidoWrapper />}
    />
    <Route
      path='/contenidos/eliminar/:slug'
      element={<EliminarContenidoWrapper />}
    />
    <Route
      path='/contenidos/*'
      element={<ContenidosPage />}
    />
    <Route
      path='/contenido/:slug'
      element={<Contenido />}
    />

    {/* Membresías */}
    <Route
      path='/membresias'
      element={<Membresias />}
    />

    <Route
      path='/membresias/pagar/*'
      element={<ProbarMembresia />}
    />
    <Route
      path='/membresias/pago/plan/:planId'
      element={<ProbarMembresia />}
    />
    <Route
      path='/membresias/adquirir/*'
      element={<MembershipCheckout />}
    />
    <Route
      path='/mi-membresia'
      element={<MiMembresia />}
    />
    <Route
      path='/activatumembresia'
      element={<ActivaTuMembresia />}
    />

    {/* Comunidad */}
    <Route
      path='/comunidad'
      element={<ComunidadRoute />}
    />
    <Route
      path='/comunidad/nuevo-anuncio-programado'
      element={<Anuncios />}
    />
    <Route
      path='/comunidad/mis-anuncios'
      element={<Anuncios />}
    />
    <Route
      path='/comunidad/mis-anuncios/:slug'
      element={<Anuncios />}
    >
      <Route
        path='programados'
        element={<Anuncios />}
      />
      <Route
        path='historial'
        element={<Anuncios />}
      />
      <Route
        path='configuracion'
        element={<Anuncios />}
      />
    </Route>
    <Route
      path='/referir'
      element={<Referir />}
    />
    <Route
      path='/referir/*'
      element={<Referir />}
    />
    <Route
      path='/agregar-club/:club'
      element={<Referir />}
    />

    {/* Misc / Tests */}
    <Route
      path='/notificationtester'
      element={<NotificationTester />}
    />
    <Route
      path='/precargador'
      element={<PreCargador />}
    />
    <Route
      path='/prueba'
      element={<Prueba />}
    />

    {/* Stripe success */}
    <Route
      path='/stripe-success/:slug'
      element={<StripeSuccessRedirect />}
    />

    {/* Fallbacks / aliases */}
    <Route
      path='/marketplaces'
      element={<MarketPlace />}
    />
    <Route
      path='/market'
      element={<MarketPlace />}
    />

    <Route
      path='/testoken'
      element={<TestToken />}
    />
  </Routes>
);

export default Rutas;
