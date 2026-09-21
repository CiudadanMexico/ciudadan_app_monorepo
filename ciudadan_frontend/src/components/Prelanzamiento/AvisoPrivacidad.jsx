import React from 'react';
import { Container } from '@mui/material';

// Aviso genérico de esta campaña. Completar razón social, domicilio y canal ARCO
// cuando Ciudadan proporcione esos datos; no afirmar cumplimiento legal integral.
export default function AvisoPrivacidad() {
  return <Container maxWidth='lg' component='section' id='aviso-privacidad' className='pre-privacy' tabIndex={-1}>
    <details>
      <summary>Aviso de privacidad del prelanzamiento de Ciudadan</summary>
      <h2>Tu información y el prelanzamiento</h2>
      <p>Ciudadan utiliza la información que proporcionas para recibir y dar seguimiento a tu solicitud como conductor, líder de conductores o socio estatal.</p>
      <h3>Datos y finalidades</h3>
      <p>Recabamos nombre, WhatsApp, estado, municipio y las respuestas de tu modalidad: actividad de conducción, ciudad, persona que te invitó, tamaño estimado de tu red, experiencia y condiciones para operar un nodo. También registramos fecha, autorización de contacto, origen de la visita y parámetros de campaña.</p>
      <p>Estos datos permiten evitar solicitudes duplicadas, revisar tu perfil, identificar la promoción que solicitaste y contactarte por WhatsApp sobre el lanzamiento, reuniones e incorporación. Este registro no genera un cobro ni garantiza la aprobación de un perfil o la asignación de un estado.</p>
      <h3>Uso y conservación</h3>
      <p>La información se guarda en el sistema de Ciudadan para su seguimiento por el equipo autorizado. Se conservará durante la gestión de tu solicitud y, cuando corresponda, por las obligaciones aplicables. No incluyas datos sensibles ni información bancaria en los campos abiertos.</p>
      <h3>Tus decisiones</h3>
      <p>Puedes solicitar acceso, corrección o eliminación de tus datos, o dejar de recibir mensajes. Comunícalo por mensaje privado al equipo de Ciudadan que atienda tu incorporación, indicando el WhatsApp utilizado en el registro. No publiques tus datos en el grupo comunitario.</p>
      <h3>Servicios externos y cambios</h3>
      <p>Los videos se reproducen mediante YouTube al activarlos. Las miniaturas se solicitan a YouTube. Si eliges abrir WhatsApp, se aplican también las políticas de ese servicio. Unirte al grupo es opcional y puede hacer visible tu número a sus integrantes.</p>
      <p>Las actualizaciones de este aviso se publicarán en esta misma sección. Versión: prelanzamiento-2026-09. Al marcar la casilla autorizas el tratamiento descrito y el contacto para esta campaña.</p>
    </details>
  </Container>;
}
