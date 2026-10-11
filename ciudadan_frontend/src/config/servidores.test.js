import { SERVIDOR, mensualidadServidor, mensualidadesServidor } from './servidores';

describe('servidores — lógica monetaria', () => {
  it('el precio total acordado es 55,000 MXN', () => {
    expect(SERVIDOR.precioTotal).toBe(55000);
    expect(SERVIDOR.moneda).toBe('MXN');
  });

  it('12 meses ≈ 4,583.33 mensuales', () => {
    expect(mensualidadServidor(12)).toBe(4583.33);
  });

  it('24 meses ≈ 2,291.67 mensuales', () => {
    expect(mensualidadServidor(24)).toBe(2291.67);
  });

  it('el plazo objetivo es 12 meses y está dentro de los disponibles', () => {
    expect(SERVIDOR.plazoObjetivo).toBe(12);
    expect(SERVIDOR.plazosDisponibles).toContain(12);
  });

  it('mensualidadesServidor devuelve todos los plazos con su mensualidad', () => {
    const lista = mensualidadesServidor();
    expect(lista).toEqual([
      { plazo: 12, mensualidad: 4583.33, moneda: 'MXN' },
      { plazo: 24, mensualidad: 2291.67, moneda: 'MXN' },
    ]);
  });

  it('rechaza plazos inválidos', () => {
    expect(() => mensualidadServidor(0)).toThrow();
    expect(() => mensualidadServidor(-1)).toThrow();
    expect(() => mensualidadServidor('x')).toThrow();
  });
});
