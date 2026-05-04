# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Serve
FROM nginx:alpine
RUN apk add --no-cache nodejs
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=runtime-deps /app/node_modules /app/node_modules
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/10-auth-services.sh /docker-entrypoint.d/10-auth-services.sh
COPY scripts/auth-service.mjs /app/scripts/auth-service.mjs
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid && \
    chmod +x /docker-entrypoint.d/10-auth-services.sh
EXPOSE 8847
CMD ["nginx", "-g", "daemon off;"]
