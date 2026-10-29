# CLINE-HUB — Registro de la flota temporal y procedimiento de rotación de llaves

- **Fecha:** 2026-10-29
- **Rama:** `feature/cline-hub-temporales-1029` (creada desde `origin/main` = `0e5f6c1`)
- **Autor:** agente `temporal3-agent1` (nodo `temporal-3`)
- **Encargo:** T4 — registro verificable de la flota + procedimiento de rotación/reasignación de llaves NVIDIA
- **Alcance:** inventario, regla de asignación, procedimientos y registro `cline-hub` listo para aplicar por el operador.

> ⚠️ **Este documento no contiene secretos.** Solo *fingerprints* `sha256/8` (8 hex) de las
> llaves NVIDIA. Ningún valor de llave, token o variable sensible se imprime, se transcribe
> ni se versiona. La configuración de Cline **solo se leyó**: no se modificó ningún archivo
> de ningún contenedor.

> 📎 **YAML adjunto:** [`docs/cline-hub-temporales.yaml`](./cline-hub-temporales.yaml) — el
> mismo registro en YAML válido, para que el operador lo incorpore a
> `~/.dsh/infrastructure/agents.yaml` (fuera de este workspace; **no** se tocó).

---

## 1. Resumen ejecutivo

1. La flota son **13 contenedores en 3 nodos OCI** (`temporal-1`, `temporal-2`, `temporal-3`),
   todos con el mismo proyecto (`ciudadan_app_monorepo`) y el mismo modelo Cline
   (`minimaxai/minimax-m3.1-flash`) vía el proveedor `nvidia`.
2. Se repartieron **8 llaves NVIDIA distintas** (9 aportadas, 1 descartada por duplicada):
   **3 contenedores con llave exclusiva** y **10 contenedores en 5 pares** que comparten
   llave, **siempre entre nodos distintos**.
3. Desde dentro de este contenedor **solo se pudo verificar 1 de 13**:
   `temporal3-agent1` → fingerprint `b22834c4`, modelo `minimaxai/minimax-m3.1-flash`,
   `providers.json` con permisos `0600`. **Coincide** con la fila del operador.
   Los otros 12 quedan marcados **“a verificar por el operador”**.
4. **La llave anterior `af772e0c` sigue en disco y legible** en este contenedor, en dos rutas:
   `/etc/agent/env/cline.env` y `/workspace/.cline/data/settings/providers.json.bak-20261028`
   (ambas `0600`); **no** está en la config activa ni en los logs. Si NVIDIA no la ha revocado,
   sigue siendo una credencial válida → por eso es **P0** en el inventario de secretos
   ([`docs/ROTACION-SECRETOS-2026-10-28.md`](./ROTACION-SECRETOS-2026-10-28.md) §2.3 y §2.4):
   **debe revocarse en NVIDIA** y después purparse del disco (§8).
5. **Deriva detectada entre el archivo maestro y la configuración persistida**: el maestro
   `/etc/agent/env/cline.env` todavía declara `CLINE_MODEL=z-ai/glm-5.3` y la llave `af772e0c`,
   mientras `providers.json` ya tiene `minimaxai/minimax-m3.1-flash` y `b22834c4`.
   Consecuencia: si el contenedor se recrea, `/etc/agent/setup-cline.sh` puede **reintroducir
   la llave vieja**. Hay que corregir el maestro *antes* de cualquier rotación.
6. Los procedimientos de **rotación** (§6) y **reasignación** (§7) mueven el valor **por
   stdin** (nunca por `argv`, ni por historial, ni por archivo temporal en claro) y verifican
   **por fingerprint**, sin imprimir la llave.

---

## 2. Procedencia de los datos

| Dato | Procedencia | Verificable desde este contenedor |
|---|---|---|
| Nodos, IP de nodo, lista de contenedores | Inventario del operador (encargo T4) — coincide con `scripts/fleet-status.env.example` en `main` (commit `e58e1b4`) | **No** (solo se ve el contenedor propio) |
| Fingerprint de llave por contenedor | Inventario del operador | **Solo** `temporal3-agent1` |
| Rama, estado y tarea por contenedor | Inventario del operador | **Solo** `temporal3-agent1` (rama y estado del repo) |
| Modelo, permisos, rutas y drift de la config de Cline | Lectura local de `/workspace/.cline/...` y `/etc/agent/...` | **Sí** (este contenedor) |

> «Verificado en vivo» = comprobado **desde dentro de este contenedor** con comandos de solo
> lectura. «No verificado» = **a verificar por el operador** desde el host OCI; no se infiere ni
> se inventa.

## 3. Verificación en vivo — contenedor `temporal3-agent1`

### 3.1 Identidad y entorno

| Atributo | Valor | Fuente |
|---|---|---|
| Hostname | `temporal3-agent1` | `hostname`, `/etc/hostname` |
| `CIUDADAN_AGENT_ID` | `temporal3-agent1` | `/etc/agent/agent.env` |
| IP del contenedor | `172.18.0.3/16` (bridge Docker, interna) | `ip -4 addr show` |
| IP del nodo | `159.54.133.219` | **Inventario del operador** — no verificable desde el contenedor |
| Workspace (dentro del contenedor) | `/workspace/ciudadan_app_monorepo` | `pwd`, `WORKSPACE_DIR`/`REPO_DIR` del entorno |
| Workspace (ruta en el **host**) | `/srv/ciudadan-agents/agents/temporal3-agent1/workspace/ciudadan_app_monorepo` | `REPO_DIR`/`WORKSPACE_DIR` en `/etc/agent/agent.env` (montaje del host) |
| Variables de entorno no secretas | `AGENT_HOSTNAME=temporal3-agent1`, `CIUDADAN_AGENT_ID=temporal3-agent1`, `GIT_DEFAULT_BRANCH=main`, `GIT_AGENT_BRANCH=agent/temporal3-agent1`, `CONFIG_DIR=/srv/ciudadan-agents/agents/temporal3-agent1/config` | entorno del proceso (solo nombres/rutas; **ninguna** variable con llaves impresa) |
| Rama del workspace **al levantar el inventario del operador** | `main` @ `6fe67bb` | `git reflog` (`HEAD@{1}`: `pull --ff-only: Fast-forward`) |
| Rama del workspace **durante este encargo** | `feature/cline-hub-temporales-1029` @ `0e5f6c1` | `git branch --show-current`, `git log --oneline -1` |
| Árbol de trabajo | al inicio: los 2 documentos de este encargo sin commitear (continuación de un intento previo); al cierre: un único commit | `git status --short` |
| `origin/main` tras `git fetch origin main` | `0e5f6c1` (sin cambios: ya estaba al día) | `git log --oneline -1 origin/main` |

