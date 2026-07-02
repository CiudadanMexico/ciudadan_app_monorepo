import { useState } from 'react';
import { validarPaso1, validarPaso2 } from '../utils/ValidacionesProducto';

const usePasoProducto = (formData, imagenPredeterminada) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [imagenError, setImagenError] = useState(false);

  const handleNext = () => {
    setFormSubmitted(true);

    let hayErrores = false;

    if (activeStep === 0) {
      hayErrores = !validarPaso1(formData);
    } else if (activeStep === 1) {
      hayErrores = !validarPaso2(formData);
    } else if (activeStep === 2) {
      if (!imagenPredeterminada) {
        setImagenError(true);
        hayErrores = true;
      } else {
        setImagenError(false);
      }
    }

    if (!hayErrores) {
      setActiveStep((prev) => prev + 1);
      setFormSubmitted(false);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  return {
    activeStep,
    formSubmitted,
    handleNext,
    handleBack,
    imagenError,
    setFormSubmitted,
  };
};

export default usePasoProducto;
