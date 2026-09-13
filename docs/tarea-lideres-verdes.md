# TAREA: Landing y base funcional de Líderes Verificadores de Conductores

Trabajar sobre el monorepo actual:

`https://github.com/CiudadanMexico/ciudadan_app_monorepo`

Antes de modificar nada, revisar `AGENTS.md` y respetar las convenciones existentes del proyecto.

La implementación afecta:

- Backend Strapi:
  - nuevo content type para candidaturas.
  - ampliación del Single Type `site-setting`.
  - seed de configuración.
  - endpoint público de configuración.
- Frontend React:
  - nueva landing `/gana/lideresverificadores`.
  - comportamiento según autenticación/roles.
  - nueva ruta `/gana/lideresverificadores/registro`.
  - servicio para obtener configuración.
  - garantizar que exista `/coowork/socio`.

No romper funcionalidades existentes.

---

# 1. CONCEPTO FUNCIONAL

Ciudadan tiene un programa de **Líderes de Conductores**.

El modelo que debe explicar la landing es:

- Ciudadan es una plataforma cooperativa de movilidad.
- Los conductores pagan actualmente una membresía plana de **$500 MXN mensuales**.
- El conductor conserva **el 100% de lo que genera en sus viajes**.
- No existe comisión porcentual sobre cada viaje para Ciudadan.
- El Líder de Conductores desarrolla su propia red de conductores.
- Actualmente el Líder recibe el **10% de la membresía mensual** de cada conductor activo perteneciente a su red.
- Con la membresía actual eso equivale a:

`$50 MXN mensuales por conductor activo`.

Ejemplos:

- 10 conductores activos → $500 MXN / mes.
- 20 → $1,000 MXN / mes.
- 100 → $5,000 MXN / mes.
- 200 → $10,000 MXN / mes.
- 500 → $25,000 MXN / mes.

Debe quedar claro que son ingresos recurrentes derivados de las membresías activas de los conductores que forman parte de su red.

El Líder no necesariamente tiene que ser conductor.

Su papel consiste principalmente en construir, fortalecer y acompañar su red de conductores dentro del ecosistema Ciudadan.

---

# 2. TERMINOLOGÍA DE ROLES

NO crear el rol `verificadorconductores`.

Usar únicamente estos dos identificadores canónicos dentro de:

`users.roles.extra`

### Durante el periodo de prueba

`driver-verifier-candidate`

### Una vez activado definitivamente

`driver-verifier`

No crear una tercera variante para representar lo mismo.

Preservar siempre cualquier otro rol que ya tenga el usuario.

Nunca sustituir completo `roles.extra` por un arreglo que contenga únicamente estos roles.

---

# 3. NUEVO CONTENT TYPE STRAPI

Crear un Collection Type:

## Nombre conceptual

`Driver Verifier Candidacy`

Usar:

- singularName: `driver-verifier-candidacy`
- pluralName: `driver-verifier-candidacies`
- collectionName: `driver_verifier_candidacies`

UID:

`api::driver-verifier-candidacy.driver-verifier-candidacy`

Debe usar:

`draftAndPublish: false`

## Campos

### `user`

Relation:

`oneToOne`

Target:

`plugin::users-permissions.user`

Es la única relación requerida por esta colección.

Debe identificar al usuario cuya candidatura estamos siguiendo.

No crear relaciones adicionales con Driver ni con otras colecciones en esta fase.

---

### `referred_drivers`

Tipo:

`integer`

Default:

`0`

Mínimo:

`0`

Representa el número de conductores que han sido contabilizados para cumplir el reto.

No usar `refereds`.

---

### `registered_since`

Tipo:

`datetime`

Representa el momento exacto en que comenzó formalmente el periodo de prueba.

IMPORTANTE:

Este timestamp NO debe establecerse cuando el usuario hace clic en:

`Registrarme como Líder`

El periodo comienza únicamente cuando el usuario **concluye exitosamente el proceso de registro**.

Por ahora la página de registro se creará vacía, por lo que solamente debemos dejar preparado el modelo para esta lógica posterior.

---

### `closes_at`

Tipo:

`datetime`

Representa el deadline de la candidatura.

Cuando posteriormente se concluya el registro:

`closes_at = registered_since + driver_verifier_testing_days`

Usar `closes_at` y no `closed_at`, porque `closed_at` semánticamente implicaría el momento en que ya fue cerrado, mientras que aquí necesitamos conocer de antemano la fecha límite.

---

