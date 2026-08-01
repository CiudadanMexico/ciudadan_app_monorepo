import { useState, useEffect, useCallback } from 'react';

const STRAPI_URL = process.env?.REACT_APP_STRAPI_URL ?? 'http://localhost:1337';
const PEDIDOS_URL = `${STRAPI_URL}/api/pedidos`;
const PAGOS_URL = `${STRAPI_URL}/api/pagos`;
const DEFAULT_RESPONSE = { data: [], meta: {} };

export const useStoreAdminPedidos = () => {
  const [cargando, setCargando] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '' });

  const getStoreBySlug = async (slug, email, onError) => {
    if (!email) return null;
    setCargando(true);
    try {
      const url = `${STRAPI_URL}/api/stores?filters[slug][$eq]=${slug}&filters[email][$eq]=${encodeURIComponent(email)}&populate=imagen*`;
      const res = await fetch(url);
      const json = await res.json();
      const found = json?.data[0];
      return found;
    } catch (error) {
      console.error("Error al obtener tienda:", error);
      onError && onError();
      return null;
    } finally {
      setCargando(false);
    }
  };

  const getPedidosPendientes = async (store_id) => {
    if (!store_id) return [];
    setCargando(true);
    try {
      const populateStr = "populate[item][populate][producto][populate]=imagen_predeterminada&populate[pago_id][populate][comprobante]=*";
      const filtersStr = `filters[store][id][$eq]=${store_id}&filters[finalizado][$eq]=false`;
      const sortStr = 'sort=status';
      const response = await fetch(`${PEDIDOS_URL}?${filtersStr}&${populateStr}&${sortStr}`);
      const responseData = await response.json();
      return responseData ?? DEFAULT_RESPONSE;
    } catch (error) {
      console.error("Error al obtener pedidos pendientes: ", error);
      setTimeout(() => setSnack({ open: true, message: 'Error cargando pedidos pendientes' }), 1200);
      return DEFAULT_RESPONSE;
    } finally {
      setCargando(false);
    }
  };

  const getPedidosEntregados = async (store_id) => {
    if (!store_id) return [];
    setCargando(true);
    try {
      const populateStr = "populate[item][populate][producto][populate]=imagen_predeterminada&populate[pago_id][populate][comprobante]=*";
      const filtersStr = `filters[store][id][$eq]=${store_id}&filters[finalizado][$eq]=true`;
      const sortStr = 'sort=status';
      const response = await fetch(`${PEDIDOS_URL}?${filtersStr}&${populateStr}&${sortStr}`);
      const responseData = await response.json();
      return responseData ?? DEFAULT_RESPONSE;
    } catch (error) {
      console.error("Error al obtener pedidos entregados: ", error);
      setTimeout(() => setSnack({ open: true, message: 'Error cargando pedidos entregados' }), 1200);
      return DEFAULT_RESPONSE;
    } finally {
      setCargando(false);
    }
  };

  /**
   * patchPedido:
   * Helper para actualizar un pedido en Strapi usando PUT (mantengo PUT como en el original).
   * Actualiza el state local para remover el pedido (si cambió a enviado) y muestra snack.
   * @param {number} pedidoId
   * @param {{}} body
   * @return {object}
   */
  const patchPedido = async (pedidoId, body = {}) => {
    setApiLoading(true);
    try {

      const res = await fetch(`${PEDIDOS_URL}/${pedidoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: body }),
      });

      const json = await res.json();
      setTimeout(() => setSnack({ open: true, message: 'Pedido actualizado' }), 1200);
      return json?.data;
    } catch (err) {
      setTimeout(() => setSnack({ open: true, message: 'Error actualizando pedido' }), 1200);
      return null;
    } finally {
      setApiLoading(false);
    }
  };

  const patchPago = async (pagoId, body = {}) => {
    setApiLoading(true);

    try {
      const response = await fetch(`${PAGOS_URL}/${pagoId}`,{
        method:'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      const json = await response.json();
      return json?.data;
    } catch (error) {
      console.error("Error al actualizar pago:", error);
      return null;
    }finally{
      setApiLoading(false);
    }
  };

  return {
    cargando,
    apiLoading,
    snack,
    setSnack,
    patchPedido,
    getStoreBySlug,
    getPedidosPendientes,
    getPedidosEntregados,
    patchPago,
  };
};
