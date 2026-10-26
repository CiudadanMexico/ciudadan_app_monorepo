# Arquitectura de viajes Ciudadan: web y APK

Estado: decisión de producto aprobada (octubre 2026). Implementación pendiente de auditoría.

## Regla fundamental

- **Pasajeros**: pueden utilizar todas las funcionalidades de viajes tanto desde navegadores web como desde la APK móvil.
- **Conductores**: únicamente pueden operar viajes desde la **APK móvil oficial de Ciudadan**. Las funciones operativas de conductor no están disponibles en web.

## Matriz de operaciones

| Función | Web | APK móvil |
|---|---|---|
| Pasajero: solicitar viaje | Sí | Sí |
| Pasajero: seguimiento y pago | Sí | Sí |
| Conductor: recibir solicitudes | No | Sí |
| Conductor: aceptar/rechazar viajes | No | Sí |
| Conductor: iniciar/finalizar viajes | No | Sí |
| Conductor: gestionar viajes activos | No | Sí |

## Requisitos técnicos

1. Detectar el entorno de ejecución nativo mediante **Capacitor**.
2. Restringir en el frontend web las operaciones de viajes exclusivas del conductor (no basta con ocultar botones).
3. **Validar también en backend**: el servidor debe impedir operaciones exclusivas de conductor realizadas desde clientes web no autorizados, mediante autorización y controles adecuados para clientes móviles oficiales.
4. Conservar las operaciones de pasajero en ambos clientes (web y APK).
5. Revisar las implementaciones previas de Adrián antes de modificar componentes de viajes.
6. Auditar las ramas relacionadas con viajes, en particular `feature/taxis-trips`.
7. Verificar con pruebas que las restricciones se aplican correctamente y no dependen exclusivamente de la interfaz.

## Alcance

Esta decisión afecta únicamente a las funcionalidades **operativas de viajes del conductor**. No prohíbe automáticamente su registro, consulta de documentos, capacitación o administración de cuenta desde web.

## Pendientes de auditoría

- [ ] Ubicar y auditar el proyecto/repo donde se construye la APK (Capacitor).
- [ ] Revisar los cambios de conductor hechos por Adrián (expediente vehicular, verificación).
- [ ] Auditar la rama `feature/taxis-trips` y decidir su integración.
- [ ] Verificar que la web (pasajero) esté operativa y que la APK (conductor) ejecute sus flujos.