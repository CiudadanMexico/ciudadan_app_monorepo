import {
  areaIdOf,
  areaOptions,
  areaPath,
  cadenaDeAreas,
  especialidadOptions,
  isActiveSkill,
  requiereArea,
  requiereEspecialidad,
  skillAreaId,
  validarTarea,
} from './agregarTarea.helpers';

// --- fixtures con la forma real de Strapi v4 (attributes + relation {data}) ---
const areaV4 = (id, name, parentId = null, is_active = true) => ({
  id,
  attributes: {
    name,
    level: parentId ? 1 : 0,
    is_active,
    parent_area: parentId ? { data: { id: parentId, attributes: { name: '' } } } : { data: null },
  },
});

const skillV4 = (id, name, areaId, is_active = true) => ({
  id,
  attributes: {
    name,
    is_active,
    area: areaId ? { data: { id: areaId, attributes: { name: '' } } } : { data: null },
  },
});

const ADM = areaV4(1, 'Administrativo');
const CONT = areaV4(2, 'Contabilidad', 1);
const IMP = areaV4(3, 'Impuestos', 2); // nivel extra (aunque hoy no se use)
const VIEJA = areaV4(4, 'Archivada', 1, false);
const SK_ADM = skillV4(10, 'Recursos Humanos', 1);
const SK_CONT = skillV4(11, 'Contabilidad General', 2);
const SK_OFF = skillV4(12, 'Obsoleto', 1, false);
const SK_HUERFA = skillV4(13, 'Sin área', null);

describe('reglas por nivel de tarea', () => {
  it('general y becario no piden área (arregla el "Selecciona un área" obligatorio)', () => {
    expect(requiereArea('general')).toBe(false);
    expect(requiereArea('becario')).toBe(false);
    expect(requiereEspecialidad('general')).toBe(false);
  });

  it('experto y personalizada piden área pero NO skill', () => {
    for (const nivel of ['experto', 'personalizada']) {
      expect(requiereArea(nivel)).toBe(true);
      expect(requiereEspecialidad(nivel)).toBe(false);
    }
  });

  it('especialidad pide área Y especialidad (los 2 selects)', () => {
    expect(requiereArea('especialidad')).toBe(true);
    expect(requiereEspecialidad('especialidad')).toBe(true);
  });
});

describe('areaOptions / especialidadOptions', () => {
  it('con nivel especialidad sólo lista áreas con skill activo', () => {
    const opciones = areaOptions([ADM, CONT, VIEJA], [SK_ADM, SK_CONT, SK_OFF, SK_HUERFA], 'especialidad');
    expect(opciones.map((a) => a.id)).toEqual([1, 2]); // archivada fuera, huérfana no cuenta
  });

  it('sin nivel de skill (experto) lista todas las activas', () => {
    const opciones = areaOptions([ADM, CONT, VIEJA], [], 'experto');
    expect(opciones.map((a) => a.id)).toEqual([1, 2]);
  });

  it('las especialidades se filtran por el área elegida y van ordenadas', () => {
    const skills = [SK_CONT, skillV4(14, 'Almacén', 2), SK_ADM, SK_OFF];
    const opciones = especialidadOptions(skills, 2);
    expect(opciones.map((s) => s.id)).toEqual([14, 11]); // Almacén antes que Contabilidad
    expect(especialidadOptions(skills, 99)).toEqual([]);
    expect(especialidadOptions(skills, null)).toEqual([]);
  });

  it('isActiveSkill/skillAreaId toleran sin is_active y sin área', () => {
    expect(isActiveSkill({ id: 1, attributes: { name: 'x' } })).toBe(true);
    expect(skillAreaId(SK_HUERFA)).toBeNull();
  });
});

describe('areaPath y cadenaDeAreas — árbol agnóstico al nivel', () => {
  it('ruta de 3 niveles con el nivel extra', () => {
    const todas = [ADM, CONT, IMP];
    expect(areaPath(IMP, todas)).toBe('Administrativo › Contabilidad › Impuestos');
    expect(areaPath(ADM, todas)).toBe('Administrativo');
  });

  it('cadenaDeAreas mete raíz y padres (chip de raíz + canUserRateTask)', () => {
    expect(cadenaDeAreas(IMP, [ADM, CONT, IMP])).toEqual([1, 2, 3]);
    expect(cadenaDeAreas(ADM, [ADM])).toEqual([1]);
    expect(cadenaDeAreas(null, [])).toEqual([]);
  });

  it('areaIdOf acepta {data}, plano, array y null', () => {
    expect(areaIdOf({ data: { id: 7 } })).toBe(7);
    expect(areaIdOf({ id: 7 })).toBe(7);
    expect(areaIdOf([{ id: 7 }])).toBe(7);
    expect(areaIdOf(null)).toBeNull();
    expect(areaIdOf({ data: null })).toBeNull();
  });
});

describe('validarTarea — reglas del submit', () => {
  it('general/becario sin área pasan', () => {
    expect(validarTarea({ nivel: 'general' })).toBeNull();
    expect(validarTarea({ nivel: 'becario' })).toBeNull();
  });

  it('especialidad sin área o sin skill bloquea con mensaje', () => {
    expect(validarTarea({ nivel: 'especialidad' })).toMatch(/área/);
    expect(
      validarTarea({ nivel: 'especialidad', areaSeleccionada: 1 })
    ).toMatch(/especialidad/);
  });

  it('experto exige área pero no skill', () => {
    expect(validarTarea({ nivel: 'experto' })).toMatch(/área/);
    expect(validarTarea({ nivel: 'experto', areaSeleccionada: 1 })).toBeNull();
  });

  it('área sin especialidades activas bloquea con instrucción', () => {
    expect(
      validarTarea({
        nivel: 'especialidad',
        areaSeleccionada: 4,
        skillSeleccionado: 12,
        skills: [SK_OFF],
      })
    ).toMatch(/no tiene especialidades/);
  });

  it('caso completo válido', () => {
    expect(
      validarTarea({
        nivel: 'especialidad',
        areaSeleccionada: 2,
        skillSeleccionado: 11,
        skills: [SK_ADM, SK_CONT],
      })
    ).toBeNull();
  });
});
