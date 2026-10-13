# Cómo usar la Wiki y los Enlaces (Wikilinks)

La Wiki de Ciudadan funciona parecido a **Obsidian**: puedes crear páginas en Markdown y
**conectar una página con otra** escribiendo su nombre entre dobles corchetes.

## 1. Navegar por el visor

- En el panel izquierdo está el **árbol de documentos** (Explorador Wiki).
- Haz clic en una **carpeta** para expandir/colapsar, y en un **documento** para abrirlo
  a la derecha.
- Cambia de sección con las pestañas (`main`, `help`, `faq`).

## 2. Crear un enlace entre documentos (wikilink)

Escribe el nombre de la página de destino entre dobles corchetes:

```text
[[Otro Articulo]]
```

Se verá como un enlace azul subrayado. Al hacer clic se **abre esa página al instante**
dentro del mismo visor (sin recargar). Prueba clic en este enlace real:
[[Otro Articulo]].

## 3. Mostrar un texto distinto al nombre (alias)

Usa el formato con `|`:

```text
[[Preguntas Frecuentes|Ver las preguntas frecuentes]]
```

En pantalla solo se ve **"Ver las preguntas frecuentes"** pero enlaza a la página:
[[Preguntas Frecuentes|Ver las preguntas frecuentes]].

## 4. Enlazar a una sección (ancla)

Usa `#` seguido del encabezado:

```text
[[Como Funciona#Contenido relacionado|ver relacionados]]
```

Enlace real con ancla: [[Como Funciona#Contenido relacionado|ver relacionados]].

## 5. ¿Qué pasa si el enlace no existe todavía?

El enlace se muestra **pendiente** (sin estilo de destino resuelto). Cuando se cree una
página con ese nombre, el enlace empezará a funcionar automáticamente.

## 6. Consejos

- Enlaza con el **título** o el **nombre de archivo**; no importan mayúsculas ni espacios.
- No pongas la extensión `.md` ni la carpeta al enlazar.
- El sistema elige el destino por nombre de archivo si hay coincidencia en cualquier sección.

---
*Esta página usa wikilinks reales a otras páginas. ¡Pruébalos!*