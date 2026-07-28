const getMinutesSince = (utcTime, city = 'cdmx') => {
    // Mapeo de ciudades a sus zonas horarias (IANA)
    const cityTimeZones = {
      cdmx: 'America/Mexico_City'
      // Puedes agregar más ciudades y sus zonas horarias aquí
    };
  
    // Se obtiene la zona horaria de la ciudad; si no se encuentra se usa 'UTC'
    const timeZone = cityTimeZones[city] || 'UTC';
  
    // Se crea un objeto Date a partir del timestamp en UTC
    const inputDate = new Date(utcTime);
  
    // Para efectos de visualización: se formatea la fecha en la zona horaria de la ciudad
    const cityDateString = inputDate.toLocaleString('en-US', {
      timeZone,
      hour12: false
    });
    console.log(`La fecha en la zona horaria de ${city} es: ${cityDateString}`);
  
    // Se obtiene la fecha y hora actuales
    const now = new Date();
  
    // Se calcula la diferencia en milisegundos y se convierte a minutos
    const diffMilliseconds = now.getTime() - inputDate.getTime();
    const diffMinutes = Math.floor(diffMilliseconds / (1000 * 60));
  
    return diffMinutes;
  };
  
  const contadorfechas = { getMinutesSince };
  
  export default contadorfechas;
  