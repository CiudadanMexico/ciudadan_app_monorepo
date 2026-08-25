import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth0 } from "@auth0/auth0-react";
import { useRoles } from "./RolesContext";

const FOOD_CART_STORAGE_KEY = "food_cart";
const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const FoodCartContext = createContext(null);

export const FoodCartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth0();
  const { userData } = useRoles();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [cartId, setCartId] = useState(null);

  const initialized = useRef(false);
  const syncTimeout = useRef(null);
  const syncVersion = useRef(0);

  // =========================================================
  // HELPERS
  // =========================================================
  const roundMoney = useCallback((value) => {
    return Number(Number(value || 0).toFixed(2));
  }, []);
  const getRelationId = useCallback((relation) => {
    if (!relation) return null;

    if (typeof relation === "number") {
      return relation;
    }

    if (typeof relation === "string") {
      return relation;
    }

    if (relation.id) {
      return relation.id;
    }

    if (relation.data?.id) {
      return relation.data.id;
    }

    return null;
  }, []);

  // =========================================================
  // LOCAL STORAGE
  // =========================================================
  const getLocalCart = useCallback(() => {
    try {
      const stored = localStorage.getItem(FOOD_CART_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
      console.error("FoodCart - error leyendo localStorage:", error);

      return [];
    }
  }, []);
  const saveLocalCart = useCallback((cartItems) => {
    try {
      localStorage.setItem(FOOD_CART_STORAGE_KEY, JSON.stringify(cartItems));
      notificarCambioFoodCart(cartItems ?? []);
    } catch (error) {
      console.error("FoodCart - error guardando localStorage:", error);
    }
  }, []);
  const clearLocalCart = useCallback(() => {
    try {
      localStorage.removeItem(FOOD_CART_STORAGE_KEY);
      notificarCambioFoodCart([]);
    } catch (error) {
      console.error("FoodCart - error eliminando localStorage:", error);
    }
  }, []);

  // =========================================================
  // ITEM KEY
  // =========================================================

  /**
   * Genera la identidad de una línea del carrito.
   * El mismo producto puede existir varias veces si:
   * Hamburguesa + Grande + Queso
   * es diferente de:
   * Hamburguesa + Grande + Tocino
   */
  const generarItemKey = useCallback(({
    producto,
    variante = null,
    modificadores = [],
  }) => {
    const productoId = getRelationId(producto);
    const varianteId = getRelationId(variante) || "base";

    const modifierIds = (Array.isArray(modificadores) ? modificadores : []).map((modifier) => {
      if (typeof modifier === "object") {
        return (modifier.id ?? modifier.modificador ?? modifier.modifierId ?? null);
      }
      return modifier;
    }).filter((id) => id !== null && id !== undefined).map(String).sort().join("|");

    return [
      `product:${productoId}`,
      `variant:${varianteId}`,
      `modifiers:${modifierIds}`,
    ].join("-");
  }, [getRelationId]);

  // =========================================================
  // NORMALIZAR MODIFICADORES
  // =========================================================

  const normalizarModificadores = useCallback((modificadores = []) => {
    if (!Array.isArray(modificadores)) {
      return [];
    }

    return modificadores.map((modifier) => ({
      id: modifier.id ?? modifier.modificador ?? modifier.modifierId ?? null,
      nombre: modifier.nombre ?? modifier.name ?? "",
      precio: roundMoney(modifier.precio ?? modifier.price ?? 0),
      cantidad: Number(modifier?.cantidad ?? 1),
      subtotal: roundMoney((Number(modifier.precio ?? modifier.price ?? 0) * Number(modifier?.cantidad ?? 1))),
    })
    );
  }, [roundMoney]);

  // =========================================================
  // PRECIO DE MODIFICADORES
  // =========================================================

  const calcularTotalModificadores = useCallback((modificadores = []) => {
    if (!Array.isArray(modificadores)) {
      return 0;
    }

    return roundMoney(modificadores.reduce((total, modifier) => {
      const precio = Number(modifier.precio || 0);
      const cantidad = Number(modifier.cantidad || 1);
      return (total + precio * cantidad);
    }, 0));
  }, [roundMoney]);

  // =========================================================
  // PRECIO UNITARIO
  // =========================================================

  const calcularPrecioUnitario = useCallback(({
    precio_base = 0,
    precio_variante = 0,
    modificadores = [],
  }) => {
    /**
     * La variante representa el precio final de la presentación cuando existe.
     * Si no existe variante usamos precio_base.
    */
    const precioProducto = Number(precio_variante ?? precio_base ?? 0);
    const precioModificadores = calcularTotalModificadores(modificadores);
    return roundMoney(precioProducto + precioModificadores);
  }, [calcularTotalModificadores, roundMoney,]);

  // =========================================================
  // CREAR ITEM
  // =========================================================
  const crearItem = useCallback(({
    producto,
    variante = null,
    restaurante,
    nombre,
    nombre_variante = "",
    imagen = "",
    precio_base = 0,
    precio_variante = 0,
    cantidad = 1,
    modificadores = [],
    metadata = {},
  }) => {
    const productoId = getRelationId(producto);
    const varianteId = getRelationId(variante);
    const restauranteId = getRelationId(restaurante);
    const modificadoresNormalizados = normalizarModificadores(modificadores);
    const item_key = generarItemKey({ producto: productoId, variante: varianteId, modificadores: modificadoresNormalizados, });

    const precioUnitario = calcularPrecioUnitario({
      precio_base,
      precio_variante: varianteId ? precio_variante : precio_base,
      modificadores: modificadoresNormalizados,
    });

    const cantidadNormalizada = Math.max(1, Number(cantidad || 1));

    return {
      producto: productoId,
      variante: varianteId,
      restaurante: restaurante,
      item_key,
      nombre: nombre ?? "",
      nombre_variante: nombre_variante ?? "",
      imagen: imagen ?? "",
      precio_base: roundMoney(precio_base),
      precio_variante: varianteId ? roundMoney(precio_variante) : 0,
      precio_unitario: precioUnitario,
      cantidad: cantidadNormalizada,
      subtotal: roundMoney(precioUnitario * cantidadNormalizada),
      modificadores: modificadoresNormalizados,
      metadata: metadata ?? {},
    };
  }, [getRelationId, normalizarModificadores, generarItemKey, calcularPrecioUnitario, roundMoney,]);

  // =========================================================
  // TOTALES
  // =========================================================
  const calcularSubtotal = useCallback((cartItems) => { return roundMoney(cartItems.reduce((total, item) => total + Number(item.subtotal || 0), 0)); }, [roundMoney]);
  const subtotal = useMemo(() => calcularSubtotal(items), [items, calcularSubtotal]);
  const totalItems = useMemo(() => items.reduce((total, item) => total + Number(item.cantidad || 0), 0), [items]);
  const cantidadLineas = useMemo(() => items.length, [items]);

  /**
   * Por ahora el carrito NO calcula envío.
   *
   * El envío se calculará en checkout después de seleccionar la dirección.
   */
  const montoEnvio = 0;
  const montoTotal = useMemo(() => roundMoney(subtotal + montoEnvio), [subtotal, montoEnvio, roundMoney]);

  // =========================================================
  // PAYLOAD PARA STRAPI
  // =========================================================
  const crearPayloadCart = useCallback((cartItems) => {
    const subtotalActual = calcularSubtotal(cartItems);

    return {
      data: {
        usuario: userData?.id || null,
        items: cartItems.map((item) => ({
          producto: getRelationId(item.producto),
          variante: getRelationId(item.variante),
          restaurante: getRelationId(item.restaurante),
          item_key: item.item_key,
          nombre: item.nombre || "",
          nombre_variante: item.nombre_variante || "",
          imagen: item.imagen || "",
          precio_base: roundMoney(item.precio_base),
          precio_variante: roundMoney(item.precio_variante),
          precio_unitario: roundMoney(item.precio_unitario),
          cantidad: Number(item.cantidad || 1),
          subtotal: roundMoney(item.subtotal),
          modificadores: item.modificadores || [],
          metadata: item.metadata || {},
        })),
        subtotal: subtotalActual,
        monto_envio: 0,
        monto_total: subtotalActual,
        moneda: "MXN",
        estado: "activo",
        ultima_actualizacion: new Date().toISOString(),
      },
    };
  }, [userData, calcularSubtotal, getRelationId, roundMoney,]);

  // =========================================================
  // OBTENER FOOD CART DE STRAPI
  // =========================================================

  const obtenerFoodCart = useCallback(async () => {
    if (!isAuthenticated || !user || userData) {
      return null;
    }

    try {
      const url = `${STRAPI_URL}/api/food-carts` + `?filters[usuario][id][$eq]=${encodeURIComponent(userData.id)}` + `&filters[estado][$eq]=activo`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error obteniendo food cart: ${response.status}`);
      }

      const json = await response.json();

      return (json?.data?.[0] ?? null);
    } catch (error) {
      console.error("FoodCart - obtenerFoodCart:", error);
      throw error;
    }
  }, [STRAPI_URL, isAuthenticated, userData, user]);

  // =========================================================
  // NORMALIZAR ITEM DESDE STRAPI
  // =========================================================

  const normalizarItemBackend = useCallback((item) => {
    if (!item) {
      return null;
    }

    /**
     * Componentes repeatables de Strapi pueden llegar como:
     * item.attributes
     * o directamente como objeto, dependiendo de la versión/configuración.
     */

    const attributes = item.attributes ?? item;
    const producto = attributes.producto;
    const variante = attributes.variante;
    const restaurante = attributes.restaurante;

    return {
      producto: getRelationId(producto),
      variante: getRelationId(variante),
      restaurante: getRelationId(restaurante),
      item_key: attributes.item_key,
      nombre: attributes.nombre || "",
      nombre_variante: attributes.nombre_variante || "",
      imagen: attributes.imagen || "",
      precio_base: roundMoney(attributes.precio_base),
      precio_variante: roundMoney(attributes.precio_variante),
      precio_unitario: roundMoney(attributes.precio_unitario),
      cantidad: Number(attributes.cantidad || 1),
      subtotal: roundMoney(attributes.subtotal),
      modificadores: Array.isArray(attributes.modificadores) ? attributes.modificadores : [],
      metadata: attributes.metadata || {},
    };
  }, [getRelationId, roundMoney,]);

  // =========================================================
  // CARGAR CART DESDE STRAPI
  // =========================================================

  const cargarCartDesdeStrapi = useCallback(async () => {
    const carrito = await obtenerFoodCart();

    if (!carrito) {
      return null;
    }

    setCartId(carrito.id);

    const attributes = carrito.attributes || carrito;
    let backendItems = attributes.items;

    if (backendItems?.data && Array.isArray(backendItems.data)) {
      backendItems = backendItems.data;
    }

    if (!Array.isArray(backendItems)) {
      backendItems = [];
    }
    const normalizedItems = backendItems.map(normalizarItemBackend).filter(Boolean);

    return {
      ...carrito,
      items: normalizedItems,
    };
  }, [obtenerFoodCart, normalizarItemBackend,]);

  // =========================================================
  // MERGE LOCAL + SERVIDOR
  // =========================================================

  const mergeItems = useCallback((localItems, serverItems) => {
    const merged = [];

    const index = new Map();

    const agregar = (item) => {
      if (!item?.item_key) {
        return;
      }

      const existingIndex = index.get(item.item_key);

      if (existingIndex === undefined) {
        index.set(item.item_key, merged.length);

        merged.push({
          ...item,
        });

        return;
      }

      const existente = merged[existingIndex];

      /**
       * Si el mismo item existe localmente y en servidor, sumamos cantidades.
       */
      const cantidad = Number(existente.cantidad || 0) + Number(item.cantidad || 0);

      merged[existingIndex] = {
        ...existente,
        cantidad,
        subtotal: roundMoney(Number(existente.precio_unitario || item.precio_unitario || 0) * cantidad),
      };
    };

    localItems.forEach(agregar);

    serverItems.forEach(agregar);

    return merged;
  }, [roundMoney]);

  // =========================================================
  // SINCRONIZAR CON STRAPI
  // =========================================================

  const sincronizarConStrapi = useCallback(async (cartItems = items) => {
    if (!isAuthenticated || !user) {
      return null;
    }

    const currentVersion = ++syncVersion.current;

    try {
      setSyncing(true);
      setSyncError(null);

      const payload = crearPayloadCart(cartItems);

      /**
       * Buscamos nuevamente el carrito.
       * Esto evita depender únicamente del cartId almacenado en React.
       */
      let carrito = null;

      try {
        carrito = await obtenerFoodCart();
      } catch (error) {
        console.error("FoodCart - error consultando carrito antes de sincronizar:", error);
      }

      let response;

      if (carrito?.id) {
        setCartId(carrito.id);

        response = await fetch(`${STRAPI_URL}/api/food-carts/${carrito.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
      } else {
        response = await fetch(`${STRAPI_URL}/api/food-carts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
      }

      if (!response.ok) {
        throw new Error(`Error sincronizando food cart: ${response.status}`);
      }

      const responseJson = await response.json();

      if (currentVersion === syncVersion.current) {
        setCartId(responseJson?.data?.id || carrito?.id || null);
      }

      return responseJson?.data;
    } catch (error) {
      console.error("FoodCart - sincronizarConStrapi:", error);
      setSyncError(error);
      return null;
    } finally {
      if (currentVersion === syncVersion.current) {
        setSyncing(false);
      }
    }
  }, [items, isAuthenticated, user, crearPayloadCart, obtenerFoodCart, STRAPI_URL,]);

  // =========================================================
  // DEBOUNCE DE SINCRONIZACIÓN
  // =========================================================

  const programarSincronizacion = useCallback((cartItems) => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
    }

    syncTimeout.current = setTimeout(() => {
      sincronizarConStrapi(cartItems);
    }, 500);
  }, [isAuthenticated, user, sincronizarConStrapi,]);

  // =========================================================
  // ADD ITEM
  // =========================================================

  const addItem = useCallback((itemData) => {
    const nuevoItem = crearItem(itemData);

    setItems((previousItems) => {
      const index = previousItems.findIndex((item) => item.item_key === nuevoItem.item_key);
      let nuevosItems;
      if (index >= 0) {
        nuevosItems = [...previousItems,];

        const existing = nuevosItems[index];
        const nuevaCantidad = Number(existing.cantidad || 0) + Number(nuevoItem.cantidad || 0);
        nuevosItems[index] = {
          ...existing,
          cantidad: nuevaCantidad,
          subtotal: roundMoney(Number(existing.precio_unitario || nuevoItem.precio_unitario || 0) * nuevaCantidad),
        };
      } else {
        nuevosItems = [
          ...previousItems,
          nuevoItem,
        ];
      }
      saveLocalCart(nuevosItems);
      programarSincronizacion(nuevosItems);
      return nuevosItems;
    });

    return nuevoItem;
  }, [crearItem, roundMoney, saveLocalCart, programarSincronizacion,]);

  // =========================================================
  // UPDATE QUANTITY
  // =========================================================

  const updateQuantity = useCallback((itemKey, nuevaCantidad) => {
    const cantidad = Number(nuevaCantidad);
    setItems((previousItems) => {
      let nuevosItems;

      if (cantidad <= 0) {
        nuevosItems = previousItems.filter((item) => item.item_key !== itemKey);
      } else {
        nuevosItems = previousItems.map((item) => {
          if (item.item_key !== itemKey) {
            return item;
          }

          return {
            ...item,
            cantidad,
            subtotal: roundMoney(Number(item.precio_unitario || 0) * cantidad),
          };
        });
      }

      saveLocalCart(nuevosItems);

      programarSincronizacion(nuevosItems);

      return nuevosItems;
    });
  }, [roundMoney, saveLocalCart, programarSincronizacion,]);

  // =========================================================
  // REMOVE ITEM
  // =========================================================

  const removeItem = useCallback((itemKey) => {
    setItems((previousItems) => {
      const nuevosItems = previousItems.filter((item) => item.item_key !== itemKey);
      saveLocalCart(nuevosItems);
      programarSincronizacion(nuevosItems);
      return nuevosItems;
    });
  }, [saveLocalCart, programarSincronizacion,]);

  // =========================================================
  // CLEAR CART
  // =========================================================

  const clearCart = useCallback(async () => {
    setItems([]);
    setCartId(null);
    clearLocalCart();
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      const carrito = await obtenerFoodCart();

      if (!carrito?.id) {
        return;
      }

      const payload = {
        data: {
          items: [],
          subtotal: 0,
          monto_envio: 0,
          monto_total: 0,
          estado: "abandonado",
          ultima_actualizacion: new Date().toISOString(),
        },
      };

      await fetch(`${STRAPI_URL}/api/food-carts/${carrito.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
    } catch (error) {
      console.error("FoodCart - clearCart:", error);
    }
  }, [clearLocalCart, isAuthenticated, user, obtenerFoodCart, STRAPI_URL,]);

  // =========================================================
  // AGRUPAR POR RESTAURANTE
  // =========================================================

  const getItemsByRestaurant = useCallback(() => {
    return items.reduce((groups, item) => {
      const restaurantId = getRelationId(item.restaurante);

      if (!restaurantId) {
        return groups;
      }

      if (!groups[restaurantId]) {
        groups[restaurantId] = [];
      }

      groups[restaurantId].push(item);
      return groups;
    }, {});
  }, [items, getRelationId,]);

  // =========================================================
  // OBTENER ITEMS DE UN RESTAURANTE
  // =========================================================

  const getItemsByRestaurantId = useCallback((restaurantId) => {
    return items.filter((item) => String(getRelationId(item.restaurante)) === String(restaurantId));
  }, [items, getRelationId]);

  // =========================================================
  // SUBTOTAL POR RESTAURANTE
  // =========================================================

  const getRestaurantSubtotal = useCallback((restaurantId) => {
    return roundMoney(getItemsByRestaurantId(restaurantId).reduce((total, item) => total + Number(item.subtotal || 0), 0));
  }, [getItemsByRestaurantId, roundMoney,]);

  const notificarCambioFoodCart = (itemsActualizados) => {
    const itemCount = itemsActualizados.reduce((total, item) => total + (item.cantidad || 0), 0);

    localStorage.setItem("foodCartItemCount", String(itemCount));

    window.dispatchEvent(
      new CustomEvent("foodCartLocalActualizado", {
        detail: {
          itemCount,
        },
      })
    );
  };

  // =========================================================
  // CANTIDAD DE RESTAURANTES
  // =========================================================

  const restaurantIds = useMemo(() => {
    return [...new Set(items.map((item) => getRelationId(item.restaurante)).filter(Boolean)),];
  }, [items, getRelationId,]);

  const restaurantCount = restaurantIds.length;

  // =========================================================
  // INICIALIZACIÓN
  // =========================================================

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    const initialize = async () => {
      try {
        setLoading(true);
        // -----------------------------------------------
        // 1. Cargar carrito local
        // -----------------------------------------------

        const localItems = getLocalCart();
        setItems(localItems);

        // -----------------------------------------------
        // 2. Si no está autenticado, terminamos aquí.
        // -----------------------------------------------

        if (!isAuthenticated || !user) {
          initialized.current = true;
          return;
        }

        // -----------------------------------------------
        // 3. Obtener carrito servidor
        // -----------------------------------------------

        const serverCart = await cargarCartDesdeStrapi();
        const serverItems = serverCart?.items || [];

        // -----------------------------------------------
        // 4. Merge
        // -----------------------------------------------

        let finalItems;

        if (localItems.length > 0 && serverItems.length > 0) {
          finalItems = mergeItems(localItems, serverItems);
        } else if (localItems.length > 0) {
          finalItems = localItems;
        } else {
          finalItems = serverItems;
        }

        // -----------------------------------------------
        // 5. Guardar resultado
        // -----------------------------------------------

        setItems(finalItems);
        saveLocalCart(finalItems);

        // -----------------------------------------------
        // 6. Sincronizar resultado final
        // -----------------------------------------------

        if (finalItems.length > 0) {
          await sincronizarConStrapi(finalItems);
        }

        initialized.current = true;
      } catch (error) {
        console.error("FoodCart - error inicializando:", error);

        setSyncError(error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
    };
  }, [isAuthenticated, user]);

  // =========================================================
  // LIMPIEZA DEL TIMEOUT
  // =========================================================

  useEffect(() => {
    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
    };
  }, []);

  // =========================================================
  // CONTEXT VALUE
  // =========================================================

  const value = {
    // ---------------------------------------------
    // Estado
    // ---------------------------------------------
    items,
    cartId,
    loading,
    syncing,
    syncError,

    // ---------------------------------------------
    // Totales
    // ---------------------------------------------
    subtotal,
    montoEnvio,
    montoTotal,
    totalItems,
    cantidadLineas,
    restaurantCount,
    restaurantIds,

    // ---------------------------------------------
    // Items
    // ---------------------------------------------
    addItem,
    updateQuantity,
    removeItem,
    clearCart,

    // ---------------------------------------------
    // Restaurantes
    // ---------------------------------------------
    getItemsByRestaurant,
    getItemsByRestaurantId,
    getRestaurantSubtotal,

    // ---------------------------------------------
    // Helpers
    // ---------------------------------------------
    generarItemKey,
    crearItem,
    calcularSubtotal,
    calcularPrecioUnitario,
    calcularTotalModificadores,

    // ---------------------------------------------
    // Persistencia
    // ---------------------------------------------
    obtenerFoodCart,
    sincronizarConStrapi,
  };

  return (
    <FoodCartContext.Provider
      value={value}
    >
      {children}
    </FoodCartContext.Provider>
  );
};

// =========================================================
// HOOK
// =========================================================

export const useFoodCart = () => {
  const context = useContext(FoodCartContext);

  if (!context) {
    throw new Error("useFoodCart debe utilizarse dentro de FoodCartProvider");
  }

  return context;
};