// src/components/NavBar/NavBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
// No socket.io aquí (evitamos duplicados)
import {
  FaUniversity,
  FaDollarSign,
  FaWallet,
  FaCarSide,
  FaHamburger,
  FaStore,
  FaArrowDown,
  FaArrowUp,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa';
import { BsBriefcaseFill } from "react-icons/bs";
import { AiOutlineApartment } from "react-icons/ai";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import ShareIcon from '@mui/icons-material/Share';

import { registerUserInStrapi, findUserInStrapi } from '../../utils/strapiUserService';
import guestImage from '../../assets/guest.png';

import MenuIcon from './MenuIcon';
import NotificationsIcon from './NotificationsIcon.jsx';
import UserIcon from './UserIcon.jsx';
import NavButton from './NavButton.jsx';
import BotonCircular from './../Usuarios/BotonCircular.jsx';
import AIInput from './AIInput.jsx';
import Direccionador from '../../utils/Direccionador.jsx';
import CiudadanBadge from '../CiudadanBadge.jsx';
import MenuTopBar from './MenuTopBar.jsx';
import HearthButton from './HearthButton.jsx';
import CartIcon from './CartIcon';
import ShareButton from '../ShareButton.jsx';

import '../../styles/NavBar.css';
import '../../styles/CuentaIcon.css';
import '../../styles/AccountMenu.css';

import { useNotifications } from '../../Contexts/NotificationsContext';

// ------------------------------
// NavBar: integra lógica (segundo componente) + buttons/counters (primer componente)
// - Sin sockets; usa contexto centralizado de notificaciones
// - Mantiene optimismo por tipo (para feedback inmediato)
// ------------------------------

const NavBar = ({ SetIsMenuOpen, siteSection }) => {
  // Menús y topbar
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isInfoMenuOpen, setIsInfoMenuOpen] = useState(false);
  const [topBarOpen, setTopBarOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const InfoRef = useRef(null);
  const topBarRef = useRef(null);

  // Auth
  const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const [isMenuOpen, setIsMenuOpen] = useState(SetIsMenuOpen || false);
  const navigate = useNavigate();

  const [lastRoute, setLastRoute] = useState(siteSection || '/');
  const [routeRepeat, setRouteRepeat] = useState(0);
  const [activeTab, setActiveTab] = useState('');
  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const location = useLocation();
  const isHomeOrInfo = location.pathname === '/' || location.pathname.startsWith('/info/');

  const [logoSrc, setLogoSrc] = useState("");

  // aseguramos que siteSection tenga la forma '/xxx'
  siteSection = siteSection ? ('/' + siteSection.replace(/^\//, '')) : '/';

  // Icon map (usamos los del primer componente: gana, cartera, taxis...)
  const iconMap = {
    gana: <FaDollarSign />,
    cartera: <FaWallet />,
    taxis: <FaCarSide />,
    comida: <FaHamburger />,
    market: <FaStore />,
    coowork: <BsBriefcaseFill />,
    academia: <FaUniversity />,
    comunidad: <AiOutlineApartment />
  };

  // Navegación (con re-visit repeat)
  const handleNavigation = (path) => {
    setActiveTab(path);
    if (path === lastRoute) {
      const newRepeat = routeRepeat + 1;
      setRouteRepeat(newRepeat);
      navigate(path, { state: { routeRepeat: newRepeat } });
      setIsMenuOpen(false);
    } else {
      setLastRoute(path);
      setRouteRepeat(0);
      navigate(path, { state: { routeRepeat: 0 } });
      setIsMenuOpen(false);
    }
  };

  // Actualiza activeTab cuando cambia la ruta
  useEffect(() => {
    setActiveTab(siteSection);
  }, [location.pathname, siteSection]);

  // Responsivo para logo y ajuste topBar
  useEffect(() => {
    const handleResize = () => {
      setLogoSrc(window.innerWidth < 490 ? "/logo193.png" : "/ciudadan_logo.png");
      if (topBarRef.current && topBarOpen) {
        topBarRef.current.style.maxHeight = topBarRef.current.scrollHeight + 'px';
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [topBarOpen]);

  const handleLinkClick = (path) => {
    handleNavigation(path);
    setIsMenuOpen(false);
  };

  const closeAllMenus = (except) => {
    if (except !== 'profile') setIsProfileMenuOpen(false);
    if (except !== 'notifications') setIsNotificationMenuOpen(false);
    if (except !== 'info') setIsInfoMenuOpen(false);
  };

  // Toggle topBar con animación de maxHeight
  const toggleTopBar = () => {
    setTopBarOpen(prev => {
      const next = !prev;
      if (topBarRef.current) {
        if (!next) {
          topBarRef.current.style.maxHeight = '0px';
        } else {
          topBarRef.current.style.maxHeight = '0px';
          // pequeño timeout para reflow y animación
          setTimeout(() => {
            if (topBarRef.current) topBarRef.current.style.maxHeight = topBarRef.current.scrollHeight + 'px';
          }, 20);
        }
      }
      return next;
    });
  };

  // Inicializa maxHeight en 0
  useEffect(() => {
    if (topBarRef.current && !topBarOpen) topBarRef.current.style.maxHeight = '0px';
  }, []);

  // --- Notifications: usamos el contexto centralizado (NO sockets aquí) ---
  // El contexto puede exponer distintas keys dependiendo de tu implementación.
  // Intentamos soportar ambos shapes: { unreadCount } y { notificationsNum, contadorNotificaciones, refreshNotificaciones }
  const notificationsContext = useNotifications();
  const {
    unreadCount,
    refreshNotificaciones,
    notificationsNum,
    contadorNotificaciones
  } = notificationsContext || {};

  // Optimistic UI para notificaciones (por tipo)
  const [optimisticUnread, setOptimisticUnread] = useState(0);
  const [optimisticByType, setOptimisticByType] = useState({});

  // Si notificationsNum es función la usamos para obtener el número real, si no usamos unreadCount
  const currentNotificationsNum = typeof notificationsNum === 'function'
    ? notificationsNum()
    : (Number(unreadCount || 0));

  // Si el número real cambia, limpiamos el optimisticUnread
  useEffect(() => {
    setOptimisticUnread(0);
  }, [currentNotificationsNum]);

  // Función pública para "push" local (puedes llamar a esta función desde otros componentes si lo expones)
  // Ej: notificar optimista por evento local
  const pushLocalNotification = async (tipo) => {
    try {
      setOptimisticUnread(v => v + 1);
      if (tipo) {
        setOptimisticByType(prev => ({
          ...prev,
          [tipo]: (prev[tipo] || 0) + 1
        }));
      }
      if (typeof refreshNotificaciones === 'function') {
        await refreshNotificaciones(); // intenta refrescar servidor; al actualizar, effect limpiará optimistic
      } else {
        // si no hay refresh, dejamos el optimismo hasta que el contexto actualice desde otra parte
        console.warn('refreshNotificaciones no disponible en contexto; quedará contador optimista local.');
      }
    } catch (err) {
      console.error('Error en pushLocalNotification:', err);
    }
  };

  // Registro de usuario en Strapi igual que tenías
  useEffect(() => {
    const handleUserRegistration = async () => {
      if (isAuthenticated && user) {
        const userEmail = user.email;
        try {
          const existingUsers = await findUserInStrapi(userEmail);
          if (Array.isArray(existingUsers) && existingUsers.length === 0) {
            await registerUserInStrapi(userEmail, user.name);
          }
        } catch (error) {
          console.error('Error al buscar o registrar usuario en Strapi:', error);
        }
      }
    };
    handleUserRegistration();
  }, [isAuthenticated, user]);

  // Login / Logout: guardamos returnTo en cookie (ruta, query, hash)
  const handleLogin = () => {
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    document.cookie = `returnTo=${encodeURIComponent(currentUrl)}; path=/; max-age=3600`;
    loginWithRedirect({
      appState: {
        returnTo: location.pathname + location.search,
      },
    });
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    document.cookie = "returnTo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    logout({ returnTo: window.location.origin });
    setIsMenuOpen(false);
  };

  // displayCount: número real + optimismo local
  const displayCount = Number(currentNotificationsNum || 0) + Number(optimisticUnread || 0);

  // Los botones que queremos mostrar (del primer NavBar)
  const menuSections = ["gana", "cartera", "taxis", "comida", "market", "coowork", "academia", "comunidad"];

  return (
    <>
      {/* TOP BAR */}
      <MenuTopBar
        iconMap={iconMap}
        isOpen={topBarOpen}
        setIsOpen={(open) => {
          if (topBarRef.current) {
            if (!open) {
              topBarRef.current.style.maxHeight = '0px';
            } else {
              topBarRef.current.style.maxHeight = '0px';
              setTimeout(() => {
                if (topBarRef.current) topBarRef.current.style.maxHeight = topBarRef.current.scrollHeight + 'px';
              }, 20);
            }
          }
          closeAllMenus();
          setTopBarOpen(open);
        }}
        topBarRef={topBarRef}
        handleNavigation={handleNavigation}
      />

      {/* Redireccionador (igual que tenías) */}
      <Direccionador
        eventUrl="http://localhost:8000/chat"
        eventKey="ya estoy invocando a la función llamar a taxi"
        redirectPath="/taxi"
      />

      <section className="navbar">
        <div className="nav-links">
          <div className='columnas'>
            <div className="columnax">
              <div className="logo-container" alt="Ciudadan.org --> Cooperativismo 6.0" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <img
                  id="ciudadan-logo"
                  src={logoSrc}
                  alt="Ciudadan Logo"
                  name="Ciudadan.Org - Cooperativismo 6.0 - Logo"
                  className={`logo-img ${isHomeOrInfo ? "en-home" : ""}`}
                />
                <CiudadanBadge />
              </div>
            </div>

            <div className='columnax columna2'>
              <div className="nav-link correte">
                <AIInput />
              </div>
            </div>

            <div className="columnax columna3">
              <div className="nav-linky">
                <span className="robot-mobile">
                  <BotonCircular clase="boton-ia" mediaQ={true} />
                </span>
              </div>

              <div className="nav-linky">
                <MenuIcon
                  isOpen={topBarOpen}
                  setIsOpen={(open) => {
                    if (topBarRef.current) {
                      if (!open) {
                        topBarRef.current.style.maxHeight = '0px';
                      } else {
                        topBarRef.current.style.maxHeight = '0px';
                        setTimeout(() => {
                          if (topBarRef.current) topBarRef.current.style.maxHeight = topBarRef.current.scrollHeight + 'px';
                        }, 20);
                      }
                    }
                    closeAllMenus();
                    setTopBarOpen(open);
                  }}
                  className="cuenta-icon"
                />
              </div>

              <div className="nav-linky">
                <NotificationsIcon
                  action='notifications'
                  isOpen={isNotificationMenuOpen}
                  setIsOpen={(open) => {
                    closeAllMenus();
                    setIsNotificationMenuOpen(open);
                  }}
                  onClose={() => setIsNotificationMenuOpen(false)}
                  authenticated={isAuthenticated}
                  userData={user}
                  containerRef={notifRef}
                  className="cuenta-icon"
                  handleLogout={handleLogout}
                  count={displayCount}
                />
              </div>

              <div className="nav-linky">
                <HearthButton
                  isOpen={isMenuOpen}
                  onClose={() => setIsMenuOpen(false)}
                  authenticated={isAuthenticated}
                  userData={user}
                  className="cuenta-icon"
                />
              </div>

              <div className="nav-linky">
                <CartIcon
                  isOpen={isMenuOpen}
                  onClose={() => setIsMenuOpen(false)}
                  authenticated={isAuthenticated}
                  userData={user}
                  className="cuenta-icon"
                />
              </div>

              <UserIcon
                handleLogin={handleLogin}
                isProfileMenuOpen={isProfileMenuOpen}
                setIsProfileMenuOpen={setIsProfileMenuOpen}
                handleLogout={handleLogout}
                handleLinkClick={handleLinkClick}
                defaultProfileImage={guestImage}
                guestImage={guestImage}
                Link={Link}
                containerRef={profileRef}
              />
            </div>
          </div>
        </div>

        {/* fila inferior: botones del menú */}
        <div className={`nav-links wraper bottom-bar${isBottomBarVisible ? '' : ' bottom-bar--hidden'}`}
        style={{ zIndex: 1400 }}>
          {menuSections.map((section) => {
            const serverCount = (contadorNotificaciones && contadorNotificaciones[section]) ? Number(contadorNotificaciones[section]) : 0;
            const optimistic = optimisticByType?.[section] || 0;
            const totalCount = serverCount + optimistic;
            return (
              <NavButton
                key={section}
                section={section}
                activeTab={activeTab}
                handleNavigation={handleNavigation}
                count={totalCount}
                iconMap={iconMap}
              />
            );
          })}
        </div>
      </section>

      <button
        className="split-action-button"
        type="button"
        style={{ bottom: isBottomBarVisible ? '72px' : '12px', zIndex: 1500 }}
        aria-label="Acciones rápidas"
      >
        <span
          className="split-button-part split-left"
          onClick={(e) => {
            e.stopPropagation();
            setIsBottomBarVisible(prev => !prev);
          }}
        >
          {isBottomBarVisible ? (
            <FaArrowDown size={14} style={{ display: 'block' }} />
          ) : (
            <FaArrowUp size={14} style={{ display: 'block' }} />
          )}
        </span>
        <span
          className="split-button-part split-right"
          onClick={(e) => {
            e.stopPropagation();
            setIsRightSidebarOpen(prev => !prev);
          }}
        >
          {isRightSidebarOpen ? (
            <FaArrowRight size={14} style={{ display: 'block' }} />
          ) : (
            <FaArrowLeft size={14} style={{ display: 'block' }} />
          )}
        </span>
      </button>

      <div
        className={`right-sidebar${isRightSidebarOpen ? ' right-sidebar--open' : ''}`}
        style={{ top: '86px', bottom: isBottomBarVisible ? '142px' : '82px' }}
      >
        <button
          type="button"
          className="sidebar-icon-button"
          aria-label="Ir arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUpwardIcon fontSize="small" />
        </button>
        <button
          type="button"
          className="sidebar-icon-button"
          aria-label="Mostrar asistente texto"
        >
          <TextFieldsIcon fontSize="small" />
        </button>
        <button
          type="button"
          className="sidebar-icon-button"
          aria-label="Mostrar asistente voz"
        >
          <KeyboardVoiceIcon fontSize="small" />
        </button>
        <button
          type="button"
          className="sidebar-icon-button"
          aria-label="Compartir"
          onClick={() => setIsSharePopupOpen(true)}
        >
          <ShareIcon fontSize="small" />
        </button>
      </div>

      <ShareButton
        showButton={false}
        open={isSharePopupOpen}
        onOpenChange={setIsSharePopupOpen}
      />

      {/* ===== CSS específico para la topbar (puedes mover a NavBar.css) ===== */}
      <style jsx>{`
        .topbar-wrapper {
          position: relative;
        }

        .topbar-toggle {
          position: absolute;
          left: 16px;
          top: 8px;
          z-index: 40;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .triangle {
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 12px solid currentColor;
          display: inline-block;
          transition: transform 220ms ease;
          color: #111;
          background-color: #0000ff;
        }

        .topbar-toggle.open .triangle {
          transform: rotate(180deg);
        }

        .topbar {
          overflow: hidden;
          transition: max-height 280ms ease, opacity 220ms ease;
          max-height: 0px; /* se ajusta por JS al abrir */
          opacity: 0;
        }

        .topbar-wrapper .topbar[style] {
          /* si el maxHeight fue ajustado por JS, mostramos la opacidad */
          opacity: 1;
        }

        .topbar-desktop {
          display: none;
          padding: 12px 16px;
          align-items: center;
          gap: 12px;
        }

        .topbar-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        .topbar-icon { font-size: 18px; }
        .topbar-label { font-weight: 600; }

        .topbar-mobile {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding: 10px 12px 16px;
        }

        .topbar-grid-item {
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          padding:8px 6px;
          border-radius:8px;
          background:transparent;
          border:none;
          cursor:pointer;
        }

        .grid-icon { font-size: 20px; }
        .grid-label { font-size: 11px; margin-top:4px; text-transform:capitalize; }

        /* Responsive: mostramos la versión desktop arriba 768px */
        @media(min-width:768px) {
          .topbar-desktop { display:flex; }
          .topbar-mobile { display:none; }
          .topbar-toggle { left: 24px; top: 12px; }
        }
      `}</style>
    </>
  );
};

export default NavBar;