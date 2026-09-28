import React from 'react';
import TokenPlaceholderPage from '../components/Cartera/TokenPlaceholderPage.jsx';

/**
 * Ruta /identidad — ficha navegable del Id-Token.
 *
 * No construye todavía CIDID: describe qué es la identidad Ciudadan, cómo se
 * vincula con el usuario del ecosistema y qué verificaciones son FUTURAS.
 */
const Identidad = () => (
  <TokenPlaceholderPage
    titulo="Identidad Ciudadan (Id-Token)"
    chip="En desarrollo"
    subtitulo="Tu identidad digital dentro del ecosistema Ciudadan y la base para vincular tu participación, reputación, habilidades y actividad."
    bloques={[
      {
        titulo: 'Identidad Ciudadan',
        texto:
          'Cada persona que participa en Ciudadan tiene una identidad dentro de la plataforma: la cuenta con la que se autentica y que queda asociada a su actividad, sus tareas, sus evaluaciones y sus tokens.',
      },
      {
        titulo: 'Vínculo con tu cuenta',
        texto:
          'Hoy esa identidad se apoya en el inicio de sesión que ya usas (Auth0) y en tu perfil dentro de Ciudadan. TodoToken, Evaluation-Token y Skill-Token se resuelven siempre a partir de esa identidad y no de datos que se envíen desde el navegador.',
      },
      {
        titulo: 'Verificaciones y credenciales (futuro)',
        texto:
          'El Id-Token está pensado para agrupar verificaciones posteriores —como la validación de áreas y documentos que ya existe en CoWork— y credenciales que acrediten hechos comprobables de tu trayectoria.',
      },
      {
        titulo: 'Relación con actividad y reputación',
        texto:
          'La intención es que identidad, actividad y reputación estén conectadas: que tus tareas completadas, tus evaluaciones y tus habilidades verificadas sean legibles como parte de una misma historia verificable.',
      },
    ]}
    notaEstado="Estado actual: esta sección es informativa y navegable. No hay todavía emisión de credenciales ni verificación digital de identidad desde aquí; esas capacidades se encuentran en desarrollo."
  />
);

export default Identidad;