### `activated`

Tipo:

`boolean`

Default:

`false`

Será `true` cuando el candidato alcance los requisitos y sea activado como Líder/Verificador de Conductores.

---

### `closed`

Tipo:

`boolean`

Default:

`false`

Indica que el proceso de candidatura ya terminó, independientemente de si terminó exitosamente o no.

---

# 4. ESTADOS FUTUROS DE LA CANDIDATURA

Aunque en esta tarea NO se implementará todavía el mecanismo que contabiliza referidos ni la finalización automática, dejar perfectamente claras estas reglas en código/comentarios donde corresponda:

## Al concluir el registro

Crear/inicializar la candidatura:

```text
referred_drivers = 0
registered_since = NOW
closes_at = NOW + configuración de días
activated = false
closed = false
```

Agregar al usuario:

`driver-verifier-candidate`

---

## Si alcanza el objetivo dentro del plazo

Posteriormente deberá ocurrir:

```text
activated = true
closed = true
```

Quitar:

`driver-verifier-candidate`

Agregar:

`driver-verifier`

Preservando cualquier otro rol del usuario.

---

## Si vence el plazo sin alcanzar el objetivo

Posteriormente:

```text
activated = false
closed = true
```

La lógica concreta de vencimiento y una posible segunda candidatura NO se implementará todavía en esta tarea.

No inventarla.

---

# 5. SINGLE TYPE `site-setting`

IMPORTANTE:

El Single Type YA EXISTE.

Está en:

`ciudadan_backend_26/src/api/site-setting/`

No crear otro.

Ampliar el schema actual.

Mantener:

`labory_to_pesos_exchange_rate`

Agregar:

## `driver_verifier_testing_days`

Tipo:

`integer`

Representa el número de días disponibles para completar el reto.

Valor inicial mediante seed:

`15`

---

## `driver_verifier_required_referrals`

Tipo:

`integer`

Representa el número de conductores que el candidato debe registrar durante su periodo de prueba.

Valor inicial:

`10`

---

## `verifier_candidates_whatsapp_group_url`

Tipo:

`string`

Debe contener inicialmente:

`https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh`

Esta URL NO debe quedar hardcodeada dentro de la landing.

Tanto:

- `Unirme al grupo de Líderes`
- `Contactar`

deben obtenerla desde `site-setting`.

---

# 6. SEED

Crear:

`ciudadan_backend_26/seed/site-settings.js`

Seguir el mecanismo/patrón de seeds que ya exista en el backend.

NO crear un segundo sistema de seeds si ya existe uno.

El seed debe ser **idempotente**.

Debe localizar el Single Type existente y:

- crearlo si por alguna razón todavía no existe una entidad.
- actualizarlo si ya existe.
- NO borrar valores previos ajenos a esta funcionalidad.
- preservar `labory_to_pesos_exchange_rate`.
- publicar el Single Type, ya que actualmente usa `draftAndPublish: true`.

Debe establecer:

```text
driver_verifier_testing_days = 15

driver_verifier_required_referrals = 10

verifier_candidates_whatsapp_group_url =
https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh
```

No duplicar registros del Single Type al ejecutar el seed múltiples veces.

---

# 7. CONFIGURACIÓN PÚBLICA PARA LA LANDING

La landing debe poder visualizarse correctamente incluso sin iniciar sesión.

Por tanto, necesita acceder a:

- días del reto.
- cantidad de referidos requeridos.
- URL del grupo de WhatsApp.

No exponer innecesariamente todo `site-setting` si posteriormente puede contener configuraciones sensibles.

Crear un endpoint público específico, por ejemplo:

`GET /api/driver-verifier/public-config`

Debe responder algo equivalente a:

```json
{
  "testingDays": 15,
  "requiredReferrals": 10,
  "whatsappGroupUrl": "https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh"
}
```

Este endpoint sólo expone estos tres valores.

Puede tener `auth: false`.

No debe permitir escritura.

Agregar defaults seguros en backend/frontend solamente como protección si falta temporalmente la configuración:

```text
testingDays = 15
requiredReferrals = 10
```

La URL de WhatsApp no debe sustituirse silenciosamente por una URL inventada.

---

# 8. SERVICIO FRONTEND

Crear un servicio apropiado dentro de:

`src/services/`

por ejemplo:

`src/services/driverVerifierService.js`

Seguir las convenciones actuales del repositorio.

Preferir la infraestructura centralizada de requests que ya existe.

NO llenar el componente de `fetch()` dispersos.

