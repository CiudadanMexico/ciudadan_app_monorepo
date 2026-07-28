import React from 'react';
import { Modal, Box, Typography, Button, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const RequisitosConductor = ({ modalOpen, setModalOpen }) => {
  const navigate = useNavigate();

  if (!modalOpen) return null;

  const handleContinuar = () => {
    setModalOpen(false);
    navigate('/taxis/preregistrar');
  };

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
            '&:hover': { bgcolor: "darkred" },
          }}
        >
          <span className="material-icons">close</span>
        </IconButton>

        <Typography
          variant="h4"
          sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}
        >
          Requisitos para Conductores
        </Typography>

        <Typography sx={{ mb: 2 }}>
          <b>Ciudadan Taxi está abierto para distintos tipos de conductores</b>, siempre que cumplan con un proceso básico de verificación para mantener la seguridad de los pasajeros y la legalidad del servicio.
        </Typography>

        <Typography sx={{ mb: 1 }}>
          <b>Documentos y requisitos generales:</b>
        </Typography>

        <ul>
          <li>Identificación oficial vigente.</li>
          <li>Licencia de conducir vigente.</li>
          <li>Datos de contacto actualizados.</li>
          <li>Vehículo en condiciones adecuadas de operación y presentación.</li>
        </ul>

        <Typography sx={{ mt: 2, mb: 1 }}>
          <b>Según tu tipo de actividad, también te pediremos:</b>
        </Typography>

        <ul>
          <li>Documentación del vehículo vigente.</li>
          <li>Información que permita verificar tu relación con la unidad que vas a operar.</li>
          <li>Validación interna de tu perfil antes de activarlo.</li>
        </ul>

        <Typography sx={{ mt: 2 }}>
          <b>Proceso de verificación:</b>
        </Typography>

        <ul>
          <li>Completa tu preregistro en la plataforma.</li>
          <li>Sube tus documentos para revisión.</li>
          <li>Espera la validación antes de comenzar a recibir solicitudes.</li>
        </ul>

        <Typography sx={{ mt: 2 }}>
          <b>Importante:</b> Si la información no coincide o algún documento resulta inválido, tu registro podrá ser rechazado o suspendido.
        </Typography>

        <Button
          onClick={handleContinuar}
          sx={{
            mt: 3,
            display: "block",
            mx: "auto",
            bgcolor: "#fff200",
            color: "black",
            fontWeight: "bold",
            '&:hover': { bgcolor: "#e6d800" }
          }}
        >
          Continuar
        </Button>
      </Box>
    </Modal>
  );
};

export default RequisitosConductor;