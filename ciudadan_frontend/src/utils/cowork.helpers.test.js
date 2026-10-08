import {
  buildAreaEntry,
  buildAreaHierarchy,
  buildSkillChips,
} from './cowork.helpers';

const area = (id, name, level, isActive = true) => ({ id, name, level, isActive });
const tarea = (id, { areas = [], subareas = [], area_details = {} } = {}) => ({
  id,
  areas,
  subareas,
  area_details,
});

const ADM = () => area(1, 'Administrativo', 0);
const TEC = () => area(2, 'Técnico', 0);
const INACTIVA = () => area(3, 'Vieja', 0, false);
const CONTAB = () => area(4, 'Contabilidad', 1);
const ADM_DUP = () => area(5, 'ADMINISTRATIVO', 1);

const t1 = () => tarea(101, { areas: [ADM()] });
const t2 = () => tarea(102, { areas: [ADM()], subareas: [CONTAB()] });
const t3 = () => tarea(103, { areas: [TEC()] });

describe('buildSkillChips — chips de especialidades del panel', () => {
  it('vacío o sin áreas devuelve [] (se muestra el formulario tal cual)', () => {
    expect(buildSkillChips([], [])).toEqual([]);
    expect(buildSkillChips(undefined, undefined)).toEqual([]);
  });

  it('filtra inactivas y ordena raíces alfabéticamente (primera por defecto estable)', () => {
    const chips = buildSkillChips([TEC(), INACTIVA(), ADM()], [t1(), t3()]);
    expect(chips.map((c) => c.name)).toEqual(['Administrativo', 'Técnico']);
    expect(chips[0].totalTasks).toBe(1);
    expect(chips[1].totalTasks).toBe(1);
  });

  it('incluye subáreas aprobadas (level 1) tras las raíces', () => {
    const chips = buildSkillChips([ADM(), CONTAB(), TEC()], [t1(), t2(), t3()]);
    expect(chips.map((c) => c.name)).toEqual(['Administrativo', 'Técnico', 'Contabilidad']);
    const contab = chips.find((c) => c.id === 4);
    // t2 la referencia en subareas:
    expect(contab.totalTasks).toBe(1);
    expect(contab.directTasks.map((t) => t.id)).toEqual([102]);
    expect(contab.subareas).toEqual([]);
  });

  it('dedupa por slug: raíz gana sobre subárea con el mismo nombre', () => {
    const chips = buildSkillChips([ADM_DUP(), ADM()], [t1()]);
    expect(chips).toHaveLength(1);
    expect(chips[0].id).toBe(1);
    expect(chips[0].level).toBe(0);
  });

  it('una raíz agrupa sus tareas y subáreas como el hierarchy de siempre', () => {
    const chips = buildSkillChips([ADM()], [t1(), t2()]);
    const adm = chips[0];
    expect(adm.totalTasks).toBe(2);
    expect(adm.directTasks.map((t) => t.id)).toEqual([101]);
    expect(adm.subareas.map((s) => s.id)).toEqual([4]);
    expect(adm.subareas[0].tasks.map((t) => t.id)).toEqual([102]);
  });

  it('marca pendiente según area_details (punteado en la UI)', () => {
    const chips = buildSkillChips([ADM(), CONTAB()], [t1()], {
      1: { status: 'verified' },
      4: { status: 'pending' },
    });
    expect(chips.find((c) => c.id === 1).pendiente).toBe(false);
    expect(chips.find((c) => c.id === 4).pendiente).toBe(true);
  });

  it('sin area_details nada queda pendiente', () => {
    const chips = buildSkillChips([ADM()], [t1()]);
    expect(chips[0].pendiente).toBe(false);
  });
});

describe('buildAreaEntry — núcleo usado por hierarchy y chips', () => {
  it('raíz con tareas y subáreas (caso publia: administrativa)', () => {
    const entry = buildAreaEntry(ADM(), [t1(), t2(), t3()]);
    expect(entry.totalTasks).toBe(2);
    expect(entry.directTasks.map((t) => t.id)).toEqual([101]);
    expect(entry.subareas.map((s) => s.id)).toEqual([4]);
  });

  it('subárea: sólo sus tareas, sin agrupar', () => {
    const entry = buildAreaEntry(CONTAB(), [t1(), t2(), t3()]);
    expect(entry.totalTasks).toBe(1);
    expect(entry.directTasks.map((t) => t.id)).toEqual([102]);
    expect(entry.subareas).toEqual([]);
  });
});

describe('buildAreaHierarchy — sin regresión', () => {
  it('ignora level 1 e inactivas como siempre', () => {
    const h = buildAreaHierarchy([ADM(), CONTAB(), INACTIVA(), TEC()], [t1(), t2(), t3()]);
    expect(h.map((a) => a.name)).toEqual(['Administrativo', 'Técnico']);
    expect(h[0].totalTasks).toBe(2);
  });
});
