# Membresías

Guía de las **membresías** de Ciudadan: ver planes, pagar, activar y verificar tu estado.

## Contenido
- [[Membresias#Tipos de membresía|Tipos de membresía]]
- [[Membresias#Adquirir y pagar|Adquirir y pagar]]
- [[Membresias#Mi membresía y activación|Mi membresía y activación]]
- [[Membresias#Verificación legal (COFEPRIS)|Verificación legal (COFEPRIS)]]
- [[Membresias#Notas|Notas]]

---

## Tipos de membresía

Ciudadan ofrece membresías para el **club** con varios planes y niveles. Los tipos disponibles
(`membresias-tipo`): `jardinero`, `consumo`, `exterior`, `sencilla`, `doble`. Pueden incluir
**subtipos** y un **nivel** (`level`) para diferenciar beneficios.

> ⚠️ La membresía tipo `socio` (club) **no es** el "rol" de permisos (`roles.extra`). Son
> conceptos distintos: la membresía te da acceso al servicio; el rol define permisos en la app.

## Adquirir y pagar

- **Ver planes:** `/membresias` lista los tipos.
- **Pagar / adquirir:** `/membresias/adquirir/*` (`MembershipCheckout`) — eliges plan y pagas.
  - También `/membresias/pago/plan/:planId` (pago directo por plan).
- **Pasarela:** el pago se procesa con **Stripe** u **OpenPay**. Queda registrado en
  `pago` (tipo `membresia`) y se crea/renueva tu membresía (`membresia`).

## Mi membresía y activación

- **Ver estado:** `/mi-membresia` (`MiMembresia`) — plan, fechas `fechaInicio`/`fechaFin`,
  vigencia y observaciones.
- **Activar:** `/activatumembresia` (`ActivaTuMembresia`).
- **Probar:** `/membresias/pagar/*` (`ProbarMembresia`) si hay periodo de prueba.
- **Estado en tu usuario:** campos como `membresia_vigente`, `tipo_membresia`,
  `fecha_membresia`, `fecha_fin_membresia_actual`, `subscriptionStatus` (active/canceled/incomplete).

## Verificación legal (COFEPRIS)

Algunos niveles/clubs requieren trámite **COFEPRIS**:
- Se registra un `cofepristramite` con tus datos (RFC, CURP, INE frente/tras, acuse, resolución,
  escrito libre).
- Subes los **documentos** desde tu perfil (INE, escrito libre, acuse sellado).
- Un administrador revisa y (si procede) **concede/niega** (`concedido`/`negado`/`concluido`).
- También hay flujo de **amparo** (autoamparo, membresía consumo/cultivo, jardinero, cliente).

## Notas

- El pago de la membresía se vincula a tu usuario (`pago.usuario`) y a tu `membresia`.
- Si cancelas la suscripción Stripe, se marca `subscriptionStatus`/`activa=false`.
- Más: [[Cuenta|Cuenta y perfil]], [[Cartera|Cartera]], [[Comunidad|Comunidad y clubs]],
  o vuelve al [[Indice|índice]].