### 3.2 Configuración de Cline (leída, sin imprimir valores)

| Atributo | Valor | Verificado |
|---|---|---|
| Ruta | `/workspace/.cline/data/settings/providers.json` | sí |
| Permisos | `0600` (owner `root`) | **sí** |
| `providers.nvidia.settings.provider` | `nvidia` | sí |
| `providers.nvidia.settings.model` | `minimaxai/minimax-m3.1-flash` | **sí** |
| `providers.nvidia.updatedAt` | `2026-10-29T08:46:56.052Z` (lectura de este encargo; el archivo se reescribió a las 08:46 UTC) | sí |
| `providers.nvidia.tokenSource` | `manual` | sí |
| Fingerprint de `settings.apiKey` | `b22834c4` | **sí — coincide con la fila del operador** |
| Longitud del valor | 70 caracteres (solo metadato, no contenido) | sí |
| `/workspace/.cline-agente/…` | **no existe en este contenedor** | sí (`ls`) |

Comandos usados (solo lectura, ninguno imprime el valor de la llave):

```bash
hostname; cat /etc/hostname
ip -4 addr show | grep 'inet '
git -C /workspace/ciudadan_app_monorepo branch --show-current
git -C /workspace/ciudadan_app_monorepo log --oneline -1
git -C /workspace/ciudadan_app_monorepo status --short

node -e "const fs=require('fs'),c=require('crypto');
const p='/workspace/.cline/data/settings/providers.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
const s=(j.providers&&j.providers.nvidia||{}).settings||{};
console.log('fingerprint:',c.createHash('sha256').update(String(s.apiKey||'')).digest('hex').slice(0,8));
console.log('model:',s.model);
console.log('perm:',(fs.statSync(p).mode&0o777).toString(8));"
```

### 3.3 Hallazgos adicionales (solo en este contenedor)

| Hallazgo | Evidencia | Impacto |
|---|---|---|
| Llave anterior `af772e0c` presente en `/etc/agent/env/cline.env` (`0600`) | fingerprint calculado sobre `CLINE_API_KEY` | la llave vieja sigue viva y legible → **P0, revocar** |
| Llave anterior `af772e0c` presente en `/workspace/.cline/data/settings/providers.json.bak-20261028` (`0600`) | fingerprint calculado | segunda copia en disco de la llave vieja |
| **Deriva** maestro ↔ config persistida | `cline.env`: `CLINE_MODEL=z-ai/glm-5.3`, fp `af772e0c` · `providers.json`: `minimaxai/minimax-m3.1-flash`, fp `b22834c4` | una recreación del contenedor puede reintroducir la llave vieja |
| `/etc/agent/setup-cline.sh` es **idempotente**: sale sin hacer nada si el proveedor ya figura en `providers.json` | lectura del script | una rotación **no** se aplica solo con `setup-cline.sh` |
| `cline auth -k "$CLINE_API_KEY"` pone la llave en la **línea de comandos** | lectura del script | visible en `ps` mientras corre → usar el método por **stdin** (§6) |
| `providers.json` y su `.bak` son **`root:root 0600`** | `stat` + `sudo -u yizuz head …` → *Permission denied* | la rotación requiere privilegios (`docker exec -u root` / `sudo`), no `yizuz` |
| El valor de la llave **no aparece** en logs ni en el historial del shell | barrido por patrón `nvapi-…` en `/workspace/logs`, `/workspace/.cline/data/logs`, `/home/yizuz/.cline`, `/root` → **0 archivos** | sin residuos de transcripción en este contenedor |

### 3.4 Barrido de residuos por fingerprint (procedimiento reutilizable)

Herramienta de verificación que **no imprime valores**: recorre rutas candidatas, calcula el
fingerprint `sha256/8` de cada credencial que encuentra y reporta **solo** el fingerprint y la ruta.
Un fingerprint **retirado** debe dar **0 coincidencias**. Probada en este contenedor: `af772e0c` → 2
coincidencias, `b22834c4` → 1, un fingerprint inexistente → 0.

```bash
# Ejecutar DENTRO del contenedor afectado. Sustituir el argumento por los fingerprints a purgar.
sudo -n node -e '
const fs=require("fs"),path=require("path"),c=require("crypto"),os=require("os");
const TARGETS=new Set(process.argv.slice(1));
const fp=v=>c.createHash("sha256").update(String(v)).digest("hex").slice(0,8);
const roots=["/workspace/.cline","/workspace/.cline-agente",os.homedir()+"/.cline","/etc/agent"];
let hits=0;
function walk(p,d){let st;try{st=fs.lstatSync(p)}catch(e){return}
 if(st.isDirectory()){if(d>4)return;let e=[];try{e=fs.readdirSync(p)}catch(_){return}
  for(const n of e){if(n==="node_modules"||n===".git")continue;walk(path.join(p,n),d+1)}return}
 if(!st.isFile()||st.size>20*1024*1024)return;
 let t;try{t=fs.readFileSync(p,"utf8")}catch(e){return}
 const cands=new Set();
 try{const j=JSON.parse(t);const n=j&&j.providers&&j.providers.nvidia;
  if(n&&n.settings&&n.settings.apiKey)cands.add(String(n.settings.apiKey));}catch(e){}
 for(const m of t.matchAll(/(?:^|\n)\s*(?:export\s+)?[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\s*=\s*([^\n]+)/g))
  cands.add(m[1].trim().replace(/^["\x27]|["\x27]$/g,""));
 for(const v of cands){const h=fp(v);if(TARGETS.has(h)){hits++;console.log(h,p)}}}
for(const r of roots)walk(r,0);
console.log("coincidencias:",hits);' af772e0c
```

