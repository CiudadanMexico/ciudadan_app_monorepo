import React from 'react';
import { Modal, Box, Typography, Button, IconButton } from '@mui/material';
//import CloseIcon from '@mui/icons-material/Close';

const TermsModal = ({ modalOpen, setModalOpen }) => {
  return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80%",
          maxWidth: "900px",
          bgcolor: "white",
          boxShadow: 24,
          p: 4,
          borderRadius: "10px",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Tachecito rojo para cerrar */}
        <IconButton
            onClick={() => setModalOpen(false)}
            sx={{
                position: "absolute",
                top: 10,
                right: 10,
                bgcolor: "red",
                color: "white",
                width: 33,
                height: 33,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                '&:hover': {
                bgcolor: "darkred",
                },
            }}
            >
            <span className="material-icons">close</span>
        </IconButton>


        <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
          Términos y Condiciones
        </Typography>

        <Typography variant="h7" sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <b>Última actualización:</b> 16 de febrero de 2025.
        </Typography>


        {/* Contenido completo */}
        <Typography><center><b>I. DEFINICIONES</b><br />
</center><b>Aplicación:</b> Plataforma digital móvil denominada “Ciudadan Taxi”, que coordina la comunicación para la solicitud de viajes y ofrece servicios complementarios (marketplace, delivery, academia, comunidad, entre otros), utilizando además su propia criptomoneda en su ecosistema.<br />
<b>Usuario:</b> Persona física que se registra y utiliza la Aplicación en calidad de pasajero.<br />
<b>Taxista:</b> Conductor autorizado y concesionado por la Ciudad de México, quien ofrece sus servicios a través de la Aplicación.<br />
<b>Ciudadan:</b> Asociación Civil responsable de la operación, verificación y supervisión de la Aplicación, así como de la coordinación entre usuarios y taxistas.<br />
<b>Servicios Complementarios:</b> Funciones adicionales de la Aplicación, tales como delivery, marketplace, academia y otros, que podrán tener condiciones específicas adicionales.<br />
<b>Criptomoneda:</b> Moneda digital propia del ecosistema de la Aplicación, empleada en diversas transacciones internas.<br /><br />

<center><b>II. OBJETO Y ALCANCE DEL SERVICIO</b><br /></center>
<b>Coordinación de Servicios:</b> La Aplicación tiene como finalidad coordinar la comunicación entre Usuarios pasajeros y taxistas concesionados para la solicitud y organización de viajes, sin que se establezca una relación directa de prestación del servicio de transporte por parte de Ciudadan.<br />
<b>Servicios Adicionales:</b> Además del servicio de coordinación de viajes, la Aplicación ofrece otros servicios complementarios (delivery, marketplace, academia, comunidad, etc.), los cuales podrán regirse por condiciones específicas adicionales.<br />
<b>Rol de Ciudadan:</b> El vínculo contractual se establece entre el Usuario y Ciudadan, Asociación Civil, entidad que actúa como intermediaria, responsable de la verificación de la documentación y credenciales de taxistas y usuarios, y que facilita el acceso a un entorno seguro y de confianza.<br /><br />

<center><b>III. REGISTRO Y VERIFICACIÓN</b><br /></center>
<b>Registro Obligatorio:</b> Para utilizar la Aplicación, es imprescindible completar el proceso de registro proporcionando información veraz, completa y actualizada.<br />
<b>Proceso de Verificación:</b><br />
<b>Usuarios:</b> El Usuario deberá someterse a un proceso de verificación de identidad que podrá incluir la presentación de documentos oficiales, así como apresentación de documentos oficiales, así como a proporcionar un número telefónico único y verificable, asegurando que no esté en uso por otra persona dentro de la plataforma.<br />
<b>Taxistas:</b> Los taxistas deben acreditar la posesión de una concesión vigente de la Ciudad de México, su tarjetón de identificación, licencia tipo B o E, y tarjeta de circulación actualizada. Además, deberán completar el proceso de verificación en la Aplicación para confirmar la autenticidad de sus documentos antes de poder ofrecer sus servicios.<br />

<b>Responsabilidad de la Información:</b> El ingreso de datos falsos, duplicados o inexactos será causal de suspensión o cancelación inmediata de la cuenta, sin derecho a reembolso ni indemnización.<br /><br />

<center><b>IV. OBLIGACIONES Y RESPONSABILIDADES DEL USUARIO</b><br /></center>
<b>A. Uso Responsable</b><br />
El Usuario se compromete a:<br />
- Utilizar la Aplicación de manera responsable y respetuosa con otros miembros de la comunidad.<br />
- Reportar de forma inmediata cualquier actividad sospechosa o irregular que comprometa la seguridad de la plataforma.<br /><br />

<b>B. Conductas y Actividades Prohibidas</b><br />
Con el fin de mantener un entorno seguro y confiable, queda terminantemente prohibido que el Usuario:<br />
<b>Manipulación de Información:</b> Ingresar datos falsos, inexactos, duplicados o alterar deliberadamente la información requerida durante el registro o en el uso continuo de la Aplicación.<br />
<b>Conducta Fraudulenta y Engañosa:</b> Realizar actividades que impliquen fraude, suplantación de identidad o manipulación del sistema.<br />
<b>Uso de Lenguaje Ofensivo y Comportamientos Abusivos:</b> Utilizar lenguaje insultante, difamatorio, discriminatorio o que incite al odio, al acoso o a la violencia contra cualquier persona o grupo.<br />
<b>Incitación a Conductas Delictivas:</b> Promover, incitar o ejecutar actos que atenten contra la seguridad pública, incluyendo actividades violentas o delictivas.<br />
<b>Portación y Uso de Armas u Objetos Peligrosos:</b> Portar, utilizar o promover el uso de armas de cualquier tipo, municiones o cualquier objeto que pueda considerarse peligroso y que ponga en riesgo la integridad física de otros usuarios o terceros.<br />
<b>Actividades Ilícitas o Peligrosas:</b> Promover o participar en actividades ilícitas, incluyendo, pero no limitándose a, la distribución de sustancias prohibidas, el contrabando o cualquier actividad que vulnere las leyes mexicanas.<br />
<b>Otras Conductas Lesivas:</b> Cometer cualquier acción que pueda dañar el normal funcionamiento de la Aplicación, la seguridad de la comunidad o que, de cualquier forma, atente contra los principios de convivencia y respeto.<br /><br />

