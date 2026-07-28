const BANK_CODES = {
  "002": "Banamex",
  "012": "BBVA",
  "014": "Santander",
  "021": "HSBC",
  "030": "BanBajío",
  "036": "Inbursa",
  "042": "Mifel",
  "044": "Scotiabank",
  "058": "Banregio",
  "062": "Afirme",
  "072": "Banorte",
  "102": "Invex",
  "106": "Ve por Más",
  "108": "MUFG",
  "110": "JP Morgan",
  "112": "BMONEX",
  "127": "Banco Azteca",
  "128": "Autofin",
  "129": "Barclays",
  "130": "Compartamos",
  "132": "Multiva",
  "133": "Actinver",
  "134": "Wal-Mart",
  "135": "Nafin",
  "136": "Intercam",
  "137": "Bancoppel",
  "138": "ABC Capital",
  "140": "Consubanco",
  "141": "Volkswagen Bank",
  "143": "CIBanco",
  "145": "Bansi",
  "147": "Bank of China",
  "166": "Banco del Bienestar",
  "168": "Hipotecaria Federal",
  "600": "Monex",
  "601": "GBM",
  "602": "Masari",
  "605": "Value",
  "606": "CI Casa de Bolsa",
  "608": "Vector",
  "610": "B&B",
  "614": "Accival",
  "616": "Finamex",
  "617": "Valmex",
  "618": "Unica",
  "619": "MAPFRE",
  "620": "Profuturo",
  "621": "CB Actinver",
  "622": "OACTIN",
  "623": "Skandia",
  "626": "CBDEUTSCHE",
  "627": "Zurich",
  "628": "Zurich Vida",
  "629": "Su Casita",
  "630": "CB Intercam",
  "631": "CI Bolsa",
  "632": "Bulltick",
  "633": "Sterling",
  "634": "Fincomún",
  "636": "HDI Seguros",
  "637": "Order",
  "638": "Nu México",
  "640": "J.P. Morgan Casa de Bolsa",
  "642": "Refaccionaria",
  "646": "STP",
  "647": "Telecomm",
  "648": "Evercore",
  "649": "Skandia Operadora",
  "651": "Donde",
  "652": "Clip",
  "653": "Klar",
  "655": "Spin by OXXO",
  "656": "Finsus",
  "659": "Albo",
  "901": "CLS",
  "902": "Indeval",
  "906": "Arcus",
  "999": "N/A"
};

export const BANK_OPTIONS = [
  "Banamex",
  "BBVA",
  "Santander",
  "HSBC",
  "BanBajío",
  "Inbursa",
  "Mifel",
  "Scotiabank",
  "Banregio",
  "Afirme",
  "Banorte",
  "Invex",
  "Ve por Más",
  "MUFG",
  "JP Morgan",
  "BMONEX",
  "Banco Azteca",
  "Autofin",
  "Barclays",
  "Compartamos",
  "Multiva",
  "Actinver",
  "Wal-Mart",
  "Nafin",
  "Intercam",
  "Bancoppel",
  "ABC Capital",
  "Consubanco",
  "Volkswagen Bank",
  "CIBanco",
  "Bansi",
  "Bank of China",
  "Banco del Bienestar",
  "Hipotecaria Federal",
  "Monex",
  "GBM",
  "Masari",
  "Value",
  "CI Casa de Bolsa",
  "Vector",
  "B&B",
  "Accival",
  "Finamex",
  "Valmex",
  "Unica",
  "MAPFRE",
  "Profuturo",
  "CB Actinver",
  "OACTIN",
  "Skandia",
  "CBDEUTSCHE",
  "Zurich",
  "Zurich Vida",
  "Su Casita",
  "CB Intercam",
  "CI Bolsa",
  "Bulltick",
  "Sterling",
  "Fincomún",
  "HDI Seguros",
  "Order",
  "Nu México",
  "J.P. Morgan Casa de Bolsa",
  "Refaccionaria",
  "STP",
  "Telecomm",
  "Evercore",
  "Skandia Operadora",
  "Donde",
  "Clip",
  "Klar",
  "Spin by OXXO",
  "Finsus",
  "Albo",
  "CLS",
  "Indeval",
  "Arcus",
  "Mercado Pago"
];

/**
 * Obtiene el nombre del banco emisor a partir de una CLABE interbancaria.
 *
 * La función utiliza los primeros 3 dígitos de la CLABE (código de banco)
 * para buscar el nombre de la institución financiera en el catálogo `BANCOS`.
 *
 * @param {string} clabe - CLABE interbancaria de 18 dígitos.
 * @returns {string} Nombre del banco si el código existe en el catálogo;
 */
export function getBankByCLABE(clabe) {
  return BANK_CODES[clabe.slice(0, 3)] ?? "Banco desconocido";
}
/**
 * Valida una CLABE interbancaria mexicana.
 *
 * Verifica que:
 * - La CLABE esté compuesta por exactamente 18 dígitos.
 * - El dígito verificador (último dígito) sea correcto de acuerdo con el
 *   algoritmo oficial de validación de CLABE.
 *
 * @param {string} clabe - CLABE interbancaria de 18 dígitos.
 * @returns {boolean} `true` si la CLABE es válida; en caso contrario, `false`.
 */
export function validateCLABE(clabe) {
  if (!/^\d{18}$/.test(clabe)) {
    return false;
  }

  let suma = 0;

  for (let i = 0; i < 17; i++) {
    const factor = [3, 7, 1][i % 3];
    suma += (Number(clabe[i]) * factor) % 10;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;

  return digitoVerificador === Number(clabe[17]);
}