Debe tener como mínimo:

```text
getPublicConfig()
```

Más adelante este mismo service podrá crecer para registro/candidaturas.

---

# 9. NUEVA LANDING

Crear página para:

`/gana/lideresverificadores`

Nombre sugerido:

`src/Pages/Gana/LideresVerificadoresPage.jsx`

Puede dividirse en componentes dentro de:

`src/components/LideresVerificadores/`

si ayuda a mantener limpio el código.

No hacer un archivo JSX monstruoso de 900 líneas.

---

# 10. CONTROL DE AUTENTICACIÓN Y ROLES

Usar el Auth0 y `RolesContext` existentes.

Tenemos:

- `useAuth0()`
- `useRoles()`

El arreglo normalizado de roles ya está disponible mediante:

```js
const { roles } = useRoles();
```

La lógica debe ser:

## Usuario NO autenticado

Mostrar normalmente toda la landing.

NO obligarlo a iniciar sesión únicamente para conocer el programa.

---

## Usuario autenticado pero todavía cargando roles

NO mostrar brevemente la landing para después redireccionar.

NO provocar flash visual.

Mientras se resuelve Auth0/usuario/roles, mostrar un loader discreto o skeleton coherente con la página.

El `RolesContext` parte de estados que pueden cambiar mientras termina el fetch, así que manejar esto con cuidado.

---

## Usuario autenticado con:

`driver-verifier-candidate`

Redireccionar automáticamente a:

`/coowork/socio`

Usar:

`<Navigate replace ... />`

o navegación equivalente evitando loops.

---

## Usuario autenticado con:

`driver-verifier`

También redireccionar automáticamente a:

`/coowork/socio`

---

## Usuario autenticado sin ninguno de esos roles

Mostrar normalmente la landing.

---

# 11. IMPORTANTE: `/coowork/socio`

Actualmente verificar si existe realmente esta ruta en la versión local de trabajo.

En `main` no aparece como ruta registrada.

No dejar una redirección hacia un 404.

Si todavía no existe una página específica para socio, crear temporalmente:

`/coowork/socio`

como alias hacia el componente Coowork existente:

```text
/coowork      -> Coowork
/coowork/socio -> Coowork
```

Si en la rama local ya existe un componente específico para `/coowork/socio`, usar ése y no crear duplicados.

---

# 12. NUEVA RUTA DE REGISTRO

Crear:

`/gana/lideresverificadores/registro`

Crear componente:

`LiderVerificadorRegistroPage.jsx`

Por ahora debe ser únicamente un placeholder mínimo.

No desarrollar todavía formulario ni lógica de candidatura.

La ruta debe existir y compilar.

Puede retornar un `Box` vacío/minimalista preparado para la siguiente tarea.

IMPORTANTE:

No crear candidatura.

No agregar rol.

No iniciar los 15 días.

Todo eso sucederá posteriormente cuando esté implementado el registro y el usuario lo concluya.

---

# 13. CTA PRINCIPAL

La landing debe tener como CTA principal:

## `Aceptar el reto`

o:

## `Registrarme como Líder`

Preferentemente el hero puede utilizar:

**Aceptar el reto**

y explicar debajo:

`Regístrate como Líder de Conductores`

Al hacer clic debe navegar a:

`/gana/lideresverificadores/registro`

NO crear la candidatura al hacer clic.

---

# 14. CTAs PARA INDECISOS

Queremos empujar a actuar, pero no perder al usuario que todavía no está preparado para registrarse.

Debe haber permanentemente alternativas de menor compromiso.

Usar estos botones:

### `Unirme al grupo de Líderes`

y

### `Contactar`

Actualmente LOS DOS llevan a la misma URL recuperada desde:

`verifier_candidates_whatsapp_group_url`

Abrir WhatsApp de forma externa.

En web:

`target="_blank"`

con seguridad:

`rel="noopener noreferrer"`

Considerar comportamiento correcto dentro de Capacitor/mobile.

No hardcodear la URL dentro del JSX.

---

# 15. CONCEPTO DE LA LANDING

La página no debe parecer un formulario gubernamental ni una landing genérica de una startup de seguros.

Debe sentirse como una **convocatoria / misión / reto de Ciudadan**.

Concepto central:

# EL RETO LÍDER

El visitante debe entender casi inmediatamente:

```text
Tienes X días.
Tu meta: incorporar X conductores.
Construyes tu red.
Si completas el reto, te conviertes en Líder de Conductores de Ciudadan.
```

