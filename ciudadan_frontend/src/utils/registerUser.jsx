const registerUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:30010/api/auth/local/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error al registrar usuario:', errorData);
      throw new Error('Error al registrar usuario');
    }

    const data = await response.json();
    console.log('Usuario registrado:', data);
    return data;
  } catch (error) {
    console.error('Error en el registro:', error);
    return null;
  }
};

export default registerUser;
