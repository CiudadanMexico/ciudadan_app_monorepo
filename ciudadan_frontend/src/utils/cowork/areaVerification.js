// src/utils/cowork/areaVerification.js

/**
 * Gestiona la verificación de áreas y subáreas del usuario.
 * Almacena estado, documentos y metadatos en un objeto JSON `area_details` en el usuario.
 */

export const initializeAreaDetails = (user) => {
  if (!user.area_details) {
    return { ...user, area_details: {} };
  }
  return user;
};

export const addAreaVerification = (user, areaId, { status, documents = [], metadata = {} }) => {
  if (!user.area_details) user.area_details = {};
  
  user.area_details[areaId] = {
    status,
    documents,
    metadata: { 
      verifiedBy: metadata.verifiedBy || null, 
      verifiedAt: metadata.verifiedAt || null, 
      submittedAt: metadata.submittedAt || new Date().toISOString() 
    }
  };
  
  return user;
};

export const updateAreaVerification = (user, areaId, updates) => {
  if (!user.area_details?.[areaId]) return user;
  
  user.area_details[areaId] = {
    ...user.area_details[areaId],
    ...updates
  };
  
  return user;
};

export const getAreaVerificationStatus = (user, areaId) => {
  return user.area_details?.[areaId]?.status || 'pending';
};

export const hasVerifiedArea = (user, areaId) => {
  return getAreaVerificationStatus(user, areaId) === 'verified';
};

export const getVerifiedAreas = (user) => {
  if (!user.area_details) return [];
  return Object.keys(user.area_details)
    .filter(id => user.area_details[id].status === 'verified')
    .map(id => ({ id, ...user.area_details[id] }));
};

export const isUserVerified = (user) => {
  const verifiedAreas = getVerifiedAreas(user);
  // Requisito: debe tener al menos una área verificada
  return verifiedAreas.length > 0;
};