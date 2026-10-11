// src/config/labory.js
//
// Referencia interna del valor de Labory usada por la experiencia comercial
// de membresías y servidores. NO es una cotización oficial del INEGI ni un
// precio de mercado vigente: documenta la referencia trabajada previamente
// para el esquema de intercambio entre agencias y nodos.
//
// Fuente recuperada del trabajo previo:
//   - Fórmula:  valor LAB = (3 × LPI × 1.20) / 120
//   - Insumo:   LPI = $4,905.33 MXN
//   - Resultado: 1 LAB ≈ $147.16 MXN
//
// La atribución estadística y la vigencia de estas cifras no quedaron
// verificadas en este encargo. Se muestran como REFERENCIA INTERNA y nunca
// como efectivo garantizado, rendimiento asegurado ni recompra incondicional.
//
// Esta es la ÚNICA fuente del valor de Labory en el frontend: no dispersar
// la tasa en múltiples componentes. No modifica por este encargo la tasa
// global de cartera, saldos, contabilidad ni contratos.

export const LAB_REFERENCIA = {
  moneda: 'MXN',
  valorUnitario: 147.16, // MXN por 1 LAB (2 decimales)
  lpi: 4905.33, // insumo de referencia (MXN)
  formula: '(3 × LPI × 1.20) / 120',
  fechaReferencia: null, // no verificada en este encargo
  procedencia: 'referencia interna (trabajo previo)',
  tipo: 'referencia_interna',
};

// Renta de participación del servidor compartido (sustituye la propuesta
// anterior de 80 Labory).
export const RENTA_COMPARTIDO_LAB = 50;

// Redondeo monetario consistente a 2 decimales (evita errores de punto
// flotante sumando un epsilon antes de redondear).
const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Equivalencia de referencia en MXN para una cantidad de Labory.
// El valor unitario mostrado y el total usan la MISMA política de redondeo
// para que 50 × 147.16 sea exactamente 7,358.00 sin discrepancias.
export function equivalenciaMxn(cantidadLab) {
  const cantidad = Number(cantidadLab);
  const total = redondear(cantidad * LAB_REFERENCIA.valorUnitario);
  return {
    cantidadLab: cantidad,
    valorUnitario: LAB_REFERENCIA.valorUnitario,
    moneda: LAB_REFERENCIA.moneda,
    total,
  };
}
