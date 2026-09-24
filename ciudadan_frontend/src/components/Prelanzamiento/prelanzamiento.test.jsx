import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { atribucion, urlRedireccion, validarFormulario } from './datos';
import Redireccion from './Redireccion';
import Formulario from './Formulario';
import Video from './Video';
import { registrarPrelanzamiento } from '../../services/prelanzamientoService';
jest.mock('../../services/prelanzamientoService', () => ({ registrarPrelanzamiento: jest.fn() }));

test.each(['conductor', 'lider', 'socio-estatal'])('redirige y conserva origen/UTM: %s', tipo => {
  const url = urlRedireccion(tipo, { pathname: '/registro-antiguo', search: '?utm_source=qr&ref=RED1', hash: '' }, 'https://ciudadan.org');
  const params = new URLSearchParams(url.split('?')[1]);
  expect(params.get('tipo')).toBe(tipo);
  expect(params.get('utm_source')).toBe('qr');
  expect(params.get('ref')).toBe('RED1');
  const attr = atribucion({ pathname: '/prelanzamiento', search: url.slice(url.indexOf('?')) }, 'https://ciudadan.org');
  expect(attr.origen).toBe('https://ciudadan.org/registro-antiguo?utm_source=qr&ref=RED1');
  expect(attr.lider).toBe('RED1');
});
test('la ruta antigua monta el destino', () => {
  render(<MemoryRouter initialEntries={['/antigua?utm_campaign=lanzamiento']}><Routes><Route path='/antigua' element={<Redireccion tipo='lider' />} /><Route path='/prelanzamiento' element={<h1>Registro nuevo</h1>} /></Routes></MemoryRouter>);
  expect(screen.getByText('Registro nuevo')).toBeInTheDocument();
});
test('valida teléfono, autorización y estados asignados', () => {
  const errors = validarFormulario({ telefono: '123', estado: 'Ciudad de México', estadoSolicitado: 'Estado de México' }, 'socio-estatal');
  expect(errors.telefono).toBeTruthy(); expect(errors.consentimiento).toBeTruthy(); expect(errors.estadoSolicitado).toBeTruthy();
});
test.each([
  ['conductor', '¿Qué vehículo manejas actualmente?'],
  ['lider', '¿Cuántos conductores podrías invitar?'],
  ['socio-estatal', 'Experiencia relevante'],
])('muestra los campos de %s', (tipo, label) => {
  render(<Formulario tipo={tipo} cambiarTipo={() => {}} origen='https://ciudadan.org' utm={{}} lider='' />);
  expect(screen.getByLabelText(new RegExp(label.replace(/[¿?]/g, '.')))).toBeInTheDocument();
});
test('no envía un formulario vacío', () => {
  registrarPrelanzamiento.mockClear();
  render(<Formulario tipo='conductor' cambiarTipo={() => {}} origen='https://ciudadan.org' utm={{}} lider='' />);
  fireEvent.click(screen.getByRole('button', { name: 'APARTAR MI LUGAR' }));
  expect(registrarPrelanzamiento).not.toHaveBeenCalled();
});
test.each(['_RBi46F5IUU', '4-Hewz79Hhs', 'ubrxiA72pM0'])('carga el video %s sólo al pulsar', async id => {
  const { container } = render(<Video id={id} title='Video Ciudadan' />);
  expect(container.querySelector('iframe')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reproducir: Video Ciudadan' }));
  await waitFor(() => expect(screen.getByTitle('Video Ciudadan')).toHaveAttribute('src', `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`));
});
