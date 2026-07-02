import React from 'react';

import '../../styles/conductor.css';

const ConductorContainer = ({ children }) => {
  return (
    <div className="creciente">
      <div className="conductor-layout">
        {children}
      </div>
    </div>
  );
};

export default ConductorContainer;
