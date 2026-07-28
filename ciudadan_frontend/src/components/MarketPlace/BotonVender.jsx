import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStores } from '../../hooks/useStores';
import { useAuth0 } from '@auth0/auth0-react';

const BotonVender = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth0();
  const { getStoreByEmail } = useStores();
  const [checking, setChecking] = useState(false);

  const handleVender = async () => {
    if (!isAuthenticated || isLoading) return;

    setChecking(true);
    try {
      const stores = await getStoreByEmail(user.email);
      console.log('*** Obteniendo  stores');
      if (stores.length > 0 && stores[0].attributes.terminado) {
        const slug = stores[0].attributes.slug;
        navigate(`/market/store/${slug}`);
      } else {
        navigate('/registro-vendedor');
      }
    } catch (err) {
      console.error('Error al verificar tienda:', err);
      navigate('/registro-vendedor');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Button
                variant="contained"
                sx={{
                  background: 'linear-gradient(45deg, #aaffaa, #55dd55)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  fontWeight: 'bold',
                  borderRadius: 3,
                  textTransform: 'none',
                  height: '56px',
                  px: 4,
                  py: 1.5,
                  transition: '0.3s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    background: 'linear-gradient(45deg, #88ff88, #44cc44)'
                  }
                }}
                onClick={handleVender}
                disabled={false}
              >
                Vender
              </Button>
  );
};

export default BotonVender;
