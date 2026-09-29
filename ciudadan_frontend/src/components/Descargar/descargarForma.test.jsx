import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DescargarForma from './DescargarForma';
import { PRIVACY_VERSION, reclamarDescarga, reenviarEnlace } from '../../services/driverLaunchService';

jest.mock('../../services/driverLaunchService', () => {
  const real = jest.requireActual('../../services/driverLaunchService');
  return { ...real, reclamarDescarga: jest.fn(), reenviarEnlace: jest.fn() };
});

const config = {
  promotionalMonthlyPrice: 300,
  regularMonthlyPrice: 500,
  promotionDurationMonths: 12,
  currency: 'MXN',
  apk: { disponible: true, version: '1.4.2', tamanoMb: 148.4 },
};
const promocion = '$300 MXN al mes durante tu primer año';

beforeEach(() => {
  reclamarDescarga.mockReset();
  reenviarEnlace.mockReset();
});

const escribir = valor => fireEvent.change(screen.getByLabelText(/Tu correo/), { target: { value: valor } });

test('no quema el token de Turnstile con un correo inválido', () => {
  render(<DescargarForma config={config} promocionActiva promocionTexto={promocion} />);
  escribir('chofer@');
  fireEvent.click(screen.getByRole('button', { name: /QUIERO LA APP CON MI PROMOCIÓN/ }));
  expect(screen.getByText(/correo no parece válido/i)).toBeInTheDocument();
  expect(reclamarDescarga).not.toHaveBeenCalled();
});

test('pide el enlace al servidor y usa ESA URL para descargar', async () => {
  const enlace = 'https://api.ciudadan.org/api/driver-launch/download/TOKEN-FIRMADO';
  reclamarDescarga.mockResolvedValue({
    ok: true,
    message: '¡Listo! Tu membresía queda en $300 MXN/mes por 12 meses.',
    downloadUrl: enlace,
    promocionConcedida: true,
    emailEnviado: true,
  });
  render(<DescargarForma config={config} promocionActiva promocionTexto={promocion} />);
  escribir('  CHOFER@Ciudadan.org  ');
  fireEvent.click(screen.getByRole('button', { name: /QUIERO LA APP CON MI PROMOCIÓN/ }));

  const boton = await screen.findByRole('link', { name: /DESCARGAR LA APP/ });
  expect(boton).toHaveAttribute('href', enlace);
  expect(screen.getByText(/148.4 MB/)).toBeInTheDocument();
  expect(screen.getByText('¡Listo! Tu membresía queda en $300 MXN/mes por 12 meses.')).toBeInTheDocument();
});


test('el claim viaja con consentimiento, versión del aviso y atribución', async () => {
  reclamarDescarga.mockResolvedValue({ ok: true, message: 'ok', downloadUrl: 'https://api.ciudadan.org/api/driver-launch/download/UNO', promocionConcedida: true, emailEnviado: true });
  render(<DescargarForma config={config} promocionActiva promocionTexto={promocion} />);
  escribir('chofer@ciudadan.org');
  fireEvent.click(screen.getByRole('button', { name: /QUIERO LA APP CON MI PROMOCIÓN/ }));
  await waitFor(() => expect(reclamarDescarga).toHaveBeenCalledTimes(1));
  expect(reclamarDescarga).toHaveBeenCalledWith(expect.objectContaining({
    email: 'chofer@ciudadan.org',
    quieroAviso: true,
    emailConsent: true,
    privacyVersion: PRIVACY_VERSION,
  }));
});

test('si el correo no llegó, ofrece el enlace igual y permite reenviarlo', async () => {
  reclamarDescarga.mockResolvedValue({ ok: true, message: 'Aún no podemos enviarte el correo.', downloadUrl: 'https://api.ciudadan.org/d/uno', promocionConcedida: false, emailEnviado: false });
  reenviarEnlace.mockResolvedValue({ ok: true, message: 'Te enviamos un enlace nuevo a tu correo.', downloadUrl: 'https://api.ciudadan.org/d/dos', emailEnviado: true });
  render(<DescargarForma config={config} promocionActiva={false} promocionTexto={null} />);
  escribir('chofer@ciudadan.org');
  fireEvent.click(screen.getByRole('button', { name: /QUIERO DESCARGAR LA APP/ }));

  expect(await screen.findByText(/tu enlace funciona/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Reenviar el enlace/ }));
  await waitFor(() => expect(reenviarEnlace).toHaveBeenCalledWith('chofer@ciudadan.org', undefined));
  await waitFor(() => expect(screen.getByRole('link', { name: /DESCARGAR LA APP/ })).toHaveAttribute('href', 'https://api.ciudadan.org/d/dos'));
});

test('un fallo del backend se explica en español y no deja la página rota', async () => {
  reclamarDescarga.mockResolvedValue({
    ok: false,
    status: 400,
    message: 'No pudimos verificar que eres humano. Intenta de nuevo.',
    downloadUrl: null,
    emailEnviado: true,
  });
  render(<DescargarForma config={config} promocionActiva promocionTexto={promocion} />);
  escribir('chofer@ciudadan.org');
  fireEvent.click(screen.getByRole('button', { name: /QUIERO LA APP CON MI PROMOCIÓN/ }));
  expect(await screen.findByText(/verificar que eres humano/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /DESCARGAR LA APP/ })).not.toBeInTheDocument();
});
