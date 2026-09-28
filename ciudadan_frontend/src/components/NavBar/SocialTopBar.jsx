import React, { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Popover, TextField, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation, useNavigate } from 'react-router-dom';
import CiudadanBadge from '../CiudadanBadge.jsx';
import UserIcon from './UserIcon.jsx';

const COMMUNITY_SCREENS = {
  feed: {
    title: 'Feed',
    subtitle: 'Abre el feed social de Ciudadan.',
    showSearch: true,
    searchPlaceholder: 'Buscar publicaciones',
    searchScopeLabel: 'Publicaciones, personas y contenido',
    menuItems: [
      { label: 'Chats', path: '/comunidad/chats' },
      { label: 'Contactos', path: '/comunidad/contactos' },
      { label: 'Asamblea', path: '/comunidad' },
      { label: 'Grupos', path: '/comunidad/grupos' },
      { label: 'Volver a Ciudadan', path: '/' },
    ],
  },
  chats: {
    title: 'Chats',
    subtitle: 'Conversaciones de Telegram integradas en Ciudadan.',
    showSearch: true,
    searchPlaceholder: 'Buscar conversación',
    searchScopeLabel: 'Conversaciones y personas',
    menuItems: [
      { label: 'Feed', path: '/comunidad/feed' },
      { label: 'Contactos', path: '/comunidad/contactos' },
      { label: 'Asamblea', path: '/comunidad' },
      { label: 'Grupos', path: '/comunidad/grupos' },
      { label: 'Volver a Ciudadan', path: '/' },
    ],
  },
  contactos: {
    title: 'Contactos',
    subtitle: 'Agenda y contactos integrados.',
    showSearch: true,
    searchPlaceholder: 'Buscar contacto',
    searchScopeLabel: 'Contactos y personas',
    menuItems: [
      { label: 'Feed', path: '/comunidad/feed' },
      { label: 'Chats', path: '/comunidad/chats' },
      { label: 'Asamblea', path: '/comunidad' },
      { label: 'Grupos', path: '/comunidad/grupos' },
      { label: 'Volver a Ciudadan', path: '/' },
    ],
  },
  asamblea: {
    title: 'Asamblea',
    subtitle: 'Comunidad, distrito y Asamblea Federal.',
    showSearch: true,
    searchPlaceholder: 'Buscar en asamblea',
    searchScopeLabel: 'Temas, personas y contenido comunitario',
    menuItems: [
      { label: 'Feed', path: '/comunidad/feed' },
      { label: 'Chats', path: '/comunidad/chats' },
      { label: 'Contactos', path: '/comunidad/contactos' },
      { label: 'Grupos', path: '/comunidad/grupos' },
      { label: 'Volver a Ciudadan', path: '/' },
    ],
  },
  grupos: {
    title: 'Grupos',
    subtitle: 'Pantalla provisional de grupos.',
    showSearch: true,
    searchPlaceholder: 'Buscar grupo',
    searchScopeLabel: 'Grupos, personas y contenido',
    menuItems: [
      { label: 'Feed', path: '/comunidad/feed' },
      { label: 'Chats', path: '/comunidad/chats' },
      { label: 'Contactos', path: '/comunidad/contactos' },
      { label: 'Asamblea', path: '/comunidad' },
      { label: 'Volver a Ciudadan', path: '/' },
    ],
  },
};

