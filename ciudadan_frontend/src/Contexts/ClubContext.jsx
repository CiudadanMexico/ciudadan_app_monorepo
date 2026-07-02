import React, { createContext, useContext, useMemo } from 'react';
import { useRoles } from './RolesContext';

const ClubContext = createContext(null);
export const useClub = () => useContext(ClubContext);

export const ClubProvider = ({ children }) => {
  const {
    userData,
    isClub,
    haveClub,
    isJardinero
  } = useRoles();

  const value = useMemo(() => {
    if (!userData) {
      return {
        modo: 'usuario',
        club: null,
        puedeCultivarPlanta: () => false
      };
    }

    let club = null;
    let modo = 'usuario';

    if (isClub()) {
      club = userData.club;
      modo = 'club';
    } else if (haveClub()) {
      club = userData.club;
      modo = 'club';
    }

    /**
     * 🔐 Autorización por planta
     */
    const puedeCultivarPlanta = (planta) => {
      if (!planta) return false;

      // Caso 1: club (owner)
      if (isClub()) {
        return (
          planta.club?.id === club?.id
        );
      }

      // Caso 2: jardinero miembro de club
      if (isJardinero() && haveClub()) {
        return (
          planta.club?.id === club?.id
        );
      }

      // Caso 3: usuario individual
      return (
        planta.usuario?.id === userData.id
      );
    };

    return {
      modo,
      club,
      esClubOwner: isClub(),
      esJardineroClub: isJardinero() && haveClub(),
      puedeCultivarPlanta
    };
  }, [userData, isClub, haveClub, isJardinero]);

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
};