Salida esperada tras una purga correcta: `coincidencias: 0`.

## 4. Inventario completo de la flota (13 contenedores)

> Procedencia: **inventario del operador** (nodo, IP, fingerprint, rama, estado) salvo la fila
> de `temporal3-agent1`, verificada además **en vivo**. La columna «verificado en vivo» dice
> si esa fila se comprobó **desde dentro de este contenedor**: solo una puede estarlo.

| Contenedor | Nodo | IP nodo | Fingerprint llave | Rama del workspace | Estado | Tarea | Centinela | Verificado en vivo |
|---|---|---|---|---|---|---|---|---|
| `temporal1-agent1` | temporal-1 | 160.34.219.124 | `be302fbf` | `feature/comunidad-whatsapp-config-1028` | en pausa | Configuración de comunidad / WhatsApp | — (no declarado) | **no** — a verificar por el operador |
| `temporal1-agent2` | temporal-1 | 160.34.219.124 | `e133df92` | `feature/food-cotizaciones-frontend` | entregado | Cotizaciones de envío del módulo Food (frontend) | `DONE-food2` | **no** — a verificar por el operador |
| `temporal1-agent3` | temporal-1 | 160.34.219.124 | `b22834c4` | `feature/triage-ramas-1027` | entregado | Triage de ramas del monorepo | — (no declarado) | **no** — a verificar por el operador |
| `temporal1-agent4` | temporal-1 | 160.34.219.124 | `5891d41f` | `feature/integracion-hackabot` | en curso (WIP) | Integración de Hackabot | — (WIP, sin `DONE-*`) | **no** — a verificar por el operador |
| `temporal2-agent1` | temporal-2 | 163.192.153.145 | `b89c7369` | `feature/comunidad-feed-real-1028` | en pausa | Feed real de comunidad | — (no declarado) | **no** — a verificar por el operador |
| `temporal2-agent2` | temporal-2 | 163.192.153.145 | `e501c48d` | `feature/ci-hardening-1028` | entregado | Hardening de CI | — (no declarado) | **no** — a verificar por el operador |
| `temporal2-agent3` | temporal-2 | 163.192.153.145 | `e57baf5f` | `feature/comunidad-chats-contactos-1028` | en pausa | Chats de comunidad y contactos | — (no declarado) | **no** — a verificar por el operador |
| `temporal2-agent4` | temporal-2 | 163.192.153.145 | `3505a459` | `integration/revision-adrian1` | entregada (subsumida por main) | Revisión de la instancia adrian1 | — (no declarado) | **no** — a verificar por el operador |
| `temporal2-agent5` | temporal-2 | 163.192.153.145 | `be302fbf` | `feature/ci-hardening-1028` | en pausa | Hardening de CI (rama compartida con `temporal2-agent2`) | — (no declarado) | **no** — a verificar por el operador |
| `temporal2-agent6` | temporal-2 | 163.192.153.145 | `e133df92` | (sin rama) | libre | sin asignar | — (no aplica) | **no** — a verificar por el operador |
| `temporal3-agent1` | temporal-3 | 159.54.133.219 | `b22834c4` | `main` | entregado | Forense de reinyección del backdoor y purga | `DONE-forense` | **sí** — fp `b22834c4`, modelo `minimaxai/minimax-m3.1-flash`, `providers.json` `0600` |
| `temporal3-agent2` | temporal-3 | 159.54.133.219 | `5891d41f` | `feature/inventario-secretos-1028` | entregado | Inventario post-incidente de secretos y plan de rotación | `DONE-secrets` | **no** — a verificar por el operador |
| `temporal3-agent3` | temporal-3 | 159.54.133.219 | `b89c7369` | (sin rama) | libre | sin asignar | — (no aplica) | **no** — a verificar por el operador |

**Notas de trazabilidad del inventario**

- El `id` de cada agente se toma del **nombre del contenedor**; en el único caso verificable
  (`temporal3-agent1`) eso coincide con `CIUDADAN_AGENT_ID` de `/etc/agent/agent.env`.
- La columna «Tarea» se deriva del nombre de la rama; cuando existe un documento en el repo
  que la respalda se cita: `docs/TRIAGE-RAMAS-2026-10-27.md` (`temporal1-agent3`),
  `docs/CI-HARDENING-2026-10-28.md` (`temporal2-agent2`, `temporal2-agent5`),
  `docs/FORENSE-REINYECCION-2026-10-28.md` (`temporal3-agent1`),
  `docs/ROTACION-SECRETOS-2026-10-28.md` (`temporal3-agent2`).
- Los centinelas `DONE-*` solo constan donde el operador los declaró (`DONE-food2`,
  `DONE-forense`, `DONE-secrets`); en el resto se deja explícitamente **no declarado** en vez
  de inventar uno.
- **Discrepancia anotada:** la nota narrativa del encargo dice «5 tienen llave propia y el
  resto comparten con un par de otro nodo», pero la **tabla** del propio encargo asigna 8
  fingerprints a 13 contenedores: **3 exclusivos** (`temporal2-agent2`, `temporal2-agent3`,
  `temporal2-agent4`) y **10 en 5 pares**. Se registra la tabla como dato de referencia; el
  operador confirma cuál de las dos lecturas es la buena.
- **Rama de `temporal3-agent1`:** la tabla dice `main`, que es lo que el workspace tenía cuando el
  operador levantó el inventario (`git reflog`: `main` @ `6fe67bb`). Durante este encargo el
  workspace está en `feature/cline-hub-temporales-1029` (`0e5f6c1` = `origin/main`) porque así lo
  exige la tarea; esa es la única discrepancia entre la tabla y el estado actual del workspace, y la
  resuelve el operador al devolver el contenedor a su rama de trabajo.

## 5. Regla de asignación de llaves

### 5.1 Regla vigente

