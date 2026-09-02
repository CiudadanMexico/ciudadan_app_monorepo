'use strict';

/**
 * GET /api/agendas/conductores-pendientes
 *
 * Lista las citas de preregistro de conductor pendientes de verificar,
 * filtradas por "agencia matriz" (chat.md: "en conductores no debe
 * demostrar a los que sean de otra agencia, debe demostrar a los que no
 * tengan agencia o sean de la agencia matriz").
 *
 * La agencia matriz se resuelve del singleType `my-agency` (relación
 * `agencia`) si está configurada; si no, se usa la agencia con el id más
 * bajo como respaldo (chat.md: "por ahorita la agencia matriz va a ser la
 * primera que crees, tu primer registro... el registro que tenga la ID
 * menor").
 *
 * Devuelve el mismo shape que el `find` REST estándar ({id, attributes})
 * para no tener que tocar el consumidor en el frontend
 * (components/Cowork/ConductoresAgencia.jsx).
 */

const AGENCIA_UID = 'api::agencia.agencia';
const MY_AGENCY_UID = 'api::my-agency.my-agency';
const AGENDA_UID = 'api::agenda.agenda';

const resolverAgenciaMatrizId = async () => {
  const myAgency = await strapi.db.query(MY_AGENCY_UID).findOne({
    populate: { agencia: true },
  });
  if (myAgency?.agencia?.id) return myAgency.agencia.id;

  const [primera] = await strapi.db.query(AGENCIA_UID).findMany({
    orderBy: { id: 'asc' },
    limit: 1,
  });
  return primera?.id || null;
};

module.exports = {
  async conductoresPendientes(ctx) {
    const matrizId = await resolverAgenciaMatrizId();

    const agendas = await strapi.db.query(AGENDA_UID).findMany({
      where: {
        descripcion: { $containsi: 'Preregistro conductor' },
        estado: { $in: ['pendiente', 'en_revision', 'resubir_archivos'] },
      },
      populate: { usuario: { populate: { agencia: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const filtradas = agendas.filter((agenda) => {
      const agenciaId = agenda.usuario?.agencia?.id || null;
      if (!agenciaId) return true; // sin agencia: se muestra
      return matrizId ? Number(agenciaId) === Number(matrizId) : false;
    });

    ctx.body = {
      data: filtradas.map(({ id, usuario, ...attributes }) => ({ id, attributes })),
    };
  },
};