Los valores deben venir dinámicamente del backend.

Ejemplo con configuración inicial:

```text
15 DÍAS
10 CONDUCTORES
1 RETO
```

La palabra "reto" debe usarse de forma positiva y envolvente.

No presentarlo como un examen burocrático.

---

# 16. HERO

Crear un hero fuerte.

Contenido sugerido:

### Eyebrow

`LÍDERES DE CONDUCTORES · CIUDADAN`

### Título

`La movilidad la hacemos nosotros.`

Segunda línea destacada:

`Ahora también podemos organizarla.`

### Texto

`Construye tu propia red de conductores dentro de Ciudadan y participa en una plataforma donde los conductores se quedan con el 100% de lo que generan en sus viajes.`

Luego introducir el reto:

`Para convertirte en Líder tendrás una primera misión: incorporar {requiredReferrals} conductores en {testingDays} días.`

### Indicadores visuales

Tres bloques:

`{testingDays} días`

`{requiredReferrals} conductores`

`$50 / mes por conductor activo`

### CTA principal

`Aceptar el reto`

### CTA secundario

`Unirme al grupo de Líderes`

---

# 17. SECCIÓN: ¿QUÉ ES CIUDADAN?

Explicar brevemente:

### Título

`Una app de conductores construida al revés`

Copy conceptual:

Las plataformas tradicionales cobran un porcentaje de cada viaje.

Ciudadan funciona con una membresía plana.

El conductor se queda con el 100% de lo que genera en sus viajes.

Actualmente:

```text
$500 MXN
membresía mensual
```

No presentar esto como una guerra contra otras empresas ni mencionar marcas si no es necesario.

Debe transmitir claramente la diferencia económica.

---

# 18. SECCIÓN: ¿QUÉ GANA UN LÍDER?

Título sugerido:

`Tu red crece. Tu participación también.`

Explicar:

Por cada conductor activo perteneciente a su red, actualmente el Líder recibe el 10% de su membresía mensual.

Con la membresía actual:

```text
1 conductor activo
=
$50 MXN / mes
```

Mostrar ejemplos visuales.

Idealmente crear una pequeña calculadora interactiva con MUI `Slider`.

Ejemplo:

```text
Conductores en tu red: 100
Ingreso mensual estimado: $5,000 MXN
```

Rango:

10 a 500.

Cálculo UI:

```js
conductores * 50
```

Debe mostrarse como una proyección basada en la membresía/comisión actuales.

NO utilizar frases como:

`ganancia garantizada`

o:

`ingreso asegurado`.

Texto aclaratorio pequeño:

`Estimación basada en la membresía y participación actuales. El ingreso depende de conductores con membresía activa.`

---

# 19. SECCIÓN CENTRAL: EL RETO LÍDER

Debe ser una de las partes visualmente más importantes.

Crear una línea de progreso/timeline de cuatro pasos.

## Paso 1

### `Entra al programa`

`Concluye tu registro como candidato a Líder.`

---

## Paso 2

### `El reloj comienza`

`Desde ese momento tendrás {testingDays} días.`

IMPORTANTÍSIMO:

Repetir visualmente que el tiempo empieza **al concluir el registro**, no al visitar la página.

---

## Paso 3

### `Construye tu primera red`

`Incorpora {requiredReferrals} conductores durante el periodo del reto.`

---

## Paso 4

### `Desbloquea tu rol`

`Al cumplir la meta, tu candidatura podrá convertirse en Líder de Conductores activo.`

La interfaz puede usar:

- contador.
- progress ring.
- timeline.
- nodos conectados.
- líneas animadas.
- pequeños efectos de movimiento.

Pero en esta landing todavía NO existe progreso real de usuario porque sólo la ven quienes aún no son candidatos.

Se trata de una representación del proceso.

---

# 20. SECCIÓN DE RED

Visualmente representar que el líder no es un vendedor aislado, sino un nodo que construye una comunidad.

Puede tener una composición animada:

```text
LÍDER
   ↙ ↓ ↘
🚗 🚗 🚗
↓  ↓  ↓
🚗 🚗 🚗 ...
```

No tiene que ser literalmente esta representación.

Puede hacerse con nodos/círculos/avatares/íconos.

Framer Motion puede animar sutilmente las conexiones.

Nada excesivamente psicodélico.

Queremos tecnología alternativa, sofisticada y Ciudadan; no un festival de luces RGB dentro de un taxi.

