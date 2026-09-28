# =============================================================
# AGENT 01 - Frontend Ciudadan (React 18 + CRA/CRACO, Node 18)
# Imagen de desarrollo. En ejecucion normal, docker-compose monta el
# workspace encima de /app (hot reload desde VS Code/Cline); el COPY
# del final es solo fallback para ejecutar la imagen suelta.
# =============================================================
FROM node:18-alpine

WORKDIR /app

# 1) Manifiestos primero para aprovechar el cache de Docker
COPY package.json ./

# 2) Dependencias (mismas flags que usa el backend del monorepo)
RUN npm install --legacy-peer-deps --no-audit --no-fund

# 3) Resto del codigo (en dev lo sustituye el bind mount del workspace)
COPY . .

# Dev server dentro del contenedor (el host lo publica como 3011 -> 3000)
EXPOSE 3000

# Arranque con el mecanismo existente del proyecto: craco start
CMD ["npm", "start"]
