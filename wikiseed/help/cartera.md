# Cartera y Wallets

Tu **cartera** guarda tus saldos: **laborys** (moneda interna), **tokens** de Ciudadan y
(when corresponda) cripto. También creas y gestionas tus **billeteras**.

## Contenido
- [[Cartera#Ver tu saldo|Ver tu saldo]]
- [[Cartera#Crear una billetera|Crear una billetera]]
- [[Cartera#Comprar tokens|Comprar tokens]]
- [[Cartera#Cómo ganas laborys|Cómo ganas laborys]]
- [[Cartera#Pagos y comisiones|Pagos y comisiones]]

---

## Ver tu saldo

- **Entra:** `/cartera` (o `/cartera/:moneda`, `/comprar-tokens`). Hastca un `OpWalletRoute`.
- Ves:
  - **`laborysSaldo`** y **`laborysGanados`** (moneda interna).
  - **`ciudadanTokens`** y **`ciudadanRendimientos`** (tokens).
- Puedes consultar por **moneda** con la ruta `/cartera/:moneda`.

## Crear una billetera

- En **`/cartera/crear`** (`CrearCarteraPage`) generas una **cartera/wallet** mediante
  `ethers.js`: se crea una **dirección** (y su clave). En producción se vincula a tu usuario.
- También hay catálogos/visores: `/cartera/itokens` (`ITokens`) y `/cartera/FreeBoocks`
  (`Catalogo`).

## Comprar tokens

- En `/comprar-tokens` (OpWalletRoute) puedes adquirir tokens de Ciudadan.
- El pago y la acreditación quedan en tu cartera.

## Cómo ganas laborys

- **CoWork:** al calificarse tu tarea se acreditan laborys automáticamente.
  (Ver [[CoWork|CoWork]].)
- **Gana (anuncios):** al completar anuncios remunerados ganas laborys.
  (Ver [[Gana|Gana]].)
- **Pagos internos:** se registran en `laborys-payment` (origen→destino, monto, status).

## Pagos y comisiones

- Los pagos con tarjeta se procesan con **Stripe/OpenPay** y quedan en `pago`.
- Los pagos en laborys/efectivo se registran tanto en `wallet` como en el `pago`
  (tipo market/curso/evento/membresia/carrito/comida/etc.).
- Si vendes en el **[[Marketplace|Marketplace]]** o **[[Comida|Comida]]**, los pagos se
  liquidan a tu cuenta bancaria (CLABE) descontando comisiones.

> Relacionado: existen conceptos `world-coin-wallet` (`CarteraIdx`, `genesis`) y `gen-wallet`.

---

Volver: [[Indice|índice]] · [[CoWork|CoWork]] · [[Gana|Gana]] · [[Cuenta|Cuenta]].