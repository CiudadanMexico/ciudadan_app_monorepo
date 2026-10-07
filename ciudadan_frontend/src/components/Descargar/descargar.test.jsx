import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { atribucionDescarga, estimarDescarga, esAndroid, formatearLanzamiento, formatearPrecio, textoDuracion, validarCorreo } from './datos';
import { getMembershipConfig, normalizarConfig, reclamarDescarga } from '../../services/driverLaunchService';
import DescargarConductores from '../../Pages/DescargarConductores.jsx';

describe('precios y textos de la landing de descarga', () => {
  test('formatea enteros y decimales sin depender de la locale', () => {
    expect(formatearPrecio(500)).toBe('$500');
    expect(formatearPrecio(450.5)).toBe('$450.50');
    expect(formatearPrecio('300', 'MXN')).toBe('$300');
    expect(formatearPrecio(99, 'USD')).toBe('USD 99');
    expect(formatearPrecio(undefined)).toBeNull();
  });

  test('12 meses se lee como "tu primer año"', () => {
    expect(textoDuracion(12)).toBe('tu primer año');
    expect(textoDuracion(6)).toBe('tus primeros 6 meses');
    expect(textoDuracion('24')).toBe('tus primeros 2 años');
    expect(textoDuracion(0)).toBe('el periodo promocional');
  });

  test('la fecha de lanzamiento siempre sale de launch_at', () => {
    const vista = formatearLanzamiento('2026-10-09T16:00:00.000Z', new Date('2026-09-28T12:00:00Z'));
    expect(vista.anio).toBe(2026);
    expect(vista.mesCorto).toBe('OCT');
    expect(vista.larga).toMatch(/octubre/);
    expect(vista.esFuturo).toBe(true);
    expect(vista.diasRestantes).toBe(12);
    // El día numérico corresponde a la hora de la CDMX (09:00 del 9 de octubre).
    expect(vista.dia).toBe(9);
    expect(formatearLanzamiento('2026-10-09T16:00:00.000Z', new Date('2026-10-10T12:00:00Z')).esFuturo).toBe(false);
  });

  test('sin fecha de lanzamiento no se inventa nada', () => {
    expect(formatearLanzamiento(null)).toBeNull();
    expect(formatearLanzamiento('no-es-fecha')).toBeNull();
  });

  test('el peso del APK se traduce a una advertencia útil', () => {
    const aviso = estimarDescarga(148.4);
    expect(aviso.tamanoMb).toBe(148.4);
    expect(aviso.wifi).toBe('≈ 1 min con Wi-Fi');
    expect(aviso.datos).toBe('≈ 1 min con datos móviles');
    expect(aviso.espacio).toContain('371 MB');
    expect(estimarDescarga(0)).toBeNull();
    expect(estimarDescarga('abc')).toBeNull();
  });

  test('una app pesada no promete minutos imposibles', () => {
    expect(estimarDescarga(900).datos).toMatch(/5 min/);
  });

  test('Android se detecta por el user agent', () => {
    expect(esAndroid('Mozilla/5.0 (Linux; Android 13; SM-A135M)')).toBe(true);
    expect(esAndroid('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false);
  });

  test('el correo se valida antes de gastar el token de Turnstile', () => {
    expect(validarCorreo('  CHOFER@Ciudadan.ORG ')).toBeNull();
    expect(validarCorreo('chofer@')).toBeTruthy();
    expect(validarCorreo('')).toBeTruthy();
  });

  test('la atribución viaja en las claves que acepta el backend', () => {
    expect(atribucionDescarga('?utm_source=whatsapp&utm_campaign=lanzamiento&ref=LID77', 'https://fb.com/x'))
      .toEqual({ utmSource: 'whatsapp', utmCampaign: 'lanzamiento', referrer: 'LID77' });
    expect(atribucionDescarga('', 'https://fb.com/x').referrer).toBe('https://fb.com/x');
    expect(atribucionDescarga('?utm_source=x'.padEnd(900, 'y')).utmSource.length).toBe(300);
  });
});


describe('servicio de descarga', () => {
  test('normalizarConfig acepta camelCase, snake_case y defaults', () => {
    expect(normalizarConfig({})).toMatchObject({
      regularMonthlyPrice: 500,
      promotionalMonthlyPrice: 300,
      promotionDurationMonths: 12,
      currency: 'MXN',
    });
    expect(normalizarConfig({ regularMonthlyPrice: 600, promotional_monthly_price: '350.5', launch_at: '2026-10-09T16:00:00Z' })).toMatchObject({
      regularMonthlyPrice: 600,
      promotionalMonthlyPrice: 350.5,
      launchAt: '2026-10-09T16:00:00.000Z',
    });
    expect(normalizarConfig({ apk: { disponible: true, tamano_mb: 148.4, version: 1 } }).apk).toEqual({ disponible: true, version: '1', tamanoMb: 148.4 });
    expect(normalizarConfig({ apk: { disponible: false } }).apk.tamanoMb).toBeNull();
  });

  test('los precios de la landing nunca se hardcodean: vienen de la config', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { regularMonthlyPrice: 550, promotionalMonthlyPrice: 320, promotionDurationMonths: 18, apk: { disponible: true, tamanoMb: 148.4 } } }),
    });
    const config = await getMembershipConfig();
    expect(config).toMatchObject({ regularMonthlyPrice: 550, promotionalMonthlyPrice: 320, promotionDurationMonths: 18, esRespaldo: false });
    expect(config.apk.tamanoMb).toBe(148.4);
  });

  test('si la API cae, la landing sigue mostrando los precios de referencia', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const config = await getMembershipConfig();
    expect(config.esRespaldo).toBe(true);
    expect(config.promotionalMonthlyPrice).toBe(300);
    expect(config.regularMonthlyPrice).toBe(500);
  });

  test('el claim devuelve el enlace firmado por el servidor, sin armar URLs aquí', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          message: '¡Listo! Tu membresía queda en $300 MXN/mes.',
          downloadUrl: 'https://api.ciudadan.org/api/driver-launch/download/ABC',
          promocionConcedida: true,
          emailEnviado: true,
        },
      }),
    });
    const resultado = await reclamarDescarga({ email: 'chofer@ciudadan.org' });
    expect(resultado).toMatchObject({
      ok: true,
      downloadUrl: 'https://api.ciudadan.org/api/driver-launch/download/ABC',
      promocionConcedida: true,
      emailEnviado: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/driver-launch/claim'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('un 400 del backend se traduce en su mensaje y no lanza', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ data: null, error: { status: 400, message: 'No pudimos verificar que eres humano. Intenta de nuevo.' } }),
    });
    const resultado = await reclamarDescarga({ email: 'chofer@ciudadan.org' });
    expect(resultado.ok).toBe(false);
    expect(resultado.downloadUrl).toBeNull();
    expect(resultado.message).toMatch(/verificar que eres humano/);
  });

  test('sin conexión el aviso sigue siendo en español', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const resultado = await reclamarDescarga({ email: 'chofer@ciudadan.org' });
    expect(resultado.ok).toBe(false);
    expect(resultado.message).toMatch(/No pudimos generar tu enlace/);
  });
});

