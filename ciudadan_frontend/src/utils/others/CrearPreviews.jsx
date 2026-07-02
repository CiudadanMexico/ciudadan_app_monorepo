// file: src/components/filePreviews/FilePreviews.js
import React from 'react';

/**
 * Componente para mostrar vistas previas de archivos (imágenes o videos).
 * 
 * Props:
 * - previews: array de objetos { url, type }
 * - maxHeight: altura máxima en píxeles para cada preview (opcional)
 */
export const CrearPreviews = ({ previews = [], maxHeight = 100 }) => {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
      {previews.map((file, index) => (
        file.type.startsWith('image/') ? (
          <img
            key={index}
            src={file.url}
            alt={`Preview ${index}`}
            style={{ maxHeight, borderRadius: 4 }}
          />
        ) : (
          <video
            key={index}
            src={file.url}
            controls
            style={{ maxHeight, borderRadius: 4 }}
          />
        )
      ))}
    </div>
  );
};
