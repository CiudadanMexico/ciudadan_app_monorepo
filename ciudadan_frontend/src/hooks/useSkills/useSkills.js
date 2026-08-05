// src/hooks/useSkills/useSkills.js

import { useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const STRAPI_BASE = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

function buildHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export default function useSkills() {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => {
    console.error(err);
    setError(err?.message || String(err));
  };

  const getToken = async () => {
    try {
      if (!isAuthenticated) return null;
      return await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://api.ciudadan.org',
          scope: 'openid profile email offline_access',
        },
      });
    } catch {
      return null;
    }
  };

  // Obtener todas las habilidades
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${STRAPI_BASE}/api/skills?populate=*`, {
        headers: buildHeaders(token),
      });
      
      if (!res.ok) throw new Error(`Error fetching skills: ${res.status}`);
      
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      setSkills(list);
      return list;
    } catch (err) {
      handleError(err);
      setSkills([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear nueva habilidad
  const createSkill = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${STRAPI_BASE}/api/skills`, {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ data: payload }),
      });
      
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error creando skill: ${res.status} ${txt}`);
      }
      
      const json = await res.json();
      setSkills(prev => [...prev, json.data]);
      return json.data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar habilidad
  const updateSkill = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${STRAPI_BASE}/api/skills/${id}`, {
        method: 'PUT',
        headers: buildHeaders(token),
        body: JSON.stringify({ data: updates }),
      });
      
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error actualizando skill: ${res.status} ${txt}`);
      }
      
      const json = await res.json();
      setSkills(prev => prev.map(s => s.id === id ? json.data : s));
      return json.data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Eliminar habilidad
  const deleteSkill = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${STRAPI_BASE}/api/skills/${id}`, {
        method: 'DELETE',
        headers: buildHeaders(token),
      });
      
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error borrando skill: ${res.status} ${txt}`);
      }
      
      setSkills(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Asociar habilidad a usuario
  const associateSkillToUser = useCallback(async (userId, skillId) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      
      // Primero obtenemos el usuario actual
      const userRes = await fetch(`${STRAPI_BASE}/api/users/${userId}?populate=skills`, {
        headers: buildHeaders(token),
      });
      
      if (!userRes.ok) throw new Error('No se pudo obtener el usuario');
      
      const userData = await userRes.json();
      // /api/users devuelve objeto plano (sin .data.attributes)
      const currentSkills = userData.skills?.data || userData.skills || [];
      const skillIds = currentSkills.map(s => s.id);
      
      if (skillIds.includes(skillId)) return;
      
      // Añadimos la nueva habilidad
      const updatedSkills = [...skillIds, skillId];
      
      const updateRes = await fetch(`${STRAPI_BASE}/api/users/${userId}`, {
        method: 'PUT',
        headers: buildHeaders(token),
        body: JSON.stringify({
          data: {
            skills: updatedSkills
          }
        }),
      });
      
      if (!updateRes.ok) {
        const txt = await updateRes.text();
        throw new Error(`Error asociando skill: ${updateRes.status} ${txt}`);
      }
      
      const updatedUser = await updateRes.json();
      return updatedUser.data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Desasociar habilidad de usuario
  const dissociateSkillFromUser = useCallback(async (userId, skillId) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      
      const userRes = await fetch(`${STRAPI_BASE}/api/users/${userId}?populate=skills`, {
        headers: buildHeaders(token),
      });
      
      if (!userRes.ok) throw new Error('No se pudo obtener el usuario');
      
      const userData = await userRes.json();
      // /api/users devuelve objeto plano (sin .data.attributes)
      const currentSkills = userData.skills?.data || userData.skills || [];
      const skillIds = currentSkills
        .filter(s => s.id !== skillId)
        .map(s => s.id);
      
      const updateRes = await fetch(`${STRAPI_BASE}/api/users/${userId}`, {
        method: 'PUT',
        headers: buildHeaders(token),
        body: JSON.stringify({
          data: {
            skills: skillIds
          }
        }),
      });
      
      if (!updateRes.ok) {
        const txt = await updateRes.text();
        throw new Error(`Error desasociando skill: ${updateRes.status} ${txt}`);
      }
      
      const updatedUser = await updateRes.json();
      return updatedUser.data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    skills,
    loading,
    error,
    fetchSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    associateSkillToUser,
    dissociateSkillFromUser
  };
}