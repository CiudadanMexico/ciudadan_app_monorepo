📘 Documentación – Hook useProductos
Este hook personalizado permite interactuar con la colección productos del backend en Strapi. Incluye funciones CRUD, búsqueda personalizada y cálculo de calificaciones.

📦 Importación
js
Copiar
Editar
import { useProductos } from '@/hooks/useProductos';
📂 Estado
js
Copiar
Editar
const {
  loading,
  error,
  ...
} = useProductos();
loading: booleano que indica si hay una operación en curso.

error: almacena errores ocurridos en alguna operación.

📋 Funciones disponibles
🔍 getProductos(queryParams)
Obtiene una lista de productos con parámetros opcionales como filtros, orden y paginación.

Parámetro	Tipo	Descripción
queryParams	Object	(Opcional) Filtros, populate, etc.

📌 Ejemplo:

js
Copiar
Editar
const res = await getProductos({ 'filters[activo][$eq]': true });
🔎 getProductoById(id)
Obtiene un producto por su ID.

### `getProductoBySlug(slug: string) => Promise<Producto | null>`

Consulta un producto por su campo `slug`, útil para mostrar productos directamente en páginas con URL amigables. Este método hace una búsqueda en Strapi filtrando por el `slug` exacto y carga todos los campos relacionados (`populate: '*'`).

#### Parámetros:
- `slug` (**string**): El slug del producto que quieres cargar.

#### Retorna:
- El objeto del producto si lo encuentra, o `null` si no existe.

#### Ejemplo de uso:
```jsx
const { getProductoBySlug, producto } = useProductos();

useEffect(() => {
  getProductoBySlug('camiseta-negra-eco');
}, []);



Parámetro	Tipo	Descripción
id	String	ID del producto

📌 Ejemplo:

js
Copiar
Editar
const producto = await getProductoById("12");
➕ createProducto(producto)
Crea un nuevo producto.

Parámetro	Tipo	Descripción
producto	Object	Objeto con los datos del producto

📌 Ejemplo:

js
Copiar
Editar
await createProducto({
  nombre: "Zapatos Deportivos",
  slug: "zapatos-deportivos",
  precio: 299.99,
  activo: true,
});
✏️ updateProducto(id, producto)
Actualiza un producto existente.

Parámetro	Tipo	Descripción
id	String	ID del producto a actualizar
producto	Object	Datos nuevos del producto

📌 Ejemplo:

js
Copiar
Editar
await updateProducto("12", { precio: 349.99 });
🗑️ deleteProducto(id)
Elimina un producto por su ID.

Parámetro	Tipo	Descripción
id	String	ID del producto a borrar

📌 Ejemplo:

js
Copiar
Editar
await deleteProducto("12");
🔎 Funciones de búsqueda
buscarProductoPorSlug(slug)
Busca un único producto por su slug.

js
Copiar
Editar
const res = await buscarProductoPorSlug("zapatos-nike");
buscarProductosPorDescripcion(texto)
Busca productos cuya descripcion contenga el texto.

js
Copiar
Editar
const res = await buscarProductosPorDescripcion("cuero");
buscarProductosPorNombre(nombre)
Busca productos cuyo nombre contenga el texto dado.

js
Copiar
Editar
const res = await buscarProductosPorNombre("camisa");
buscarProductosPorMarca(marca)
Busca productos por la marca (exacta, sin distinción de mayúsculas).

js
Copiar
Editar
const res = await buscarProductosPorMarca("Adidas");
buscarProductosPorCategoria(categoriaId)
Busca productos asociados a una categoría específica (store_category).

js
Copiar
Editar
const res = await buscarProductosPorCategoria(3);
buscarProductosPorTienda({ store_id, store_email, storeId })
Busca productos relacionados a una tienda por:

store_id (campo texto)

store_email (campo texto)

store.id (relación)

js
Copiar
Editar
const res = await buscarProductosPorTienda({ store_id: "tienda123" });
buscarDestacados()
Obtiene productos con destacado: true.

js
Copiar
Editar
const res = await buscarDestacados();
buscarActivos()
Obtiene productos activos (activo: true).

js
Copiar
Editar
const res = await buscarActivos();
⭐ calcularCalificacionPromedio(calificacion, calificaciones)
Calcula la calificación promedio redondeada a 1 decimal.

Parámetro	Tipo	Descripción
calificacion	Number	Total de estrellas acumuladas
calificaciones	Number	Número de veces que se ha calificado el producto

📌 Ejemplo:

js
Copiar
Editar
const promedio = calcularCalificacionPromedio(38, 10); // 3.8
💬 Ejemplo completo de uso
jsx
Copiar
Editar
import { useEffect } from 'react';
import { useProductos } from '@/hooks/useProductos';

const ProductosDestacados = () => {
  const {
    buscarDestacados,
    loading,
    error,
  } = useProductos();

  useEffect(() => {
    const cargar = async () => {
      const res = await buscarDestacados();
      console.log(res.data);
    };
    cargar();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <div>¡Consulta la consola para ver productos!</div>;
};