# Gana: Anuncios Remunerados

**Gana** es el módulo de **anuncios remunerados**: ves anuncios y ganas **laborys** por cada
visualización completada. También puedes generar contenido, promover membresías y vender para
ganar.

## Contenido
- [[Gana#Cómo ganar|Cómo ganar]]
- [[Gana#Ver anuncios (paso a paso)|Ver anuncios (paso a paso)]]
- [[Gana#Estados del anuncio|Estados del anuncio]]
- [[Gana#Recompensas|Recompensas]]
- [[Gana#Otras formas de ganar|Otras formas de ganar]]
- [[Gana#Solicitar publicar un anuncio|Solicitar publicar un anuncio]]

---

## Cómo ganar

1. Entra a **`/gana`** (`GanaRoute`).
2. Elige un modo de ganar:
   - **Ver anuncios** (remunerados) → `AnunciosRemunerados`.
   - Generar contenido.
   - Promover membresías.
   - Vender (Marketplace/tienda).
3. Las recompensas caen en tu **[[Cartera|Cartera]]** (laborys).

## Ver anuncios (paso a paso)

1. En `/gana` pulsa **Ver anuncios** → `/gana/ver-anuncios` (`AnunciosRemunerados`).
2. Se arma una **playlist** de anuncios (`PlaylistBar`, `VideoPlayer`, `AdGrid`).
3. Reproduces cada anuncio. **Mientras se ve**, el sistema valida la **visualización real**
   (heartbeats + cobertura/duración del video) — esto evita fraudes.
4. Al terminar un anuncio aparece el **DecisionWindow**: puedes **comprometer** la visualización
   para ganar.
5. Al **completar** el anuncio, se suman los **laborys** de recompensa a tu cartera.
6. Pasas al siguiente anuncio hasta agotar la sesión.

> Nota: el backend registra cada vista en `ad-view` y el avance en `ad-session-item` con su
> `cobertura`. Si la cobertura no alcanza o el video se cortó, el anuncio NO se paga (antifraude).

## Estados del anuncio

Cada item de una sesión puede estar en: `queued` → `playing` → `decision_window` →
`committed` → `completed` (o `skipped`, `abandoned`, `invalid`). Solo `completed` paga.

## Recompensas

- Cada anuncio publicitario declara su **recompensa** (laborys) y su **duración** mínima.
- Ganas al **completar** (no por solo abrirlo).
- Puedes ver tu saldo en **[[Cartera|Cartera]]** y el historial de laborys ganados.

## Otras formas de ganar

Desde `/gana` también puedes:
- **Generar contenido** (`GeneraContenidos`).
- **Promover membresías** (`PromueveMembresias`):
  compartes/enlazas planes y ganas por referidos.
- **Vender** en tu tienda/restaurante (ver [[Marketplace|Marketplace]] y [[Comida|Comida]]).

## Solicitar publicar un anuncio

Si quieres **difundir tu anuncio** en la plataforma:
- En `/comunidad/nuevo-anuncio-programado` creas un **anuncio programado** (texto/imagen/
  video/audio, con duración, fechas, horario y recompensa).
- Lo ves/gestionas en `/comunidad/mis-anuncios` (pestañas `programados`, `historial`,
  `configuracion`).
- Si se publicita como **anuncio remunerado** (`esPublicitario`), otros usuarios pueden
  ganar laborys al verlo (y tú difundes tu mensaje).

---

Volver: [[Indice|índice]] · [[Cartera|Cartera]] · [[CoWork|CoWork]] · [[Cuenta|Cuenta]].