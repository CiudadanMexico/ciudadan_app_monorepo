const API = process.env.REACT_APP_STRAPI_URL;
const PREGUNTAS_URL = `${API}/api/preguntas-productos`;
const authHeaders = () => ({
  "Content-Type": "application/json",
  // Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const obtenerPreguntasProducto = async (productoId) => {

  // const filterStatusStr = "filters[status][$eq]=respondida";
  const filterUsuarioStr = `filters[producto][id][$eq]=${productoId}`;
  const populateStr = "populate=usuario";
  const sortStr = "sort=fechapregunta:desc";
  const response = await fetch(`${PREGUNTAS_URL}?${filterUsuarioStr}&${populateStr}&${sortStr}`);

  const json = await response.json();

  return json.data;
};

export const obtenerPreguntasProductosByStore = async ({
  storeId,
  status = "",
  page = 1,
  pageSize = 10,
}) => {

  const params = new URLSearchParams();

  params.append("filters[store][id][$eq]", storeId);

  if (status) {
    params.append("filters[status][$eq]", status);
  }

  params.append("populate[0]", "usuario");
  params.append("populate[1]", "producto");

  params.append("sort", "fechapregunta:desc");

  params.append("pagination[page]", page);
  params.append("pagination[pageSize]", pageSize);

  const response = await fetch(`${PREGUNTAS_URL}?${params.toString()}`);

  return await response.json();
};

export const crearPreguntaProducto = async ({
  producto,
  usuario,
  pregunta,
  store,
}) => {

  const response = await fetch(`${PREGUNTAS_URL}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        data: {
          producto,
          usuario,
          store,
          pregunta,
          status: "publicada",
          fechapregunta: new Date().toISOString(),
        }
      })
    }
  );

  return response.json();
};

export const registrarRespuestaPregunta = async (preguntaId, respuesta = '') => {

  const response = await fetch(`${PREGUNTAS_URL}/${preguntaId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      data: {
        respuesta,
        status: 'respondida',
        fecha_respuesta: new Date().toISOString()
      }
    })
  });
  const json = await response.json();
  return json?.data;
};