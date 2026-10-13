// Tokens visuales premium de la landing «Vende en Ciudadan».
// Morados/lilas como identidad COMPLEMENTARIA tecnologica/Labory.
// La identidad amarilla/verde/negra del logotipo oficial no se reemplaza.
export const VENDER_PREMIUM = {
  moradoProfundo: '#581C87',
  purpuraIntenso: '#7C3AED',
  violetaElectrico: '#A855F7',
  lilaLuminoso: '#C4B5FD',
  rosaNeon: '#F472B6',
  fondoOficial: 'linear-gradient(135deg, #1e1033 0%, #2a1650 45%, #3b1d6e 100%)',
  fondoOficialClaro:
    'linear-gradient(135deg, #f3efff 0%, #ede4ff 45%, #e2d3fd 100%)',
};

// Entradas Framer Motion coherentes (0.4-0.7s, stagger 0.07-0.12).
export const FM_ENTRADA_SUAVE = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

export const FM_CONTENEDOR_STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

export const FM_ITEM_STAGGER = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
