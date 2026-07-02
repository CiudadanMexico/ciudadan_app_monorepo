import React from 'react';
import { Button } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

const BotonEditar = ({ handleEdit, autor_email }) => {
  const { isAuthenticated, isLoading, user } = useAuth0();

  if (isLoading) return null; // opcional: puedes usar un spinner si prefieres

  if (!isAuthenticated || !user || user.email !== autor_email) return <></>;

  return (
    <Button 
      onClick={handleEdit} 
      variant="outlined" 
      size="small" 
      sx={{ display: 'flex', alignItems: 'center' }}
    >
      <span className="material-icons" style={{ marginRight: 4 }}>edit</span>
      Editar
    </Button>
  );
};

export default BotonEditar;
