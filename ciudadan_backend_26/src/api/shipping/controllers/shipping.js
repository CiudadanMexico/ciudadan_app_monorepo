// src/api/shipping/controllers/shipping.js

const axios = require('axios');

// Función auxiliar: calcular peso volumétrico
const calcularPesoVolumetrico = (largo, ancho, alto) => {
  return (largo * ancho * alto) / 5000;
};

// Función auxiliar: determinar el mayor entre peso real y volumétrico
const calcularPesoCobrado = (pesoReal, pesoVol) => {
  return Math.max(pesoReal, pesoVol);
};

// Función auxiliar: determinar la región por estado
const regiones = {
  Norte: ['Chihuahua', 'Sonora', 'Coahuila', 'Nuevo León', 'Durango', 'Tamaulipas'],
  Centro: ['CDMX', 'Ciudad de México', 'Estado de México', 'Hidalgo', 'Puebla', 'Tlaxcala', 'Morelos', 'Querétaro'],
  Occidente: ['Jalisco', 'Michoacán', 'Colima', 'Nayarit', 'Zacatecas', 'San Luis Potosí'],
  Sur: ['Oaxaca', 'Chiapas', 'Veracruz', 'Tabasco', 'Guerrero'],
  Sureste: ['Yucatán', 'Campeche', 'Quintana Roo'],
  Bajío: ['Aguascalientes', 'Guanajuato'],
};

const getRegion = (estado) => {
  for (const [region, estados] of Object.entries(regiones)) {
    if (estados.includes(estado)) return region;
  }
  return null;
};

// Obtener estado desde código postal
const obtenerEstadoPorCP = async (cp) => {
  try {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${cp}&components=country:MX&key=${process.env.GEOCODING_KEY}`);
    const componentes = response.data.results[0]?.address_components || [];

    const estado = componentes.find(c =>
      c.types.includes("administrative_area_level_1")
    );

    return estado?.long_name || null;
  } catch (e) {
    console.error('Error al obtener estado:', e.message);
    return null;
  }
};

// Estimar costo de envío
const estimarCostoEnvio = (regionOrigen, regionDestino, pesoCobrado) => {
  let base = regionOrigen === regionDestino ? 70 : 130;
  if (!regionOrigen || !regionDestino) base = 150;

  if (pesoCobrado <= 1) return base;
  const extraPeso = Math.ceil(pesoCobrado - 1);
  return base + extraPeso * 30;
};

// Controlador principal del endpoint
module.exports = {
  async calcular(ctx) {
    const {
      cp_origen = '11560',
      cp_destino = '11560',
      largo = 1,
      ancho = 1,
      alto = 1,
      peso = 1,
      cantidad = 1,
    } = ctx.request.body;

    const estadoOrigen = await obtenerEstadoPorCP(cp_origen);
    const estadoDestino = await obtenerEstadoPorCP(cp_destino);

    if (!estadoOrigen || !estadoDestino) {
      return ctx.badRequest('No se pudo determinar el estado a partir del CP');
    }

    const regionOrigen = getRegion(estadoOrigen);
    const regionDestino = getRegion(estadoDestino);

    const pesoVolUnitario = calcularPesoVolumetrico(largo, ancho, alto);
    const pesoVolTotal = pesoVolUnitario * cantidad;
    const pesoRealTotal = peso * cantidad;

    const pesoCobrado = calcularPesoCobrado(pesoRealTotal, pesoVolTotal);

    const costo = estimarCostoEnvio(regionOrigen, regionDestino, pesoCobrado);

    return { costo };
  }
};
