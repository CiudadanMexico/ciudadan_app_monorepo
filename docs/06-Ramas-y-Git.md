# 06 — Ramas y Git

> Todas las ramas del repositorio `ciudadan_app_monorepo`, su propósito y su estado reciente.

## Remotes

```
origin  https://github.com/CiudadanMexico/ciudadan_app_monorepo.git
```

## Flujo de trabajo (Scrum)

- Monorepo **git plano** (un solo `.git/` en la raíz). Cada equipo trabaja en su carpeta
  (`ciudadan_backend_26/` o `ciudadan_frontend/`).
- Ramas de feature: `feature/<nombre>` (o `feat/<nombre>`). Integración a `main` vía **PR**.
- `main` protegida (sin push directo).
- **CI/CD por paths:** cambios en backend → deploys; cambios en frontend → deploys.

## Rama `main`
Rama de integración y despliegue. Últimos commits incluyen:
- `cc3f8a5` Merge `feature/Jesus-Roberto-Wiki-Viewer`
- `1017e5a` feat(wiki): visor de wikis con archivos .md locales
- `cdbf239` security: remover payload ofuscado (bot minero ETH) inyectado en middleware auth0

## Ramas locales
| Rama | Descripción |
|---|---|
| `main` | Integración/despliegue |
| `feature/abraham-gana` | Módulo "Gana" / anuncios remunerados (activa en HEAD local) |
| `feature/abraham-ad-rewards` | Recompensas por anuncios (video real + feedback visual) |
| `feature/abraham-cartera` | Cartera (laborys, ethers.js, crear billetera) |
| `feature/abraham-home` | Home / landing |
| `feature/Jesus-Roberto-Wiki-Viewer` | Visor de wikis (.md) |

## Ramas remotas (`origin/`)
| Rama | Último commit (tema) |
|---|---|
| `main` | Merge wiki-viewer |
| `docs` | — |
| `feat/zoom-integration` | Zoom / integración *(sincronizada con cartera-bankchain)* |
| `feature/Jesus-Roberto-Wiki-Viewer` | `1017e5a` visor wiki |
| `feature/abraham-ad-rewards` | `12e276e` reproducir video real + feedback visual |
| `feature/abraham-cartera` | `c3209ae` enlace crear cartera + página con ethers.js |
| `feature/abraham-gana` | `d3dd797` flujo ads sin JWT + fix carteras FK a up_users |
| `feature/abraham-home` | `c92959e` botones SectionBlock morados |
| `feature/cartera-bankchain` | `9fd1717` merge PR #8 (verify_changes) |
| `feature/coworkv2` | `cc3f8a5` merge wiki-viewer |
| `feature/frontend-daniel-sepulveda` | `fcf931f` resolve FoodCheckout conflict |
| `feature/taxis-trips` | `fcbc1b1` merge main + abraham-home |
| `verify_changes` | `fcf931f` conflict FoodCheckout |
| `origin/HEAD` → `origin/main` | — |

## Estado HEAD local (feature/abraham-gana)
```
d3dd797 fix(ads): full flow without JWT + fix carteras FK to up_users
b5034aa feat(ads): recompensa en DecisionWindow + barra Recompensa ganada
52889e3 feat(ads): vincular videos locales reales a anuncios
33386f3 fix(ads): propagar duration real en heartbeat
8be8761 feat(ads): cobertura basada en duración real del video
```

## Trabajo login/logout Auth0 (rama `feature/agente1-adrian-loginredirect`) — `2026-10-14`

Rama de la instancia **adrian1** (`frontend-adrian1.ciudadan.org`). Resumen de lo aprendido
y del estado final:

- **Regla Auth0 verificada:** `/v2/logout` valida `returnTo` contra las *Allowed Logout
  URLs de la APLICACIÓN* (la lista de tenant no aplica porque auth0-spa-js manda
  `client_id`). Origen sin path → 302 OK; path profundo → 400 (página de error); sin
  `returnTo` → redirige a la primera URL permitida (p. ej. `localhost:3000`).
- **Estado final del código (compartido con `main`):**
  - Login: todas las entradas mandan `appState.returnTo = pathname+search+hash` →
    `onRedirectCallback` devuelve al usuario a la página previa.
  - Logout: `utils/logoutAqui.js` — cierra sesión (local + IdP vía iframe oculto)
    **sin salir de la página** donde estaba el usuario.
- **Se probó y se revirtió** (documentado para no repetir): helper `utils/authRedirect.js`
  con `salir`/`irALogin` y logout "a la raíz" o "sin returnTo" — todos rompían el logout
  de formas distintas. No reintroducir sin necesidad.
- **Deploy:** esta instancia NO se despliega por GitHub Actions (falla y apunta a
  Daniel/Polanco). Se actualiza con build local + `systemctl restart
  ciudadan-frontend.service`. Runbook: `docs/deploy-adrian1-local.md`.

Commits relevantes en `main` (más reciente primero):
```
29985f7 fix(auth0): login siempre regresa a la pagina donde estaba (appState returnTo con ruta+query+hash); logout intacto
855ea75 revert(auth0): rollback total login/logout al estado previo 956c504
99b28ce fix(auth0): logout sin returnTo - Auth0 usa la primera Allowed Logout URL (evita pagina de error)   [revertido]
3e5edf1 revert(auth0): logout tal cual original (returnTo=origin); login irALogin intacto                    [revertido]
7c5ce06 chore(auth0): logout siempre a la raíz para evitar página de error tras cerrar sesión                [revertido]
0f5151e fix(auth0): centralizar login/logout con irALogin/salir (returnTo en appState y cookie fallback)     [revertido]
274e7f7 docs: runbook deploy frontend adrian1 (build estatico + systemd, GH Actions no aplica) y flujo Auth0 login/logout
733ab6f feat(auth0): logout se queda en la pagina del usuario (logoutAqui: openUrl=iframe oculto, sesion IdP tambien se cierra)   [VIGENTE]
7a60577 fix(auth0): el menu de usuario se cierra al dar Salir (onClose tras logoutAqui)                     [VIGENTE]
f3cfc9c docs: logout cierra el menu de usuario (onClose tras logoutAqui)                                    [VIGENTE]
```

## Notas / hoja de ruta
- **`abraham-cartera` / `cartera-bankchain` / `feat/zoom-integration` / `docs` / `verify_changes`**
  apuntan a commits de verificación/merges relacionados con la cartera y el flujo de revisión.
- La rama **`coworkv2`** quedó alineada con `main` (con wizard de wiki).
- Todas las ramas comparten el mismo backend; el despliegue real se decide por **cambios en
  `main`** según carpeta.

---

*Fin de ramas. Sigue: [07 — Variables de Entorno](07-Variables-de-Entorno.md).*