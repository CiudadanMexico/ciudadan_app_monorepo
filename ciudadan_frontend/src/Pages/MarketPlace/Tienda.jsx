import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRoles } from '../../Contexts/RolesContext';
import StoreImagePlaceholder from '../../assets/agencia.png';
import AgregarProducto from './AgregarProducto';
import PreguntasProducto from '../../components/MarketPlace/PreguntasProducto';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import MisProductos from './MisProductos';
import PedidosPendientes from './PedidosPendientes';
import PedidosEntregados from './PedidosEntregados';
import PagosTienda from './PagosTienda';
import ConfiguracionTienda from './ConfiguracionTienda';
import ActivaTuMembresia from '../../components/Membresias/ActivaTuMembresia';

const Tienda = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth0();
  const { isActivaMembresia} = useRoles();
  console.log('🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔽🔽🔽 tienda es activa membresia', isActivaMembresia);
  

  const [tabIndex, setTabIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [storeImageURL, setStoreImageURL] = useState(null);
  const [productos, setProductos] = useState([]);

  const tabs = [
    { label: 'Pedidos a entregar', path: '' },
    { label: 'Entregados', path: 'entregados' },
    { label: 'Productos', path: 'productos' },
    { label: 'Agregar producto', path: 'agregar-producto' },
    { label: 'Preguntas', path: 'preguntas-producto' },
    { label: 'Pagos', path: 'pagos' },
    { label: 'Configuración', path: 'configuracion' }
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/agregar')) setTabIndex(3);
    else if (path.includes('/productos')) setTabIndex(2);
    else if (path.includes('/entregados')) setTabIndex(1);
    else if (path.includes('/preguntas')) setTabIndex(4);
    else if (path.includes('/pagos')) setTabIndex(5);
    else if (path.includes('/configuracion')) setTabIndex(6);
    else setTabIndex(0);
  }, [location.pathname]);

  const handleTabClick = (index, path) => {
    setTabIndex(index);
    const basePath = `/market/store/${slug}`;
    const newPath = path ? `${basePath}/${path}` : basePath;
    navigate(newPath);
  };

  useEffect(() => {
    if (!slug) return;

    const fetchStoreData = async () => {
      try {
        const baseUrl = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '');
        const res = await axios.get(`${baseUrl}/api/stores?filters[slug][$eq]=${slug}&populate=imagen`);
        console.log('📦 Respuesta de tienda:', res.data);

        const tienda = res.data.data[0];
        const imagen = tienda?.attributes?.imagen?.data?.attributes?.url;

        if (imagen) {
          const fullURL = `${baseUrl}${imagen}`;
          console.log('📷 Imagen encontrada:', fullURL);
          setStoreImageURL(fullURL);
        }
      } catch (error) {
        console.error('❌ Error al traer datos de la tienda:', error);
      }
    };

    fetchStoreData();
  }, [slug]);

  useEffect(() => {
    if (!user?.email) return;

    const fetchProductos = async () => {
      try {
        const baseUrl = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '');
        const url = `${baseUrl}/api/productos?populate=*&filters[store_email][$eq]=${user.email}`;
        console.log('🔎 URL de productos por email:', url);

        const res = await axios.get(url);
        console.log('🛒 Productos encontrados:', res.data);
        setProductos(res.data.data || []);
      } catch (error) {
        console.error('❌ Error al cargar productos:', error);
      }
    };

    fetchProductos();
  }, [user]);

  if (isLoading) return <p>Cargando...</p>;

  // ---------- RETORNO TEMPRANO: si la membresía está presente y NO está activa,
  // devolvemos SOLO el componente de activación y NO renderizamos nada más ----------
  if (!isActivaMembresia()) {
    //return <ActivaTuMembresia />;
  }
  // -------------------------------------------------------------------------------

  const filtros = 'mios';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        padding: '24px',
        gap: '32px',
        flexWrap: 'wrap'
      }}
    >
      {/* Columna izquierda */}
      <div style={{ flex: '0 0 30%', textAlign: 'center' }}>
        <img
          src={storeImageURL || StoreImagePlaceholder}
          alt="Tienda"
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '16px',
            boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
            objectFit: 'cover'
          }}
        />
        <h1 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '2rem', fontWeight: 'bold' }}>
          {slug}
        </h1>
        <p>Productos: <strong>{productos.length}</strong> &nbsp;&nbsp; Ventas: <strong>700</strong></p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '8px' }}>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star_half</i>
          <i className="material-icons" style={{ color: '#ccc' }}>star_border</i>
          <span style={{ marginLeft: '8px' }}>325 calificaciones</span>
        </div>
        <p style={{ marginTop: '8px' }}>201 reseñas</p>
        <p>Usuario Auth0: {user.email}</p>
      </div>

      {/* Columna derecha */}
      <div style={{ flex: '1 1 65%' }}>
        <div
          style={{
            borderBottom: '1px solid #ccc',
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px'
          }}
        >
          {tabs.map(({ label, path }, index) => (
            <button
              key={label}
              onClick={() => handleTabClick(index, path)}
              className={`tab-button ${tabIndex === index ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          {tabIndex === 0 && <PedidosPendientes />}
          {tabIndex === 1 && <PedidosEntregados />}
          {tabIndex === 2 && <MisProductos filtros={filtros} />}
          {tabIndex === 3 && <AgregarProducto />}
          {tabIndex === 4 && <PreguntasProducto />}
          {tabIndex === 5 && <PagosTienda />}
          {tabIndex === 6 && <ConfiguracionTienda />}
        </div>
      </div>
    </div>
  );
};

export default Tienda;