1. **Una llave por contenedor** como objetivo de diseño: cada agente debe poder autenticarse
   y ser revocado de forma independiente.
2. **Nunca dos contenedores del mismo nodo con la misma llave.** Es la restricción dura del
   reparto del 2026-10-29 y se cumple en las 13 filas del inventario.
3. Cuando no hay llaves suficientes (8 para 13 contenedores), **el par que comparte llave
   se forma entre nodos distintos**: cada nodo conserva al menos una llave propia y un
   incidente en un nodo no deja sin autenticación al par del otro nodo.

### 5.2 Llaves compartidas (pares cruzados)

| Fingerprint | Contenedores | Nodos |
|---|---|---|
| `be302fbf` | `temporal1-agent1` + `temporal2-agent5` | temporal-1 + temporal-2 |
| `e133df92` | `temporal1-agent2` + `temporal2-agent6` | temporal-1 + temporal-2 |
| `b22834c4` | `temporal1-agent3` + `temporal3-agent1` | temporal-1 + temporal-3 |
| `5891d41f` | `temporal1-agent4` + `temporal3-agent2` | temporal-1 + temporal-3 |
| `b89c7369` | `temporal2-agent1` + `temporal3-agent3` | temporal-2 + temporal-3 |

Llaves **exclusivas** (un solo contenedor): `e501c48d` (`temporal2-agent2`), `e57baf5f`
(`temporal2-agent3`), `3505a459` (`temporal2-agent4`).

### 5.3 Por qué esta regla

- **Aislamiento por nodo:** dos agentes del mismo nodo con la misma llave convertirían la
  revocación de una llave en una parada de dos agentes del mismo host y multiplicarían el
  radio de impacto de una fuga.
- **Continuidad entre nodos:** al compartir solo entre nodos distintos, la caída o el
  mantenimiento de un nodo no deja sin autenticación al par del otro nodo.
- **Trazabilidad por fingerprint:** cada rotación se puede atribuir a una llave concreta
  (8 fingerprints) sin exponer el valor.
- **Coste de la regla:** una rotación de una llave compartida toca **2 contenedores en 2
  nodos**; por eso el procedimiento de §6 termina con una verificación en ambos contenedores
  antes de revocar la llave anterior en NVIDIA.

## 6. Procedimiento de rotación de llaves (paso a paso)

**Regla de oro de todo el procedimiento:** el **valor** de la llave viaja **por stdin** y **solo** por
stdin; la **identidad** viaja como **fingerprint** `sha256/8`. El valor nunca aparece en `argv`, ni en
variables de entorno exportadas, ni en el historial del shell, ni en un archivo temporal intermedio, ni
en este repositorio.

### 6.1 Preparación (operador, fuera del contenedor)

| # | Paso | Detalle |
|---|---|---|
| 1 | **Emitir** la llave nueva en NVIDIA | Panel NVIDIA (NIM/API). Copiar a un archivo **maestro del operador** con permisos `0600`, **fuera del repo** y **sin salto de línea final**. |
| 2 | **Calcular el fingerprint esperado** | En la máquina del operador, sobre el archivo maestro, **sin imprimir el valor**: `tr -d '\n' < "$SECRET_FILE" \| sha256sum \| cut -c1-8` → p. ej. `1a2b3c4d`. Ese es el valor con el que se comparará la verificación. |
| 3 | **Registrar** el fingerprint nuevo | En el inventario canónico del operador (`~/.dsh/infrastructure/agents.yaml`) y en `docs/cline-hub-temporales.yaml` de este repo: **solo el fingerprint**. El valor no se escribe en ningún YAML del repo. |
| 4 | **Congelar** el par afectado | Si la llave es compartida, la rotación toca **2 contenedores en 2 nodos**: se pausa la sesión `cline` de ambos para que ninguno consuma cuota con una llave a punto de morir. |

### 6.2 Inyección en el contenedor (el valor viaja por stdin)

El Operador ejecuta esto **desde el host OCI** (no desde dentro del contenedor: `docker` no existe
aquí). `<CONTENEDOR>` = `temporalN-agentM`; `<SECRET_FILE>` = archivo maestro del operador, `0600`.

```bash
# (a) Verificación previa: calcular el fingerprint de lo que se va a inyectar, SIN mostrarlo.
cat "$SECRET_FILE" | sudo -n docker exec -i -u root <CONTENEDOR> \
  node -e 'const fs=require("fs"),c=require("crypto");
            const k=fs.readFileSync(0,"utf8").replace(/\r?\n$/,"");
            if(!k){console.error("stdin vacio");process.exit(1)}
            console.log("fingerprint:",c.createHash("sha256").update(k).digest("hex").slice(0,8));'

# (b) Escritura: se reescribe SOLO settings.apiKey; el resto de la config se preserva.
#     Se imprime únicamente el fingerprint resultante (nunca el valor).
cat "$SECRET_FILE" | sudo -n docker exec -i -u root <CONTENEDOR> \
  node -e 'const fs=require("fs"),c=require("crypto");
            const p="/workspace/.cline/data/settings/providers.json";
            const k=fs.readFileSync(0,"utf8").replace(/\r?\n$/,"");
            if(!k){console.error("stdin vacio");process.exit(1)}
            const j=JSON.parse(fs.readFileSync(p,"utf8"));
            j.providers.nvidia.settings.apiKey=k;
            j.providers.nvidia.updatedAt=new Date().toISOString();
            fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n",{mode:0o600});
            fs.chmodSync(p,0o600);
            console.log("fingerprint:",c.createHash("sha256").update(k).digest("hex").slice(0,8));'

# (c) Sincronizar el maestro DENTRO del contenedor (si no, una recreación del contenedor
#     reintroduce la llave anterior). Verificar el drift antes de escribir:
sed -n 's/^\(CLINE_MODEL\|CLINE_PROVIDER\)=/\1=/p' /etc/agent/env/cline.env
```

Notas operativas (verificadas en este contenedor):

- **`providers.json` es `root:root 0600`**: el usuario `yizuz` **no puede** leerlo ni escribirlo
  (`sudo -u yizuz head …` → *Permission denied*). La rotación se hace con `docker exec -u root` (o con
  `sudo` dentro del contenedor) y el archivo debe quedar **`0600`**.
