# Stage 1: Build frontend
FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY frontend/ ./

ENV VITE_API_URL=""

ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build


# Stage 2: Build backend
FROM node:22-bookworm-slim AS backend-build

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./

RUN npm install --no-audit --no-fund

COPY backend/ ./

RUN npm run build


# Stage 3: Production runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY backend/package.json backend/package-lock.json ./

RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=backend-build /app/dist ./dist

COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001

USER node

CMD ["node", "dist/server.js"]
