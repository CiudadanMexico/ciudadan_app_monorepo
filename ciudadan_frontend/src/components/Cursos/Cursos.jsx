import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react'; // 🔴 NUEVO
import EliminarCurso from '../../Pages/Cursos/EliminarCurso.jsx';
import PreCargador from '../../components/PreCargador.jsx';
import {
  Box,
  Grid,
  Container,
  Typography,
  Button,
  TextField,
  Fade,
  Slide,
  useMediaQuery,
  useTheme,
  Stack,
  Pagination,
  CircularProgress,
} from '@mui/material';
import CategoriasSlider from '../MarketPlace/CategoriasSlider';
import { useCategorias } from '../../hooks/useCategorias';
import { useCursos } from '../../hooks/useCursos';
import CursoCard from '../Cursos/CursoCard';
import CursoDetalle from '../../Pages/Cursos/Curso'; 
import CursosImpartidos from '../../components/Cursos/CursosImpartidos.jsx';
import '../../styles/Contenidos.css';
import { useRoles } from '../../Contexts/RolesContext';
import Pestanas from '../../components/Pestanas';

const Cursos = ({ filtros, parametros }) => {

  const { user, isAuthenticated } = useAuth0(); // 🔴 NUEVO

  const barra = filtros === 'mis-cursos';

  const tabs = [
    { label: 'Cursos que Impartes', path: 'impartidos' },
    { label: 'Cursos que Tomas', path: '' },
  ];

  const { isEditor } = useRoles();

  if (filtros === 'busqueda') {
    var titulo = "Resultados de Búsqueda  «" + (parametros.charAt(0).toUpperCase() + parametros.slice(1)) + "»: ";
  }
  else if (filtros === 'categoria'){
    var titulo = "Cursos en Categoría  «" + (parametros.charAt(0).toUpperCase() + parametros.slice(1)) + "»: ";
    var mostrarCategorias = false;
  }
  else if (filtros === 'mis-cursos'){
    var titulo ="»» Tus Cursos ««:";
    var mostrarCategorias = false;
  }
  else {
    var titulo = '';
    var mostrarCategorias = true;
  }

  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const clasifica = "cursos";
  const { getCategorias } = useCategorias('categorias-cursos');
  const {
    cursos,
    loading,
    error,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    fetchCursos,
    totalItems,
  } = useCursos();

  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [visible, setVisible] = useState({});
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const location = useLocation();
  const [tabIndex, setTabIndex] = useState(0);

  const basePrueba = '/cursos/mis-cursos';

  // 🔴 NUEVO: cursos del usuario
  const [misCursos, setMisCursos] = useState([]);
  const [loadingMisCursos, setLoadingMisCursos] = useState(false);

  
  useEffect(() => {
    window.scrollTo({ top: 80, behavior: 'smooth' });
  }, [pagina, porPagina]);

  
  // ===============================
  // NUEVO useEffect (NO TOCA LOS OTROS)
  // ===============================
  useEffect(() => {
    if (filtros !== 'mis-cursos') return;
    if (!isAuthenticated || !user?.email) return;

    const fetchMisCursos = async () => {
      try {
        setLoadingMisCursos(true);

        const res = await fetch(
          `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(
            user.email
          )}&populate[cursos][populate]=portada`
        );

        const data = await res.json();
        const usuario = data?.[0];
        console.log('cursos miscursos set');
        console.log('cursos miscursos set', data[0]);
        setMisCursos(usuario?.cursos || []);
      } catch (e) {
        console.error('Error cargando cursos del usuario', e);
        setMisCursos([]);
      } finally {
        setLoadingMisCursos(false);
      }
    };
    console.log('cursos fetch de mis cursos');

    fetchMisCursos();
  }, [filtros, isAuthenticated, user?.email]);
  // ===============================

  // sincroniza tabIndex con la URL (TU CÓDIGO INTACTO)
  useEffect(() => {
    const path = (location.pathname || '').toLowerCase();
    if (path.endsWith('/mis-cursos')) {
      setTabIndex(0);
    } else if (path.includes('/impartidos')) {
      setTabIndex(0);
    } else {
      setTabIndex(1);
    }
    setPagina(1);
  }, [location.pathname]);

  //Trae las categorías
  useEffect(() => {
    (async () => {
      const cats = await getCategorias();
      setCategorias(cats);
    })();
  }, []);

  //Trae los cursos
  useEffect(() => {
    if(tabIndex !== 0){
      fetchCursos();
    }
  }, [pagina, porPagina, filtros, parametros, tabIndex]);

  const filtered = (cursos || []).filter((item) => {
    const data = item.attributes ?? item;
    if (!filtros) return true;

    if (filtros === 'mis-cursos' && tabIndex === 0) {
      console.log('cursos impartidos entrando');
      const usuarioSlug = (parametros ?? '')
        .toLowerCase()
        .split('@')[0];

      const maestroUsername =
        data.maestro?.data?.attributes?.username ??
        data.maestro?.username ??
        null;

      return maestroUsername === usuarioSlug;
    }

    if (filtros === 'categoria') {
      let catSlug;
      if (data.categoria?.data?.attributes?.slug) {
        catSlug = data.categoria.data.attributes.slug;
      } else if (data.categoria?.slug) {
        catSlug = data.categoria.slug;
      }
      return catSlug === parametros;
    }

    if (filtros === 'busqueda') {
      const term = parametros?.toLowerCase() || '';
      const titulo = (data.titulo ?? data.nombre ?? '').toLowerCase();
      const tagsSource = data.tags?.data ?? data.tags;
      const tagsArr = Array.isArray(tagsSource)
        ? tagsSource.map((t) => (t.attributes?.nombre ?? t.slug ?? t).toLowerCase())
        : [];
      return titulo.includes(term) || tagsArr.some((t) => t.includes(term));
    }

    return true;
  });

  console.log('cursos torender', misCursos);


  const normalizarMisCursos = (cursos = []) =>
  cursos.map((c) => ({
    id: c.id,
    attributes: {
      ...c,
      portada: c.portada ?? null,
      categoria: c.categoria ?? null,
    },
  }));

  const misCursosNormalizados = normalizarMisCursos(misCursos);

  // totalItems final según la vista: si es mis-cursos usamos los cursos del usuario
  const totalItemsFinal = filtros === 'mis-cursos' && tabIndex === 0
    ? misCursosNormalizados.length
    : totalItems || 0;

  


  // 🔴 ÚNICO CAMBIO REAL DE LÓGICA
  const toRender =
    filtros === 'mis-cursos'
      ? misCursosNormalizados
      : !filtros
      ? [...filtered].sort((a, b) => {
          const da = (a.attributes ?? a).fecha_publicacion;
          const db = (b.attributes ?? b).fecha_publicacion;
          return new Date(db) - new Date(da);
        })
      : filtered;

      console.log('cursos después de filtrado', cursos);
      console.log('cursos después de filtrado individual', cursos[0]);
      console.log('cursos después de filtrado', misCursosNormalizados);
      console.log('cursos fin cursos despues de filtrados');

  useEffect(() => {
    setVisible({});
  }, [pagina]);
      
  const observer = useRef();
  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = e.target.getAttribute('data-id');
            setVisible((v) => ({ ...v, [id]: true }));
            observer.current.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    document.querySelectorAll('.curso-card').forEach((c) => observer.current.observe(c));
    return () => observer.current.disconnect();
  }, [toRender.length, pagina]);

  const paginar =
  filtros === 'mis-cursos' && tabIndex === 0
    ? totalItemsFinal > porPagina || pagina > 1
    : totalItemsFinal > porPagina || pagina > 1;

  const handleMis = () => navigate('/cursos/mis-cursos');
  const handleAgregar = () => navigate('/cursos/agregar-curso');  
  const handleBuscar = () => {
    const slug = busqueda.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug ) return;
    navigate(`/cursos/busqueda/${slug}`);
  };


  const esVistaCursosTomados =
  !isEditor() || tabIndex === 1 || tabIndex == null;

  return (
  <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
    
    {/* Columna principal */}
          <div style={{ flex: '1 1 100%' }}>
            {isEditor() && barra === true && (
              <>
                <Pestanas
                  tabs={tabs}
                  basePath={basePrueba}
                  onTabChange={(index) => setTabIndex(index)}
                  collapseAt={640}
                  backgroundColor="linear-gradient(90deg, #0b2e2a 0%, #0f4c4a 50%, #0b2e2a 100%)"
                />
        
                
              </>
            )}
          </div>
    

    {/* Search & Controls */}
    {esVistaCursosTomados && (!filtros || filtros !== 'mis-cursos') && (
    <Slide direction="down" in timeout={400}>
<Box
  sx={{
    mb: 3,
    backgroundColor: '#fff',
    p: 2,
    borderRadius: 3,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  }}
>
  <Stack
    direction="row"
    spacing={1}
    alignItems="center"
    justifyContent="space-between"
    sx={{
      width: '100%',
      flexWrap: { xs: 'wrap', md: 'nowrap' },
      rowGap: { xs: 1, md: 0 },
    }}
  >
    {/* Buscar */}
    <TextField
      variant="outlined"
      size="small"
      placeholder="Buscar cursos..."
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setBusqueda(e.target.value);
          handleBuscar();
        }
      }}
      sx={{
        flexGrow: 1,
        minWidth: 0,
        backgroundColor: '#f9f9f9',
        borderRadius: 2,
        '& input': {
          fontSize: { xs: '0.9rem', md: '1rem' },
          padding: { xs: '8px', md: '10px' },
        },
      }}
    />

    <Button
      onClick={handleBuscar}
      variant="contained"
      size="small"
      sx={{
        flexShrink: 0,
        minWidth: 40,
        height: 40,
        padding: 0,
        backgroundColor: '#000',
        color: '#fff200',
        borderRadius: 2,
        '&:hover': {
          backgroundColor: '#222',
          transform: 'scale(1.05)',
        },
      }}
    >
      <span className="material-icons">search</span>
    </Button>

    {/* Botones de editor */}
    {isAuthenticated && (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexShrink: 0,
          width: { xs: '100%', md: 'auto' },
          justifyContent: { xs: 'flex-start', md: 'flex-end' },
        }}
      >
        <Button
          onClick={handleMis}
          variant="outlined"
          size="small"
          sx={{
            color: '#000',
            borderColor: '#000',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#f0f0f0',
              transform: 'scale(1.03)',
            },
          }}
          startIcon={<span className="material-icons">article</span>}
        >
          Mis cursos
        </Button>

        {isEditor() && (
          <Button
            onClick={handleAgregar}
            variant="contained"
            size="small"
            sx={{
              backgroundColor: '#fff200',
              color: '#000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#e6d900',
                transform: 'scale(1.05)',
              },
            }}
            startIcon={<span className="material-icons">add_circle</span>}
          >
            Crear
          </Button>
        )}
      </Stack>
    )}
  </Stack>
