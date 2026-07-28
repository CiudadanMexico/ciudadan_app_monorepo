import React, { useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../../styles/AccountMenuInfo.css';
import UserMenu from './UserMenu';

const UserIcon = ({ handleLogout, isProfileMenuOpen, setIsProfileMenuOpen, handleLinkClick, defaultProfileImage, guestImage, containerRef }) => {
  //const containerRef = useRef(null);
  const {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    error
  } = useAuth0();

  const [imageSrc, setImageSrc] = useState(guestImage);

  // Cambia src según login 
  useEffect(() => {
    if (isAuthenticated && user?.picture) {
      setImageSrc(user?.picture || guestImage );
    } else {
      setImageSrc(guestImage);
    }
  }, [isAuthenticated, user]);

  const handleImageError = () => {
    console.warn('❌ Falló imagen, reintentando...');

    if (!isAuthenticated || !user?.picture) {
      setImageSrc(defaultProfileImage);
      return;
    }

    // Opcional: reintenta con un fetch para verificar disponibilidad
    setTimeout(() => {
      fetch(user.picture)
        .then(res => {
          if (res.ok) {
            setImageSrc(user.picture); // intenta de nuevo
          } else {
            setImageSrc(defaultProfileImage); // fallback
          }
        })
        .catch(() => setImageSrc(defaultProfileImage));
    }, 1000);
  };

  const handleLogin = async () => {
    const returnTo = window.location.pathname + window.location.search;
    await loginWithRedirect({ appState: { returnTo } });
    setIsProfileMenuOpen(false);
  };

  const onIconClick = () => {
    if (2 > 1) {
      setIsProfileMenuOpen(!isProfileMenuOpen);
    } else {
      handleLogin();
    }
  };

  const handleLogoutWithLog = () => {
    logout({ returnTo: window.location.origin });
    setIsProfileMenuOpen(false);
  };

  return (
    <span className="nav-linky" ref={containerRef}>
      <div className="cuenta-icon-container" onClick={onIconClick}>
        <img
          src={imageSrc}
          alt="Profile"
          className="cuenta-icon"
          onError={handleImageError}
        />

        <UserMenu
          handleLogin={handleLogin}
          handleLogout={handleLogoutWithLog}
          isMenuOpen={isProfileMenuOpen}
          setIsProfileMenuOpen={setIsProfileMenuOpen}
          handleLinkClick={handleLinkClick}
          defaultProfileImage={defaultProfileImage}
          guestImage={guestImage}
          isProfileMenuOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
        />
      </div>
    </span>
  );
};

export default UserIcon;