describe('landing /descargar', () => {
  const configApi = (data) => ({ ok: true, json: async () => ({ data }) });

  test('muestra los precios que vienen de la API, no los hardcodeados', async () => {
    global.fetch = jest.fn().mockResolvedValue(configApi({
      regularMonthlyPrice: 550,
      promotionalMonthlyPrice: 320,
      promotionDurationMonths: 12,
      promotionActive: true,
      launchAt: '2026-10-09T16:00:00.000Z',
      apk: { disponible: true, version: '1.4.2', tamanoMb: 148.4 },
    }));
    render(<MemoryRouter><DescargarConductores /></MemoryRouter>);
    expect(screen.getByText(/100% para ti/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/320/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/148\.4 MB/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\$500/)).not.toBeInTheDocument();
  });

  test('con la promoción cerrada habla en precio regular', async () => {
    global.fetch = jest.fn().mockResolvedValue(configApi({
      regularMonthlyPrice: 500,
      promotionalMonthlyPrice: 300,
      promotionDurationMonths: 12,
      promotionActive: true,
      promotionClaimDeadline: '2020-01-01T00:00:00.000Z',
    }));
    render(<MemoryRouter><DescargarConductores /></MemoryRouter>);
    expect(await screen.findByText(/promoción de prelanzamiento cerró/i)).toBeInTheDocument();
    expect(screen.queryByText(/PROMOCIÓN CIERRA/)).not.toBeInTheDocument();
  });
});
