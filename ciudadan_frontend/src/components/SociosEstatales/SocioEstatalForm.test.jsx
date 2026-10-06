import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SocioEstatalForm from './SocioEstatalForm';

const renderForm = (props = {}) => {
  const utils = render(
    <MemoryRouter>
      <SocioEstatalForm
        estadoSolicitado="Oaxaca"
        regionId="MX-OAX"
        estadoNombre="Oaxaca"
        {...props}
      />
    </MemoryRouter>
  );
  return { ...utils, form: utils.container.querySelector('form') };
};

describe('SocioEstatalForm — Formulario real de postulación', () => {
  it('renderiza los campos del formulario con el nombre del estado', () => {
    renderForm();
    expect(screen.getByText(/Socio Estatal de Oaxaca/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp \(10 dígitos\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado donde vives/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Municipio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Experiencia relevante/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar postulación/i })).toBeInTheDocument();
  });

  it('valida campos obligatorios vacíos sin enviar la postulación', () => {
    const { form } = renderForm();
    fireEvent.submit(form);
    expect(screen.getByText(/Escribe tu nombre completo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Completa este campo/i).length).toBeGreaterThan(0);
  });

  it('valida el teléfono mexicano de 10 dígitos', () => {
    const { form } = renderForm();
    fireEvent.change(screen.getByLabelText(/Nombre completo/i), {
      target: { value: 'María García López' },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp \(10 dígitos\)/i), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText(/Municipio/i), {
      target: { value: 'Oaxaca de Juárez' },
    });
    fireEvent.submit(form);
    expect(screen.getByText(/Escribe 10 dígitos, con o sin/i)).toBeInTheDocument();
  });

  it('exige aceptar el aviso de privacidad', () => {
    const { form } = renderForm();
    fireEvent.submit(form);
    expect(screen.getByText(/Acepta el aviso de privacidad/i)).toBeInTheDocument();
  });
});
