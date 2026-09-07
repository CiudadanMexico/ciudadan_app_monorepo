# 03 — Frontend (React 18)

> Inventario completo del frontend `ciudadan_frontend/`: React 18 + CRA/CRACO + MUI + Capacitor.
> Todas las rutas de archivo son relativas a `ciudadan_frontend/src/` salvo que se indique.

## Contenido
1. [Stack y configuración](#stack)
2. [Providers / pila de contexto (index.js)](#providers)
3. [Rutas del router (todas)](#rutas)
4. [Páginas](#paginas)
5. [Componentes](#componentes)
6. [Contexts](#contexts)
7. [Hooks](#hooks)
8. [Services](#services)
9. [Utils](#utils)
10. [Estructura de carpetas](#estructura)
11. [Convenciones y notas](#convenciones)

---

<a name="stack"></a>
## 1. Stack y configuración

- **App:** `ciudadan-app` v0.1.0 (privado). **CRA (react-scripts 5) + CRACO** (no Vite).
- **Scripts:** `start` = `craco start` · `build` = `craco build` · `test` = `craco test` ·
  `eject` = `craco eject` · `dev` = `craco dev`.
- **React** 18.3, **react-router-dom** 6.26 (v6), **MUI v5** (`@mui/material`, `icons-material`,
  `lab`, `system`, `x-date-pickers`, `x-tree-view`) + **Emotion**. También coexiste **MUI v4**
  (`@material-ui/core` 4) y **Bootstrap 4** para código legacy.
- **HTTP:** `axios`, `socket.io-client`. **Pagos:** Stripe (front implícito vía webhook), OpenPay.
- **Extras:** `ethers` 6 (wallets), `three`, `framer-motion`, `@react-google-maps/api`,
  `use-places-autocomplete`, `spherical-geometry-js`, `@react-pdf/renderer`, `quill` +
  `react-quill`, `react-markdown` + `remark-gfm`, `marked`, `dompurify`, `highlight.js`,
  `notistack`, `react-hook-form`, `react-use-cart`, `react-qr-code`, `html5-qrcode`, `react-ga`,
  `lucide-react`, `react-icons`, `sass`.
- **Movil:** Capacitor (`@capacitor/core`, `android`, `ios`, `cli` 8.1). El proyecto nativo vive
  en `android/`, `ios/` y `capacitor.config.ts`.
- **craco.config.js:** solo alias `@` → `src`.
- **capacitor.config.ts:** `appId: 'com.ciudadan.org'`, `appName: 'ciudadan.app'`, `webDir: 'build'`.
- **tsconfig.json:** TypeScript convive con JSX (se usa para `WikiApp.tsx`, `WikiTreeView.tsx`,
  `wikiService.ts`).

### `.env` (frontend) — variables clave
```
PORT=3001
REACT_APP_MAIN_DOMAIN=https://ciudadan.org
REACT_APP_AUTH0_DOMAIN=ciudadan.us.auth0.com
REACT_APP_AUTH0_AUDIENCE=https://api.ciudadan.org
REACT_APP_STRAPI_URL=http://localhost:33432
REACT_APP_SOCKET_URL=http://localhost:33035
REACT_APP_AI_URL=http://llmciudadan.org
REACT_APP_STRAPI_TOKEN=...            (token Strapi)
REACT_APP_GOOGLE_MAPS_API_KEY / REACT_APP_PLACES_KEY / REACT_APP_GEOCODING_KEY
REACT_APP_OPENPAY_MERCHANT_ID / REACT_APP_OPENPAY_PUBLIC_KEY
REACT_APP_APP_ENV=development
```
> ⚠️ **Seguridad:** el `.env` versionado contiene credenciales reales (Auth0, Google Maps,
> OpenPay, tokens Strapi). Riesgo si está bajo control de versiones.

---

<a name="providers"></a>
## 2. Providers / pila de contexto

Orden de anidamiento en `src/index.js` (de exterior a interior):

1. `React.StrictMode`
2. `BrowserRouter`
3. `Auth0ProviderWithNavigate` → `Auth0Provider` (redirectUri nativo `com.ciudadan.org://callback`
   en Capacitor, en web = `window.location.origin`; `cacheLocation="localstorage"`,
   `useRefreshTokens`, scope `openid profile email offline_access`)
4. `AuthProvider` (`useAuthInfo`)
5. `LocalizationProvider` (MUI X, `AdapterDayjs`, locale `es`)
6. `RolesProvider` (`useRoles`)
7. `NotificationsProvider` (`useNotifications`)
8. `CartProvider` (`useCart`)
9. `FoodCartProvider` (`useFoodCart`)
10. `SnackbarProvider` (notistack, `maxSnack=3`, esquina superior-derecha)
11. `AppWrapper` → renderiza `NavBar` (oculto en `/wiki`), `Rutas` y `AuthGate > Asistente`;
    añade separador inferior de 88px para barra fija.

Notas de `AppWrapper`: calcula `siteSection` según el primer segmento del path
(`productos→market`, `curso→cursos`, `referir→comunidad`, etc.). `useAuth0().isLoading` → `PreLoader`.

> ⚠️ `ClubContext` existe (`ClubContext.jsx`) pero **no se monta** en la pila de providers.

<a name="rutas"></a>
## 3. Rutas del router (todas)

Definidas en `src/Routes/index.jsx` (componente `Rutas`). Se listan los duplicados/alias
tal como existen en el archivo.

| Ruta | Componente |
|---|---|
| `/` | HomeRoute |
| `/crear-comunidad` | CrearComunidad |
| `/integrarme-comunidad` | IntegrarmeComunidad |
| `/probador` | Probador |
| `/registrar` | ReferirAlias (Referir) |
| `/callback` | CallbackPage |
| `/notificaciones` | AllNotificaciones |
| `/notificacion/:id` | Notificacion |
| `/gana` | GanaRoute |
| `/gana/ver-anuncios` | AnunciosRemunerados |
| `/taxis` | TaxisRoute |
| `/taxis/conductor/registro` | RegistroConductor |
| `/taxis/conductor/preregistro` | PreRegistroConductor |
| `/taxis/conductor/esperando` | Conductor |
| `/taxis/conductor/requisitos` | RequisitosConductor |
| `/taxis/pasajero/registro` | RegistroPasajero |
| `/taxis/pasajero/viaje` | Pasajero |
| `/taxis/viaje/:travelId` | TripViewRoute |
| `/taxis/preregistrar` | PreRegistroConductor2 |
| `/herramientas/agencia/conductores` | ConductoresAgencia |
| `/validations/:validationId/review` | DriverVerificationPage |
| `/food` | RestaurantesRoute |
| `/comida` | Food |
| `/comida/afiliar-restaurante` | RegistroRestaurante |
| `/comida/restaurante/:slug/*` | Restaurant |
| `/comida/producto/:slug` | ComidaProducto |
| `/comida/comprar/:slug` | ComprarFoodProduct |
| `/comida/ofertas` | ComidaOfertas |
| `/restaurantes` | RestaurantesRoute |
| `/market` | MarketPage (redeclara → MarketPlace al final) |
| `/marketplaces` | MarketPage (→ MarketPlace) |
| `/market/producto/:slug` | Producto |
| `/market/store/:slug` | Tienda (padre anidado) |
| `/market/store/:slug/agregar-producto` | AgregarProducto |
| `/market/store/:slug/pedidos` | MisProductos |
| `/market/store/:slug/entregados` | PedidosEntregados |
| `/market/store/:slug/productos` | AgregarProducto |
| `/market/store/:slug/preguntas-producto` | MisProductos |
| `/market/store/:slug/pagos` | PagosTienda |
| `/market/store/:slug/configuracion` | ConfiguracionTienda |
| `/registro-vendedor` | RegistroTienda |
| `/agregar-producto` | AgregarProducto |
| `/carrito` | Carrito |
| `/carrito/finalizar` | FinalizarCompra |
| `/carrito/comida/checkout` | FoodCheckout |
| `/compras/*` | Compras |
| `/productos/*` | ProductosPage |
| `/productos/eliminar/:slug` | EliminarProductoWrapper (declarada 2×) |
| `/market/comprar/:slug` | FinalizarCompraProducto |
| `/cartera/itokens` | ITokens |
| `/cartera/FreeBoocks` | Catalogo |
| `/cartera/crear` | CrearCarteraPage |
| `/cartera/:moneda` | OpWalletRoute |
| `/cartera` | OpWalletRoute |
| `/comprar-tokens` | OpWalletRoute |
| `/academia` | Rompecabezas |
| `/academias` | Academia |
| `/academia/taxis` | Academia |
| `/coowork` | Coowork |
| `/asignar-tarea` | AsignarTareaPage |
| `/herramientas/mi-agencia` | Agencia |
| `/herramientas/calificar-tarea` | CalificarTarea |
| `/herramientas/corregir-tarea` | CorregirTarea |
| `/herramientas/gestionar-tareas` | GestionTareas |
| `/herramientas/resolver-apelaciones` | ResolverApelaciones |
| `/herramientas/agregar-tarea` | AgregarTarea |
| `/herramientas/asignar-tarea` | AsignarTareaPage |
| `/herramientas/agregar-socio` | AgregarSocio |
| `/herramientas/gestionar-habilidades` | SkillsManagement |
| `/herramientas/verificar-usuarios` | VerificarUsuarios |
| `/perfil/:username` | Perfil |
| `/favoritos` | Favoritos |
| `/favoritos/*` | Favoritos |
| `/miqr` | UsuarioPage |
| `/ubicacion` | MiUbicacion |
| `/wiki` | WikiApp (TS) |
| `/wiki/:slug` | WikiWrapper (WikiViewer) |
| `/quienes-somos` | WikiWrapper |
| `/ayuda` | WikiWrapper (declarada 2×) |
| `/documentacion-transparencia` | WikiWrapper |
| `/info/quienes` | QuienesSomos |
| `/info/faq` | PreguntasFrecuentes |
| `/preguntas-frecuentes` | PreguntasFrecuentes |
| `/evento/:slug` | Evento |
| `/eventos/crear-evento` | CrearEvento |
| `/eventos` | EventosPage |
| `/contenidos/agregar-contenido` | AgregarContenido |
| `/cursos/agregar-curso` | AgregarCurso |
| `/cursos/editar/:slug` | EditarCursoWrapper |
| `/cursos/eliminar/:slug` | EliminarCursoWrapper |
| `/cursos/*` | CursosPage |
| `/curso/:slug/*` | Curso |
| `/contenidos/editar/:slug` | EditarContenidoWrapper |
| `/contenidos/eliminar/:slug` | EliminarContenidoWrapper |
| `/contenidos/*` | ContenidosPage |
| `/contenido/:slug` | Contenido |
| `/membresias` | Membresias |
| `/membresias/pagar/*` | ProbarMembresia |
| `/membresias/pago/plan/:planId` | ProbarMembresia |
| `/membresias/adquirir/*` | MembershipCheckout |
| `/mi-membresia` | MiMembresia |
| `/activatumembresia` | ActivaTuMembresia |
| `/comunidad` | ComunidadRoute |
| `/comunidad/nuevo-anuncio-programado` | Anuncios |
| `/comunidad/mis-anuncios` | Anuncios |
| `/comunidad/mis-anuncios/:slug` | Anuncios (padre) + subrutas `programados`/`historial`/`configuracion` |
| `/referir` | Referir |
| `/referir/*` | Referir |
| `/agregar-club/:club` | Referir |
| `/notificationtester` | NotificationTester |
| `/precargador` | PreCargador |
| `/prueba` | Prueba |
| `/stripe-success/:slug` | StripeSuccessRedirect |
| `/testoken` | TestToken |

Wrappers definidos en el router: `EditarContenidoWrapper`, `EliminarContenidoWrapper`,
`EditarCursoWrapper`, `EliminarCursoWrapper`, `EliminarProductoWrapper`, `WikiWrapper`,
`WikiLayout`, `TripViewRoute` (conecta Auth0 + RolesContext + socket.io + strapi para `TripView`).

---

<a name="paginas"></a>
## 4. Páginas (`src/Pages/`)

### Nivel raíz `Pages/`
| Archivo | Componente | Ruta URL |
|---|---|---|
| `CallbackPage.jsx` | CallbackPage | `/callback` |
| `ComunidadPage.jsx` | ComunidadPage | (no en router) |
| `ComunidadRoute.jsx` | ComunidadRoute | `/comunidad` |
| `CrearComunidad.jsx` | CrearComunidad | `/crear-comunidad` |
| `GanaRoute.jsx` | GanaRoute | `/gana` |
| `GenRoute.jsx` | GenRoute | (no en router) |
| `HomeRoute.jsx` | HomeRoute | `/` |
| `HomeRoute2.jsx` | HomeRoute | (variante) |
| `IntegrarmeComunidad.jsx` | IntegrarmeComunidad | `/integrarme-comunidad` |
| `MarketRoute.jsx` | MarketRoute | (variante legacy) |
| `Membresias.jsx` | Membresias | `/membresias` |
| `MiMembresia.jsx` | MiMembresia | `/mi-membresia` |
| `Notificacion.jsx` | Notificacion | `/notificacion/:id` |
| `Notificacions.jsx` | AllNotificaciones | `/notificaciones` |
| `OpWalletRoute.jsx` | OpWalletRoute | `/cartera`, `/cartera/:moneda`, `/comprar-tokens` |
| `PreRegistroConductor.jsx` | CiudadanTaxiLanding | `/taxis/conductor/preregistro` |
| `Prueba.jsx` | Prueba | `/prueba` |
| `RegistroConductor.jsx` | RegistroPasajero (reutiliza export) | `/taxis/conductor/registro` |
| `RegistroPasajero.jsx` | RegistroPasajero | `/taxis/pasajero/registro` |
| `RestaurantesRoute.jsx` | RestaurantesRoute | `/food`, `/restaurantes` |
| `TaxisRoute.jsx` | TaxisRoute | `/taxis` |

### `Pages/Anuncios/`
| Archivo | Componente | Ruta |
|---|---|---|
| `Anuncios.jsx` | Anuncios | `/comunidad/nuevo-anuncio-programado`, `/comunidad/mis-anuncios` (+subrutas) |

### `Pages/AnunciosRemunerados/`
| `AnunciosRemunerados.jsx` | AnunciosRemunerados | `/gana/ver-anuncios` |

### `Pages/Blog/`
| Archivo | Componente | Ruta |
|---|---|---|
| `AgregarContenido.jsx` | AgregarContenido | `/contenidos/agregar-contenido` |
| `AgregarCurso.jsx` | AgregarCurso | `/cursos/agregar-curso` |
| `Contenido.jsx` | ContenidoDetalle | `/contenido/:slug` |
| `Contenidos.jsx` | ContenidosPage | `/contenidos/*` |
| `EditarContenido.jsx` | EditarContenido | `/contenidos/editar/:slug` (via wrapper) |
| `EliminarContenido.jsx` | EliminarContenido | `/contenidos/eliminar/:slug` (via wrapper) |

### `Pages/Cartera/`
| `Billetera.jsx` → Billetera | `CrearCarteraPage.jsx` → CrearCarteraPage (`/cartera/crear`) |
| `ITokens.jsx` → ITokens (`/cartera/itokens`) | `FreeBoocks/Catalogo.jsx` → Catalogo (`/cartera/FreeBoocks`) |

### `Pages/Comunidad/`
`CodigoReferido.jsx` (GenerarCodigoReferido), `HistorialPagosReferidos.jsx`,
`MostrarCodigoReferido.jsx`, `Referidos.jsx`, `Referir.jsx` → Referir (`/referir`, `/referir/*`,
`/agregar-club/:club`, `/registrar`).

### `Pages/Coowork/` y `Pages/CoWork/`
| Archivo | Componente | Ruta |
|---|---|---|
| `Coowork/Agencia.jsx` | Agencia | `/herramientas/mi-agencia` |
| `Coowork/AgregarSocio.jsx` | AgregarSocio | `/herramientas/agregar-socio` |
| `Coowork/AgregarTarea.jsx` | AgregarTarea | `/herramientas/agregar-tarea` |
| `Coowork/Coowork.jsx` | CooWork | `/coowork` |
| `CoWork/Skills/SkillsManagement.jsx` | SkillsManagement | `/herramientas/gestionar-habilidades` |
| `CoWork/Verificacion/VerificarUsuarios.jsx` | VerificarUsuarios | `/herramientas/verificar-usuarios` |

### `Pages/Cursos/`
`AgregarCurso.jsx`, `Curso.jsx` → CursoDetalle (`/curso/:slug/*`), `Cursos.jsx` → CursosPage
(`/cursos/*`), `EditarCurso.jsx`, `EliminarCurso.jsx`, `Inscripcion.jsx` (no en router).

### `Pages/Eventos/`
`CrearEvento.jsx`, `Evento.jsx` (`/evento/:slug`), `EventosGrid.jsx` (interno).

### `Pages/Food/`
`ComidaOfertas.jsx`, `ComidaProducto.jsx`, `ComprarFoodProduct.jsx`, `Food.jsx`,
`RegistroRestaurante.jsx`, `Restaurant.jsx`, `RestaurantAdministration.jsx` (no en router).

### `Pages/Gana/`
`Gana.jsx`, `GeneraContenidos.jsx`, `PromueveMembresias.jsx`, `VendePage.jsx`.

### `Pages/Herramientas/`
`AsignarTareaPage.jsx` (`/asignar-tarea`, `/herramientas/asignar-tarea`), `CalificarTarea.jsx`,
`CorregirTarea.jsx`, `GestionTareas.jsx`, `ResolverApelaciones.jsx`.

### `Pages/Info/`
`PreguntasFrecuentes.jsx` (`/info/faq`, `/preguntas-frecuentes`), `QuienesSomos.jsx` (`/info/quienes`).

### `Pages/MarketPlace/`
`AgregarProducto.jsx`, `Carrito.jsx`, `Compras.jsx`, `ConfiguracionTienda.jsx`,
`EliminarProducto.jsx`, `FinalizarCompra.jsx`, `FinalizarCompraProducto.jsx`,
`MarketPage.jsx`, `MarketPlace.jsx` (fallback), `MisProductos.jsx`, `PagosTienda.jsx`,
`PedidosEntregados.jsx`, `PedidosPendientes.jsx` (no en router), `Producto.jsx`,
`ProductosPage.jsx`, `RegisterStoreStepper.jsx` (stepper interno), `RegistroTienda.jsx`,
`Tienda.jsx`.

### `Pages/Taxis/`
`DriverVerificationPage.jsx` (`/validations/:validationId/review`), `FormPreRegisterForSteps.jsx`
(wizard / via `/taxis/preregistrar`).

### `Pages/Usuarios/` y `Pages/Wiki/`
`Usuarios/UsuarioPage.jsx` (`/miqr`), `Wiki/WikiHome.jsx` (bajo `/wiki`).

---

<a name="componentes"></a>
## 5. Componentes (`src/components/`)

### Raíz de `components/`
| Archivo | Componente |
|---|---|
| `AuthGate.jsx` | AuthGate |
| `BottomSheet.jsx` | BottomSheet |
| `CiudadanBadge.jsx` | CiudadanBadge |
| `LaboryBadge.jsx` | LaboryBadge |
| `Layout.jsx` | Layout |
| `MiUbicacion.jsx` | MiUbicacion |
| `ModalWrapper.jsx` | ModalWrapper |
| `Pestanas.jsx` | Pestanas |
| `PreCargador.jsx` | PreCargador |
| `PreLoader.jsx` | PreLoader |
| `ShareButton.jsx` | ShareButton |
| `StripeSuccessRedirect.jsx` | StripeSuccessRedirect |
| `TestToken.jsx` | TestToken |
| `TextToSpeech.jsx` | TextToSpeech |
| `Tts.jsx` | TTSStreaming |
| `WikiBar.jsx` | WikiBar |

### Por feature
- **Academia:** `Academia.jsx` (Academia), `Rompecabezas.jsx` (Rompecabezas).
- **Anuncios:** `AnunciosPorDefecto.jsx`, `AnunciosProgramados.jsx`, `ConfiguracionAnuncios.jsx`,
  `HistorialPublicaciones.jsx`, `NuevoAnuncioProgramado.jsx`.
- **AnunciosRemunerados:** `AdExitMenu.jsx`, `AdGrid.jsx`, `DecisionWindow.jsx`, `PlaylistBar.jsx`,
  `VideoPlayer.jsx`.
- **Asistente:** `Asistente.jsx`, `LmAi.jsx` (LmAiChat), `TTS.jsx`.
- **Blog:** `BotonEditar.jsx`, `BotonEliminar.jsx`, `Buscador.jsx`, `CategoriasSlider.jsx`,
  `ContenidoCard.jsx`, `Contenidos.jsx`, `EditorHTML.jsx`, `quillConfig.js`.
- **Cartera:** `CrearBilleteraCentralWld.jsx`, `ImagenInteractiva.jsx`, `IngresosInfo.jsx`.
- **common:** `PurpleButton.jsx` (PurpleButton).
- **Comunidad:** `Comunidad.jsx` (Comunidad).
- **Cowork:** `ConductoresAgencia.jsx`, `HerramientrasGrid.jsx` (HerramientasGrid), `mock.jsx`,
  `Tareas.jsx`, `TareasEspecializadas.jsx`, `herramientas/AsignarTarea.jsx`.
- **Cursos:** `BotonEditar.jsx`, `BotonEliminar.jsx`, `CursoCard.jsx`, `Cursos.jsx`,
  `CursosImpartidos.jsx`.
- **editors:** `WysiwygEditor.jsx`.
- **Eventos:** `index.jsx` (EventosPage), `UbicacionEvento.jsx`.
- **Food:** `AgregarProducto.jsx`, `Buscador.jsx`, `DetalleFoodProduct.jsx`, `EnviosBanner.jsx`,
  `FoodCart.jsx`, `FoodCheckout.jsx`, `FoodCheckoutPago.jsx`, `FoodOrderDetailModal.jsx`,
  `FoodOrdersUser.jsx`, `FoodProductCard.jsx`, `FoodProductConfigModal.jsx`,
  `ModificadoresOferta.jsx`, `ModificadoresRestaurante.jsx`, `OfertaCard.jsx`,
  `OfertaDetalleCliente.jsx`, `OfertasRestaurante.jsx`, `PagoPedidoRestaurante.jsx`,
  `PedidoDetalleModal.jsx`, `PedidosPendientes.jsx`, `PedidosRestaurante.jsx`,
  `ProductoAlergenos.jsx`, `ProductoCaracteristicas.jsx`, `ProductoCard.jsx`,
  `ProductoCardOwner.jsx`, `ProductoDatosGenerales.jsx`, `ProductoImageUploadField.jsx`,
  `ProductoInformacion.jsx`, `ProductoIngredientes.jsx`, `ProductoModificadores.jsx`,
  `ProductoResumen.jsx`, `ProductosRestaurante.jsx`, `ProductoVarianteFormDialog.jsx`,
  `SeleccionarProductoModificadores.jsx`.
- **Ganar/Home/Market/Restaurantes:** `Ganar/Ganar.jsx`; `Home/AccionHome.jsx`,
  `HeroIntroGlow.jsx`, `HeroPrincipal.jsx`, `Intro.jsx`, `IntroVideo.jsx`, `LaboryScrollScene.jsx`,
  `SectionBlock.jsx`; `Market/Market.jsx`; `Restaurantes/Restaurantes.jsx`.
- **MarketPlace:** `AgregarCarrito.jsx`, `BotonVender.jsx`, `Buscador.jsx`, `BuscadorMarket.jsx`,
  `CalificarCompras.jsx`, `CategoriaCard.jsx`, `CategoriasSlider.jsx`, `ChecarPagoTienda.jsx`,
  `DetalleProducto.jsx`, `DireccionSelector.jsx`, `GaleriaImagenesProducto.jsx`,
  `GenerarGuia.jsx`, `HistorialPagos.jsx`, `MarketplaceCart.jsx`, `PagoPorTienda.jsx`,
  `PreguntaProductoCard.jsx`, `PreguntasProducto.jsx`, `PreguntasProductoHeader.jsx`,
  `PreguntasProductos.jsx`, `PreguntasProductosNew.jsx`, `ProductoCard.jsx`, `Resenas.jsx`.
  - `AgregarProducto/Paso1..Paso4.jsx` (stepper de producto).
  - `RegistroTienda/Paso01.jsx`, `Paso02.jsx` (stepper de tienda).
- **Membresias:** `ActivaTuMembresia.jsx`, `BotonMembresia.jsx`, `MembershipCheckout.jsx`,
  `MiMembresia.jsx`, `ProbarMembresia.jsx`.
- **NavBar:** `AIInput.jsx`, `CartIcon.jsx`, `HearthButton.jsx`, `LoginButton.jsx`,
  `LogoutButton.jsx`, `MenuIcon.jsx`, `MenuInfo.jsx`, `MenuTopBar.jsx`, `MessagesIcon.jsx`,
  `MessagesMenu.jsx`, `NavBar.jsx`, `NavButton.jsx`, `NotificationsIcon.jsx`,
  `NotificationsMenu.jsx`, `UserIcon.jsx`, `UserMenu.jsx`.
- **svgs:** `CartMarketFoodIcon.jsx`.
- **Taxis** (nuevo): `AcceptTrip.jsx`, `AdeudoWarning.jsx`, `Conductor.jsx`,
  `ConductorContainer.jsx`, `ConductorRender.jsx`, `EsperandoViaje.jsx`,
  `FreeTripPasajero.jsx`, `FreeTripsConductor.jsx`, `Invitado.jsx`, `MapAnimation.jsx`,
  `Pasajero.jsx`, `PreferencesModal.jsx`, `Roles.jsx`, `Simulator.jsx`, `TravelCard.jsx`.
  - `driver-verification/`: `ActivityTimeline.jsx`, `BiometricComparison.jsx`, `DocumentCard.jsx`,
    `DocumentGrid.jsx`, `FinalActions.jsx`, `index.js`, `OperativeChecklist.jsx`,
    `PersonalDataCard.jsx`, `ReviewerObservations.jsx`, `VehicleDataCard.jsx`,
    `VerificationHeader.jsx`, `VerificationSidebar.jsx`.
  - `FormPreRegisterForSteps/`: `DocumentUploadField.jsx`, `index.js`, `OnboardingIntro.jsx`,
    `SaveStatusIndicator.jsx`, `StepNavigation.jsx`, `WizardHeader.jsx`, y steps:
    `StepCitaPresencial.jsx`, `StepCuenta.jsx`, `StepDatosPersonales.jsx`,
    `StepDocumentosPersonales.jsx`, `StepFotosVehiculo.jsx`, `StepLicencia.jsx`,
    `StepResumen.jsx`, `StepVehiculo.jsx`, `StepVerificacion.jsx`.
- **Taxiz** (flujo legacy viaje en vivo): `AcceptTrip.jsx`, `ConductorContainer.jsx`,
  `ConductorDebug.jsx`, `ConductorRender.jsx`, `ConfirmarCancelar.jsx`, `ConfirmPayment.jsx`,
  `EsperandoViaje.jsx`, `Pasajero.jsx`, `PasajeroTermsModal.jsx`, `PreregistroConductor.jsx`,
  `PreRegistroConductor2.jsx`, `RatingModal.jsx`, `RequisitosConductor.jsx`, `Roles.jsx`,
  `SolicitudCancelar.jsx`, `TravelCard.jsx`, `TripView.jsx`, `VerifyPIN.jsx`,
  `ViajeConductor.jsx`, `ViajeUsuario.jsx`.
- **Testers/Usuarios/utils/Wiki:**
  - Testers: `NotificationTester.jsx`, `Probador.jsx`.
  - Usuarios: `BotonCircular.jsx`, `Favoritos.jsx`, `Ingresa.jsx`, `Perfil.jsx`, `UserLocation.jsx`.
  - utils: `LocalPlayer.jsx`.
  - Wiki: `WikiApp.tsx` (TS), `WikiTreeView.tsx` (TS), `WikiViewer.jsx`.

> ⚠️ Existen **dos copias de Taxi** (`components/Taxis/` y `components/Taxiz/`) y una carpeta
> duplicada anidada `components/components/Taxis/RequisitosConductor.jsx`.

---

<a name="contexts"></a>
## 6. Contexts (`src/Contexts/`)

| Archivo | Exports |
|---|---|
| `AuthContext.jsx` | `AuthContext`, `AuthProvider`, `useAuthInfo` |
| `CartContext.jsx` | `CartProvider`, `useCart` |
| `CartLocal.jsx` | `guardarCarritoLocal`, `sincronizarCarrito` (persistencia local) |
| `cartref.jsx` | `CartProvider`, `useCart` (duplicado con ref) |
| `ClubContext.jsx` | `useClub`, `ClubProvider` (no montado) |
| `FoodCartContext.jsx` | `FoodCartProvider`, `useFoodCart` |
| `NotificationsContext.jsx` | `useNotifications`, `NotificationsProvider` |
| `RolesContext.jsx` | `useRoles`, `RolesProvider` |

---

<a name="hooks"></a>
## 7. Hooks (`src/hooks/`)

`useAdRewards.jsx`, `useAgencia.jsx`, `useAutocompletarAsignacion.jsx`, `useCarteraUsuario.jsx`,
`useCategorias.jsx`, `useContenido.jsx`, `useCursos.jsx`, `useEventos.jsx`, `useFavoritos.jsx`,
`UseGoogleMaps.jsx`, `UseLmAiChat.jsx`, `useMembresia.jsx`, `useNotificationsSocket.jsx`,
`usePasoProducto.jsx`, `usePreguntasProductos.jsx`, `useProductos.jsx`,
`useRecurrenciaValidation.jsx`, `useRolEditor.jsx`, `useStores.jsx`, `useTarea.jsx`,
`useTodos.jsx`, `useUbicacion.jsx`, `useVolumetrico.jsx`.

Subcarpetas:
- `food/`: `useFoodCategories.jsx`, `useFoodRestaurants.jsx`, `useOfertasComida.jsx`,
  `useOfertasRestaurante.jsx`, `usePedidosRestaurante.jsx`, `useProductsRestaurant.jsx`,
  `useUberDirect.js`.
- `FormPreRegisterForSteps/`: `useDraftPersistence.jsx`, `useFileUploads.jsx`,
  `usePreregistroWizard.jsx`.
- `storeAdmin/`: `useStoreAdminPedidos.jsx`.
- `useSkills/`: `useSkills.js`.

---

<a name="services"></a>
## 8. Services (`src/services/`)

### Raíz
| Archivo | Exports |
|---|---|
| `favoritosService.js` | getFavoritosUsuario, esFavorito, agregarFavorito, eliminarFavorito, toggleFavorito |
| `pedidosRestauranteService.js` | obtenerPedidosRestaurante, obtenerPedidoPorId, actualizarEstadoPedido, aceptarPedido, marcarPedidoListo, cancelarPedido, devolverPedido, marcarPedidoEntregado |
| `preguntasProductosService.js` | obtenerPreguntasProducto, obtenerPreguntasProductosByStore, crearPreguntaProducto, registrarRespuestaPregunta |
| `wikiService.ts` | wikiService (TS) |

### `adRewards/`
- `queryServices.js`: getAdsPublicitarios, getSesion.
- `mutationsServices.js`: iniciarSesion, heartbeat, cambiarEstadoItem, completarAnuncio, refillSesion.

### `cowork/`
- `queryServices.js`: getUserAreas, getSpecializedTodos, getAllTasksWithUsers, getGeneralTodos,
  getAvailableRootAreas, getSubareasDeArea, getUsuariosParaVerificacion,
  getTareasPendientesCalificacion.
- `mutationsServices.js`: createTask, updateTodoStatus, resolverTarea, completarTarea,
  calificarTarea, corregirTarea, apelarTarea, resolverApelacion.

### `driverVerification/`
- `gettters.js`: getDriverDetails, getValidationReviewBundle, resolveValidationByAgendaId.
- `mappers.js`: mapDriverDetailsToViewModel, mapDriverStatusToChip.
- `reviewNavigation.js`: REVIEW_NAV_SECTIONS, buildReviewNavigationSections, etc.
- `reviewProgress.js`: computeEvidenceReviewMetrics.
- `setters.js`: updateDriverDetails, updateEvidenceReview, updateValidationObservations,
  completeValidation, syncValidationFromDriver.
- `validationEventMappers.js`, `validationMappers.js`.

### `FormPreRegisterForSteps/`
- `driverDraftApi.js`: getUserByEmail, registerAccount, sendWhatsAppVerificationCode,
  verifyWhatsAppVerificationCode, getDriverDraftByUser, createDriverDraft,
  getOrCreateDriverDraft, updateDriverDraft.
- `driverPayloadMappers.js`: DEFAULT_FORM_VALUES, hydrateFormFromDriver, toDriverPayloadByStep,
  buildFinalDriverPayload, sanitizeValuesForLocal.

---

<a name="utils"></a>
## 9. Utils (`src/utils/`)

### Raíz
`index.js` (barrel), `autocompleteMaps.jsx`, `clubHelpers.js`, `constants.js`,
`cowork.helpers.js` (getAttributes, normalizeAreas, getActiveRootAreas, getSkillsForUser,
normalizeTask, uniqueById, validateTaskStatusTransition, buildAreaHierarchy), `diccionarios.js`,
`Direccionador.jsx`, `FechaCdmx.jsx`, `FileHelpers.js`, `formaters.jsx`, `geo.js`
(calculateDistanceKm, isWithinDistanceKm), `GuardarProducto.jsx`, `horarios.js`, `mapUtils.jsx`,
`plantasHelpers.js`, `registerUser.jsx`, `request.utils.js`, `slugify.jsx`, `strapiHelpers.js`,
`strapiUserService.jsx`, `timeSince.jsx`, `tripPaymentFlowUtils.js`, `user.jsx`,
`utilidades.jsx`, `validacionesBanco.js` (BANK_OPTIONS, getBankByCLABE, validateCLABE),
`ValidacionesProducto.jsx`, `useTravelRoute.jsx`.

### Subcarpetas
- `cowork/`: `areaVerification.js`, `canUserTakeTask.selftest.js`, `taskStatus.js`
  (TASK_STATUS, getStatusLabel, isValidTransition, getNextPossibleStatuses, isTaskEditable,
  isTaskCompletable, isTaskReviewable, isTaskRateable).
- `food/`: `normalizeFoodVariants.js`.
- `others/`: `CrearPreviews.jsx`, `cronometro.jsx`.
- `preRegisterForSteps/`: `fieldValidators.js`, `fileRules.js`, `helpers.js`,
  `resubmissionFieldMap.js`, `stepsConfig.js` (WIZARD_STEPS, STEP_FIELDS...), `stepValidators.js`.
- `storeAdmin/`: `printGuia.js` (buildGuiaHtml, printGuia).

---

<a name="estructura"></a>
## 10. Estructura de carpetas (`src/`)

```
src/
├── index.js              # Providers stack (Router > Auth0 > Auth > Localization > Roles > Notifications > Cart > FoodCart > Snackbar > AppWrapper)
├── Routes/index.jsx      # ~130 rutas en un solo archivo + wrappers
├── Pages/                # 93+ páginas por feature (Anuncios, Blog, Cartera, Coowork/CoWork,
│                         #   Cursos, Eventos, Food, Gana, Herramientas, Info, MarketPlace,
│                         #   Taxis, Usuarios, Wiki, ...)
├── components/           # Feature components (Cowork/, NavBar/, MarketPlace/, Food/, Taxis/Taxiz/...)
├── Contexts/             # Auth, Roles, Notifications, Cart, FoodCart, Club
├── hooks/                # useTodos, useTarea, useAdRewards, usePreregistroWizard, ...
├── services/             # cowork/, adRewards/, driverVerification/, FormPreRegisterForSteps/, food/
├── utils/                # cowork.helpers, strapiHelpers, request.utils, mapUtils, ...
├── constants/, lib/, types/, styles/, assets/
```

---

<a name="convenciones"></a>
## 11. Convenciones y notas

1. **Todo el router en un archivo** (`Routes/index.jsx`), sin lazy loading.
2. **Duplicación y aliases** de rutas a propósito (`/productos/eliminar/:slug`, `/ayuda`,
   `/market`, `/marketplaces`); gana la última declaración.
3. **Dos implementaciones de taxi** en paralelo (`Taxis/` vs `Taxiz/`).
4. **Carritos duplicados:** `CartContext.jsx`, `cartref.jsx`, `CartLocal.jsx`; se usa
   `CartContext`. `ClubContext` existe pero no se monta.
5. **`?mockRole=`** en `Coowork.jsx` es solo vista (mock UI), sin efecto backend.
6. **Estilos:** `src/styles/index.css`; base MUI v5 + Emotion, con legacy MUI v4/Bootstrap 4.
7. **Mezcla de casing** (`Contexts/` capital vs `components/` minúscula; `Pages/Coowork/` vs
   `Pages/CoWork/`). En Linux/CI puede dar problemas; respetar casing exacto en imports.
8. **Naming:** PascalCase para componentes (`UseGoogleMaps.jsx`), kebab/lowercase para módulos puros.
9. **Multi-servicio:** `.env` apunta Strapi en `localhost:33432`, socket en `33035`, IA en
   `http://llmciudadan.org`.

---

*Fin de la documentación del frontend.*