- **`setup-cline.sh` es idempotente**: si el proveedor `nvidia` ya figura en `providers.json`, no hace
  nada (`exit 0`). Por eso la rotación **no** se aplica con `setup-cline.sh`: hay que escribir
  `providers.json` (como en (b)) y corregir además `/etc/agent/env/cline.env`.
- **`cline auth -k "$CLINE_API_KEY"` pone la llave en la línea de comandos**: quedaría visible en `ps`
  mientras corre. Por eso el procedimiento **no** usa `cline auth`; usa el nodo de `providers.json`.
- **El binario `cline` reescribe `providers.json`** al arrancar (por eso `updatedAt`/`mtime` cambian);
  tras la escritura, la sesión `cline` (`tmux`, usuario `yizuz`) debe **reiniciarse** para releer la
  configuración: `tmux kill-session -t cline` y volver a lanzarla.

### 6.3 Verificación (por fingerprint, nunca por valor)

```bash
# Repetir en CADA contenedor afectado (2 si la llave era compartida, en 2 nodos distintos):
sudo -n docker exec -u root <CONTENEDOR> node -e 'const fs=require("fs"),c=require("crypto");
  const p="/workspace/.cline/data/settings/providers.json";
  const j=JSON.parse(fs.readFileSync(p,"utf8"));const s=j.providers.nvidia.settings;
  console.log("fingerprint:",c.createHash("sha256").update(String(s.apiKey||"")).digest("hex").slice(0,8));
  console.log("model:",s.model);
  console.log("perm:",(fs.statSync(p).mode&0o777).toString(8));'
```

**Criterio de aceptación:** `fingerprint` **igual** al esperado (paso 6.1.2) · `model` =
`minimaxai/minimax-m3.1-flash` · `perm` = `600`. Si algo no coincide, **no** se revoca la llave
anterior: se corrige y se repite la verificación.

### 6.4 Cierre de la rotación

| # | Paso | Quién |
|---|---|---|
| 1 | Verificación por fingerprint **OK en todos** los contenedores del par | Operador |
| 2 | Reiniciar la sesión `cline` del contenedor y comprobar que el agente opera con el modelo esperado | Operador |
| 3 | **Revocar en NVIDIA la llave anterior** (la del fingerprint saliente) | Operador (NVIDIA) |
| 4 | **Purgar** las copias locales del valor anterior (`providers.json.bak-*`, `cline.env`, `/workspace/.cline-agente/…`) | Operador |
| 5 | Barrido de residuos por fingerprint (§3.4): el fingerprint saliente debe dar **0** coincidencias | Operador |
| 6 | Actualizar `~/.dsh/infrastructure/agents.yaml` (operador) y `docs/cline-hub-temporales.yaml` (repo) con el fingerprint **nuevo** | Operador / repo |
| 7 | Registrar evidencia: fingerprint saliente → fingerprint entrante, contenedores, fecha, resultado | Operador |

## 7. Procedimiento de reasignación (llave agotada o revocada)

**Cuándo aplica:** se agota la cuota de una llave NVIDIA, NVIDIA la revoca, o hay sospecha de
compromiso. En los tres casos el fingerprint afectado queda **retirado** y hay que darle una llave
distinta al contenedor (o al par de contenedores) que lo usaba.

### 7.1 Identificar a quién hay que reasignar

Se localiza por **fingerprint**, nunca por valor. El registro canónico es
`docs/cline-hub-temporales.yaml` (`shared_keys` / `exclusive_keys`); el operador lo mantiene también
en `~/.dsh/infrastructure/agents.yaml`. Con el reparto vigente:

| Fingerprint retiring | Contenedores a reasignar | Nodos | Tipo |
|---|---|---|---|
| `be302fbf` | `temporal1-agent1` + `temporal2-agent5` | temporal-1 + temporal-2 | par compartido |
| `e133df92` | `temporal1-agent2` + `temporal2-agent6` | temporal-1 + temporal-2 | par compartido |
| `b22834c4` | `temporal1-agent3` + `temporal3-agent1` | temporal-1 + temporal-3 | par compartido |
| `5891d41f` | `temporal1-agent4` + `temporal3-agent2` | temporal-1 + temporal-3 | par compartido |
| `b89c7369` | `temporal2-agent1` + `temporal3-agent3` | temporal-2 + temporal-3 | par compartido |
| `e501c48d` | `temporal2-agent2` | temporal-2 | exclusiva |
| `e57baf5f` | `temporal2-agent3` | temporal-2 | exclusiva |
| `3505a459` | `temporal2-agent4` | temporal-2 | exclusiva |

**Reglas de destino** (heredadas de §5):

1. **Nunca** asignar el fingerprint retiring a ningún contenedor.
2. **Nunca** dar la misma llave a dos contenedores **del mismo nodo**.
3. Si el retiring era **compartido**, el reemplazo puede ser:
   - **una llave nueva para el par** (2 contenedores, 2 nodos distintos) → mantiene la paridad; o
   - **una llave nueva por contenedor** (2 llaves) → elimina el compartir y es lo preferred si hay
     llaves disponibles en el master del operador.
4. Si el retiring era **exclusivo**, basta **una** llave nueva para ese contenedor.

### 7.2 Procedimiento

