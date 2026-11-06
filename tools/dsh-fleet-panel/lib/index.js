// Half del host del plugin de flota. La parte cliente (navegador) vive en
// lib/client.js. Este archivo existe para que el paquete sea resoluble por
// el Loader del host: no registra nada en el plano del host.
export const name = "@ciudadan/dsh-client-ui-fleet";
export default { name };