</Box>

    </Slide>

    )}

    
                  {tabIndex === 0 && <CursosImpartidos cursos={cursos} /> }
    
                

    {esVistaCursosTomados  && (
      <>
    <Box mt={5}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        <u className="cursos-titulo">{ titulo }</u>
      </Typography>
      {categorias.length > 0 && (
        <Fade in timeout={400}>
          <Box>
            {mostrarCategorias === true && (
              <>
                <Typography variant="h6" align="center" fontWeight={700} sx={{ mb: 2 }}>
                  <u className="cursos-titulo">Categorías</u>
                </Typography>

                <CategoriasSlider
                  forma={'cuadrado'}
                  categorias={Array.isArray(categorias)
                    ? categorias.map((c) => ({
                        nombre: c.attributes.nombre,
                        slug: c.attributes.slug,
                        imagen: `${STRAPI_URL}${c.attributes.imagen?.data?.attributes?.url}`,
                      }))
                    : []}
                  clasifica={'cursos'}
                />
                <Typography variant="h6" align="center" fontWeight={700} sx={{ mb: 2 }}>
                  <u className="cursos-titulo">Cursos Recientes:...</u>
                </Typography>
              </>
            )}

            {mostrarCategorias !== true && (
              <Fade in timeout={400}>
                <Box
                  onClick={() => navigate('/cursos')}
                  sx={{
                    backgroundColor: '#e6f4ea',
                    borderRadius: 1,
                    px: 1.5,
                    py: 0.5,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'green',
                    fontSize: '0.875rem',
                    boxShadow: '0px 2px 6px rgba(0,0,0,0.08)',
                    marginTop: '-20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: '#d0ebdc',
                      textDecoration: 'underline',
                      transform: 'scale(1.02)',
                    },
                  }}
                >
                  « Volver a Directorio de Cursos
                </Box>
              </Fade>
            )}

          </Box>
        </Fade>
      )}
      </Box>
      </>
    )}


      {filtros === 'editar' ? (
        <CursoDetalle slug={parametros} />
      ) : filtros === 'eliminar' ? (
        <EliminarCurso slug={parametros} />
      ) : (
        <Grid container spacing={2}>
          {loading && (
            <Grid item xs={12}>
              
                
                  <PreCargador text="Cargando Cursos..."></PreCargador> 
               
            </Grid>
          )}

          {error && (
            <Grid item xs={12}>
              <Typography color="error" align="center">
                Error al cargar cursos
              </Typography>
            </Grid>
          )}
          {!loading && toRender.length === 0 && (
            <Grid item xs={12}>
              <Typography align="center">No hay cursos aún.</Typography>
            </Grid>
          )}



{toRender.map((item, i) => {
  const source = item.attributes ?? item;

  console.group('🟥 RENDER CURSO');
  console.log('filtro:', filtros);
  console.log('item completo:', item);
  console.log('source:', source);
  console.log('source.portada:', source.portada.url);
  console.log('source.portada?.data:', source.portada?.data);
  console.log(
    'source.portada?.data?.attributes?.url:',
    source.portada?.data?.attributes?.url
  );
  console.log('source.portada (string?):', typeof source.portada);
  console.groupEnd();

const rawPortada =
  source.portada?.data?.attributes?.url ??
  source.portada?.url ??
  source.portada ??
  null;

const portada =
  typeof rawPortada === 'string'
    ? rawPortada.startsWith('http')
      ? rawPortada
      : `${STRAPI_URL}${rawPortada}`
    : null;

  const { categoria, ...rest } = source;
  const data = { ...rest, portada };
  const categoriaNombre = categoria?.nombre || null;
  const isVis = visible[item.id];

  return (
    <Grid
      key={item.id}
      item
      xs={12}
      sm={6}
      md={4}
      data-id={item.id}
      className="curso-card"
    >
      <CursoCard {...data} categoria={categoriaNombre} id={item.id} />
    </Grid>
  );
})}
</Grid>
      )}

      {/* Paginación */}
      {!loading  && (
        <Grid container spacing={2} sx={{ mt: 3, justifyContent: 'center', alignItems: 'center' }}>
          <Pagination
            count={Math.ceil(totalItemsFinal / porPagina)}
            page={pagina}
            onChange={(_, v) => setPagina(v)}
          />
          <TextField
            select
            value={porPagina}
            onChange={(e) => setPorPagina(Number(e.target.value))}
            SelectProps={{ native: true }}
            size="small"
            sx={{ width: 80, ml: 2 }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </TextField>
        </Grid>
      )}
    

  </Container>
);
};

export default Cursos;