| # | Paso | Detalle |
|---|---|---|
| 1 | **Declarar el retiring** | Anotar el fingerprint retirado en el master del operador y marcarlo `revoked` en `docs/cline-hub-temporales.yaml` (`retired_keys`). |
| 2 | **Emitir** la(s) llave(s) de reemplazo en NVIDIA | Una por contenedor si hay disponibilidad (13 contenedores / 8 llaves ⇒ el pool no da para exclusividad total; entonces **1 por par**, respetando la regla de nodos distintos). |
| 3 | **Calcular** el fingerprint de cada llave nueva | `tr -d '\n' < "$SECRET_FILE" \| sha256sum \| cut -c1-8` — en la máquina del operador, sin imprimir el valor. |
| 4 | **Pausar** los contenedores afectados | `tmux send-keys -t cline C-c` o detener la sesión `cline`, para no dejar una tarea a medias con la llave muerta. |
| 5 | **Inyectar** por stdin | Repetir §6.2 (a)+(b) en **cada** contenedor afectado. El valor va por stdin; nunca por `argv`. |
| 6 | **Verificar** por fingerprint | Repetir §6.3 en cada contenedor: fingerprint esperado, modelo `minimaxai/minimax-m3.1-flash`, permisos `600`. |
| 7 | **Reiniciar** la sesión `cline` | Para que el proceso relea `providers.json`. |
| 8 | **Revocar** en NVIDIA la llave retiring | Solo **después** de que los contenedores afectados ya usen la nueva (§6.4 orden). |
| 9 | **Purgar** residuos del valor retiring | `.bak-*`, `cline.env`, `.cline-agente`; luego barrido §3.4 → `coincidencias: 0` para el retiring. |
| 10 | **Actualizar** el registro | `docs/cline-hub-temporales.yaml`: `key_fingerprint` de cada agente afectado, `shared_keys`/`exclusive_keys`, `retired_keys`. Solo fingerprints. |
| 11 | **Reanudar** los contenedores | Verificar que el agente opera con el modelo esperado y que su rama/estado siguen correctos. |

### 7.3 Verificación final del reparto

Reglas que el registro debe seguir cumpliendo tras cualquier reasignación:

```bash
# Validación estructural del YAML del repo (sin valores de llave).
node -e '
const y=require("./ciudadan_backend_26/node_modules/js-yaml"),fs=require("fs");
const d=y.load(fs.readFileSync("docs/cline-hub-temporales.yaml","utf8"));
const byNode={};let err=0;
for(const a of d.agents){const k=a.node+"/"+a.key_fingerprint;(byNode[k]=byNode[k]||[]).push(a.id)}
for(const k in byNode) if(byNode[k].length>1){err++;console.log("MISMA LLAVE EN MISMO NODO:",k,byNode[k].join("+"))}
const fps=d.agents.map(a=>a.key_fingerprint);
console.log("agentes:",d.agents.length,"| fingerprints distintos:",new Set(fps).size);
console.log("pareos compartidos:",d.shared_keys.length,"| exclusivas:",d.exclusive_keys.length,"| retiradas:",d.retired_keys.length);
console.log(err?"REGLA VIOLADA":"regla de nodos: OK");'
```

Salida esperada del reparto actual: `agentes: 13 | fingerprints distintos: 8`, `pareos compartidos: 5`,
`exclusivas: 3`, `retiradas: 1`, `regla de nodos: OK`.

## 8. La llave anterior `af772e0c` — qué hay que hacer con ella

### 8.1 Estado verificado en vivo (este contenedor)

| Dato | Valor | Evidencia |
|---|---|---|
| Fingerprint de la llave anterior | `af772e0c` | `sha256/8` de `CLINE_API_KEY` y de `settings.apiKey` en el `.bak` |
| ¿Sigue viva en NVIDIA? | **Se desconoce desde aquí** (no hay acceso al panel) | — |
| Dónde sigue **legible** | `/etc/agent/env/cline.env` (`CLINE_API_KEY`, `0600`, owner `yizuz`) | lectura del archivo + fingerprint |
| | `/workspace/.cline/data/settings/providers.json.bak-20261028` (`0600`, owner `root`) | lectura del archivo + fingerprint |
| ¿Está en la config **activa**? | **No**: `providers.json` ya usa `b22834c4` | fingerprint de `settings.apiKey` |
| ¿Aparece en logs? | **No** (barrido por patrón `nvapi-…` → 0 archivos) | barrido en `/workspace/logs`, `/workspace/.cline/data/logs`, `/home/yizuz/.cline`, `/root` |
| Coincidencias del barrido §3.4 | **2** (las dos rutas de arriba) | barrido por fingerprint |

> ⚠️ **Alcance de la verificación:** esto se comprobó **solo** en `temporal3-agent1`. En los otros 12
> contenedores el estado de `af772e0c` es **no verificado** → lo confirma el operador ejecutando §3.4
> en cada uno.

### 8.2 Por qué es **P0** (y no un P1)

El inventario de secretos la marca **P0** en
[`docs/ROTACION-SECRETOS-2026-10-28.md`](./ROTACION-SECRETOS-2026-10-28.md) §2.3 y §2.4, y el motivo
es concreto:

1. **Es legible desde la configuración del contenedor**: el valor está en **claro** en
   `providers.json` (y en su `.bak`) y en `cline.env`. No es un hash ni una referencia: es el
   secreto en sí, recuperable por cualquiera que lea esos archivos.
2. **Es la credencial de toda la flota**, no de un agente: la misma llave servía a los 13
   contenedores, así que su exposición compromete a los 13 a la vez.
3. **Queda en disco después de la rotación**: el `.bak-20261028` y el `cline.env` conservan el valor
   viejo incluso cuando la config activa ya usa otra llave.
4. **Se reintroduce sola**: `setup-cline.sh` lee `cline.env`; si el contenedor se recrea, vuelve a
   autenticar con la llave anterior (además con `CLINE_MODEL=z-ai/glm-5.3`, que es el modelo viejo).

### 8.3 Acciones obligatorias

| # | Acción | Responsable | Estado |
|---|---|---|---|
| 1 | **Revocar `af772e0c` en NVIDIA** (panel NVIDIA). Es la acción que corta la exposición: mientras la llave no esté revocada, la copia en disco sigue siendo una credencial válida. | Operador | **Pendiente** — no verificable desde el contenedor |
| 2 | **Verificar la revocación** (intentar usarla debe fallar con 401/403). | Operador | Pendiente |
| 3 | **Actualizar `/etc/agent/env/cline.env`**: `CLINE_API_KEY` = llave vigente, `CLINE_MODEL=minimaxai/minimax-m3.1-flash`, `CLINE_PROVIDER=nvidia`. Deja de ser un maestro de la llave vieja. | Operador | Pendiente (deriva confirmada en §3.3) |
| 4 | **Eliminar `providers.json.bak-20261028`** (contiene la llave vieja en claro). | Operador | Pendiente |
| 5 | **Purgar `/workspace/.cline-agente/data/settings/providers.json`** si existe en ese contenedor (P0 en §2.4 de la rotación de secretos; **no existe** en este). | Operador | Pendiente en los otros 12 |
| 6 | **Barrido §3.4** en los 13 contenedores → `coincidencias: 0` para `af772e0c`. | Operador | Pendiente (2 en este contenedor) |
| 7 | Registrar `af772e0c` en `retired_keys` del YAML con estado `revoked` una vez revocada. | Este repo / operador | Preparado en el YAML |