---

# 21. SECCIÓN PARA INDECISOS

Título sugerido:

`¿Todavía no estás listo para iniciar el reto?`

Texto:

`No tienes que empezar hoy. Entra al grupo de Líderes, conoce el modelo, resuelve tus dudas y habla con quienes están construyendo la red.`

Botones:

`Unirme al grupo de Líderes`

`Contactar`

Ambos usan:

`verifier_candidates_whatsapp_group_url`

Esta sección debe ser visible antes del footer.

---

# 22. CTA FINAL

Crear cierre fuerte:

### Título

`Tu primera red empieza con {requiredReferrals}.`

### Texto

`Tendrás {testingDays} días para demostrar que puedes construirla.`

### CTA grande

`Aceptar el reto`

Debajo:

`El plazo comienza únicamente después de completar tu registro.`

CTA secundario:

`Primero quiero conocer al grupo`

---

# 23. CTA STICKY EN MÓVIL

En mobile considerar una barra inferior sticky elegante con:

`Aceptar el reto`

y acceso secundario a WhatsApp.

No tapar la navegación global ni controles de Capacitor.

Debe desaparecer o integrarse adecuadamente al llegar al CTA final.

---

# 24. ESTILO VISUAL CIUDADAN

Revisar primero componentes y estilos existentes.

Tenemos actualmente MUI y Framer Motion.

También existe:

`components/common/PurpleButton.jsx`

con los morados de marca:

```text
#8A5CF5
#6A3FCB
```

Reutilizar `PurpleButton` donde resulte apropiado.

Estética:

- fondo oscuro sofisticado.
- verdes Ciudadan.
- morados de marca.
- brillo neón únicamente como acento.
- bordes luminosos suaves.
- glassmorphism moderado.
- transparencias.
- tarjetas profundas.
- grid tecnológico sutil.
- efectos de profundidad.
- líneas/nodos simulando una red.
- sensación de movilidad urbana y tecnología cooperativa.
- tipografía limpia.
- alta legibilidad.

NO convertir toda la pantalla en verde o morado fosforescente.

Los colores reales y neutros deben dominar.

Los neones deben aparecer principalmente en:

- bordes.
- highlights.
- números.
- CTA.
- nodos.
- líneas.
- hover/focus.

La identidad debe sentirse alternativa, futurista y tecnológica, pero todavía profesional.

---

# 25. ANIMACIONES

Usar Framer Motion con moderación.

Aplicar por ejemplo:

- entrada del hero.
- aparición de indicadores.
- stagger de cards.
- timeline al entrar al viewport.
- conexiones de la red.
- hover suave.
- números/indicadores.
- CTA con glow sutil.

Respetar:

`prefers-reduced-motion`

No hacer animaciones infinitas pesadas que consuman CPU en Android.

No usar Three.js para esta landing.

No hace falta lanzar la GPU al espacio para explicar que alguien necesita conseguir diez conductores.

---

# 26. RESPONSIVE

Diseñar mobile-first.

Debe funcionar bien en:

- Android/Capacitor.
- teléfonos pequeños.
- tablets.
- desktop.

Evitar:

- ancho fijo.
- scroll horizontal.
- textos gigantes que rompan mobile.
- elementos absolutamente posicionados sin adaptación.
- efectos hover como única forma de revelar información.

---

# 27. ACCESIBILIDAD

Los CTA deben ser botones/enlaces reales.

Mantener buen contraste.

Añadir:

- focus visible.
- aria-label cuando corresponda.
- estados de loading.
- alt en imágenes relevantes.

No depender exclusivamente del color para explicar estados.

---

# 28. ERRORES DE CONFIGURACIÓN

Si falla la carga de la configuración:

La landing NO debe quedar en blanco.

Puede mostrar defaults:

```text
15 días
10 conductores
```

y esconder/deshabilitar temporalmente botones de WhatsApp si no existe una URL válida.

No mostrar errores técnicos al usuario.

Registrar el error sólo de forma razonable en desarrollo.

---

# 29. RUTAS A AGREGAR

En:

`src/Routes/index.jsx`

agregar imports y rutas para:

```text
/gana/lideresverificadores
/gana/lideresverificadores/registro
```

Y comprobar:

```text
/coowork/socio
```

La estructura esperada queda:

```text
/gana
/gana/ver-anuncios
/gana/renta-universal
/gana/lideresverificadores
/gana/lideresverificadores/registro
```

---

# 30. NO MODIFICAR TODAVÍA `/gana`