const SocialTopBar = ({
  screenKey = 'asamblea',
  logoSrc,
  handleLogin,
  handleLogout,
  handleLinkClick,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  defaultProfileImage,
  guestImage,
  Link,
  containerRef,
  userData,
  user,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [query, setQuery] = useState('');

  const screen = useMemo(() => COMMUNITY_SCREENS[screenKey] || COMMUNITY_SCREENS.asamblea, [screenKey]);

  const openMoreMenu = (event) => setMoreAnchorEl(event.currentTarget);
  const closeMoreMenu = () => setMoreAnchorEl(null);
  const openSearch = (event) => setSearchAnchorEl(event.currentTarget);
  const closeSearch = () => setSearchAnchorEl(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setQuery(q);
  }, [location.search]);

  const goTo = (path) => {
    closeMoreMenu();
    navigate(path);
  };

  const applySearch = () => {
    const params = new URLSearchParams(location.search);
    const normalized = query.trim();

    if (normalized) {
      params.set('q', normalized);
    } else {
      params.delete('q');
    }

    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' });
    closeSearch();
  };

  const clearSearch = () => {
    const params = new URLSearchParams(location.search);
    params.delete('q');
    setQuery('');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' });
    closeSearch();
  };

  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        zIndex: 1200,
        width: '100%',
        boxSizing: 'border-box',
        px: '8px',
        background: '#fff200',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: 'auto 1fr auto', md: 'auto 1fr auto' },
          gap: { xs: 1, md: 1.5 },
          alignItems: 'center',
          px: 0,
          py: { xs: 0.5, md: 0.75 },
          minHeight: { xs: 58, md: 64 },
        }}
      >
        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            minWidth: 0,
          }}
        >
          {logoSrc ? (
            <Box
              component="img"
              src={logoSrc}
              alt="Ciudadan"
              sx={{ width: { xs: 48, md: 60 }, height: 'auto', objectFit: 'contain' }}
            />
          ) : null}
          <CiudadanBadge />
        </Box>

        <Box
          sx={{
            minWidth: 0,
            justifySelf: 'stretch',
            px: { xs: 0.5, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 750,
              color: '#07131b',
              lineHeight: 1.05,
              fontSize: { xs: '0.95rem', md: '1rem' },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {screen.title}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            justifySelf: 'end',
          }}
        >
          {screen.showSearch ? (
            <IconButton
              onClick={openSearch}
              aria-label="Buscar en comunidad"
              sx={{
                color: '#07131b',
                backgroundColor: 'rgba(255,255,255,0.5)',
                width: 34,
                height: 34,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.7)' },
              }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          ) : null}

          <IconButton
            onClick={openMoreMenu}
            aria-label="Opciones sociales"
            sx={{
              color: '#07131b',
              backgroundColor: 'rgba(255,255,255,0.5)',
              width: 34,
              height: 34,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.7)' },
            }}
          >
            <MoreVertIcon />
          </IconButton>

          <UserIcon
            handleLogin={handleLogin}
            isProfileMenuOpen={isProfileMenuOpen}
            setIsProfileMenuOpen={setIsProfileMenuOpen}
            handleLogout={handleLogout}
            handleLinkClick={handleLinkClick}
            defaultProfileImage={defaultProfileImage}
            guestImage={guestImage}
            Link={Link}
            containerRef={containerRef}
          />
        </Box>
      </Box>

      <Popover
        open={Boolean(searchAnchorEl)}
        anchorEl={searchAnchorEl}
        onClose={closeSearch}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1,
            p: 1.25,
            width: { xs: 280, sm: 320, md: 380 },
            borderRadius: 3,
            boxShadow: '0 20px 48px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.5 }}>
            {screen.searchScopeLabel}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            autoFocus
            placeholder={screen.searchPlaceholder}
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applySearch();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 999,
                backgroundColor: 'rgba(7,19,27,0.04)',
              },
            }}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
            <IconButton onClick={applySearch} aria-label="Aplicar búsqueda" size="small" sx={{ color: '#07131b' }}>
              <SearchIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={clearSearch} aria-label="Limpiar búsqueda" size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Popover>

      <Menu
        anchorEl={moreAnchorEl}
        open={Boolean(moreAnchorEl)}
        onClose={closeMoreMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 220,
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 20px 48px rgba(0,0,0,0.22)',
            },
          },
        }}
      >
        {screen.menuItems.map((item) => (
          <MenuItem key={item.path} onClick={() => goTo(item.path)}>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default SocialTopBar;