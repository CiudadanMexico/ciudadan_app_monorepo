import React from 'react';
import { Outlet } from 'react-router-dom';
//import { useAuth0 } from '@auth0/auth0-react';
//import { AuthProvider } from './Contexts/AuthContext';
//cambio x

const App = () => {  
  return (    
    <div className='page-wrapper' id='ciudadadan-app'>
      {/* Aquí no incluimos NavBar para evitar duplicarla */}
      <Outlet />
    </div>   
  );
};
export default App;