> **Orden importante:** primero se rota (§6) y se verifica, **después** se revoca la anterior. Revocar
> antes de verificar deja contenedores sin acceso al modelo.

## 9. Registro `cline-hub` listo para pegar

Formato de una entrada por agente: **id**, **nodo**, **contenedor**, **proyecto**, **rama**, **estado**,
**tarea**, **centinela `DONE-*`** y **fingerprint de llave**. Generado desde
`docs/cline-hub-temporales.yaml` (fuente única de verdad) para que el operador pueda pegarlo en
`~/.dsh/infrastructure/agents.yaml` sin re-typing.

**Nunca se pega el valor de la llave**: solo el fingerprint `sha256/8`.

```yaml
agents:
  - id: "temporal1-agent1"
    node: "temporal-1"          # IP nodo 160.34.219.124
    container: "temporal1-agent1"
    project: "ciudadan_app_monorepo"
    branch: "feature/comunidad-whatsapp-config-1028"
    status: "en pausa"
    task: "Configuracion de comunidad / WhatsApp"
    sentinel: null
    key_fingerprint: "be302fbf"   # sha256/8; NUNCA el valor
  - id: "temporal1-agent2"
    node: "temporal-1"          # IP nodo 160.34.219.124
    container: "temporal1-agent2"
    project: "ciudadan_app_monorepo"
    branch: "feature/food-cotizaciones-frontend"
    status: "entregado"
    task: "Cotizaciones de envio del modulo Food (frontend)"
    sentinel: "DONE-food2"
    key_fingerprint: "e133df92"   # sha256/8; NUNCA el valor
  - id: "temporal1-agent3"
    node: "temporal-1"          # IP nodo 160.34.219.124
    container: "temporal1-agent3"
    project: "ciudadan_app_monorepo"
    branch: "feature/triage-ramas-1027"
    status: "entregado"
    task: "Triage de ramas del monorepo"
    sentinel: null
    key_fingerprint: "b22834c4"   # sha256/8; NUNCA el valor
  - id: "temporal1-agent4"
    node: "temporal-1"          # IP nodo 160.34.219.124
    container: "temporal1-agent4"
    project: "ciudadan_app_monorepo"
    branch: "feature/integracion-hackabot"
    status: "en curso (WIP)"
    task: "Integracion de Hackabot"
    sentinel: null
    key_fingerprint: "5891d41f"   # sha256/8; NUNCA el valor
  - id: "temporal2-agent1"
    node: "temporal-2"          # IP nodo 163.192.153.145
    container: "temporal2-agent1"
    project: "ciudadan_app_monorepo"
    branch: "feature/comunidad-feed-real-1028"
    status: "en pausa"
    task: "Feed real de comunidad"
    sentinel: null
    key_fingerprint: "b89c7369"   # sha256/8; NUNCA el valor
  - id: "temporal2-agent2"
    node: "temporal-2"          # IP nodo 163.192.153.145
    container: "temporal2-agent2"
    project: "ciudadan_app_monorepo"
    branch: "feature/ci-hardening-1028"
    status: "entregado"
    task: "Hardening de CI"
    sentinel: null
    key_fingerprint: "e501c48d"   # sha256/8; NUNCA el valor
  - id: "temporal2-agent3"
    node: "temporal-2"          # IP nodo 163.192.153.145
    container: "temporal2-agent3"
    project: "ciudadan_app_monorepo"
    branch: "feature/comunidad-chats-contactos-1028"
    status: "en pausa"
    task: "Chats de comunidad y contactos"
    sentinel: null
    key_fingerprint: "e57baf5f"   # sha256/8; NUNCA el valor
  - id: "temporal2-agent4"
    node: "temporal-2"          # IP nodo 163.192.153.145
    container: "temporal2-agent4"
    project: "ciudadan_app_monorepo"
    branch: "integration/revision-adrian1"
    status: "entregada (subsumida por main)"
    task: "Revision de la instancia adrian1"
    sentinel: null
    key_fingerprint: "3505a459"   # sha256/8; NUNCA el valor
  - id: "temporal2-agent5"
    node: "temporal-2"          # IP nodo 163.192.153.145
    container: "temporal2-agent5"
    project: "ciudadan_app_monorepo"
    branch: "feature/ci-hardening-1028"
    status: "en pausa"
    task: "Hardening de CI (rama compartida con temporal2-agent2)"
    sentinel: null
    key_fingerprint: "be302fbf"   # sha256/8; NUNCA el valor
  - id: "temporal2-agent6"
    node: "temporal-2"          # IP nodo 163.192.153.145
    container: "temporal2-agent6"
    project: "ciudadan_app_monorepo"
    branch: null
    status: "libre"
    task: "sin asignar"
    sentinel: null
    key_fingerprint: "e133df92"   # sha256/8; NUNCA el valor
  - id: "temporal3-agent1"
    node: "temporal-3"          # IP nodo 159.54.133.219
    container: "temporal3-agent1"
    project: "ciudadan_app_monorepo"
    branch: "main"
    status: "entregado"
    task: "Forense de reinyeccion del backdoor y purga"
    sentinel: "DONE-forense"
    key_fingerprint: "b22834c4"   # sha256/8; NUNCA el valor
  - id: "temporal3-agent2"
    node: "temporal-3"          # IP nodo 159.54.133.219
    container: "temporal3-agent2"
    project: "ciudadan_app_monorepo"
    branch: "feature/inventario-secretos-1028"
    status: "entregado"
    task: "Inventario post-incidente de secretos y plan de rotacion"
    sentinel: "DONE-secrets"
    key_fingerprint: "5891d41f"   # sha256/8; NUNCA el valor
  - id: "temporal3-agent3"
    node: "temporal-3"          # IP nodo 159.54.133.219
    container: "temporal3-agent3"
    project: "ciudadan_app_monorepo"
    branch: null
    status: "libre"
    task: "sin asignar"
    sentinel: null
    key_fingerprint: "b89c7369"   # sha256/8; NUNCA el valor
```

