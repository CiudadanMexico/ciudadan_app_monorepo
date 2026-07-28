import { useState, useEffect, useCallback } from 'react';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:1337';

export const useStoreAdminPedidos = (user, buildHeaders, mode = "store") => {
  const [pedidos, setPedidos] = useState([]);
  const [store, setStore] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '' });

  const fetchData = useCallback(async () => {
    if (!user?.email) return;

    setCargando(true);

    try {
      const q = `${STRAPI_URL}/api/stores?filters[email][$eqi]=${encodeURIComponent(user.email)}&populate=*`;
      const res = await fetch(q);
      const json = await res.json();

      const found = json?.data?.[0];
      if (!found) {
        setStore(null);
        setPedidos([]);
        return;
      }

      setStore(found);

      let pedidosUrl = ""
      if (mode === 'store'){
        pedidosUrl = `${STRAPI_URL}/api/pedidos?filters[store][id][$eq]=${found.id}&populate=*`;
      }

      if (mode === "user") {
        pedidosUrl =
            `${STRAPI_URL}/api/pedidos?filters[usuario][email][$eq]=${encodeURIComponent(
            user.email
            )}&populate=deep,3&sort[0]=id:desc`;
      }

      const res2 = await fetch(pedidosUrl);
      const json2 = await res2.json();

      setPedidos(json2?.data || []);
    } catch (err) {
      setSnack({ open: true, message: 'Error cargando pedidos' });
    } finally {
      setCargando(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const patchPedido = async (pedidoId, body) => {
    setApiLoading(true);
    try {
      const headers = await buildHeaders();

      const res = await fetch(`${STRAPI_URL}/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ data: body }),
      });

      const json = await res.json();

      if (json?.data) {
        setPedidos(prev => prev.filter(p => p.id !== pedidoId));
        return json.data;
      }
    } catch (err) {
      setSnack({ open: true, message: 'Error actualizando pedido' });
    } finally {
      setApiLoading(false);
    }
  };

  return {
    pedidos,
    store,
    cargando,
    apiLoading,
    snack,
    setSnack,
    patchPedido,
    refetch: fetchData,
  };
};
