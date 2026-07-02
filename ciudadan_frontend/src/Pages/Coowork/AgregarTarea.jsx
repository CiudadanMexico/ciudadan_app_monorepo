import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import useTodos from '../../hooks/useTodos';
import { useNavigate } from 'react-router-dom';

const STRAPI = process.env.REACT_APP_STRAPI_URL || 'http://localhost:1337';

const getAttributes = (item) => item?.attributes || item || {};

const getRelationItem = (relation) => relation?.data ?? relation ?? null;

const getAreaParentId = (area) => {
  const attrs = getAttributes(area);
  const parentArea = getRelationItem(attrs.parent_area);

  if (!parentArea) return null;

  return parentArea.id ?? getAttributes(parentArea).id ?? null;
};

const isParentArea = (area) => {
  const attrs = getAttributes(area);

  return Number(attrs.nivel ?? 0) === 0 && !getAreaParentId(area);
};

export default function AgregarTarea() {
  const { user } = useAuth0();
  const navigate = useNavigate();
  const { createTodo } = useTodos();

  const [allAreas, setAllAreas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [subareas, setSubareas] = useState([]);

  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [subareaSeleccionada, setSubareaSeleccionada] = useState(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [tipo, setTipo] = useState('tarea');
  const [ambito, setAmbito] = useState('plataforma');
  const [nivel, setNivel] = useState('general');
  const [recurrencia, setRecurrencia] = useState('unica');

  const [minutos, setMinutos] = useState(0);
  const [laborys, setLaborys] = useState(0);
  const [efectivo, setEfectivo] = useState(0);

  const [vence, setVence] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState('');

  // ---------------------
  // CARGAR AREAS
  // ---------------------

  useEffect(() => {
    async function fetchAreas() {
      const res = await fetch(
        `${STRAPI}/api/areas?populate[parent_area]=*&pagination[limit]=1000&sort[0]=nombre:asc`
      );

      const json = await res.json();

      const lista = json.data || [];

      setAllAreas(lista);

      const principales = lista.filter(isParentArea);

      setAreas(principales);
    }

    fetchAreas();
  }, []);

  // ---------------------
  // CARGAR SUBAREAS
  // ---------------------

  useEffect(() => {
    if (!areaSeleccionada) {
      setSubareas([]);
      return;
    }

    const areaSubareas = allAreas.filter(
      (area) => Number(getAreaParentId(area)) === Number(areaSeleccionada)
    );

    setSubareas(areaSubareas);
  }, [allAreas, areaSeleccionada]);

  // ---------------------
  // SUBMIT
  // ---------------------

  const submit = async (e) => {
    e.preventDefault();

    try {
      if (!areaSeleccionada) {
        throw new Error('Selecciona un área principal.');
      }

      await createTodo({
        titulo,
        descripcion,

        tipo,
        ambito,
        nivel,
        recurrencia,

        minutos_desarrollo: minutos,

        pagos_laborys: laborys,
        pagos_efectivo: efectivo,

        vence,
        fecha_entrega: vence ? fechaEntrega : null,

        areas: [areaSeleccionada],
        subareas: subareaSeleccionada ? [subareaSeleccionada] : [],

        creador: user?.sub || null,

        status: 'publicada',

        fecha_publicacion: new Date().toISOString(),
      });

      alert('Tarea creada');
      navigate('/coowork?tab=generales');
    } catch (err) {
      alert(err.message || 'No se pudo crear la tarea');
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h2 style={styles.title}>Agregar Tarea</h2>

        <form onSubmit={submit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />

          <textarea
            style={styles.textarea}
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          {/* AREA */}

          <select
            style={styles.input}
            value={areaSeleccionada || ''}
            onChange={(e) => {
              setAreaSeleccionada(e.target.value);
              setSubareaSeleccionada(null);
            }}
          >
            <option value="">Área</option>

            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.attributes.nombre}
              </option>
            ))}
          </select>

          {/* SUBAREA */}

          {subareas.length > 0 && (
            <select
              style={styles.input}
              value={subareaSeleccionada || ''}
              onChange={(e) => setSubareaSeleccionada(e.target.value)}
            >
              <option value="">Subárea</option>

              {subareas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.attributes.nombre}
                </option>
              ))}
            </select>
          )}

          {/* ENUMS */}

          <select style={styles.input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="tarea">Tarea</option>
            <option value="subtarea">Subtarea</option>
          </select>

          <select style={styles.input} value={ambito} onChange={(e) => setAmbito(e.target.value)}>
            <option value="privada">Privada</option>
            <option value="plataforma">Plataforma</option>
          </select>

          <select style={styles.input} value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="general">General</option>
            <option value="becarios">Becarios</option>
            <option value="especialidad">Especialidad</option>
            <option value="experto">Experto</option>
            <option value="personalizada">Personalizada</option>
          </select>

          <select
            style={styles.input}
            value={recurrencia}
            onChange={(e) => setRecurrencia(e.target.value)}
          >
            <option value="unica">Única</option>
            <option value="abierta">Abierta</option>
            <option value="periodica">Periódica</option>
          </select>

          {/* MINUTOS */}

          <label style={styles.label}>Minutos desarrollo: {minutos}</label>

          <input
            type="range"
            min="0"
            max="240"
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
          />

          {/* PAGOS */}

          <input
            style={styles.input}
            placeholder="Pago Laborys"
            value={laborys}
            onChange={(e) => setLaborys(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Pago efectivo"
            value={efectivo}
            onChange={(e) => setEfectivo(e.target.value)}
          />

          {/* FECHA */}

          <label style={styles.label}>
            <input type="checkbox" checked={vence} onChange={() => setVence(!vence)} />
            {' '}
            Tiene fecha de entrega
          </label>

          {vence && (
            <input
              type="date"
              style={styles.input}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          )}

          <button style={styles.button}>CREAR TAREA</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    background: '#013b0c',
    padding: 30,
    borderRadius: 12,
    width: '100%',
    maxWidth: 520,
  },

  title: {
    color: 'white',
    marginBottom: 20,
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  input: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ccc',
    background: 'white',
  },

  textarea: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ccc',
    background: 'white',
    minHeight: 90,
  },

  label: {
    color: 'white',
    fontSize: 14,
  },

  button: {
    background: '#fff200',
    padding: 14,
    border: 'none',
    borderRadius: 8,
    fontWeight: 'bold',
  },
};