> Los centinelas `DONE-*` solo constan donde el operador los declaró (`DONE-food2`, `DONE-forense`,
> `DONE-secrets`); en los demás se deja `null` en vez de inventar uno. La columna `status` refleja lo
> declarado por el operador en el inventario del encargo.

## 10. Verificación del entregable

| Qué | Cómo se verificó | Resultado |
|---|---|---|
| YAML válido | `python3 -c "import yaml,sys;yaml.safe_load(open('docs/cline-hub-temporales.yaml'))"` → sin `pyyaml` en la imagen; se validó con `js-yaml` del backend (`node -e "require('./ciudadan_backend_26/node_modules/js-yaml').load(...)"`), equivalente | **parsea sin error** |
| Estructura del registro | conteo de `agents`, `shared_keys`, `exclusive_keys`, `retired_keys` | 13 · 5 · 3 · 1 |
| Regla de asignación por nodo | validador de §7.3 | `regla de nodos: OK` |
| Cobertura de fingerprints | conjunto de `key_fingerprint` de los 13 agentes | 8 distintos = los 8 del reparto |
| Sin valores de llave | revisión del diff: solo aparecen tokens `sha256/8` de 8 hex | **0 valores** |
| Sin archivos fuera del workspace | `git status` | solo 2 documentos nuevos bajo `docs/` |
| Configuración de Cline intacta | fingerprint, modelo y permisos **antes** y **después** de redactar | `b22834c4` · `minimaxai/minimax-m3.1-flash` · `0600` (sin cambios) |

## 11. Alcance, supuestos y lo que no se pudo verificar

### 11.1 Lo que sí se verificó en vivo (este contenedor)

- Identidad: `hostname`/`/etc/hostname` = `temporal3-agent1`; `CIUDADAN_AGENT_ID` = `temporal3-agent1`;
  IP del contenedor `172.18.0.3/16` (bridge interno); workspace `/workspace/ciudadan_app_monorepo`.
- Llave vigente: fingerprint `sha256/8` = **`b22834c4`** → **coincide** con la fila del operador para
  `temporal3-agent1`. Modelo = **`minimaxai/minimax-m3.1-flash`**. Permisos = **`0600`**
  (`root:root`). El valor **nunca** se imprimió.
- Llave anterior `af772e0c`: legible en 2 rutas (`cline.env` y `providers.json.bak-20261028`), ausente
  de la config activa y de los logs.
- Drift `cline.env` ↔ `providers.json` y el comportamiento idempotente de `setup-cline.sh`.

### 11.2 Lo que **no** se pudo verificar (queda para el operador)

| Dato | Por qué no | Cómo lo verifica el operador |
|---|---|---|
| Los 12 contenedores restantes (fingerprint, modelo, permisos, rama, estado) | no hay `docker` ni SSH a los hosts OCI dentro del contenedor | §6.3 por contenedor, o `node scripts/fleet-status.mjs` desde el host |
| Que los fingerprints del inventario correspondan a las llaves realmente instaladas | requiere leer la config de cada contenedor | §6.3 en los 13 contenedores |
| Si `af772e0c` sigue viva en NVIDIA | sin acceso al panel de NVIDIA | revocarla y comprobar que falla con 401/403 |
| La novena llave duplicada (9 aportadas, 8 repartidas) | no viene identificada por fingerprint en el encargo | el operador la descarta/identifica en su master |
| El estado de las tareas en curso | solo hay un workspace visible | `scripts/fleet-status.mjs` |

### 11.3 Supuestos explícitos

1. El **modelo** del encargo (`minimaxai/minimax-m3.1-flash`) es el mismo en los 13 contenedores: solo
   se comprobó en el visible.
2. El **fingerprint** se calcula sobre el valor tal cual está en `settings.apiKey` (sin `trim`), con
   `sha256` y los primeros 8 hex. Todos los comandos de este documento usan esa misma convención.
3. La **IP de nodo** no es observable desde el contenedor: la IP `172.18.0.3` es la del bridge Docker
   dentro del host, no la del nodo OCI.
4. El reparto de llaves se toma de la **tabla del inventario del operador** (fuente declarada). La
   nota narrativa del encargo («5 tienen llave propia») no cuadra con esa tabla (que da 3 exclusivas y
   5 pares): se documenta la discrepancia en §4 en vez de elegir una versión por cuenta propia.

### 11.4 Lo que este encargo **no** tocó

- **No** se modificó la configuración de Cline de ningún contenedor: solo lectura (`providers.json`,
  `cline.env`, `.bak`, `setup-cline.sh`, `start-services.sh`).
- **No** se imprimió ningún valor de llave, token ni secreto: los únicos identificadores que aparecen
  son fingerprints `sha256/8`.
- **No** se editó `~/.dsh/infrastructure/agents.yaml` (no existe en el contenedor): el entregable es el
  **contenido listo para aplicar** (§9 y `docs/cline-hub-temporales.yaml`).
- **No** se hizo `push` ni se tocó ningún archivo fuera del workspace.
- **No** se amplió el alcance: no se modificó código de la app, ni seeds, ni el backdoor-guard.

---

**Documento generado por el agente `temporal3-agent1` (nodo `temporal-3`, `159.54.133.219`) el
2026-10-29 en la rama `feature/cline-hub-temporales-1029`.**
**El YAML correspondiente, listo para integrar en el inventario del operador:
[`docs/cline-hub-temporales.yaml`](./cline-hub-temporales.yaml).**