<center><b>V. USO DE LA APLICACIÓN Y DISPONIBILIDAD DEL SERVICIO</b><br /></center>
<b>Coordinación de Viajes:</b> La Aplicación permite al Usuario solicitar y coordinar viajes con taxistas concesionados, siempre verificando la disponibilidad en la zona solicitada.<br />
<b>Servicios Complementarios:</b> El acceso y uso de servicios adicionales se regirán por condiciones específicas que podrán consultarse en las secciones correspondientes de la Aplicación.<br />
<b>Mantenimiento y Actualizaciones:</b> Ciudadan se reserva el derecho de realizar mantenimientos, actualizaciones o modificaciones en la Aplicación que puedan afectar temporalmente su disponibilidad.<br /><br />

<center><b>VI. EXCLUSIÓN DE RESPONSABILIDAD</b><br /></center>
<b>Intermediación en el Servicio:</b> La Aplicación actúa únicamente como una herramienta vinculativa entre el Usuario y el Taxista. La relación contractual para la prestación del servicio de transporte se establece de manera directa entre el Usuario y el Taxista.<br />
<b>Actos de Terceros:</b> Ciudadan no se hace responsable por la calidad, seguridad o puntualidad del servicio prestado por los taxistas, ni por las actividades de terceros vinculados a los servicios complementarios.<br />
<b>Fuerza Mayor:</b> Ciudadan no será responsable por interrupciones o fallos en el servicio ocasionados por causas de fuerza mayor o situaciones fuera de su control.<br /><br />

<center><b>VII. POLÍTICAS DE SEGURIDAD Y VERIFICACIÓN CONTINUA</b><br /></center>
<b>Compromiso con la Seguridad:</b> Ciudadan se compromete a mantener altos estándares de verificación y seguridad para proteger la integridad de la comunidad. Tanto usuarios como taxistas serán sujetos a procesos de validación periódica.<br />
<b>Medidas Preventivas:</b> Se implementarán mecanismos de monitoreo y reporte para detectar y prevenir conductas fraudulentas o peligrosas.<br />
<b>Colaboración con Autoridades:</b> Ciudadan colaborará con las autoridades cuando resulte necesario y conforme a la legislación aplicable, siempre procurando preservar la privacidad y los principios fundamentales de nuestra comunidad. Cumplimos estrictamente con las normativas de protección de datos personales, asegurando que cualquier colaboración con autoridades se realice de manera transparente y respetuosa con los derechos de nuestros usuarios.<br /><br />


<center><b>VIII. PROPIEDAD INTELECTUAL, LICENCIA OPEN SOURCE Y COPYLEFT</b><br /></center>
<b>Licencia Open Source:</b> La Aplicación, su diseño, código y contenidos se encuentran disponibles bajo una licencia Open Source y CopyLeft, con una cláusula de no uso comercial. Esto implica la libre distribución, modificación y reutilización de los mismos, siempre que se respeten las atribuciones correspondientes, no se utilicen con fines comerciales y se compartan bajo términos similares.<br /><br />

<center><b>IX. MODIFICACIONES A LOS TÉRMINOS</b><br /></center>
<b>Actualización:</b> Ciudadan se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones serán publicadas en la Aplicación y, en su caso, notificadas a los usuarios.<br /><br />

<center><b>X. TERMINACIÓN DEL SERVICIO</b><br /></center>
<b>Causales de Terminación:</b> Ciudadan podrá suspender o cancelar la cuenta del Usuario en caso de:<br />
- Ingreso de datos falsos o inexactos durante el registro.<br />
- Incurrir en conductas fraudulentas o en cualquiera de las actividades prohibidas detalladas en estos Términos.<br />
- Realizar acciones que pongan en riesgo la seguridad y el normal funcionamiento de la Aplicación.<br /><br />

<center><b>XI. LEGISLACIÓN APLICABLE Y JURISDICCIÓN</b><br />
Estos Términos se regirán e interpretarán conforme a la legislación vigente en los Estados Unidos Mexicanos, en particular, las leyes aplicables en la Ciudad de México. Cualquier conflicto que surja en relación con el uso de la Aplicación o la interpretación de estos Términos será resuelto de acuerdo con la normativa mexicana, y las partes se someten de manera expresa a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.<br /><br /></center>


<center><b>XII. DISPOSICIONES FINALES</b><br /></center>
Para cualquier duda, comentario o solicitud relacionada con estos Términos, el Usuario puede comunicarse a través del correo electrónico <a href="mailto:soporte@ciudadan.org">[soporte@ciudadan.org]</a> o mediante la sección de “Ayuda” en la Aplicación.<br /><br />
    <center>
        <b>¡Bienvenido a Ciudadan Taxi y gracias por formar parte de nuestra comunidad Open Source!</b>
    </center>
</Typography>


        {/* Botón Cerrar */}
        <Button 
          onClick={() => setModalOpen(false)} 
          sx={{ mt: 3, display: "block", mx: "auto", bgcolor: "gray", color: "white", '&:hover': { bgcolor: "darkred" } }}>
          Cerrar
        </Button>

      </Box>
    </Modal>
  );
};

export default TermsModal;
