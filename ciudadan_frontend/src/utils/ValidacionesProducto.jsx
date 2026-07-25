// src/helpers/validacionesProducto.js
export const textoValido = /^[\w\s.,:¡!¿?()\-°*+×'"%/áéíóúüÁÉÍÓÚÜñÑ]+$/;

export const validarPaso1 = (formData) => {
  const nombre = formData.nombre?.trim() ?? '';
  const descripcion = formData.descripcion?.trim() ?? '';
  const categoria = formData.categoria ?? '';
  const precio = parseFloat(formData.precio);
  const stock = parseInt(formData.stock);

  if (
    nombre.length < 5 || !textoValido.test(nombre) ||
    descripcion.length < 20 || !textoValido.test(descripcion) ||
    !categoria || isNaN(precio) || precio <= 0 ||
    (formData.stockEnabled && (isNaN(stock) || stock < 0))
  ) {
    if(!textoValido.test(nombre)){
      console.log("-".repeat(20));
      console.log("Caracter raro en nombre:");
      getInvalidChars(nombre);
      console.log("-".repeat(20));
    }
    if(!textoValido.test(descripcion)){
      console.log("-".repeat(20));
      console.log("Caracter raro en nombre:");
      getInvalidChars(descripcion);
      console.log("-".repeat(20));
    }
    return false;
  }
  return true;
};

export const validarPaso2 = (formData) => {
  return !!(formData.largo && formData.ancho && formData.alto && formData.peso);
};

export const getInvalidChars = (text='')=>{
  [...text].forEach((c,i)=>{
    if(!textoValido.test(c))
      console.log(
        `Posición ${i}: "${c}" Código: U+${c.charCodeAt(0).toString(16).toUpperCase()}`
      );
  });
}