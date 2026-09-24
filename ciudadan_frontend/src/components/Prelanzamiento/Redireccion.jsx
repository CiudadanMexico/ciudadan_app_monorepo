import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { urlRedireccion } from './datos';

export default function Redireccion({ tipo }) {
  const location = useLocation();
  return <Navigate replace to={urlRedireccion(tipo, location, window.location.origin)} />;
}
