/**
 * Fase E (QA) — contrato de la guia UI del modulo contra la matriz REAL del
 * backend (docs/REPARTIDORES-MVP-CONTRATO-BACKEND.md §1/§5; pin backend en
 * tests/delivery-requirements.test.js). Si el backend mueve la matriz, esta
 * prueba obliga a mover la guia UI en el mismo commit (deriva §12E.9).
 */
import { etiquetaFaltante, SLOTS_POR_TIPO, ETIQUETAS_ESTADO } from './helpers';

describe('helpers del modulo Repartidor', () => {
  describe('etiquetaFaltante (texto legible de /me faltantes)', () => {
    test('mapea faltantes por campo conocido', () => {
      expect(etiquetaFaltante({ campo: 'clabe' })).toBe(
        'CLABE con dígito de control y titular declarado'
      );
      expect(etiquetaFaltante({ campo: 'training' })).toContain('8/10');
    });

    test('mapea faltantes por evidencia (media)', () => {
      expect(etiquetaFaltante({ media: 'selfie' })).toContain('Selfie');
      expect(etiquetaFaltante({ media: 'insurance_policy_photo' })).toContain('Póliza');
    });

    test('desconocidos y motivos libres caen a texto legible, nunca a vacio', () => {
      expect(etiquetaFaltante({ campo: 'algo_nuevo' })).toBe('Dato: algo_nuevo');
      expect(etiquetaFaltante({ media: 'slot_nuevo' })).toBe('Evidencia: slot_nuevo');
      expect(etiquetaFaltante({ motivo: 'Requiere revisión manual' })).toBe(
        'Requiere revisión manual'
      );
      expect(etiquetaFaltante(null)).toBe('');
    });
  });

  describe('SLOTS_POR_TIPO refleja la matriz documental del backend', () => {
    test('bicicleta: 4 evidencias y NUNCA documentos de moto (spec §10.6)', () => {
      expect(SLOTS_POR_TIPO.bicicleta).toEqual([
        'photo_front',
        'photo_side',
        'photo_delivery_bag',
        'video_presentation',
      ]);
      const prohibidosMoto = [
        'license_front_photo',
        'license_back_photo',
        'circulation_card_photo',
        'insurance_policy_photo',
        'photo_back',
        'photo_helmet',
      ];
      for (const slot of prohibidosMoto) {
        expect(SLOTS_POR_TIPO.bicicleta).not.toContain(slot);
      }
    });

    test('bicicleta electrica: matriz de bici + etiqueta del motor (spec §4.3)', () => {
      expect(SLOTS_POR_TIPO.bicicleta_electrica).toEqual([
        ...SLOTS_POR_TIPO.bicicleta,
        'motor_label_photo',
      ]);
    });

    test('motocicleta: 10 evidencias incluyendo licencia, tarjeta y seguro', () => {
      expect(SLOTS_POR_TIPO.motocicleta).toHaveLength(10);
      for (const slot of [
        'license_front_photo',
        'license_back_photo',
        'circulation_card_photo',
        'insurance_policy_photo',
        'photo_back',
        'photo_helmet',
      ]) {
        expect(SLOTS_POR_TIPO.motocicleta).toContain(slot);
      }
    });
  });

  describe('ETIQUETAS_ESTADO cubre los 9 estados del backend', () => {
    test('ningun estado del contrato queda sin etiqueta', () => {
      const estadosBackend = [
        'draft',
        'pending_documents',
        'pending_review',
        'corrections_required',
        'eligible_for_video_review',
        'pending_federal_audit',
        'approved',
        'rejected',
        'suspended',
      ];
      for (const estado of estadosBackend) {
        expect(ETIQUETAS_ESTADO[estado]).toBeDefined();
        expect(ETIQUETAS_ESTADO[estado].label).toBeTruthy();
      }
    });
  });
});
