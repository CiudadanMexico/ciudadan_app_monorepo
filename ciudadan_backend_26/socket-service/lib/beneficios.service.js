const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL;
const HEADERS = { Authorization: `Bearer ${process.env.STRAPI_TOKEN}` };
const AGENCIA_WALLET = 'AGENCIA_MAESTRA_001';

const MULTIPLICADOR_NIVEL = { 1: 1.0, 2: 2.0, 3: 3.0 };
const PORCENTAJE_VENDEDOR = 0.05;

/**
 * Busca una cartera por su dirección/wallet.
 */
async function obtenerCarteraPorWallet(wallet) {
  const url = `${STRAPI_URL}/api/carteras?filters[address][$eq]=${encodeURIComponent(
    wallet
  )}&populate=*`;
  const resp = await axios.get(url, { headers: HEADERS });
  return resp.data.data[0] || null;
}

/**
 * Verifica si ya existe un pago registrado con esa firma (idempotencia).
 */
async function pagoYaProcesado(firma) {
  if (!firma) return false; // si no se envía firma, no podemos garantizar idempotencia
  const url = `${STRAPI_URL}/api/laborys-payments?filters[firma][$eq]=${encodeURIComponent(
    firma
  )}`;
  const resp = await axios.get(url, { headers: HEADERS });
  return resp.data.data.length > 0;
}

/**
 * Actualiza el saldo de una cartera de forma "condicional":
 * vuelve a leer el saldo justo antes de escribir y compara contra el
 * valor esperado para detectar si alguien más lo modificó mientras tanto
 * (optimistic locking best-effort; no reemplaza una transacción real de DB).
 */
async function actualizarSaldoConChequeo(carteraId, saldoEsperado, nuevoSaldo) {
  const actual = await axios.get(`${STRAPI_URL}/api/carteras/${carteraId}`, {
    headers: HEADERS,
  });
  const saldoReal = actual.data.data.attributes.laborysSaldo || 0;

  if (saldoReal !== saldoEsperado) {
    throw new Error(
      `Conflicto de concurrencia detectado en cartera ${carteraId}. ` +
        `Saldo esperado: ${saldoEsperado}, saldo real: ${saldoReal}. Reintenta la operación.`
    );
  }

  return axios.put(
    `${STRAPI_URL}/api/carteras/${carteraId}`,
    { data: { laborysSaldo: nuevoSaldo } },
    { headers: HEADERS }
  );
}

const otorgarSubsidio = async (paraWallet, montoBase, firma) => {
  // --- Validaciones de entrada ---
  if (!paraWallet) throw new Error('paraWallet es requerido.');
  if (typeof montoBase !== 'number' || montoBase <= 0) {
    throw new Error('montoBase debe ser un número mayor a 0.');
  }

  // --- Idempotencia: evitar pagar dos veces la misma operación ---
  if (await pagoYaProcesado(firma)) {
    throw new Error(`La firma "${firma}" ya fue procesada anteriormente.`);
  }

  // --- 1. Obtener cartera de la AGENCIA (fuente del subsidio) ---
  const agencia = await obtenerCarteraPorWallet(AGENCIA_WALLET);
  if (!agencia) throw new Error('No se encontró la cartera de la agencia.');
  const saldoAgencia = agencia.attributes.laborysSaldo || 0;

  // --- 2. Obtener cartera del receptor ---
  const receptor = await obtenerCarteraPorWallet(paraWallet);
  if (!receptor) throw new Error('La wallet no existe en el sistema.');

  const { tipoUsuario, nivel, laborysSaldo: saldoReceptor = 0 } =
    receptor.attributes;

  // --- 3. Calcular beneficio según el rol ---
  let beneficio = 0;

  if (tipoUsuario === 'conductor') {
    const nivelNum = Number(nivel);
    const mult = MULTIPLICADOR_NIVEL[nivelNum];
    if (!mult) {
      throw new Error(
        `Nivel de conductor inválido: "${nivel}". Debe ser 1, 2 o 3.`
      );
    }
    beneficio = montoBase * mult;
  } else if (tipoUsuario === 'vendedor') {
    beneficio = montoBase * PORCENTAJE_VENDEDOR;
  } else {
    throw new Error('El usuario no es conductor ni vendedor.');
  }

  // --- 4. Validar que la agencia tenga fondos suficientes ---
  if (saldoAgencia < beneficio) {
    throw new Error(
      `Cartera de agencia insuficiente. Disponible: ${saldoAgencia}, requerido: ${beneficio}.`
    );
  }

  // --- 5. Descontar de la agencia y acreditar al receptor ---
  // Nota: estos dos pasos NO son atómicos entre sí al hacerse vía HTTP.
  // Si el paso de acreditar falla después de descontar, se intenta
  // revertir el descuento (compensación best-effort).
  const nuevoSaldoAgencia = saldoAgencia - beneficio;
  await actualizarSaldoConChequeo(agencia.id, saldoAgencia, nuevoSaldoAgencia);

  try {
    const nuevoSaldoReceptor = saldoReceptor + beneficio;
    await actualizarSaldoConChequeo(
      receptor.id,
      saldoReceptor,
      nuevoSaldoReceptor
    );
  } catch (error) {
    // Compensación: devolver el saldo a la agencia si falló el crédito al receptor
    await axios.put(
      `${STRAPI_URL}/api/carteras/${agencia.id}`,
      { data: { laborysSaldo: saldoAgencia } },
      { headers: HEADERS }
    );
    throw new Error(
      `Falló el acreditado al receptor, se revirtió el descuento en agencia. Detalle: ${error.message}`
    );
  }

  // --- 6. Registro inmutable en Strapi ---
  await axios.post(
    `${STRAPI_URL}/api/laborys-payments`,
    {
      data: {
        walletEmisor: AGENCIA_WALLET,
        walletReceptor: paraWallet,
        monto: beneficio,
        firma,
        tipo: 'subsidio',
      },
    },
    { headers: HEADERS }
  );

  return { beneficio, tipoUsuario, nivel, saldoAgenciaRestante: nuevoSaldoAgencia };
};

module.exports = { otorgarSubsidio };