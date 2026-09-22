# Usa Node 18 LTS (compatible con Strapi)
FROM node:18-alpine

# Directorio de trabajo
WORKDIR /app

# Copia solo package.json primero (para cache de dependencias)
COPY package*.json ./

# Instala dependencias
RUN npm install --legacy-peer-deps

# Copia el resto del código
COPY . .

# Construye Strapi
RUN npm run build

# Expone puerto de Strapi
EXPOSE 1337

# Comando de inicio
CMD ["npm", "start"]