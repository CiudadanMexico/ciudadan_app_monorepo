import {
  LAB_REFERENCIA,
  RENTA_COMPARTIDO_LAB,
  equivalenciaMxn,
} from './labory';

describe('labory — referencia interna', () => {
  it('valor unitario de referencia es 147.16 MXN por LAB', () => {
    expect(LAB_REFERENCIA.valorUnitario).toBe(147.16);
    expect(LAB_REFERENCIA.moneda).toBe('MXN');
    expect(LAB_REFERENCIA.tipo).toBe('referencia_interna');
  });

  it('50 LAB equivalen exactamente a 7,358.00 MXN', () => {
    const r = equivalenciaMxn(RENTA_COMPARTIDO_LAB);
    expect(r.cantidadLab).toBe(50);
    expect(r.valorUnitario).toBe(147.16);
    expect(r.total).toBe(7358);
  });

  it('el total usa el mismo redondeo que el valor unitario (consistencia)', () => {
    // 50 × 147.16 = 7358 exacto, sin deriva de punto flotante.
    expect(equivalenciaMxn(50).total).toBe(
      Math.round(50 * 147.16 * 100) / 100
    );
  });

  it('otras cantidades se equivalen con redondeo a 2 decimales', () => {
    expect(equivalenciaMxn(1).total).toBe(147.16);
    expect(equivalenciaMxn(3).total).toBe(441.48); // 3 × 147.16 = 441.48
    expect(equivalenciaMxn(100).total).toBe(14716);
  });
});