No añadir ni cambiar tarjetas/opciones de `/gana` en esta tarea salvo que ya exista una entrada de Líderes de Conductores que simplemente tenga que corregirse.

El objetivo principal es construir la landing y dejar su URL disponible.

---

# 31. NO IMPLEMENTAR TODAVÍA

En esta tarea NO implementar:

- formulario real de registro.
- creación real de la candidatura desde frontend.
- contador automático de referidos.
- relación entre conductor referido y Líder.
- promoción automática a `driver-verifier`.
- cron/worker para vencimientos.
- panel de progreso del candidato.
- dashboard del Líder.
- comisiones reales.
- pagos.
- expiraciones/reintentos.

Preparar la arquitectura para ello, pero no inventar funcionalidades fuera del alcance.

---

# 32. ARCHIVOS ESPERADOS

Como mínimo revisar/crear/modificar equivalentes a:

## Backend

```text
ciudadan_backend_26/
  src/api/site-setting/content-types/site-setting/schema.json

  src/api/driver-verifier-candidacy/
    content-types/driver-verifier-candidacy/schema.json
    controllers/...
    routes/...
    services/...

  seed/site-settings.js
```

Agregar endpoint público de configuración siguiendo la convención de rutas custom existente.

---

## Frontend

```text
ciudadan_frontend/src/
  Pages/Gana/
    LideresVerificadoresPage.jsx
    LiderVerificadorRegistroPage.jsx

  components/LideresVerificadores/
    ... componentes necesarios

  services/
    driverVerifierService.js

  Routes/index.jsx
```

Reutilizar componentes existentes siempre que tenga sentido.

---

# 33. CRITERIOS DE ACEPTACIÓN

La tarea no está terminada hasta comprobar todos estos puntos:

1. `/gana/lideresverificadores` carga sin iniciar sesión.

2. Los valores `15` y `10` proceden de `site-setting`, no están simplemente escritos dentro del JSX.

3. La URL de WhatsApp procede de `site-setting`.

4. El seed puede ejecutarse varias veces sin crear basura ni duplicados.

5. El Single Type existente se amplía, NO se duplica.

6. Existe el Collection Type `driver-verifier-candidacy`.

7. Tiene:
   - user
   - referred_drivers
   - registered_since
   - closes_at
   - activated
   - closed.

8. Un invitado ve la landing.

9. Un usuario autenticado normal ve la landing.

10. Un usuario con:
    `driver-verifier-candidate`
    es enviado a `/coowork/socio`.

11. Un usuario con:
    `driver-verifier`
    es enviado a `/coowork/socio`.

12. No existe flash de landing antes de redireccionar a usuarios con esos roles.

13. `/coowork/socio` no devuelve 404.

14. El CTA principal lleva a:
    `/gana/lideresverificadores/registro`.

15. La ruta de registro existe pero todavía no inicia candidatura.

16. Ambos botones:
    - `Unirme al grupo de Líderes`
    - `Contactar`
    
    llevan al WhatsApp configurado.

17. La landing funciona en mobile y desktop.

18. No se agregan nuevas dependencias innecesarias.

19. Se usa MUI moderno, no ampliar patrones legacy de Material UI v4.

20. Framer Motion se usa únicamente donde aporte valor.

21. Ejecutar:

```bash
npm run build
```

en frontend.

22. Verificar que no se introdujeron errores de compilación/imports/casing Linux.

23. Si es posible ejecutar backend en development, confirmar que Strapi levanta correctamente con el nuevo schema.

24. No modificar código ajeno a esta funcionalidad sin necesidad.

---

# 34. RESULTADO ESPERADO

Al terminar quiero una landing visualmente muy trabajada que haga sentir al usuario que está frente a una oportunidad concreta de construir su propia red dentro de Ciudadan.

La narrativa debe llevarlo así:

```text
Esto es distinto a las apps tradicionales
↓
Aquí el conductor conserva lo que genera
↓
Yo puedo construir una red
↓
Esa red puede producirme un ingreso recurrente
↓
Tengo una misión concreta
↓
X conductores en X días
↓
Puedo empezar ahora
```

Pero si todavía no está convencido:

```text
No se pierde
↓
entra al grupo
↓
contacta
↓
sigue dentro del embudo
```

La landing debe vender la oportunidad sin parecer un esquema de dinero fácil.

El protagonista debe ser:

**la construcción de una red de conductores dentro de un modelo cooperativo de movilidad.**