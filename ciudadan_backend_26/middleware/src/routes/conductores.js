import express from 'express';
import { verifyAuth0Token } from '../auth0.js';
import { strapiRequest } from '../strapiService.js';

const router = express.Router();

const normalizeUser = (item) => {
  if (!item) return null;
  if (item.attributes) return { id: item.id, ...item.attributes };
  return item;
};

router.post('/preregistro', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token Auth0' });

    const token = auth.replace('Bearer ', '');
    const decoded = await verifyAuth0Token(token);
    const email = decoded.email;

    if (!email) {
      return res.status(400).json({ error: 'El token no trae email' });
    }

    const {
      nombre_completo,
      telefono,
      fecha_nacimiento,
      ciudad,
      curp,
      rfc,
      fecha,
      hora,
      documentos = {},
    } = req.body;

    const usersRes = await strapiRequest({
      method: 'GET',
      url: '/api/users',
      params: {
        'filters[email][$eq]': email,
      },
    });

    const usersRaw = Array.isArray(usersRes.data)
      ? usersRes.data
      : usersRes.data?.data || [];

    const user = normalizeUser(usersRaw[0]);

    if (!user?.id) {
      return res.status(404).json({ error: `No se encontró usuario con email ${email}` });
    }

    const start = new Date(`${fecha}T00:00:00`).toISOString();
    const end = new Date(`${fecha}T23:59:59`).toISOString();

    const agendaCheck = await strapiRequest({
      method: 'GET',
      url: '/api/agendas',
      params: {
        'filters[usuario][id][$eq]': user.id,
        'filters[descripcion][$containsi]': 'Preregistro conductor',
        'filters[estado][$eq]': 'pendiente',
        'filters[fecha_inicio][$gte]': start,
        'filters[fecha_inicio][$lte]': end,
      },
    });

    const existing = agendaCheck.data?.data || [];
    if (existing.length) {
      const first = existing[0];
      return res.status(409).json({
        error: 'Ya tienes una cita de conductor pendiente',
        agenda: normalizeUser(first),
      });
    }

    const fechaISO = new Date(`${fecha}T${hora}:00`).toISOString();

    const agendaPayload = {
      data: {
        titulo: `Cita conductor ${nombre_completo || user.nombre_completo || user.username || email}`,
        slug: `preregistro-conductor-${user.id}-${Date.now()}`,
        usuario: user.id,
        ciudad,
        estado: 'pendiente',
        fecha_inicio: fechaISO,
        descripcion: 'Preregistro conductor',
        observaciones: 'preregistro conductor',
        checked: false,
        metadata: {
          preregistro_conductor: {
            version: 1,
            user_id: user.id,
            email,
            nombre_completo,
            telefono,
            fecha_nacimiento,
            ciudad,
            curp,
            rfc,
            documentos,
            revisado_en: new Date().toISOString(),
          },
        },
      },
    };

    const createAgenda = await strapiRequest({
      method: 'POST',
      url: '/api/agendas',
      data: agendaPayload,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return res.json({
      ok: true,
      user,
      agenda: createAgenda.data,
    });
  } catch (err) {
    console.error('❌ preregistro conductor:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json(
      err.response?.data || { error: 'Error en preregistro conductor' }
    );
  }
});

router.put('/procesar/:agendaId', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token Auth0' });

    const token = auth.replace('Bearer ', '');
    const decoded = await verifyAuth0Token(token);
    const email = decoded.email;

    if (!email) {
      return res.status(400).json({ error: 'El token no trae email' });
    }

    const { agendaId } = req.params;
    const { estado, observaciones } = req.body;

    const usersRes = await strapiRequest({
      method: 'GET',
      url: '/api/users',
      params: {
        'filters[email][$eq]': email,
      },
    });

    const usersRaw = Array.isArray(usersRes.data)
      ? usersRes.data
      : usersRes.data?.data || [];

    const user = normalizeUser(usersRaw[0]);

    if (!user?.id) {
      return res.status(404).json({ error: 'No se encontró usuario' });
    }

    const updateAgenda = await strapiRequest({
      method: 'PUT',
      url: `/api/agendas/${agendaId}`,
      data: {
        data: {
          estado,
          checked: true,
          observaciones,
          metadata: {
            procesado_en: new Date().toISOString(),
            procesado_por: user.id,
          },
        },
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (estado === 'aprobada') {
      const currentRoles = user.roles && typeof user.roles === 'object' && !Array.isArray(user.roles)
        ? user.roles
        : {};

      const extra = Array.isArray(currentRoles.extra) ? currentRoles.extra : [];
      const nextExtra = Array.from(new Set([...extra, 'conductor']));

      await strapiRequest({
        method: 'PUT',
        url: `/api/users/${user.id}`,
        data: {
          data: {
            roles: {
              ...currentRoles,
              extra: nextExtra,
            },
            verificado: true,
          },
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return res.json({
      ok: true,
      agenda: updateAgenda.data,
    });
  } catch (err) {
    console.error('❌ procesar conductor:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json(
      err.response?.data || { error: 'Error procesando conductor' }
    );
  }
});

export default router;