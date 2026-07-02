const API_URL = process.env.REACT_APP_STRAPI_URL; // URL de tu instancia de Strapi

// Registro de usuario en Strapi
export const registerUserInStrapi = async (email, username) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        email: email,
        password: 'defaultPassword123', // Puedes cambiar esto a una generación de contraseña segura
      }),
    });

    if (!response.ok) {
      throw new Error('Error en el registro del usuario en Strapi');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al registrar el usuario en Strapi:', error);
    return null;
  }
};

// Buscar usuario en Strapi por email
export const findUserInStrapi = async (email) => {
  try {
    const response = await fetch(`${API_URL}/api/users?filters[email][$eq]=${email}`);
    if (!response.ok) {
      throw new Error('Error en la búsqueda del usuario en Strapi');
    }

    const data = await response.json();
    return data; // Asegúrate de ajustar esto según la estructura de la respuesta de Strapi
  } catch (error) {
    console.error('Error al buscar el usuario en Strapi:', error);
    return [];
  }
};
