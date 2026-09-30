const Database = require('sqlite3').Database;
const db = new Database('.tmp/data.db', { readonly: true });
db.all("SELECT id, posicion, status, fecha_solicitud, prelanzamiento_clave IS NOT NULL AS con_clave, json_extract(prelanzamiento_datos, '$.nombre') AS nombre, json_extract(prelanzamiento_datos, '$.estadoSolicitado') AS estado_solicitado, json_extract(prelanzamiento_datos, '$.telefono') AS telefono FROM postulaciones ORDER BY id DESC LIMIT 5", [], (err, rows) => {
  if (err) { console.error('ERROR:', err.message); process.exit(1); }
  console.log(JSON.stringify(rows, null, 1));
  db.close();
});
