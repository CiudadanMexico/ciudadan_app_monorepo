export const WIZARD_STEPS = [
  { id: "bienvenida", title: "Bienvenida" },
  { id: "cuenta", title: "Cuenta" },
  { id: "verificacion", title: "Verificacion", icon: "whatsapp" },
  { id: "personales", title: "Personales" },
  { id: "documentos", title: "Documentos" },
  { id: "licencia", title: "Licencia" },
  { id: "vehiculo", title: "Vehiculo" },
  { id: "fotos", title: "Fotos" },
  { id: "cita", title: "Cita" },
  { id: "resumen", title: "Resumen" },
];

export const STEP_FIELDS = {
  cuenta: ["email", "password", "telefono"],
  verificacion: ["telefono", "phoneVerified"],
  personales: [
    "nombre",
    "apellido_paterno",
    "apellido_materno",
    "fecha_nacimiento",
    "sexo",
    "curp",
    "rfc",
    "telefono_emergencia",
    "direccion",
    "codigo_postal",
    "estado",
    "municipio",
    "ciudad",
  ],
  documentos: [
    "foto_perfil",
    "selfie_verificacion",
    "ine_frente",
    "ine_reverso",
    "licencia_frente",
    "licencia_reverso",
    "comprobante_domicilio",
  ],
  licencia: ["numero_licencia", "tipo_licencia", "vigencia_licencia"],
  vehiculo: ["marca", "modelo", "anio", "color", "placas", "numero_serie_vin", "tipo_vehiculo", "capacidad_pasajeros"],
  fotos: [
    "foto_vehiculo_frontal",
    "foto_vehiculo_lateral",
    "foto_vehiculo_trasera",
    "foto_interior",
    "tarjeta_circulacion",
    "seguro_vehiculo",
  ],
  cita: ["fecha", "sede"],
};

export const STEP_TO_BACKEND_FLAG = {
  personales: { current_step: "personales", profile_completed: true },
  documentos: { current_step: "documentos", documents_completed: true, status: "pending_documents" },
  cita: { current_step: "cita" },
};

export const STEP_ORDER_WITH_ACCOUNT = WIZARD_STEPS.map((s) => s.id);
export const STEP_ORDER_WITHOUT_ACCOUNT = WIZARD_STEPS.filter((s) => s.id !== "cuenta").map((s) => s.id);
