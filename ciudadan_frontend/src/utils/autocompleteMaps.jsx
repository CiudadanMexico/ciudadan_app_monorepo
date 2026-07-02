// src/utils/autocompleteUtils.js

/**
 * Inicializa los Autocomplete de Google Maps para dos inputs.
 * 
 * @param {Object} options - Opciones de configuración.
 * @param {string} options.fromInputId - ID del input de origen.
 * @param {string} options.toInputId - ID del input de destino.
 * @param {function} options.onFromChanged - Callback que recibe el objeto `place` del autocomplete de origen.
 * @param {function} options.onToChanged - Callback que recibe el objeto `place` del autocomplete de destino.
 */
export const initAutocomplete = ({
    fromInputId,
    toInputId,
    onFromChanged,
    onToChanged,
  }) => {
    const fromInput = document.getElementById(fromInputId);
    const toInput = document.getElementById(toInputId);
  
    if (!fromInput || !toInput) {
      console.error("No se encontraron los inputs para el Autocomplete.");
      return;
    }
  
    // Definir los límites aproximados de la CDMX para sesgar los resultados.
    const cdmxBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(19.234, -99.351), // esquina suroeste
      new window.google.maps.LatLng(19.592, -98.940)  // esquina noreste
    );
  
    const options = {
      bounds: cdmxBounds,
      strictBounds: false, // Prioriza CDMX pero permite resultados fuera de esos límites
      componentRestrictions: { country: "mx" } // Muestra resultados de todo el país
    };
  
    const fromAutocomplete = new window.google.maps.places.Autocomplete(fromInput, options);
    const toAutocomplete = new window.google.maps.places.Autocomplete(toInput, options);
  
    fromAutocomplete.addListener('place_changed', () => {
      const fromPlace = fromAutocomplete.getPlace();
      if (fromPlace.geometry) {
        onFromChanged(fromPlace);
      }
    });
  
    toAutocomplete.addListener('place_changed', () => {
      const toPlace = toAutocomplete.getPlace();
      if (toPlace.geometry) {
        onToChanged(toPlace);
      }
    });
  };
  