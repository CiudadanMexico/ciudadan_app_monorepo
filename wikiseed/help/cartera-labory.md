# Labory: cómo se obtiene, circula y se recompra

**Labory** es la moneda interna de Ciudadan. Ficha: `/cartera/labory`.

## Cómo se obtiene

- **CoWork:** cuando una tarea que resolviste se califica, el backend acredita
  los Laborys correspondientes en tu cartera.
- **Compra:** en la sección de compra de Labory del marketplace.

## Referencia de valor

Tu saldo en Laborys tiene una **equivalencia informativa** en pesos. Esa
equivalencia **no es un precio efectivo de compra ni de venta**, ni un tipo de
cambio operado por la plataforma.

> Existen dos constantes de referencia distintas en el código: una usada por las
> fichas de la Cartera y otra (`LAB_REFERENCIA`) usada por membresías. Ninguna es
> una cotización operada y deben leerse sólo como referencia interna.

Ciudadan **no convierte automáticamente** tus Laborys a pesos.

## Circulación

Labory circula dentro del ecosistema: se genera en el CoWork, lo publican las
agencias y se consume en el marketplace.

## Fondo de recompra (regla económica acordada)

El fondo de recompra se integra con:

- **50%** de los ingresos por membresías de usuarios.
- **15%** de los ingresos por membresías de negocios.
- **100%** de los ingresos por venta publicitaria de Labory.

Y se divide en dos mitades:

- **50%** para compra a **socios activos**.
- **50%** para compra a **miembros**.

Aclaraciones:

- **Socios activos y miembros son grupos distintos.** Pagar una membresía no
  convierte a nadie en socio activo por ese solo hecho.
- El fondo **no se reasigna automáticamente** entre sus dos mitades.
- **No existe** un presupuesto de compra que sustituya esa fórmula.

**Estado:** la fórmula está acordada y documentada. El fondo no se está
calculando ni ejecutando en la plataforma, y no se muestra ningún saldo ni
porcentaje ya aplicado.

### Simulador de recompra (pendiente)

Tendrá los modos **automático**, **personalizado** y **avanzado por periodos**, y
mostrará circulación, ofertas de recompra, compras realizadas, reservas y
capacidad de atención de cada grupo. Todavía no está implementado.

Volver: [[Indice|índice]] · [[Cartera|Cartera y Wallets]] · [[Cartera-Fichas-Tokens|Fichas de la Cartera]].
