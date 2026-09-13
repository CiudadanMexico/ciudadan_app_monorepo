# 11 — Guía de usuario: Referidos e Invitaciones

> Documento de **ayuda para el usuario final** sobre el sistema de **referidos** de Ciudadan.
> Complementa `09-Guia-Usuario-Sitio.md` (sección 4) y el archivo de ayuda del visor de wiki
> (`socket-service/wiki/help/referidos.md`).

---

## Generar tu enlace y código

1. Entra a `/referir` (también `/registrar`).
2. Obtienes tu **código de referido** y un **enlace personal** con ese código.
3. Comparte el enlace con quien quieras invitar.

## Cómo ganas comisiones

- Cuando alguien se **registra por primera vez** con tu enlace, queda vinculado como tu
  **referido**.
- Ves su **historial de pagos** y tus **comisiones** desde la sección de referidos
  (`CodigoReferido`, `HistorialPagosReferidos`).
- Las comisiones se suman a tu cuenta según lo que genere tu referido.

## Seguimiento de tus referidos

- En el área de referidos consultas la **lista de tus referidos** y el **estado** de cada uno.
- Puedes revisar los **pagos/comisiones** acumulados por cada referido.

## Referir a un club

- El mismo enlace/comando sirve para **referir o agregar** a alguien a un club:
  - `/referir/*` (referido a un club específico).
  - `/agregar-club/:club` (agregar directamente a un club).
- Relacionado: ver `09-Guia-Usuario-Sitio.md` (Comunidad y clubs) y `membresias`.

## Preguntas frecuentes

- **¿El referido tiene que pagar algo?** No; solo debe registrarse (o unirse al club) usando
  tu enlace.
- **¿Dónde veo lo que gané?** En el historial de pagos de referidos del área `/referir`.
- **¿Puedo referir a un club?** Sí, con `/referir/*` o `/agregar-club/:club`.

---

## Rutas relacionadas

| Acción | Ruta |
|---|---|
| Generar enlace / código | `/referir` · `/registrar` |
| Referido / invitación a club | `/referir/*` |
| Agregar directamente a un club | `/agregar-club/:club` |

---

*Fin de la guía de referidos.*