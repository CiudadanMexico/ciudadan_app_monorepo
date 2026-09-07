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

## Notas / hoja de ruta
- **`abraham-cartera` / `cartera-bankchain` / `feat/zoom-integration` / `docs` / `verify_changes`**
  apuntan a commits de verificación/merges relacionados con la cartera y el flujo de revisión.
- La rama **`coworkv2`** quedó alineada con `main` (con wizard de wiki).
- Todas las ramas comparten el mismo backend; el despliegue real se decide por **cambios en
  `main`** según carpeta.

---

*Fin de ramas. Sigue: [07 — Variables de Entorno](07-Variables-de-Entorno.md).*