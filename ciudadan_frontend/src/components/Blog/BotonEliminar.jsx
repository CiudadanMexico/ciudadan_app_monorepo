import React from 'react';
import { Button } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

const BotonEliminar = ({ handleDelete, autor_email }) => {
  const { isAuthenticated, isLoading, user } = useAuth0();

  if (isLoading) return null; // opcional: puedes usar un spinner si prefieres

  //if (!isAuthenticated || !user || user.email !== autor_email) return <></>;

  return (
    <Button 
      onClick={handleDelete} 
      variant="outlined" 
      size="small" 
      sx={{ display: 'flex', alignItems: 'center' }}
    >
      <span className="material-icons" style={{ marginRight: 4 }}>delete</span>
      Eliminar
    </Button>
  );
};

export default BotonEliminar;
