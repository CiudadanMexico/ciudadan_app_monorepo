// src/components/CategoriaCard.jsx
import { Typography, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import './CategoriaCard.css';

const CategoriaCard = ({
  nombre,
  imagen,
  slug,
  clasifica,
  forma = 'circle'   // <-- nueva prop con valor por defecto
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (clasifica === 'contenidos' && slug) {
      navigate(`/contenidos/categoria/${slug}`);
    } else if (clasifica === 'cursos' && slug){
      navigate(`/cursos/categoria/${slug}`);
    }
    
    else if (slug) {
      navigate(`/productos/categoria/${slug}`);
    }
  };

  // Definimos los clips
  const hexClip = 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)';

  // Generamos styles condicionales
  const areaSx =
    forma === 'hexagono'
      ? { overflow: 'hidden', clipPath: hexClip, borderRadius: 0 }
      : forma === 'cuadrado'
      ? { overflow: 'hidden', borderRadius: 0 }
      : {}; // circle: no overrides aquí

  const imgStyle =
    forma === 'hexagono'
      ? { clipPath: hexClip, borderRadius: 0 }
      : forma === 'cuadrado'
      ? { borderRadius: 0 }
      : {}; // circle: usa CSS por defecto (puede venir de .categoria-card-img)

  return (
    <div className="categoria-card-container">
      <CardActionArea
        onClick={handleClick}
        className="categoria-card-action"
        sx={areaSx}
      >
        <img
          src={imagen}
          alt={nombre}
          className="categoria-card-img"
          style={imgStyle}
        />
        <div className="categoria-card-overlay">
          <Typography
            variant="subtitle2"
            sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}
          >
            {nombre}
          </Typography>
        </div>
      </CardActionArea>
    </div>
  );
};

export default CategoriaCard;
