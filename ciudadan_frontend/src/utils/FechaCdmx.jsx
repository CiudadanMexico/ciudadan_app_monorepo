export default function FechaCdmx(fechaISO) {
  const date = new Date(fechaISO);

  // 1) Configura el formateador en español (CDMX), 24h
  const formatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // 2) Obtén las partes
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(({ type, value }) => {
    map[type] = value;
  });

  // 3) Capitaliza weekday y quita punto final de month
  let weekday = map.weekday || '';
  weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  let month = (map.month || '').replace(/\.$/, '');
  month = month.charAt(0).toUpperCase() + month.slice(1);

  // 4) Construye la cadena final
  const day = map.day;
  const hour = map.hour;
  const minute = map.minute;

  return `${weekday} ${day} de ${month} a las ${hour}:${minute}, CDMX`;
}
